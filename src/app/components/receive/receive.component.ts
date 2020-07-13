import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ModalService} from "../../services/modal.service";
import {ApiService} from "../../services/api.service";
import {UtilService} from "../../services/util.service";
import {WorkPoolService} from "../../services/work-pool.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {NanoBlockService} from "../../services/nano-block.service";
import * as QRCode from 'qrcode';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.css']
})



export class ReceiveComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;

  pendingAccountModel = 0;
  pendingBlocks = [];
  qrCodeImage = null;
  qrAccount = "";
  qrAmount:BigNumber = null;
  currentPending = [];
  shouldLoop = false;

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
    this.shouldLoop = true;
    this.updateList();
    await this.loadPendingForAll();
  }

  ngOnDestroy() {
    // stop checking the list when not in this view
    this.shouldLoop = false;
  }

  // check for new pending in any account every 2sec and update list if needed
  async updateList() {
    let accounts = this.walletService.wallet.accounts;
    var tempPending = [];
    var anyAccountChanged = false;
    // save each account in an array to compare next time
    accounts.forEach(async function(account) {
      tempPending.push({id:account.id, pending:account.pending});
      this.currentPending.forEach(async function(entry) {
        // a certain account pending has changed from last check
        if (entry.id == account.id && entry.pending.comparedTo(account.pending) != 0) {
          anyAccountChanged = true;
          // process chosen single account
          if (this.pendingAccountModel != 0 && this.pendingAccountModel == entry.id) {
            await this.loadPendingForAccount(this.pendingAccountModel);
          }
        }
      }.bind(this))
    }.bind(this))
    if (this.pendingAccountModel == 0 && anyAccountChanged) {
      await this.loadPendingForAll();
    }

    this.currentPending = tempPending;
    
    if (this.shouldLoop) {
      setTimeout(() => this.updateList(), 1000);
    }
  }

  async loadPendingForAll() {
    this.pendingBlocks = [];

    let pending;
    if (this.settings.settings.minimumReceive) {
      const minAmount = this.util.nano.mnanoToRaw(this.settings.settings.minimumReceive);
      pending = await this.api.accountsPendingLimit(this.accounts.map(a => a.id), minAmount.toString(10));
    } else {
      pending = await this.api.accountsPending(this.accounts.map(a => a.id));
    }
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
          this.workPool.addWorkToCache(frontiers.frontiers[account]);
        }
      }
    }

  }

  async loadPendingForAccount(account) {
    this.pendingBlocks = [];

    let pending;
    if (this.settings.settings.minimumReceive) {
      const minAmount = this.util.nano.mnanoToRaw(this.settings.settings.minimumReceive);
      pending = await this.api.pendingLimit(account, 50, minAmount.toString(10));
    } else {
      pending = await this.api.pending(account, 50);
    }
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

  async changeQRAccount(account) {
    this.qrAccount = "";
    var qrCode = null;
    if (account.length > 1) {
      this.qrAccount = account;
      qrCode = await QRCode.toDataURL("nano:"+account + (this.qrAmount ? "?amount="+this.qrAmount.toString(10):""));
    }
    this.qrCodeImage = qrCode;
  }

  async changeQRAmount(amount) {
    this.qrAmount = null;
    var qrCode = null;
    if (amount != "") {
      if (this.util.account.isValidNanoAmount(amount)) {
        this.qrAmount = this.util.nano.mnanoToRaw(amount);
      }
    }
    if (this.qrAccount.length > 1) {
      qrCode = await QRCode.toDataURL("nano:"+this.qrAccount + (this.qrAmount ? "?amount="+this.qrAmount.toString(10):""));
      this.qrCodeImage = qrCode;
    }
  }

  async receivePending(pendingBlock) {
    const sourceBlock = pendingBlock.block;

    const walletAccount = this.walletService.wallet.accounts.find(a => a.id == pendingBlock.account);
    if (!walletAccount) throw new Error(`unable to find receiving account in wallet`);

    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);
    pendingBlock.loading = true;

    const newBlock = await this.nanoBlock.generateReceive(walletAccount, sourceBlock, this.walletService.isLedgerWallet());

    if (newBlock) {
      this.notificationService.sendSuccess(`Successfully received Nano!`);
    } else {
      if (!this.walletService.isLedgerWallet()) {
        this.notificationService.sendError(`There was an error receiving the transaction`)
      }
    }

    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
    //await this.loadPendingForAll();
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

}
