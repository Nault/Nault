import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { UtilService } from '../../services/util.service';
import { NotificationService } from "../../services/notification.service";
import { AppSettingsService } from "../../services/app-settings.service";
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';
import { checkAddress } from 'nanocurrency';

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

  constructor(
    private router: Router,
    private utilService: UtilService,
    private notifcationService: NotificationService,
    private settings: AppSettingsService,
    private util: UtilService,
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

    const nano_scheme = /^(nano|nanorep):(nano_[13][13-9a-km-uw-z]{59}).*$/g

    if(checkAddress(resultString)){
      console.log('Got address, routing to send...');
      this.router.navigate(['send'], {queryParams: {to: resultString}});

    } else if(nano_scheme.test(resultString)) {
      var url = new URL(resultString)

      if(url.protocol === 'nano:'){
        var amount = url.searchParams.get('amount');
        this.router.navigate(['send'], { queryParams: {
          to: url.pathname,
          amount: amount ? this.util.nano.rawToMnano(amount) : null
        }});

      } else if (url.protocol === 'nanorep:') {
        this.router.navigate(['representatives'], { queryParams: { 
          hideOverview: true,
          accounts: 'all',
          representative: url.pathname
        }});
      }
      
    } else {
      this.notifcationService.sendWarning('This QR code is not recognized.', { length: 5000, identifier: 'qr-not-recognized' })
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
