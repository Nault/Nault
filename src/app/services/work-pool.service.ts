import { Injectable } from '@angular/core';
import {PowService, baseThreshold} from './pow.service';
import {NotificationService} from './notification.service';
import {UtilService} from './util.service';

@Injectable()
export class WorkPoolService {
  storeKey = `nanovault-workcache`;

  cacheLength = 25;
  workCache = [];

  constructor(private pow: PowService, private notifications: NotificationService, private util: UtilService) { }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public workExists(hash) {
    return !!this.workCache.find(p => p.hash === hash);
  }

  // A simple helper, which doesn't wait for a response (Used for pre-loading work)
  public addWorkToCache(hash, multiplier= 1) {
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
  public async getWork(hash, multiplier= 1) {
    let cached = this.workCache.find(p => p.hash === hash);
    const tempWork = '1';

    // if work is requested while work is already being processed for this hash
    if (cached && cached.work === tempWork) {
      // wait for current pow to finish or fail
      while (cached && cached.work === tempWork) {
        await this.sleep(100);
        cached = this.workCache.find(p => p.hash === hash);
      }
      if (cached && cached.work && cached.multiplier === multiplier &&
        this.util.nano.validateWork(hash, this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold), cached.work)) {
        console.log('Using pre-processed work: ' + cached.work);
        return cached.work;
      }
      // if the work was invalid and removed from cache, also invalidate the response
      console.log('Invalid pre-processed work');
      return null;
    } else if (cached && cached.work &&
      this.util.nano.validateWork(hash, this.util.nano.difficultyFromMultiplier(multiplier, baseThreshold), cached.work)) {
      console.log('Using cached work: ' + cached.work);
      return cached.work;
    }

    // add temp work to prevent duplicate hashes in the cache due to asynchronous calls during "await"
    let work = tempWork;
    this.workCache.push({ hash, work });

    work = await this.pow.getPow(hash, multiplier);
    if (!work) {
      this.notifications.sendWarning(`Failed to retrieve work for ${hash}.  Try a different PoW method.`);
      // remove temp work (will also break the while loop above for parallel threads)
      const x = this.workCache.findIndex(p => p.hash === hash && p.work === tempWork);
      if (x !== -1) this.workCache.splice(x, 1);
      return null;
    }

    console.log('Work found: ' + work);

    this.workCache.push({ hash, work }); // add the real work
    // remove temp work (important to remove after push to avoid possible race condition)
    const index = this.workCache.findIndex(p => p.hash === hash && p.work === tempWork);
    if (index !== -1) this.workCache.splice(index, 1);

    if (this.workCache.length >= this.cacheLength) this.workCache.shift(); // Prune if we are at max length
    this.saveWorkCache();

    return work;
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
