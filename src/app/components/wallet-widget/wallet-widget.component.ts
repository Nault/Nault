import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";

@Component({
  selector: 'app-wallet-widget',
  templateUrl: './wallet-widget.component.html',
  styleUrls: ['./wallet-widget.component.css']
})
export class WalletWidgetComponent implements OnInit {
  wallet = this.walletService.wallet;

  unlockPassword = '';

  modal: any = null;

  constructor(private walletService: WalletService, private notificationService: NotificationService) { }

  ngOnInit() {
    const UIkit = (window as any).UIkit;
    const modal = UIkit.modal(document.getElementById('unlock-wallet-modal'));
    this.modal = modal;
  }

  async lockWallet() {
    const locked = await this.walletService.lockWallet();
    if (locked) {
      this.notificationService.sendSuccess(`Wallet locked`);
    } else {
      this.notificationService.sendError(`Unable to lock wallet`);
    }
  }

  async unlockWallet() {
    const unlocked = await this.walletService.unlockWallet(this.unlockPassword);
    this.unlockPassword = '';

    if (unlocked) {
      this.notificationService.sendSuccess(`Wallet unlocked`);
      this.modal.hide();
    } else {
      this.notificationService.sendError(`Invalid password, please try again!`);
    }

    this.unlockPassword = '';
  }

}
