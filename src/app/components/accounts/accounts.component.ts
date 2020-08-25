import { Component, OnInit } from '@angular/core';
import {Subject, timer} from 'rxjs';
import {debounce} from 'rxjs/operators';
import {
  AppSettingsService,
  LedgerService,
  LedgerStatus,
  ModalService,
  NotificationService,
  RepresentativeService,
  WalletService
} from '../../services';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;
  isLedgerWallet = this.walletService.isLedgerWallet();
  isSingleKeyWallet = this.walletService.isSingleKeyWallet();
  viewAdvanced = false;
  newAccountIndex = null;

  // When we change the accounts, redetect changable reps (Debounce by 5 seconds)
  accountsChanged$ = new Subject();
  reloadRepWarning$ = this.accountsChanged$.pipe(debounce(() => timer(5000)));

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    public modal: ModalService,
    public settings: AppSettingsService,
    private representatives: RepresentativeService,
    private ledger: LedgerService) { }

  async ngOnInit() {
    this.reloadRepWarning$.subscribe(a => {
      this.representatives.detectChangeableReps();
    });
  }

  async createAccount() {
    if (this.walletService.isLocked()) {
      return this.notificationService.sendError(`Wallet is locked.`);
    }
    if (!this.walletService.isConfigured()) return this.notificationService.sendError(`Wallet is not configured`);
    if (this.walletService.wallet.accounts.length >= 20) return this.notificationService.sendWarning(`You can only track up to 20 accounts at a time.`);
    // Advanced view, manual account index?
    let accountIndex = null;
    if (this.viewAdvanced && this.newAccountIndex != null) {
      const index = parseInt(this.newAccountIndex, 10);
      if (index < 0) return this.notificationService.sendWarning(`Invalid account index - must be positive number`);
      const existingAccount = this.walletService.wallet.accounts.find(a => a.index === index);
      if (existingAccount) {
        return this.notificationService.sendWarning(`The account at this index is already loaded`);
      }
      accountIndex = index;
    }
    try {
      const newAccount = await this.walletService.addWalletAccount(accountIndex);
      this.notificationService.sendSuccess(`Successfully created new account ${newAccount.id}`);
      this.newAccountIndex = null;
      this.accountsChanged$.next(newAccount.id);
    } catch (err) {
      this.notificationService.sendError(`Unable to add new account: ${err.message}`);
    }
  }

  sortAccounts() {
    if (this.walletService.isLocked()) {
      return this.notificationService.sendError(`Wallet is locked.`);
    }
    if (!this.walletService.isConfigured()) return this.notificationService.sendError(`Wallet is not configured`);
    if (this.walletService.wallet.accounts.length <= 1) return this.notificationService.sendWarning(`You need at least 2 accounts to sort them`);
    this.walletService.wallet.accounts = this.walletService.wallet.accounts.sort((a, b) => a.index - b.index);
    // this.accounts = this.walletService.wallet.accounts;
    this.walletService.saveWalletExport(); // Save new sorted accounts list
    this.notificationService.sendSuccess(`Successfully sorted accounts by index!`);
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

  async deleteAccount(account) {
    if (this.walletService.walletIsLocked()) {
      return this.notificationService.sendWarning(`Wallet must be unlocked.`);
    }
    try {
      await this.walletService.removeWalletAccount(account.id);
      this.notificationService.sendSuccess(`Successfully removed account ${account.id}`);
      this.accountsChanged$.next(account.id);
    } catch (err) {
      this.notificationService.sendError(`Unable to delete account: ${err.message}`);
    }
  }

  async showLedgerAddress(account) {
    if (this.ledger.ledger.status !== LedgerStatus.READY) {
      return this.notificationService.sendWarning(`Ledger device must be ready`);
    }
    this.notificationService.sendInfo(`Confirming account address on Ledger device...`, { identifier: 'ledger-account', length: 0 });
    try {
      await this.ledger.getLedgerAccount(account.index, true);
      this.notificationService.sendSuccess(`Account address confirmed on Ledger`);
    } catch (err) {
      this.notificationService.sendError(`Account address denied - if it is wrong do not use the wallet!`);
    }
    this.notificationService.removeNotification('ledger-account');
  }

}
