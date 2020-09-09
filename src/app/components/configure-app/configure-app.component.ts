import { Component, OnInit } from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {PriceService} from '../../services/price.service';
import {PowService} from '../../services/pow.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AddressBookService} from '../../services/address-book.service';
import {ApiService} from '../../services/api.service';
import {WebsocketService} from '../../services/websocket.service';
import {NodeService} from '../../services/node.service';
import {UtilService} from '../../services/util.service';
import {BehaviorSubject} from 'rxjs';
import {RepresentativeService} from '../../services/representative.service';
import {NinjaService} from '../../services/ninja.service';
import {QrModalService} from '../../services/qr-modal.service';

@Component({
  selector: 'app-configure-app',
  templateUrl: './configure-app.component.html',
  styleUrls: ['./configure-app.component.css']
})

export class ConfigureAppComponent implements OnInit {

  constructor(
    private walletService: WalletService,
    private notifications: NotificationService,
    private appSettings: AppSettingsService,
    private addressBook: AddressBookService,
    private pow: PowService,
    private api: ApiService,
    private websocket: WebsocketService,
    private workPool: WorkPoolService,
    private repService: RepresentativeService,
    private node: NodeService,
    private util: UtilService,
    private price: PriceService,
    private ninja: NinjaService,
    private qrModalService: QrModalService) { }
  wallet = this.walletService.wallet;

  denominations = [
    { name: 'NANO', value: 'mnano' },
    { name: 'knano', value: 'knano' },
    { name: 'nano', value: 'nano' },
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

  pendingOptions = [
    { name: 'Largest Amount First', value: 'amount' },
    { name: 'Oldest Transaction First', value: 'date' },
    { name: 'Manual', value: 'manual' },
  ];
  selectedPendingOption = this.pendingOptions[0].value;

  // prefixOptions = [
  //   { name: 'xrb_', value: 'xrb' },
  //   { name: 'nano_', value: 'nano' },
  // ];
  // selectedPrefix = this.prefixOptions[0].value;

  serverOptions = [];
  selectedServer = null;

  defaultRepresentative = null;
  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';
  repStatus = null;
  representativeList = [];

  serverAPI = null;
  serverAPIUpdated = null;
  serverWS = null;
  serverAuth = null;
  minimumReceive = null;

  nodeBlockCount = null;
  nodeUnchecked = null;
  nodeCemented = null;
  nodeUncemented = null;
  peersStakeReq = null;
  peersStakeTotal = null;
  nodeVendor = null;
  nodeNetwork = null;
  statsRefreshEnabled = true;
  shouldRandom = null;

  showServerValues = () => this.selectedServer && this.selectedServer !== 'random' && this.selectedServer !== 'offline';
  showStatValues = () => this.selectedServer && this.selectedServer !== 'offline';
  showServerConfigs = () => this.selectedServer && this.selectedServer === 'custom';

  async ngOnInit() {
    this.loadFromSettings();
    this.updateNodeStats();

    // populate representative list
    if (!this.serverAPI) return;
    const verifiedReps = await this.ninja.recommendedRandomized();

    for (const representative of verifiedReps) {
      const temprep = {
        id: representative.account,
        name: representative.alias
      };

      this.representativeList.push(temprep);
    }

    // add the localReps to the list
    const localReps = this.repService.getSortedRepresentatives();
    this.representativeList.push(...localReps);
  }

  async updateNodeStats(refresh= false) {
    if ((!this.serverAPIUpdated ||
      (this.serverAPIUpdated !== this.appSettings.settings.serverAPI && this.selectedServer === 'random'))) return;
    // refresh is not enabled
    if (refresh && !this.statsRefreshEnabled) return;
    // Offline mode selected
    if (this.selectedServer === 'offline') return;

    this.statsRefreshEnabled = false;
    try {
      const blockCount = await this.api.blockCount();
      this.nodeBlockCount = Number(blockCount.count).toLocaleString('en-US');
      this.nodeUnchecked = Number(blockCount.unchecked).toLocaleString('en-US');
      this.nodeCemented = Number(blockCount.cemented).toLocaleString('en-US');
      this.nodeUncemented = Number(blockCount.count - blockCount.cemented).toLocaleString('en-US');
    } catch {console.warn('Failed to get node stats: block count'); }

    try {
      const quorumData = await this.api.confirmationQuorum();
      this.peersStakeReq = quorumData ? Number(this.util.nano.rawToMnano(quorumData.peers_stake_required)).toLocaleString('en-US') : null;
      this.peersStakeTotal = quorumData ? Number(this.util.nano.rawToMnano(quorumData.peers_stake_total)).toLocaleString('en-US') : null;
    } catch {console.warn('Failed to get node stats: confirmation quorum'); }

    try {
      const version = await this.api.version();
      this.nodeVendor = version.node_vendor;
      this.nodeNetwork = version.network;
    } catch {console.warn('Failed to get node stats: version'); }

    setTimeout(() => this.statsRefreshEnabled = true, 5000);
  }

  loadFromSettings() {
    const settings = this.appSettings.settings;

    const matchingCurrency = this.currencies.find(d => d.value === settings.displayCurrency);
    this.selectedCurrency = matchingCurrency.value || this.currencies[0].value;

    const matchingStorage = this.storageOptions.find(d => d.value === settings.walletStore);
    this.selectedStorage = matchingStorage.value || this.storageOptions[0].value;

    const matchingInactivityMinutes = this.inactivityOptions.find(d => d.value === settings.lockInactivityMinutes);
    this.selectedInactivityMinutes = matchingInactivityMinutes ? matchingInactivityMinutes.value : this.inactivityOptions[4].value;

    const matchingPowOption = this.powOptions.find(d => d.value === settings.powSource);
    this.selectedPoWOption = matchingPowOption ? matchingPowOption.value : this.powOptions[0].value;

    const matchingPendingOption = this.pendingOptions.find(d => d.value === settings.pendingOption);
    this.selectedPendingOption = matchingPendingOption ? matchingPendingOption.value : this.pendingOptions[0].value;

    this.serverOptions = this.appSettings.serverOptions;
    this.selectedServer = settings.serverName;
    this.serverAPI = settings.serverAPI;
    this.serverAPIUpdated = this.serverAPI;
    this.serverWS = settings.serverWS;
    this.serverAuth = settings.serverAuth;

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
    const pendingOption = this.selectedPendingOption;
    let minReceive = null;
    if (this.util.account.isValidNanoAmount(this.minimumReceive)) {
      minReceive = this.minimumReceive;
    }

    const resaveWallet = this.appSettings.settings.walletStore !== newStorage;

    // reload pending if threshold changes or if receive priority changes from manual to auto
    const reloadPending = this.appSettings.settings.minimumReceive !== this.minimumReceive
    || (pendingOption !== 'manual' && pendingOption !== this.appSettings.settings.pendingOption);

    if (this.defaultRepresentative && this.defaultRepresentative.length) {
      const valid = this.util.account.isValidAccount(this.defaultRepresentative);
      if (!valid) {
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
      lockInactivityMinutes: Number(this.selectedInactivityMinutes),
      powSource: newPoW,
      pendingOption: pendingOption,
      minimumReceive: minReceive,
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
      serverAuth: null,
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

    if (this.serverAuth != null && this.serverAuth.trim().length > 1) {
      newSettings.serverAuth = this.serverAuth;
    }

    this.appSettings.setAppSettings(newSettings);
    this.appSettings.loadAppSettings();

    this.notifications.sendSuccess(`Server settings successfully updated, reconnecting to backend`);

    this.node.node.status = false; // Directly set node to offline since API url changed.  Status will get set by reloadBalances

    // Reload balances which triggers an api check + reconnect to websocket server
    await this.walletService.reloadBalances();
    this.websocket.forceReconnect();
    // this is updated after setting server to random and doing recheck of wallet balance
    this.serverAPIUpdated = this.appSettings.settings.serverAPI;
    this.serverAPI = this.serverAPIUpdated;
    this.statsRefreshEnabled = true;
    this.updateNodeStats();
  }

  searchRepresentatives() {
    if (this.defaultRepresentative !== '' && !this.util.account.isValidAccount(this.defaultRepresentative)) this.repStatus = 0;
    else this.repStatus = null;

    this.showRepresentatives = true;
    const search = this.defaultRepresentative || '';

    const matches = this.representativeList
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

  async validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    if (this.defaultRepresentative) this.defaultRepresentative = this.defaultRepresentative.replace(/ /g, '');

    if (this.defaultRepresentative === '') {
      this.representativeListMatch = '';
      return;
    }

    const rep = this.repService.getRepresentative(this.defaultRepresentative);
    const ninjaRep = await this.ninja.getAccount(this.defaultRepresentative);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else if (ninjaRep) {
      this.representativeListMatch = ninjaRep.alias;
    } else {
      this.representativeListMatch = '';
    }
  }

  // When changing the Server Config option, prefill values
  serverConfigChange(newServer) {
    const custom = this.serverOptions.find(c => c.value === newServer);
    if (custom) {
      this.serverAPI = custom.api;
      this.serverAPIUpdated = null;
      this.serverWS = custom.ws;
      this.serverAuth = custom.auth;
      this.shouldRandom = custom.shouldRandom ? 'Yes' : 'No';
    }

    // reset server stats until updated
    this.nodeBlockCount = null;
    this.nodeUnchecked = null;
    this.nodeCemented = null;
    this.nodeUncemented = null;
    this.peersStakeReq = null;
    this.peersStakeTotal = null;
    this.nodeVendor = null;
    this.nodeNetwork = null;
    this.statsRefreshEnabled = newServer === 'random' ? false : true;
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
      await UIkit.modal.confirm('<p style="text-align: center;">You are about to delete all of your wallet data stored in Nault!<br><b>Make sure you have your seed and/or mnemonic backed up!!</b><br><br><b>Are you sure?</b></p>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.notifications.sendSuccess(`Successfully deleted all wallet data!`);
    } catch (err) {}
  }

  async clearAllData() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;">You are about to delete all your data stored in Nault and reset all settings.<br>This includes all of your wallet data and address book!<br><br><b>Make sure you have your seed and/or mnemonic backed up!!</b><br><br><b>Are you sure?</b></p>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.workPool.deleteCache();
      this.addressBook.clearAddressBook();
      this.appSettings.clearAppSettings();
      this.repService.resetRepresentativeList();

      this.loadFromSettings();

      this.notifications.sendSuccess(`Successfully deleted locally stored data and reset the settings!`);

      // Get a new random API server or Nault will get stuck in offline mode
      this.updateServerSettings();
    } catch (err) {}
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'rep1':
          this.defaultRepresentative = data.content;
          this.validateRepresentative();
          break;
      }
    }, () => {}
    );
  }
}
