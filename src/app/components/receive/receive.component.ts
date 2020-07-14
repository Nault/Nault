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
    this.pendingBlocks = this.walletService.wallet.pendingBlocks

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

  async getPending() {
    await this.walletService.reloadBalances(true)
    await this.loadPendingForAll();
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
    const sourceBlock = pendingBlock.hash;

    const walletAccount = this.walletService.wallet.accounts.find(a => a.id == pendingBlock.account);
    if (!walletAccount) throw new Error(`unable to find receiving account in wallet`);

    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);
    pendingBlock.loading = true;

    const newBlock = await this.nanoBlock.generateReceive(walletAccount, sourceBlock, this.walletService.isLedgerWallet());

    if (newBlock) {
      this.notificationService.sendSuccess(`Successfully received Nano!`);
      // clear the list of pending blocks
      this.walletService.clearPendingBlocks()
    } else {
      if (!this.walletService.isLedgerWallet()) {
        this.notificationService.sendError(`There was an error receiving the transaction`)
      }
    }

    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

}
