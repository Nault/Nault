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
import {ActivatedRoute, ActivatedRouteSnapshot} from "@angular/router";
import {PriceService} from "../../services/price.service";
import {NanoBlockService} from "../../services/nano-block.service";

const nacl = window['nacl'];

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css']
})
export class SendComponent implements OnInit {
  nano = 1000000000000000000000000;

  activePanel = 'send';

  accounts = this.walletService.wallet.accounts;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';

  amounts = [
    { name: 'NANO (1 Mnano)', shortName: 'NANO', value: 'mnano' },
    { name: 'knano (0.001 Mnano)', shortName: 'knano', value: 'knano' },
    { name: 'nano (0.000001 Mnano)', shortName: 'nano', value: 'nano' },
  ];
  selectedAmount = this.amounts[0];

  amount = null;
  amountRaw = new BigNumber(0);
  amountFiat: number = 0;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccount: any = {};
  fromAccountID: any = '';
  fromAddressBook = '';
  toAccount: any = false;
  toAccountID: string = '';
  toAddressBook = '';
  toAccountStatus = null;
  confirmingTransaction: boolean = false;

  constructor(
    private router: ActivatedRoute,
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nodeApi: ApiService,
    private nanoBlock: NanoBlockService,
    public price: PriceService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private util: UtilService) { }

  async ngOnInit() {
    const params = this.router.snapshot.queryParams;
    if (params && params.amount) {
      this.amount = params.amount;
    }
    if (params && params.to) {
      this.toAccountID = params.to;
      this.validateDestination();
    }

    this.addressBookService.loadAddressBook();
    // Look for the first account that has a balance
    const accountIDWithBalance = this.accounts.reduce((previous, current) => {
      if (previous) return previous;
      if (current.balance.gt(0)) return current.id;
      return null;
    }, null);

    this.fromAccountID = accountIDWithBalance || this.accounts.length ? this.accounts[0].id : '';
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

    // Remove spaces from the account id
    this.toAccountID = this.toAccountID.replace(/ /g, '');

    this.addressBookMatch = this.addressBookService.getAccountName(this.toAccountID);

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
    if (this.fromAccountID == this.toAccountID) return this.notificationService.sendWarning(`From and to account cannot be the same`);

    from.balanceBN = new BigNumber(from.balance || 0);
    to.balanceBN = new BigNumber(to.balance || 0);

    this.fromAccount = from;
    this.toAccount = to;

    const rawAmount = this.getAmountBaseValue(this.amount || 0);
    this.rawAmount = rawAmount.plus(this.amountRaw);

    const nanoAmount = this.rawAmount.div(this.nano);

    if (this.amount < 0 || rawAmount.lessThan(0)) return this.notificationService.sendWarning(`Amount is invalid`);
    if (nanoAmount.lessThan(1)) return this.notificationService.sendWarning(`Transactions for less than 1 nano will be ignored by the node.  Send raw amounts with at least 1 nano.`);
    if (from.balanceBN.minus(rawAmount).lessThan(0)) return this.notificationService.sendError(`From account does not have enough XRB`);

    // Determine a proper raw amount to show in the UI, if a decimal was entered
    this.amountRaw = this.rawAmount.mod(this.nano);

    // Determine fiat value of the amount
    this.amountFiat = this.util.nano.rawToMnano(rawAmount).times(this.price.price.lastPrice).toNumber();

    // Start precopmuting the work...
    this.fromAddressBook = this.addressBookService.getAccountName(this.fromAccountID);
    this.toAddressBook = this.addressBookService.getAccountName(this.toAccountID);
    this.workPool.addWorkToCache(this.fromAccount.frontier);

    this.activePanel = 'confirm';
  }

  async confirmTransaction() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id == this.fromAccountID);
    if (!walletAccount) throw new Error(`Unable to find sending account in wallet`);
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    this.confirmingTransaction = true;

    try {
      const newHash = await this.nanoBlock.generateSend(walletAccount, this.toAccountID, this.rawAmount);
      if (newHash) {
        this.notificationService.sendSuccess(`Successfully sent ${this.amount} ${this.selectedAmount.shortName}!`);
        this.activePanel = 'send';
        this.amount = null;
        this.resetRaw();
        this.toAccountID = '';
        this.toAccountStatus = null;
        this.fromAddressBook = '';
        this.toAddressBook = '';
        this.addressBookMatch = '';
      } else {
        this.notificationService.sendError(`There was an error sending your transaction, please try again.`)
      }
    } catch (err) {
      this.notificationService.sendError(`There was an error sending your transaction: ${err.message}`)
    }


    this.confirmingTransaction = false;

    await this.walletService.reloadBalances();
  }

  setMaxAmount() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.fromAccountID);
    if (!walletAccount) return;

    this.amountRaw = walletAccount.balanceRaw;

    const nanoVal = this.util.nano.rawToNano(walletAccount.balance).floor();
    const maxAmount = this.getAmountValueFromBase(this.util.nano.nanoToRaw(nanoVal));
    this.amount = maxAmount.toNumber();
  }

  resetRaw() {
    this.amountRaw = new BigNumber(0);
  }

  getAmountBaseValue(value) {

    switch (this.selectedAmount.value) {
      default:
      case 'nano': return this.util.nano.nanoToRaw(value);
      case 'knano': return this.util.nano.knanoToRaw(value);
      case 'mnano': return this.util.nano.mnanoToRaw(value);
    }
  }

  getAmountValueFromBase(value) {
    switch (this.selectedAmount.value) {
      default:
      case 'nano': return this.util.nano.rawToNano(value);
      case 'knano': return this.util.nano.rawToKnano(value);
      case 'mnano': return this.util.nano.rawToMnano(value);
    }
  }

}
