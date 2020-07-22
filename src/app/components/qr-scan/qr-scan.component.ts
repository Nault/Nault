import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { UtilService } from '../../services/util.service';
import { NotificationService } from "../../services/notification.service";
import { WalletService } from "../../services/wallet.service";
import { BarcodeFormat } from '@zxing/library';
import { BehaviorSubject } from 'rxjs';

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

    const nano_scheme = /^(nano|nanorep|nanoseed|nanosign|nanoprocess):.+$/g

    if(this.util.account.isValidAccount(resultString)){
      // Got address, routing to send...
      this.router.navigate(['send'], {queryParams: {to: resultString}});

    } else if(this.util.nano.isValidSeed(resultString)){
      // Seed
      this.handleSeed(resultString);

    } else if(nano_scheme.test(resultString)) {
      // This is a valid Nano scheme URI
      var url = new URL(resultString)

      if(url.protocol === 'nano:' && this.util.account.isValidAccount(url.pathname)){
        // Got address, routing to send...
        var amount = url.searchParams.get('amount');
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
      } else if (url.protocol === 'nanosign:' && this.checkSignBlock(url.pathname)) {
        try {
          let data = JSON.parse(url.pathname);
          // Block to sign
          var paramsSign = {
            sign: 1,
            n_account: data.block.account,
            n_previous: data.block.previous,
            n_representative: data.block.representative,
            n_balance: data.block.balance,
            n_link: data.block.link,
          }
          // only include if it exist
          if (data.previous) {
            paramsSign = {...paramsSign,...{
              p_account: data.previous.account,
              p_previous: data.previous.previous,
              p_representative: data.previous.representative,
              p_balance: data.previous.balance,
              p_link: data.previous.link,
            }}
          }
          this.router.navigate(['sign'], { queryParams: paramsSign});
        }
        catch (error) {
          this.notifcationService.sendWarning('Block sign data detected but not correct format.', { length: 5000, identifier: 'qr-not-recognized' })
        }
        
      } else if (url.protocol === 'nanoprocess:' && this.checkSignBlock(url.pathname) && this.checkProcessBlock(url.pathname)) {
        try {
          let data = JSON.parse(url.pathname);
          // Block to process
          var paramsProcess = {
            sign: 0,
            n_account: data.block.account,
            n_previous: data.block.previous,
            n_representative: data.block.representative,
            n_balance: data.block.balance,
            n_link: data.block.link,
            n_signature: data.block.signature,
            n_work: data.block.work,
          }
          // only include if it exist
          if (data.previous) {
            paramsProcess = {...paramsProcess,...{
              p_account: data.previous.account,
              p_previous: data.previous.previous,
              p_representative: data.previous.representative,
              p_balance: data.previous.balance,
              p_link: data.previous.link,
            }}
          }
          this.router.navigate(['sign'], { queryParams: paramsProcess});
        }
        catch (error) {
          this.notifcationService.sendWarning('Block process data detected but not correct format.', { length: 5000, identifier: 'qr-not-recognized' })
        }
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

  checkSignBlock(stringdata:string) {
    try {
      let data = JSON.parse(stringdata);
      return (this.util.account.isValidAccount(data.block.account) &&
        data.previous ? this.util.account.isValidAccount(data.previous.account):true &&
        this.util.account.isValidAccount(data.block.representative) &&
        data.previous ? this.util.account.isValidAccount(data.previous.representative):true &&
        this.util.account.isValidAmount(data.block.balance) &&
        data.previous ? this.util.account.isValidAmount(data.previous.balance):true &&
        this.util.nano.isValidHash(data.block.previous) &&
        data.previous ? this.util.nano.isValidHash(data.previous.previous):true &&
        this.util.nano.isValidHash(data.block.link) &&
        data.previous ? this.util.nano.isValidHash(data.previous.link):true)
    }
    catch (error) {
      return false
    }
  }

  checkProcessBlock(stringdata:string) {
    try {
      let data = JSON.parse(stringdata);
      return (this.util.nano.isValidSignature(data.block.signature) &&
        data.block.work ? this.util.nano.isValidWork(data.block.work):true)
    }
    catch (error) {
      return false
    }
  }
}
