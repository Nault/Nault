import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ChildActivationEnd, Router} from '@angular/router';
import {ApiService} from '../../services/api.service';
import {AppSettingsService} from '../../services/app-settings.service';
import BigNumber from 'bignumber.js';
import {AddressBookService} from '../../services/address-book.service';

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
  isStateBlock = true;

  toAccountID = '';
  fromAccountID = '';
  toAddressBook = '';
  fromAddressBook = '';

  transactionJSON = '';
  showBlockData = false;

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
    this.transactionJSON = '';
    this.showBlockData = false;
    let legacyFromAccount = '';
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

    this.transactionJSON = JSON.stringify(hashData.contents, null , 4);

    this.blockType = hashData.contents.type;
    if (this.blockType === 'state') {
      const isOpen = hashData.contents.previous === '0000000000000000000000000000000000000000000000000000000000000000';
      if (isOpen) {
        this.blockType = 'open';
      } else {
        const prevRes = await this.api.blocksInfo([hashData.contents.previous]);
        const prevData = prevRes.blocks[hashData.contents.previous];
        prevData.contents = JSON.parse(prevData.contents);
        if (!prevData.contents.balance) {
          // Previous block is not a state block.
          this.blockType = prevData.contents.type;
          legacyFromAccount = prevData.source_account;
        } else {
          const prevBalance = new BigNumber(prevData.contents.balance);
          const curBalance = new BigNumber(hashData.contents.balance);
          const balDifference = curBalance.minus(prevBalance);
          if (balDifference.isNegative()) {
            this.blockType = 'send';
          } else if (balDifference.isZero()) {
            this.blockType = 'change';
          } else {
            this.blockType = 'receive';
          }
        }
      }
    } else {
      this.isStateBlock = false;
    }
    if (hashData.amount) {
      this.amountRaw = new BigNumber(hashData.amount).mod(this.nano);
    }

    this.transaction = hashData;

    let fromAccount = '';
    let toAccount = '';
    switch (this.blockType) {
      case 'send':
        fromAccount = this.transaction.block_account;
        toAccount = this.transaction.contents.destination || this.transaction.contents.link_as_account;
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

    if (legacyFromAccount) {
      fromAccount = legacyFromAccount;
    }

    this.toAccountID = toAccount;
    this.fromAccountID = fromAccount;

    this.fromAddressBook = this.addressBook.getAccountName(fromAccount);
    this.toAddressBook = this.addressBook.getAccountName(toAccount);

  }

  getBalanceFromHex(balance) {
    return new BigNumber(balance, 16);
  }

  getBalanceFromDec(balance) {
    return new BigNumber(balance, 10);
  }

}
