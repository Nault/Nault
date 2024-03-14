import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {UtilService} from './util.service';
import {ApiService} from './api.service';
import {BigNumber} from 'bignumber.js';
import {AddressBookService} from './address-book.service';
import * as CryptoJS from 'crypto-js';
import {WorkPoolService} from './work-pool.service';
import {WebsocketService} from './websocket.service';
import {NanoBlockService} from './nano-block.service';
import {NotificationService} from './notification.service';
import {AppSettingsService} from './app-settings.service';
import {PriceService} from './price.service';
import {LedgerService} from './ledger.service';
import { NoPaddingZerosPipe } from 'app/pipes/no-padding-zeros.pipe';

export type WalletType = 'seed' | 'ledger' | 'privateKey' | 'expandedKey';

export interface WalletAccount {
  id: string;
  frontier: string|null;
  secret: any;
  keyPair: any;
  index: number;
  balance: BigNumber;
  pending: BigNumber;
  balanceRaw: BigNumber;
  pendingRaw: BigNumber;
  balanceFiat: number;
  pendingFiat: number;
  addressBookName: string|null;
  receivePow: boolean;
}

export interface Block {
  account: string;
  hash: string;
  amount: string;
  source: string;
}

export interface ReceivableBlockUpdate {
  account: string;
  sourceHash: string;
  destinationHash: string|null;
  hasBeenReceived: boolean;
}

export interface FullWallet {
  type: WalletType;
  seedBytes: any;
  seed: string|null;
  balance: BigNumber;
  pending: BigNumber;
  balanceRaw: BigNumber;
  pendingRaw: BigNumber;
  balanceFiat: number;
  pendingFiat: number;
  hasPending: boolean;
  updatingBalance: boolean;
  balanceInitialized: boolean;
  accounts: WalletAccount[];
  selectedAccountId: string|null;
  selectedAccount: WalletAccount|null;
  selectedAccount$: BehaviorSubject<WalletAccount|null>;
  locked: boolean;
  locked$: BehaviorSubject<boolean|false>;
  unlockModalRequested$: BehaviorSubject<boolean|false>;
  password: string;
  pendingBlocks: Block[];
  pendingBlocksUpdate$: BehaviorSubject<ReceivableBlockUpdate|null>;
  newWallet$: BehaviorSubject<boolean|false>;
  refresh$: BehaviorSubject<boolean|false>;
}

export interface BaseApiAccount {
  account_version: string;
  balance: string;
  block_count: string;
  frontier: string;
  modified_timestamp: string;
  open_block: string;
  pending: string;
  representative: string;
  representative_block: string;
  weight: string;
}

export interface WalletApiAccount extends BaseApiAccount {
  addressBookName?: string|null;
  id?: string;
}

@Injectable()
export class WalletService {
  nano = 1000000000000000000000000;
  storeKey = `nanovault-wallet`;

  wallet: FullWallet = {
    type: 'seed',
    seedBytes: null,
    seed: '',
    balance: new BigNumber(0),
    pending: new BigNumber(0),
    balanceRaw: new BigNumber(0),
    pendingRaw: new BigNumber(0),
    balanceFiat: 0,
    pendingFiat: 0,
    hasPending: false,
    updatingBalance: false,
    balanceInitialized: false,
    accounts: [],
    selectedAccountId: null,
    selectedAccount: null,
    selectedAccount$: new BehaviorSubject(null),
    locked: false,
    locked$: new BehaviorSubject(false),
    unlockModalRequested$: new BehaviorSubject(false),
    password: '',
    pendingBlocks: [],
    pendingBlocksUpdate$: new BehaviorSubject(null),
    newWallet$: new BehaviorSubject(false),
    refresh$: new BehaviorSubject(false),
  };

  processingPending = false;
  successfulBlocks = [];
  trackedHashes = [];

  constructor(
    private util: UtilService,
    private api: ApiService,
    private appSettings: AppSettingsService,
    private addressBook: AddressBookService,
    private price: PriceService,
    private workPool: WorkPoolService,
    private websocket: WebsocketService,
    private nanoBlock: NanoBlockService,
    private ledgerService: LedgerService,
    private noZerosPipe: NoPaddingZerosPipe,
    private notifications: NotificationService) {
    this.websocket.newTransactions$.subscribe(async (transaction) => {
      if (!transaction) return; // Not really a new transaction
      console.log('New Transaction', transaction);
      let shouldNotify = false;
      if (this.appSettings.settings.minimumReceive) {
        const minAmount = this.util.nano.mnanoToRaw(this.appSettings.settings.minimumReceive);
        if ((new BigNumber(transaction.amount)).gte(minAmount)) {
          shouldNotify = true;
        }
      } else {
        shouldNotify = true;
      }

      const walletAccountIDs = this.wallet.accounts.map(a => a.id);

      const isConfirmedIncomingTransactionForOwnWalletAccount = (
          (transaction.block.type === 'state')
        && (transaction.block.subtype === 'send')
        && ( walletAccountIDs.includes(transaction.block.link_as_account) === true )
      );

      const isConfirmedSendTransactionFromOwnWalletAccount = (
          (transaction.block.type === 'state')
        && (transaction.block.subtype === 'send')
        && ( walletAccountIDs.includes(transaction.block.account) === true )
      );

      const isConfirmedReceiveTransactionFromOwnWalletAccount = (
          (transaction.block.type === 'state')
        && (transaction.block.subtype === 'receive')
        && ( walletAccountIDs.includes(transaction.block.account) === true )
      );

      if (isConfirmedIncomingTransactionForOwnWalletAccount === true) {
        if (shouldNotify === true) {
          if (this.wallet.locked && this.appSettings.settings.pendingOption !== 'manual') {
            this.notifications.sendWarning(`New incoming transaction - Unlock the wallet to receive`, { length: 10000, identifier: 'pending-locked' });
          } else if (this.appSettings.settings.pendingOption === 'manual') {
            this.notifications.sendWarning(`New incoming transaction - Set to be received manually`, { length: 10000, identifier: 'pending-locked' });
          }
        } else {
          console.log(
            `Found new incoming block that was below minimum receive amount: `,
            transaction.amount,
            this.appSettings.settings.minimumReceive
          );
        }
        await this.processStateBlock(transaction);
      } else if (isConfirmedSendTransactionFromOwnWalletAccount === true) {
        shouldNotify = true;
        await this.processStateBlock(transaction);
      } else if (isConfirmedReceiveTransactionFromOwnWalletAccount === true) {
        shouldNotify = true;
      }

      // Find if the source or destination is a tracked address in the address book
      // This is a send transaction (to tracked account or from tracked account)
      if (walletAccountIDs.indexOf(transaction.block.link_as_account) === -1 && transaction.block.type === 'state' &&
      (transaction.block.subtype === 'send' || transaction.block.subtype === 'receive') || transaction.block.subtype === 'change' &&
      (this.addressBook.getTransactionTrackingById(transaction.block.link_as_account) ||
      this.addressBook.getTransactionTrackingById(transaction.block.account))) {
        if (shouldNotify || transaction.block.subtype === 'change') {
          const trackedAmount = this.util.nano.rawToMnano(transaction.amount);
          // Save hash so we can ignore duplicate messages if subscribing to both send and receive
          if (this.trackedHashes.indexOf(transaction.hash) !== -1) return; // Already notified this block
          this.trackedHashes.push(transaction.hash);
          const addressLink = transaction.block.link_as_account;
          const address = transaction.block.account;
          const rep = transaction.block.representative;
          const accountHrefLink = `<a href="/account/${addressLink}">${this.addressBook.getAccountName(addressLink)}</a>`;
          const accountHref = `<a href="/account/${address}">${this.addressBook.getAccountName(address)}</a>`;

          if (transaction.block.subtype === 'send') {
            // Incoming transaction
            if (this.addressBook.getTransactionTrackingById(addressLink)) {
              this.notifications.sendInfo(`Tracked address ${accountHrefLink} can now receive ${trackedAmount} XNO`, { length: 10000 });
              console.log(`Tracked incoming block to: ${address} - Ӿ${trackedAmount}`);
            }
            // Outgoing transaction
            if (this.addressBook.getTransactionTrackingById(address)) {
              this.notifications.sendInfo(`Tracked address ${accountHref} sent ${trackedAmount} XNO`, { length: 10000 });
              console.log(`Tracked send block from: ${address} - Ӿ${trackedAmount}`);
            }
          } else if (transaction.block.subtype === 'receive' && this.addressBook.getTransactionTrackingById(address)) {
            // Receive transaction
            this.notifications.sendInfo(`Tracked address ${accountHref} received incoming ${trackedAmount} XNO`, { length: 10000 });
            console.log(`Tracked receive block to: ${address} - Ӿ${trackedAmount}`);
          } else if (transaction.block.subtype === 'change' && this.addressBook.getTransactionTrackingById(address)) {
            // Change transaction
            this.notifications.sendInfo(`Tracked address ${accountHref} changed its representative to ${rep}`, { length: 10000 });
            console.log(`Tracked change block of: ${address} - Rep: ${rep}`);
          }
        } else {
          console.log(
            `Found new transaction on watch-only account that was below minimum receive amount: `,
            transaction.amount,
            this.appSettings.settings.minimumReceive
          );
        }
      }

      // TODO: We don't really need to call to update balances, we should be able to balance on our own from here
      // I'm not sure about that because what happens if the websocket is disconnected and misses a transaction?
      // won't the balance be incorrect if relying only on the websocket? / Json

      const shouldReloadBalances = (
          (shouldNotify === true)
        && (
            (isConfirmedIncomingTransactionForOwnWalletAccount === true)
          || (isConfirmedSendTransactionFromOwnWalletAccount === true)
          || (isConfirmedReceiveTransactionFromOwnWalletAccount === true)
        )
      );

      if (shouldReloadBalances === true) {
        await this.reloadBalances();
      }
    });

    this.addressBook.addressBook$.subscribe(newAddressBook => {
      this.reloadAddressBook();
    });
  }

  async processStateBlock(transaction) {
    // If we have a minimum receive,  once we know the account... add the amount to wallet pending? set pending to true
    if (transaction.block.subtype === 'send' && transaction.block.link_as_account) {
      // This is an incoming send block, we want to perform a receive
      const walletAccount = this.wallet.accounts.find(a => a.id === transaction.block.link_as_account);
      if (!walletAccount) return; // Not for our wallet?

      const txAmount = new BigNumber(transaction.amount);
      let aboveMinimumReceive = true;

      if (this.appSettings.settings.minimumReceive) {
        const minAmount = this.util.nano.mnanoToRaw(this.appSettings.settings.minimumReceive);
        aboveMinimumReceive = txAmount.gte(minAmount);
      }

      if (aboveMinimumReceive === true) {
        const isNewBlock = this.addPendingBlock(walletAccount.id, transaction.hash, txAmount, transaction.account);

        if (isNewBlock === true) {
          this.wallet.pending = this.wallet.pending.plus(txAmount);
          this.wallet.pendingRaw = this.wallet.pendingRaw.plus(txAmount.mod(this.nano));
          this.wallet.pendingFiat += this.util.nano.rawToMnano(txAmount).times(this.price.price.lastPrice).toNumber();
          this.wallet.hasPending = true;
        }
      }

      await this.processPendingBlocks();
    } else {
      // Not a send to us, which means it was a block posted by us.  We shouldnt need to do anything...
      const walletAccount = this.wallet.accounts.find(a => a.id === transaction.block.link_as_account);
      if (!walletAccount) return; // Not for our wallet?
    }
  }

  reloadAddressBook() {
    this.wallet.accounts.forEach(account => {
      account.addressBookName = this.addressBook.getAccountName(account.id);
    });
  }

  getWalletAccount(accountID) {
    return this.wallet.accounts.find(a => a.id === accountID);
  }


  async patchOldSavedData() {
    // Look for saved accounts using an xrb_ prefix
    const walletData = localStorage.getItem(this.storeKey);
    if (!walletData) return;

    const walletJson = JSON.parse(walletData);

    if (walletJson.accounts) {
      const newAccounts = walletJson.accounts.map(account => {
        if (account.id.indexOf('xrb_') !== -1) {
          account.id = account.id.replace('xrb_', 'nano_');
        }
        return account;
      });

      walletJson.accounts = newAccounts;
    }

    localStorage.setItem(this.storeKey, JSON.stringify(walletJson));

    return;
  }

  async loadStoredWallet() {
    this.resetWallet();

    const walletData = localStorage.getItem(this.storeKey);
    if (!walletData) return this.wallet;

    const walletJson = JSON.parse(walletData);
    const walletType = walletJson.type || 'seed';
    this.wallet.type = walletType;
    if (walletType === 'seed' || walletType === 'privateKey' || walletType === 'expandedKey') {
      this.wallet.seed = walletJson.seed;
      this.wallet.seedBytes = this.util.hex.toUint8(walletJson.seed);
      this.wallet.locked = true;
      this.wallet.locked$.next(true);
    }
    if (walletType === 'ledger') {
      // Check ledger status?
    }

    if (walletJson.accounts && walletJson.accounts.length) {
      walletJson.accounts.forEach(account => this.loadWalletAccount(account.index, account.id));
    }

    this.wallet.selectedAccountId = walletJson.selectedAccountId || null;

    return this.wallet;
  }

  // Using full list of indexes is the latest standard with back compatability with accountsIndex
  async loadImportedWallet(seed: string, password: string, accountsIndex: number, indexes: Array<number>, walletType: WalletType) {
    this.resetWallet();

    this.wallet.seed = seed;
    this.wallet.seedBytes = this.util.hex.toUint8(seed);
    this.wallet.password = password;
    this.wallet.type = walletType;

    if (walletType === 'seed') {
      // Old method
      if (accountsIndex > 0) {
        for (let i = 0; i < accountsIndex; i++) {
          await this.addWalletAccount(i, false);
        }
      } else if (indexes) {
        // New method (the promise ensures all wallets have been added before moving on)
        await Promise.all(indexes.map(async (i) => {
          await this.addWalletAccount(i, false);
        }));
      } else return false;
    } else if (walletType === 'privateKey' || walletType === 'expandedKey') {
      this.wallet.accounts.push(this.createSingleKeyAccount(walletType === 'expandedKey'));
    } else { // invalid wallet type
      return false;
    }

    await this.reloadBalances();

    if (this.wallet.accounts.length) {
      this.websocket.subscribeAccounts(this.wallet.accounts.map(a => a.id));
    }

    return true;
  }

  generateExportData() {
    const exportData: any = {
      indexes: this.wallet.accounts.map(a => a.index),
    };
    let secret = '';
    if (this.wallet.locked) {
      secret = this.wallet.seed;
    } else {
      secret = CryptoJS.AES.encrypt(this.wallet.seed, this.wallet.password).toString();
    }

    if (this.wallet.type === 'seed') {
      exportData.seed = secret;
    } else if (this.wallet.type === 'privateKey') {
      exportData.privateKey = secret;
    } else if (this.wallet.type === 'expandedKey') {
      exportData.expandedKey = secret;
    }

    return exportData;
  }

  generateExportUrl() {
    const exportData = this.generateExportData();
    const base64Data = btoa(JSON.stringify(exportData));

    return `https://nault.cc/import-wallet#${base64Data}`;
  }

  lockWallet() {
    if (!this.wallet.seed || !this.wallet.password) return; // Nothing to lock, password not set
    const encryptedSeed = CryptoJS.AES.encrypt(this.wallet.seed, this.wallet.password);

    // Update the seed
    this.wallet.seed = encryptedSeed.toString();
    this.wallet.seedBytes = null;

    // Remove secrets from accounts
    this.wallet.accounts.forEach(a => {
      a.keyPair = null;
      a.secret = null;
    });

    this.wallet.locked = true;
    this.wallet.locked$.next(true);
    this.wallet.password = '';

    this.saveWalletExport(); // Save so that a refresh gives you a locked wallet

    return true;
  }
  unlockWallet(password: string) {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(this.wallet.seed, password);
      const decryptedSeed = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedSeed || decryptedSeed.length !== 64) return false;

      this.wallet.seed = decryptedSeed;
      this.wallet.seedBytes = this.util.hex.toUint8(this.wallet.seed);
      this.wallet.accounts.forEach(a => {
        if (this.wallet.type === 'seed') {
          a.secret = this.util.account.generateAccountSecretKeyBytes(this.wallet.seedBytes, a.index);
        } else {
          a.secret = this.wallet.seedBytes;
        }
        a.keyPair = this.util.account.generateAccountKeyPair(a.secret, this.wallet.type === 'expandedKey');
      });

      this.wallet.locked = false;
      this.wallet.locked$.next(false);
      this.wallet.password = password;

      this.notifications.removeNotification('pending-locked'); // If there is a notification to unlock, remove it

      // Process any pending blocks
      this.processPendingBlocks();

      this.saveWalletExport(); // Save so a refresh also gives you your unlocked wallet?

      return true;
    } catch (err) {
      return false;
    }
  }

  async createWalletFromSeed(seed: string) {
    this.resetWallet();

    this.wallet.seed = seed;
    this.wallet.seedBytes = this.util.hex.toUint8(seed);

    await this.scanAccounts();
  }

  async scanAccounts() {
    const usedIndices = [];

    const NAULT_ACCOUNTS_LIMIT = 20;
    const ACCOUNTS_PER_API_REQUEST = 10;

    const batchesCount = NAULT_ACCOUNTS_LIMIT / ACCOUNTS_PER_API_REQUEST;

    // Getting accounts...
    for (let batchIdx = 0; batchIdx < batchesCount; batchIdx++) {
      const batchAccounts = {};
      const batchAccountsArray = [];
      for (let i = 0; i < ACCOUNTS_PER_API_REQUEST; i++) {
        const index = batchIdx * ACCOUNTS_PER_API_REQUEST + i;

        let accountAddress = '';
        let accountPublicKey = '';

        if (this.wallet.type === 'seed') {
          const accountBytes = this.util.account.generateAccountSecretKeyBytes(this.wallet.seedBytes, index);
          const accountKeyPair = this.util.account.generateAccountKeyPair(accountBytes);
          accountPublicKey = this.util.uint8.toHex(accountKeyPair.publicKey).toUpperCase();
          accountAddress = this.util.account.getPublicAccountID(accountKeyPair.publicKey);

        } else if (this.wallet.type === 'ledger') {
          const account: any = await this.ledgerService.getLedgerAccount(index);
          accountAddress = account.address.replace('xrb_', 'nano_');
          accountPublicKey = account.publicKey.toUpperCase();

        } else {
          return false;
        }

        batchAccounts[accountAddress] = {
          index: index,
          publicKey: accountPublicKey,
        };
        batchAccountsArray.push(accountAddress);
      }

      // Checking frontiers...
      const batchResponse = await this.api.accountsFrontiers(batchAccountsArray);
      if (batchResponse) {
        for (const accountID in batchResponse.frontiers) {
          if (batchResponse.frontiers.hasOwnProperty(accountID)) {
            const frontier = batchResponse.frontiers[accountID];
            const frontierIsValidHash = this.util.nano.isValidHash(frontier);

            if (frontierIsValidHash === true) {
              if (frontier !== batchAccounts[accountID].publicKey) {
                usedIndices.push(batchAccounts[accountID].index);
              }
            }
          }
        }
      }
    }

    // Add accounts
    if (usedIndices.length > 0) {
      for (const index of usedIndices) {
        await this.addWalletAccount(index, false);
      }
    } else {
      await this.addWalletAccount(0, false);
    }

    // Reload balances for all accounts
    this.reloadBalances();
  }

  createNewWallet(seed: string) {
    this.resetWallet();

    this.wallet.seedBytes = this.util.hex.toUint8(seed);
    this.wallet.seed = seed;

    this.addWalletAccount();

    return this.wallet.seed;
  }

  async createLedgerWallet() {
    // this.resetWallet(); Now done earlier to ensure user not sending to wrong account

    this.wallet.type = 'ledger';

    await this.scanAccounts();

    return this.wallet;
  }

  async createWalletFromSingleKey(key: string, expanded: boolean) {
    this.resetWallet();

    this.wallet.type = expanded ? 'expandedKey' : 'privateKey';
    this.wallet.seed = key;
    this.wallet.seedBytes = this.util.hex.toUint8(key);

    this.wallet.accounts.push(this.createSingleKeyAccount(expanded));
    await this.reloadBalances();
    this.saveWalletExport();
  }

  async createLedgerAccount(index) {
    const account: any = await this.ledgerService.getLedgerAccount(index);

    const accountID = account.address;
    const nanoAccountID = accountID.replace('xrb_', 'nano_');
    const addressBookName = this.addressBook.getAccountName(nanoAccountID);

    const newAccount: WalletAccount = {
      id: nanoAccountID,
      frontier: null,
      secret: null,
      keyPair: null,
      balance: new BigNumber(0),
      pending: new BigNumber(0),
      balanceRaw: new BigNumber(0),
      pendingRaw: new BigNumber(0),
      balanceFiat: 0,
      pendingFiat: 0,
      index: index,
      addressBookName,
      receivePow: false,
    };

    return newAccount;
  }

  createKeyedAccount(index, accountBytes, accountKeyPair) {
    const accountName = this.util.account.getPublicAccountID(accountKeyPair.publicKey);
    const addressBookName = this.addressBook.getAccountName(accountName);

    const newAccount: WalletAccount = {
      id: accountName,
      frontier: null,
      secret: accountBytes,
      keyPair: accountKeyPair,
      balance: new BigNumber(0),
      pending: new BigNumber(0),
      balanceRaw: new BigNumber(0),
      pendingRaw: new BigNumber(0),
      balanceFiat: 0,
      pendingFiat: 0,
      index: index,
      addressBookName,
      receivePow: false,
    };

    return newAccount;
  }

  async createSeedAccount(index) {
    const accountBytes = this.util.account.generateAccountSecretKeyBytes(this.wallet.seedBytes, index);
    const accountKeyPair = this.util.account.generateAccountKeyPair(accountBytes);
    return this.createKeyedAccount(index, accountBytes, accountKeyPair);
  }

  createSingleKeyAccount(expanded: boolean) {
    const accountBytes = this.wallet.seedBytes;
    const accountKeyPair = this.util.account.generateAccountKeyPair(accountBytes, expanded);
    return this.createKeyedAccount(0, accountBytes, accountKeyPair);
  }

  /**
   * Reset wallet to a base state, without changing reference to the main object
   */
  resetWallet() {
    if (this.wallet.accounts.length) {
      this.websocket.unsubscribeAccounts(this.wallet.accounts.map(a => a.id)); // Unsubscribe from old accounts
    }
    this.wallet.type = 'seed';
    this.wallet.password = '';
    this.wallet.locked = false;
    this.wallet.locked$.next(false);
    this.wallet.seed = '';
    this.wallet.seedBytes = null;
    this.wallet.accounts = [];
    this.wallet.balance = new BigNumber(0);
    this.wallet.pending = new BigNumber(0);
    this.wallet.balanceRaw = new BigNumber(0);
    this.wallet.pendingRaw = new BigNumber(0);
    this.wallet.balanceFiat = 0;
    this.wallet.pendingFiat = 0;
    this.wallet.hasPending = false;
    this.wallet.selectedAccountId = null;
    this.wallet.selectedAccount = null;
    this.wallet.selectedAccount$.next(null);
    this.wallet.pendingBlocks = [];
  }

  isConfigured() {
    switch (this.wallet.type) {
      case 'privateKey':
      case 'expandedKey':
      case 'seed': return !!this.wallet.seed;
      case 'ledger': return true;
    }
  }

  isLocked() {
    switch (this.wallet.type) {
      case 'privateKey':
      case 'expandedKey':
      case 'seed': return this.wallet.locked;
      case 'ledger': return false;
    }
  }

  isLedgerWallet() {
    return this.wallet.type === 'ledger';
  }

  isSingleKeyWallet() {
    return (this.wallet.type === 'privateKey' || this.wallet.type === 'expandedKey');
  }

  hasPendingTransactions() {
    return this.wallet.hasPending;
    // if (this.appSettings.settings.minimumReceive) {
    //   return this.wallet.hasPending;
    // } else {
    //   return this.wallet.pendingRaw.gt(0);
    // }
  }

  reloadFiatBalances() {
    const fiatPrice = this.price.price.lastPrice;

    this.wallet.accounts.forEach(account => {
      account.balanceFiat = this.util.nano.rawToMnano(account.balance).times(fiatPrice).toNumber();
      account.pendingFiat = this.util.nano.rawToMnano(account.pending).times(fiatPrice).toNumber();
    });

    this.wallet.balanceFiat = this.util.nano.rawToMnano(this.wallet.balance).times(fiatPrice).toNumber();
    this.wallet.pendingFiat = this.util.nano.rawToMnano(this.wallet.pending).times(fiatPrice).toNumber();
  }

  resetBalances() {
    this.wallet.balance = new BigNumber(0);
    this.wallet.pending = new BigNumber(0);
    this.wallet.balanceRaw = new BigNumber(0);
    this.wallet.pendingRaw = new BigNumber(0);
    this.wallet.balanceFiat = 0;
    this.wallet.pendingFiat = 0;
    this.wallet.hasPending = false;
  }

  async reloadBalances() {
    // to block two reloads to happen at the same time (websocket)
    if (this.wallet.updatingBalance) return;

    this.wallet.updatingBalance = true;
    const fiatPrice = this.price.price.lastPrice;

    const accountIDs = this.wallet.accounts.map(a => a.id);
    const accounts = await this.api.accountsBalances(accountIDs);
    const frontiers = await this.api.accountsFrontiers(accountIDs);
    // const allFrontiers = [];
    // for (const account in frontiers.frontiers) {
    //   allFrontiers.push({ account, frontier: frontiers.frontiers[account] });
    // }
    // const frontierBlocks = await this.api.blocksInfo(allFrontiers.map(f => f.frontier));

    let walletBalance = new BigNumber(0);
    let walletPendingInclUnconfirmed = new BigNumber(0);
    let walletPendingAboveThresholdConfirmed = new BigNumber(0);

    if (!accounts) {
      this.resetBalances();
      this.wallet.updatingBalance = false;
      this.wallet.balanceInitialized = true;
      return;
    }

    this.clearPendingBlocks();

    for (const accountID in accounts.balances) {
      if (!accounts.balances.hasOwnProperty(accountID)) continue;

      const walletAccount = this.wallet.accounts.find(a => a.id === accountID);

      if (!walletAccount) continue;

      walletAccount.balance = new BigNumber(accounts.balances[accountID].balance || 0);
      const accountBalancePendingInclUnconfirmed = new BigNumber(accounts.balances[accountID].pending || 0);

      walletAccount.balanceRaw = new BigNumber(walletAccount.balance).mod(this.nano);

      walletAccount.balanceFiat = this.util.nano.rawToMnano(walletAccount.balance).times(fiatPrice).toNumber();

      const walletAccountFrontier = frontiers.frontiers?.[accountID];
      const walletAccountFrontierIsValidHash = this.util.nano.isValidHash(walletAccountFrontier);

      walletAccount.frontier = (
          (walletAccountFrontierIsValidHash === true)
        ? walletAccountFrontier
        : null
      );

      walletBalance = walletBalance.plus(walletAccount.balance);
      walletPendingInclUnconfirmed = walletPendingInclUnconfirmed.plus(accountBalancePendingInclUnconfirmed);
    }

    if (walletPendingInclUnconfirmed.gt(0)) {
      let pending;

      if (this.appSettings.settings.minimumReceive) {
        const minAmount = this.util.nano.mnanoToRaw(this.appSettings.settings.minimumReceive);
        pending = await this.api.accountsPendingLimitSorted(this.wallet.accounts.map(a => a.id), minAmount.toString(10));
      } else {
        pending = await this.api.accountsPendingSorted(this.wallet.accounts.map(a => a.id));
      }

      if (pending && pending.blocks) {
        for (const block in pending.blocks) {
          if (!pending.blocks.hasOwnProperty(block)) {
            continue;
          }

          const walletAccount = this.wallet.accounts.find(a => a.id === block);

          if (pending.blocks[block]) {
            let accountPending = new BigNumber(0);

            for (const hash in pending.blocks[block]) {
              if (!pending.blocks[block].hasOwnProperty(hash)) {
                continue;
              }

              const isNewBlock =
                this.addPendingBlock(
                  walletAccount.id,
                  hash,
                  pending.blocks[block][hash].amount,
                  pending.blocks[block][hash].source
                );

              if (isNewBlock === true) {
                accountPending = accountPending.plus(pending.blocks[block][hash].amount);
                walletPendingAboveThresholdConfirmed = walletPendingAboveThresholdConfirmed.plus(pending.blocks[block][hash].amount);
              }
            }

            walletAccount.pending = accountPending;
            walletAccount.pendingRaw = accountPending.mod(this.nano);
            walletAccount.pendingFiat = this.util.nano.rawToMnano(accountPending).times(fiatPrice).toNumber();

            // If there is a pending, it means we want to add to work cache as receive-threshold
            if (walletAccount.pending.gt(0)) {
              console.log('Adding single pending account within limit to work cache');
              // Use frontier or public key if open block
              const hash = walletAccount.frontier || this.util.account.getAccountPublicKey(walletAccount.id);
              // Technically should be 1/64 multiplier here but since we don't know if the pending will be received before
              // a send or change block is made it's safer to use 1x PoW threshold to be sure the cache will work.
              // On the other hand, it may be more efficient to use 1/64 and simply let the work cache rework
              // in case a send is made instead. The typical user scenario would be to let the wallet auto receive first
              this.workPool.addWorkToCache(hash, 1 / 64);
              walletAccount.receivePow = true;
            } else {
              walletAccount.receivePow = false;
            }
          } else {
            walletAccount.pending = new BigNumber(0);
            walletAccount.pendingRaw = new BigNumber(0);
            walletAccount.pendingFiat = 0;
            walletAccount.receivePow = false;
          }
        }
      }
    } else {
      // Not clearing those values to zero earlier to avoid zero values while blocks are being loaded
      for (const accountID in accounts.balances) {
        if (!accounts.balances.hasOwnProperty(accountID)) continue;
        const walletAccount = this.wallet.accounts.find(a => a.id === accountID);
        if (!walletAccount) continue;
        walletAccount.pending = new BigNumber(0);
        walletAccount.pendingRaw = new BigNumber(0);
        walletAccount.pendingFiat = 0;
        walletAccount.receivePow = false;
      }
    }

    // Make sure any frontiers are in the work pool
    // If they have no frontier, we want to use their pub key?
    const hashes = this.wallet.accounts.filter(account => (account.receivePow === false)).
      map(account => account.frontier || this.util.account.getAccountPublicKey(account.id));
    console.log('Adding non-pending frontiers to work cache');
    hashes.forEach(hash => this.workPool.addWorkToCache(hash, 1)); // use high pow here since we don't know what tx type will be next

    this.wallet.balance = walletBalance;
    this.wallet.pending = walletPendingAboveThresholdConfirmed;

    this.wallet.balanceRaw = new BigNumber(walletBalance).mod(this.nano);
    this.wallet.pendingRaw = new BigNumber(walletPendingAboveThresholdConfirmed).mod(this.nano);

    this.wallet.balanceFiat = this.util.nano.rawToMnano(walletBalance).times(fiatPrice).toNumber();
    this.wallet.pendingFiat = this.util.nano.rawToMnano(walletPendingAboveThresholdConfirmed).times(fiatPrice).toNumber();

    // eslint-disable-next-line
    this.wallet.hasPending = walletPendingAboveThresholdConfirmed.gt(0);

    this.wallet.updatingBalance = false;
    this.wallet.balanceInitialized = true;

    if (this.wallet.pendingBlocks.length) {
      await this.processPendingBlocks();
    }
    this.informBalanceRefresh();
  }

  async loadWalletAccount(accountIndex, accountID) {
    const index = accountIndex;
    const addressBookName = this.addressBook.getAccountName(accountID);

    const newAccount: WalletAccount = {
      id: accountID,
      frontier: null,
      secret: null,
      keyPair: null,
      balance: new BigNumber(0),
      pending: new BigNumber(0),
      balanceRaw: new BigNumber(0),
      pendingRaw: new BigNumber(0),
      balanceFiat: 0,
      pendingFiat: 0,
      index: index,
      addressBookName,
      receivePow: false,
    };

    this.wallet.accounts.push(newAccount);
    this.websocket.subscribeAccounts([accountID]);

    return newAccount;
  }

  async addWalletAccount(accountIndex: number|null = null, reloadBalances: boolean = true) {
    // if (!this.wallet.seedBytes) return;
    let index = accountIndex;
    if (index === null) {
      index = 0; // Use the existing number, then increment it

      // Make sure the index is not being used (ie. if you delete acct 3/5, then press add twice, it goes 3, 6, 7)
      while (this.wallet.accounts.find(a => a.index === index)) index++;
    }

    let newAccount: WalletAccount|null;

    if (this.isSingleKeyWallet()) {
      throw new Error(`Wallet consists of a single private key.`);
    } else if (this.wallet.type === 'seed') {
      newAccount = await this.createSeedAccount(index);
    } else if (this.isLedgerWallet()) {
      try {
        newAccount = await this.createLedgerAccount(index);
      } catch (err) {
        // this.notifications.sendWarning(`Unable to load account from ledger.  Make sure it is connected`);
        throw err;
      }

    }

    this.wallet.accounts.push(newAccount);

    if (reloadBalances) await this.reloadBalances();

    this.websocket.subscribeAccounts([newAccount.id]);

    this.saveWalletExport();

    return newAccount;
  }

  async removeWalletAccount(accountID: string) {
    const walletAccount = this.getWalletAccount(accountID);
    if (!walletAccount) throw new Error(`Account is not in wallet`);

    const walletAccountIndex = this.wallet.accounts.findIndex(a => a.id === accountID);
    if (walletAccountIndex === -1) throw new Error(`Account is not in wallet`);

    this.wallet.accounts.splice(walletAccountIndex, 1);

    this.websocket.unsubscribeAccounts([accountID]);

    // Reload the balances, save new wallet state
    await this.reloadBalances();
    this.saveWalletExport();

    return true;
  }

  async trackAddress(address: string) {
    this.websocket.subscribeAccounts([address]);
    console.log('Tracking transactions on ' + address);
  }

  async untrackAddress(address: string) {
    this.websocket.unsubscribeAccounts([address]);
    console.log('Stopped tracking transactions on ' + address);
  }

  addPendingBlock(accountID, blockHash, amount, source) {
    if (this.successfulBlocks.indexOf(blockHash) !== -1) return false; // Already successful with this block

    const existingHash = this.wallet.pendingBlocks.find(b => b.hash === blockHash);

    if (existingHash) return false; // Already added

    this.wallet.pendingBlocks.push({ account: accountID, hash: blockHash, amount: amount, source: source });
    this.wallet.pendingBlocksUpdate$.next({
      account: accountID,
      sourceHash: blockHash,
      destinationHash: null,
      hasBeenReceived: false,
    });
    this.wallet.pendingBlocksUpdate$.next(null);
    return true;
  }

  // Remove a pending account from the pending list
  async removePendingBlock(blockHash) {
    const index = this.wallet.pendingBlocks.findIndex(b => b.hash === blockHash);
    this.wallet.pendingBlocks.splice(index, 1);
  }

  // Clear the list of pending blocks
  async clearPendingBlocks() {
    this.wallet.pendingBlocks.splice(0, this.wallet.pendingBlocks.length);
  }

  sortByAmount(a, b) {
    const x = new BigNumber(a.amount);
    const y = new BigNumber(b.amount);
    return y.comparedTo(x);
  }

  async processPendingBlocks() {
    if (this.processingPending || this.wallet.locked || !this.wallet.pendingBlocks.length || this.appSettings.settings.pendingOption === 'manual') return;

    // Sort pending by amount
    if (this.appSettings.settings.pendingOption === 'amount') {
      this.wallet.pendingBlocks.sort(this.sortByAmount);
    }

    this.processingPending = true;

    const nextBlock = this.wallet.pendingBlocks[0];
    if (this.successfulBlocks.find(b => b.hash === nextBlock.hash)) {
      return setTimeout(() => this.processPendingBlocks(), 1500); // Block has already been processed
    }
    const walletAccount = this.getWalletAccount(nextBlock.account);
    if (!walletAccount) {
      this.processingPending = false;
      return; // Dispose of the block, no matching account
    }

    const newHash = await this.nanoBlock.generateReceive(walletAccount, nextBlock.hash, this.isLedgerWallet());
    if (newHash) {
      if (this.successfulBlocks.length >= 15) this.successfulBlocks.shift();
      this.successfulBlocks.push(nextBlock.hash);

      const receiveAmount = this.util.nano.rawToMnano(nextBlock.amount);
      this.notifications.removeNotification('success-receive');
      this.notifications.sendSuccess(`Successfully received ${receiveAmount.isZero() ? '' : this.noZerosPipe.transform(receiveAmount.toFixed(6)) } XNO!`, { identifier: 'success-receive' });

      // remove after processing
      // list also updated with reloadBalances but not if called too fast
      this.removePendingBlock(nextBlock.hash);
      await this.reloadBalances();
      this.wallet.pendingBlocksUpdate$.next({
        account: nextBlock.account,
        sourceHash: nextBlock.hash,
        destinationHash: newHash,
        hasBeenReceived: true,
      });
      this.wallet.pendingBlocksUpdate$.next(null);
    } else {
      if (this.isLedgerWallet()) {
        this.processingPending = false;
        return null; // Denied to receive, stop processing
      }
      this.processingPending = false;
      return this.notifications.sendError(`There was a problem receiving the transaction, try manually!`, {length: 10000});
    }

    this.processingPending = false;

    setTimeout(() => this.processPendingBlocks(), 1500);
  }

  saveWalletExport() {
    const exportData = this.generateWalletExport();

    switch (this.appSettings.settings.walletStore) {
      case 'none':
        this.removeWalletData();
        break;
      default:
      case 'localStorage':
        localStorage.setItem(this.storeKey, JSON.stringify(exportData));
        break;
    }
  }

  removeWalletData() {
    localStorage.removeItem(this.storeKey);
  }

  generateWalletExport() {
    const data: any = {
      type: this.wallet.type,
      accounts: this.wallet.accounts.map(a => ({ id: a.id, index: a.index })),
      selectedAccountId: this.wallet.selectedAccount ? this.wallet.selectedAccount.id : null,
    };

    if (this.wallet.type === 'ledger') {
    } else {
      // Forcefully encrypt the seed so an unlocked wallet is never saved
      if (!this.wallet.locked) {
        const encryptedSeed = CryptoJS.AES.encrypt(this.wallet.seed, this.wallet.password || '');
        data.seed = encryptedSeed.toString();
      } else {
        data.seed = this.wallet.seed;
      }
      data.locked = true;
    }

    return data;
  }

  // Run an accountInfo call for each account in the wallet to get their representatives
  async getAccountsDetails(): Promise<WalletApiAccount[]> {
    return await Promise.all(
      this.wallet.accounts.map(account =>
        this.api.accountInfo(account.id)
          .then(res => {
            try {
              res.id = account.id;
              res.addressBookName = account.addressBookName;
            } catch {return null; }

            return res;
          })
      )
    );
  }

  // Subscribable event when a new wallet is created
  informNewWallet() {
    this.wallet.newWallet$.next(true);
    this.wallet.newWallet$.next(false);
  }

  // Subscribable event when balances has been refreshed
  informBalanceRefresh() {
    this.wallet.refresh$.next(true);
    this.wallet.refresh$.next(false);
  }

  requestWalletUnlock() {
    this.wallet.unlockModalRequested$.next(true);

    return new Promise(
      (resolve, reject) => {
        let subscriptionForUnlock;
        let subscriptionForCancel;

        const removeSubscriptions = () => {
          if (subscriptionForUnlock != null) {
            subscriptionForUnlock.unsubscribe();
          }

          if (subscriptionForCancel != null) {
            subscriptionForCancel.unsubscribe();
          }
        };

        subscriptionForUnlock =
          this.wallet.locked$.subscribe(async isLocked => {
            if (isLocked === false) {
              removeSubscriptions();

              const wasUnlocked = true;
              resolve(wasUnlocked);
            }
          });

        subscriptionForCancel =
          this.wallet.unlockModalRequested$.subscribe(async wasRequested => {
            if (wasRequested === false) {
              removeSubscriptions();

              const wasUnlocked = false;
              resolve(wasUnlocked);
            }
          });
      }
    );
  }
}
