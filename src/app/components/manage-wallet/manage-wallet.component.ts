import { Component, OnInit } from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ApiService} from '../../services/api.service';
import {UtilService} from '../../services/util.service';
import {AppSettingsService} from '../../services/app-settings.service';
import * as QRCode from 'qrcode';
import * as bip from 'bip39';
import {formatDate} from '@angular/common';

@Component({
  selector: 'app-manage-wallet',
  templateUrl: './manage-wallet.component.html',
  styleUrls: ['./manage-wallet.component.css']
})
export class ManageWalletComponent implements OnInit {

  wallet = this.walletService.wallet;
  accounts = this.walletService.wallet.accounts;

  newPassword = '';
  confirmPassword = '';

  showQRExport = false;
  QRExportUrl = '';
  QRExportImg = '';

  csvExportStarted = false;
  transactionHistoryLimit = 500; // if the backend server limit changes, change this too
  selAccountInit = false;
  invalidCsvCount = false;
  invalidCsvOffset = false;
  csvAccount = this.accounts.length > 0 ? this.accounts[0].id : '0';
  csvCount = this.transactionHistoryLimit.toString();
  csvOffset = '';
  beyondCsvLimit = false;
  exportingCsv = false;
  orderOptions = [
    { name: 'Newest Transactions First', value: false },
    { name: 'Oldest Transactions First', value: true },
  ];
  selectedOrder = this.orderOptions[0].value;
  exportEnabled = true;

  constructor(
    public walletService: WalletService,
    public notifications: NotificationService,
    private api: ApiService,
    private util: UtilService,
    public settings: AppSettingsService) { }

  async ngOnInit() {
    this.wallet = this.walletService.wallet;

    // Update selected account if changed in the sidebar
    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      if (this.selAccountInit) {
        this.csvAccount = acc ? acc.id : (this.accounts.length > 0 ? this.accounts[0].id : '0');
      }
      this.selAccountInit = true;
    });

    // Set the account selected in the sidebar as default
    if (this.walletService.wallet.selectedAccount !== null) {
      this.csvAccount = this.walletService.wallet.selectedAccount.id;
    }
  }

  async changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      return this.notifications.sendError(`Passwords do not match`);
    }
    if (this.newPassword.length < 1) {
      return this.notifications.sendError(`Password cannot be empty`);
    }
    if (this.walletService.isLocked()) {
      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }

    this.walletService.wallet.password = this.newPassword;
    this.walletService.saveWalletExport();

    this.newPassword = '';
    this.confirmPassword = '';
    this.notifications.sendSuccess(`Wallet password successfully updated`);

    this.showQRExport = false;
  }

  async exportWallet() {
    if (this.walletService.isLocked()) {
      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }

    const exportUrl = this.walletService.generateExportUrl();
    this.QRExportUrl = exportUrl;
    this.QRExportImg = await QRCode.toDataURL(exportUrl, { errorCorrectionLevel: 'M', scale: 8 });
    this.showQRExport = true;
  }

  copied() {
    this.notifications.removeNotification('success-copied');
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`, { identifier: 'success-copied' });
  }

  seedMnemonic() {
    if (this.wallet && this.wallet.seed ) {
      return bip.entropyToMnemonic(this.wallet.seed);
    }
  }

  triggerFileDownload(fileName, exportData, type) {
    let blob;
    // first line, include columns for spreadsheet
    let csvFile = 'account,type,amount,hash,height,time\n';

    switch (type) {
      case 'json':
        blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        break;
      case 'csv':
        // comma-separated attributes for each row
        const processRow = function (row) {
          let finalVal = '';
          let j = 0;
          for (const [key, value] of Object.entries(row)) {
            const innerValue = value === null ? '' : value.toString();
            let result = innerValue.replace(/"/g, '""');
            if (result.search(/("|,| |\n)/g) >= 0) {
              result = '"' + result + '"';
            }
            if (j > 0) {
              finalVal += ',';
            }
            j++;
            finalVal += result;
          }
          return finalVal + '\n';
        };
        for (let i = 0; i < exportData.length; i++) {
          csvFile += processRow(exportData[i]);
        }
        blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
        break;
    }

    // Check for iOS, which is weird with saving files
    const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

    const elem = window.document.createElement('a');
    const objUrl = window.URL.createObjectURL(blob);
    if (iOS) {
      switch (type) {
        case 'json':
          elem.href = `data:attachment/file,${JSON.stringify(exportData)}`;
          break;
        case 'csv':
          elem.href = `data:attachment/file,${csvFile}`;
          break;
      }
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

  async exportToFile() {
    if (this.walletService.isLocked()) {
      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }

    const fileName = `Nault-Wallet.json`;
    const exportData = this.walletService.generateExportData();
    this.triggerFileDownload(fileName, exportData, 'json');

    this.notifications.sendSuccess(`Wallet export downloaded!`);
  }

  csvCountChange(count) {
    if (this.util.string.isNumeric(count) && count % 1 === 0 || count === '') {
      // only allow beyond limit if using a custom server
      if (this.settings.settings.serverName !== 'custom' &&
      (parseInt(count, 10) > this.transactionHistoryLimit || count === '' || count === '0')) {
        this.invalidCsvCount = true;
        this.beyondCsvLimit = true;
      } else {
        if (parseInt(count, 10) < 0) {
          this.invalidCsvCount = true;
          this.beyondCsvLimit = false;
        } else {
          this.invalidCsvCount = false;
          this.beyondCsvLimit = false;
        }
      }
    } else {
      this.invalidCsvCount = true;
    }
  }

  csvOffsetChange(offset) {
    if (this.util.string.isNumeric(offset) && offset % 1 === 0 || offset === '') {
      if (parseInt(offset, 10) < 0) {
        this.invalidCsvOffset = true;
      } else {
        this.invalidCsvOffset = false;
      }
    } else {
      this.invalidCsvOffset = true;
    }
  }

  csvInit() {
    this.csvExportStarted = true;
  }

  async exportToCsv() {
    // disable export for a period to reduce RPC calls
    if (!this.exportEnabled) return;
    this.exportEnabled = false;
    setTimeout(() => this.exportEnabled = true, 3000);

    if (this.invalidCsvCount) {
      if (this.beyondCsvLimit) {
        return this.notifications.sendWarning(`To export transactions above the limit, please use a custom Nault server`);
      } else {
        return this.notifications.sendWarning(`Invalid limit`);
      }
    }
    if (this.invalidCsvOffset) {
      return this.notifications.sendWarning(`Invalid offset`);
    }

    this.exportingCsv = true;
    const transactionCount = this.csvCount === '' ? 0 : parseInt(this.csvCount, 10);
    const transactionOffset = this.csvOffset === '' ? 0 : parseInt(this.csvOffset, 10);
    const history = await this.api.accountHistory(this.csvAccount, transactionCount, false, transactionOffset, this.selectedOrder);
    this.exportingCsv = false; // reset it here in case the file download fails (don't want spinning button forever)

    // contruct the export data
    const csvData = [];
    if (history && history.history && history.history.length > 0) {
      history.history.forEach(a => {
        csvData.push({'account': a.account, 'type': a.type, 'amount': this.util.nano.rawToMnano(a.amount).toString(10),
        'hash': a.hash, 'height': a.height, 'time': formatDate(a.local_timestamp * 1000, 'y-MM-d HH:mm:ss', 'en-US')});
      });
    }

    if (csvData.length === 0) {
      return this.notifications.sendWarning(`No transaction history found or bad server response!`);
    }

    // download file
    const fileName = `${this.csvAccount}_offset=${this.csvOffset === '' ? 0 : this.csvOffset}${this.selectedOrder === true ? '_oldestFirst' : '_newestFirst'}.csv`;
    this.triggerFileDownload(fileName, csvData, 'csv');
    this.notifications.sendSuccess(`Transaction history downloaded!`);
  }
}
