import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, ChildActivationEnd, Router} from '@angular/router';
import {WalletService} from '../../services/wallet.service';
import {ApiService} from '../../services/api.service';
import {NotificationService} from '../../services/notification.service';
import {AppSettingsService} from '../../services/app-settings.service';
import BigNumber from 'bignumber.js';
import {AddressBookService} from '../../services/address-book.service';
import { TranslocoService } from '@ngneat/transloco';

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
  blockType = '';
  loadingBlock = false;
  isStateBlock = true;
  isUnconfirmedBlock = false;
  blockHeight = -1;

  toAccountID = '';
  fromAccountID = '';
  toAddressBook = '';
  fromAddressBook = '';

  transactionJSON = '';
  showBlockData = false;

  amountRaw = new BigNumber(0);
  successorHash = '';

  constructor(
    private walletService: WalletService,
    private route: ActivatedRoute,
    private router: Router,
    private addressBook: AddressBookService,
    private api: ApiService,
    private notifications: NotificationService,
    public settings: AppSettingsService,
    private translocoService: TranslocoService
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
    this.transaction = {};
    this.transactionJSON = '';
    this.isUnconfirmedBlock = false;
    this.blockHeight = -1;
    this.showBlockData = false;
    let legacyFromAccount = '';
    this.blockType = '';
    this.amountRaw = new BigNumber(0);
    this.successorHash = '';
    const hash = this.route.snapshot.params.transaction;
    this.hashID = hash;

    this.loadingBlock = true;
    const blockData = await this.api.blocksInfo([hash]);

    if ( !blockData || blockData.error || !blockData.blocks[hash] ) {
      this.loadingBlock = false;
      this.transaction = null;
      return;
    }

    const hashData = blockData.blocks[hash];
    const hashContents = JSON.parse(hashData.contents);
    hashData.contents = hashContents;

    this.transactionJSON = JSON.stringify(hashData.contents, null , 4);

    this.isUnconfirmedBlock = (hashData.confirmed === 'false') ? true : false;
    this.blockHeight = hashData.height;

    const HASH_ONLY_ZEROES = '0000000000000000000000000000000000000000000000000000000000000000';

    const blockType = hashData.contents.type;
    if (blockType === 'state') {
      const isOpen = (hashData.contents.previous === HASH_ONLY_ZEROES);

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
      this.blockType = blockType;
      this.isStateBlock = false;
    }

    if (hashData.amount) {
      this.amountRaw = new BigNumber(hashData.amount).mod(this.nano);
    }

    if (
          (hashData.successor != null)
        && (hashData.successor !== HASH_ONLY_ZEROES)
      ) {
        this.successorHash = hashData.successor;
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

    this.fromAddressBook = (
        this.addressBook.getAccountName(fromAccount)
      || this.getAccountLabel(fromAccount, null)
    );

    this.toAddressBook = (
        this.addressBook.getAccountName(toAccount)
      || this.getAccountLabel(toAccount, null)
    );

    this.loadingBlock = false;
  }

  getAccountLabel(accountID, defaultLabel) {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === accountID);

    if (walletAccount == null) {
      return defaultLabel;
    }

    return (this.translocoService.translate('general.account') + ' #' + walletAccount.index);
  }

  getBalanceFromHex(balance) {
    return new BigNumber(balance, 16);
  }

  getBalanceFromDec(balance) {
    return new BigNumber(balance, 10);
  }

  copied() {
    this.notifications.removeNotification('success-copied');
    this.notifications.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

}
