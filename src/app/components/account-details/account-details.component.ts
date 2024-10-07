import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ChildActivationEnd, Router, NavigationEnd} from '@angular/router';
import {formatDate} from '@angular/common';
import {AddressBookService} from '../../services/address-book.service';
import {ApiService} from '../../services/api.service';
import {NotificationService} from '../../services/notification.service';
import {WalletService} from '../../services/wallet.service';
import {NanoBlockService} from '../../services/nano-block.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {PriceService} from '../../services/price.service';
import {UtilService} from '../../services/util.service';
import * as QRCode from 'qrcode';
import BigNumber from 'bignumber.js';
import {RepresentativeService} from '../../services/representative.service';
import {BehaviorSubject} from 'rxjs';
import * as nanocurrency from 'nanocurrency';
import {NinjaService} from '../../services/ninja.service';
import { QrModalService } from '../../services/qr-modal.service';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-account-details',
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit, OnDestroy {
  nano = 1000000000000000000000000;
  zeroHash = '0000000000000000000000000000000000000000000000000000000000000000';

  accountHistory: any[] = [];
  pendingBlocks = [];
  pageSize = 25;
  maxPageSize = 200;

  repLabel: any = '';
  repVotingWeight: BigNumber;
  repDonationAddress: any = '';

  addressBookEntry: any = null;
  account: any = {};
  accountID = '';

  walletAccount = null;

  timeoutIdAllowingManualRefresh: any = null;
  timeoutIdAllowingInstantAutoRefresh: any = null;
  timeoutIdQueuedAutoRefresh: any = null;
  qrModal: any = null;
  mobileAccountMenuModal: any = null;
  mobileTransactionMenuModal: any = null;
  mobileTransactionData: any = null;

  showFullDetailsOnSmallViewports = false;
  loadingAccountDetails = false;
  loadingIncomingTxList = false;
  loadingTxList = false;
  showAdvancedOptions = false;
  showEditAddressBook = false;
  addressBookModel = '';
  representativeModel = '';
  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';
  isNaN = isNaN;

  qrCodeImage = null;

  routerSub = null;
  priceSub = null;

  initialLoadDone = false;
  manualRefreshAllowed = true;
  instantAutoRefreshAllowed = true;
  shouldQueueAutoRefresh = false;
  autoRefreshReasonBlockUpdate = null;
  dateStringToday = '';
  dateStringYesterday = '';

  // Remote signing
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';
  amounts = [
    { name: 'XNO', shortName: 'XNO', value: 'mnano' },
    { name: 'knano', shortName: 'knano', value: 'knano' },
    { name: 'nano', shortName: 'nano', value: 'nano' },
  ];
  selectedAmount = this.amounts[0];

  amount = null;
  amountRaw: BigNumber = new BigNumber(0);
  amountFiat: number|null = null;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccount: any = {};
  toAccount: any = false;
  toAccountID = '';
  toAddressBook = '';
  toAccountStatus = null;
  amountStatus = null;
  repStatus = null;
  qrString = null;
  qrCodeImageBlock = null;
  qrCodeImageBlockReceive = null;
  blockHash = null;
  blockHashReceive = null;
  remoteVisible = false;
  blockTypes: string[] = ['Send Nano', 'Change Representative'];
  blockTypeSelected: string = this.blockTypes[0];
  representativeList = [];
  representativesOverview = [];
  // End remote signing

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
    private nanoBlock: NanoBlockService,
    private qrModalService: QrModalService,
    private ninja: NinjaService,
    private translocoService: TranslocoService) {
      // to detect when the account changes if the view is already active
      route.events.subscribe((val) => {
        if (val instanceof NavigationEnd) {
          this.clearRemoteVars(); // reset the modal content for remote signing
        }
      });
  }

  async ngOnInit() {
    const params = this.router.snapshot.queryParams;
    if ('sign' in params) {
      this.remoteVisible = params.sign === '1';
      this.showAdvancedOptions = params.sign === '1';
    }

    this.showFullDetailsOnSmallViewports = (params.compact !== '1');

    this.routerSub = this.route.events.subscribe(event => {
      if (event instanceof ChildActivationEnd) {
        this.loadAccountDetails(); // Reload the state when navigating to itself from the transactions page
        this.showFullDetailsOnSmallViewports = (this.router.snapshot.queryParams.compact !== '1');
        this.mobileTransactionMenuModal.hide();
      }
    });
    this.priceSub = this.price.lastPrice$.subscribe(event => {
      this.account.balanceFiat = this.util.nano.rawToMnano(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
      this.account.pendingFiat = this.util.nano.rawToMnano(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    });

    this.wallet.wallet.pendingBlocksUpdate$.subscribe(async receivableBlockUpdate => {
      this.onReceivableBlockUpdate(receivableBlockUpdate);
    });

    const UIkit = window['UIkit'];
    const qrModal = UIkit.modal('#qr-code-modal');
    this.qrModal = qrModal;

    const mobileAccountMenuModal = UIkit.modal('#mobile-account-menu-modal');
    this.mobileAccountMenuModal = mobileAccountMenuModal;

    const mobileTransactionMenuModal = UIkit.modal('#mobile-transaction-menu-modal');
    this.mobileTransactionMenuModal = mobileTransactionMenuModal;

    await this.loadAccountDetails();
    this.initialLoadDone = true;
    this.addressBook.loadAddressBook();

    this.populateRepresentativeList();

    this.repService.walletReps$.subscribe(async reps => {
      if ( reps[0] === null ) {
        // initial state from new BehaviorSubject([null])
        return;
      }

      this.representativesOverview = reps;
      this.updateRepresentativeInfo();
    });
  }

  async populateRepresentativeList() {
    // add trusted/regular local reps to the list
    const localReps = this.repService.getSortedRepresentatives();
    this.representativeList.push( ...localReps.filter(rep => (!rep.warn)) );

    if (this.settings.settings.serverAPI) {
      const verifiedReps = await this.ninja.recommendedRandomized();

      // add random recommended reps to the list
      for (const representative of verifiedReps) {
        const temprep = {
          id: representative.account,
          name: representative.alias
        };

        this.representativeList.push(temprep);
      }
    }

    // add untrusted local reps to the list
    this.representativeList.push( ...localReps.filter(rep => (rep.warn)) );
  }

  clearAccountVars() {
    this.accountHistory = [];
    this.pendingBlocks = [];
    this.accountID = '';
    this.addressBookEntry = null;
    this.addressBookModel = '';
    this.showEditAddressBook = false;
    this.walletAccount = null;
    this.account = {};
    this.qrCodeImage = null;
  }

  clearRemoteVars() {
    this.selectedAmount = this.amounts[0];
    this.amount = null;
    this.amountRaw = new BigNumber(0);
    this.amountFiat = null;
    this.rawAmount = new BigNumber(0);
    this.fromAccount = {};
    this.toAccount = false;
    this.toAccountID = '';
    this.toAddressBook = '';
    this.toAccountStatus = null;
    this.repStatus = null;
    this.qrString = null;
    this.qrCodeImageBlock = null;
    this.qrCodeImageBlockReceive = null;
    this.blockHash = null;
    this.blockHashReceive = null;
    this.blockTypeSelected = this.blockTypes[0];
    this.representativeModel = '';
    this.representativeListMatch = '';
  }

  updateRepresentativeInfo() {
    if (!this.account) {
      return;
    }

    const representativeFromOverview =
      this.representativesOverview.find(
        (rep) =>
          (rep.account === this.account.representative)
      );

    if (representativeFromOverview != null) {
      this.repLabel = representativeFromOverview.label;
      this.repVotingWeight = representativeFromOverview.percent;
      this.repDonationAddress = representativeFromOverview.donationAddress;
      return;
    }

    this.repVotingWeight = new BigNumber(0);
    this.repDonationAddress = null;

    const knownRepresentative = this.repService.getRepresentative(this.account.representative);

    if (knownRepresentative != null) {
      this.repLabel = knownRepresentative.name;
      return;
    }

    this.repLabel = null;
  }

  onRefreshButtonClick() {
    if (!this.manualRefreshAllowed) return;

    this.loadAccountDetails();
  }

  isReceivableBlockUpdateRelevant(receivableBlockUpdate) {
    let isRelevant = true;

    if (receivableBlockUpdate.account !== this.accountID) {
      isRelevant = false;
      return isRelevant;
    }

    const sourceHashToFind = receivableBlockUpdate.sourceHash;

    const alreadyInReceivableBlocks =
      this.pendingBlocks.some(
        (knownReceivableBlock) =>
          (knownReceivableBlock.hash === sourceHashToFind)
      );

    if (receivableBlockUpdate.hasBeenReceived === true) {
      const destinationHashToFind = receivableBlockUpdate.destinationHash;

      const alreadyInAccountHistory =
        this.accountHistory.some(
          (knownAccountHistoryBlock) =>
            (knownAccountHistoryBlock.hash === destinationHashToFind)
        );

      if (
            (alreadyInAccountHistory === true)
          && (alreadyInReceivableBlocks === false)
        ) {
          isRelevant = false;
          return isRelevant;
      }
    } else {
      if (alreadyInReceivableBlocks === true) {
        isRelevant = false;
        return isRelevant;
      }
    }

    return isRelevant;
  }

  onReceivableBlockUpdate(receivableBlockUpdate) {
    if (receivableBlockUpdate === null) {
      return;
    }

    const isRelevantUpdate =
      this.isReceivableBlockUpdateRelevant(receivableBlockUpdate);

    if (isRelevantUpdate === false) {
      return;
    }

    this.loadAccountDetailsThrottled({ receivableBlockUpdate });
  }

  loadAccountDetailsThrottled(params) {
    this.autoRefreshReasonBlockUpdate = (
        (params.receivableBlockUpdate != null)
      ? params.receivableBlockUpdate
      : null
    );

    if (this.initialLoadDone === false) {
      return;
    }

    if (this.instantAutoRefreshAllowed === true) {
      this.loadAccountDetails();
      return;
    }

    if (this.loadingAccountDetails === true) {
      // Queue refresh once the loading is done
      this.shouldQueueAutoRefresh = true;
    } else {
      // Queue refresh now
      this.loadAccountDetailsDelayed(3000);
    }
  }

  enableManualRefreshDelayed(delayMS) {
    if (this.timeoutIdAllowingManualRefresh != null) {
      clearTimeout(this.timeoutIdAllowingManualRefresh);
    }

    this.timeoutIdAllowingManualRefresh =
      setTimeout(
        () => {
          this.manualRefreshAllowed = true;
        },
        delayMS
      );
  }

  enableInstantAutoRefreshDelayed(delayMS) {
    if (this.timeoutIdAllowingInstantAutoRefresh != null) {
      clearTimeout(this.timeoutIdAllowingInstantAutoRefresh);
    }

    this.timeoutIdAllowingInstantAutoRefresh =
      setTimeout(
        () => {
          this.instantAutoRefreshAllowed = true;
        },
        delayMS
      );
  }

  loadAccountDetailsDelayed(delayMS) {
    if (this.timeoutIdQueuedAutoRefresh != null) {
      clearTimeout(this.timeoutIdQueuedAutoRefresh);
    }

    this.timeoutIdQueuedAutoRefresh =
      setTimeout(
        () => {
          if (this.autoRefreshReasonBlockUpdate !== null) {
            const isUpdateStillRelevant =
              this.isReceivableBlockUpdateRelevant(this.autoRefreshReasonBlockUpdate);

            if (isUpdateStillRelevant === false) {
              this.enableRefreshesEventually();
              return;
            }
          }

          this.loadAccountDetails();
        },
        delayMS
      );
  }

  onAccountDetailsLoadStart() {
    this.instantAutoRefreshAllowed = false;
    this.manualRefreshAllowed = false;

    if (this.timeoutIdAllowingManualRefresh != null) {
      clearTimeout(this.timeoutIdAllowingManualRefresh);
    }

    if (this.timeoutIdAllowingInstantAutoRefresh != null) {
      clearTimeout(this.timeoutIdAllowingInstantAutoRefresh);
    }

    if (this.timeoutIdQueuedAutoRefresh != null) {
      clearTimeout(this.timeoutIdQueuedAutoRefresh);
    }
  }

  enableRefreshesEventually() {
    this.enableInstantAutoRefreshDelayed(3000);
    this.enableManualRefreshDelayed(5000);
  }

  onAccountDetailsLoadDone() {
    if (this.shouldQueueAutoRefresh === true) {
      this.shouldQueueAutoRefresh = false;
      this.loadAccountDetailsDelayed(3000);
      return;
    }

    this.enableRefreshesEventually();
  }

  async loadAccountDetails() {
    this.onAccountDetailsLoadStart();

    this.pendingBlocks = [];

    this.clearAccountVars();
    this.loadingAccountDetails = true;

    const accountID = this.router.snapshot.params.account;
    this.accountID = accountID;
    this.generateReceiveQR(accountID);

    this.addressBookEntry = this.addressBook.getAccountName(accountID);
    this.addressBookModel = this.addressBookEntry || '';
    this.walletAccount = this.wallet.getWalletAccount(accountID);

    this.account = await this.api.accountInfo(accountID);

    if (accountID !== this.accountID) {
      // Navigated to a different account while account info was loading
      this.onAccountDetailsLoadDone();
      return;
    }

    if (!this.account) {
      this.loadingAccountDetails = false;
      this.onAccountDetailsLoadDone();
      return;
    }

    this.updateRepresentativeInfo();

    // If there is a pending balance, or the account is not opened yet, load pending transactions
    if ((!this.account.error && this.account.pending > 0) || this.account.error) {
      // Take minimum receive into account
      let pendingBalance = '0';
      let pending;

      this.pendingBlocks = [];
      this.loadingIncomingTxList = true;

      if (this.settings.settings.minimumReceive) {
        const minAmount = this.util.nano.mnanoToRaw(this.settings.settings.minimumReceive);
        pending = await this.api.pendingLimitSorted(accountID, 50, minAmount.toString(10));
      } else {
        pending = await this.api.pendingSorted(accountID, 50);
      }

      if (accountID !== this.accountID) {
        // Navigated to a different account while incoming tx were loading
        this.onAccountDetailsLoadDone();
        return;
      }

      this.loadingIncomingTxList = false;

      if (pending && pending.blocks) {
        for (const block in pending.blocks) {
          if (!pending.blocks.hasOwnProperty(block)) continue;
          const transaction = pending.blocks[block];

          this.pendingBlocks.push({
            account: transaction.source,
            amount: transaction.amount,
            amountRaw: new BigNumber( transaction.amount || 0 ).mod(this.nano),
            local_timestamp: transaction.local_timestamp,
            local_date_string: (
                transaction.local_timestamp
              ? formatDate(transaction.local_timestamp * 1000, 'MMM d, y', 'en-US')
              : 'N/A'
            ),
            local_time_string: (
                transaction.local_timestamp
              ? formatDate(transaction.local_timestamp * 1000, 'HH:mm:ss', 'en-US')
              : ''
            ),
            addressBookName: (
                this.addressBook.getAccountName(transaction.source)
              || this.getAccountLabel(transaction.source, null)
            ),
            hash: block,
            loading: false,
            received: false,
            isReceivable: true,
          });

          pendingBalance = new BigNumber(pendingBalance).plus(transaction.amount).toString(10);
        }
      }

      this.account.pending = pendingBalance;
    } else {
      // Unset variable that may still be set to true from old request
      this.loadingIncomingTxList = false;
    }

    // If the account doesnt exist, set the pending balance manually
    if (this.account.error) {
      const pendingRaw = this.pendingBlocks.reduce(
        (prev: BigNumber, current: any) => prev.plus(new BigNumber(current.amount)),
        new BigNumber(0)
      );
      this.account.pending = pendingRaw;
    }

    // Set fiat values?
    this.account.balanceRaw = new BigNumber(this.account.balance || 0).mod(this.nano);
    this.account.pendingRaw = new BigNumber(this.account.pending || 0).mod(this.nano);
    this.account.balanceFiat = this.util.nano.rawToMnano(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
    this.account.pendingFiat = this.util.nano.rawToMnano(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();

    await this.getAccountHistory(accountID);

    if (accountID !== this.accountID) {
      // Navigated to a different account while account history was loading
      this.onAccountDetailsLoadDone();
      return;
    }

    this.loadingAccountDetails = false;
    this.onAccountDetailsLoadDone();
  }

  getAccountLabel(accountID, defaultLabel) {
    const walletAccount = this.wallet.wallet.accounts.find(a => a.id === accountID);

    if (walletAccount == null) {
      return defaultLabel;
    }

    return (this.translocoService.translate('general.account') + ' #' + walletAccount.index);
  }

  ngOnDestroy() {
    this.mobileAccountMenuModal.hide();
    this.mobileTransactionMenuModal.hide();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
  }

  async generateReceiveQR(accountID) {
    const qrCode = await QRCode.toDataURL(`${accountID}`, { errorCorrectionLevel: 'M', scale: 16 });
    this.qrCodeImage = qrCode;
  }

  updateTodayYesterdayDateStrings() {
    const unixTimeNow = Date.now();

    this.dateStringToday = formatDate( unixTimeNow, 'MMM d, y', 'en-US' );
    this.dateStringYesterday = formatDate( unixTimeNow - 86400000, 'MMM d, y', 'en-US' );
  }

  async getAccountHistory(accountID, resetPage = true) {
    if (resetPage) {
      this.accountHistory = [];
      this.pageSize = 25;
    }

    this.loadingTxList = true;
    this.updateTodayYesterdayDateStrings();

    const history = await this.api.accountHistory(accountID, this.pageSize, true);

    if (accountID !== this.accountID) {
      // Navigated to a different account while account history was loading
      return;
    }

    const additionalBlocksInfo = [];

    const accountConfirmationHeight = (
        this.account.confirmation_height
      ? parseInt(this.account.confirmation_height, 10)
      : null
    );

    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistory = history.history.map(h => {
        h.local_date_string = (
            h.local_timestamp
          ? formatDate(h.local_timestamp * 1000, 'MMM d, y', 'en-US')
          : 'N/A'
        );

        h.local_time_string = (
            h.local_timestamp
          ? formatDate(h.local_timestamp * 1000, 'HH:mm:ss', 'en-US')
          : ''
        );

        if (h.type === 'state') {
          if (h.subtype === 'open' || h.subtype === 'receive') {
            // Look up block info to get sender account
            additionalBlocksInfo.push({ hash: h.hash, link: h.link });

            // Remove a receivable block if this is a receive for it
            const sourceHashToFind = h.link;

            this.pendingBlocks =
              this.pendingBlocks.filter(
                (knownReceivableBlock) =>
                  (knownReceivableBlock.hash !== sourceHashToFind)
              );
          } else if (h.subtype === 'change') {
            h.link_as_account = h.representative;
            h.addressBookName = (
                this.addressBook.getAccountName(h.link_as_account)
              || this.getAccountLabel(h.link_as_account, null)
            );
          } else {
            h.link_as_account = this.util.account.getPublicAccountID(this.util.hex.toUint8(h.link));
            h.addressBookName = (
                this.addressBook.getAccountName(h.link_as_account)
              || this.getAccountLabel(h.link_as_account, null)
            );
          }
        } else {
          h.addressBookName = (
              this.addressBook.getAccountName(h.account)
            || this.getAccountLabel(h.account, null)
          );
        }

        if (
              (accountConfirmationHeight != null)
            && (h.height != null)
            && ( accountConfirmationHeight < parseInt(h.height, 10) )
          ) {
            h.confirmed = false;
        }

        return h;
      });

      // Currently not supporting non-state rep change or state epoch blocks
      this.accountHistory = this.accountHistory.filter(h => h.type !== 'change' && h.subtype !== 'epoch');

      if (additionalBlocksInfo.length) {
        const blocksInfo = await this.api.blocksInfo(additionalBlocksInfo.map(b => b.link));

        if (accountID !== this.accountID) {
          // Navigated to a different account while block info was loading
          return;
        }

        for (const block in blocksInfo.blocks) {
          if (!blocksInfo.blocks.hasOwnProperty(block)) continue;

          const matchingBlock = additionalBlocksInfo.find(a => a.link === block);
          if (!matchingBlock) continue;
          const accountHistoryBlock = this.accountHistory.find(h => h.hash === matchingBlock.hash);
          if (!accountHistoryBlock) continue;

          const blockData = blocksInfo.blocks[block];

          accountHistoryBlock.link_as_account = blockData.block_account;
          accountHistoryBlock.addressBookName = (
              this.addressBook.getAccountName(blockData.block_account)
            || this.getAccountLabel(blockData.block_account, null)
          );
        }
      }

    } else {
      this.accountHistory = [];
    }

    this.loadingTxList = false;
  }

  async loadMore() {
    if (this.pageSize <= this.maxPageSize) {
      this.pageSize += 25;
      await this.getAccountHistory(this.accountID, false);
    }
  }

  async saveAddressBook() {
    // Trim and remove duplicate spaces
    this.addressBookModel = this.addressBookModel.trim().replace(/ +/g, ' ');

    if (!this.addressBookModel) {
      // Check for deleting an entry in the address book
      if (this.addressBookEntry) {
        this.addressBook.deleteAddress(this.accountID);
        this.notifications.sendSuccess(`Successfully removed address book entry!`);
        this.addressBookEntry = null;
      }

      this.showEditAddressBook = false;
      return;
    }

    const regexp = new RegExp('^(Account|' + this.translocoService.translate('general.account') + ') #\\d+$', 'g');
    if ( regexp.test(this.addressBookModel) === true ) {
      return this.notifications.sendError(this.translocoService.translate('address-book.this-name-is-reserved-for-wallet-accounts-without-a-label'));
    }

    if ( this.addressBookModel.startsWith('@') === true ) {
      return this.notifications.sendError(this.translocoService.translate('address-book.this-name-is-reserved-for-decentralized-aliases'));
    }

    // Make sure no other entries are using that name
    const accountIdWithSameName = this.addressBook.getAccountIdByName(this.addressBookModel);

    if ( (accountIdWithSameName !== null) && (accountIdWithSameName !== this.accountID) ) {
      return this.notifications.sendError(this.translocoService.translate('address-book.this-name-is-already-in-use-please-use-a-unique-name'));
    }

    try {
      const currentBalanceTracking = this.addressBook.getBalanceTrackingById(this.accountID);
      const currentTransactionTracking = this.addressBook.getTransactionTrackingById(this.accountID);
      await this.addressBook.saveAddress(this.accountID, this.addressBookModel, currentBalanceTracking, currentTransactionTracking);
    } catch (err) {
      this.notifications.sendError(this.translocoService.translate('address-book.unable-to-save-entry', { message: err.message }));
      return;
    }

    this.notifications.sendSuccess(this.translocoService.translate('address-book.address-book-entry-saved-successfully'));

    this.addressBookEntry = this.addressBookModel;
    this.showEditAddressBook = false;
  }

  searchRepresentatives() {
    if (this.representativeModel !== '' && !this.util.account.isValidAccount(this.representativeModel)) this.repStatus = 0;
    else this.repStatus = null;

    this.showRepresentatives = true;
    const search = this.representativeModel || '';

    const matches = this.representativeList
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      // remove duplicate accounts
      .filter((item, pos, self) => this.util.array.findWithAttr(self, 'id', item.id) === pos)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.representativeModel = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  async validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.representativeModel = this.representativeModel.replace(/ /g, '');

    if (this.representativeModel === '') {
      this.representativeListMatch = '';
      return;
    }

    const rep = this.repService.getRepresentative(this.representativeModel);
    const ninjaRep = await this.ninja.getAccount(this.representativeModel);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else if (ninjaRep) {
      this.representativeListMatch = ninjaRep.alias;
    } else {
      this.representativeListMatch = '';
    }
  }

  copied() {
    this.notifications.removeNotification('success-copied');
    this.notifications.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

  // Remote signing methods
  // An update to the Nano amount, sync the fiat value
  syncFiatPrice() {
    if (!this.validateAmount()) return;
    const rawAmount = this.getAmountBaseValue(this.amount || 0).plus(this.amountRaw);
    if (rawAmount.lte(0)) {
      this.amountFiat = 0;
      return;
    }

    // This is getting hacky, but if their currency is bitcoin, use 6 decimals, if it is not, use 2
    const precision = this.settings.settings.displayCurrency === 'BTC' ? 1000000 : 100;

    // Determine fiat value of the amount
    const fiatAmount = this.util.nano.rawToMnano(rawAmount)
    .times(this.price.price.lastPrice)
    .times(precision)
    .floor().div(precision).toNumber();

    this.amountFiat = fiatAmount;
  }

  // An update to the fiat amount, sync the nano value based on currently selected denomination
  syncNanoPrice() {
    if (!this.amountFiat) {
      this.amount = '';
      return;
    }
    if (!this.util.string.isNumeric(this.amountFiat)) return;
    const rawAmount = this.util.nano.mnanoToRaw(new BigNumber(this.amountFiat).div(this.price.price.lastPrice));
    const nanoVal = this.util.nano.rawToNano(rawAmount).floor();
    const nanoAmount = this.getAmountValueFromBase(this.util.nano.nanoToRaw(nanoVal));

    this.amount = nanoAmount.toNumber();
  }

  searchAddressBook() {
    this.showAddressBook = true;
    const search = this.toAccountID || '';
    const addressBook = this.addressBook.addressBook;

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

    this.addressBookMatch = (
        this.addressBook.getAccountName(this.toAccountID)
      || this.getAccountLabel(this.toAccountID, null)
    );

    // const accountInfo = await this.walletService.walletApi.accountInfo(this.toAccountID);
    this.toAccountStatus = null;
    if (this.util.account.isValidAccount(this.toAccountID)) {
      const accountInfo = await this.api.accountInfo(this.toAccountID);
      if (accountInfo.error) {
        if (accountInfo.error === 'Account not found') {
          this.toAccountStatus = 1;
        }
      }
      if (accountInfo && accountInfo.frontier) {
        this.toAccountStatus = 2;
      }
    } else {
      this.toAccountStatus = 0;
    }
  }

  validateAmount() {
    if (this.util.account.isValidNanoAmount(this.amount)) {
      this.amountStatus = 1;
      return true;
    } else {
      this.amountStatus = 0;
      return false;
    }
  }

  setMaxAmount() {
    this.amountRaw = this.account.balance ? new BigNumber(this.account.balance).mod(this.nano) : new BigNumber(0);
    const nanoVal = this.util.nano.rawToNano(this.account.balance).floor();
    const maxAmount = this.getAmountValueFromBase(this.util.nano.nanoToRaw(nanoVal));
    this.amount = maxAmount.toNumber();
    this.syncFiatPrice();
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

  showMobileMenuForTransaction(transaction) {
    this.notifications.removeNotification('success-copied');

    this.mobileTransactionData = transaction;
    this.mobileTransactionMenuModal.show();
  }

  onReceiveFundsPress(receivableTransaction) {
    if (receivableTransaction.loading || receivableTransaction.received) {
      return;
    }

    this.receiveReceivableBlock(receivableTransaction);
  }

  async receiveReceivableBlock(receivableBlock) {
    const sourceBlock = receivableBlock.hash;

    if (this.wallet.isLocked()) {
      const wasUnlocked = await this.wallet.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }

    receivableBlock.loading = true;

    let createdReceiveBlockHash = null;
    let hasShownErrorNotification = false;

    try {
      createdReceiveBlockHash =
        await this.nanoBlock.generateReceive(this.walletAccount, sourceBlock, this.wallet.isLedgerWallet());
    } catch (err) {
      this.notifications.sendError('Error receiving transaction: ' + err.message);
      hasShownErrorNotification = true;
    }

    if (createdReceiveBlockHash != null) {
      receivableBlock.received = true;
      this.mobileTransactionMenuModal.hide();
      this.notifications.removeNotification('success-receive');
      this.notifications.sendSuccess(`Successfully received nano!`, { identifier: 'success-receive' });
      // clear the list of pending blocks. Updated again with reloadBalances()
      this.wallet.clearPendingBlocks();
    } else {
      if (hasShownErrorNotification === false) {
        if (!this.wallet.isLedgerWallet()) {
          this.notifications.sendError(`Error receiving transaction, please try again`, {length: 10000});
        }
      }
    }

    receivableBlock.loading = false;

    await this.wallet.reloadBalances();

    this.loadAccountDetailsThrottled({});
  }

  async generateSend() {
    const isValid = this.util.account.isValidAccount(this.toAccountID);
    if (!isValid) return this.notifications.sendWarning(`To account address is not valid`);
    if (!this.accountID || !this.toAccountID) return this.notifications.sendWarning(`From and to account are required`);
    if (!this.validateAmount()) return this.notifications.sendWarning(`Invalid XNO Amount`);

    this.qrCodeImageBlock = null;

    const from = await this.api.accountInfo(this.accountID);
    const to = await this.api.accountInfo(this.toAccountID);
    if (!from) return this.notifications.sendError(`From account not found`);

    from.balanceBN = new BigNumber(from.balance || 0);
    to.balanceBN = new BigNumber(to.balance || 0);

    this.fromAccount = from;
    this.toAccount = to;

    const rawAmount = this.getAmountBaseValue(this.amount || 0);
    this.rawAmount = rawAmount.plus(this.amountRaw);

    const nanoAmount = this.rawAmount.div(this.nano);

    if (this.amount < 0 || rawAmount.lessThan(0)) return this.notifications.sendWarning(`Amount is invalid`);
    if (from.balanceBN.minus(rawAmount).lessThan(0)) return this.notifications.sendError(`From account does not have enough XNO`);

    // Determine a proper raw amount to show in the UI, if a decimal was entered
    this.amountRaw = this.rawAmount.mod(this.nano);

    // Determine fiat value of the amount
    this.amountFiat = this.util.nano.rawToMnano(rawAmount).times(this.price.price.lastPrice).toNumber();

    const remaining = new BigNumber(from.balance).minus(this.rawAmount);
    const remainingDecimal = remaining.toString(10);

    const defaultRepresentative = this.settings.settings.defaultRepresentative || this.nanoBlock.getRandomRepresentative();
    const representative = from.representative || defaultRepresentative;
    const blockData = {
      account: this.accountID.replace('xrb_', 'nano_').toLowerCase(),
      previous: from.frontier,
      representative: representative,
      balance: remainingDecimal,
      link: this.util.account.getAccountPublicKey(this.toAccountID),
    };
    this.blockHash = nanocurrency.hashBlock({
      account: blockData.account,
      link: blockData.link,
      previous: blockData.previous,
      representative: blockData.representative,
      balance: blockData.balance
    });
    console.log('Created block', blockData);
    console.log('Block hash: ' + this.blockHash);

    // Previous block info
    const previousBlockInfo = await this.api.blockInfo(blockData.previous);
    if (!('contents' in previousBlockInfo)) return this.notifications.sendError(`Previous block not found`);
    const jsonBlock = JSON.parse(previousBlockInfo.contents);
    const blockDataPrevious = {
      account: jsonBlock.account.replace('xrb_', 'nano_').toLowerCase(),
      previous: jsonBlock.previous,
      representative: jsonBlock.representative,
      balance: jsonBlock.balance,
      link: jsonBlock.link,
      signature: jsonBlock.signature,
    };

    // Nano signing standard
    this.qrString = 'nanosign:{"block":' + JSON.stringify(blockData) + ',"previous":' + JSON.stringify(blockDataPrevious) + '}';
    const qrCode = await QRCode.toDataURL(this.qrString, { errorCorrectionLevel: 'L', scale: 16 });
    this.qrCodeImageBlock = qrCode;
  }

  async generateReceive(pendingHash) {
    this.qrCodeImageBlockReceive = null;
    this.qrString = null;
    this.blockHashReceive = null;

    const UIkit = window['UIkit'];
    const modal = UIkit.modal('#receive-modal');
    modal.show();

    const toAcct = await this.api.accountInfo(this.accountID);

    const openEquiv = !toAcct || !toAcct.frontier; // if open block

    const previousBlock = toAcct.frontier || this.zeroHash; // set to zeroes if open block
    const defaultRepresentative = this.settings.settings.defaultRepresentative || this.nanoBlock.getRandomRepresentative();
    const representative = toAcct.representative || defaultRepresentative;

    const srcBlockInfo = await this.api.blocksInfo([pendingHash]);
    const srcAmount = new BigNumber(srcBlockInfo.blocks[pendingHash].amount);
    const newBalance = openEquiv ? srcAmount : new BigNumber(toAcct.balance).plus(srcAmount);
    const newBalanceDecimal = newBalance.toString(10);

    const blockData = {
      account: this.accountID.replace('xrb_', 'nano_').toLowerCase(),
      previous: previousBlock,
      representative: representative,
      balance: newBalanceDecimal,
      link: pendingHash,
    };

    this.blockHashReceive = nanocurrency.hashBlock({
      account: blockData.account,
      link: blockData.link,
      previous: blockData.previous,
      representative: blockData.representative,
      balance: blockData.balance
    });
    console.log('Created block', blockData);
    console.log('Block hash: ' + this.blockHashReceive);

    // Previous block info
    let blockDataPrevious = null;
    if (!openEquiv) {
      const previousBlockInfo = await this.api.blockInfo(blockData.previous);
      if (!('contents' in previousBlockInfo)) return this.notifications.sendError(`Previous block not found`);
      const jsonBlock = JSON.parse(previousBlockInfo.contents);
      blockDataPrevious = {
        account: jsonBlock.account.replace('xrb_', 'nano_').toLowerCase(),
        previous: jsonBlock.previous,
        representative: jsonBlock.representative,
        balance: jsonBlock.balance,
        link: jsonBlock.link,
        signature: jsonBlock.signature,
      };
    }

    let qrData;
    if (blockDataPrevious) {
      qrData = {
        block: blockData,
        previous: blockDataPrevious
      };
    } else {
      qrData = {
        block: blockData
      };
    }

    // Nano signing standard
    this.qrString = 'nanosign:' + JSON.stringify(qrData);

    const qrCode = await QRCode.toDataURL(this.qrString, { errorCorrectionLevel: 'L', scale: 16 });
    this.qrCodeImageBlockReceive = qrCode;
  }

  async generateChange() {
    if (!this.util.account.isValidAccount(this.representativeModel)) return this.notifications.sendError(`Not a valid representative account`);
    this.qrCodeImageBlock = null;
    this.blockHash = null;
    this.qrString = null;

    const account = await this.api.accountInfo(this.accountID);

    if (!account || !('frontier' in account)) return this.notifications.sendError(`Account must be opened first!`);

    const balance = new BigNumber(account.balance);
    const balanceDecimal = balance.toString(10);
    const blockData = {
      account: this.accountID.replace('xrb_', 'nano_').toLowerCase(),
      previous: account.frontier,
      representative: this.representativeModel,
      balance: balanceDecimal,
      link: this.zeroHash,
    };

    this.blockHash = nanocurrency.hashBlock({
      account: blockData.account,
      link: blockData.link,
      previous: blockData.previous,
      representative: blockData.representative,
      balance: blockData.balance
    });

    console.log('Created block', blockData);
    console.log('Block hash: ' + this.blockHash);

    // Previous block info
    const previousBlockInfo = await this.api.blockInfo(blockData.previous);
    if (!('contents' in previousBlockInfo)) return this.notifications.sendError(`Previous block not found`);
    const jsonBlock = JSON.parse(previousBlockInfo.contents);
    const blockDataPrevious = {
      account: jsonBlock.account.replace('xrb_', 'nano_').toLowerCase(),
      previous: jsonBlock.previous,
      representative: jsonBlock.representative,
      balance: jsonBlock.balance,
      link: jsonBlock.link,
      signature: jsonBlock.signature,
    };

    // Nano signing standard
    this.qrString = 'nanosign:{"block":' + JSON.stringify(blockData) + ',"previous":' + JSON.stringify(blockDataPrevious) + '}';
    const qrCode = await QRCode.toDataURL(this.qrString, { errorCorrectionLevel: 'L', scale: 16 });
    this.qrCodeImageBlock = qrCode;
  }

  showRemote(state: boolean) {
    this.remoteVisible = !state;
  }

  showRemoteModal() {
    const UIkit = window['UIkit'];
    const modal = UIkit.modal('#block-modal');
    modal.show();
    this.clearRemoteVars();
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.toAccountID = data.content;
          this.validateDestination();
          break;
        case 'rep1':
          this.representativeModel = data.content;
          this.validateRepresentative();
          break;
      }
    }, () => {}
    );
  }

  resetRaw() {
    this.amountRaw = new BigNumber(0);
  }

  // End remote signing methods

}
