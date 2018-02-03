import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";

@Component({
  selector: 'app-configure-wallet',
  templateUrl: './configure-wallet.component.html',
  styleUrls: ['./configure-wallet.component.css']
})
export class ConfigureWalletComponent implements OnInit {
  wallet = this.walletService.wallet;
  activePanel = 0;

  newWalletSeed = '';
  importSeedModel = '';
  walletPasswordModel = '';

  constructor(private walletService: WalletService, private notifications: NotificationService) { }

  async ngOnInit() {
  }

  async importExistingWallet() {
    const existingSeed = this.importSeedModel.trim();
    if (existingSeed.length !== 64) return this.notifications.sendError(`Seed is invalid, double check it!`);

    this.walletService.createWalletFromSeed(existingSeed);
    this.activePanel = 4;

    this.notifications.sendSuccess(`Successfully imported existing wallet!`);
  }

  async createNewWallet() {
    const newSeed = this.walletService.createNewWallet();
    this.newWalletSeed = newSeed;

    this.activePanel = 3;
    this.notifications.sendSuccess(`Successfully created new wallet! Make sure to write down your seed!`);
  }

  confirmNewSeed() {
    this.newWalletSeed = '';

    this.activePanel = 4;
  }

  saveWalletPassword() {
    const newPassword = this.walletPasswordModel;
    this.walletService.walletPassword = newPassword;
    this.walletPasswordModel = '';

    this.activePanel = 5;
    this.notifications.sendSuccess(`Successfully set wallet password!`);
  }

  setPanel(panel) {
    this.activePanel = panel;
  }

  copied() {
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`);
  }

}
