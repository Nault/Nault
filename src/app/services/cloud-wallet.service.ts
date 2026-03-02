import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import { environment } from 'environments/environment';
import { WalletService, WalletType } from './wallet.service';
import { UtilService } from './util.service';
import { AppSettingsService } from './app-settings.service';
import { WebsocketService } from './websocket.service';

interface CloudAuthResponse {
  token: string;
  email: string;
  twoFactorEnabled?: boolean;
}

interface TwoFactorStatusResponse {
  enabled: boolean;
  setupPending: boolean;
}

interface CloudProfileSettingsResponse {
  hasSettings: boolean;
  settings?: {
    serverName?: string;
    serverAPI?: string | null;
    serverWS?: string | null;
    serverAuth?: string | null;
    navCardBackground?: string | null;
  };
}

interface CloudWalletResponse {
  hasWallet: boolean;
  encryptedWallet?: string;
  walletType?: WalletType;
  updatedAt?: string;
}

export interface CloudApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

@Injectable()
export class CloudWalletService {
  private readonly tokenStorageKey = 'nault-pro-cloud-token';
  private readonly emailStorageKey = 'nault-pro-cloud-email';
  private readonly apiBase = environment.cloudWalletApi;

  session$ = new BehaviorSubject<{ email: string; token: string } | null>(null);

  constructor(
    private http: HttpClient,
    private walletService: WalletService,
    private util: UtilService,
    private appSettings: AppSettingsService,
    private websocket: WebsocketService
  ) {
    this.loadSessionFromStorage();
  }

  hasSession(): boolean {
    return !!this.session$.value?.token;
  }

  getSessionEmail(): string {
    return this.session$.value?.email || '';
  }

  async register(email: string, password: string): Promise<void> {
    const response = await this.http
      .post<CloudAuthResponse>(`${this.apiBase}/api/auth/register`, { email, password })
      .toPromise();

    this.setSession(response.token, response.email);
  }

  async login(email: string, password: string, totpCode = ''): Promise<void> {
    const response = await this.http
      .post<CloudAuthResponse>(`${this.apiBase}/api/auth/login`, { email, password, totpCode })
      .toPromise();

    this.setSession(response.token, response.email);
  }

  async getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
    return await this.http
      .get<TwoFactorStatusResponse>(`${this.apiBase}/api/auth/2fa/status`, { headers: this.authHeaders() })
      .toPromise();
  }

  async startTwoFactorSetup(): Promise<{ secret: string; otpauthUrl: string }> {
    return await this.http
      .post<{ secret: string; otpauthUrl: string }>(`${this.apiBase}/api/auth/2fa/setup`, {}, { headers: this.authHeaders() })
      .toPromise();
  }

  async enableTwoFactor(code: string): Promise<void> {
    await this.http
      .post(`${this.apiBase}/api/auth/2fa/enable`, { code }, { headers: this.authHeaders() })
      .toPromise();
  }

  async disableTwoFactor(code: string): Promise<void> {
    await this.http
      .post(`${this.apiBase}/api/auth/2fa/disable`, { code }, { headers: this.authHeaders() })
      .toPromise();
  }

  async saveServerSettingsToCloud(settings: {
    serverName: string;
    serverAPI: string | null;
    serverWS: string | null;
    serverAuth: string | null;
  }) {
    if (!this.hasSession()) {
      return;
    }

    await this.http
      .put(
        `${this.apiBase}/api/profile/settings`,
        { settings },
        { headers: this.authHeaders() }
      )
      .toPromise();
  }

  async saveNavCardBackgroundToCloud(navCardBackground: string | null): Promise<void> {
    if (!this.hasSession()) {
      return;
    }

    await this.http
      .put(
        `${this.apiBase}/api/profile/settings`,
        { settings: { navCardBackground } },
        { headers: this.authHeaders() }
      )
      .toPromise();
  }

  async applyCloudServerSettings(reconnect = true): Promise<boolean> {
    if (!this.hasSession()) {
      return false;
    }

    const response = await this.http
      .get<CloudProfileSettingsResponse>(`${this.apiBase}/api/profile/settings`, { headers: this.authHeaders() })
      .toPromise();

    if (!response?.hasSettings || !response.settings) {
      return false;
    }

    const nextSettings: any = {
      serverName: response.settings.serverName || this.appSettings.settings.serverName,
      serverAPI: response.settings.serverAPI || null,
      serverWS: response.settings.serverWS || null,
      serverAuth: response.settings.serverAuth || null,
    };

    if (Object.prototype.hasOwnProperty.call(response.settings, 'navCardBackground')) {
      nextSettings['navCardBackground'] = response.settings.navCardBackground || null;
    }

    this.appSettings.setAppSettings(nextSettings);
    this.appSettings.loadAppSettings();

    if (reconnect) {
      await this.walletService.reloadBalances();
      this.websocket.forceReconnect();
    }

    return true;
  }

  logout() {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.emailStorageKey);
    this.session$.next(null);
  }

  async syncCurrentWalletToCloud() {
    const exportData = this.walletService.generateWalletExport();

    await this.http
      .put(
        `${this.apiBase}/api/wallet`,
        {
          encryptedWallet: JSON.stringify(exportData),
          walletType: exportData.type,
        },
        { headers: this.authHeaders() }
      )
      .toPromise();
  }

  async hasCloudWallet(): Promise<boolean> {
    const response = await this.http
      .get<CloudWalletResponse>(`${this.apiBase}/api/wallet`, { headers: this.authHeaders() })
      .toPromise();

    return !!response?.hasWallet;
  }

  async importCloudWallet(password: string): Promise<boolean> {
    const response = await this.http
      .get<CloudWalletResponse>(`${this.apiBase}/api/wallet`, { headers: this.authHeaders() })
      .toPromise();

    if (!response?.hasWallet || !response.encryptedWallet) {
      return false;
    }

    const importData = JSON.parse(response.encryptedWallet);
    let walletType: WalletType;
    let secret = '';

    if (importData.seed) {
      secret = importData.seed;
      walletType = 'seed';
    } else if (importData.privateKey) {
      secret = importData.privateKey;
      walletType = 'privateKey';
    } else if (importData.expandedKey) {
      secret = importData.expandedKey;
      walletType = 'expandedKey';
    } else {
      return false;
    }

    const decryptedBytes = CryptoJS.AES.decrypt(secret, password);
    const decryptedSecret = decryptedBytes?.toString(CryptoJS.enc.Utf8);
    if (!decryptedSecret || decryptedSecret.length !== 64 || !this.util.nano.isValidSeed(decryptedSecret)) {
      return false;
    }

    return await this.walletService.loadImportedWallet(
      decryptedSecret,
      password,
      importData.accountsIndex || 0,
      importData.indexes || null,
      walletType
    );
  }

  async getCloudWalletExport(): Promise<{ fileName: string; content: string } | null> {
    const response = await this.http
      .get<CloudWalletResponse>(`${this.apiBase}/api/wallet`, { headers: this.authHeaders() })
      .toPromise();

    if (!response?.hasWallet || !response.encryptedWallet) {
      return null;
    }

    const now = new Date();
    const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let walletPayload: unknown = response.encryptedWallet;
    try {
      walletPayload = JSON.parse(response.encryptedWallet);
    } catch {
      walletPayload = response.encryptedWallet;
    }

    const content = JSON.stringify(
      {
        source: 'nault-pro-cloud',
        exportedAt: now.toISOString(),
        updatedAt: response.updatedAt || null,
        walletType: response.walletType || null,
        wallet: walletPayload,
      },
      null,
      2
    );

    return {
      fileName: `nault-pro-cloud-backup-${datePart}.json`,
      content,
    };
  }

  async createApiKey(name: string): Promise<{ id: string; name: string; keyPrefix: string; apiKey: string }> {
    return await this.http
      .post<{ id: string; name: string; keyPrefix: string; apiKey: string }>(
        `${this.apiBase}/api/api-keys`,
        { name },
        { headers: this.authHeaders() }
      )
      .toPromise();
  }

  async listApiKeys(): Promise<CloudApiKey[]> {
    const response = await this.http
      .get<{ keys: CloudApiKey[] }>(`${this.apiBase}/api/api-keys`, { headers: this.authHeaders() })
      .toPromise();

    return response?.keys || [];
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.http
      .delete(`${this.apiBase}/api/api-keys/${id}`, { headers: this.authHeaders() })
      .toPromise();
  }

  private loadSessionFromStorage() {
    const token = localStorage.getItem(this.tokenStorageKey);
    const email = localStorage.getItem(this.emailStorageKey);

    if (token && email) {
      this.session$.next({ email, token });
    }
  }

  private setSession(token: string, email: string) {
    localStorage.setItem(this.tokenStorageKey, token);
    localStorage.setItem(this.emailStorageKey, email);
    this.session$.next({ token, email });
  }

  private authHeaders(): HttpHeaders {
    const token = this.session$.value?.token || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
