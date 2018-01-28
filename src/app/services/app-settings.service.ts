import { Injectable } from '@angular/core';

interface AppSettings {
  displayDenomination: string;
  walletStore: string;
}

@Injectable()
export class AppSettingsService {
  storeKey = `raivault-appsettings`;

  settings: AppSettings = {
    displayDenomination: 'xrb',
    walletStore: 'localStorage',
  };

  constructor() { }

  loadAppSettings() {
    let settings: AppSettings = this.settings;
    const settingsStore = localStorage.getItem(this.storeKey);
    if (settingsStore) {
      settings = JSON.parse(settingsStore);
    }
    this.settings = settings;

    return this.settings;
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

}
