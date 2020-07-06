import { Injectable } from '@angular/core';
import set = Reflect.set;

export type WalletStore = 'localStorage'|'none';
export type PoWSource = 'server'|'clientCPU'|'clientWebGL'|'best';

interface AppSettings {
  displayDenomination: string;
  // displayPrefix: string | null;
  walletStore: string;
  language: string;
  displayCurrency: string;
  defaultRepresentative: string | null;
  lockOnClose: number;
  lockInactivityMinutes: number;
  powSource: PoWSource;
  pendingOption: string;
  serverName: string;
  serverAPI: string | null;
  serverWS: string | null;
  serverAuth: string | null;
  minimumReceive: string | null;
  walletVersion: number | null;
}

@Injectable()
export class AppSettingsService {
  // Attention: When changing this value src/locale/redirect/index.html needs to be adjusted accordingly
  storeKey = `nanovault-appsettings`;

  settings: AppSettings = {
    displayDenomination: 'mnano',
    // displayPrefix: 'xrb',
    walletStore: 'localStorage',
    // Attention: When changing the name of this value src/locale/redirect/index.html needs to be adjusted accordingly
    language: 'en',
    displayCurrency: 'USD',
    defaultRepresentative: null,
    lockOnClose: 1,
    lockInactivityMinutes: 30,
    powSource: 'best',
    pendingOption: 'amount',
    serverName: 'random',
    serverAPI: null,
    serverWS: null,
    serverAuth: null,
    minimumReceive: null,
    walletVersion: 1
  };

  serverOptions = [
    {
      name: 'Random',
      value: 'random',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    },
    {
      name: 'My Nano Ninja',
      value: 'ninja',
      api: 'https://mynano.ninja/api/node',
      ws: 'wss://ws.mynano.ninja',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Nanos.cc',
      value: 'nanos',
      api: 'https://proxy.nanos.cc/proxy',
      ws: 'wss://socket.nanos.cc',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Nanex.cc',
      value: 'nanex',
      api: 'https://api.nanex.cc',
      ws: null,
      auth: null,
      shouldRandom: false,
    },
    {
      name: 'NanoCrawler',
      value: 'nanocrawler',
      api: 'https://vault.nanocrawler.cc/api/node-api',
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
    }
  ];

  constructor() { }

  loadAppSettings() {
    let settings: AppSettings = this.settings;
    const settingsStore = localStorage.getItem(this.storeKey);
    if (settingsStore) {
      settings = JSON.parse(settingsStore);
    }
    this.settings = Object.assign(this.settings, settings);

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
    } else if (this.settings.serverName === 'custom') {
      console.log('SETTINGS: Custom');
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
    for (let key in settingsObject) {
      if (!settingsObject.hasOwnProperty(key)) continue;
      this.settings[key] = settingsObject[key];
    }

    this.saveAppSettings();
  }

  clearAppSettings() {
    localStorage.removeItem(this.storeKey);
    this.settings = {
      displayDenomination: 'mnano',
      // displayPrefix: 'xrb',
      walletStore: 'localStorage',
      language: 'en',
      displayCurrency: 'USD',
      defaultRepresentative: null,
      lockOnClose: 1,
      lockInactivityMinutes: 30,
      powSource: 'best',
      pendingOption: 'amount',
      serverName: 'random',
      serverAPI: null,
      serverWS: null,
      serverAuth: null,
      minimumReceive: null,
      walletVersion: 1,
    };
  }

}
