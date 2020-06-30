import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ActivatedRoute, Router} from "@angular/router";
import * as bip from 'bip39';
import {LedgerService, LedgerStatus} from "../../services/ledger.service";

@Component({
  selector: 'app-configure-wallet',
  templateUrl: './configure-wallet.component.html',
  styleUrls: ['./configure-wallet.component.css']
})
export class ConfigureWalletComponent implements OnInit {
  wallet = this.walletService.wallet;
  isConfigured = this.walletService.isConfigured;
  activePanel = 0;

  newWalletSeed = '';
  newWalletMnemonic = '';
  newWalletMnemonicLines = [];
  importSeedModel = '';
  importSeedMnemonicModel = '';
  walletPasswordModel = '';
  walletPasswordConfirmModel = '';

  selectedImportOption = 'seed';
  importOptions = [
    { name: 'Nano Seed', value: 'seed' },
    { name: 'Nano Mnemonic Phrase', value: 'mnemonic' },
    { name: 'Nault Wallet File', value: 'file' },
    { name: 'Ledger Nano S', value: 'ledger' },
  ];

  ledgerStatus = LedgerStatus;
  ledger = this.ledgerService.ledger;

  constructor(private router: ActivatedRoute, public walletService: WalletService, private notifications: NotificationService, private route: Router, private ledgerService: LedgerService) { }

  async ngOnInit() {
    const toggleImport = this.router.snapshot.queryParams.import;
    if (toggleImport) {
      this.activePanel = 1;
    }

    this.ledgerService.loadLedger(true);
    this.ledgerService.ledgerStatus$.subscribe(newStatus => {
      // this.updateLedgerStatus();
    })
  }

  async importExistingWallet() {
    let importSeed = '';
    if (this.selectedImportOption === 'seed') {
      const existingSeed = this.importSeedModel.trim();
      if (existingSeed.length !== 64) return this.notifications.sendError(`Seed is invalid, double check it!`);
      importSeed = existingSeed;
    } else if (this.selectedImportOption === 'mnemonic') {
      // Clean the value by trimming it and removing newlines
      const mnemonic = this.importSeedMnemonicModel.toLowerCase().trim().replace(/\n/g, ``);

      const words = mnemonic.split(' ');
      if (words.length < 20) return this.notifications.sendError(`Mnemonic is too short, double check it!`);

      // Try and decode the mnemonic
      try {
        const newSeed = bip.mnemonicToEntropy(mnemonic);
        if (!newSeed || newSeed.length !== 64) return this.notifications.sendError(`Mnemonic is invalid, double check it!`);
        importSeed = newSeed.toUpperCase(); // Force uppercase, for consistency
      } catch (err) {
        return this.notifications.sendError(`Unable to decode mnemonic, double check it!`);
      }
    } else {
      return this.notifications.sendError(`Invalid import option`);
    }

    // Now, if a wallet is configured, make sure they confirm an overwrite first
    const confirmed = await this.confirmWalletOverwrite();
    if (!confirmed) return;

    this.notifications.sendInfo(`Importing existing accounts...`, { identifier: 'importing-loading' });
    await this.walletService.createWalletFromSeed(importSeed);

    this.notifications.removeNotification('importing-loading');

    this.activePanel = 4;
    this.notifications.sendSuccess(`Successfully imported wallet!`);
  }

  async importLedgerWallet(refreshOnly = false) {
    // Determine status of ledger device using ledger service
    this.notifications.sendInfo(`Checking for Ledger device...`, { identifier: 'ledger-status', length: 0 });
    await this.ledgerService.loadLedger(true);
    this.notifications.removeNotification('ledger-status');

    if (this.ledger.status === LedgerStatus.NOT_CONNECTED) {
      return this.notifications.sendWarning(`No ledger device detected, make sure it is connected and you are using Chrome/Opera`);
    }

    if (this.ledger.status === LedgerStatus.LOCKED) {
      return this.notifications.sendWarning(`Unlock your ledger device and open the Nano app to continue`);
    }

    if (refreshOnly) {
      return;
    }

    // If a wallet exists already, make sure they know they are overwriting it
    const confirmed = await this.confirmWalletOverwrite();
    if (!confirmed) {
      return;
    }

    // Create new ledger wallet
    const newWallet = await this.walletService.createLedgerWallet();

    // We skip the password panel
    this.activePanel = 5;
    this.notifications.sendSuccess(`Successfully loaded ledger device!`);

    // If they are using Chrome, warn them.
    if (this.ledgerService.isBrokenBrowser()) {
      this.notifications.sendLedgerChromeWarning();
    }
  }

  // Send a confirmation dialog to the user if they already have a wallet configured
  async confirmWalletOverwrite() {
    if (!this.isConfigured()) return true;

    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm('<p style="text-align: center;"><span style="font-size: 18px;">You are about to create a new wallet<br>which will <b>overwrite your existing wallet</b></span><br><br><b style="font-size: 18px;">Be sure you have saved your current Nano seed before continuing</b><br><br>Without it - <b>ALL FUNDS WILL BE UNRECOVERABLE</b></p>');
      return true;
    } catch (err) {
      this.notifications.sendInfo(`Use the 'Manage Wallet' page to back up your Nano seed before continuing!`);
      return false;
    }
  }

  async createNewWallet() {
    // If a wallet already exists, confirm that the seed is saved
    const confirmed = await this.confirmWalletOverwrite();
    if (!confirmed) return;

    const newSeed = this.walletService.createNewWallet();
    this.newWalletSeed = newSeed;
    this.newWalletMnemonic = bip.entropyToMnemonic(newSeed);

    // Split the seed up so we can show 4 per line
    const words = this.newWalletMnemonic.split(' ');
    const lines = [
      words.slice(0, 4),
      words.slice(4, 8),
      words.slice(8, 12),
      words.slice(12, 16),
      words.slice(16, 20),
      words.slice(20, 24),
    ];
    this.newWalletMnemonicLines = lines;

    this.activePanel = 3;
    this.notifications.sendSuccess(`Successfully created new wallet! Make sure to write down your seed!`);
  }

  confirmNewSeed() {
    this.newWalletSeed = '';
    this.newWalletMnemonicLines = [];

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
      const fileData = event.target['result'] as string;
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
