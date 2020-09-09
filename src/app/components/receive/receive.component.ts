import { Component, OnInit } from '@angular/core';
import {WalletService, WalletAccount} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ModalService} from '../../services/modal.service';
import {ApiService} from '../../services/api.service';
import {UtilService} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {NanoBlockService} from '../../services/nano-block.service';
import * as QRCode from 'qrcode';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.css']
})



export class ReceiveComponent implements OnInit {
  nano = 1000000000000000000000000;
  accounts = this.walletService.wallet.accounts;
  pendingBelowThreshold = [];

  pendingAccountModel = '0';
  pendingBlocks = [];
  qrCodeImage = null;
  qrAccount = '';
  qrAmount: BigNumber = null;
  minAmount: BigNumber = this.settings.settings.minimumReceive ? this.util.nano.mnanoToRaw(this.settings.settings.minimumReceive) : null;
  walletAccount: WalletAccount = null;
  selAccountInit = false;
  loadingIncomingTxList = false;

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
    // Update selected account if changed in the sidebar
    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      if (this.selAccountInit) {
        this.pendingAccountModel = acc ? acc.id : '0';
        this.changeQRAccount(this.pendingAccountModel);
      }
      this.selAccountInit = true;
    });

    await this.loadPendingForAll();
    // Set the account selected in the sidebar as default
    if (this.walletService.wallet.selectedAccount !== null) {
      this.pendingAccountModel = this.walletService.wallet.selectedAccount.id;
      this.changeQRAccount(this.pendingAccountModel);
    }
  }

  async loadPendingForAll() {
    const walletPendingBlocks = this.walletService.wallet.pendingBlocks;
    const walletPendingBlocksBelowThreshold = this.walletService.wallet.pendingBelowThreshold;

    this.pendingBlocks = [];
    this.pendingBelowThreshold = [];

    // Now, only if we have results, do a unique on the account names, and run account info on all of them?
    if (walletPendingBlocks.length) {
      this.loadingIncomingTxList = true;
      const frontiers = await this.api.accountsFrontiers(walletPendingBlocks.map(p => p.account));
      if (frontiers && frontiers.frontiers) {
        for (const account in frontiers.frontiers) {
          if (!frontiers.frontiers.hasOwnProperty(account)) {
            continue;
          }
          this.workPool.addWorkToCache(frontiers.frontiers[account]);
        }
      }
    }

    this.loadingIncomingTxList = false;
    this.pendingBlocks = walletPendingBlocks;
    this.pendingBelowThreshold = walletPendingBlocksBelowThreshold;
  }

  async getPending() {
    // clear the list of pending blocks. Updated again with reloadBalances()
    this.pendingBlocks = [];
    this.loadingIncomingTxList = true;
    await this.walletService.reloadBalances(true);
    await this.loadPendingForAll();
  }

  async changeQRAccount(account) {
    this.walletAccount = this.walletService.wallet.accounts.find(a => a.id === account) || null;
    this.qrAccount = '';
    let qrCode = null;
    if (account.length > 1) {
      this.qrAccount = account;
      qrCode = await QRCode.toDataURL('nano:' + account + (this.qrAmount ? '?amount=' + this.qrAmount.toString(10) : ''));
    }
    this.qrCodeImage = qrCode;
  }

  async changeQRAmount(amount) {
    this.qrAmount = null;
    let qrCode = null;
    if (amount !== '') {
      if (this.util.account.isValidNanoAmount(amount)) {
        this.qrAmount = this.util.nano.mnanoToRaw(amount);
      }
    }
    if (this.qrAccount.length > 1) {
      qrCode = await QRCode.toDataURL('nano:' + this.qrAccount + (this.qrAmount ? '?amount=' + this.qrAmount.toString(10) : ''));
      this.qrCodeImage = qrCode;
    }
  }

  async receivePending(pendingBlock) {
    const sourceBlock = pendingBlock.hash;

    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === pendingBlock.account);
    if (!walletAccount) {
      throw new Error(`unable to find receiving account in wallet`);
    }

    if (this.walletService.walletIsLocked()) {
      return this.notificationService.sendWarning(`Wallet must be unlocked`);
    }
    pendingBlock.loading = true;

    const newBlock = await this.nanoBlock.generateReceive(walletAccount, sourceBlock, this.walletService.isLedgerWallet());

    if (newBlock) {
      this.notificationService.sendSuccess(`Successfully received Nano!`);
      // clear the list of pending blocks. Updated again with reloadBalances()
      this.walletService.clearPendingBlocks();
    } else {
      if (!this.walletService.isLedgerWallet()) {
        this.notificationService.sendError(`There was an error receiving the transaction`);
      }
    }

    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

  toBigNumber(value) {
    return new BigNumber(value);
  }

}
