import {AfterViewInit, Component, OnInit, OnDestroy} from '@angular/core';
import {AddressBookService} from '../../services/address-book.service';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ModalService} from '../../services/modal.service';
import {UtilService} from '../../services/util.service';
import { QrModalService } from '../../services/qr-modal.service';
import {Router} from '@angular/router';
import * as QRCode from 'qrcode';
import {BigNumber} from 'bignumber.js';
import {ApiService} from '../../services/api.service';
import {PriceService} from '../../services/price.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {TranslocoService} from '@ngneat/transloco';

export interface BalanceAccount {
  balance: BigNumber;
  balanceRaw: BigNumber;
  pending: BigNumber;
  balanceFiat: number;
}

@Component({
  selector: 'app-address-book',
  templateUrl: './address-book.component.html',
  styleUrls: ['./address-book.component.css']
})

export class AddressBookComponent implements OnInit, AfterViewInit, OnDestroy {

  nano = 1000000000000000000000000;
  activePanel = 0;
  creatingNewEntry = false;

  addressBook$ = this.addressBookService.addressBook$;
  previousAddressName = '';
  newAddressAccount = '';
  newAddressName = '';
  addressBookShowQRExport = false;
  addressBookShowFileExport = false;
  addressBookQRExportUrl = '';
  addressBookQRExportImg = '';
  importExport = false;
  newTrackBalance = false;
  newTrackTransactions = false;
  accounts: BalanceAccount[] = [];
  totalTrackedBalance = new BigNumber(0);
  totalTrackedBalanceRaw = new BigNumber(0);
  totalTrackedBalanceFiat = 0;
  totalTrackedPending = new BigNumber(0);
  fiatPrice = 0;
  priceSub = null;
  refreshSub = null;
  statsRefreshEnabled = true;
  timeoutIdAllowingRefresh: any = null;
  loadingBalances = false;
  numberOfTrackedBalance = 0;

  constructor(
    private addressBookService: AddressBookService,
    private walletService: WalletService,
    public notificationService: NotificationService,
    public modal: ModalService,
    private util: UtilService,
    private qrModalService: QrModalService,
    private router: Router,
    private api: ApiService,
    private price: PriceService,
    public appSettings: AppSettingsService,
    private translocoService: TranslocoService) { }

  async ngOnInit() {
    this.addressBookService.loadAddressBook();
    // Keep price up to date with the service
    this.priceSub = this.price.lastPrice$.subscribe(event => {
      this.fiatPrice = this.price.price.lastPrice;
    });

    // Detect if local wallet balance is refreshed
    this.refreshSub = this.walletService.wallet.refresh$.subscribe(shouldRefresh => {
      if (shouldRefresh) {
        this.loadingBalances = true;
        // Check if we have a local wallet account tracked and update the balances
        for (const entry of this.addressBookService.addressBook) {
          if (!entry.trackBalance || !this.accounts[entry.account]) continue;
          // If the account exist in the wallet, take the info from there to save on RPC calls
          const walletAccount = this.walletService.wallet.accounts.find(a => a.id === entry.account);
          if (walletAccount) {
            // Subtract first so we can add back any updated amounts
            this.totalTrackedBalance = this.totalTrackedBalance.minus(this.accounts[entry.account].balance);
            this.totalTrackedBalanceRaw = this.totalTrackedBalanceRaw.minus(this.accounts[entry.account].balanceRaw);
            this.totalTrackedBalanceFiat = this.totalTrackedBalanceFiat - this.accounts[entry.account].balanceFiat;
            this.totalTrackedPending = this.totalTrackedPending.minus(this.accounts[entry.account].pending);

            this.accounts[entry.account].balance = walletAccount.balance;
            this.accounts[entry.account].pending = walletAccount.pending;
            this.accounts[entry.account].balanceFiat = walletAccount.balanceFiat;
            this.accounts[entry.account].balanceRaw = walletAccount.balanceRaw;

            this.totalTrackedBalance = this.totalTrackedBalance.plus(walletAccount.balance);
            this.totalTrackedBalanceRaw = this.totalTrackedBalanceRaw.plus(walletAccount.balanceRaw);
            this.totalTrackedBalanceFiat = this.totalTrackedBalanceFiat + walletAccount.balanceFiat;
            this.totalTrackedPending = this.totalTrackedPending.plus(this.accounts[entry.account].pending);
          }
        }
        this.loadingBalances = false;
      }
    });

    this.updateTrackedBalances();
  }

  ngOnDestroy() {
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    // Listen for reordering events
    document.getElementById('address-book-sortable').addEventListener('moved', (e) => {
      const element = e.target as HTMLDivElement;
      const elements = element.children;

      const result = [].slice.call(elements);
      const datas = result.map(el => el.dataset.account);

      this.addressBookService.setAddressBookOrder(datas);
      this.notificationService.sendSuccess(this.translocoService.translate('address-book.updated-address-book-order'));
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async updateTrackedBalances(refresh= false) {
    if (refresh && !this.statsRefreshEnabled) return;
    this.statsRefreshEnabled = false;
    if (this.timeoutIdAllowingRefresh != null) {
      clearTimeout(this.timeoutIdAllowingRefresh);
    }
    this.timeoutIdAllowingRefresh = setTimeout(() => this.statsRefreshEnabled = true, 5000);
    this.loadingBalances = true;

     // Inform html that at least one entry is tracked
    this.numberOfTrackedBalance = 0;
    for (const entry of this.addressBookService.addressBook) {
      if (entry.trackBalance) {
        this.numberOfTrackedBalance++;
      }
    }
    // No need to process if there is nothing to track
    if (this.numberOfTrackedBalance === 0) return;

    this.totalTrackedBalance = new BigNumber(0);
    this.totalTrackedBalanceRaw = new BigNumber(0);
    this.totalTrackedBalanceFiat = 0;
    this.totalTrackedPending = new BigNumber(0);

    // Get account balances for all account in address book not in wallet (which has tracking active)
    const accountIDsWallet = this.walletService.wallet.accounts.map(a => a.id);
    const accountIDs = this.addressBookService.addressBook.filter(a => !accountIDsWallet.includes(a.account) &&
      a.trackBalance).map(a => a.account);
    const apiAccounts = await this.api.accountsBalances(accountIDs);

    // Fetch pending of all tracked accounts
    let pending;
    if (this.appSettings.settings.minimumReceive) {
      const minAmount = this.util.nano.mnanoToRaw(this.appSettings.settings.minimumReceive);
      pending = await this.api.accountsPendingLimitSorted(accountIDs, minAmount.toString(10));
    } else {
      pending = await this.api.accountsPendingSorted(accountIDs);
    }

    // Save balances
    for (const entry of this.addressBookService.addressBook) {
      if (!entry.trackBalance) continue;

      const balanceAccount: BalanceAccount = {
        balance: new BigNumber(0),
        balanceRaw: new BigNumber(0),
        pending: new BigNumber(0),
        balanceFiat: 0
      };
      // If the account exist in the wallet, take the info from there to save on RPC calls
      const walletAccount = this.walletService.wallet.accounts.find(a => a.id === entry.account);
      if (walletAccount) {
        balanceAccount.balance = walletAccount.balance;
        balanceAccount.pending = walletAccount.pending;
        balanceAccount.balanceFiat = walletAccount.balanceFiat;
        balanceAccount.balanceRaw = walletAccount.balanceRaw;
      // Add balances from RPC data
      } else {
        balanceAccount.balance = new BigNumber(apiAccounts.balances[entry.account].balance);
        balanceAccount.balanceFiat = this.util.nano.rawToMnano(balanceAccount.balance).times(this.fiatPrice).toNumber();
        balanceAccount.balanceRaw = new BigNumber(balanceAccount.balance).mod(this.nano);
      }
      this.totalTrackedBalance = this.totalTrackedBalance.plus(balanceAccount.balance);
      this.totalTrackedBalanceRaw = this.totalTrackedBalanceRaw.plus(balanceAccount.balanceRaw);
      this.totalTrackedBalanceFiat = this.totalTrackedBalanceFiat + balanceAccount.balanceFiat;
      this.accounts[entry.account] = balanceAccount;
    }

    // Add pending from RPC data
    if (pending && pending.blocks) {
      for (const block in pending.blocks) {
        if (!pending.blocks.hasOwnProperty(block)) {
          continue;
        }

        const targetAccount = this.accounts[block];

        if (pending.blocks[block]) {
          let accountPending = new BigNumber(0);

          for (const hash in pending.blocks[block]) {
            if (!pending.blocks[block].hasOwnProperty(hash)) {
              continue;
            }
            accountPending = accountPending.plus(pending.blocks[block][hash].amount);
          }
          if (targetAccount) {
            targetAccount.pending = accountPending;
            this.totalTrackedPending = this.totalTrackedPending.plus(targetAccount.pending);
          }
        }
      }
    }

    // If not already updating balances, update to get latest values from internal wallet
    if (this.walletService.wallet.updatingBalance) {
      while (this.walletService.wallet.updatingBalance) {
        await this.sleep(100); // Wait until update is finished
      }
    } else {
      await this.walletService.reloadBalances();
    }

    this.loadingBalances = false;
  }

  addEntry() {
    this.previousAddressName = '';
    this.newTrackBalance = false;
    this.newTrackTransactions = false;
    this.creatingNewEntry = true;
    this.activePanel = 1;
  }

  editEntry(addressBook) {
    this.newAddressAccount = addressBook.account;
    this.previousAddressName = addressBook.name;
    this.newAddressName = addressBook.name;
    this.newTrackBalance = addressBook.trackBalance;
    this.newTrackTransactions = addressBook.trackTransactions;
    this.creatingNewEntry = false;
    this.activePanel = 1;
    setTimeout(() => {
      document.getElementById('new-address-name').focus();
    }, 150);
  }

  async saveNewAddress() {
    if (!this.newAddressAccount || !this.newAddressName) {
      return this.notificationService.sendError(this.translocoService.translate('address-book.account-and-name-are-required'));
    }

    if (this.newTrackBalance && this.numberOfTrackedBalance >= 20) {
      return this.notificationService.sendError(this.translocoService.translate('address-book.you-can-only-track-the-balance-of-maximum-20-addresses'));
    }

    // Trim and remove duplicate spaces
    this.newAddressName = this.newAddressName.trim().replace(/ +/g, ' ');

    const regexp = new RegExp('^(Account|' + this.translocoService.translate('general.account') + ') #\\d+$', 'g');
    if ( regexp.test(this.newAddressName) === true ) {
      return this.notificationService.sendError(this.translocoService.translate('address-book.this-name-is-reserved-for-wallet-accounts-without-a-label'));
    }

    if ( this.newAddressName.startsWith('@') === true ) {
      return this.notificationService.sendError(this.translocoService.translate('address-book.this-name-is-reserved-for-decentralized-aliases'));
    }

    // Remove spaces and convert to nano prefix
    this.newAddressAccount = this.newAddressAccount.replace(/ /g, '').replace('xrb_', 'nano_');

    // If the name has been changed, make sure no other entries are using that name
    if ( (this.newAddressName !== this.previousAddressName) && this.addressBookService.nameExists(this.newAddressName) ) {
      return this.notificationService.sendError(this.translocoService.translate('address-book.this-name-is-already-in-use-please-use-a-unique-name'));
    }

    // Make sure the address is valid
    const valid = this.util.account.isValidAccount(this.newAddressAccount);
    if (!valid) {
      return this.notificationService.sendWarning(
        this.translocoService.translate('address-book.account-id-is-not-a-valid-account')
      );
    }

    // Store old setting
    const wasTransactionTracked = this.addressBookService.getTransactionTrackingById(this.newAddressAccount);

    try {
      await this.addressBookService.saveAddress(this.newAddressAccount,
        this.newAddressName, this.newTrackBalance, this.newTrackTransactions);
      this.notificationService.sendSuccess(this.translocoService.translate('address-book.address-book-entry-saved-successfully'));
      // If this is one of our accounts, set its name and let it propagate through the app
      const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.newAddressAccount);
      if (walletAccount) {
        walletAccount.addressBookName = this.newAddressName;
      }

      // track account transaction (if unchanged)
      if (this.newTrackTransactions && !wasTransactionTracked) {
        this.walletService.trackAddress(this.newAddressAccount);

      } else if (!this.newTrackTransactions && wasTransactionTracked) {
        this.walletService.untrackAddress(this.newAddressAccount);
      }

      this.updateTrackedBalances();
      this.cancelNewAddress();
    } catch (err) {
      this.notificationService.sendError(this.translocoService.translate('address-book.unable-to-save-entry', { message: err.message }));
    }
  }

  cancelNewAddress() {
    this.newAddressName = '';
    this.newAddressAccount = '';
    this.activePanel = 0;
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(this.translocoService.translate('address-book.account-address-copied-to-clipboard'), { identifier: 'success-copied' });
  }

  async deleteAddress(account) {
    try {
      this.addressBookService.deleteAddress(account);
      this.notificationService.sendSuccess(this.translocoService.translate('address-book.successfully-deleted-address-book-entry'));
      this.walletService.untrackAddress(account);
      this.updateTrackedBalances();
    } catch (err) {
      this.notificationService.sendError(this.translocoService.translate('address-book.unable-to-delete-entry', { message: err.message }));
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.newAddressAccount = data.content;
          break;
      }
    }, () => {}
    );
  }

  // converts a Unicode string to a string in which
  // each 16-bit unit occupies only one byte
  toBinary(string) {
    const codeUnits = new Uint16Array(string.length);
    for (let i = 0; i < codeUnits.length; i++) {
      codeUnits[i] = string.charCodeAt(i);
    }
    return String.fromCharCode(...new Uint8Array(codeUnits.buffer));
  }

  async exportAddressBook() {
    const exportData = this.addressBookService.addressBook;
    const base64Data = btoa(this.toBinary(JSON.stringify(exportData)));
    const exportUrl = `https://nault.cc/import-address-book#${base64Data}`;
    this.addressBookQRExportUrl = exportUrl;
    this.addressBookShowFileExport = true;

    if (base64Data.length <= 2260) {
      this.addressBookShowQRExport = true;
      this.addressBookQRExportImg = await QRCode.toDataURL(exportUrl);
    }
  }

  exportAddressBookToFile() {
    const fileName = `Nault-AddressBook.json`;

    const exportData = this.addressBookService.addressBook;
    this.triggerFileDownload(fileName, exportData);

    this.notificationService.sendSuccess(this.translocoService.translate('address-book.address-book-export-downloaded'));
  }

  importFromFile(files) {
    if (!files.length) {
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target['result'] as string;
      try {
        const importData = JSON.parse(fileData);
        if (!importData.length || (!importData[0].account && !importData[0].address)) {
          return this.notificationService.sendError(this.translocoService.translate('address-book.bad-import-data-make-sure-you-selected-a-nault-address-book'));
        }

        const encoded = btoa(this.toBinary(JSON.stringify(importData)));
        this.router.navigate(['import-address-book'], { fragment: encoded });
      } catch (err) {
        this.notificationService.sendError(this.translocoService.translate('address-book.unable-to-parse-import-data-make-sure-you-selected-the-right'));
      }
    };

    reader.readAsText(file);
  }

  triggerFileDownload(fileName, exportData) {
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });

    // Check for iOS, which is weird with saving files
    const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

    const elem = window.document.createElement('a');
    const objUrl = window.URL.createObjectURL(blob);
    if (iOS) {
      elem.href = `data:attachment/file,${JSON.stringify(exportData)}`;
    } else {
      elem.href = objUrl;
    }
    elem.download = fileName;
    document.body.appendChild(elem);
    elem.click();
    setTimeout(function() {
      document.body.removeChild(elem);
      window.URL.revokeObjectURL(objUrl);
    }, 200);
  }

}
