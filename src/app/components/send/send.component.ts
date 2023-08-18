import { Component, OnInit } from '@angular/core';
import BigNumber from 'bignumber.js';
import {AddressBookService} from '../../services/address-book.service';
import {BehaviorSubject} from 'rxjs';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ApiService} from '../../services/api.service';
import {UtilService} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {ActivatedRoute} from '@angular/router';
import {PriceService} from '../../services/price.service';
import {NanoBlockService} from '../../services/nano-block.service';
import { QrModalService } from '../../services/qr-modal.service';
import { environment } from 'environments/environment';
import { TranslocoService } from '@ngneat/transloco';
import { HttpClient } from '@angular/common/http';
import * as nanocurrency from 'nanocurrency';

const nacl = window['nacl'];

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css']
})
export class SendComponent implements OnInit {
  nano = 1000000000000000000000000;

  activePanel = 'send';
  sendDestinationType = 'external-address';

  accounts = this.walletService.wallet.accounts;

  ALIAS_LOOKUP_DEFAULT_STATE = {
    fullText: '',
    name: '',
    domain: '',
  }

  aliasLookup = {
    ...this.ALIAS_LOOKUP_DEFAULT_STATE,
  }
  aliasLookupInProgress = {
    ...this.ALIAS_LOOKUP_DEFAULT_STATE,
  }
  aliasLookupLatestSuccessful = {
    ...this.ALIAS_LOOKUP_DEFAULT_STATE,
    address: '',
  }
  aliasResults$ = new BehaviorSubject([]);
  addressBookResults$ = new BehaviorSubject([]);
  isDestinationAccountAlias = false;
  showAddressBook = false;
  addressBookMatch = '';
  addressAliasMatch = '';

  amounts = [
    { name: 'XNO', shortName: 'XNO', value: 'mnano' },
    { name: 'knano', shortName: 'knano', value: 'knano' },
    { name: 'nano', shortName: 'nano', value: 'nano' },
  ];
  selectedAmount = this.amounts[0];

  amount = null;
  amountExtraRaw = new BigNumber(0);
  amountFiat: number|null = null;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccount: any = {};
  fromAccountID: any = '';
  fromAddressBook = '';
  toAccount: any = false;
  toAccountID = '';
  toOwnAccountID: any = '';
  toAddressBook = '';
  toAccountStatus = null;
  amountStatus = null;
  preparingTransaction = false;
  confirmingTransaction = false;
  selAccountInit = false;

  constructor(
    private route: ActivatedRoute,
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nodeApi: ApiService,
    private nanoBlock: NanoBlockService,
    public price: PriceService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private util: UtilService,
    private qrModalService: QrModalService,
    private http: HttpClient,
    private translocoService: TranslocoService) { }

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;

    this.updateQueries(params);

    this.addressBookService.loadAddressBook();

    // Set default From account
    this.fromAccountID = this.accounts.length ? this.accounts[0].id : '';

    // Update selected account if changed in the sidebar
    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      if (this.activePanel !== 'send') {
        // Transaction details already finalized
        return;
      }

      if (this.selAccountInit) {
        if (acc) {
          this.fromAccountID = acc.id;
        } else {
          this.findFirstAccount();
        }
      }
      this.selAccountInit = true;
    });

    // Update the account if query params changes. For example donation button while active on this page
    this.route.queryParams.subscribe(queries => {
      this.updateQueries(queries);
    });

    // Set the account selected in the sidebar as default
    if (this.walletService.wallet.selectedAccount !== null) {
      this.fromAccountID = this.walletService.wallet.selectedAccount.id;
    } else {
      // If "total balance" is selected in the sidebar, use the first account in the wallet that has a balance
      this.findFirstAccount();
    }
  }

  updateQueries(params) {
    if ( params && params.amount && !isNaN(params.amount) ) {
      const amountAsRaw =
        new BigNumber(
          this.util.nano.mnanoToRaw(
            new BigNumber(params.amount)
          )
        );

      this.amountExtraRaw = amountAsRaw.mod(this.nano).floor();

      this.amount =
        this.util.nano.rawToMnano(
          amountAsRaw.minus(this.amountExtraRaw)
        ).toNumber();

      this.syncFiatPrice();
    }

    if (params && params.to) {
      this.toAccountID = params.to;
      this.offerLookupIfDestinationIsAlias();
      this.validateDestination();
      this.sendDestinationType = 'external-address';
    }
  }

  async findFirstAccount() {
    // Load balances before we try to find the right account
    if (this.walletService.wallet.balance.isZero()) {
      await this.walletService.reloadBalances();
    }

    // Look for the first account that has a balance
    const accountIDWithBalance = this.accounts.reduce((previous, current) => {
      if (previous) return previous;
      if (current.balance.gt(0)) return current.id;
      return null;
    }, null);

    if (accountIDWithBalance) {
      this.fromAccountID = accountIDWithBalance;
    }
  }

  // An update to the Nano amount, sync the fiat value
  syncFiatPrice() {
    if (!this.validateAmount() || Number(this.amount) === 0) {
      this.amountFiat = null;
      return;
    }
    const rawAmount = this.getAmountBaseValue(this.amount || 0).plus(this.amountExtraRaw);
    if (rawAmount.lte(0)) {
      this.amountFiat = null;
      return;
    }

    // This is getting hacky, but if their currency is bitcoin, use 6 decimals, if it is not, use 2
    const precision = this.settings.settings.displayCurrency === 'BTC' ? 1000000 : 100;

    // Determine fiat value of the amount
    const fiatAmount = this.util.nano.rawToMnano(rawAmount).times(this.price.price.lastPrice)
      .times(precision).floor().div(precision).toNumber();

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

  onDestinationAddressInput() {
    this.addressAliasMatch = '';
    this.addressBookMatch = '';

    this.offerLookupIfDestinationIsAlias();
    this.searchAddressBook();

    const destinationAddress = this.toAccountID || '';

    const nanoURIScheme = /^nano:.+$/g;
    const isNanoURI = nanoURIScheme.test(destinationAddress);

    if (isNanoURI === true) {
      const url = new URL(destinationAddress);

      if (this.util.account.isValidAccount(url.pathname)) {
        const amountAsRaw = url.searchParams.get('amount');

        const amountAsXNO = (
            amountAsRaw
          ? nanocurrency.convert(
              amountAsRaw, {
                from: nanocurrency.Unit.raw,
                to: nanocurrency.Unit.NANO
              }
            ).toString()
          : null
        );

        setTimeout(
          () => {
            this.updateQueries({
              to: url.pathname,
              amount: amountAsXNO,
            });
          },
          10
        );
      }
    }
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

  offerLookupIfDestinationIsAlias() {
    const destinationAddress = this.toAccountID || '';

    const mayBeAnAlias = (
        ( destinationAddress.startsWith('@') === true )
      && ( destinationAddress.includes('.') === true )
      && ( destinationAddress.endsWith('.') === false )
      && ( destinationAddress.includes('/') === false )
      && ( destinationAddress.includes('?') === false )
    );

    if (mayBeAnAlias === false) {
      this.isDestinationAccountAlias = false;
      this.aliasLookup = {
        ...this.ALIAS_LOOKUP_DEFAULT_STATE,
      };
      this.aliasResults$.next([]);
      return
    }

    this.isDestinationAccountAlias = true;

    let aliasWithoutFirstSymbol = destinationAddress.slice(1).toLowerCase();

    if (aliasWithoutFirstSymbol.startsWith('_@') === true ) {
      aliasWithoutFirstSymbol = aliasWithoutFirstSymbol.slice(2);
    }

    const aliasSplitResults = aliasWithoutFirstSymbol.split('@');

    let aliasName = ''
    let aliasDomain = ''

    if (aliasSplitResults.length === 2) {
      aliasName = aliasSplitResults[0]
      aliasDomain = aliasSplitResults[1]
    } else {
      aliasDomain = aliasSplitResults[0]
    }

    this.aliasLookup = {
      fullText: `@${aliasWithoutFirstSymbol}`,
      name: aliasName,
      domain: aliasDomain,
    };

    this.aliasResults$.next([{ ...this.aliasLookup }]);

    this.toAccountStatus = 1; // Neutral state
  }

  async lookupAlias() {
    if (this.aliasLookup.domain === '') {
      return;
    }

    if (this.settings.settings.decentralizedAliasesOption === 'disabled') {
      const UIkit = window['UIkit'];
      try {
        await UIkit.modal.confirm(
          `<p class="uk-alert uk-alert-warning"><br><span class="uk-flex"><span uk-icon="icon: warning; ratio: 3;" class="uk-align-center"></span></span>
          <span style="font-size: 18px;">
          ${ this.translocoService.translate('configure-app.decentralized-aliases-require-external-requests') }
          </span>`,
          {
            labels: {
              cancel: this.translocoService.translate('general.cancel'),
              ok: this.translocoService.translate('configure-app.allow-external-requests'),
            }
          }
        );

        this.settings.setAppSetting('decentralizedAliasesOption', 'enabled');
      } catch (err) {
        // pressed cancel, or a different error
        return;
      }
    }

    this.toAccountStatus = 1; // Neutral state

    const aliasLookup = { ...this.aliasLookup };

    const aliasFullText = aliasLookup.fullText;
    const aliasDomain = aliasLookup.domain;

    const aliasName = (
        (aliasLookup.name !== '')
      ? aliasLookup.name
      : '_'
    );

    const lookupUrl =
      `https://${ aliasDomain }/.well-known/nano-currency.json?names=${ aliasName }`;

    this.aliasLookupInProgress = {
      ...aliasLookup,
    };

    await this.http.get<any>(lookupUrl).toPromise()
      .then(res => {
        const isOutdatedRequest = (
            this.aliasLookupInProgress.fullText
          !== aliasFullText
        );

        if (isOutdatedRequest === true) {
          return;
        }

        this.aliasLookupInProgress = {
          ...this.ALIAS_LOOKUP_DEFAULT_STATE,
        };

        try {
          const aliasesInJsonCount = (
              ( Array.isArray(res.names) === true )
            ? res.names.length
            : 0
          );

          if (aliasesInJsonCount === 0) {
            this.toAccountStatus = 0; // Error state
            this.notificationService.sendWarning(`Alias @${aliasName} not found on ${aliasDomain}`);
            return;
          }

          const matchingAccount =
            res.names.find(
              (account) =>
                (account.name === aliasName)
            );

          if (matchingAccount == null) {
            this.toAccountStatus = 0; // Error state
            this.notificationService.sendWarning(`Alias @${aliasName} not found on ${aliasDomain}`);
            return;
          }

          if (!this.util.account.isValidAccount(matchingAccount.address)) {
            this.toAccountStatus = 0; // Error state
            this.notificationService.sendWarning(`Alias ${aliasFullText} does not have a valid address`);
            return;
          }

          this.toAccountID = matchingAccount.address;

          this.aliasLookupLatestSuccessful = {
            ...aliasLookup,
            address: this.toAccountID,
          };

          this.onDestinationAddressInput();
          this.validateDestination();

          return;
        } catch(err) {
          this.toAccountStatus = 0; // Error state
          this.notificationService.sendWarning(`Unknown error has occurred while trying to lookup ${aliasFullText}`);
          return;
        }
      })
      .catch(err => {
        this.aliasLookupInProgress = {
          ...this.ALIAS_LOOKUP_DEFAULT_STATE,
        };
        this.toAccountStatus = 0; // Error state

        if (err.status === 404) {
          this.notificationService.sendWarning(`No aliases found on ${aliasDomain}`);
        } else {
          this.notificationService.sendWarning(`Could not reach domain ${aliasDomain}`);
        }

        return;
      });
  }

  selectBookEntry(account) {
    this.showAddressBook = false;
    this.toAccountID = account;
    this.isDestinationAccountAlias = false;
    this.searchAddressBook();
    this.validateDestination();
  }

  setSendDestinationType(newType: string) {
    this.sendDestinationType = newType;
  }

  async validateDestination() {
    // The timeout is used to solve a bug where the results get hidden too fast and the click is never registered
    setTimeout(() => this.showAddressBook = false, 400);

    // Remove spaces from the account id
    this.toAccountID = this.toAccountID.replace(/ /g, '');

    this.addressAliasMatch = (
        (
            (this.aliasLookupLatestSuccessful.address !== '')
          && (this.aliasLookupLatestSuccessful.address === this.toAccountID)
        )
      ? this.aliasLookupLatestSuccessful.fullText
      : null
    );

    if (this.isDestinationAccountAlias === true) {
      this.addressBookMatch = null;
      this.toAccountStatus = 1; // Neutral state
      return;
    }

    this.addressBookMatch = (
        this.addressBookService.getAccountName(this.toAccountID)
      || this.getAccountLabel(this.toAccountID, null)
    );

    if (!this.addressBookMatch && this.toAccountID === environment.donationAddress) {
      this.addressBookMatch = 'Nault Donations';
    }

    // const accountInfo = await this.walletService.walletApi.accountInfo(this.toAccountID);
    this.toAccountStatus = null;
    if (this.util.account.isValidAccount(this.toAccountID)) {
      const accountInfo = await this.nodeApi.accountInfo(this.toAccountID);
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

  getAccountLabel(accountID, defaultLabel) {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === accountID);

    if (walletAccount == null) {
      return defaultLabel;
    }

    return (this.translocoService.translate('general.account') + ' #' + walletAccount.index);
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

  getDestinationID() {
    if (this.sendDestinationType === 'external-address') {
      return this.toAccountID;
    }

    // 'own-address'
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.toOwnAccountID);

    if (!walletAccount) {
      // Unable to find receiving account in wallet
      return '';
    }

    if (this.toOwnAccountID === this.fromAccountID) {
      // Sending to the same address is only allowed via 'external-address'
      return '';
    }

    return this.toOwnAccountID;
  }

  async sendTransaction() {
    const destinationID = this.getDestinationID();
    const isValid = this.util.account.isValidAccount(destinationID);
    if (!isValid) {
      return this.notificationService.sendWarning(`To account address is not valid`);
    }
    if (!this.fromAccountID || !destinationID) {
      return this.notificationService.sendWarning(`From and to account are required`);
    }
    if (!this.validateAmount()) {
      return this.notificationService.sendWarning(`Invalid XNO amount`);
    }

    this.preparingTransaction = true;

    const from = await this.nodeApi.accountInfo(this.fromAccountID);
    const to = await this.nodeApi.accountInfo(destinationID);

    this.preparingTransaction = false;

    if (!from) {
      return this.notificationService.sendError(`From account not found`);
    }

    from.balanceBN = new BigNumber(from.balance || 0);
    to.balanceBN = new BigNumber(to.balance || 0);

    this.fromAccount = from;
    this.toAccount = to;

    const rawAmount = this.getAmountBaseValue(this.amount || 0);
    this.rawAmount = rawAmount.plus(this.amountExtraRaw);

    const nanoAmount = this.rawAmount.div(this.nano);

    if (this.amount < 0 || rawAmount.lessThan(0)) {
      return this.notificationService.sendWarning(`Amount is invalid`);
    }
    if (from.balanceBN.minus(rawAmount).lessThan(0)) {
      return this.notificationService.sendError(`From account does not have enough XNO`);
    }

    // Determine a proper raw amount to show in the UI, if a decimal was entered
    this.amountExtraRaw = this.rawAmount.mod(this.nano);

    // Determine fiat value of the amount
    this.amountFiat = this.util.nano.rawToMnano(rawAmount).times(this.price.price.lastPrice).toNumber();

    this.fromAddressBook = (
        this.addressBookService.getAccountName(this.fromAccountID)
      || this.getAccountLabel(this.fromAccountID, 'Account')
    );

    this.toAddressBook = (
        this.addressBookService.getAccountName(destinationID)
      || this.getAccountLabel(destinationID, null)
    );

    // Start precomputing the work...
    this.workPool.addWorkToCache(this.fromAccount.frontier, 1);

    this.activePanel = 'confirm';
  }

  async confirmTransaction() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.fromAccountID);
    if (!walletAccount) {
      throw new Error(`Unable to find sending account in wallet`);
    }
    if (this.walletService.isLocked()) {
      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }

    this.confirmingTransaction = true;

    try {
      const destinationID = this.getDestinationID();

      const newHash = await this.nanoBlock.generateSend(walletAccount, destinationID,
        this.rawAmount, this.walletService.isLedgerWallet());

      if (newHash) {
        this.notificationService.removeNotification('success-send');
        this.notificationService.sendSuccess(`Successfully sent ${this.amount} ${this.selectedAmount.shortName}!`, { identifier: 'success-send' });
        this.activePanel = 'send';
        this.amount = null;
        this.amountFiat = null;
        this.resetRaw();
        this.toAccountID = '';
        this.toOwnAccountID = '';
        this.toAccountStatus = null;
        this.fromAddressBook = '';
        this.toAddressBook = '';
        this.addressBookMatch = '';
        this.addressAliasMatch = '';
      } else {
        if (!this.walletService.isLedgerWallet()) {
          this.notificationService.sendError(`There was an error sending your transaction, please try again.`);
        }
      }
    } catch (err) {
      this.notificationService.sendError(`There was an error sending your transaction: ${err.message}`);
    }


    this.confirmingTransaction = false;
  }

  setMaxAmount() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.fromAccountID);
    if (!walletAccount) {
      return;
    }

    this.amountExtraRaw = walletAccount.balanceRaw;

    const nanoVal = this.util.nano.rawToNano(walletAccount.balance).floor();
    const maxAmount = this.getAmountValueFromBase(this.util.nano.nanoToRaw(nanoVal));
    this.amount = maxAmount.toNumber();
    this.syncFiatPrice();
  }

  resetRaw() {
    this.amountExtraRaw = new BigNumber(0);
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

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.toAccountID = data.content;
          this.validateDestination();
          break;
      }
    }, () => {}
    );
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

}
