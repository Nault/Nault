import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { UtilService } from './util.service';

@Injectable()
export class NinjaService {

  // URL to Ninja API
  ninjaUrl = 'https://mynano.ninja/api/';

  // null - loading, false - offline, true - online
  status = null;

  constructor(private http: HttpClient, private notifications: NotificationService, private util: UtilService) { }

  private async request(action): Promise<any> {
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
    return this.randomizeByScore(replist);
  }

  async getSuggestedRep(): Promise<any> {
    const replist = await this.recommendedRandomized();
    return replist[0];
  }

  // false - does not exist, null - any other error
  async getAccount(account: string): Promise<any> {
    return await this.http.get(this.ninjaUrl + 'accounts/' + account).toPromise()
      .then(res => {
        return res;
      })
      .catch(err => {
        if (err.status === 404) {
          return false;
        }

        return null;
      });
  }

}
