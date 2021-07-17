import { Injectable } from '@angular/core';
import {AppSettingsService} from './app-settings.service';
import {ApiService} from './api.service';
import {NotificationService} from './notification.service';
import { PoWSource } from './app-settings.service';
import Worker from 'worker-loader!./../../assets/lib/cpupow.js';
import {UtilService} from './util.service';
import {BehaviorSubject} from 'rxjs';

const mod = window['Module'];
export const baseThreshold = 'fffffff800000000'; // threshold since v21 epoch update
const hardwareConcurrency = window.navigator.hardwareConcurrency || 2;
const workerCount = Math.max(hardwareConcurrency - 1, 1);
let workerList = [];
export enum workState {'success', 'cancelled', 'error'}

@Injectable()
export class PowService {

  webGLAvailable = false;
  webGLTested = false;

  powAlertLimit = 60; // alert long pow after X sec
  PoWPool = [];
  parallelQueue = false;
  processingQueueItem = false;
  currentProcessTime = 0; // start timestamp for PoW
  powAlert$: BehaviorSubject<boolean|false> = new BehaviorSubject(false);
  public shouldContinueQueue = true; // set to false to disable further processing
  cpuWorkerResolve = null; // global worker promise to allow termination
  cpuWorkerReject = null; // global worker promise to allow termination
  shouldAbortGpuPow = false; // set to true to abort GPU pow

  constructor(
    private appSettings: AppSettingsService,
    private api: ApiService,
    private notifications: NotificationService,
    private util: UtilService
  ) { }

  /**
   * Determine the best PoW Method available for this browser
   */
  determineBestPoWMethod(): PoWSource {
    // if (this.hasWebGLSupport()) return 'clientWebGL';
    // if (this.hasWorkerSupport()) return 'clientCPU'; // For now, server is better than a CPU default (For Mobile)

    return 'server';
  }

  /**
   * Get PoW for a hash.  If it's already being processed, return the promise.
   * Otherwise, add it into the queue and return when it is ready
   */
  async getPow(hash, multiplier) {
    const existingPoW = this.PoWPool.find(p => p.hash === hash);
    if (existingPoW) {
      return existingPoW.promise.promise; // Its okay if its resolved already
    }

    return this.addQueueItem(hash, multiplier);
  }

  /**
   * Add a new hash into the queue to perform work on.
   * Returns a promise that is resolved when work is completed
   */
  addQueueItem(hash, multiplier) {
    const existingPoW = this.PoWPool.find(p => p.hash === hash);
    if (existingPoW) {
      return existingPoW.promise.promise;
    }

    const queueItem = {
      hash,
      work: null,
      promise: this.getDeferredPromise(),
      multiplier: multiplier,
    };

    this.PoWPool.push(queueItem);
    this.processQueue();

    return queueItem.promise.promise;
  }

  /**
   * Determine if the browser has WebWorker support
   * @returns {boolean}
   */
  public hasWorkerSupport() {
    return !!window['Worker'];
  }

  /**
   * Determine if the browser has WebGL support
   * @returns {boolean}
   */
  public hasWebGLSupport() {
    if (this.webGLTested) return this.webGLAvailable;

    this.webGLTested = true;

    try {
      const canvas = document.createElement( 'canvas' );
      const webGL = !! window['WebGLRenderingContext'] && (canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ));
      this.webGLAvailable = !!webGL;
      return this.webGLAvailable;
    } catch (e) {
      this.webGLAvailable = false;
      return false;
    }
  }

  /**
   * Gets the next item in the queue and sends it to be processed
   */
  private processQueue() {
    if (!this.PoWPool.length) return; // No items in the queue
    if (this.parallelQueue) return; // Not yet implemented

    if (this.processingQueueItem) return; // Already processing.

    // Get the next item from the queue and process it
    this.processNextQueueItem();
  }

  /**
   * Process an individual hash from the queue
   * Uses the latest app settings to determine which type of PoW to use
   */
  private async processNextQueueItem() {
    if (!this.PoWPool.length) return; // Nothing in the queue?
    this.processingQueueItem = true;
    const queueItem = this.PoWPool[0];
    this.powAlert$.next(false); // extra safety to ensure the alert is always reset

    let powSource = this.appSettings.settings.powSource;
    const multiplierSource: Number = this.appSettings.settings.multiplierSource;
    let localMultiplier: Number = 1;

    if (powSource === 'best') {
      powSource = this.determineBestPoWMethod();
    }

    if (powSource === 'clientCPU' || powSource === 'clientWebGL' || powSource === 'custom') {
      if (multiplierSource > 1) { // use manual difficulty
        localMultiplier = multiplierSource;
      } else { // use default requested difficulty
        localMultiplier = queueItem.multiplier;
      }
    }

    const work = {state: null, work: ''};
    switch (powSource) {
      default:
      case 'server':
        const serverWork = await this.getHashServer(queueItem.hash, queueItem.multiplier);
        if (serverWork) {
          work.work = serverWork;
          work.state = workState.success;
        } else {
          work.state = workState.error;
        }
        break;
      case 'clientCPU':
        try {
          work.work = await this.getHashCPUWorker(queueItem.hash, localMultiplier);
          work.state = workState.success;
        } catch (state) {
          work.state = state;
        }
        break;
      case 'clientWebGL':
        try {
          work.work = await this.getHashWebGL(queueItem.hash, localMultiplier);
          work.state = workState.success;
        } catch (state) {
          work.state = state;
        }
        break;
      case 'custom':
        const workServer = this.appSettings.settings.customWorkServer;
        // Check all known APIs and return true if there is no match. Then allow local PoW mutliplier
        const allowLocalMulti = workServer !== '' &&
          this.appSettings.knownApiEndpoints.every(endpointUrl => !workServer.includes(endpointUrl));

        const customWork = await this.getHashServer(queueItem.hash, allowLocalMulti ? localMultiplier : queueItem.multiplier, workServer);
        if (customWork) {
          work.work = customWork;
          work.state = workState.success;
        } else {
          work.state = workState.error;
        }
        break;
    }

    this.currentProcessTime = 0; // Reset timer
    this.PoWPool.shift(); // Remove this item from the queue
    this.processingQueueItem = false;

    if (work.state === workState.success) {
      queueItem.work = work.work;
      queueItem.promise.resolve(work);
    } else {
      // this.notifications.sendError(`Unable to generate work for ${queueItem.hash} using ${powSource}`);
      queueItem.promise.reject(work);
    }

    if (this.shouldContinueQueue) {
      this.processQueue();
    }

    return queueItem;
  }

  /**
   * Actual PoW functions
   */
  async getHashServer(hash, multiplier, workServer = '') {
    const newThreshold = this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold);
    const serverString = workServer === '' ? 'external' : 'custom';
    console.log('Generating work with multiplier ' + multiplier + ' at threshold ' +
      newThreshold + ' using ' + serverString + ' server for hash: ', hash);
    return await this.api.workGenerate(hash, newThreshold, workServer)
    .then(work => work.work)
    // Do not fallback to CPU pow. Let the user decide
    // .catch(async err => await this.getHashCPUWorker(hash, multiplier))
    .catch(err => null);
  }

  /**
   * Generate PoW using CPU without workers (Not used)
   */
  getHashCPUSync(hash) {
    const response = this.getDeferredPromise();

    const PoW = mod.cwrap('launchPoW', 'string', ['string']);
    const start = Date.now();
    let work;
    do { work = PoW(hash); } while (work === '0000000000000000');
    console.log(`Synchronous CPU: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds`);

    response.resolve(work);
    return response.promise;
  }

  /**
   * Generate PoW using CPU and WebWorkers
   */
  async getHashCPUWorker(hash, multiplier) {
    this.checkPowProcessLength(); // start alert timer
    // console.log('Generating work using CPU for', hash);

    const response = this.getDeferredPromise();

    const start = Date.now();
    // -- OLD CPU CODE THAT CANT DEFINE THRESHOLD-- //
    /*
    const NUM_THREADS = navigator.hardwareConcurrency < 4 ? navigator.hardwareConcurrency : 4;
    const workers = window['pow_initiate'](NUM_THREADS, '/assets/lib/pow/');

    window['pow_callback'](workers, hash, () => {}, (work) => {
      console.log(`CPU Worker: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds [${NUM_THREADS} Workers]`);
      response.resolve(work);
    });
    */

    // calculate threshold from multiplier
    const newThreshold = this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold);
    const work = () => new Promise<void>((resolve, reject) => {
      this.cpuWorkerResolve = resolve;
      this.cpuWorkerReject = reject;
      console.log('Generating work with multiplier ' + multiplier + ' at threshold ' +
        newThreshold + ' using CPU workers for hash: ', hash);
      workerList = [];
      for (let i = 0; i < workerCount; i++) {
        // const worker = new Worker()
        const worker = new (Worker as any)();
        worker.postMessage({
          blockHash: hash,
          workerIndex: i,
          workerCount: workerCount,
          workThreshold: newThreshold,
        });
        worker.onmessage = (workerwork) => {
          console.log(`CPU Worker: Found work (${workerwork.data}) for ${hash} after ${(Date.now() - start) / 1000} seconds [${workerCount} Workers]`);
          response.resolve(workerwork.data);
          this.terminateCpuWorkers(true);
        };
        workerList.push(worker);
      }
    });
    try {
      await work();
    } catch (msg) {
      response.reject(msg);
    }

    return response.promise;
  }

  /**
   * Generate PoW using WebGL
   */
  getHashWebGL(hash, multiplier) {
    this.checkPowProcessLength(); // start alert timer
    const newThreshold = this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold);
    console.log('Generating work with multiplier ' + multiplier + ' at threshold ' + newThreshold + ' using WebGL for hash: ', hash);

    const response = this.getDeferredPromise();

    const start = Date.now();
    try {
      window['NanoWebglPow'](hash, (work, n) => {
          console.log(`WebGL Worker: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds [${n} iterations]`);
          response.resolve(work);
        },
        n => {
          if (this.shouldAbortGpuPow) {
            this.shouldAbortGpuPow = false;
            response.reject(workState.cancelled);
            return true;
          }
        },
        '0x' + newThreshold.substring(0, 8).toUpperCase() // max threshold for webglpow is currently ffffffff00000000
      );
    } catch (error) {
      if (error.message === 'webgl2_required') {
        this.webGLAvailable = false;
        console.warn('WebGL is required for GPU pow');
      }
      response.reject(workState.error);
    }

    return response.promise;
  }


  // Helper for returning a deferred promise that we can resolve when work is ready
  private getDeferredPromise() {
    const defer = {
      promise: null,
      resolve: null,
      reject: null,
    };

    defer.promise = new Promise((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });

    return defer;
  }

  // Check if pow takes longer than limit, then notify user
  async checkPowProcessLength() {
    this.shouldAbortGpuPow = false;
    this.currentProcessTime = Date.now();
    while (this.currentProcessTime !== 0) {
      // display alert of PoW has been running more than X ms
      if (Date.now() - this.currentProcessTime >= this.powAlertLimit * 1000) {
        this.powAlert$.next(true);
      }
      await this.sleep(1000);
    }
    this.powAlert$.next(false);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Interupt running pow and empty the queue
  public cancelAllPow(notify) {
    if (this.currentProcessTime !== 0) {
      this.currentProcessTime = 0; // reset timer
      this.powAlert$.next(false); // announce alert to close
      this.shouldContinueQueue = false; // disable further processing
      this.terminateCpuWorkers(false); // abort CPU worker if running
      this.shouldAbortGpuPow = true; // abort GPU pow if running
      if (notify) {
        this.notifications.sendInfo(`Proof of Work generation cancelled by the user`);
      }
      return true;
    }
    return false;
  }

  terminateCpuWorkers(successful) {
    for (const workerIndex in workerList) {
      if (Object.prototype.hasOwnProperty.call(workerList, workerIndex)) {
        workerList[workerIndex].terminate();
      }
    }
    if (successful && this.cpuWorkerResolve) {
      this.cpuWorkerResolve();
    } else if (!successful && this.cpuWorkerReject) {
      this.cpuWorkerReject(workState.cancelled);
    }
  }

}
