import { Component, OnInit } from '@angular/core';
import BigNumber from "bignumber.js";
import {AddressBookService} from "../../services/address-book.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ApiService} from "../../services/api.service";
import {UtilService} from "../../services/util.service";

import * as blake from 'blakejs';
import {WorkPoolService} from "../../services/work-pool.service";
import {AppSettingsService} from "../../services/app-settings.service";

const nacl = window['nacl'];

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css']
})
export class SendComponent implements OnInit {
  activePanel = 'send';

  accounts = this.walletService.wallet.accounts;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;

  amounts = [
    { name: 'XRB', shortName: 'XRB', value: 'mrai' },
    { name: 'KRAI (0.001 XRB)', shortName: 'KRAI', value: 'krai' },
    { name: 'RAI (0.000001 XRB)', shortName: 'RAI', value: 'rai' },
  ];
  selectedAmount = this.amounts[0];

  amount = 0;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccount: any = {};
  fromAccountID: any = '';
  toAccount: any = false;
  toAccountID: '';
  toAccountStatus = null;
  confirmingTransaction: boolean = false;

  constructor(
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nodeApi: ApiService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private util: UtilService) { }

  async ngOnInit() {
    await this.addressBookService.loadAddressBook();
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

  selectBookEntry(account) {
    this.showAddressBook = false;
    this.toAccountID = account;
    this.searchAddressBook();
    this.validateDestination();
  }

  async validateDestination() {
    // The timeout is used to solve a bug where the results get hidden too fast and the click is never registered
    setTimeout(() => this.showAddressBook = false, 400);

    // const accountInfo = await this.walletService.walletApi.accountInfo(this.toAccountID);
    const accountInfo = await this.nodeApi.accountInfo(this.toAccountID);
    if (accountInfo.error) {
      if (accountInfo.error == 'Account not found') {
        this.toAccountStatus = 1;
      } else {
        this.toAccountStatus = 0;
      }
    }
    if (accountInfo && accountInfo.frontier) {
      this.toAccountStatus = 2;
    }
  }

  async sendTransaction() {
    const isValid = await this.nodeApi.validateAccountNumber(this.toAccountID);
    if (!isValid || isValid.valid == '0') return this.notificationService.sendWarning(`To account address is not valid`);
    if (!this.fromAccountID || !this.toAccountID) return this.notificationService.sendWarning(`From and to account are required`);

    const from = await this.nodeApi.accountInfo(this.fromAccountID);
    const to = await this.nodeApi.accountInfo(this.toAccountID);
    if (!from) return this.notificationService.sendError(`From account not found`);

    from.balanceBN = new BigNumber(from.balance || 0);
    to.balanceBN = new BigNumber(to.balance || 0);

    this.fromAccount = from;
    this.toAccount = to;

    const rawAmount = this.getAmountBaseValue(this.amount || 0);
    this.rawAmount = rawAmount;

    if (this.amount < 0 || rawAmount.lessThan(0)) return this.notificationService.sendWarning(`Amount is invalid`);
    if (from.balanceBN.minus(rawAmount).lessThan(0)) return this.notificationService.sendError(`From account does not have enough XRB`);

    // Start precopmuting the work...
    this.workPool.addToPool(this.fromAccount.frontier);

    this.activePanel = 'confirm';
  }

  async confirmTransaction() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id == this.fromAccountID);
    if (!walletAccount) throw new Error(`unable to find sending account in wallet`);
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    this.confirmingTransaction = true;

    const remaining = new BigNumber(this.fromAccount.balance).minus(this.rawAmount);

    let remainingNew = remaining.toString(16);
    while (remainingNew.length < 32) {
      remainingNew = '0' + remainingNew;
    }

    const context = blake.blake2bInit(32, null);
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.fromAccount.frontier));
    blake.blake2bUpdate(context, this.util.hex.toUint8(this.util.account.getAccountPublicKey(this.toAccountID)));
    blake.blake2bUpdate(context, this.util.hex.toUint8(remainingNew));
    const hashBytes = blake.blake2bFinal(context);

    // Sign the hash bytes with the account priv key bytes
    const signed = nacl.sign.detached(hashBytes, walletAccount.keyPair.secretKey);
    const signature = this.util.hex.fromUint8(signed);

    // Now we just need work...
    const blockData = {
      type: 'send',
      previous: this.fromAccount.frontier,
      destination: this.toAccountID,
      balance: remainingNew,
      work: null,
      signature: signature,
    };

    const response = await this.workPool.getWork(this.fromAccount.frontier);

    blockData.work = response.work;

    // Send to process?
    const processResponse = await this.nodeApi.process(blockData);
    if (processResponse && processResponse.hash) {
      this.activePanel = 'send';
      walletAccount.frontier = processResponse.hash;
      this.notificationService.sendSuccess(`Successfully sent ${this.amount} ${this.selectedAmount.shortName}!`);
      this.workPool.addToPool(processResponse.hash); // Add new hash to work pool
    } else {
      this.notificationService.sendError(`There was an error sending your transaction: ${processResponse.message}`)
    }
    this.confirmingTransaction = false;

    await this.walletService.reloadBalances();
  }

  getAmountBaseValue(value) {

    switch (this.selectedAmount.value) {
      default:
      case 'rai': return this.util.xrb.raiToRaw(value);
      case 'mrai': return this.util.xrb.xrbToRaw(value);
      case 'krai': return this.util.xrb.kraiToRaw(value);
      // case 'rai': return await this.nodeApi.raiToRaw(value);
      // case 'mrai': return await this.nodeApi.mraiToRaw(value);
      // case 'krai': return await this.nodeApi.kraiToRaw(value);
    }
  }

}
