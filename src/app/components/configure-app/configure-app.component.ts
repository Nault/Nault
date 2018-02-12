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
    { name: 'XRB', value: 'mnano' },
    { name: 'KNANO (0.001 XRB)', value: 'knano' },
    { name: 'NANO (0.000001 XRB)', value: 'nano' },
  ];
  selectedDenomination = this.denominations.find(d => d.value === (this.appSettings.getAppSetting('displayDenomination') || 'mnano')) || this.denominations[0];

  storageOptions = [
    { name: 'Local Storage', value: 'localStorage' },
    { name: 'None', value: 'none' },
  ];
  selectedStorage = this.storageOptions[0];

  constructor(private walletService: WalletService, private notifications: NotificationService, private appSettings: AppSettingsService) { }

  async ngOnInit() {
    const currentDenomination = this.appSettings.getAppSetting('displayDenomination');
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
