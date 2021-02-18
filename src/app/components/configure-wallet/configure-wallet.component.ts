import { Component, OnInit } from '@angular/core';
import {WalletService, NotificationService, RepresentativeService} from '../../services';
import {ActivatedRoute, Router} from '@angular/router';
import * as bip39 from 'bip39';
import {LedgerService, LedgerStatus} from '../../services/ledger.service';
import { QrModalService } from '../../services/qr-modal.service';
import {UtilService} from '../../services/util.service';
import { wallet } from 'nanocurrency-web';
import {TranslateService} from '@ngx-translate/core';

enum panels {
  'landing',
  'mnemonicTypeSelection',
  'import',
  'password',
  'backup',
  'final',
}

const INDEX_MAX = 4294967295; // seed index

@Component({
  selector: 'app-configure-wallet',
  templateUrl: './configure-wallet.component.html',
  styleUrls: ['./configure-wallet.component.css']
})
export class ConfigureWalletComponent implements OnInit {
  panels = panels;
  activePanel = panels.landing;
  wallet = this.walletService.wallet;
  isConfigured = this.walletService.isConfigured;
  isNewWallet = true;
  hasConfirmedBackup = false;
  importSeed = '';
  isExpanded = false;
  keyString = '';

  exampleSeed = '';
  examplePrivateKey = '';
  exampleExpandedPrivateKey = '';
  exampleMnemonicWords = [];
  showMoreImportOptions = false;

  newWalletSeed = '';
  newWalletMnemonic = '';
  newWalletMnemonicLines = [];
  newPassword = '';
  importSeedModel = '';
  importPrivateKeyModel = '';
  importExpandedKeyModel = '';
  importSeedMnemonicModel = '';
  importSeedBip39MnemonicModel = '';
  importSeedBip39MnemonicIndexModel = '0';
  importSeedBip39MnemonicPasswordModel = '';
  walletPasswordModel = '';
  walletPasswordConfirmModel = '';
  validIndex = true;
  indexMax = INDEX_MAX;

  selectedImportOption = 'seed';
  importOptions = [
    { name: 'Nano Seed', value: 'seed' },
    { name: 'Nano Mnemonic Phrase', value: 'mnemonic' },
    { name: 'BIP39 Mnemonic Phrase', value: 'bip39-mnemonic' },
    { name: 'Nault Wallet File', value: 'file' },
    { name: 'Ledger Nano S / Nano X', value: 'ledger' },
    { name: 'Private Key', value: 'privateKey' },
    { name: 'Expanded Private Key', value: 'expandedKey' },
  ];

  ledgerStatus = LedgerStatus;
  ledger = this.ledgerService.ledger;

  constructor(
    private router: ActivatedRoute,
    public walletService: WalletService,
    private notifications: NotificationService,
    private route: Router,
    private qrModalService: QrModalService,
    private ledgerService: LedgerService,
    private util: UtilService,
    private translate: TranslateService) {
    if (this.route.getCurrentNavigation().extras.state && this.route.getCurrentNavigation().extras.state.seed) {
      this.activePanel = panels.import;
      this.importSeedModel = this.route.getCurrentNavigation().extras.state.seed;
      this.isNewWallet = false;
    } else if (this.route.getCurrentNavigation().extras.state && this.route.getCurrentNavigation().extras.state.key) {
      this.activePanel = panels.import;
      this.importPrivateKeyModel = this.route.getCurrentNavigation().extras.state.key;
      this.selectedImportOption = 'privateKey';
      this.isNewWallet = false;
    }
  }

  async ngOnInit() {
    const exampleSeedBytes = this.util.account.generateSeedBytes();
    const exampleSeedFull = this.util.hex.fromUint8(exampleSeedBytes);

    let exampleSeedTrimmed = '';
    let trimIdx = 0;
    do {
      exampleSeedTrimmed = exampleSeedFull.slice(trimIdx, trimIdx + 6);
      trimIdx += 2;
    } while (
        (trimIdx < 30)
      && ( exampleSeedTrimmed.match(/^([0-9]+|[A-F]+)$/g) !== null )
    );

    // must have both letters and numbers
    this.exampleSeed = exampleSeedTrimmed + '...';

    // may have only letters or only numbers with enough luck
    this.examplePrivateKey = exampleSeedFull.slice(trimIdx + 6, trimIdx + 12) + '...';
    this.exampleExpandedPrivateKey = exampleSeedFull.slice(trimIdx + 12, trimIdx + 18) + '...';

    // array of mnemonic words
    this.exampleMnemonicWords = bip39.entropyToMnemonic(exampleSeedFull).split(' ');
  }

  async importExistingWallet() {
    this.notifications.sendInfo(`Starting to scan the first 20 accounts and importing them if they have been used...`, {length: 7000});
    this.route.navigate(['accounts']); // load accounts and watch them update in real-time
    await this.walletService.createWalletFromSeed(this.importSeed);
    this.importSeed = '';
    this.storePassword();

    this.notifications.sendSuccess(`Successfully imported wallet!`, {length: 10000});

    // this.repService.detectChangeableReps(); // this is now called from change-rep-widget.component when new wallet
    this.walletService.informNewWallet();
  }

  async importSingleKeyWallet() {
    this.walletService.createWalletFromSingleKey(this.keyString, this.isExpanded);
    this.storePassword();
    this.route.navigate(['accounts']); // load accounts and watch them update in real-time
    this.keyString = '';

    this.notifications.sendSuccess(`Successfully imported wallet from a private key!`);
    this.walletService.informNewWallet();
  }

  async connectLedgerByBluetooth() {
    this.ledgerService.enableBluetoothMode(true);
    await this.importLedgerWallet();
  }

  async connectLedgerByUsb() {
    this.ledgerService.enableBluetoothMode(false);
    await this.importLedgerWallet();
  }

  async importLedgerWallet(refreshOnly = false) {
     // If a wallet exists already, make sure they know they are overwriting it
     if (!refreshOnly && this.isConfigured()) {
      const confirmed = await this.confirmWalletOverwrite();
      if (!confirmed) {
        return;
      }
      this.walletService.resetWallet();
    }

    // Determine status of ledger device using ledger service
    this.notifications.sendInfo(`Checking for Ledger device...`, { identifier: 'ledger-status', length: 0 });
    await this.ledgerService.loadLedger(true);
    this.notifications.removeNotification('ledger-status');
    this.notifications.removeNotification('ledger-error');

    if (this.ledger.status === LedgerStatus.NOT_CONNECTED) {
      this.ledgerService.resetLedger();
      return this.notifications.sendWarning(`Failed to connect the Ledger device. Make sure the Nano app is running on the Ledger. If the error persists: Check the <a href="https://docs.nault.cc/2020/08/04/ledger-guide.html#troubleshooting" target="_blank" rel="noopener noreferrer">troubleshooting guide</a>`, { identifier: 'ledger-error', length: 0 });
    }

    if (this.ledger.status === LedgerStatus.LOCKED) {
      return this.notifications.sendWarning(`Unlock your Ledger device and open the Nano app to continue`);
    }

    if (this.ledger.status === LedgerStatus.READY) {
      this.notifications.sendSuccess(`Successfully connected to Ledger device`);
    }

    if (refreshOnly) {
      return;
    }

    // We skip the password panel
    this.route.navigate(['accounts']); // load accounts and watch them update in real-time

    // Create new ledger wallet
    const newWallet = await this.walletService.createLedgerWallet();
    this.notifications.sendSuccess(`Successfully loaded ledger device!`);

    this.walletService.informNewWallet();
  }

  // Send a confirmation dialog to the user if they already have a wallet configured
  async confirmWalletOverwrite() {
    if (!this.isConfigured()) return true;

    const UIkit = window['UIkit'];
    let msg;
    try {
      if (this.walletService.isLedgerWallet()) {
        msg = '<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span><span style="font-size: 18px;">You are about to configure a new wallet, which will <b>disconnect your Ledger device from Nault</b>.</span><br><br>If you need to use the Ledger wallet, simply import your device again.<br><br><b style="font-size: 18px;">Make sure you have saved the recovery phrase you got when initially setting up your Ledger device</b>.<br><br><span style="font-size: 18px;"><b>YOU WILL NOT BE ABLE TO RECOVER THE FUNDS</b><br>if you lose both the recovery phrase and access to your Ledger device.</span></p><br>';
      } else {
        msg = '<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span><span style="font-size: 18px;">You are about to configure a new wallet, which will <b>replace your currently configured wallet</b>.</span><br><br><b style="font-size: 18px;">Before continuing, make sure you have saved the Nano seed and/or mnemonic of your current wallet</b>.<br><br><span style="font-size: 18px;"><b>YOU WILL NOT BE ABLE TO RECOVER THE FUNDS</b><br>without a backup of your currently configured wallet.</span></p><br>';
      }
      await UIkit.modal.confirm(msg);
      return true;
    } catch (err) {
      if (!this.walletService.isLedgerWallet()) {
        this.notifications.sendInfo(`You can use the 'Manage Wallet' page to backup your Nano seed and/or mnemonic`);
      }
      return false;
    }
  }

  async setPasswordInit() {
    // if importing from existing, the format check must be done prior the password page
    if (!this.isNewWallet) {
      if (this.selectedImportOption === 'mnemonic' || this.selectedImportOption === 'seed') {
        if (this.selectedImportOption === 'seed') {
          const existingSeed = this.importSeedModel.trim();
          if (existingSeed.length !== 64 || !this.util.nano.isValidSeed(existingSeed)) return this.notifications.sendError(`Seed is invalid, double check it!`);
          this.importSeed = existingSeed;
        } else if (this.selectedImportOption === 'mnemonic') {
          // Clean the value by trimming it and removing newlines
          const mnemonic = this.importSeedMnemonicModel.toLowerCase().trim().replace(/\n/g, ``);

          const words = mnemonic.split(' ');
          if (words.length < 20) return this.notifications.sendError(`Mnemonic is too short, double check it!`);

          // Try and decode the mnemonic
          try {
            const newSeed = bip39.mnemonicToEntropy(mnemonic);
            if (!newSeed || newSeed.length !== 64 || !this.util.nano.isValidSeed(newSeed)) return this.notifications.sendError(`Mnemonic is invalid, double check it!`);
            this.importSeed = newSeed.toUpperCase(); // Force uppercase, for consistency
          } catch (err) {
            return this.notifications.sendError(`Unable to decode mnemonic, double check it!`);
          }
        } else {
          return this.notifications.sendError(`Invalid import option`);
        }
      } else if (this.selectedImportOption === 'privateKey' || this.selectedImportOption === 'expandedKey') {
        if (this.selectedImportOption === 'privateKey') {
          this.isExpanded = false;
        } else if (this.selectedImportOption === 'expandedKey') {
          this.isExpanded = true;
        } else {
          return this.notifications.sendError(`Invalid import option`);
        }

        this.keyString = this.isExpanded ? this.importExpandedKeyModel : this.importPrivateKeyModel;
        this.keyString = this.keyString.trim();
        if (this.isExpanded && this.keyString.length === 128) {
          // includes deterministic R value material which we ignore
          this.keyString = this.keyString.substring(0, 64);
          if (!this.util.nano.isValidSeed(this.keyString)) {
            return this.notifications.sendError(`Private key is invalid, double check it!`);
          }
        } else if (this.keyString.length !== 64 || !this.util.nano.isValidSeed(this.keyString)) {
          return this.notifications.sendError(`Private key is invalid, double check it!`);
        }
      } else if (this.selectedImportOption === 'bip39-mnemonic') {
        // If bip39, import wallet as a single private key
        if (!bip39.validateMnemonic(this.importSeedBip39MnemonicModel)) {
          return this.notifications.sendError(`Mnemonic is invalid, double check it!`);
        }
        if (!this.validIndex) {
          return this.notifications.sendError(`The account index is invalid, double check it!`);
        }

        // convert mnemonic to bip39 seed
        const bip39Seed = this.importSeedBip39MnemonicPasswordModel !== '' ?
        this.util.string.mnemonicToSeedSync(this.importSeedBip39MnemonicModel, this.importSeedBip39MnemonicPasswordModel).toString('hex') :
        this.util.string.mnemonicToSeedSync(this.importSeedBip39MnemonicModel).toString('hex');

        // derive private key from bip39 seed using the account index provided
        const accounts = wallet.accounts(bip39Seed, Number(this.importSeedBip39MnemonicIndexModel),
        Number(this.importSeedBip39MnemonicIndexModel));
        this.keyString = accounts[0].privateKey;
        this.isExpanded = false;
      }
    }

    // If a wallet already exists, confirm that the seed is saved
    const confirmed = await this.confirmWalletOverwrite();
    if (!confirmed) return;
    this.activePanel = panels.password;
  }

  async createNewWallet() {
    const seedBytes = this.util.account.generateSeedBytes();
    this.newWalletSeed = this.util.hex.fromUint8(seedBytes);
    this.newWalletMnemonic = bip39.entropyToMnemonic(this.newWalletSeed);

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

    this.activePanel = panels.backup;
  }

  confirmNewSeed() {
    if (!this.hasConfirmedBackup) {
      return this.notifications.sendWarning(`Please confirm you have saved a wallet backup!`);
    }
    this.walletService.createNewWallet(this.newWalletSeed);
    this.storePassword();
    this.newWalletSeed = '';
    this.newWalletMnemonicLines = [];
    this.saveNewWallet();

    this.activePanel = panels.final;
  }

  saveWalletPassword() {
    if (this.walletPasswordConfirmModel !== this.walletPasswordModel) {
      return this.notifications.sendError(`Password confirmation does not match, try again!`);
    }
    if (this.walletPasswordModel.length < 6) {
      return this.notifications.sendWarning(`Password length must be at least 6`);
    }
    this.newPassword = this.walletPasswordModel;
    this.walletPasswordModel = '';
    this.walletPasswordConfirmModel = '';

    if (this.isNewWallet) {
      this.createNewWallet();
    } else if (this.selectedImportOption === 'mnemonic' || this.selectedImportOption === 'seed') {
      this.importExistingWallet();
    } else if (this.selectedImportOption === 'privateKey' || this.selectedImportOption === 'expandedKey'
    || this.selectedImportOption === 'bip39-mnemonic') {
      this.importSingleKeyWallet();
    }
  }

  storePassword() {
    this.walletService.wallet.password = this.newPassword;
    this.newPassword = '';
  }

  saveNewWallet() {
    this.walletService.saveWalletExport();
    this.walletService.informNewWallet();

    this.notifications.sendSuccess(this.translate.instant('configure-wallet.successfully-created-new-wallet-do-not-lose-the-seed-mnemonic'));
  }

  setPanel(panel) {
    this.activePanel = panel;
    if (panel === panels.landing) {
      this.isNewWallet = true;
    } else if (panel === panels.import) {
      this.isNewWallet = false;
    }
  }

  copied() {
    this.notifications.removeNotification('success-copied');
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`, { identifier: 'success-copied' });
  }

  importFromFile(files) {
    if (!files.length) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target['result'] as string;
      try {
        const importData = JSON.parse(fileData);
        if (!importData.seed || (!importData.hasOwnProperty('accountsIndex') && !importData.hasOwnProperty('indexes'))) {
          return this.notifications.sendError(`Bad import data `);
        }

        const walletEncrypted = btoa(JSON.stringify(importData));
        this.route.navigate(['import-wallet'], { fragment: walletEncrypted });
      } catch (err) {
        this.notifications.sendError(`Unable to parse import data, make sure you selected the right file!`);
      }
    };

    reader.readAsText(file);
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'seed1':
          this.importSeedModel = data.content;
          break;
        case 'mnemo1':
          this.importSeedMnemonicModel = data.content;
          break;
        case 'mnemo2':
          this.importSeedBip39MnemonicModel = data.content;
          break;
        case 'priv1':
          this.importPrivateKeyModel = data.content;
          break;
        case 'expanded1':
          this.importExpandedKeyModel = data.content;
          break;
      }
    }, () => {}
    );
  }

  accountIndexChange(index) {
    let invalid = false;
    if (this.util.string.isNumeric(index) && index % 1 === 0) {
      index = parseInt(index, 10);
      if (!this.util.nano.isValidIndex(index)) {
        invalid = true;
      }
      if (index > INDEX_MAX) {
        invalid = true;
      }
    } else {
      invalid = true;
    }
    this.validIndex = !invalid;
  }

}
