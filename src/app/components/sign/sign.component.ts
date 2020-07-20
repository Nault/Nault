import { Component, OnInit } from '@angular/core';
import BigNumber from "bignumber.js";
import {AddressBookService} from "../../services/address-book.service";
import {BehaviorSubject} from "rxjs";
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {UtilService} from "../../services/util.service";
import {WorkPoolService} from "../../services/work-pool.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {ActivatedRoute} from "@angular/router";
import {NanoBlockService, StateBlock, TxType} from "../../services/nano-block.service";
import * as QRCode from 'qrcode';
import * as bip39 from 'bip39'
import * as bip39Wallet from 'nanocurrency-web'

const INDEX_MAX = 4294967295;

@Component({
  selector: 'app-sign',
  templateUrl: './sign.component.html',
  styleUrls: ['./sign.component.css']
})

export class SignComponent implements OnInit {
  activePanel = 'error';

  accounts = this.walletService.wallet.accounts;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';
  amount = null;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccountID: any = '';
  fromAccountBalance: BigNumber = null
  fromAddressBook = '';
  toAccountID: string = '';
  toAccountBalance: BigNumber = null
  toAddressBook = '';
  toAccountStatus = null;
  currentBlock: StateBlock = null;
  previousBlock: StateBlock = null;
  txType: TxType = null;
  txTypes = TxType; //to access enum in html
  txTypeMessage:string = '';
  confirmingTransaction = false;
  shouldGenWork = false;
  signTypes: string[] = ['Internal Wallet or Ledger', 'Seed or Mnemonic+Index', 'Private Key'];
  signTypeSelected: string = this.signTypes[0];
  signatureAccount: string = '';
  signatureMessage: string = '';
  signatureMessageSuccess: string = '';
  walletAccount = null;
  nullBlock = '0000000000000000000000000000000000000000000000000000000000000000';
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

  constructor(
    private router: ActivatedRoute,
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nanoBlock: NanoBlockService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private util: UtilService) { }

  async ngOnInit() {
    const params = this.router.snapshot.queryParams;
    console.log(params);
    
    if ('n_account' in params && 'n_previous' in params && 'n_representative' in params && 'n_balance' in params && 'n_link' in params &&
    'p_account' in params && 'p_previous' in params && 'p_representative' in params && 'p_balance' in params && 'p_link' in params) {
      this.currentBlock = {'account': params.n_account, 'previous': params.n_previous, 'representative': params.n_representative, 'balance': params.n_balance, 'link': params.n_link, signature: null, work: null};
      this.previousBlock = {'account': params.p_account, 'previous': params.p_previous, 'representative': params.p_representative, 'balance': params.p_balance, 'link': params.p_link, signature: null, work: null};

      // check if both new block and previous block hashes matches (balances has not been tampered with) and have valid parameters
      if (this.verifyBlocks(this.currentBlock, this.previousBlock)) {
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
        }
        // it's a change block
        else if (new BigNumber(this.previousBlock.balance).eq(new BigNumber(this.currentBlock.balance)) && this.previousBlock.representative != this.currentBlock.representative && this.currentBlock.link === this.nullBlock) {
          this.txType = TxType.change;
          this.txTypeMessage = 'change representative to';
          this.rawAmount = new BigNumber(0);
          this.fromAccountID = this.currentBlock.account;
          this.toAccountID = this.currentBlock.account;
          this.fromAccountBalance = new BigNumber(this.currentBlock.balance);
          this.toAccountBalance = new BigNumber(this.currentBlock.balance);
        }
        // it's an open block
        else if (new BigNumber(this.previousBlock.balance).lt(new BigNumber(this.currentBlock.balance)) && this.currentBlock.previous === this.nullBlock) {
          this.txType = TxType.open;
          this.txTypeMessage = 'receive';
          this.rawAmount = new BigNumber(this.currentBlock.balance).minus(new BigNumber(this.previousBlock.balance));
          this.fromAccountID = this.util.account.getPublicAccountID(this.util.hex.toUint8(this.currentBlock.link));
          this.toAccountID = this.currentBlock.account;
          this.toAccountBalance = new BigNumber(this.previousBlock.balance);
            // sending to itself
          if (this.fromAccountID === this.toAccountID) {
            this.fromAccountBalance = this.toAccountBalance;
          }
        }
        // it's a receive block
        else if (new BigNumber(this.previousBlock.balance).lt(new BigNumber(this.currentBlock.balance)) && this.currentBlock.previous !== this.nullBlock) {
          this.txType = TxType.receive;
          this.txTypeMessage = 'receive';
          this.rawAmount = new BigNumber(this.currentBlock.balance).minus(new BigNumber(this.previousBlock.balance));
          this.fromAccountID = this.util.account.getPublicAccountID(this.util.hex.toUint8(this.currentBlock.link));
          this.toAccountID = this.currentBlock.account;
          this.toAccountBalance = new BigNumber(this.previousBlock.balance);
            // sending to itself
          if (this.fromAccountID === this.toAccountID) {
            this.fromAccountBalance = this.toAccountBalance;
          }
        }
        else {
          return this.notificationService.sendError(`Meaningless block. The balance and representative are unchanged!`, {length: 0})
        }
        this.amount = this.util.nano.rawToMnano(this.rawAmount).toString(10);
        this.prepareTransaction()
      }
      else {
        return
      }
    }
    else {
      this.notificationService.sendError(`Incorrect parameters provided for signing!`, {length: 0})
      return
    }

    this.addressBookService.loadAddressBook();
    this.signTypeSelected = this.signTypes[0];
  }

  verifyBlocks(currentBlock:StateBlock, previousBlock:StateBlock) {
    var previousHash = null;
    if (this.util.account.isValidAccount(currentBlock.account) &&
      this.util.account.isValidAccount(previousBlock.account) &&
      this.util.account.isValidAccount(currentBlock.representative) &&
      this.util.account.isValidAccount(previousBlock.representative) &&
      this.util.account.isValidAmount(currentBlock.balance) &&
      this.util.account.isValidAmount(previousBlock.balance) &&
      this.util.nano.isValidHash(currentBlock.previous) &&
      this.util.nano.isValidHash(previousBlock.previous) &&
      this.util.nano.isValidHash(currentBlock.link) &&
      this.util.nano.isValidHash(previousBlock.link))
    {
      let block:StateBlock = {account:previousBlock.account, link:previousBlock.link, previous:previousBlock.previous, representative: previousBlock.representative, balance: previousBlock.balance, signature: null, work: null};
      previousHash = this.util.hex.fromUint8(this.util.nano.hashStateBlock(block));
      if (!currentBlock.previous || previousHash !== currentBlock.previous) {
        this.notificationService.sendError(`The hash of the previous block does not match the frontier in the new block!`, {length: 0})
      }
    }
    else {
      this.notificationService.sendError(`The provided blocks contain invalid values!`, {length: 0})
    }
    return currentBlock.previous && previousHash === currentBlock.previous 
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
        this.walletAccount = this.accounts.find(a => a.id == this.signatureAccount);
        if (!this.walletAccount) return this.signatureMessage = 'Could not find a matching wallet account to sign with. Make sure it\'s added under your accounts';
        else this.signatureMessageSuccess = 'A matching account found!';
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
    if (this.shouldGenWork) this.prepareWork();
  }

  prepareWork() {
    // The block has been verified
    if (this.toAccountID) {
      console.log('Precomputing work...')
      let workBlock = this.txType === TxType.open ? this.util.account.getAccountPublicKey(this.toAccountID) : this.currentBlock.previous;
      this.workPool.addWorkToCache(workBlock);
    }
  }

  async prepareTransaction() {
    this.fromAddressBook = this.addressBookService.getAccountName(this.fromAccountID);
    this.toAddressBook = this.addressBookService.getAccountName(this.toAccountID);

    this.activePanel = 'confirm';
    // Start precopmuting the work...
    if (this.shouldGenWork) {
      this.prepareWork()
    }

    if (this.txType === TxType.send) {
      this.signatureAccount = this.fromAccountID;
    }
    else if (this.txType === TxType.receive) {
      this.signatureAccount = this.toAccountID;
    }

    this.signTypeChange();
  }

  async confirmTransaction() {
    var walletAccount = this.walletAccount;
    var isLedger = this.walletService.isLedgerWallet();

    // using internal wallet
    if (this.signTypeSelected === this.signTypes[0] && walletAccount) {
      if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning('Wallet must be unlocked for signing with it');
    }
    else if (this.signTypeSelected === this.signTypes[0]) {
      return this.notificationService.sendWarning('Could not find a matching wallet account to sign with. Make sure it\'s added under your accounts');
    }

    // using seed or private key
    if (((this.signTypeSelected === this.signTypes[1] && !this.validSeed) || (this.signTypeSelected === this.signTypes[2]) && !this.validPrivkey)) return this.notificationService.sendWarning('Could not find a matching private key to sign with.');
    if (this.signTypeSelected === this.signTypes[1] || this.signTypeSelected === this.signTypes[2]) {
      isLedger = false;
      // create dummy wallet that only contains needed elements for signature
      walletAccount = {keyPair:{secretKey:this.util.hex.toUint8(this.privateKey), expanded:this.privateKeyExpanded}}
    }

    this.confirmingTransaction = true;

    // sign the block
    const block = await this.nanoBlock.signOfflineBlock(walletAccount, this.currentBlock, this.txType, this.shouldGenWork, isLedger);
    console.log('Signature: ' + block.signature || 'Error')
    console.log('Work: ' + block.work || 'Not applied')

    if (!block.signature) return this.notificationService.sendError('The block could not be signed!',{lenth: 0});
    let qrString = 'nanoblock:{"block":' + JSON.stringify(block) + '}'
    const qrCode = await QRCode.toDataURL(qrString, { errorCorrectionLevel: 'M', scale: 8 });
    this.qrCodeImageBlock = qrCode;
    this.confirmingTransaction = false;
    this.notificationService.sendSuccess('The block has been signed and can be sent to the network!');
  }

  copied() {
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`);
  }

  seedChange(input) {
    let keyType = this.checkMasterKey(input);
    this.validSeed = keyType !== null;
    if (this.validSeed && this.validIndex) {
      this.verifyKey(keyType, input, Number(this.index));
    }
    else {
      this.signatureMessage = ''
      this.signatureMessageSuccess = ''
    }
  }

  privkeyChange(input) {
    let privKey = this.convertPrivateKey(input);
    if (privKey !== null) {
      // Match given block account with with private key
      const pubKey = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey), this.privateKeyExpanded).publicKey;
      const address = this.util.account.getPublicAccountID(pubKey);
      if (address === this.signatureAccount ) {
        this.validPrivkey = true;
        this.privateKey = privKey;
        this.signatureMessage = ''
        this.signatureMessageSuccess = 'The private key match the account!'
        return
      }
      else {
        this.signatureMessage = 'The account for this private key does not match!'
      }
    }
    else {
      this.signatureMessage = ''
    }
    this.signatureMessageSuccess = ''
    this.validPrivkey = false;
    this.privateKey = '';
  }

  indexChange(index) {
    this.validIndex = true
    if (this.util.string.isNumeric(index) && index % 1 === 0) {
      index = parseInt(index)
      if (!this.util.nano.isValidIndex(index)) {
        this.validIndex = false
      }
      if (index > INDEX_MAX) {
        this.validIndex = false
      }
    }
    else {
      this.validIndex = false
    }

    if (this.validSeed && this.validIndex) {
      let keyType = this.checkMasterKey(this.sourceSecret);
      this.verifyKey(keyType, this.sourceSecret, Number(this.index));
    }
    else {
      this.signatureMessage = ''
      this.signatureMessageSuccess = ''
    }
  }

  verifyKey(keyType:string, input:string, index: number) {
    var seed = ''
    var privKey1 = ''
    var privKey2 = ''

    // input is mnemonic
    if (keyType === 'mnemonic') {
      seed = bip39.mnemonicToEntropy(input).toUpperCase()
      // seed must be 64 or the nano wallet can't be created. This is the reason 12-words can't be used because the seed would be 32 in length
      if (seed.length !== 64) {
        this.notificationService.sendError(`Mnemonic not 24 words`);
        return
      }
    }

    // nano seed
    if (keyType === 'nano_seed' || seed !== '' || keyType === 'bip39_seed') {
      if (seed === '') { // seed from input, no mnemonic
        seed = input
      }
      // start with blake2b derivation
      if (keyType !== 'bip39_seed') {
          privKey1 = this.util.hex.fromUint8(this.util.account.generateAccountSecretKeyBytes(this.util.hex.toUint8(seed),index))
      }
      // also check using bip39/44 derivation
      var bip39Seed
      // take 128 char bip39 seed directly from input or convert it from a 64 char nano seed (entropy)
      if (keyType === 'bip39_seed') {
        bip39Seed = input
      }
      else {
        bip39Seed = bip39Wallet.wallet.generate(seed).seed
      }
      privKey2 = bip39Wallet.wallet.accounts(bip39Seed, index, index)[0].privateKey
    }

    // Match given block account with any of the private keys extracted
    const pubKey1 = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey1), this.privateKeyExpanded).publicKey;
    const pubKey2 = this.util.account.generateAccountKeyPair(this.util.hex.toUint8(privKey2), this.privateKeyExpanded).publicKey;
    const address1 = this.util.account.getPublicAccountID(pubKey1);
    const address2 = this.util.account.getPublicAccountID(pubKey2);

    if (address1 === this.signatureAccount || address2 === this.signatureAccount ) {
      if (address1 === this.signatureAccount) this.privateKey = privKey1
      else this.privateKey = privKey2
      this.signatureMessage = ''
      this.signatureMessageSuccess = 'A matching private key found!'
    }
    else {
      this.signatureMessage = 'Could not find a matching private key!'
      this.signatureMessageSuccess = ''
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
    return null
  }

  convertPrivateKey(key) {
    if (key.length === 128) {
      this.privateKeyExpanded = true;
      // expanded key includes deterministic R value material which we ignore
      return key.substring(0, 64);
    } else if (key.length === 64) {
      return key;
    }
    else {
      return null;
    }
  }
}
