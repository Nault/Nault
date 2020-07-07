import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { UtilService } from '../../services/util.service';
import { NotificationService } from "../../services/notification.service";
import { AppSettingsService } from "../../services/app-settings.service";
import { WalletService } from "../../services/wallet.service";
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';
import { checkAddress, checkSeed } from 'nanocurrency';

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
    private utilService: UtilService,
    private notifcationService: NotificationService,
    private settings: AppSettingsService,
    private util: UtilService,
    private walletService: WalletService,
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

    const nano_scheme = /^(nano|nanorep|nanoseed):.+$/g

    if(checkAddress(resultString)){
      // Got address, routing to send...
      this.router.navigate(['send'], {queryParams: {to: resultString}});

    } else if(checkSeed(resultString)){
      // Seed
      this.handleSeed(resultString);

    } else if(nano_scheme.test(resultString)) {
      // This is a valid Nano scheme URI
      var url = new URL(resultString)

      if(url.protocol === 'nano:' && checkAddress(url.pathname)){
        // Got address, routing to send...
        var amount = url.searchParams.get('amount');
        this.router.navigate(['send'], { queryParams: {
          to: url.pathname,
          amount: amount ? this.util.nano.rawToMnano(amount) : null
        }});

      } else if (url.protocol === 'nanorep:' && checkAddress(url.pathname)) {
        // Representative change
        this.router.navigate(['representatives'], { queryParams: { 
          hideOverview: true,
          accounts: 'all',
          representative: url.pathname
        }});

      } else if (url.protocol === 'nanoseed:' && checkSeed(url.pathname)) {
        // Seed
        this.handleSeed(url.pathname);
      }
      
    } else {
      this.notifcationService.sendWarning('This QR code is not recognized.', { length: 5000, identifier: 'qr-not-recognized' })
    }
  }

  handleSeed(seed){
    if (this.hasAccounts) {
      // Wallet already set up, sweeping...
      this.router.navigate(['sweeper'], { state: { seed: seed } });
    } else {
      // No wallet set up, new wallet...
      this.router.navigate(['configure-wallet'], { state: { seed: seed }});
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
