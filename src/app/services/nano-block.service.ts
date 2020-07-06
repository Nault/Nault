import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {UtilService} from "./util.service";
import * as blake from 'blakejs';
import {WorkPoolService} from "./work-pool.service";
import BigNumber from "bignumber.js";
import {NotificationService} from "./notification.service";
import {AppSettingsService} from "./app-settings.service";
import {WalletService} from "./wallet.service";
import {LedgerService} from "./ledger.service";
import {Observable} from "rxjs";
const nacl = window['nacl'];

const STATE_BLOCK_PREAMBLE = '0000000000000000000000000000000000000000000000000000000000000006';

@Injectable()
export class NanoBlockService {
  representativeAccounts = [
    'nano_1center16ci77qw5w69ww8sy4i4bfmgfhr81ydzpurm91cauj11jn6y3uc5y', // The Nano Center
    'nano_1x7biz69cem95oo7gxkrw6kzhfywq4x5dupw4z1bdzkb74dk9kpxwzjbdhhs', // NanoCrawler
    'nano_1thingspmippfngcrtk1ofd3uwftffnu4qu9xkauo9zkiuep6iknzci3jxa6', // NanoThings
    'nano_3rpixaxmgdws7nk7sx6owp8d8becj9ei5nef6qiwokgycsy9ufytjwgj6eg9', // repnode.org
    'nano_3chartsi6ja8ay1qq9xg3xegqnbg1qx76nouw6jedyb8wx3r4wu94rxap7hg', // Nano Charts
    'nano_1ninja7rh37ehfp9utkor5ixmxyg8kme8fnzc4zty145ibch8kf5jwpnzr3r', // My Nano Ninja
    'nano_1iuz18n4g4wfp9gf7p1s8qkygxw7wx9qfjq6a9aq68uyrdnningdcjontgar', // NanoTicker / Json
  ]

  zeroHash = '0000000000000000000000000000000000000000000000000000000000000000'

  constructor(
    private api: ApiService,
    private util: UtilService,
    private workPool: WorkPoolService,
    private notifications: NotificationService,
    private ledgerService: LedgerService,
    public settings: AppSettingsService) { }

  async generateChange(walletAccount, representativeAccount, ledger = false) {
    const toAcct = await this.api.accountInfo(walletAccount.id);
    if (!toAcct) throw new Error(`Account must have an open block first`);

    const balance = new BigNumber(toAcct.balance);
    const balanceDecimal = balance.toString(10);
    let link = this.zeroHash;
    let blockData = {
      type: 'state',
      account: walletAccount.id,
      previous: toAcct.frontier,
      representative: representativeAccount,
      balance: balanceDecimal,
      link: link,
      signature: null,
      work: null,
    };

    let signature = null;
    if (ledger) {
      const ledgerBlock = {
        previousBlock: toAcct.frontier,
        representative: representativeAccount,
        balance: balanceDecimal,
      };
      try {
        this.sendLedgerNotification();
        await this.ledgerService.updateCache(walletAccount.index, toAcct.frontier);
        const sig = await this.ledgerService.signBlock(walletAccount.index, ledgerBlock);
        this.clearLedgerNotification();
        signature = sig.signature;
      } catch (err) {
        this.clearLedgerNotification();
        this.sendLedgerDeniedNotification();
        return;
      }
    } else {
      this.validateAccount(toAcct);
      this.signStateBlock(walletAccount, blockData);
    }

    if (!this.workPool.workExists(toAcct.frontier)) {
      this.notifications.sendInfo(`Generating Proof of Work...`);
    }

    blockData.work = await this.workPool.getWork(toAcct.frontier);

    const processResponse = await this.api.process(blockData);
    if (processResponse && processResponse.hash) {
      walletAccount.frontier = processResponse.hash;
      this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
      this.workPool.removeFromCache(toAcct.frontier);
      return processResponse.hash;
    } else {
      return null;
    }
  }

  // This might be used in the future to send state changes on the blocks instead of normal true/false
  // subscribeSend(walletAccount, toAccountID, rawAmount, ledger = false): Observable {
  //   const doSend = async (observable) => {
  //     console.log(`OBS: Promise resolve, running main send logic.`);
  //     const startTime = Date.now();
  //
  //     console.log(`Observable: Creation event run`);
  //     observable.next({ step: 0, startTime: startTime });
  //
  //
  //     const fromAccount = await this.api.accountInfo(walletAccount.id);
  //     if (!fromAccount) throw new Error(`Unable to get account information for ${walletAccount.id}`);
  //
  //     const remaining = new BigNumber(fromAccount.balance).minus(rawAmount);
  //     const remainingDecimal = remaining.toString(10);
  //     let remainingPadded = remaining.toString(16);
  //     while (remainingPadded.length < 32) remainingPadded = '0' + remainingPadded; // Left pad with 0's
  //
  //     let blockData;
  //     const representative = fromAccount.representative || (this.settings.settings.defaultRepresentative || this.representativeAccount);
  //
  //     observable.next({ step: 1, startTime: startTime, eventTime: ((Date.now() - startTime) / 1000).toFixed(3) });
  //
  //     let signature = null;
  //     if (ledger) {
  //       const ledgerBlock = {
  //         previousBlock: fromAccount.frontier,
  //         representative: representative,
  //         balance: remainingDecimal,
  //         recipient: toAccountID,
  //       };
  //       try {
  //         this.sendLedgerNotification();
  //         await this.ledgerService.updateCache(walletAccount.index, fromAccount.frontier);
  //         const sig = await this.ledgerService.signBlock(walletAccount.index, ledgerBlock);
  //         this.clearLedgerNotification();
  //         signature = sig.signature;
  //
  //         observable.next({ step: 2, startTime: startTime, eventTime: ((Date.now() - startTime) / 1000).toFixed(3) });
  //       } catch (err) {
  //         this.clearLedgerNotification();
  //         this.sendLedgerDeniedNotification(err);
  //         return;
  //       }
  //     } else {
  //       signature = this.signSendBlock(walletAccount, fromAccount, representative, remainingPadded, toAccountID);
  //       observable.next({ step: 2, startTime: startTime, eventTime: ((Date.now() - startTime) / 1000).toFixed(3) });
  //     }
  //
  //     if (!this.workPool.workExists(fromAccount.frontier)) {
  //       this.notifications.sendInfo(`Generating Proof of Work...`);
  //     }
  //
  //     blockData = {
  //       type: 'state',
  //       account: walletAccount.id,
  //       previous: fromAccount.frontier,
  //       representative: representative,
  //       balance: remainingDecimal,
  //       link: this.util.account.getAccountPublicKey(toAccountID),
  //       work: await this.workPool.getWork(fromAccount.frontier),
  //       signature: signature,
  //     };
  //
  //     observable.next({ step: 3, startTime: startTime, eventTime: ((Date.now() - startTime) / 1000).toFixed(3) });
  //
  //     const processResponse = await this.api.process(blockData);
  //     if (!processResponse || !processResponse.hash) throw new Error(processResponse.error || `Node returned an error`);
  //
  //     observable.next({ step: 4, startTime: startTime, eventTime: ((Date.now() - startTime) / 1000).toFixed(3) });
  //
  //     walletAccount.frontier = processResponse.hash;
  //     this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
  //     this.workPool.removeFromCache(fromAccount.frontier);
  //
  //     observable.complete();
  //   };
  //
  //
  //   console.log(`Creating observable... on send...`);
  //   // Create an observable that can be returned instantly.
  //   return new Observable(observable => {
  //
  //     doSend(observable).then(val => console.log(val));
  //   });
  //
  // }

  async generateSend(walletAccount, toAccountID, rawAmount, ledger = false) {
    const fromAccount = await this.api.accountInfo(walletAccount.id);
    if (!fromAccount) throw new Error(`Unable to get account information for ${walletAccount.id}`);

    const remaining = new BigNumber(fromAccount.balance).minus(rawAmount);
    const remainingDecimal = remaining.toString(10);

    const representative = fromAccount.representative || (this.settings.settings.defaultRepresentative || this.getRandomRepresentative());
    let blockData = {
      type: 'state',
      account: walletAccount.id,
      previous: fromAccount.frontier,
      representative: representative,
      balance: remainingDecimal,
      link: this.util.account.getAccountPublicKey(toAccountID),
      work: null,
      signature: null,
    };

    if (ledger) {
      const ledgerBlock = {
        previousBlock: fromAccount.frontier,
        representative: representative,
        balance: remainingDecimal,
        recipient: toAccountID,
      };
      try {
        this.sendLedgerNotification();
        await this.ledgerService.updateCache(walletAccount.index, fromAccount.frontier);
        const sig = await this.ledgerService.signBlock(walletAccount.index, ledgerBlock);
        this.clearLedgerNotification();
        blockData.signature = sig.signature;
      } catch (err) {
        this.clearLedgerNotification();
        this.sendLedgerDeniedNotification(err);
        return;
      }
    } else {
      this.validateAccount(fromAccount);
      this.signStateBlock(walletAccount, blockData);
    }

    if (!this.workPool.workExists(fromAccount.frontier)) {
      this.notifications.sendInfo(`Generating Proof of Work...`);
    }

    blockData.work = await this.workPool.getWork(fromAccount.frontier);

    const processResponse = await this.api.process(blockData);
    if (!processResponse || !processResponse.hash) throw new Error(processResponse.error || `Node returned an error`);

    walletAccount.frontier = processResponse.hash;
    this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
    this.workPool.removeFromCache(fromAccount.frontier);

    return processResponse.hash;
  }

  async generateReceive(walletAccount, sourceBlock, ledger = false) {
    const toAcct = await this.api.accountInfo(walletAccount.id);
    let workBlock = null;

    const openEquiv = !toAcct || !toAcct.frontier;

    const previousBlock = toAcct.frontier || this.zeroHash;
    const representative = toAcct.representative || (this.settings.settings.defaultRepresentative || this.getRandomRepresentative());

    const srcBlockInfo = await this.api.blocksInfo([sourceBlock]);
    const srcAmount = new BigNumber(srcBlockInfo.blocks[sourceBlock].amount);
    const newBalance = openEquiv ? srcAmount : new BigNumber(toAcct.balance).plus(srcAmount);
    const newBalanceDecimal = newBalance.toString(10);
    let newBalancePadded = newBalance.toString(16);
    while (newBalancePadded.length < 32) newBalancePadded = '0' + newBalancePadded; // Left pad with 0's
    let blockData = {
      type: 'state',
      account: walletAccount.id,
      previous: previousBlock,
      representative: representative,
      balance: newBalanceDecimal,
      link: sourceBlock,
      signature: null,
      work: null
    };

    // We have everything we need, we need to obtain a signature
    if (ledger) {
      const ledgerBlock: any = {
        representative: representative,
        balance: newBalanceDecimal,
        sourceBlock: sourceBlock,
      };
      if (!openEquiv) {
        ledgerBlock.previousBlock = toAcct.frontier;
      }
      try {
        this.sendLedgerNotification();
        // On new accounts, we do not need to cache anything
        if (!openEquiv) {
          await this.ledgerService.updateCache(walletAccount.index, toAcct.frontier);
        }
        const sig = await this.ledgerService.signBlock(walletAccount.index, ledgerBlock);
        this.notifications.removeNotification('ledger-sign');
        blockData.signature = sig.signature.toUpperCase();
      } catch (err) {
        this.notifications.removeNotification('ledger-sign');
        this.notifications.sendWarning(err.message || `Transaction denied on Ledger device`);
        return;
      }
    } else {
      this.validateAccount(toAcct);
      this.signStateBlock(walletAccount, blockData);
    }

    workBlock = openEquiv ? this.util.account.getAccountPublicKey(walletAccount.id) : previousBlock;
    if (!this.workPool.workExists(workBlock)) {
      this.notifications.sendInfo(`Generating Proof of Work...`);
    }

    blockData.work = await this.workPool.getWork(workBlock);
    const processResponse = await this.api.process(blockData);
    if (processResponse && processResponse.hash) {
      walletAccount.frontier = processResponse.hash;
      this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
      this.workPool.removeFromCache(workBlock);
      return processResponse.hash;
    } else {
      return null;
    }
  }

  async validateAccount(accountInfo) {
    if (!accountInfo) return;
    if (!accountInfo.frontier || accountInfo.frontier === this.zeroHash) {
      if (accountInfo.balance && accountInfo.balance !== "0") {
        throw new Error(`Frontier not set, but existing account balance is nonzero`);
      }
      if (accountInfo.representative) {
        throw new Error(`Frontier not set, but existing account representative is set`);
      }
      return;
    }
    const blockResponse = await this.api.blocksInfo([accountInfo.frontier]);
    const blockData = blockResponse.blocks[accountInfo.frontier];
    if (!blockData) throw new Error(`Unable to load block data`);
    blockData.contents = JSON.parse(blockData.contents);
    if (accountInfo.balance !== blockData.contents.balance || accountInfo.representative !== blockData.contents.representative) {
      throw new Error(`Frontier block data doesn't match account info`);
    }
    if (blockData.contents.type !== 'state') {
      throw new Error(`Frontier block wasn't a state block, which shouldn't be possible`);
    }
    if (this.util.hex.fromUint8(this.hashStateBlock(blockData.contents)) !== accountInfo.frontier) {
      throw new Error(`Frontier hash didn't match block data`);
    }
  }

  hashStateBlock(block) {
    const balance = new BigNumber(block.balance);
    if (balance.isNegative() || balance.isNaN()) {
      throw new Error(`Negative or NaN balance`);
    }
    let balancePadded = balance.toString(16);
    while (balancePadded.length < 32) balancePadded = '0' + balancePadded; // Left pad with 0's
    const context = blake.blake2bInit(32, null);
    blake.blake2bUpdate(context, this.util.hex.toUint8(STATE_BLOCK_PREAMBLE));
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(block.account)));
    blake.blake2bUpdate(context, this.util.hex.toUint8(block.previous));
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(block.representative)));
    blake.blake2bUpdate(context, this.util.hex.toUint8(balancePadded));
    blake.blake2bUpdate(context, this.util.hex.toUint8(block.link));
    return blake.blake2bFinal(context);
  }

  // Sign a state block, and insert the signature into the block.
  signStateBlock(walletAccount, blockData) {
    const hashBytes = this.hashStateBlock(blockData);
    const privKey = walletAccount.keyPair.secretKey;
    const signed = nacl.sign.detached(hashBytes, privKey, walletAccount.keyPair.expanded);
    blockData.signature = this.util.hex.fromUint8(signed);
  }

  sendLedgerDeniedNotification(err = null) {
    this.notifications.sendWarning(err && err.message || `Transaction denied on Ledger device`);
  }
  sendLedgerNotification() {
    this.notifications.sendInfo(`Waiting for confirmation on Ledger Device...`, { identifier: 'ledger-sign', length: 0 });
  }
  clearLedgerNotification() {
    this.notifications.removeNotification('ledger-sign');
  }

  getRandomRepresentative() {
    return this.representativeAccounts[Math.floor(Math.random() * this.representativeAccounts.length)];
  }

}
