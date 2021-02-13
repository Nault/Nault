import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {HttpHeaders} from '@angular/common/http';
import {NodeService} from './node.service';
import {AppSettingsService} from './app-settings.service';
import { TxType } from './util.service';

@Injectable()
export class ApiService {
  storeKey = `nanovault-active-difficulty`;
  difficultyCacheDuration = 60; // time to keep active_difficulty in cache [sec]
  constructor(private http: HttpClient, private node: NodeService, private appSettings: AppSettingsService) { }

  private async request(action, data, skipError, url = ''): Promise<any> {
    data.action = action;
    const apiUrl = url === '' ? this.appSettings.settings.serverAPI : url;
    if (!apiUrl) {
      this.node.setOffline(null); // offline mode
      return;
    }
    if (this.node.node.status === false) {
      if (!skipError) {
        this.node.setLoading();
      }
    }
    let header;
    if (this.appSettings.settings.serverAuth != null && this.appSettings.settings.serverAuth !== '') {
      header = {
        headers: new HttpHeaders()
          .set('Authorization',  this.appSettings.settings.serverAuth)
      };
    }
    return await this.http.post(apiUrl, data, header).toPromise()
      .then(res => {
        this.node.setOnline();
        return res;
      })
      .catch(async err => {
        if (skipError) return;
        console.log('Node responded with error', err.status);

        if (this.appSettings.settings.serverName === 'random') {
          // choose a new backend and do the request again
          this.appSettings.loadServerSettings();
          await this.sleep(1000); // delay if all servers are down
          return this.request(action, data, skipError);
        } else {
          // hard exit
          if (err.status === 429) {
            this.node.setOffline('Too Many Requests to the node. Try again later or choose a different node.');
          } else {
            this.node.setOffline();
          }
          throw err;
        }
      });
  }

  async accountsBalances(accounts: string[]): Promise<{balances: any }> {
    return await this.request('accounts_balances', { accounts }, false);
  }
  async accountsFrontiers(accounts: string[]): Promise<{frontiers: any }> {
    return await this.request('accounts_frontiers', { accounts }, false);
  }
  async accountsPending(accounts: string[], count: number = 50): Promise<{blocks: any }> {
    return await this.request('accounts_pending', { accounts, count, source: true, include_only_confirmed: true }, false);
  }
  async accountsPendingLimit(accounts: string[], threshold: string, count: number = 50): Promise<{blocks: any }> {
    return await this.request('accounts_pending', { accounts, count, threshold, source: true, include_only_confirmed: true }, false);
  }
  async delegatorsCount(account: string): Promise<{ count: string }> {
    return await this.request('delegators_count', { account }, false);
  }
  async representativesOnline(): Promise<{ representatives: any }> {
    return await this.request('representatives_online', { }, false);
  }

  async blocksInfo(blocks): Promise<{blocks: any, error?: string}> {
    return await this.request('blocks_info', { hashes: blocks, pending: true, source: true }, false);
  }
  async blockInfo(hash): Promise<any> {
    return await this.request('block_info', { hash: hash }, false);
  }
  async blockCount(): Promise<{count: number, unchecked: number, cemented: number }> {
    return await this.request('block_count', { include_cemented: 'true'}, false);
  }
  async workGenerate(hash, difficulty, workServer = ''): Promise<{ work: string }> {
    return await this.request('work_generate', { hash, difficulty }, workServer !== '', workServer);
  }
  async process(block, subtype: TxType): Promise<{ hash: string, error?: string }> {
    return await this.request('process', { block: JSON.stringify(block), watch_work: 'false', subtype: TxType[subtype] }, false);
  }
  async accountHistory(account, count = 25, raw = false): Promise<{history: any }> {
    return await this.request('account_history', { account, count, raw }, false);
  }
  async accountInfo(account): Promise<any> {
    return await this.request('account_info', { account, pending: true, representative: true, weight: true }, false);
  }
  async pending(account, count): Promise<any> {
    return await this.request('pending', { account, count, source: true, include_only_confirmed: true }, false);
  }
  async pendingLimit(account, count, threshold): Promise<any> {
    return await this.request('pending', { account, count, threshold, source: true, include_only_confirmed: true }, false);
  }
  async pendingSorted(account, count): Promise<any> {
    return await this.request('pending', { account, count, source: true, include_only_confirmed: true, sorting: true }, false);
  }
  async pendingLimitSorted(account, count, threshold): Promise<any> {
    return await this.request('pending', { account, count, threshold, source: true, include_only_confirmed: true, sorting: true }, false);
  }
  async version(): Promise<{rpc_version: number, store_version: number, protocol_version: number, node_vendor: string, network: string,
    network_identifier: string, build_info: string }> {
    return await this.request('version', { }, true);
  }
  async confirmationQuorum(): Promise<{quorum_delta: string, online_weight_quorum_percent: number, online_weight_minimum: string,
    online_stake_total: string, peers_stake_total: string, peers_stake_required: string }> {
    return await this.request('confirmation_quorum', { }, true);
  }
  async activeDifficulty(): Promise<{network_current: string, network_receive_current: string }> {
    let latestDifficulty;
    // try cached value first
    const difficultyStore = localStorage.getItem(this.storeKey);
    if (difficultyStore) {
      latestDifficulty = JSON.parse(difficultyStore);
    }
    // cache duration has expired, get new value via API
    if (!difficultyStore || Date.now() > latestDifficulty.latest + (this.difficultyCacheDuration * 1000)) {
      // ignore API errors (false flag). If backend does not support this we use default difficulty downstream
      const networkDifficulty = await this.request('active_difficulty', { }, true);
      // only store if valid response
      if (networkDifficulty?.network_current?.length === 16 && networkDifficulty?.network_receive_current?.length === 16) {
        console.log('New active difficulty used for send: ' + networkDifficulty.network_current);
        console.log('New active difficulty used for receive: ' + networkDifficulty.network_receive_current);
        latestDifficulty = {
          latest: Date.now(),
          network_current: networkDifficulty.network_current,
          network_receive_current: networkDifficulty.network_receive_current
        };
      } else {
        console.log('Failed to get active_difficulty from server. Using default instead.');
        latestDifficulty = {
          latest:  Date.now(),
          network_current: '',
          network_receive_current: '',
        };
      }
    }
    // save to storage even if failed because we want cache duration
    localStorage.setItem(this.storeKey, JSON.stringify(latestDifficulty));
    return latestDifficulty;
  }

  public deleteCache() {
    localStorage.removeItem(this.storeKey);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
