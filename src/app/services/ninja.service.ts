import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { UtilService } from './util.service';

@Injectable()
export class NinjaService {

  // URL to MyNanoNinja-compatible representative health check API
  // set to empty string to disable
  ninjaUrl = '';

  // null - loading, false - offline, true - online
  status = null;

  constructor(private http: HttpClient, private notifications: NotificationService, private util: UtilService) { }

  private async request(action): Promise<any> {
    if (this.ninjaUrl === '') {
      return Promise.resolve(null);
    }

    return await this.http.get(this.ninjaUrl + action).toPromise()
      .then(res => {
        return res;
      })
      .catch(err => {
        return;
      });
  }

  private randomizeByScore(replist: any) {

    const scores = {};
    const newlist = [];

    for (const account of replist) {
      scores[account.score] = scores[account.score] || [];
      scores[account.score].push(account);
    }

    for (const score in scores) {
      if (scores.hasOwnProperty(score)) {
        let accounts = scores[score];
        accounts = this.util.array.shuffle(accounts);

        for (const account of accounts) {
          newlist.unshift(account);
        }
      }
    }

    return newlist;
  }

  async recommended(): Promise<any> {
    return await this.request('accounts/verified');
  }

  async recommendedRandomized(): Promise<any> {
    const replist = await this.recommended();

    if (replist == null) {
      return [];
    }

    return this.randomizeByScore(replist);
  }

  async getSuggestedRep(): Promise<any> {
    const replist = await this.recommendedRandomized();
    return replist[0];
  }

  // Expected to return:
  // false, if the representative never voted as part of nano consensus
  // null, if the representative state is unknown (any other error)
  async getAccount(account: string): Promise<any> {
    if (this.ninjaUrl === '') {
      return Promise.resolve(null);
    }

    const REQUEST_TIMEOUT_MS = 10000;

    const successPromise =
      this.http.get(this.ninjaUrl + 'accounts/' + account).toPromise()
        .then(res => {
          return res;
        })
        .catch(err => {
          if (err.status === 404) {
            return false;
          }

          return null;
        });

    const timeoutPromise =
      new Promise(resolve => {
        setTimeout(
          () => {
            resolve(null);
          },
          REQUEST_TIMEOUT_MS
        );
      });

    return await Promise.race([
      successPromise,
      timeoutPromise
    ]);
  }

}
