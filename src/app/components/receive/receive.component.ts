import { Component, OnInit } from '@angular/core';
import {WalletService, WalletAccount} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ModalService} from '../../services/modal.service';
import {ApiService} from '../../services/api.service';
import {UtilService} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {NanoBlockService} from '../../services/nano-block.service';
import {PriceService} from '../../services/price.service';
import {WebsocketService} from '../../services/websocket.service';
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
  amountNano = '';
  amountFiat = '';
  validNano = true;
  validFiat = true;
  qrSuccessClass = '';

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    public modal: ModalService,
    private api: ApiService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private nanoBlock: NanoBlockService,
    public price: PriceService,
    private websocket: WebsocketService,
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

    // Listen as new transactions come in. Ignore the latest transaction that is already present on page load.
    const latest = this.websocket.newTransactions$.getValue();
    this.websocket.newTransactions$.subscribe(async (transaction) => {
      if (transaction && latest !== transaction) {
        const rawAmount = new BigNumber(transaction.amount);
        if (transaction.block.link_as_account === this.qrAccount && rawAmount.gte(this.qrAmount || 0)) {
          this.showQrConfirmation();
        }
      }
    });
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
          // Technically should be 1/64 multiplier here but since we don't know if the pending will be received before
          // a send or change block is made it's safer to use 1x PoW threshold to be sure the cache will work.
          // On the other hand, it may be more efficient to use 1/64 and simply let the work cache rework in case a send is made instead
          // The typical user scenario would be to let the wallet auto receive first
          console.log('Adding pending to work cache');
          this.workPool.addWorkToCache(frontiers.frontiers[account], 1 / 64);
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

  async nanoAmountChange() {
    if (!this.validateNanoAmount() || Number(this.amountNano) === 0) {
      this.amountFiat = '';
      this.changeQRAmount();
      return;
    }
    const rawAmount = this.util.nano.mnanoToRaw(this.amountNano || 0);

    // This is getting hacky, but if their currency is bitcoin, use 6 decimals, if it is not, use 2
    const precision = this.settings.settings.displayCurrency === 'BTC' ? 1000000 : 100;

    // Determine fiat value of the amount
    const fiatAmount = this.util.nano.rawToMnano(rawAmount).times(this.price.price.lastPrice)
      .times(precision).floor().div(precision).toNumber();

    this.amountFiat = fiatAmount.toString();
    this.changeQRAmount(rawAmount.toFixed());
  }

  async fiatAmountChange() {
    if (!this.validateFiatAmount() || Number(this.amountFiat) === 0) {
      this.amountNano = '';
      this.changeQRAmount();
      return;
    }
    const rawAmount = this.util.nano.mnanoToRaw(new BigNumber(this.amountFiat).div(this.price.price.lastPrice));
    const nanoVal = this.util.nano.rawToNano(rawAmount).floor();
    const rawRounded = this.util.nano.nanoToRaw(nanoVal);
    const nanoAmount = this.util.nano.rawToMnano(rawRounded);

    this.amountNano = nanoAmount.toFixed();
    this.changeQRAmount(rawRounded.toFixed());
  }

  validateNanoAmount() {
    if (!this.amountNano) {
      this.validNano = true;
      return true;
    }
    this.validNano = this.amountNano !== '-' && (this.util.account.isValidNanoAmount(this.amountNano) || Number(this.amountNano) === 0);
    return this.validNano;
  }

  validateFiatAmount() {
    if (!this.amountFiat) {
      this.validFiat = true;
      return true;
    }
    this.validFiat = this.util.string.isNumeric(this.amountFiat) && Number(this.amountFiat) >= 0;
    return this.validFiat;
  }

  async changeQRAccount(account) {
    this.walletAccount = this.walletService.wallet.accounts.find(a => a.id === account) || null;
    this.qrAccount = '';
    let qrCode = null;
    if (account.length > 1) {
      this.qrAccount = account;
      qrCode = await QRCode.toDataURL(`nano:${account}${this.qrAmount ? `?amount=${this.qrAmount.toString(10)}` : ''}`, {scale: 7});
    }
    this.qrCodeImage = qrCode;
  }

  async changeQRAmount(raw?) {
    this.qrAmount = null;
    let qrCode = null;
    if (raw) {
      if (this.util.account.isValidAmount(raw)) {
        this.qrAmount = raw;
      }
    }
    if (this.qrAccount.length > 1) {
      qrCode = await QRCode.toDataURL(`nano:${this.qrAccount}${this.qrAmount ? `?amount=${this.qrAmount.toString(10)}` : ''}`, {scale: 7});
      this.qrCodeImage = qrCode;
    }
  }

  async showQrConfirmation() {
    this.qrSuccessClass = 'in';
    setTimeout(() => { this.qrSuccessClass = 'out'; }, 7000);
    setTimeout(() => { this.qrSuccessClass = ''; }, 12000);
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
      this.notificationService.removeNotification('success-receive');
      this.notificationService.sendSuccess(`Successfully received Nano!`, { identifier: 'success-receive' });
      // clear the list of pending blocks. Updated again with reloadBalances()
      this.walletService.clearPendingBlocks();
    } else {
      if (!this.walletService.isLedgerWallet()) {
        this.notificationService.sendError(`There was a problem receiving the transaction, try manually!`, {length: 10000});
      }
    }

    pendingBlock.loading = false;

    await this.walletService.reloadBalances();
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

  toBigNumber(value) {
    return new BigNumber(value);
  }

}
