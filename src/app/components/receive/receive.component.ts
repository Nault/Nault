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
    private settings: AppSettingsService,
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

    // From account?
    const fromAcct = await this.api.accountInfo(pendingBlock.source);
    if (!fromAcct) throw new Error(`Unable to load info on source account?`);

    const toAcct = await this.api.accountInfo(walletAccount.id);
    let blockData: any = {};
    let workBlock = null;

    if (!toAcct || !toAcct.frontier) {
      // This is an open block!
      const context = blake.blake2bInit(32, null);
      blake.blake2bUpdate(context, this.util.hex.toUint8(sourceBlock));
      blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(this.representativeAccount)));
      blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(walletAccount.id)));
      const hashBytes = blake.blake2bFinal(context);

      const privKey = walletAccount.keyPair.secretKey;
      const signed = nacl.sign.detached(hashBytes, privKey);
      const signature = this.util.hex.fromUint8(signed);
      const PK = this.util.account.getAccountPublicKey(walletAccount.id);

      workBlock = PK;
      blockData = {
        type: 'open',
        account: pendingBlock.account,
        representative: this.representativeAccount,
        source: sourceBlock,
        signature: signature,
        work: null,
      };
    } else {
      const previousBlock = toAcct.frontier;
      const context = blake.blake2bInit(32, null);
      blake.blake2bUpdate(context, this.util.hex.toUint8(previousBlock));
      blake.blake2bUpdate(context, this.util.hex.toUint8(sourceBlock));
      const hashBytes = blake.blake2bFinal(context);

      const privKey = walletAccount.keyPair.secretKey;
      const signed = nacl.sign.detached(hashBytes, privKey);
      const signature = this.util.hex.fromUint8(signed);

      workBlock = previousBlock;
      blockData = {
        type: 'receive',
        previous: previousBlock,
        source: sourceBlock,
        signature: signature,
        work: null,
      };
    }

    // const response = await this.api.workGenerate(workBlock);
    const response = await this.workPool.getWork(workBlock);

    const work = response.work;

    blockData.work = work;

    const processResponse = await this.api.process(blockData);
    if (processResponse && processResponse.hash) {
      walletAccount.frontier = processResponse.hash;
      this.notificationService.sendSuccess(`Successfully received XRB!`);
      this.workPool.addToPool(processResponse.hash); // Add new hash into the work pool
    } else {
      this.notificationService.sendError(`There was an error sending your transaction: ${processResponse.message}`)
    }
    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
    await this.loadPendingForAll();
  }

}
