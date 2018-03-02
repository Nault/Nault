import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {UtilService} from "./util.service";
import * as blake from 'blakejs';
import {WorkPoolService} from "./work-pool.service";
import BigNumber from "bignumber.js";
import {NotificationService} from "./notification.service";
const nacl = window['nacl'];

@Injectable()
export class NanoBlockService {
  representativeAccount = 'xrb_3rw4un6ys57hrb39sy1qx8qy5wukst1iiponztrz9qiz6qqa55kxzx4491or'; // NanoVault Representative

  constructor(private api: ApiService, private util: UtilService, private workPool: WorkPoolService, private notifications: NotificationService) { }

  async generateChange(walletAccount, representativeAccount) {
    const toAcct = await this.api.accountInfo(walletAccount.id);
    if (!toAcct) throw new Error(`Account must have an open block first`);

    const context = blake.blake2bInit(32, null);
    blake.blake2bUpdate(context, this.util.hex.toUint8(toAcct.frontier));
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(representativeAccount)));
    const hashBytes = blake.blake2bFinal(context);

    const privKey = walletAccount.keyPair.secretKey;
    const signed = nacl.sign.detached(hashBytes, privKey);
    const signature = this.util.hex.fromUint8(signed);

    if (!this.workPool.workExists(toAcct.frontier)) {
      this.notifications.sendInfo(`Generating Proof of Work...`);
    }

    const blockData = {
      type: 'change',
      previous: toAcct.frontier,
      representative: representativeAccount,
      signature: signature,
      work: await this.workPool.getWork(toAcct.frontier),
    };

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

  async generateSend(walletAccount, toAccountID, rawAmount) {
    const fromAccount = await this.api.accountInfo(walletAccount.id);
    if (!fromAccount) throw new Error(`Unable to get account information for ${walletAccount.id}`);

    const remaining = new BigNumber(fromAccount.balance).minus(rawAmount);
    let remainingPadded = remaining.toString(16);
    while (remainingPadded.length < 32) remainingPadded = '0' + remainingPadded; // Left pad with 0's

    const context = blake.blake2bInit(32, null);
    blake.blake2bUpdate(context, this.util.hex.toUint8(fromAccount.frontier));
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(toAccountID)));
    blake.blake2bUpdate(context, this.util.hex.toUint8(remainingPadded));
    const hashBytes = blake.blake2bFinal(context);

    // Sign the hash bytes with the account priv key bytes
    const signed = nacl.sign.detached(hashBytes, walletAccount.keyPair.secretKey);
    const signature = this.util.hex.fromUint8(signed);

    if (!this.workPool.workExists(fromAccount.frontier)) {
      this.notifications.sendInfo(`Generating Proof of Work...`);
    }

    const blockData = {
      type: 'send',
      previous: fromAccount.frontier,
      destination: toAccountID,
      balance: remainingPadded,
      work: await this.workPool.getWork(fromAccount.frontier),
      signature: signature,
    };

    const processResponse = await this.api.process(blockData);
    if (!processResponse || !processResponse.hash) throw new Error(processResponse.error || `Node returned an error`);

    walletAccount.frontier = processResponse.hash;
    this.workPool.addWorkToCache(processResponse.hash); // Add new hash into the work pool
    this.workPool.removeFromCache(fromAccount.frontier);

    return processResponse.hash;
  }

  async generateReceive(walletAccount, sourceBlock) {
    const toAcct = await this.api.accountInfo(walletAccount.id);
    let blockData: any = {};
    let workBlock = null;

    if (!toAcct || !toAcct.frontier) {
      // This is an open block!
      const context = blake.blake2bInit(32, null);
      blake.blake2bUpdate(context, this.util.hex.toUint8(sourceBlock));
      blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(this.representativeAccount)));
      blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(walletAccount.id)));
      const hashBytes = blake.blake2bFinal(context);

      const privKey = walletAccount.keyPair.secretKey;
      const signed = nacl.sign.detached(hashBytes, privKey);
      const signature = this.util.hex.fromUint8(signed);
      const PK = this.util.account.getAccountPublicKey(walletAccount.id);

      workBlock = PK;
      blockData = {
        type: 'open',
        account: walletAccount.id,
        representative: this.representativeAccount,
        source: sourceBlock,
        signature: signature,
        work: null,
      };
    } else {
      const previousBlock = toAcct.frontier;
      const context = blake.blake2bInit(32, null);
      blake.blake2bUpdate(context, this.util.hex.toUint8(previousBlock));
      blake.blake2bUpdate(context, this.util.hex.toUint8(sourceBlock));
      const hashBytes = blake.blake2bFinal(context);

      const privKey = walletAccount.keyPair.secretKey;
      const signed = nacl.sign.detached(hashBytes, privKey);
      const signature = this.util.hex.fromUint8(signed);

      workBlock = previousBlock;
      blockData = {
        type: 'receive',
        previous: previousBlock,
        source: sourceBlock,
        signature: signature,
        work: null,
      };
    }

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

}
