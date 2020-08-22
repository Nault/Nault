import { Injectable } from '@angular/core';
import {ApiService} from './api.service';
import {UtilService, StateBlock, TxType} from './util.service';
import {WorkPoolService} from './work-pool.service';
import BigNumber from 'bignumber.js';
import {NotificationService} from './notification.service';
import {AppSettingsService} from './app-settings.service';
import {LedgerService} from './ledger.service';
import { WalletAccount } from './wallet.service';
import {BehaviorSubject} from 'rxjs';
const nacl = window['nacl'];

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
  ];

  zeroHash = '0000000000000000000000000000000000000000000000000000000000000000';

  newOpenBlock$: BehaviorSubject<boolean|false> = new BehaviorSubject(false);

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
    const link = this.zeroHash;
    const blockData = {
      type: 'state',
      account: walletAccount.id,
      previous: toAcct.frontier,
      representative: representativeAccount,
      balance: balanceDecimal,
      link: link,
      signature: null,
      work: null,
    };

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
        blockData.signature = sig.signature;
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

    const processResponse = await this.api.process(blockData, TxType.change);
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
    const blockData = {
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

    const processResponse = await this.api.process(blockData, TxType.send);
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
    const blockData = {
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
    const processResponse = await this.api.process(blockData, openEquiv ? TxType.open : TxType.receive);
    if (processResponse && processResponse.hash) {
      walletAccount.frontier = processResponse.hash;
      this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
      this.workPool.removeFromCache(workBlock);

      // update the rep view via subscription
      if (openEquiv) {
        this.informNewRep();
      }
      return processResponse.hash;
    } else {
      return null;
    }
  }

  // for signing block when offline
  async signOfflineBlock(walletAccount: WalletAccount, block: StateBlock, prevBlock: StateBlock,
    type: TxType, genWork: boolean, multiplier: number, ledger = false) {
    // special treatment if open block
    const openEquiv = type === TxType.open;
    console.log('Signing block of subtype: ' + TxType[type]);

    if (ledger) {
      let ledgerBlock = null;
      if (type === TxType.send) {
        ledgerBlock = {
          previousBlock: block.previous,
          representative: block.representative,
          balance: block.balance,
          recipient: this.util.account.getPublicAccountID(this.util.hex.toUint8(block.link)),
        };
      } else if (type === TxType.receive || type === TxType.open) {
        ledgerBlock = {
          representative: block.representative,
          balance: block.balance,
          sourceBlock: block.link,
        };
        if (!openEquiv) {
          ledgerBlock.previousBlock = block.previous;
        }
      } else if (type === TxType.change) {
        ledgerBlock = {
          previousBlock: block.previous,
          representative: block.representative,
          balance: block.balance,
        };
      }
      try {
        this.sendLedgerNotification();
        // On new accounts, we do not need to cache anything
        if (!openEquiv) {
          try {
            // await this.ledgerService.updateCache(walletAccount.index, block.previous);
            await this.ledgerService.updateCacheOffline(walletAccount.index, prevBlock);
          } catch (err) {console.log(err); }
        }
        const sig = await this.ledgerService.signBlock(walletAccount.index, ledgerBlock);
        this.clearLedgerNotification();
        block.signature = sig.signature;
      } catch (err) {
        this.clearLedgerNotification();
        this.sendLedgerDeniedNotification(err);
        return null;
      }
    } else {
      this.signStateBlock(walletAccount, block);
    }

    if (genWork) {
      // For open blocks which don't have a frontier, use the public key of the account
      const workBlock = openEquiv ? this.util.account.getAccountPublicKey(walletAccount.id) : block.previous;
      if (!this.workPool.workExists(workBlock)) {
        this.notifications.sendInfo(`Generating Proof of Work...`);
      }

      block.work = await this.workPool.getWork(workBlock, multiplier);
      this.workPool.removeFromCache(workBlock);
    }
    return block; // return signed block (with or without work)
  }

  async validateAccount(accountInfo) {
    if (!accountInfo) return;
    if (!accountInfo.frontier || accountInfo.frontier === this.zeroHash) {
      if (accountInfo.balance && accountInfo.balance !== '0') {
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
    if (this.util.hex.fromUint8(this.util.nano.hashStateBlock(blockData.contents)) !== accountInfo.frontier) {
      throw new Error(`Frontier hash didn't match block data`);
    }
  }

  // Sign a state block, and insert the signature into the block.
  signStateBlock(walletAccount, blockData) {
    const hashBytes = this.util.nano.hashStateBlock(blockData);
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

  // Subscribable event when a new open block and we should update the rep info
  informNewRep() {
    this.newOpenBlock$.next(true);
    this.newOpenBlock$.next(false);
  }

}
