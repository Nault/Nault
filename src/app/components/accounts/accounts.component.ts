import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ModalService} from "../../services/modal.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {LedgerService, LedgerStatus} from "../../ledger.service";

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;
  isLedgerWallet = this.walletService.isLedgerWallet();

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    public modal: ModalService,
    public settings: AppSettingsService,
    private ledger: LedgerService) { }

  async ngOnInit() {
  }

  async createAccount() {
    if (this.walletService.isLocked()) {
      return this.notificationService.sendError(`Wallet is locked.`);
    }
    if (!this.walletService.isConfigured()) return this.notificationService.sendError(`Wallet is not configured`);
    if (this.walletService.wallet.accounts.length >= 20) return this.notificationService.sendWarning(`You can only track up to 20 accounts at a time.`);
    try {
      const newAccount = await this.walletService.addWalletAccount();
      this.notificationService.sendSuccess(`Successfully created new account ${newAccount.id}`);
    } catch (err) {
    }
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
