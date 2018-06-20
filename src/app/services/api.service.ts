import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {NodeService} from "./node.service";

@Injectable()
export class ApiService {

  // rpcUrl = `https://nanovault.io/api/node-api`;
  rpcUrl = `http://localhost:9950/api/node-api`;

  constructor(private http: HttpClient, private node: NodeService) { }

  private async request(action, data): Promise<any> {
    data.action = action;
    return await this.http.post(this.rpcUrl, data).toPromise()
      .then(res => {
        this.node.setOnline();
        return res;
      })
      .catch(err => {
        if (err.status === 500 || err.status === 0) {
          this.node.setOffline(); // Hard error, node is offline
        }
        throw err;
      });
  }

  async accountsBalances(accounts: string[]): Promise<{balances: any }> {
    return await this.request('accounts_balances', { accounts });
  }
  async accountsFrontiers(accounts: string[]): Promise<{frontiers: any }> {
    return await this.request('accounts_frontiers', { accounts });
  }
  async accountsPending(accounts: string[], count: number = 50): Promise<{blocks: any }> {
    return await this.request('accounts_pending', { accounts, count, source: true });
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
  async blockCount(): Promise<{count: number, unchecked: number }> {
    return await this.request('block_count', { });
  }
  async workGenerate(hash): Promise<{ work: string }> {
    return await this.request('work_generate', { hash });
  }
  async process(block): Promise<{ hash: string, error?: string }> {
    return await this.request('process', { block: JSON.stringify(block) });
  }
  async accountHistory(account, count = 25, raw = false): Promise<{history: any }> {
    return await this.request('account_history', { account, count, raw });
  }
  async accountInfo(account): Promise<any> {
    return await this.request('account_info', { account, pending: true, representative: true, weight: true });
  }
  async validateAccountNumber(account): Promise<{ valid: '1'|'0' }> {
    return await this.request('validate_account_number', { account });
  }
  async pending(account, count): Promise<any> {
    return await this.request('pending', { account, count, source: true });
  }
}
