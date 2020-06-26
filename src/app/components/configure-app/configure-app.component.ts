import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {PriceService} from "../../services/price.service";
import {PowService} from "../../services/pow.service";
import {WorkPoolService} from "../../services/work-pool.service";
import {AddressBookService} from "../../services/address-book.service";
import {ApiService} from "../../services/api.service";
import {LedgerService, LedgerStatus} from "../../services/ledger.service";
import BigNumber from "bignumber.js";
import {WebsocketService} from "../../services/websocket.service";
import {NodeService} from "../../services/node.service";
import {UtilService} from "../../services/util.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {RepresentativeService} from "../../services/representative.service";

@Component({
  selector: 'app-configure-app',
  templateUrl: './configure-app.component.html',
  styleUrls: ['./configure-app.component.css']
})
export class ConfigureAppComponent implements OnInit {
  wallet = this.walletService.wallet;

  denominations = [
    { name: 'NANO (1 Mnano)', value: 'mnano' },
    { name: 'knano (0.001 Mnano)', value: 'knano' },
    { name: 'nano (0.000001 Mnano)', value: 'nano' },
  ];
  selectedDenomination = this.denominations[0].value;

  storageOptions = [
    { name: 'Browser Local Storage', value: 'localStorage' },
    { name: 'None', value: 'none' },
  ];
  selectedStorage = this.storageOptions[0].value;

  currencies = [
    { name: 'None', value: '' },
    { name: 'USD - US Dollar', value: 'USD' },
    { name: 'BTC - Bitcoin', value: 'BTC' },
    { name: 'AUD - Australian Dollar', value: 'AUD' },
    { name: 'BRL - Brazilian Real', value: 'BRL' },
    { name: 'CAD - Canadian Dollar', value: 'CAD' },
    { name: 'CHF - Swiss Franc', value: 'CHF' },
    { name: 'CLP - Chilean Peso', value: 'CLP' },
    { name: 'CNY - Chinese Yuan', value: 'CNY' },
    { name: 'CZK - Czech Koruna', value: 'CZK' },
    { name: 'DKK - Danish Krown', value: 'DKK' },
    { name: 'EUR - Euro', value: 'EUR' },
    { name: 'GBP - British Pound', value: 'GBP' },
    { name: 'HKD - Hong Kong Dollar', value: 'HKD' },
    { name: 'HUF - Hungarian Forint', value: 'HUF' },
    { name: 'IDR - Indonesian Rupiah', value: 'IDR' },
    { name: 'ILS - Israeli New Shekel', value: 'ILS' },
    { name: 'INR - Indian Rupee', value: 'INR' },
    { name: 'JPY - Japanese Yen', value: 'JPY' },
    { name: 'KRW - South Korean Won', value: 'KRW' },
    { name: 'MXN - Mexican Peso', value: 'MXN' },
    { name: 'MYR - Malaysian Ringgit', value: 'MYR' },
    { name: 'NOK - Norwegian Krone', value: 'NOK' },
    { name: 'NZD - New Zealand Dollar', value: 'NZD' },
    { name: 'PHP - Philippine Piso', value: 'PHP' },
    { name: 'PKR - Pakistani Rupee', value: 'PKR' },
    { name: 'PLN - Polish Zloty', value: 'PLN' },
    { name: 'RUB - Russian Ruble', value: 'RUB' },
    { name: 'SEK - Swedish Krona', value: 'SEK' },
    { name: 'SGD - Singapore Dollar', value: 'SGD' },
    { name: 'THB - Thai Baht', value: 'THB' },
    { name: 'TRY - Turkish Lira', value: 'TRY' },
    { name: 'TWD - New Taiwan Dollar', value: 'TWD' },
    { name: 'ZAR - South African Rand', value: 'ZAR' },
  ];
  selectedCurrency = this.currencies[0].value;

  inactivityOptions = [
    { name: 'Never', value: 0 },
    { name: '1 Minute', value: 1 },
    { name: '5 Minutes', value: 5 },
    { name: '15 Minutes', value: 15 },
    { name: '30 Minutes', value: 30 },
    { name: '1 Hour', value: 60 },
    { name: '6 Hours', value: 360 },
  ];
  selectedInactivityMinutes = this.inactivityOptions[4].value;

  powOptions = [
    { name: 'Best Option Available', value: 'best' },
    { name: 'Client Side - WebGL [Recommended] (Chrome/Firefox)', value: 'clientWebGL' },
    { name: 'Client Side - CPU', value: 'clientCPU' },
    { name: 'Server - Nault Server', value: 'server' },
  ];
  selectedPoWOption = this.powOptions[0].value;

  // prefixOptions = [
  //   { name: 'xrb_', value: 'xrb' },
  //   { name: 'nano_', value: 'nano' },
  // ];
  // selectedPrefix = this.prefixOptions[0].value;

  serverOptions = [
    { name: 'My Nano Ninja', value: 'ninja' },
    { name: 'Nanos.cc', value: 'nanos' },
    { name: 'Nanex.cc', value: 'nanex' },
    { name: 'NanoCrawler', value: 'nanocrawler' },
    { name: 'NanoVault', value: 'nanovault' },
    { name: 'Custom', value: 'custom' },
  ];
  selectedServer = this.serverOptions[0].value;

  defaultRepresentative = null;
  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';

  serverConfigurations = [
    {
      name: 'ninja',
      api: 'https://mynano.ninja/api/node',
      ws: 'wss://ws.mynano.ninja',
    },
    {
      name: 'nanos',
      api: 'https://proxy.nanos.cc/proxy',
      ws: 'wss://socket.nanos.cc',
    },
    {
      name: 'nanex',
      api: 'https://api.nanex.cc',
      ws: 'wss://ws.nanocrawler.cc',
    },
    {
      name: 'nanocrawler',
      api: 'https://vault.nanocrawler.cc/api/node-api',
      ws: 'wss://ws.nanocrawler.cc',
    },
    {
      name: 'nanovault',
      api: null,
      ws: null,
    },
  ];

  serverAPI = null;
  serverWS = null;
  minimumReceive = null;

  showServerConfigs = () => this.selectedServer && this.selectedServer === 'custom';

  constructor(
    private walletService: WalletService,
    private notifications: NotificationService,
    private appSettings: AppSettingsService,
    private addressBook: AddressBookService,
    private pow: PowService,
    private api: ApiService,
    private ledgerService: LedgerService,
    private websocket: WebsocketService,
    private workPool: WorkPoolService,
    private repService: RepresentativeService,
    private node: NodeService,
    private util: UtilService,
    private price: PriceService) { }

  async ngOnInit() {
    this.loadFromSettings();
  }

  loadFromSettings() {
    const settings = this.appSettings.settings;

    const matchingCurrency = this.currencies.find(d => d.value === settings.displayCurrency);
    this.selectedCurrency = matchingCurrency.value || this.currencies[0].value;

    const matchingDenomination = this.denominations.find(d => d.value == settings.displayDenomination);
    this.selectedDenomination = matchingDenomination.value || this.denominations[0].value;

    const matchingStorage = this.storageOptions.find(d => d.value == settings.walletStore);
    this.selectedStorage = matchingStorage.value || this.storageOptions[0].value;

    const matchingInactivityMinutes = this.inactivityOptions.find(d => d.value == settings.lockInactivityMinutes);
    this.selectedInactivityMinutes = matchingInactivityMinutes ? matchingInactivityMinutes.value : this.inactivityOptions[4].value;

    const matchingPowOption = this.powOptions.find(d => d.value === settings.powSource);
    this.selectedPoWOption = matchingPowOption ? matchingPowOption.value : this.powOptions[0].value;

    const matchingServerOption = this.serverOptions.find(d => d.value === settings.serverName);
    this.selectedServer = matchingServerOption ? matchingServerOption.value : this.serverOptions[0].value;

    this.serverAPI = settings.serverAPI;
    this.serverWS = settings.serverWS;

    this.minimumReceive = settings.minimumReceive;
    this.defaultRepresentative = settings.defaultRepresentative;
    if (this.defaultRepresentative) {
      this.validateRepresentative();
    }
  }

  async updateDisplaySettings() {
    const newCurrency = this.selectedCurrency;
    // const updatePrefixes = this.appSettings.settings.displayPrefix !== this.selectedPrefix;
    const reloadFiat = this.appSettings.settings.displayCurrency !== newCurrency;
    this.appSettings.setAppSetting('displayDenomination', this.selectedDenomination);
    this.notifications.sendSuccess(`App display settings successfully updated!`);

    if (reloadFiat) {
      // Reload prices with our currency, then call to reload fiat balances.
      await this.price.getPrice(newCurrency);
      this.appSettings.setAppSetting('displayCurrency', newCurrency);
      this.walletService.reloadFiatBalances();
    }

    // if (updatePrefixes) {
    //   this.appSettings.setAppSetting('displayPrefix', this.selectedPrefix);
      // Go through accounts?
      // this.wallet.accounts.forEach(account => {
      //   account.id = this.util.account.setPrefix(account.id, this.selectedPrefix);
      // });
      // this.walletService.saveWalletExport();
      //
      // this.addressBook.addressBook.forEach(entry => {
      //   entry.account = this.util.account.setPrefix(entry.account, this.selectedPrefix);
      // });
      // this.addressBook.saveAddressBook();
    // }

  }

  async updateWalletSettings() {
    const newStorage = this.selectedStorage;
    let newPoW = this.selectedPoWOption;

    const resaveWallet = this.appSettings.settings.walletStore !== newStorage;
    const reloadPending = this.appSettings.settings.minimumReceive != this.minimumReceive;

    if (this.defaultRepresentative && this.defaultRepresentative.length) {
      const valid = await this.api.validateAccountNumber(this.defaultRepresentative);
      if (!valid || valid.valid !== '1') {
        return this.notifications.sendWarning(`Default representative is not a valid account`);
      }
    }

    if (this.appSettings.settings.powSource !== newPoW) {
      if (newPoW === 'clientWebGL' && !this.pow.hasWebGLSupport()) {
        this.notifications.sendWarning(`WebGL support not available, set PoW to Best`);
        newPoW = 'best';
      }
      if (newPoW === 'clientCPU' && !this.pow.hasWorkerSupport()) {
        this.notifications.sendWarning(`CPU Worker support not available, set PoW to Best`);
        newPoW = 'best';
      }
    }

    const newSettings = {
      walletStore: newStorage,
      lockInactivityMinutes: new Number(this.selectedInactivityMinutes),
      powSource: newPoW,
      minimumReceive: this.minimumReceive || null,
      defaultRepresentative: this.defaultRepresentative || null,
    };

    this.appSettings.setAppSettings(newSettings);
    this.notifications.sendSuccess(`App wallet settings successfully updated!`);

    if (resaveWallet) {
      this.walletService.saveWalletExport(); // If swapping the storage engine, resave the wallet
    }
    if (reloadPending) {
      this.walletService.reloadBalances(true);
    }
  }

  async updateServerSettings() {
    const newSettings = {
      serverName: this.selectedServer,
      serverAPI: null,
      serverWS: null,
    };

    // Custom... do some basic validation
    if (this.serverAPI != null && this.serverAPI.trim().length > 1) {
      if (this.serverAPI.startsWith('https://') || this.serverAPI.startsWith('http://')) {
        newSettings.serverAPI = this.serverAPI;
      } else {
        return this.notifications.sendWarning(`Custom API Server has an invalid address.`);
      }
    }

    if (this.serverWS != null && this.serverWS.trim().length > 1) {
      if (this.serverWS.startsWith('wss://') || this.serverWS.startsWith('ws://')) {
        newSettings.serverWS = this.serverWS;
      } else {
        return this.notifications.sendWarning(`Custom Update Server has an invalid address.`);
      }
    }

    this.appSettings.setAppSettings(newSettings);

    this.notifications.sendSuccess(`Server settings successfully updated, reconnecting to backend`);

    this.node.node.status = false; // Directly set node to offline since API url changed.  Status will get set by reloadBalances

    // Reload balances which triggers an api check + reconnect to websocket server
    await this.walletService.reloadBalances();
    this.websocket.forceReconnect();
  }

  searchRepresentatives() {
    this.showRepresentatives = true;
    const search = this.defaultRepresentative || '';
    const representatives = this.repService.getSortedRepresentatives();

    const matches = representatives
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.defaultRepresentative = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.defaultRepresentative = this.defaultRepresentative.replace(/ /g, '');
    const rep = this.repService.getRepresentative(this.defaultRepresentative);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else {
      this.representativeListMatch = '';
    }
  }

  // When changing the Server Config option, prefill values
  serverConfigChange(newServer) {
    const custom = this.serverConfigurations.find(c => c.name == newServer);
    if (custom) {
      this.serverAPI = custom.api;
      this.serverWS = custom.ws;
    }
  }

  async clearWorkCache() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;">You are about to delete all locally cached Proof of Work values<br><br><b>Are you sure?</b></p>');
      this.workPool.clearCache();
      this.notifications.sendSuccess(`Successfully cleared the work cache!`);
    } catch (err) {}
  }

  async clearWalletData() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;">You are about to delete all of your wallet data stored in Nault!<br><b>Make sure you have your seed backed up!!</b><br><br><b>Are you sure?</b></p>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.notifications.sendSuccess(`Successfully deleted all wallet data!`);
    } catch (err) {}
  }

  async clearAllData() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;">You are about to delete ALL of your data stored in Nault.<br>This includes all of your wallet data, your address book, and your application settings!<br><br><b>Make sure you have your seed backed up!!</b><br><br><b>Are you sure?</b></p>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.workPool.deleteCache();
      this.addressBook.clearAddressBook();
      this.appSettings.clearAppSettings();
      this.repService.resetRepresentativeList();

      this.loadFromSettings();

      this.notifications.sendSuccess(`Successfully deleted ALL locally stored data!`);
    } catch (err) {}
  }
}
