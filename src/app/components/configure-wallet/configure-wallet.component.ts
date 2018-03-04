import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-configure-wallet',
  templateUrl: './configure-wallet.component.html',
  styleUrls: ['./configure-wallet.component.css']
})
export class ConfigureWalletComponent implements OnInit {
  wallet = this.walletService.wallet;
  activePanel = 0;

  newWalletSeed = '';
  importSeedModel = '';
  walletPasswordModel = '';
  walletPasswordConfirmModel = '';

  constructor(private router: ActivatedRoute, private walletService: WalletService, private notifications: NotificationService, private route: Router) { }

  async ngOnInit() {
    // Allow a seed import via URL.  (Insecure, not recommended)
    const importSeed = this.router.snapshot.fragment;
    if (importSeed && importSeed.length > 1) {
      if (importSeed.length !== 64) return this.notifications.sendError(`Import seed is invalid, double check it!`);

      await this.createWalletFromSeed(importSeed);
    }

    const toggleImport = this.router.snapshot.queryParams.import;
    if (toggleImport) {
      this.activePanel = 1;
    }
  }

  async createWalletFromSeed(seed) {

    this.notifications.sendInfo(`Attempting to import seed. Scanning for used accounts, this could take some time...`);
    await this.walletService.createWalletFromSeed(seed);
    this.activePanel = 4;

    this.notifications.sendSuccess(`Successfully imported existing wallet!`);

  }

  async importExistingWallet() {
    const existingSeed = this.importSeedModel.trim();
    if (existingSeed.length !== 64) return this.notifications.sendError(`Seed is invalid, double check it!`);

    await this.createWalletFromSeed(existingSeed);
  }

  async createNewWallet() {
    const newSeed = this.walletService.createNewWallet();
    this.newWalletSeed = newSeed;

    this.activePanel = 3;
    this.notifications.sendSuccess(`Successfully created new wallet! Make sure to write down your seed!`);
  }

  confirmNewSeed() {
    this.newWalletSeed = '';

    this.activePanel = 4;
  }

  saveWalletPassword() {
    if (this.walletPasswordConfirmModel !== this.walletPasswordModel) {
      return this.notifications.sendError(`Password confirmation does not match, try again!`);
    }
    if (this.walletPasswordModel.length < 1) {
      return this.notifications.sendWarning(`Password cannot be empty!`);
    }
    const newPassword = this.walletPasswordModel;
    this.walletService.wallet.password = newPassword;

    this.walletService.saveWalletExport();

    this.walletPasswordModel = '';
    this.walletPasswordConfirmModel = '';

    this.activePanel = 5;
    this.notifications.sendSuccess(`Successfully set wallet password!`);
  }

  setPanel(panel) {
    this.activePanel = panel;
  }

  copied() {
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`);
  }

  importFromFile(files) {
    if (!files.length) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target['result'];
      try {
        const importData = JSON.parse(fileData);
        if (!importData.seed || !importData.hasOwnProperty('accountsIndex')) {
          return this.notifications.sendError(`Bad import data `)
        }

        const walletEncrypted = btoa(JSON.stringify(importData));
        this.route.navigate(['import-wallet'], { fragment: walletEncrypted });
      } catch (err) {
        this.notifications.sendError(`Unable to parse import data, make sure you selected the right file!`);
      }
    };

    reader.readAsText(file);
  }





}
