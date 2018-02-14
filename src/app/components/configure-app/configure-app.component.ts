import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {PriceService} from "../../services/price.service";

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

  currencies = [
    { name: 'USD', value: 'USD' },
    { name: 'BTC', value: 'BTC' },
    { name: 'AUD', value: 'AUD' },
    { name: 'BRL', value: 'BRL' },
    { name: 'CAD', value: 'CAD' },
    { name: 'CNY', value: 'CNY' },
    { name: 'CZK', value: 'CZK' },
    { name: 'DKK', value: 'DKK' },
    { name: 'EUR', value: 'EUR' },
    { name: 'GBP', value: 'GBP' },
    { name: 'HKD', value: 'HKD' },
    { name: 'JPY', value: 'JPY' },
    { name: 'KRW', value: 'KRW' },
    { name: 'MXN', value: 'MXN' },
    { name: 'MYR', value: 'MYR' },
    { name: 'PLN', value: 'PLN' },
    { name: 'RUB', value: 'RUB' },
    { name: 'SEK', value: 'SEK' },
    { name: 'TWD', value: 'TWD' },
  ];
  selectedCurrency = this.currencies[0].value;

  constructor(private walletService: WalletService, private notifications: NotificationService, private appSettings: AppSettingsService, private price: PriceService) { }

  async ngOnInit() {
    const currency = this.appSettings.getAppSetting('displayCurrency') || 'USD';
    const matchingCurrency = this.currencies.find(d => d.value === currency);
    this.selectedCurrency = matchingCurrency.value || this.currencies[0].value;
    }

  async updateSettings() {
    const newDenomination = this.selectedDenomination.value;
    const newStorage = this.selectedStorage.value;
    const newCurrency = this.selectedCurrency;

    const resaveWallet = this.appSettings.settings.walletStore !== newStorage;
    const reloadFiat = this.appSettings.settings.displayCurrency !== newCurrency;

    this.appSettings.setAppSetting('displayDenomination', newDenomination);
    this.appSettings.setAppSetting('walletStore', newStorage);

    this.notifications.sendSuccess(`App settings successfully updated!`);

    if (resaveWallet) {
      this.walletService.saveWalletExport(); // If swapping the storage engine, resave the wallet
    }

    if (reloadFiat) {
      // Reload prices with our currency, then call to reload fiat balances.
      await this.price.getPrice(newCurrency);
      this.appSettings.setAppSetting('displayCurrency', newCurrency);
      this.walletService.reloadFiatBalances();
    }
  }
}
