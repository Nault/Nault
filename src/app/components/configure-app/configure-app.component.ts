import { Component, OnInit, Renderer2 } from '@angular/core';
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
import { TranslocoService } from '@ngneat/transloco';

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
    private renderer: Renderer2,
    private qrModalService: QrModalService,
    private translocoService: TranslocoService) { }
  wallet = this.walletService.wallet;

  languages = this.translocoService.getAvailableLangs() as [{id: string, label: string}];
  selectedLanguage = this.languages[0].id;

  denominations = [
    { name: 'XNO', value: 'mnano' },
    { name: 'knano', value: 'knano' },
    { name: 'nano', value: 'nano' },
  ];
  selectedDenomination = this.denominations[0].value;

  storageOptions = [
    { name: this.translocoService.translate('configure-app.storage-options.browser-local-storage'), value: 'localStorage' },
    { name: this.translocoService.translate('configure-app.storage-options.none'), value: 'none' },
  ];
  selectedStorage = this.storageOptions[0].value;

  currencies = [
    { name: this.translocoService.translate('configure-app.currencies.none'), value: '' },
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

  nightModeOptions = [
    { name: this.translocoService.translate('configure-app.night-mode-options.enabled'), value: 'enabled' },
    { name: this.translocoService.translate('configure-app.night-mode-options.disabled'), value: 'disabled' },
  ];
  selectedNightModeOption = this.nightModeOptions[0].value;

  identiconOptions = [
    { name: this.translocoService.translate('configure-app.identicon-options.none'), value: 'none' },
    { name: this.translocoService.translate('configure-app.identicon-options.nanoidenticons-by-keerifox'), value: 'nanoidenticons' },
    { name: this.translocoService.translate('configure-app.identicon-options.natricon-by-appditto'), value: 'natricon' },
  ];
  selectedIdenticonOption = this.identiconOptions[0].value;

  inactivityOptions = [
    { name: this.translocoService.translate('configure-app.identicon-options.never'), value: 0 },
    { name: this.translocoService.translate('configure-app.identicon-options.1-minute'), value: 1 },
    { name: this.translocoService.translate('configure-app.identicon-options.x-minutes', { minutes: 5 }), value: 5 },
    { name:  this.translocoService.translate('configure-app.identicon-options.x-minutes', { minutes: 15 }), value: 15 },
    { name:  this.translocoService.translate('configure-app.identicon-options.x-minutes', { minutes: 30 }), value: 30 },
    { name: this.translocoService.translate('configure-app.identicon-options.1-hour'), value: 60 },
    { name: this.translocoService.translate('configure-app.identicon-options.x-hours', { hours: 6 }), value: 360 },
  ];
  selectedInactivityMinutes = this.inactivityOptions[4].value;

  powOptions = [
    { name: this.translocoService.translate('configure-app.pow-options.best-option-available'), value: 'best' },
    { name: this.translocoService.translate('configure-app.pow-options.client-side-gpu-webgl'), value: 'clientWebGL' },
    { name: this.translocoService.translate('configure-app.pow-options.client-side-cpu-slowest'), value: 'clientCPU' },
    { name: this.translocoService.translate('configure-app.pow-options.external-selected-server'), value: 'server' },
    { name: this.translocoService.translate('configure-app.pow-options.external-custom-server'), value: 'custom' },
  ];
  selectedPoWOption = this.powOptions[0].value;

  multiplierOptions = [
    { name: this.translocoService.translate('configure-app.multiplier-options.default-1x-or-1-64x'), value: 1 },
    { name: '2x', value: 2 },
    { name: '4x', value: 4 },
    { name: '8x', value: 8 },
    { name: '16x', value: 16 },
    { name: '32x', value: 32 },
    { name: '64x', value: 64 },
  ];
  selectedMultiplierOption: number = this.multiplierOptions[0].value;

  pendingOptions = [
    { name: this.translocoService.translate('configure-app.pending-options.automatic-largest-amount-first'), value: 'amount' },
    { name: this.translocoService.translate('configure-app.pending-options.automatic-oldest-transaction-first'), value: 'date' },
    { name: this.translocoService.translate('configure-app.pending-options.manual'), value: 'manual' },
  ];
  selectedPendingOption = this.pendingOptions[0].value;

  decentralizedAliasesOptions = [
    { name: this.translocoService.translate('configure-app.decentralized-aliases-options.disabled'), value: 'disabled' },
    { name: this.translocoService.translate('configure-app.decentralized-aliases-options.enabled'), value: 'enabled' },
  ];
  selectedDecentralizedAliasesOption = this.decentralizedAliasesOptions[0].value;

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

  customWorkServer = '';

  showServerValues = () => this.selectedServer && this.selectedServer !== 'random' && this.selectedServer !== 'offline';
  showStatValues = () => this.selectedServer && this.selectedServer !== 'offline';
  showServerConfigs = () => this.selectedServer && this.selectedServer === 'custom';

  async ngOnInit() {
    this.loadFromSettings();
    this.updateNodeStats();

    setTimeout(() => this.populateRepresentativeList(), 500);
  }

  async populateRepresentativeList() {
    // add trusted/regular local reps to the list
    const localReps = this.repService.getSortedRepresentatives();
    this.representativeList.push( ...localReps.filter(rep => (!rep.warn)) );

    if (this.serverAPI) {
      const verifiedReps = await this.ninja.recommendedRandomized();

      // add random recommended reps to the list
      for (const representative of verifiedReps) {
        const temprep = {
          id: representative.account,
          name: representative.alias
        };

        this.representativeList.push(temprep);
      }
    }

    // add untrusted local reps to the list
    this.representativeList.push( ...localReps.filter(rep => (rep.warn)) );
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
      this.peersStakeReq = quorumData ? Number(this.util.nano.rawToMnano(quorumData.quorum_delta)).toLocaleString('en-US') : null;
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

    const matchingLanguage = this.languages.find(language => language.id === settings.language);
    this.selectedLanguage = matchingLanguage.id || this.languages[0].id;

    const matchingCurrency = this.currencies.find(d => d.value === settings.displayCurrency);
    this.selectedCurrency = matchingCurrency.value || this.currencies[0].value;

    const nightModeOptionString = (settings.lightModeEnabled === true) ? 'disabled' : 'enabled';
    const matchingNightModeOption = this.nightModeOptions.find(d => d.value === nightModeOptionString);
    this.selectedNightModeOption = matchingNightModeOption.value || this.nightModeOptions[0].value;

    const matchingIdenticonOptions = this.identiconOptions.find(d => d.value === settings.identiconsStyle);
    this.selectedIdenticonOption = matchingIdenticonOptions.value || this.identiconOptions[0].value;

    const matchingStorage = this.storageOptions.find(d => d.value === settings.walletStore);
    this.selectedStorage = matchingStorage.value || this.storageOptions[0].value;

    const matchingInactivityMinutes = this.inactivityOptions.find(d => d.value === settings.lockInactivityMinutes);
    this.selectedInactivityMinutes = matchingInactivityMinutes ? matchingInactivityMinutes.value : this.inactivityOptions[4].value;

    const matchingPowOption = this.powOptions.find(d => d.value === settings.powSource);
    this.selectedPoWOption = matchingPowOption ? matchingPowOption.value : this.powOptions[0].value;

    const matchingMultiplierOption = this.multiplierOptions.find(d => d.value === settings.multiplierSource);
    this.selectedMultiplierOption = matchingMultiplierOption ? matchingMultiplierOption.value : this.multiplierOptions[0].value;

    this.customWorkServer = settings.customWorkServer;

    const matchingPendingOption = this.pendingOptions.find(d => d.value === settings.pendingOption);
    this.selectedPendingOption = matchingPendingOption ? matchingPendingOption.value : this.pendingOptions[0].value;

    const matchingDecentralizedAliasesOption = this.decentralizedAliasesOptions.find(d => d.value === settings.decentralizedAliasesOption);
    this.selectedDecentralizedAliasesOption = matchingDecentralizedAliasesOption ? matchingDecentralizedAliasesOption.value : this.decentralizedAliasesOptions[0].value;

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
    if (this.selectedNightModeOption === 'disabled') {
      this.renderer.addClass(document.body, 'light-mode');
      this.renderer.removeClass(document.body, 'dark-mode');
      this.appSettings.setAppSetting('lightModeEnabled', true);
    } else {
      this.renderer.addClass(document.body, 'dark-mode');
      this.renderer.removeClass(document.body, 'light-mode');
      this.appSettings.setAppSetting('lightModeEnabled', false);
    }

    this.appSettings.setAppSetting('identiconsStyle', this.selectedIdenticonOption);

    const newCurrency = this.selectedCurrency;
    // const updatePrefixes = this.appSettings.settings.displayPrefix !== this.selectedPrefix;
    const reloadFiat = this.appSettings.settings.displayCurrency !== newCurrency;
    this.notifications.sendSuccess(this.translocoService.translate('configure-app.app-display-settings-successfully-updated'));

    if (reloadFiat) {
      // Reload prices with our currency, then call to reload fiat balances.
      await this.price.getPrice(newCurrency);
      this.appSettings.setAppSetting('displayCurrency', newCurrency);
      this.walletService.reloadFiatBalances();
    }

    this.appSettings.setAppSetting('language', this.selectedLanguage);
    this.translocoService.setActiveLang(this.selectedLanguage);

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
    const resaveWallet = this.appSettings.settings.walletStore !== newStorage;

    // ask for user confirmation before clearing the wallet cache
    if (resaveWallet && newStorage === this.storageOptions[1].value) {
      const UIkit = window['UIkit'];
      try {
        await UIkit.modal.confirm(
          `<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span>
          <span style="font-size: 18px;">
          ${ this.translocoService.translate('configure-app.you-are-about-to-disable-storage-of-all-wallet-data-which') }
          </span><br>
          ${ this.walletService.isConfigured() ? '<br><b style="font-size: 18px;">' + this.translocoService.translate('reset-wallet.before-continuing-make-sure-you-have-saved-the-nano-seed') + '</b><br><br><span style="font-size: 18px;"><b>' + this.translocoService.translate('reset-wallet.you-will-not-be-able-to-recover-the-funds-without-a-backup') + '</b></span></p><br>' : '' }`
        );
      } catch (err) {
        // pressing cancel, reset storage setting and interrupt
        this.selectedStorage = this.storageOptions[0].value;
        this.notifications.sendInfo(this.translocoService.translate('configure-app.switched-back-to-browser-local-storage-for-the-wallet-data'), {length: 10000});
        return;
      }
    }

    let newPoW = this.selectedPoWOption;
    const newMultiplier = this.selectedMultiplierOption;
    const pendingOption = this.selectedPendingOption;
    let minReceive = null;
    if (this.util.account.isValidNanoAmount(this.minimumReceive)) {
      minReceive = this.minimumReceive;
    }

    const decentralizedAliasesOption = this.selectedDecentralizedAliasesOption;

    // reload pending if threshold changes or if receive priority changes from manual to auto
    let reloadPending = this.appSettings.settings.minimumReceive !== this.minimumReceive
    || (pendingOption !== 'manual' && pendingOption !== this.appSettings.settings.pendingOption);

    if (this.defaultRepresentative && this.defaultRepresentative.length) {
      const valid = this.util.account.isValidAccount(this.defaultRepresentative);
      if (!valid) {
        return this.notifications.sendWarning(
          this.translocoService.translate('configure-app.default-representative-is-not-a-valid-account')
        );
      }
    }

    if (this.appSettings.settings.powSource !== newPoW) {
      if (newPoW === 'clientWebGL' && !this.pow.hasWebGLSupport()) {
        this.notifications.sendWarning(this.translocoService.translate('configure-app.webgl-support-not-available-set-pow-to-best'));
        newPoW = 'best';
      }
      if (newPoW === 'clientCPU' && !this.pow.hasWorkerSupport()) {
        this.notifications.sendWarning(this.translocoService.translate('configure-app.cpu-worker-support-not-available-set-pow-to-best'));
        newPoW = 'best';
      }
      // reset multiplier when not using it to avoid user mistake
      if (newPoW !== 'clientWebGL' && newPoW !== 'clientCPU' && newPoW !== 'custom') {
        this.selectedMultiplierOption = this.multiplierOptions[0].value;
      }
      // Cancel ongoing PoW if the old method was local PoW
      if (this.appSettings.settings.powSource === 'clientWebGL' || this.appSettings.settings.powSource === 'clientCPU') {
        // Check if work is ongoing, and cancel it
        if (this.pow.cancelAllPow(false)) {
          reloadPending = true; // force reload balance => re-work pow
        }
      }
    } else if ((newPoW === 'clientWebGL' || newPoW === 'clientCPU') &&
      newMultiplier < this.appSettings.settings.multiplierSource) {
      // Cancel pow and re-work if multiplier is lower than earlier
      if (this.pow.cancelAllPow(false)) {
        reloadPending = true;
      }
    }

    // reset work cache so that the new PoW will be used but only if larger than before
    if (
      newMultiplier > this.appSettings.settings.multiplierSource &&
      newMultiplier > 1 &&
      ((newPoW === 'clientWebGL' && this.pow.hasWebGLSupport()) ||
      (newPoW === 'clientCPU' && this.pow.hasWorkerSupport()))
    ) {
      // if user accept to reset cache
      if (await this.clearWorkCache()) {
        reloadPending = true; // force reload balance => re-work pow
      }
    }

    const newSettings = {
      walletStore: newStorage,
      lockInactivityMinutes: Number(this.selectedInactivityMinutes),
      powSource: newPoW,
      multiplierSource: Number(this.selectedMultiplierOption),
      customWorkServer: this.customWorkServer,
      pendingOption: pendingOption,
      decentralizedAliasesOption: decentralizedAliasesOption,
      minimumReceive: minReceive,
      defaultRepresentative: this.defaultRepresentative || null,
    };

    this.appSettings.setAppSettings(newSettings);
    this.notifications.sendSuccess(this.translocoService.translate('configure-app.app-wallet-settings-successfully-updated'));

    if (resaveWallet) {
      this.walletService.saveWalletExport(); // If swapping the storage engine, resave the wallet
    }
    if (reloadPending) {
      this.walletService.reloadBalances();
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
        return this.notifications.sendWarning(this.translocoService.translate('configure-app.custom-api-server-has-an-invalid-address'));
      }
    }

    if (this.serverWS != null && this.serverWS.trim().length > 1) {
      if (this.serverWS.startsWith('wss://') || this.serverWS.startsWith('ws://')) {
        newSettings.serverWS = this.serverWS;
      } else {
        return this.notifications.sendWarning(this.translocoService.translate('configure-app.custom-update-server-has-an-invalid-address'));
      }
    }

    if (this.serverAuth != null && this.serverAuth.trim().length > 1) {
      newSettings.serverAuth = this.serverAuth;
    }

    this.appSettings.setAppSettings(newSettings);
    this.appSettings.loadAppSettings();

    this.notifications.sendSuccess(this.translocoService.translate('configure-app.server-settings-successfully-updated'));

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
    if (this.defaultRepresentative && !this.util.account.isValidAccount(this.defaultRepresentative)) this.repStatus = 0;
    else this.repStatus = null;

    this.showRepresentatives = true;
    const search = this.defaultRepresentative || '';

    const matches = this.representativeList
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      // remove duplicate accounts
      .filter((item, pos, self) => this.util.array.findWithAttr(self, 'id', item.id) === pos)
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

    if (!this.defaultRepresentative) {
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
      this.shouldRandom = custom.shouldRandom ? this.translocoService.translate('general.yes') : this.translocoService.translate('general.no');
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

  getRemotePoWOptionName() {
    const optionName = 'External - Selected Server';

    if ( (this.selectedServer === 'random') || (this.selectedServer === 'offline') ) {
      return optionName;
    }

    const selectedServerOption = this.appSettings.serverOptions.find(d => d.value === this.selectedServer);

    if (!selectedServerOption) {
      return optionName;
    }

    return ( optionName + ' (' + selectedServerOption.name + ')' );
  }

  async clearWorkCache() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;">' + this.translocoService.translate('configure-app.you-are-about-to-delete-all-locally-cached-proof-of-work') + '<br><br><b>' + this.translocoService.translate('configure-app.are-you-sure') + '</b></p>');
      this.workPool.clearCache();
      this.notifications.sendSuccess(this.translocoService.translate('configure-app.successfully-cleared-the-work-cache'));
      return true;
    } catch (err) { return false; }
  }

  async clearWalletData() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span><span style="font-size: 18px;">' + this.translocoService.translate('configure-app.you-are-about-to-delete-all-locally-stored-data-about-your') + '</span><br><br><b style="font-size: 18px;">' + this.translocoService.translate('reset-wallet.before-continuing-make-sure-you-have-saved-the-nano-seed') + '</b><br><br><span style="font-size: 18px;"><b>' + this.translocoService.translate('reset-wallet.you-will-not-be-able-to-recover-the-funds-without-a-backup') + '</b></span></p><br>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.notifications.sendSuccess(this.translocoService.translate('configure-app.successfully-deleted-all-wallet-data'));
    } catch (err) {}
  }

  async clearAllData() {
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span><span style="font-size: 18px;">' + this.translocoService.translate('configure-app.clear-all-data.1') + '</span><br><br><b style="font-size: 18px;">' + this.translocoService.translate('reset-wallet.before-continuing-make-sure-you-have-saved-the-nano-seed') + '</b><br><br><span style="font-size: 18px;"><b>' + this.translocoService.translate('reset-wallet.you-will-not-be-able-to-recover-the-funds-without-a-backup') + '</b></span></p><br>');
      this.walletService.resetWallet();
      this.walletService.removeWalletData();

      this.workPool.deleteCache();
      this.addressBook.clearAddressBook();
      this.appSettings.clearAppSettings();
      this.repService.resetRepresentativeList();
      this.api.deleteCache();

      this.loadFromSettings();

      this.notifications.sendSuccess(this.translocoService.translate('configure-app.clear-all-data.successfully-deleted-locally-stored-data-and-reset-the'));

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
