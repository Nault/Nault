import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot, ChildActivationEnd, Router} from "@angular/router";
import {ApiService} from "../../services/api.service";
import {AppSettingsService} from "../../services/app-settings.service";
import BigNumber from "bignumber.js";
import {AddressBookService} from "../../services/address-book.service";

@Component({
  selector: 'app-transaction-details',
  templateUrl: './transaction-details.component.html',
  styleUrls: ['./transaction-details.component.css']
})
export class TransactionDetailsComponent implements OnInit {
  nano = 1000000000000000000000000;

  routerSub = null;
  transaction: any = {};
  hashID = '';
  blockType = 'send';

  toAccountID = '';
  fromAccountID = '';
  toAddressBook = '';
  fromAddressBook = '';

  amountRaw = new BigNumber(0);

  constructor(private route: ActivatedRoute,
              private router: Router,
              private addressBook: AddressBookService,
              private api: ApiService,
              public settings: AppSettingsService
  ) { }

  async ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof ChildActivationEnd) {
        this.loadTransaction(); // Reload the state when navigating to itself from the transactions page
      }
    });

    await this.loadTransaction();
  }

  async loadTransaction() {
    this.toAccountID = '';
    this.fromAccountID = '';
    this.toAddressBook = '';
    this.fromAddressBook = '';
    this.amountRaw = new BigNumber(0);
    const hash = this.route.snapshot.params.transaction;
    this.hashID = hash;
    const blockData = await this.api.blocksInfo([hash]);
    if (!blockData || blockData.error || !blockData.blocks[hash]) {
      this.transaction = null;
      return;
    }
    const hashData = blockData.blocks[hash];
    const hashContents = JSON.parse(hashData.contents);
    hashData.contents = hashContents;

    this.blockType = hashData.contents.type;
    if (hashData.amount) {
      this.amountRaw = new BigNumber(hashData.amount).mod(this.nano);
    }

    this.transaction = hashData;

    let fromAccount = '';
    let toAccount = '';
    switch (this.blockType) {
      case 'send':
        fromAccount = this.transaction.block_account;
        toAccount = this.transaction.contents.destination;
        break;
      case 'open':
      case 'receive':
        fromAccount = this.transaction.source_account;
        toAccount = this.transaction.block_account;
        break;
      case 'change':
        fromAccount = this.transaction.block_account;
        toAccount = this.transaction.contents.representative;
        break;
    }
    this.toAccountID = toAccount;
    this.fromAccountID = fromAccount;

    this.fromAddressBook = this.addressBook.getAccountName(fromAccount);
    this.toAddressBook = this.addressBook.getAccountName(toAccount);

  }

  getBalanceFromHex(balance) {
    return new BigNumber(balance, 16);
  }

}
