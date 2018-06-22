import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot, ChildActivationEnd, Router} from "@angular/router";
import {AddressBookService} from "../../services/address-book.service";
import {ApiService} from "../../services/api.service";
import {NotificationService} from "../../services/notification.service";
import {WalletService} from "../../services/wallet.service";
import {NanoBlockService} from "../../services/nano-block.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {PriceService} from "../../services/price.service";
import {UtilService} from "../../services/util.service";
import * as QRCode from 'qrcode';
import BigNumber from "bignumber.js";
import {RepresentativeService} from "../../services/representative.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";

@Component({
  selector: 'app-account-details',
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit, OnDestroy {
  nano = 1000000000000000000000000;

  accountHistory: any[] = [];
  pendingBlocks = [];
  pageSize = 25;
  maxPageSize = 200;

  repLabel: any = '';
  addressBookEntry: any = null;
  account: any = {};
  accountID: string = '';

  walletAccount = null;

  showEditAddressBook = false;
  addressBookModel = '';
  showEditRepresentative = false;
  representativeModel = '';
  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';
  isNaN = isNaN;

  qrCodeImage = null;

  routerSub = null;
  priceSub = null;

  constructor(
    private router: ActivatedRoute,
    private route: Router,
    private addressBook: AddressBookService,
    private api: ApiService,
    private price: PriceService,
    private repService: RepresentativeService,
    private notifications: NotificationService,
    private wallet: WalletService,
    private util: UtilService,
    public settings: AppSettingsService,
    private nanoBlock: NanoBlockService) { }

  async ngOnInit() {
    this.routerSub = this.route.events.subscribe(event => {
      if (event instanceof ChildActivationEnd) {
        this.loadAccountDetails(); // Reload the state when navigating to itself from the transactions page
      }
    });
    this.priceSub = this.price.lastPrice$.subscribe(event => {
      this.account.balanceFiat = this.util.nano.rawToMnano(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
      this.account.pendingFiat = this.util.nano.rawToMnano(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    });

    await this.loadAccountDetails();
  }

  async loadAccountDetails() {
    this.pendingBlocks = [];
    this.accountID = this.router.snapshot.params.account;
    this.addressBookEntry = this.addressBook.getAccountName(this.accountID);
    this.addressBookModel = this.addressBookEntry || '';
    this.walletAccount = this.wallet.getWalletAccount(this.accountID);
    this.account = await this.api.accountInfo(this.accountID);

    const knownRepresentative = this.repService.getRepresentative(this.account.representative);
    this.repLabel = knownRepresentative ? knownRepresentative.name : null;

    // If there is a pending balance, or the account is not opened yet, load pending transactions
    if ((!this.account.error && this.account.pending > 0) || this.account.error) {
      const pending = await this.api.pending(this.accountID, 25);
      if (pending && pending.blocks) {
        for (let block in pending.blocks) {
          if (!pending.blocks.hasOwnProperty(block)) continue;
          this.pendingBlocks.push({
            account: pending.blocks[block].source,
            amount: pending.blocks[block].amount,
            timestamp: pending.blocks[block].timestamp,
            addressBookName: this.addressBook.getAccountName(pending.blocks[block].source) || null,
            hash: block,
          });
        }
      }
    }

    // If the account doesnt exist, set the pending balance manually
    if (this.account.error) {
      const pendingRaw = this.pendingBlocks.reduce((prev: BigNumber, current: any) => prev.plus(new BigNumber(current.amount)), new BigNumber(0));
      this.account.pending = pendingRaw;
    }

    // Set fiat values?
    this.account.balanceRaw = new BigNumber(this.account.balance || 0).mod(this.nano);
    this.account.pendingRaw = new BigNumber(this.account.pending || 0).mod(this.nano);
    this.account.balanceFiat = this.util.nano.rawToMnano(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
    this.account.pendingFiat = this.util.nano.rawToMnano(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    await this.getAccountHistory(this.accountID);


    const qrCode = await QRCode.toDataURL(`${this.accountID}`);
    this.qrCodeImage = qrCode;
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
  }

  async getAccountHistory(account, resetPage = true) {
    if (resetPage) {
      this.pageSize = 25;
    }
    const history = await this.api.accountHistory(account, this.pageSize, true);
    let additionalBlocksInfo = [];

    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistory = history.history.map(h => {
        if (h.type === 'state') {
          // For Open and receive blocks, we need to look up block info to get originating account
          if (h.subtype === 'open' || h.subtype === 'receive') {
            additionalBlocksInfo.push({ hash: h.hash, link: h.link });
          } else {
            h.link_as_account = this.util.account.getPublicAccountID(this.util.hex.toUint8(h.link));
            h.addressBookName = this.addressBook.getAccountName(h.link_as_account) || null;
          }
        } else {
          h.addressBookName = this.addressBook.getAccountName(h.account) || null;
        }
        return h;
      });

      // Remove change blocks now that we are using the raw output
      this.accountHistory = this.accountHistory.filter(h => h.type !== 'change' && h.subtype !== 'change');

      if (additionalBlocksInfo.length) {
        const blocksInfo = await this.api.blocksInfo(additionalBlocksInfo.map(b => b.link));
        for (let block in blocksInfo.blocks) {
          if (!blocksInfo.blocks.hasOwnProperty(block)) continue;

          const matchingBlock = additionalBlocksInfo.find(a => a.link === block);
          if (!matchingBlock) continue;
          const accountInHistory = this.accountHistory.find(h => h.hash === matchingBlock.hash);
          if (!accountInHistory) continue;

          const blockData = blocksInfo.blocks[block];

          accountInHistory.link_as_account = blockData.block_account;
          accountInHistory.addressBookName = this.addressBook.getAccountName(blockData.block_account) || null;
        }
      }

    } else {
      this.accountHistory = [];
    }
  }

  async loadMore() {
    if (this.pageSize <= this.maxPageSize) {
      this.pageSize += 25;
      await this.getAccountHistory(this.accountID, false);
    }
  }

  async saveRepresentative() {
    if (this.wallet.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);
    if (!this.walletAccount) return;
    const repAccount = this.representativeModel;

    const valid = await this.api.validateAccountNumber(repAccount);
    if (!valid || valid.valid !== '1') return this.notifications.sendWarning(`Account ID is not a valid account`);

    try {
      const changed = await this.nanoBlock.generateChange(this.walletAccount, repAccount, this.wallet.isLedgerWallet());
      if (!changed) {
        this.notifications.sendError(`Error changing representative, please try again`);
        return;
      }
    } catch (err) {
      this.notifications.sendError(err.message);
      return;
    }

    // Reload some states, we are successful
    this.representativeModel = '';
    this.showEditRepresentative = false;

    const accountInfo = await this.api.accountInfo(this.accountID);
    this.account = accountInfo;
    const newRep = this.repService.getRepresentative(repAccount);
    this.repLabel = newRep ? newRep.name : '';

    this.notifications.sendSuccess(`Successfully changed representative`);
  }

  async saveAddressBook() {
    const addressBookName = this.addressBookModel.trim();
    if (!addressBookName) {
      // Check for deleting an entry in the address book
      if (this.addressBookEntry) {
        this.addressBook.deleteAddress(this.accountID);
        this.notifications.sendSuccess(`Successfully removed address book entry!`);
        this.addressBookEntry = null;
      }

      this.showEditAddressBook = false;
      return;
    }

    try {
      await this.addressBook.saveAddress(this.accountID, addressBookName);
    } catch (err) {
      this.notifications.sendError(err.message);
      return;
    }

    this.notifications.sendSuccess(`Saved address book entry!`);

    this.addressBookEntry = addressBookName;
    this.showEditAddressBook = false;
  }

  searchRepresentatives() {
    this.showRepresentatives = true;
    const search = this.representativeModel || '';
    const representatives = this.repService.getSortedRepresentatives();

    const matches = representatives
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.representativeModel = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.representativeModel = this.representativeModel.replace(/ /g, '');
    const rep = this.repService.getRepresentative(this.representativeModel);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else {
      this.representativeListMatch = '';
    }
  }

  copied() {
    this.notifications.sendSuccess(`Successfully copied to clipboard!`);
  }

}
