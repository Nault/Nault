import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ModalService} from '../../services/modal.service';
import {ApiService} from '../../services/api.service';
import {UtilService, TxType} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {NanoBlockService} from '../../services/nano-block.service';
import * as nanocurrency from 'nanocurrency';
import { wallet } from 'nanocurrency-web';
import * as bip39 from 'bip39';
import {Router} from '@angular/router';

const INDEX_MAX = 4294967295; // seed index
const SWEEP_MAX_INDEX = 100; // max index keys to sweep
const SWEEP_MAX_PENDING = 100; // max pending blocks to process per run

@Component({
  selector: 'app-sweeper',
  templateUrl: './sweeper.component.html',
  styleUrls: ['./sweeper.component.css'],
})

export class SweeperComponent implements OnInit {
  accounts = this.walletService.wallet.accounts;
  indexMax = INDEX_MAX;
  incomingMax = SWEEP_MAX_PENDING;

  myAccountModel = this.accounts.length > 0 ? this.accounts[0].id : '0';
  sourceWallet = '';
  destinationAccount = this.accounts.length > 0 ? this.accounts[0].id : '';
  startIndex = '0';
  endIndex = '5';
  maxIncoming = SWEEP_MAX_PENDING.toString();

  output = '';
  sweeping = false;
  pubKey = '';
  adjustedBalance = '0';
  representative = '';
  privKey = '';
  previous = '';
  subType = '';
  blocks = [];
  keys = [];
  keyCount = 0;
  pendingCallback = null;
  totalSwept = '0';
  customAccountSelected = this.accounts.length === 0;

  validSeed = false;
  validDestination = this.myAccountModel !== '0' ? true : false;
  validStartIndex = true;
  validEndIndex = true;
  validMaxIncoming = true;
  selAccountInit = false;

  @ViewChild('outputarea') logArea: ElementRef;

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    private appSettings: AppSettingsService,
    public modal: ModalService,
    private api: ApiService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private nanoBlock: NanoBlockService,
    private util: UtilService,
    private route: Router) {
      if (this.route.getCurrentNavigation().extras.state && this.route.getCurrentNavigation().extras.state.seed) {
        this.sourceWallet = this.route.getCurrentNavigation().extras.state.seed;
        this.validSeed = true;
      }
    }

  async ngOnInit() {
    // Update selected account if changed in the sidebar
    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      if (this.selAccountInit) {
        this.myAccountModel = acc ? acc.id : (this.accounts.length > 0 ? this.accounts[0].id : '0');
      }
      this.selAccountInit = true;
    });

    // Set the account selected in the sidebar as default
    if (this.walletService.wallet.selectedAccount !== null) {
      this.myAccountModel = this.walletService.wallet.selectedAccount.id;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setDestination(account) {
    if (account !== '0') {
      this.destinationAccount = account;
      this.customAccountSelected = false;
    } else {
      this.destinationAccount = '';
      this.customAccountSelected = true;
    }
    this.destinationChange(account);
  }

  // set min value for start index
  setMin() {
  this.startIndex = '0';
  // check end index
  if (this.validEndIndex) {
    if (parseInt(this.endIndex, 10) > 0 + SWEEP_MAX_INDEX) {
      this.endIndex = (0 + SWEEP_MAX_INDEX).toString(); }
    }
  }

  // set max value for end index
  setMax() {
    this.endIndex = INDEX_MAX.toString();
    // check start index
    if (this.validStartIndex) {
      if (parseInt(this.startIndex, 10) < INDEX_MAX - SWEEP_MAX_INDEX) {
        this.startIndex = (INDEX_MAX - SWEEP_MAX_INDEX).toString();
      }
    }
  }

  // set max value for pending limit
  setMaxIncoming() {
    this.maxIncoming = SWEEP_MAX_PENDING.toString();
  }

  seedChange(seed) {
    if (this.checkMasterKey(seed)) {
      this.validSeed = true;
    } else {
      this.validSeed = false;
    }
  }

  destinationChange(address) {
    if (nanocurrency.checkAddress(address)) {
      this.validDestination = true;
    } else {
      this.validDestination = false;
    }
  }

  startIndexChange(index) {
    let invalid = false;
    if (this.util.string.isNumeric(index) && index % 1 === 0) {
      index = parseInt(index, 10);
      if (!nanocurrency.checkIndex(index)) {
        invalid = true;
      }
      if (index > INDEX_MAX) {
        invalid = true;
      }
    } else {
      invalid = true;
    }
    if (invalid) {
      this.validStartIndex = false;
      return;
    }
    // check end index
    if (this.validEndIndex) {
      if (parseInt(this.endIndex, 10) > index + SWEEP_MAX_INDEX) {
        this.endIndex = (index + SWEEP_MAX_INDEX).toString();
      }
    }
    this.validStartIndex = true;
  }

  endIndexChange(index) {
    let invalid = false;
    if (this.util.string.isNumeric(index) && index % 1 === 0) {
      index = parseInt(index, 10);
      if (!nanocurrency.checkIndex(index)) {
        invalid = true;
      }
      if (index > INDEX_MAX) {
        invalid = true;
      }
    } else {
      invalid = true;
    }
    if (invalid) {
      this.validEndIndex = false;
      return;
    }
    // check end index
    if (this.validStartIndex) {
      if (parseInt(this.startIndex, 10) < index - SWEEP_MAX_INDEX) {
        this.startIndex = (index - SWEEP_MAX_INDEX).toString();
      }
    }
    this.validEndIndex = true;
  }

  maxIncomingChange(value) {
    if (!this.util.string.isNumeric(value) || value % 1 !== 0) {
      this.validMaxIncoming = false;
      return;
    } else {
      value = parseInt(value, 10);
      if (value > SWEEP_MAX_PENDING) {
        this.validMaxIncoming = false;
        return;
      }
    }

    this.validMaxIncoming = true;
  }

  // Validate type of master key. Seed and private key can't be differentiated
  checkMasterKey(key) {
    // validate nano seed or private key
    if (key.length === 64) {
      if (nanocurrency.checkSeed(key)) {
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
    return false;
  }

  // Append row to log output
  appendLog(row) {
    let linebreak = '\n';
    if (this.output === '') {
      linebreak = '';
    }
    this.output = this.output + linebreak + row;
    // scroll to bottom
    this.logArea.nativeElement.scrollTop = this.logArea.nativeElement.scrollHeight;
  }

  // Process final send block
  async processSend(privKey, previous, sendCallback) {
    const pubKey = nanocurrency.derivePublicKey(privKey);
    const address = nanocurrency.deriveAddress(pubKey, {useNanoPrefix: true});

    // make an extra check on valid destination
    if (this.validDestination && nanocurrency.checkAddress(this.destinationAccount)) {
      this.appendLog('Transfer started: ' + address);
      const work = await this.workPool.getWork(previous, 1); // send threshold
      // create the block with the work found
      const block = nanocurrency.createBlock(privKey, {balance: '0', representative: this.representative,
      work: work, link: this.destinationAccount, previous: previous});
      // replace xrb with nano (old library)
      block.block.account = block.block.account.replace('xrb', 'nano');
      block.block.link_as_account = block.block.link_as_account.replace('xrb', 'nano');

      // publish block for each iteration
      const data = await this.api.process(block.block, TxType.send);
      if (data.hash) {
        const blockInfo = await this.api.blockInfo(data.hash);
        let nanoAmountSent = null;
        if (blockInfo.amount) {
          nanoAmountSent = this.util.nano.rawToMnano(blockInfo.amount);
          this.totalSwept = this.util.big.add(this.totalSwept, nanoAmountSent);
        }
        this.notificationService.sendInfo('Account ' + address + ' was swept and ' +
        (nanoAmountSent ? ( 'Ӿ' + nanoAmountSent.toString(10) ) : '') + ' transferred to ' + this.destinationAccount, {length: 15000});
        this.appendLog('Funds transferred ' + (nanoAmountSent ? ('(Ӿ' + nanoAmountSent.toString(10) + ')') : '') + ': ' + data.hash);
        console.log(this.adjustedBalance + ' raw transferred to ' + this.destinationAccount);
      } else {
        this.notificationService.sendWarning(`Failed processing block.`);
        this.appendLog('Failed processing block: ' + data.error);
      }
      sendCallback();
    } else {
      this.notificationService.sendError(`The destination address is not valid.`);
      sendCallback();
    }
  }

  // For each pending block
  async processPending(blocks, keys, keyCount) {
    const key = keys[keyCount];
    this.blocks = blocks;
    this.keys = keys;
    this.keyCount = keyCount;
    this.adjustedBalance = this.util.big.add(this.adjustedBalance, blocks[key].amount);

    // generate local work
    try {
      this.appendLog('Started generating PoW...');

      // determine input work hash depending if open block or receive block
      let workInputHash = this.previous;
      if (this.subType === 'open') {
        // input hash is the opening address public key
        workInputHash = this.pubKey;
      }
      const work = await this.workPool.getWork(workInputHash, 1 / 64); // receive threshold
      // create the block with the work found
      const block = nanocurrency.createBlock(this.privKey, {balance: this.adjustedBalance, representative: this.representative,
      work: work, link: key, previous: this.previous});
      // replace xrb with nano (old library)
      block.block.account = block.block.account.replace('xrb', 'nano');
      block.block.link_as_account = block.block.link_as_account.replace('xrb', 'nano');
      // new previous
      this.previous = block.hash;

      // publish block for each iteration
      const data = await this.api.process(block.block, this.subType === 'open' ? TxType.open : TxType.receive);
      if (data.hash) {
        this.appendLog('Processed pending: ' + data.hash);

        // continue with the next pending
        this.keyCount += 1;
        if (this.keyCount < this.keys.length) {
          // if last block was open, the next one will be a receive
          if (this.subType === 'open') {
            this.subType = 'receive';
          }
          this.processPending(this.blocks, this.keys, this.keyCount);
        } else { // all pending done, now we process the final send block
          this.appendLog('All pending processed!');
          this.pendingCallback(this.previous);
        }
      } else {
        this.notificationService.sendWarning(`Failed processing block`);
        this.appendLog('Failed processing block: ' + data.error);
      }
    } catch (error) {
      if (error.message === 'invalid_hash') {
        this.notificationService.sendError(`Block hash must be 64 character hex string`);
      } else {
        this.notificationService.sendError(`An unknown error occurred while generating PoW`);
        console.log('An unknown error occurred while generating PoW' + error);
      }
      this.sweeping = false;
      return;
    }
  }

  // Create pending blocks based on current balance and previous block (or start with an open block)
  async createPendingBlocks(privKey, address, balance, previous, subType, callback, accountCallback) {
    this.privKey = privKey;
    this.previous = previous;
    this.subType = subType;
    this.pendingCallback = callback;
    // check for pending first
    let data = null;
    if (this.appSettings.settings.minimumReceive) {
      const minAmount = this.util.nano.mnanoToRaw(this.appSettings.settings.minimumReceive).toString(10);
      if (this.appSettings.settings.pendingOption === 'amount') {
        data = await this.api.pendingLimitSorted(address, this.maxIncoming, minAmount);
      } else {
        data = await this.api.pendingLimit(address, this.maxIncoming, minAmount);
      }

    } else {
      if (this.appSettings.settings.pendingOption === 'amount') {
        data = await this.api.pendingSorted(address, this.maxIncoming);
      } else {
        data = await this.api.pending(address, this.maxIncoming);
      }
    }

    // if there are any pending, process them
    if (data.blocks) {
      // sum all raw amounts
      let raw = '0';
      Object.keys(data.blocks).forEach(function(key) {
        raw = this.util.big.add(raw, data.blocks[key].amount);
      }.bind(this));
      const nanoAmount = this.util.nano.rawToMnano(raw);
      const pending = {count: Object.keys(data.blocks).length, raw: raw, XNO: nanoAmount, blocks: data.blocks};
      const row = 'Found ' + pending.count + ' pending containing total ' + pending.XNO + ' XNO';
      this.appendLog(row);

      // create receive blocks for all pending
      const keys = [];
      // create an array with all keys to be used recurively
      Object.keys(pending.blocks).forEach(function(key) {
        keys.push(key);
      });

      this.processPending(pending.blocks, keys, 0);
    } else { // no pending, create final block directly
      if (parseInt(this.adjustedBalance, 10) > 0) {
        this.processSend(this.privKey, this.previous, () => {
          accountCallback(); // tell that we are ok to continue with next step
        });
      } else {
        accountCallback(); // tell that we are ok to continue with next step
      }
    }
  }

  // Process an account
  async processAccount(privKey, accountCallback) {
    if (privKey.length !== 64) {
      accountCallback();
      return;
    }

    this.pubKey = nanocurrency.derivePublicKey(privKey);
    const address = nanocurrency.deriveAddress(this.pubKey, {useNanoPrefix: true});

    // get account info required to build the block
    let balance = 0; // balance will be 0 if open block
    this.adjustedBalance = balance.toString();
    let previous = null; // previous is null if we create open block
    this.representative = this.settings.settings.defaultRepresentative || this.nanoBlock.getRandomRepresentative();
    let subType = 'open';

    // retrive from RPC
    const accountInfo = await this.api.accountInfo(address);
    let validResponse = false;
    // if frontier is returned it means the account has been opened and we create a receive block
    if (accountInfo.frontier) {
      validResponse = true;
      balance = accountInfo.balance;
      this.adjustedBalance = balance.toString();
      previous = accountInfo.frontier;
      this.representative = accountInfo.representative;
      subType = 'receive';
      validResponse = true;
    } else if (accountInfo.error === 'Account not found') {
      validResponse = true;
      this.adjustedBalance = '0';
    }
    if (validResponse) {
      // create and publish all pending
      this.createPendingBlocks(privKey, address, balance, previous, subType, function(previous_) {
        // the previous is the last received block and will be used to create the final send block
        if (parseInt(this.adjustedBalance, 10) > 0) {
          this.processSend(privKey, previous_, () => {
            accountCallback();
          });
        } else {
          accountCallback();
        }
      }.bind(this), () => {
        accountCallback();
      });
    } else {
      this.notificationService.sendError(`Bad RPC response. Please try again.`);
      accountCallback();
    }
  }

  // Recursively process private keys from index range
  async processIndexRecursive(privKeys, keyCount) {
    // delay each process to not hit backend rate limiters
    await this.sleep(300);
    const privKey = privKeys[keyCount][0];
    this.appendLog('Checking index ' + privKeys[keyCount][2] + ' using ' + privKeys[keyCount][1]);
    this.processAccount(privKey, function() {
      // continue with the next pending
      keyCount += 1;
      if (keyCount < privKeys.length) {
        this.processIndexRecursive(privKeys, keyCount);
      } else {
        // all private keys have been processed
        this.appendLog('Finished processing all accounts');
        this.appendLog('Ӿ' + this.totalSwept + ' transferred');
        this.notificationService.sendInfo('Finished processing all accounts. Ӿ' + this.totalSwept + ' transferred', {length: 0});
        this.sweeping = false;
      }
    }.bind(this));
  }

  async sweepContinue () {
    this.sweeping = true;
    this.totalSwept = '0';

    const keyType = this.checkMasterKey(this.sourceWallet);
    if (this.validEndIndex && this.validStartIndex && this.validMaxIncoming) {
      let seed = '', privKey;
      let bip39Seed = '';
      // input is mnemonic
      if (keyType === 'mnemonic') {
        seed = bip39.mnemonicToEntropy(this.sourceWallet).toUpperCase();
        bip39Seed = this.util.string.mnemonicToSeedSync(this.sourceWallet).toString('hex');
        // Seed must be 64 for regular nano blake derivation to happen
        // For other lengths, only bip39/44 derivation is possible
        if (seed.length !== 32 && seed.length !== 40 && seed.length !== 48 && seed.length !== 56 && seed.length !== 64) {
          this.notificationService.sendError(`Mnemonic not 12,15,18,21 or 24 words`);
          return;
        }
      }

      // nano seed or private key
      if (keyType === 'nano_seed' || seed !== '' || keyType === 'bip39_seed') {
        // check if a private key first (no index)
        this.appendLog('Checking if input is a private key');
        if (seed === '') { // seed from input, no mnemonic
          seed = this.sourceWallet;
        }
        this.processAccount(seed, function() {
          // done checking if private key, continue interpret as seed
          const privKeys = [];
          // start with blake2b derivation (but not if the mnemonic is anything other than 24 words)
          if (keyType !== 'bip39_seed' && seed.length === 64) {
            for (let i = parseInt(this.startIndex, 10); i <= parseInt(this.endIndex, 10); i++) {
              privKey = nanocurrency.deriveSecretKey(seed, i);
              privKeys.push([privKey, 'blake2b', i]);
            }
          }
          // also check all indexes using bip39/44 derivation
          // take 128 char bip39 seed directly from input or convert it from a 64 char nano seed (entropy)
          if (keyType === 'bip39_seed') {
            bip39Seed = this.sourceWallet;
          } else if (seed.length === 64) {
            bip39Seed = wallet.generate(seed).seed;
          }

          if (bip39Seed.length !== 128) return this.notificationService.sendError(`Invalid input format! Please check.`);
          const accounts = wallet.accounts(bip39Seed, this.startIndex, this.endIndex);
          let k = 0;
          for (let i = parseInt(this.startIndex, 10); i <= parseInt(this.endIndex, 10); i++) {
            privKey = accounts[k].privateKey;
            k += 1;
            privKeys.push([privKey, 'bip39/44', i]);
          }
          this.processIndexRecursive(privKeys, 0);
        }.bind(this));
      }

    } else {
      this.notificationService.sendError(`Invalid input format! Please check.`);
    }
  }

  /* Start the sweeping */
  async sweep() {
    if (!this.validSeed) {
      this.notificationService.sendError(`No valid source wallet provided!`);
      return;
    }
    if (!this.validDestination) {
      this.notificationService.sendError(`No valid destination account provided!`);
      return;
    }

    if (this.validStartIndex && this.validEndIndex) {
      if (parseInt(this.startIndex, 10) > parseInt(this.endIndex, 10)) {
        this.notificationService.sendError(`End Index must be equal or larger than Start Index`);
        return;
      }
    } else {
      this.notificationService.sendError(`Not valid start and end indexes`);
      return;
    }

    if (!this.validMaxIncoming) {
      this.notificationService.sendError(`Not a valid number for Max Incoming`);
      return;
    }

    // let user confirm account
    const UIkit = window['UIkit'];
    try {
      const msg = '<p class="uk-alert uk-alert-danger"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span><span style="font-size: 18px;">You are about to empty the source wallet, which will <b>transfer all funds from it to the destination address</b>.</span><br><br><b style="font-size: 18px;">Before continuing, make sure you (or someone) have saved the secret recovery seed and/or mnemonic of the specified destination address</b>.<br><br><span style="font-size: 18px;"><b>YOU WILL NOT BE ABLE TO RECOVER THE FUNDS</b><br>without a backup of the specified destination address.</span></p><br>';
      await UIkit.modal.confirm(msg);
      this.sweepContinue();
    } catch (err) {
      console.log(err);
    }
  }
}
