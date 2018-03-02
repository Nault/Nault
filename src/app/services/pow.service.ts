import { Injectable } from '@angular/core';
import {AppSettingsService} from "./app-settings.service";
import {ApiService} from "./api.service";
import {NotificationService} from "./notification.service";
import {queue} from "rxjs/scheduler/queue";
import { PoWSource } from './app-settings.service'

const mod = window['Module'];

@Injectable()
export class PowService {

  webGLAvailable = false;
  webGLTested = false;

  PoWPool = [];
  parallelQueue = false;
  processingQueueItem = false;

  constructor(private appSettings: AppSettingsService, private api: ApiService, private notifications: NotificationService) { }

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
  async getPow(hash) {
    const existingPoW = this.PoWPool.find(p => p.hash == hash);
    if (existingPoW) {
      return existingPoW.promise.promise; // Its okay if its resolved already
    }

    return this.addQueueItem(hash);
  }

  /**
   * Add a new hash into the queue to perform work on.
   * Returns a promise that is resolved when work is completed
   */
  addQueueItem(hash) {
    const existingPoW = this.PoWPool.find(p => p.hash == hash);
    if (existingPoW) {
      return existingPoW.promise.promise;
    }

    const queueItem = {
      hash,
      work: null,
      promise: this.getDeferredPromise(),
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
  };

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
    this.processingQueueItem = true;
    if (!this.PoWPool.length) return; // Nothing in the queue?
    const queueItem = this.PoWPool[0];

    let powSource = this.appSettings.settings.powSource;
    if (powSource === 'best') {
      powSource = this.determineBestPoWMethod();
    }

    let work;
    switch (powSource) {
      default:
      case 'server':
        work = (await this.api.workGenerate(queueItem.hash)).work;
        break;
      case 'clientCPU':
        work = await this.getHashCPUWorker(queueItem.hash);
        break;
      case 'clientWebGL':
        work = await this.getHashWebGL(queueItem.hash);
        break;
    }

    this.PoWPool.shift(); // Remove this item from the queue
    this.processingQueueItem = false;

    if (!work) {
      this.notifications.sendError(`Unable to generate work for ${queueItem.hash} using ${powSource}`);
      queueItem.promise.reject(null);
    } else {
      queueItem.work = work;
      queueItem.promise.resolve(work);
    }

    this.processQueue();

    return queueItem;
  }

  /**
   * Actual PoW functions
   */

  /**
   * Generate PoW using CPU without workers (Not used)
   */
  getHashCPUSync(hash) {
    const response = this.getDeferredPromise();

    const PoW = mod.cwrap("launchPoW", 'string', ['string']);
    const start = Date.now();
    let work;
    do { work = PoW(hash) } while (work == '0000000000000000');
    console.log(`Synchronous CPU: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds`);

    response.resolve(work);
    return response.promise;
  }

  /**
   * Generate PoW using CPU and WebWorkers
   */
  getHashCPUWorker(hash) {
    const response = this.getDeferredPromise();

    const start = Date.now();
    const NUM_THREADS = navigator.hardwareConcurrency < 4 ? navigator.hardwareConcurrency : 4;
    const workers = window['pow_initiate'](NUM_THREADS, '/assets/lib/pow/');

    window['pow_callback'](workers, hash, () => {}, (work) => {
      console.log(`CPU Worker: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds [${NUM_THREADS} Workers]`);
      response.resolve(work);
    });

    return response.promise;
  }

  /**
   * Generate PoW using WebGL
   */
  getHashWebGL(hash) {
    const response = this.getDeferredPromise();

    const start = Date.now();
    try {
      window['NanoWebglPow'](hash, (work, n) => {
          console.log(`WebGL Worker: Found work (${work}) for ${hash} after ${(Date.now() - start) / 1000} seconds [${n} iterations]`);
          response.resolve(work);
        },
        n => {}
      );
    } catch(error) {
      if (error.message === 'webgl2_required') {
        this.webGLAvailable = false;
      }
      response.resolve(null);
      // response.reject(error);
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

}
