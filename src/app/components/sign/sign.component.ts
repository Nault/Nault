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
import {NanoBlockService} from "../../services/nano-block.service";
import * as nanocurrency from 'nanocurrency';

export interface Block {
  account: string;
  previous: string;
  representative: string;
  balance: BigNumber;
  link: string;
}

export enum TxType {"send", "receive"};

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
  currentBlock: Block = null;
  previousBlock: Block = null;
  txType: TxType = null;
  confirmingTransaction = false;
  shouldGenWork = false;

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
      this.currentBlock = {'account': params.n_account, 'previous': params.n_previous, 'representative': params.n_representative, 'balance': new BigNumber(params.n_balance), 'link': params.n_link};
      this.previousBlock = {'account': params.p_account, 'previous': params.p_previous, 'representative': params.p_representative, 'balance': new BigNumber(params.p_balance), 'link': params.p_link};

      // check if both new block and previous block hashes matches (balances has not been tampered with) and have valid parameters
      if (this.verifyBlocks(this.currentBlock, this.previousBlock)) {
        if (this.previousBlock.balance.gte(this.currentBlock.balance)) {
          // it's a send block
          if (this.previousBlock.balance.gt(this.currentBlock.balance)) {
            this.txType = TxType.send;
            this.rawAmount = (this.previousBlock.balance.minus(this.currentBlock.balance));
            this.fromAccountID = this.currentBlock.account;
            this.toAccountID = nanocurrency.deriveAddress(this.currentBlock.link,{useNanoPrefix: true});
            this.fromAccountBalance = this.previousBlock.balance;
            // sending to itself
            if (this.fromAccountID === this.toAccountID) {
              this.toAccountBalance = this.fromAccountBalance;
            }
            console.log(this.fromAccountID)
            console.log(this.toAccountID)
          }
          else  {
            this.notificationService.sendError(`From account does not have enough NANO`, {length: 0})
            return
          }
        }
        // it's a receive block
        else {
          this.txType = TxType.receive;
          this.rawAmount = (this.currentBlock.balance.minus(this.previousBlock.balance));
          this.fromAccountID = nanocurrency.deriveAddress(this.currentBlock.link,{useNanoPrefix: true});
          this.toAccountID = this.currentBlock.account;
          this.toAccountBalance = this.previousBlock.balance;
            // sending to itself
          if (this.fromAccountID === this.toAccountID) {
            this.fromAccountBalance = this.toAccountBalance;
          }
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
  }

  verifyBlocks(currentBlock:Block, previousBlock:Block) {
    var previousHash = null;
    if (nanocurrency.checkAddress(currentBlock.account) &&
      nanocurrency.checkAddress(previousBlock.account) &&
      nanocurrency.checkAddress(currentBlock.representative) &&
      nanocurrency.checkAddress(previousBlock.representative) &&
      nanocurrency.checkAmount(currentBlock.balance.toString(10)) &&
      nanocurrency.checkAmount(previousBlock.balance.toString(10)) &&
      nanocurrency.checkHash(currentBlock.previous) &&
      nanocurrency.checkHash(previousBlock.previous) &&
      nanocurrency.checkHash(currentBlock.link) &&
      nanocurrency.checkHash(previousBlock.link))
    {
      previousHash = nanocurrency.hashBlock({account:previousBlock.account, link:previousBlock.link, previous:previousBlock.previous, representative: previousBlock.representative, balance: previousBlock.balance.toString(10)});
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

  async prepareTransaction() {
    this.fromAddressBook = this.addressBookService.getAccountName(this.fromAccountID);
    this.toAddressBook = this.addressBookService.getAccountName(this.toAccountID);

    this.activePanel = 'confirm';
    // Start precopmuting the work...
    if (this.shouldGenWork) {
      this.workPool.addWorkToCache(this.previousBlock.previous);
    }
  }

  async confirmTransaction() {
    var work = null;
    //const walletAccount = this.walletService.wallet.accounts.find(a => a.id == this.fromAccountID);
    //if (!walletAccount) throw new Error(`Unable to find sending account in wallet`);
    //if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    this.confirmingTransaction = true;
    if (this.shouldGenWork) {
      if (!this.workPool.workExists(this.previousBlock.previous)) {
        this.notificationService.sendInfo(`Generating Proof of Work...`);
      }
      work = await this.workPool.getWork(this.previousBlock.previous);
    }
    this.confirmingTransaction = false;
  }
}
