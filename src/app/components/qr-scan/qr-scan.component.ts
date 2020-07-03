import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { UtilService } from '../../services/util.service';
import { NotificationService } from "../../services/notification.service";
import { AppSettingsService } from "../../services/app-settings.service";
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';
import * as nanocurrency from 'nanocurrency';

// for using Instascan library (from instascan.min.js)
declare var Instascan: any;

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
  ) { }

  ngOnInit(): void { }

  clearResult(): void {
    this.qrResultString = null;
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    console.log('DEVICES:', devices);
    
    this.availableDevices = devices;
    this.hasDevices = Boolean(devices && devices.length);
  }

  onCodeResult(resultString: string) {
    this.qrResultString = resultString;
    console.log('SCAN:', resultString);
    

    if(nanocurrency.checkAddress(resultString)){
      console.log('Got address, routing to send...');
      
      this.router.navigate(['send'], {queryParams: {to: resultString}});
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
