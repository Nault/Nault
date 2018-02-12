import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {AppSettingsService} from "../../services/app-settings.service";

@Component({
  selector: 'app-configure-app',
  templateUrl: './configure-app.component.html',
  styleUrls: ['./configure-app.component.css']
})
export class ConfigureAppComponent implements OnInit {
  wallet = this.walletService.wallet;

  denominations = [
    { name: 'XRB', value: 'xrb' },
    { name: 'KRAI (0.001 XRB)', value: 'krai' },
    { name: 'RAI (0.000001 XRB)', value: 'rai' },
  ];
  selectedDenomination = this.denominations.find(d => d.value === (this.appSettings.getAppSetting('displayDenomination') || 'xrb'));

  storageOptions = [
    { name: 'Local Storage', value: 'localStorage' },
    { name: 'None', value: 'none' },
  ];
  selectedStorage = this.storageOptions[0];

  constructor(private walletService: WalletService, private notifications: NotificationService, private appSettings: AppSettingsService) { }

  async ngOnInit() {
  }

  updateSettings() {
    const newDenomination = this.selectedDenomination.value;
    const newStorage = this.selectedStorage.value;

    const resaveWallet = this.appSettings.settings.walletStore !== newStorage;

    this.appSettings.setAppSetting('displayDenomination', newDenomination);
    this.appSettings.setAppSetting('walletStore', newStorage);

    this.notifications.sendSuccess(`App settings successfully updated!`);

    if (resaveWallet) {
      this.walletService.saveWalletExport(); // If swapping the storage engine, resave the wallet
    }
  }
}
