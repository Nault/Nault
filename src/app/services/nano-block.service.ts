import { Injectable } from '@angular/core';
import {ApiService} from "./api.service";
import {UtilService} from "./util.service";
import * as blake from 'blakejs';
import {WorkPoolService} from "./work-pool.service";
const nacl = window['nacl'];

@Injectable()
export class NanoBlockService {
  representativeAccount = 'xrb_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy'; // Official Representative 6

  constructor(private api: ApiService, private util: UtilService, private workPool: WorkPoolService) { }

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

    const response = await this.workPool.getWork(workBlock);
    const work = response.work;
    blockData.work = work;
    const processResponse = await this.api.process(blockData);
    if (processResponse && processResponse.hash) {
      walletAccount.frontier = processResponse.hash;
      this.workPool.addToPool(processResponse.hash); // Add new hash into the work pool
      return processResponse.hash;
    } else {
      return null;
    }

  }

}
