import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ModalService} from "../../services/modal.service";
import {ApiService} from "../../services/api.service";
import * as blake from 'blakejs';
import BigNumber from "bignumber.js";
import {UtilService} from "../../services/util.service";
import {WorkPoolService} from "../../services/work-pool.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {NanoBlockService} from "../../services/nano-block.service";
const nacl = window['nacl'];

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.css']
})
export class ReceiveComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;
  representativeAccount = 'xrb_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy'; // Official Representative 6

  pendingAccountModel = 0;
  pendingBlocks = [];

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    public modal: ModalService,
    private api: ApiService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private nanoBlock: NanoBlockService,
    private util: UtilService) { }

  async ngOnInit() {
    await this.loadPendingForAll();
  }

  async loadPendingForAll() {
    this.pendingBlocks = [];

    const pending = await this.api.accountsPending(this.accounts.map(a => a.id));
    if (!pending || !pending.blocks) return;

    for (let account in pending.blocks) {
      if (!pending.blocks.hasOwnProperty(account)) continue;
      for (let block in pending.blocks[account]) {
        if (!pending.blocks[account].hasOwnProperty(block)) continue;
        const pendingTx = {
          block: block,
          amount: pending.blocks[account][block].amount,
          source: pending.blocks[account][block].source,
          account: account,
        };
        // Account should be one of ours, so we should maybe know the frontier block for it?

        this.pendingBlocks.push(pendingTx);
      }
    }

    // Now, only if we have results, do a unique on the account names, and run account info on all of them?
    if (this.pendingBlocks.length) {
      const frontiers = await this.api.accountsFrontiers(this.pendingBlocks.map(p => p.account));
      if (frontiers && frontiers.frontiers) {
        for (let account in frontiers.frontiers) {
          if (!frontiers.frontiers.hasOwnProperty(account)) continue;
          this.workPool.addToPool(frontiers.frontiers[account]);
        }
      }
    }

  }

  async loadPendingForAccount(account) {
    this.pendingBlocks = [];

    const pending = await this.api.pending(account, 50);
    if (!pending || !pending.blocks) return;

    for (let block in pending.blocks) {
      const pendingTx = {
        block: block,
        amount: pending.blocks[block].amount,
        source: pending.blocks[block].source,
        account: account,
      };
      this.pendingBlocks.push(pendingTx);
    }
  }

  async getPending(account) {
    if (!account || account == 0) {
      await this.loadPendingForAll();
    } else {
      await this.loadPendingForAccount(account);
    }
  }

  async receivePending(pendingBlock) {
    const sourceBlock = pendingBlock.block;

    const walletAccount = this.walletService.wallet.accounts.find(a => a.id == pendingBlock.account);
    if (!walletAccount) throw new Error(`unable to find receiving account in wallet`);

    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);
    pendingBlock.loading = true;

    const newBlock = await this.nanoBlock.generateReceive(walletAccount, sourceBlock);

    if (newBlock) {
      this.notificationService.sendSuccess(`Successfully received XRB!`);
    } else {
      this.notificationService.sendError(`There was an error receiving the transaction`)
    }

    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
    await this.loadPendingForAll();
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

}
