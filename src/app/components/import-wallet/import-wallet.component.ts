import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {NotificationService} from '../../services/notification.service';
import * as CryptoJS from 'crypto-js';
import {WalletService} from '../../services/wallet.service';

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
    private router: Router) { }

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
      if (!importBlob || !importBlob.seed) {
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
      const decryptedBytes = CryptoJS.AES.decrypt(this.importData.seed, this.walletPassword);
      const decryptedSeed = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedSeed || decryptedSeed.length !== 64) {
        this.walletPassword = '';
        return this.notifications.sendError(`Invalid password, please try again`);
      }

      this.router.navigate(['accounts']); // load accounts and watch them update in real-time
      this.notifications.sendInfo(`Loading all accounts for the wallet...`);
      if (await this.walletService.loadImportedWallet(decryptedSeed, this.walletPassword,
        this.importData.accountsIndex || 0, this.importData.indexes || null)) {
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
