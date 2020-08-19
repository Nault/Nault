import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {HttpHeaders} from '@angular/common/http';
import {NodeService} from './node.service';
import {AppSettingsService} from './app-settings.service';
import { TxType } from './util.service';

@Injectable()
export class ApiService {
  constructor(private http: HttpClient, private node: NodeService, private appSettings: AppSettingsService) { }

  private async request(action, data, skipError= false): Promise<any> {
    data.action = action;
    const apiUrl = this.appSettings.settings.serverAPI;
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
      .catch(err => {
        if (skipError) return;
        if (err.status === 500 || err.status === 0) {
          this.node.setOffline(); // Hard error, node is offline
          throw err;
        } else if (err.status === 429) {
          if (this.appSettings.settings.serverName === 'random') {
            console.log('Too many requests, new backend...');
            this.appSettings.loadServerSettings();
            return this.request(action, data);
          } else {
            this.node.setOffline('Too Many Requests to the node. Try again later or choose a different node.');
          }
        }
      });
  }

  async accountsBalances(accounts: string[]): Promise<{balances: any }> {
    return await this.request('accounts_balances', { accounts });
  }
  async accountsFrontiers(accounts: string[]): Promise<{frontiers: any }> {
    return await this.request('accounts_frontiers', { accounts });
  }
  async accountsPending(accounts: string[], count: number = 50): Promise<{blocks: any }> {
    return await this.request('accounts_pending', { accounts, count, source: true, include_only_confirmed: true });
  }
  async accountsPendingLimit(accounts: string[], threshold: string, count: number = 50): Promise<{blocks: any }> {
    return await this.request('accounts_pending', { accounts, count, threshold, source: true, include_only_confirmed: true });
  }
  async delegatorsCount(account: string): Promise<{ count: string }> {
    return await this.request('delegators_count', { account });
  }
  async representativesOnline(): Promise<{ representatives: any }> {
    return await this.request('representatives_online', { });
  }

  async blocksInfo(blocks): Promise<{blocks: any, error?: string}> {
    return await this.request('blocks_info', { hashes: blocks, pending: true, source: true });
  }
  async blockInfo(hash): Promise<any> {
    return await this.request('block_info', { hash: hash });
  }
  async blockCount(): Promise<{count: number, unchecked: number, cemented: number }> {
    return await this.request('block_count', { include_cemented: 'true'});
  }
  async workGenerate(hash): Promise<{ work: string }> {
    return await this.request('work_generate', { hash });
  }
  async process(block, subtype: TxType): Promise<{ hash: string, error?: string }> {
    return await this.request('process', { block: JSON.stringify(block), watch_work: 'false', subtype: TxType[subtype] });
  }
  async accountHistory(account, count = 25, raw = false): Promise<{history: any }> {
    return await this.request('account_history', { account, count, raw });
  }
  async accountInfo(account): Promise<any> {
    return await this.request('account_info', { account, pending: true, representative: true, weight: true });
  }
  async pending(account, count): Promise<any> {
    return await this.request('pending', { account, count, source: true, include_only_confirmed: true });
  }
  async pendingLimit(account, count, threshold): Promise<any> {
    return await this.request('pending', { account, count, threshold, source: true, include_only_confirmed: true });
  }
  async pendingSorted(account, count): Promise<any> {
    return await this.request('pending', { account, count, source: true, include_only_confirmed: true, sorting: true });
  }
  async pendingLimitSorted(account, count, threshold): Promise<any> {
    return await this.request('pending', { account, count, threshold, source: true, include_only_confirmed: true, sorting: true });
  }
  async version(): Promise<{rpc_version: number, store_version: number, protocol_version: number, node_vendor: string, network: string,
    network_identifier: string, build_info: string }> {
    return await this.request('version', { }, true);
  }
  async confirmationQuorum(): Promise<{quorum_delta: string, online_weight_quorum_percent: number, online_weight_minimum: string,
    online_stake_total: string, peers_stake_total: string, peers_stake_required: string }> {
    return await this.request('confirmation_quorum', { }, true);
  }
}
