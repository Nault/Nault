import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UtilService } from '../../services/util.service';
import { NotificationService } from '../../services/notification.service';
import { WalletService } from '../../services/wallet.service';
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';
import { RemoteSignService } from '../../services/remote-sign.service';

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.component.html',
  styleUrls: ['./qr-scan.component.css']
})
export class QrScanComponent implements OnInit {

  availableDevices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo = null;

  formatsEnabled: BarcodeFormat[] = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE,
  ];

  hasDevices: boolean;
  hasPermission: boolean;

  qrResultString: string;

  torchEnabled = false;
  torchAvailable$ = new BehaviorSubject<boolean>(false);
  tryHarder = false;

  hasAccounts = this.walletService.wallet.accounts.length > 0;

  constructor(
    private router: Router,
    private notifcationService: NotificationService,
    private util: UtilService,
    private walletService: WalletService,
    private remoteSignService: RemoteSignService,
  ) { }

  ngOnInit(): void { }

  clearResult(): void {
    this.qrResultString = null;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
  }

  onCodeResult(resultString: string) {
    this.qrResultString = resultString;

    const nano_scheme = /^(nano|nanorep|nanoseed|nanokey|nanosign|nanoprocess|https):.+$/g;

    if (this.util.account.isValidAccount(resultString)) {
      // Got address, routing to send...
      this.router.navigate(['send'], {queryParams: {to: resultString}});

    } else if (this.util.nano.isValidSeed(resultString)) {
      // Seed
      this.handleSeed(resultString);

    } else if (nano_scheme.test(resultString)) {
      // This is a valid Nano scheme URI
      const url = new URL(resultString);

      // check if QR contains a full URL path
      if (url.protocol === 'https:') {
        if (url.pathname === '/import-wallet' && url.hash.slice(1).length) {
          // wallet import
          this.router.navigate(['import-wallet'], { queryParams: {hostname: url.hostname}, fragment: url.hash.slice(1)});
        } else if (url.pathname === '/import-address-book' && url.hash.slice(1).length) {
          // address book import
          this.router.navigate(['import-address-book'], { queryParams: {hostname: url.hostname}, fragment: url.hash.slice(1)});
        }
      } else if (url.protocol === 'nano:' && this.util.account.isValidAccount(url.pathname)) {
        // Got address, routing to send...
        const amount = url.searchParams.get('amount');
        this.router.navigate(['send'], { queryParams: {
          to: url.pathname,
          amount: amount ? this.util.nano.rawToMnano(amount) : null
        }});

      } else if (url.protocol === 'nanorep:' && this.util.account.isValidAccount(url.pathname)) {
        // Representative change
        this.router.navigate(['representatives'], { queryParams: {
          hideOverview: true,
          accounts: 'all',
          representative: url.pathname
        }});

      } else if (url.protocol === 'nanoseed:' && this.util.nano.isValidSeed(url.pathname)) {
        // Seed
        this.handleSeed(url.pathname);
      } else if (url.protocol === 'nanokey:' && this.util.nano.isValidHash(url.pathname)) {
        // Private key
        this.handlePrivateKey(url.pathname);
      } else if (url.protocol === 'nanosign:') {
          this.remoteSignService.navigateSignBlock(url);

      } else if (url.protocol === 'nanoprocess:') {
          this.remoteSignService.navigateProcessBlock(url);
      }

    } else {
      this.notifcationService.sendWarning('This QR code is not recognized.', { length: 5000, identifier: 'qr-not-recognized' });
    }
  }

  handleSeed(seed) {
    if (this.hasAccounts) {
      // Wallet already set up, sweeping...
      this.router.navigate(['sweeper'], { state: { seed: seed } });
    } else {
      // No wallet set up, new wallet...
      this.router.navigate(['configure-wallet'], { state: { seed: seed }});
    }
  }

  handlePrivateKey(key) {
    if (this.hasAccounts) {
      // Wallet already set up, sweeping...
      this.router.navigate(['sweeper'], { state: { seed: key } });
    } else {
      // No wallet set up, new wallet...
      this.router.navigate(['configure-wallet'], { state: { key: key }});
    }
  }

  onDeviceSelectChange(selected: string) {
    const device = this.availableDevices.find(x => x.deviceId === selected);
    this.currentDevice = device || null;
  }

  onHasPermission(has: boolean) {
    this.hasPermission = has;
  }

  onTorchCompatible(isCompatible: boolean): void {
    this.torchAvailable$.next(isCompatible || false);
  }

  toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled;
  }

  toggleTryHarder(): void {
    this.tryHarder = !this.tryHarder;
  }
}
