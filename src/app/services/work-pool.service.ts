import { Injectable } from '@angular/core';
import {PowService, baseThreshold, workState} from './pow.service';
import {NotificationService} from './notification.service';
import {UtilService} from './util.service';

@Injectable()
export class WorkPoolService {
  storeKey = `nanovault-workcache`;

  cacheLength = 25;
  workCache = [];

  currentlyProcessingHashes = {};

  constructor(private pow: PowService, private notifications: NotificationService, private util: UtilService) { }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public workExists(hash) {
    return !!this.workCache.find(p => p.hash === hash);
  }

  // A simple helper, which doesn't wait for a response (Used for pre-loading work)
  public addWorkToCache(hash, multiplier = 1) {
    this.getWork(hash, multiplier);
  }

  // Remove a hash from from the cache
  public removeFromCache(hash) {
    const cachedIndex = this.workCache.findIndex(p => p.hash === hash);
    if (cachedIndex === -1) return;

    this.workCache.splice(cachedIndex, 1);
    this.saveWorkCache();
  }

  public clearCache() {
    this.workCache = [];
    this.saveWorkCache();

    return true;
  }

  public deleteCache() {
    this.workCache = [];
    localStorage.removeItem(this.storeKey);
  }

  // Get work for a hash.  Uses the cache, or the current setting for generating it.
  public async getWork(hash, multiplier = 1) {
    this.pow.shouldContinueQueue = true; // new pow should never be blocked
    // additional pow for the same hash will have to wait
    while ( this.currentlyProcessingHashes[hash] === true ) {
      await this.sleep(100);
    }

    // cancel any additional work that's coming from the wait loop above if user aborted during that loop
    if (!this.pow.shouldContinueQueue) return null;

    const cached = this.workCache.find(p => p.hash === hash);

    try {
      if (cached && cached.work &&
          this.util.nano.validateWork(hash, this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold), cached.work)) {
        console.log('Using cached work: ' + cached.work);
        return cached.work;
      }
    } catch (err) {
      console.log('Error validating cached work. ' + err);
    }

    this.currentlyProcessingHashes[hash] = true;

    let work;
    try {
      work = await this.pow.getPow(hash, multiplier);
    } catch (workState) {
      work = workState;
    }

    if (work.state === workState.error || work.state === workState.cancelled) {
      // Only display notification on error
      if (work.state === workState.error) {
        this.notifications.sendWarning(
          `Failed to retrieve proof of work for ${hash}. Try a different PoW method from the app settings.`, {length: 5000}
          );
      }
      delete this.currentlyProcessingHashes[hash];
      return null;
    }

    console.log('Work found: ' + work.work);

    // remove duplicates
    this.workCache = this.workCache.filter(entry => (entry.hash !== hash));

    this.workCache.push({ hash, work: work.work });
    delete this.currentlyProcessingHashes[hash];

    if (this.workCache.length >= this.cacheLength) this.workCache.shift(); // Prune if we are at max length
    this.saveWorkCache();

    return work.work;
  }

  /**
   * Save the work cache to localStorage
   */
  private saveWorkCache() {
    // Remove duplicates by keeping the last updated work
    this.workCache = this.uniqByKeepLast(this.workCache, it => it.hash);

    localStorage.setItem(this.storeKey, JSON.stringify(this.workCache));
  }

  /**
   * Load the work cache from localStorage
   */
  public loadWorkCache() {
    let workCache = [];
    const workCacheStore = localStorage.getItem(this.storeKey);
    if (workCacheStore) {
      workCache = JSON.parse(workCacheStore);
    }
    this.workCache = workCache;

    return this.workCache;
  }

  /**
   * Remove duplicates but keep the last one
   * @param a array
   * @param key it => it.hash
   */
  private uniqByKeepLast(a, key) {
    return [
        ...new Map(
            a.map(x => [key(x), x])
        ).values()
    ];
  }
}
