import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ModalService} from "../../services/modal.service";

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;

  constructor(private walletService: WalletService, private notificationService: NotificationService, public modal: ModalService) { }

  async ngOnInit() {
  }

  async createAccount() {
    if (this.walletService.walletIsLocked()) {
      return this.notificationService.sendError(`Wallet is locked.`);
    }
    if (!this.walletService.wallet.seed) return this.notificationService.sendError(`Wallet is not configured`);
    const newAccount = await this.walletService.addWalletAccount();
    this.notificationService.sendSuccess(`Successfully created new account ${newAccount.id}`);
  }

}
