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

@Component({
  selector: 'app-account-details',
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit, OnDestroy {
  accountHistory: any[] = [];

  addressBookEntry: any = null;
  account: any = {};
  accountID: string = '';

  walletAccount = null;

  showEditAddressBook = false;
  addressBookModel = '';
  showEditRepresentative = false;
  representativeModel = '';

  routerSub = null;

  constructor(
    private router: ActivatedRoute,
    private route: Router,
    private addressBook: AddressBookService,
    private api: ApiService,
    private price: PriceService,
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

    await this.loadAccountDetails();
  }

  async loadAccountDetails() {
    this.accountID = this.router.snapshot.params.account;
    this.addressBookEntry = this.addressBook.getAccountName(this.accountID);
    this.walletAccount = this.wallet.getWalletAccount(this.accountID);
    this.account = await this.api.accountInfo(this.accountID);
    // Set fiat values?
    this.account.balanceFiat = this.util.nano.rawToMnano(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
    this.account.pendingFiat = this.util.nano.rawToMnano(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    await this.getAccountHistory(this.accountID);
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  async getAccountHistory(account) {
    this.accountHistory = [];

    const history = await this.api.accountHistory(account);
    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistory = history.history.map(h => {
        h.addressBookName = this.addressBook.getAccountName(h.account) || null;
        return h;
      });
    }
  }

  async saveRepresentative() {
    if (!this.walletAccount) return;
    const repAccount = this.representativeModel;

    const valid = await this.api.validateAccountNumber(repAccount);
    if (!valid || valid.valid !== '1') return this.notifications.sendWarning(`Account ID is not a valid account`);

    try {
      const changed = await this.nanoBlock.generateChange(this.walletAccount, repAccount);
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

    this.notifications.sendSuccess(`Successfully changed representative?`);
  }

  async saveAddressBook() {
    const addressBookName = this.addressBookModel;
    if (!addressBookName) return;

    try {
      await this.addressBook.saveAddress(this.accountID, addressBookName);
    } catch (err) {
      this.notifications.sendError(err.message);
      return;
    }

    this.notifications.sendSuccess(`Saved address book entry!`);

    this.addressBookEntry = addressBookName;
    this.showEditAddressBook = false;
    this.addressBookModel = '';
  }

  copied() {
    this.notifications.sendSuccess(`Successfully copied to clipboard!`);
  }

}
