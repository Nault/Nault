import { Injectable } from '@angular/core';
import * as url from 'url';
import { TranslocoService, getBrowserCultureLang, getBrowserLang } from '@ngneat/transloco';

export type WalletStore = 'localStorage'|'none';
export type PoWSource = 'server'|'clientCPU'|'clientWebGL'|'best'|'custom'|'nano.to';
export type LedgerConnectionType = 'usb'|'bluetooth';

interface AppSettings {
  language: string;
  displayDenomination: string;
  // displayPrefix: string | null;
  walletStore: string;
  displayCurrency: string;
  defaultRepresentative: string | null;
  lockOnClose: number;
  lockInactivityMinutes: number;
  ledgerReconnect: LedgerConnectionType;
  powSource: PoWSource;
  multiplierSource: number;
  customWorkServer: string;
  pendingOption: string;
  serverName: string;
  serverAPI: string | null;
  serverWS: string | null;
  serverAuth: string | null;
  minimumReceive: string | null;
  walletVersion: number | null;
  lightModeEnabled: boolean;
  identiconsStyle: string;
}

@Injectable()
export class AppSettingsService {
  storeKey = `nanovault-appsettings`;

  settings: AppSettings = {
    language: null,
    displayDenomination: 'mnano',
    // displayPrefix: 'xrb',
    walletStore: 'localStorage',
    displayCurrency: 'USD',
    defaultRepresentative: null,
    lockOnClose: 1,
    lockInactivityMinutes: 30,
    ledgerReconnect: 'usb',
    serverName: 'rpc.nano.to',
    powSource: 'nano.to',
    serverAPI: 'https://rpc.nano.to',
    serverWS: null,
    serverAuth: null,
    multiplierSource: 1,
    customWorkServer: '',
    pendingOption: 'amount',
    minimumReceive: '0.000001',
    walletVersion: 1,
    lightModeEnabled: false,
    identiconsStyle: 'nanoidenticons',
  };

  serverOptions = [
    
    {
      name: 'Nano.to Pro RPC',
      value: 'rpc.nano.to',
      api: 'https://rpc.nano.to',
      ws: null,
      auth: null,
      shouldRandom: true,
    },

    // {
    //   name: 'US-2.Nano.to',
    //   value: 'us-2.nano.to',
    //   api: 'https://us-2.nano.to',
    //   ws: null,
    //   auth: null,
    //   shouldRandom: true,
    // },

<<<<<<< HEAD
    // {
    //   name: 'Solar.Nano.to',
    //   value: 'solar.nano.to',
    //   api: 'https://solarnanofaucet.space/api',
    //   ws: 'wss://solarnanofaucet.space/websocket',
    //   auth: null,
    //   shouldRandom: false,
    // },
=======
    {
      name: 'Europe-1.Nano.to',
      value: 'uk-1.nano.to',
      api: 'https://us-2.nano.to',
      ws: null,
      // ws: 'wss://solarnanofaucet.space/websocket',
      auth: null,
      shouldRandom: true,
    },
>>>>>>> 3f7fa55 (misc fixes)

    {
      name: 'Random',
      value: 'random',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    },

    {
      name: 'Custom',
      value: 'custom',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    },

    {
      name: 'Offline',
      value: 'offline',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    }

  ];

  // Simplified list for comparison in other classes
  knownApiEndpoints = this.serverOptions.reduce((acc, server) => {
    if (!server.api) return acc;
    acc.push( server.api.replace(/https?:\/\//g, '') );
    return acc;
  }, [
    'proxy.nanos.cc/proxy',
    'node.somenano.com'
  ]);

  constructor(
    private translate: TranslocoService
  ) { }

  loadAppSettings() {
    let settings: AppSettings = this.settings;
    const settingsStore = localStorage.getItem(this.storeKey);
    if (settingsStore) {
      settings = JSON.parse(settingsStore);
    }
    this.settings = Object.assign(this.settings, settings);

    if (this.settings.language === null) {
      const browserCultureLang = getBrowserCultureLang();
      const browserLang = getBrowserLang();

      if (this.translate.getAvailableLangs().some(lang => lang['id'] === browserCultureLang)) {
        this.settings.language = browserCultureLang;
      } else if (this.translate.getAvailableLangs().some(lang => lang['id'] === browserCultureLang)) {
        this.settings.language = browserLang;
      } else {
        this.settings.language = this.translate.getDefaultLang();
      }

      console.log('No language configured, setting to: ' + this.settings.language);
      console.log('Browser culture language: ' + browserCultureLang);
      console.log('Browser language: ' + browserLang);
    }

    this.loadServerSettings();

    return this.settings;
  }

  loadServerSettings() {
    const matchingServerOption = this.serverOptions.find(d => d.value === this.settings.serverName);

    if (this.settings.serverName === 'random' || !matchingServerOption) {
      const availableServers = this.serverOptions.filter(server => server.shouldRandom);
      const randomServerOption = availableServers[Math.floor(Math.random() * availableServers.length)];
      console.log('SETTINGS: Random', randomServerOption);

      this.settings.serverAPI = randomServerOption.api;
      this.settings.serverWS = randomServerOption.ws;
      this.settings.serverName = 'random';
    } else if (this.settings.serverName === 'custom') {
      console.log('SETTINGS: Custom');
    } else if (this.settings.serverName === 'nano.to') {
      console.log('SETTINGS: Nano.to Professional RPC');
    } else if (this.settings.serverName === 'offline') {
      console.log('SETTINGS: Offline Mode');
      this.settings.serverName = matchingServerOption.value;
      this.settings.serverAPI = matchingServerOption.api;
      this.settings.serverWS = matchingServerOption.ws;
    } else {
      console.log('SETTINGS: Found', matchingServerOption);
      this.settings.serverName = matchingServerOption.value;
      this.settings.serverAPI = matchingServerOption.api;
      this.settings.serverWS = matchingServerOption.ws;
    }
  }

  saveAppSettings() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.settings));
  }

  getAppSetting(key) {
    return this.settings[key] || null;
  }

  setAppSetting(key, value) {
    this.settings[key] = value;
    this.saveAppSettings();
  }

  setAppSettings(settingsObject) {
    for (const key in settingsObject) {
      if (!settingsObject.hasOwnProperty(key)) continue;
      this.settings[key] = settingsObject[key];
    }

    this.saveAppSettings();
  }

  clearAppSettings() {
    localStorage.removeItem(this.storeKey);
    this.settings = {
      language: 'en',
      displayDenomination: 'mnano',
      // displayPrefix: 'xrb',
      walletStore: 'localStorage',
      displayCurrency: 'USD',
      defaultRepresentative: null,
      lockOnClose: 1,
      lockInactivityMinutes: 30,
      ledgerReconnect: 'usb',
      powSource: 'best',
      multiplierSource: 1,
      customWorkServer: '',
      pendingOption: 'amount',
      serverName: 'random',
      serverAPI: null,
      serverWS: null,
      serverAuth: null,
      minimumReceive: '0.000001',
      walletVersion: 1,
      lightModeEnabled: false,
      identiconsStyle: 'nanoidenticons',
    };
  }

  // Get the base URL part of the serverAPI, e.g. https://nanovault.io from https://nanovault.io/api/node-api.
  getServerApiBaseUrl(): string {
    const u = url.parse(this.settings.serverAPI);
    u.pathname = '/';
    return url.format(u);
  }
}
