import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CloudWalletService } from '../../services/cloud-wallet.service';
import { NotificationService } from '../../services/notification.service';
import { CloudApiKey } from '../../services/cloud-wallet.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-cloud-auth',
  templateUrl: './cloud-auth.component.html',
  styleUrls: ['./cloud-auth.component.css']
})
export class CloudAuthComponent implements OnInit {
  mode: 'login' | 'register' = 'login';
  email = '';
  password = '';
  confirmPassword = '';
  totpCode = '';
  requiresTwoFactor = false;
  walletPassword = '';
  busy = false;
  cloudWalletExists = false;
  twoFactorEnabled = false;
  twoFactorSetupPending = false;
  twoFactorSecret = '';
  twoFactorOtpAuthUrl = '';
  twoFactorQrCode = '';
  twoFactorVerificationCode = '';
  twoFactorDisableCode = '';
  activePanel: 'overview' | 'wallet' | 'security' | 'api' = 'overview';
  nextRoute = '';
  apiKeyName = 'Default Key';
  apiKeys: CloudApiKey[] = [];
  newApiKey = '';

  constructor(
    public cloudWalletService: CloudWalletService,
    private route: ActivatedRoute,
    private router: Router,
    private notifications: NotificationService
  ) {}

  async ngOnInit() {
    const modeFromPath = this.route.snapshot.routeConfig?.path?.includes('register') ? 'register' : 'login';
    const modeFromQuery = this.route.snapshot.queryParamMap.get('mode') === 'register' ? 'register' : null;
    this.nextRoute = this.route.snapshot.queryParamMap.get('next') || '';
    this.mode = modeFromQuery || modeFromPath;

    if (this.cloudWalletService.hasSession()) {
      await this.refreshWalletAvailability();
      await this.refreshApiKeys();
      await this.refreshTwoFactorStatus();
    }
  }

  setMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.requiresTwoFactor = false;
    this.totpCode = '';
  }

  async submitAuth() {
    if (this.busy) {
      return;
    }

    if (!this.email.trim()) {
      this.notifications.sendError('Email is required');
      return;
    }

    if (this.password.length < 8) {
      this.notifications.sendWarning('Password must be at least 8 characters');
      return;
    }

    if (this.mode === 'register' && this.password !== this.confirmPassword) {
      this.notifications.sendError('Password confirmation does not match');
      return;
    }

    this.busy = true;
    try {
      if (this.mode === 'register') {
        await this.cloudWalletService.register(this.email, this.password);
        this.notifications.sendSuccess('Cloud wallet account created');
      } else {
        await this.cloudWalletService.login(this.email, this.password, this.totpCode);
        this.requiresTwoFactor = false;
        this.totpCode = '';
        this.notifications.sendSuccess('Signed in to cloud wallet');
      }

      try {
        await this.cloudWalletService.applyCloudServerSettings(true);
      } catch {
        // Non-blocking: login should still work even if cloud settings sync fails.
      }

      if (this.nextRoute === 'configure-wallet') {
        this.router.navigate(['configure-wallet'], { queryParams: { cloud: '1' } });
        return;
      }

      await this.refreshWalletAvailability();
      await this.refreshApiKeys();
      await this.refreshTwoFactorStatus();
    } catch (err: any) {
      const message = err?.error?.error || 'Authentication failed';
      if (err?.error?.requires2fa && this.mode === 'login') {
        this.requiresTwoFactor = true;
      }
      this.notifications.sendError(message);
    } finally {
      this.busy = false;
    }
  }

  async refreshWalletAvailability() {
    try {
      this.cloudWalletExists = await this.cloudWalletService.hasCloudWallet();
    } catch {
      this.cloudWalletExists = false;
    }
  }

  async refreshApiKeys() {
    if (!this.cloudWalletService.hasSession()) {
      this.apiKeys = [];
      return;
    }

    try {
      this.apiKeys = await this.cloudWalletService.listApiKeys();
    } catch {
      this.apiKeys = [];
    }
  }

  setActivePanel(panel: 'overview' | 'wallet' | 'security' | 'api') {
    this.activePanel = panel;
  }

  async refreshTwoFactorStatus() {
    if (!this.cloudWalletService.hasSession()) {
      this.twoFactorEnabled = false;
      this.twoFactorSetupPending = false;
      return;
    }

    try {
      const status = await this.cloudWalletService.getTwoFactorStatus();
      this.twoFactorEnabled = !!status.enabled;
      this.twoFactorSetupPending = !!status.setupPending;

      if (this.twoFactorEnabled) {
        this.twoFactorSetupPending = false;
        this.twoFactorSecret = '';
        this.twoFactorOtpAuthUrl = '';
        this.twoFactorQrCode = '';
        this.twoFactorVerificationCode = '';
      }
    } catch {
      this.twoFactorEnabled = false;
      this.twoFactorSetupPending = false;
    }
  }

  async startTwoFactorSetup() {
    this.busy = true;
    try {
      const setup = await this.cloudWalletService.startTwoFactorSetup();
      this.twoFactorSecret = setup.secret;
      this.twoFactorOtpAuthUrl = setup.otpauthUrl;
      this.twoFactorQrCode = await QRCode.toDataURL(setup.otpauthUrl, { errorCorrectionLevel: 'M', scale: 8, margin: 1 });
      this.twoFactorSetupPending = true;
      this.twoFactorVerificationCode = '';
      this.notifications.sendSuccess('2FA setup started. Scan the QR code and verify with a code from your app.');
    } catch (err: any) {
      const message = err?.error?.error || 'Failed to start 2FA setup';
      this.notifications.sendError(message);
    } finally {
      this.busy = false;
    }
  }

  async enableTwoFactor() {
    if (!/^\d{6}$/.test(this.twoFactorVerificationCode.trim())) {
      this.notifications.sendWarning('Enter a valid 6-digit code from your authenticator app');
      return;
    }

    this.busy = true;
    try {
      await this.cloudWalletService.enableTwoFactor(this.twoFactorVerificationCode.trim());
      this.notifications.sendSuccess('2FA is now enabled for your account');
      this.twoFactorSecret = '';
      this.twoFactorOtpAuthUrl = '';
      this.twoFactorQrCode = '';
      this.twoFactorVerificationCode = '';
      await this.refreshTwoFactorStatus();
    } catch (err: any) {
      const message = err?.error?.error || 'Failed to enable 2FA';
      this.notifications.sendError(message);
    } finally {
      this.busy = false;
    }
  }

  async disableTwoFactor() {
    if (!/^\d{6}$/.test(this.twoFactorDisableCode.trim())) {
      this.notifications.sendWarning('Enter your current 6-digit code to disable 2FA');
      return;
    }

    this.busy = true;
    try {
      await this.cloudWalletService.disableTwoFactor(this.twoFactorDisableCode.trim());
      this.twoFactorDisableCode = '';
      this.notifications.sendSuccess('2FA has been disabled');
      await this.refreshTwoFactorStatus();
    } catch (err: any) {
      const message = err?.error?.error || 'Failed to disable 2FA';
      this.notifications.sendError(message);
    } finally {
      this.busy = false;
    }
  }

  async createApiKey() {
    if (!this.apiKeyName.trim()) {
      this.notifications.sendWarning('API key name is required');
      return;
    }

    this.busy = true;
    try {
      const created = await this.cloudWalletService.createApiKey(this.apiKeyName.trim());
      this.newApiKey = created.apiKey;
      this.notifications.sendSuccess('API key created. Copy it now, it will not be shown again.');
      await this.refreshApiKeys();
    } catch {
      this.notifications.sendError('Failed to create API key');
    } finally {
      this.busy = false;
    }
  }

  async revokeApiKey(id: string) {
    this.busy = true;
    try {
      await this.cloudWalletService.revokeApiKey(id);
      this.notifications.sendSuccess('API key revoked');
      await this.refreshApiKeys();
    } catch (err: any) {
      const message = err?.error?.error || 'Failed to revoke API key';
      this.notifications.sendError(message);
    } finally {
      this.busy = false;
    }
  }

  openApiDocs() {
    this.router.navigate(['cloud-api-docs']);
  }

  async importCloudWallet() {
    if (!this.walletPassword) {
      this.notifications.sendWarning('Enter your wallet password to decrypt the cloud backup');
      return;
    }

    this.busy = true;
    try {
      const imported = await this.cloudWalletService.importCloudWallet(this.walletPassword);
      if (!imported) {
        this.notifications.sendError('Unable to import cloud wallet. Verify your wallet password.');
        return;
      }

      this.notifications.sendSuccess('Cloud wallet imported successfully');
      this.router.navigate(['accounts']);
    } catch {
      this.notifications.sendError('Unable to import cloud wallet');
    } finally {
      this.busy = false;
    }
  }

  async exportCloudWallet() {
    this.busy = true;
    try {
      const backup = await this.cloudWalletService.getCloudWalletExport();
      if (!backup) {
        this.notifications.sendWarning('No cloud wallet backup found to export');
        return;
      }

      const blob = new Blob([backup.content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notifications.sendSuccess('Cloud backup exported successfully');
    } catch {
      this.notifications.sendError('Unable to export cloud backup');
    } finally {
      this.busy = false;
    }
  }

  goToCloudSetup() {
    this.router.navigate(['configure-wallet'], { queryParams: { cloud: '1' } });
  }

  logout() {
    this.cloudWalletService.logout();
    this.cloudWalletExists = false;
    this.requiresTwoFactor = false;
    this.totpCode = '';
    this.twoFactorEnabled = false;
    this.twoFactorSetupPending = false;
    this.twoFactorSecret = '';
    this.twoFactorOtpAuthUrl = '';
    this.twoFactorQrCode = '';
    this.twoFactorVerificationCode = '';
    this.twoFactorDisableCode = '';
    this.walletPassword = '';
    this.apiKeys = [];
    this.newApiKey = '';
    this.notifications.sendSuccess('Signed out from cloud wallet');
  }
}
