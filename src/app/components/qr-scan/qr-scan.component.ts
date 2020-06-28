import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { UtilService } from '../../services/util.service';
import { NotificationService } from "../../services/notification.service";
import { AppSettingsService } from "../../services/app-settings.service";

// for using Instascan library (from instascan.min.js)
declare var Instascan: any;

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.component.html',
  styleUrls: ['./qr-scan.component.css']
})
export class QrScanComponent implements OnInit {

  scanState: number = 0;  // 0 not initialized, 1 scanning visible, 2 scanning suspended, 3 stopped
  scanner = null;
  activeCamera = null;
  activeCameraId = null;
  cameras = [];
  scanOptions = {
    video: null, // set later
    scanPeriod: 1,
    mirror: false
  };
  //scans = [];
  contentString = '';
  contentAccount = '';
  contentHttp = '';
  contentVault = '';
  contentVaultRoutes = [];
  contentVaultParams = {};

  constructor(
    private router: Router,
    private utilService: UtilService,
    private notifcationService: NotificationService,
    private settings: AppSettingsService,
  ) { }

  async ngOnInit() {
    let self = this;
    this.scanOptions.video = document.getElementById('instascan');
    this.scanner = new Instascan.Scanner(this.scanOptions);
    this.scanner.addListener('scan', function (content, image) {
      self.doScanAction(content);
    });

    let cameras1 = await Instascan.Camera.getCameras();
    //console.log('cameras1', cameras1.length);
    if (cameras1.length <= 0) {
      console.error('No cameras found.');
    } else {
      this.cameras = cameras1;
      await this.selectCamera(this.cameras[0]);
    }
  }

  async startScan() {
    //console.log('startScan', this.activeCamera.id);
    //console.log('scanner starting');
    this.doScanAction('');
    await this.scanner.start(this.activeCamera);
    this.scanState = 1;
    //console.log("camera started", camera.id);
  }

  stopScan() {
    this.scanState = 3;
    this.scanner.stop();
  }

  pauseScan() {
    //console.log('pauseScan');
    this.scanState = 2;
  }

  resumeScan() {
    //console.log('resumeScan');
    //this.activeCamera.start();
    this.scanState = 1;
    this.doScanAction('');
  }

  scanAgain() {
    if (this.scanState == 2) {
      this.resumeScan();
    } else {
      this.startScan();
    }
  }

  async selectCamera(camera: any) {
    this.activeCamera = camera;
    this.activeCameraId = camera.Id;
    this.startScan();
  }

  // Process the scan result.  Action is dependening on the scan content:
  // - A full link to within this instance of the web wallet: jump automatically
  // - A Mikron account: Options for (a) send to this address, or (b) explore this account
  // - Any (other) http link: Option to navigate to the link (in a new tab)
  // - Any other: no action, just show the content
  doScanAction(content: string) {
    if (this.scanState == 2) {
      // suspended, ignore
      return;
    }
    //console.log('doScanAction', content.length, content);
    this.contentString = '';
    this.contentAccount = '';
    this.contentHttp = '';
    this.contentVault = '';
    if (!content) {
      // empty scan, ignore
      return;
    }
    this.pauseScan();
    this.notifcationService.sendInfo('Scanned QR code: ' + content);
    this.contentString = content;
    //this.scans.unshift({ date: +(Date.now()), content: content });

    // content-sensitive processing of QR code content
    if (content.startsWith('http')) {
      this.contentHttp = content;
      // check if link points to ourselves (this instance of the vault)
      const vaultPrefix = this.settings.getServerApiBaseUrl();
      if (content.startsWith(vaultPrefix)) {
        this.contentVault = content;
        // parse routes and params
        const routeAndParams = content.substring(vaultPrefix.length);
        //console.log(routeAndParams);
        const paramsIdx = routeAndParams.indexOf("?");
        //console.log(paramsIdx);
        let route = routeAndParams;
        let params = '';
        if (paramsIdx > 0) {
          route = routeAndParams.substring(0, paramsIdx);
          params = routeAndParams.substring(paramsIdx + 1);
        }
        //console.log('route', route, 'params', params);

        this.contentVaultRoutes = [route];
        this.contentVaultParams = {};
        if (params) {
          const pps = params.split('?');
          for (var i in pps) {
            //console.log(pps[i]);
            const keyVal = pps[i].split('=');
            //console.log(pps[i], keyVal[0], keyVal[1]);
            if (keyVal[0] && keyVal[1]) {
              //console.log(keyVal[0], keyVal[1]);
              this.contentVaultParams[keyVal[0]] = keyVal[1];
            }
          }
        }
        //console.log('contentVaultRoutes', this.contentVaultRoutes);
        //console.log('contentVaultParams', this.contentVaultParams);

        // jump aumatically
        this.actVault();
      }
    } else if (this.utilService.account.isValidAccount(content)) {
      this.contentAccount = content;
      // either go to account details or send to this account
      //this.routeTo(['send'], {to: content});
    }
  }

  routeTo(routes, params) {
    //console.log('routing to', routes, params);
    this.stopScan();
    this.router.navigate(routes, {queryParams: params});
  }

  actAccountSend() {
    if (!this.contentAccount) return;
    this.routeTo(['send'], {to: this.contentAccount});
  }

  actAccountExplore() {
    if (!this.contentAccount) return;
    this.routeTo(['account', this.contentAccount], {});
  }

  actVault() {
    this.routeTo(this.contentVaultRoutes, this.contentVaultParams);
  }
}
