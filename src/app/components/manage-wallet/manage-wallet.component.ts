import { Component, OnInit } from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import * as QRCode from 'qrcode';
import * as bip from 'bip39';

@Component({
  selector: 'app-manage-wallet',
  templateUrl: './manage-wallet.component.html',
  styleUrls: ['./manage-wallet.component.css']
})
export class ManageWalletComponent implements OnInit {

  wallet = this.walletService.wallet;

  newPassword = '';
  confirmPassword = '';

  showQRExport = false;
  QRExportUrl = '';
  QRExportImg = '';

  constructor(
    public walletService: WalletService,
    public notifications: NotificationService) { }

  async ngOnInit() {
    this.wallet = this.walletService.wallet;
  }

  async changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      return this.notifications.sendError(`Passwords do not match`);
    }
    if (this.newPassword.length < 1) {
      return this.notifications.sendError(`Password cannot be empty`);
    }
    if (this.walletService.walletIsLocked()) {
      return this.notifications.sendWarning(`Wallet must be unlocked`);
    }

    this.walletService.wallet.password = this.newPassword;
    this.walletService.saveWalletExport();

    this.newPassword = '';
    this.confirmPassword = '';
    this.notifications.sendSuccess(`Wallet password successfully updated`);

    this.showQRExport = false;
  }

  async exportWallet() {
    if (this.walletService.walletIsLocked()) {
      return this.notifications.sendWarning(`Wallet must be unlocked`);
    }

    const exportUrl = this.walletService.generateExportUrl();
    this.QRExportUrl = exportUrl;
    this.QRExportImg = await QRCode.toDataURL(exportUrl, { errorCorrectionLevel: 'M', scale: 8 });
    this.showQRExport = true;
  }

  copied() {
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`);
  }

  seedMnemonic() {
    if (this.wallet && this.wallet.seed ) {
      return bip.entropyToMnemonic(this.wallet.seed);
    }
  }

  triggerFileDownload(fileName, exportData) {
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });

    // Check for iOS, which is weird with saving files
    const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, fileName);
    } else {
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

  exportToFile() {
    if (this.walletService.walletIsLocked()) {
      return this.notifications.sendWarning(`Wallet must be unlocked`);
    }

    const fileName = `Nault-Wallet.json`;
    const exportData = this.walletService.generateExportData();
    this.triggerFileDownload(fileName, exportData);

    this.notifications.sendSuccess(`Wallet export downloaded!`);
  }

}
