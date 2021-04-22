import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NotificationService} from '../../services/notification.service';
import * as CryptoJS from 'crypto-js';
import {WalletService, WalletType} from '../../services/wallet.service';
import {UtilService} from '../../services/util.service';

@Component({
  selector: 'app-import-wallet',
  templateUrl: './import-wallet.component.html',
  styleUrls: ['./import-wallet.component.css']
})
export class ImportWalletComponent implements OnInit {
  activePanel = 'error';

  walletPassword = '';
  validImportData = false;
  importData: any = null;
  hostname = '';

  constructor(private route: ActivatedRoute, private notifications: NotificationService, private walletService: WalletService,
    private router: Router, private util: UtilService) { }

  ngOnInit() {
    const importData = this.route.snapshot.fragment;
    const queryData = this.route.snapshot.queryParams;
    if (!importData || !importData.length) {
      return this.importDataError(`No import data found.  Check your link and try again.`);
    }

    if ('hostname' in queryData) this.hostname = queryData.hostname;
    const decodedData = atob(importData);

    try {
      const importBlob = JSON.parse(decodedData);
      if (!importBlob || (!importBlob.seed && !importBlob.privateKey && !importBlob.expandedKey)) {
        return this.importDataError(`Bad import data.  Check your link and try again.`);
      }
      this.validImportData = true;
      this.importData = importBlob;
      this.activePanel = 'import';
    } catch (err) {
      return this.importDataError(`Unable to decode import data.  Check your link and try again.`);
    }
  }

  importDataError(message) {
    this.activePanel = 'error';
    return this.notifications.sendError(message);
  }

  async decryptWallet() {
    // Attempt to decrypt the seed value using the password
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // brute force delay
      let walletType: WalletType;
      let secret = '';
      if (this.importData.seed) {
        secret = this.importData.seed;
        walletType = 'seed';
      } else if (this.importData.privateKey) {
        secret = this.importData.privateKey;
        walletType = 'privateKey';
      } else if (this.importData.expandedKey) {
        secret = this.importData.expandedKey;
        walletType = 'expandedKey';
      }
      const decryptedBytes = CryptoJS.AES.decrypt(secret, this.walletPassword);
      const decryptedSecret = decryptedBytes?.toString(CryptoJS.enc.Utf8);
      if (!decryptedSecret || decryptedSecret.length !== 64) {
        this.walletPassword = '';
        return this.notifications.sendError(`Invalid password, please try again`);
      }
      if (!this.util.nano.isValidSeed(decryptedSecret)) {
        this.walletPassword = '';
        return this.notifications.sendError(`Invalid seed format (non HEX characters)`);
      }

      this.router.navigate(['accounts']); // load accounts and watch them update in real-time
      this.notifications.sendInfo(`Loading all accounts for the wallet...`);
      if (await this.walletService.loadImportedWallet(decryptedSecret, this.walletPassword,
        this.importData.accountsIndex || 0, this.importData.indexes || null, walletType)) {
          this.notifications.sendSuccess(`Successfully imported the wallet!`, {length: 10000});
      } else {
        return this.notifications.sendError(`Failed importing the wallet. Invalid data!`);
      }

    } catch (err) {
      this.walletPassword = '';
      return this.notifications.sendError(`Invalid password, please try again`);
    }
  }

}
