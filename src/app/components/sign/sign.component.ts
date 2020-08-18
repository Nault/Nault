import { Component, OnInit } from '@angular/core';
import BigNumber from 'bignumber.js';
import {AddressBookService} from '../../services/address-book.service';
import {BehaviorSubject} from 'rxjs';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {UtilService, StateBlock, TxType} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {ActivatedRoute} from '@angular/router';
import {NanoBlockService} from '../../services/nano-block.service';
import {ApiService} from '../../services/api.service';
import * as QRCode from 'qrcode';
import * as bip39 from 'bip39';
import * as bip39Wallet from 'nanocurrency-web';
import { QrModalService } from '../../services/qr-modal.service';

const INDEX_MAX = 4294967295;

@Component({
  selector: 'app-sign',
  templateUrl: './sign.component.html',
  styleUrls: ['./sign.component.css']
})

export class SignComponent implements OnInit {
  activePanel = 'error';
  shouldSign: boolean = null; // if a block has been scanned for signing (or if it is a block to process)
  accounts = this.walletService.wallet.accounts;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';
  amount = null;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccountID: any = '';
  fromAccountBalance: BigNumber = null;
  fromAddressBook = '';
  toAccountID = '';
  toAccountBalance: BigNumber = null;
  toAddressBook = '';
  toAccountStatus = null;
  currentBlock: StateBlock = null;
  previousBlock: StateBlock = null;
  txType: TxType = null;
  txTypes = TxType; // to access enum in html
  txTypeMessage = '';
  confirmingTransaction = false;
  shouldGenWork = false;
  signTypes: string[] = ['Internal Wallet or Ledger', 'Seed or Mnemonic+Index', 'Private Key'];
  signTypeSelected: string = this.signTypes[0];
  signatureAccount = '';
  signatureMessage = '';
  signatureMessageSuccess = '';
  walletAccount = null;
  nullBlock = '0000000000000000000000000000000000000000000000000000000000000000';
  qrString = null;
  qrCodeImage = null;
  qrCodeImageBlock = null;
  validSeed = false;
  validIndex = true;
  validPrivkey = false;
  sourceSecret = '';
  sourcePriv = '';
  index = '0';
  privateKey = null; // the final private key to sign with if using manual entry
  privateKeyExpanded = false; // if a private key is provided manually and it's expanded 128 char
  processedHash: string = null;
  finalSignature: string = null;
  // With v21 the 1x is the old 8x and max will be 8x due to the webgl threshold is max ffffffff00000000
  thresholds = [
    { name: '1x', value: 1 },
    { name: '2x', value: 2 },
    { name: '4x', value: 4 },
    { name: '8x', value: 8 }
  ];
  selectedThreshold = this.thresholds[0].value;
  selectedThresholdOld = this.selectedThreshold;

  constructor(
    private router: ActivatedRoute,
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nanoBlock: NanoBlockService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private api: ApiService,
    private util: UtilService,
    private qrModalService: QrModalService) { }

  async ngOnInit() {
    const params = this.router.snapshot.queryParams;
    console.log(params);
    this.signTypeSelected = this.walletService.isConfigured() ? this.signTypes[0] : this.signTypes[1];

    if ('sign' in params && 'n_account' in params && 'n_previous' in params && 'n_representative' in params &&
      'n_balance' in params && 'n_link' in params) {
      this.currentBlock = {'account': params.n_account, 'previous': params.n_previous, 'representative': params.n_representative,
      'balance': params.n_balance, 'link': params.n_link, signature: 'n_signature' in params ? params.n_signature : null,
      work: 'n_work' in params ? params.n_work : null};

      // previous block won't be included with open block (or maybe if another wallet implement this feature)
      if ('p_account' in params && 'p_previous' in params && 'p_representative' in params && 'p_balance' in params && 'p_link' in params) {
        this.previousBlock = {'account': params.p_account, 'previous': params.p_previous, 'representative': params.p_representative,
        'balance': params.p_balance, 'link': params.p_link, signature: 'p_signature' in params ? params.p_signature : null, work: null};
      }

      this.shouldSign = params.sign === '1' ? true : false;
      this.shouldGenWork = this.currentBlock.work === null && !this.shouldSign;

      // check if both new block and previous block hashes matches (balances has not been tampered with) and have valid parameters
      if (this.previousBlock && this.verifyBlock(this.currentBlock) && this.verifyBlock(this.previousBlock)) {
        // it's a send block
        if (new BigNumber(this.previousBlock.balance).gt(new BigNumber(this.currentBlock.balance))) {
          this.txType = TxType.send;
          this.txTypeMessage = 'send';
          this.rawAmount = new BigNumber(this.previousBlock.balance).minus(new BigNumber(this.currentBlock.balance));
          this.fromAccountID = this.currentBlock.account;
          this.toAccountID = this.util.account.getPublicAccountID(this.util.hex.toUint8(this.currentBlock.link));
          this.fromAccountBalance = new BigNumber(this.previousBlock.balance);
          // sending to itself
          if (this.fromAccountID === this.toAccountID) {
            this.toAccountBalance = this.fromAccountBalance;
          }
        } else if (new BigNumber(this.previousBlock.balance).eq(new BigNumber(this.currentBlock.balance)) &&
            this.previousBlock.representative !== this.currentBlock.representative && this.currentBlock.link === this.nullBlock) {
          // it's a change block
          this.txType = TxType.change;
          this.txTypeMessage = 'change representative to';
          this.rawAmount = new BigNumber(0);
          this.fromAccountID = this.currentBlock.account;
          this.toAccountID = this.currentBlock.account;
          this.fromAccountBalance = new BigNumber(this.currentBlock.balance);
          this.toAccountBalance = new BigNumber(this.currentBlock.balance);
        } else if (new BigNumber(this.previousBlock.balance).lt(
            new BigNumber(this.currentBlock.balance)) && this.currentBlock.previous !== this.nullBlock) {
          // it's a receive block
          this.txType = TxType.receive;
          this.txTypeMessage = 'receive';
          this.rawAmount = new BigNumber(this.currentBlock.balance).minus(new BigNumber(this.previousBlock.balance));

          // get from-account info if online
          let recipientInfo = null;
          try {
            recipientInfo = await this.api.blockInfo(this.currentBlock.link);
          } catch {}
          if (recipientInfo && 'block_account' in recipientInfo) {
            this.fromAccountID = recipientInfo.block_account;
          } else {
            this.fromAccountID = null;
          }

          this.toAccountID = this.currentBlock.account;
          this.toAccountBalance = new BigNumber(this.previousBlock.balance);
        } else {
          return this.notificationService.sendError(`Meaningless block. The balance and representative are unchanged!`, {length: 0});
        }

        this.amount = this.util.nano.rawToMnano(this.rawAmount).toString(10);
        this.prepareTransaction();
      } else if (!this.previousBlock && this.verifyBlock(this.currentBlock)) {
        // No previous block present (open block)
        // TODO: Make all block subtypes also possible to sign even if previous block is missing, but with less displayed data
        if (this.currentBlock.previous === this.nullBlock) {
          this.txType = TxType.open;
          this.txTypeMessage = 'receive';
          this.rawAmount = new BigNumber(this.currentBlock.balance);

          // get from-account info if online
          let recipientInfo = null;
          try {
            recipientInfo = await this.api.blockInfo(this.currentBlock.link);
          } catch {}

          if (recipientInfo && 'block_account' in recipientInfo) {
            this.fromAccountID = recipientInfo.block_account;
          } else {
            this.fromAccountID = null;
          }

          this.toAccountID = this.currentBlock.account;
          this.toAccountBalance = new BigNumber(0);
        } else {
          return this.notificationService.sendError(`Only OPEN block is currently supported when previous block is missing`, {length: 0});
        }

        this.amount = this.util.nano.rawToMnano(this.rawAmount).toString(10);
        this.prepareTransaction();
      } else {
        return;
      }
    } else {
      this.notificationService.sendError(`Incorrect parameters provided for signing!`, {length: 0});
      return;
    }

    this.addressBookService.loadAddressBook();
  }

  verifyBlock(block: StateBlock) {
    if (this.util.account.isValidAccount(block.account) &&
      this.util.account.isValidAccount(block.representative) &&
      this.util.account.isValidAmount(block.balance) &&
      this.util.nano.isValidHash(block.previous) &&
      this.util.nano.isValidHash(block.link)) {
      return true;
    } else {
      this.notificationService.sendError(`The provided blocks contain invalid values!`, {length: 0});
      return false;
    }
  }

  verifyBlockHash(currentBlock: StateBlock, previousBlock: StateBlock) {
    const block: StateBlock = {account: previousBlock.account, link: previousBlock.link, previous: previousBlock.previous,
      representative: previousBlock.representative, balance: previousBlock.balance, signature: null, work: null};
    const previousHash = this.util.hex.fromUint8(this.util.nano.hashStateBlock(block));
    if (!currentBlock.previous || previousHash !== currentBlock.previous) {
      this.notificationService.sendError(`The hash of the previous block does not match the frontier in the new block!`, {length: 0});
    }
    return currentBlock.previous && previousHash === currentBlock.previous;
  }

  searchAddressBook() {
    this.showAddressBook = true;
    const search = this.toAccountID || '';
    const addressBook = this.addressBookService.addressBook;

    const matches = addressBook
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.addressBookResults$.next(matches);
  }

  signTypeChange() {
    this.signatureMessage = '';
    this.signatureMessageSuccess = '';

    switch (this.signTypeSelected) {
      // wallet
      case this.signTypes[0]:
        this.walletAccount = this.accounts.find(a => a.id.replace('xrb_', 'nano_') === this.signatureAccount);
        if (!this.walletAccount) {
          return this.signatureMessage = 'Could not find a matching wallet account to sign with. Make sure it\'s added under your accounts';
        } else {
          this.signatureMessageSuccess = 'A matching account found!';
        }
        break;

      case this.signTypes[1]:
        this.seedChange(this.sourceSecret);
        break;

      case this.signTypes[2]:
        this.privkeyChange(this.sourcePriv);
        break;
    }
  }

  powChange() {
    if (this.shouldGenWork) {
      this.prepareWork();
    }
  }

  changeThreshold() {
    // multiplier has changed, clear the cache and recalculate
    if (this.selectedThreshold !== this.selectedThresholdOld) {
      const workBlock = this.txType === TxType.open ? this.util.account.getAccountPublicKey(this.toAccountID) : this.currentBlock.previous;
      this.workPool.removeFromCache(workBlock);
      console.log('PoW multiplier changed: Clearing cache');
      this.powChange();
    }
  }

  prepareWork() {
    // The block has been verified
    if (this.toAccountID) {
      console.log('Precomputing work...');
      const workBlock = this.txType === TxType.open ? this.util.account.getAccountPublicKey(this.toAccountID) : this.currentBlock.previous;
      this.workPool.addWorkToCache(workBlock, this.selectedThreshold);
    }
  }

  async prepareTransaction() {
    this.fromAddressBook = this.addressBookService.getAccountName(this.fromAccountID);
    this.toAddressBook = this.addressBookService.getAccountName(this.toAccountID);

    this.activePanel = 'confirm';
    // Start precopmuting the work...
    if (this.shouldGenWork) {
      this.prepareWork();
    }

    if (this.txType === TxType.send || this.txType === TxType.change) {
      this.signatureAccount = this.fromAccountID.replace('xrb_', 'nano_').toLowerCase();
    } else if (this.txType === TxType.receive || this.txType === TxType.open) {
      this.signatureAccount = this.toAccountID.replace('xrb_', 'nano_').toLowerCase();
    }

    if (this.shouldSign) {
      this.signTypeChange();
    }
  }

  // Create signature for the block
  async confirmTransaction() {
    let walletAccount = this.walletAccount;
    let isLedger = this.walletService.isLedgerWallet();

    // using internal wallet
    if (this.signTypeSelected === this.signTypes[0] && walletAccount) {
      if (this.walletService.walletIsLocked()) {
        return this.notificationService.sendWarning('Wallet must be unlocked for signing with it');
      }
    } else if (this.signTypeSelected === this.signTypes[0]) {
      return this.notificationService.sendWarning('Could not find a matching wallet account to sign with. Make sure it\'s added under your accounts');
    }

    // using seed or private key
    if (((this.signTypeSelected === this.signTypes[1] && !this.validSeed) || (this.signTypeSelected === this.signTypes[2])
      && !this.validPrivkey)) {
        return this.notificationService.sendWarning('Could not find a matching private key to sign with.');
      }
    if (this.signTypeSelected === this.signTypes[1] || this.signTypeSelected === this.signTypes[2]) {
      isLedger = false;
      // create dummy wallet that only contains needed elements for signature
      walletAccount = {keyPair: {secretKey: this.util.hex.toUint8(this.privateKey), expanded: this.privateKeyExpanded}};
    }

    this.confirmingTransaction = true;

    // sign the block
    const block = await this.nanoBlock.signOfflineBlock(walletAccount, this.currentBlock,
      this.previousBlock, this.txType, this.shouldGenWork, this.selectedThreshold, isLedger);
    console.log('Signature: ' + block.signature || 'Error');
    console.log('Work: ' + block.work || 'Not applied');

    if (!block.signature) {
      this.confirmingTransaction = false;
      return this.notificationService.sendError('The block could not be signed!', {lenth: 0});
    }

    this.qrString = null;
    this.qrCodeImageBlock = null;
    this.finalSignature = null;

    const UIkit = window['UIkit'];
    const modal = UIkit.modal('#signed-modal');
    modal.show();

    this.finalSignature = block.signature;

    try {
      this.clean(block);
      if (this.previousBlock) {
        this.clean(this.previousBlock);
      }
      if (this.previousBlock) {
        this.qrString = 'nanoprocess:{"block":' + JSON.stringify(block) +
        ',"previous":' + JSON.stringify(this.previousBlock) + '}';
      } else {
        this.qrString = 'nanoprocess:{"block":' + JSON.stringify(block) + '}';
      }

      const qrCode = await QRCode.toDataURL(this.qrString, { errorCorrectionLevel: 'L', scale: 16 });
      this.qrCodeImageBlock = qrCode;
    } catch (error) {
      this.confirmingTransaction = false;
      console.log(error);
      return this.notificationService.sendError('The block could not be signed!', {lenth: 0});
    }

    this.confirmingTransaction = false;
    this.notificationService.sendSuccess('The block has been signed and can be sent to the network!');
  }

  // Send signed block to the network
  async confirmBlock() {
    this.confirmingTransaction = true;
    const workBlock = this.txType === TxType.open ? this.util.account.getAccountPublicKey(this.toAccountID) : this.currentBlock.previous;
    if (this.shouldGenWork) {
      // For open blocks which don't have a frontier, use the public key of the account
      if (!this.workPool.workExists(workBlock)) {
        this.notificationService.sendInfo(`Generating Proof of Work...`);
      }

      this.currentBlock.work = await this.workPool.getWork(workBlock);
      this.workPool.removeFromCache(workBlock);
    }

    // Validate that frontier is still the same and the previous balance is correct
    if (this.txType !== TxType.open) {
      const accountInfo = await this.api.accountInfo(this.signatureAccount);
      if ('frontier' in accountInfo && accountInfo.frontier !== this.currentBlock.previous) {
        this.confirmingTransaction = false;
        return this.notificationService.sendError('The block can\'t be processed because the account frontier has changed!', {lenth: 0});
      }
      if ('balance' in accountInfo && accountInfo.balance !== this.previousBlock.balance) {
        this.confirmingTransaction = false;
        return this.notificationService.sendError('The block can\'t be processed because the current account balance does not match the previous block!', {lenth: 0});
      }
    }

    if (!this.currentBlock.signature) {
      this.confirmingTransaction = false;
      return this.notificationService.sendError('The block can\'t be processed because the signature is missing!', {lenth: 0});
    }

    if (!this.currentBlock.work) {
      this.confirmingTransaction = false;
      return this.notificationService.sendError('The block can\'t be processed because work is missing!', {lenth: 0});
    }

    // Process block
    const blockData: any = this.currentBlock;
    blockData.type = 'state';
    const processResponse = await this.api.process(blockData, this.txType);
    if (processResponse && processResponse.hash) {
      // Add new hash into the work pool but does not make much sense for this case
      // this.workPool.addWorkToCache(processResponse.hash);
      this.workPool.removeFromCache(workBlock);
      this.processedHash = processResponse.hash;
      this.notificationService.sendSuccess('Successfully processed the block!');
    } else {
      console.log(processResponse);
      this.notificationService.sendError('There was an error while processing the block! Please see the console.', {lenth: 0});
    }
    this.confirmingTransaction = false;
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

  clean(obj) {
    for (const propName in obj) {
      if (obj[propName] === null || obj[propName] === undefined) {
        delete obj[propName];
      }
    }
  }

  seedChange(input) {
    const keyType = this.checkMasterKey(input);
    this.validSeed = keyType !== null;
    if (this.validSeed && this.validIndex) {
      this.verifyKey(keyType, input, Number(this.index));
    } else {
      this.signatureMessage = '';
      this.signatureMessageSuccess = '';
    }
  }

  privkeyChange(input) {
    const privKey = this.convertPrivateKey(input);
    if (privKey !== null) {
      // Match given block account with with private key
      const pubKey = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey), this.privateKeyExpanded).publicKey;
      const address = this.util.account.getPublicAccountID(pubKey);
      if (address === this.signatureAccount ) {
        this.validPrivkey = true;
        this.privateKey = privKey;
        this.signatureMessage = '';
        this.signatureMessageSuccess = 'The private key match the account!';
        return;
      } else {
        this.signatureMessage = 'The account for this private key does not match!';
      }
    } else {
      this.signatureMessage = '';
    }
    this.signatureMessageSuccess = '';
    this.validPrivkey = false;
    this.privateKey = '';
  }

  indexChange(index) {
    this.validIndex = true;
    if (this.util.string.isNumeric(index) && index % 1 === 0) {
      index = parseInt(index, 10);
      if (!this.util.nano.isValidIndex(index)) {
        this.validIndex = false;
      }
      if (index > INDEX_MAX) {
        this.validIndex = false;
      }
    } else {
      this.validIndex = false;
    }

    if (this.validSeed && this.validIndex) {
      const keyType = this.checkMasterKey(this.sourceSecret);
      this.verifyKey(keyType, this.sourceSecret, Number(this.index));
    } else {
      this.signatureMessage = '';
      this.signatureMessageSuccess = '';
    }
  }

  verifyKey(keyType: string, input: string, index: number) {
    let seed = '';
    let privKey1 = '';
    let privKey2 = '';

    // input is mnemonic
    if (keyType === 'mnemonic') {
      seed = bip39.mnemonicToEntropy(input).toUpperCase();
      // seed must be 64 or the nano wallet can't be created.
      // This is the reason 12-words can't be used because the seed would be 32 in length
      if (seed.length !== 64) {
        this.notificationService.sendError(`Mnemonic not 24 words`);
        return;
      }
    }

    // nano seed
    if (keyType === 'nano_seed' || seed !== '' || keyType === 'bip39_seed') {
      if (seed === '') { // seed from input, no mnemonic
        seed = input;
      }
      // start with blake2b derivation
      if (keyType !== 'bip39_seed') {
          privKey1 = this.util.hex.fromUint8(this.util.account.generateAccountSecretKeyBytes(this.util.hex.toUint8(seed), index));
      }
      // also check using bip39/44 derivation
      let bip39Seed;
      // take 128 char bip39 seed directly from input or convert it from a 64 char nano seed (entropy)
      if (keyType === 'bip39_seed') {
        bip39Seed = input;
      } else {
        bip39Seed = bip39Wallet.wallet.generate(seed).seed;
      }
      privKey2 = bip39Wallet.wallet.accounts(bip39Seed, index, index)[0].privateKey;
    }

    // Match given block account with any of the private keys extracted
    const pubKey1 = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey1), this.privateKeyExpanded).publicKey;
    const pubKey2 = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey2), this.privateKeyExpanded).publicKey;
    const address1 = this.util.account.getPublicAccountID(pubKey1);
    const address2 = this.util.account.getPublicAccountID(pubKey2);

    if (address1 === this.signatureAccount || address2 === this.signatureAccount ) {
      if (address1 === this.signatureAccount) {
        this.privateKey = privKey1;
      } else {
        this.privateKey = privKey2;
      }
      this.signatureMessage = '';
      this.signatureMessageSuccess = 'A matching private key found!';
    } else {
      this.signatureMessage = 'Could not find a matching private key!';
      this.signatureMessageSuccess = '';
    }
  }

  // Validate type of master key
  checkMasterKey(key) {
    // validate nano seed
    if (key.length === 64) {
      if (this.util.nano.isValidSeed(key)) {
        return 'nano_seed';
      }
    }
    // validate bip39 seed
    if (key.length === 128) {
      if (this.util.hex.isHex(key)) {
        return 'bip39_seed';
      }
    }
    // validate mnemonic
    if (bip39.validateMnemonic(key)) {
      return 'mnemonic';
    }
    return null;
  }

  convertPrivateKey(key) {
    if (key.length === 128) {
      this.privateKeyExpanded = true;
      // expanded key includes deterministic R value material which we ignore
      return key.substring(0, 64);
    } else if (key.length === 64) {
      return key;
    } else {
      return null;
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'seed1':
          this.sourceSecret = data.content;
          this.seedChange(data.content);
          break;
        case 'priv1':
          this.sourcePriv = data.content;
          this.privkeyChange(data.content);
          break;
      }
    }, () => {}
    );
  }
}
