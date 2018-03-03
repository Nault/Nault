import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import * as QRCode from 'qrcode';

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

  constructor(private walletService: WalletService, private notificationService: NotificationService) { }

  async ngOnInit() {
    this.wallet = this.walletService.wallet;
  }

  async changePassword() {
    if (this.newPassword !== this.confirmPassword) return this.notificationService.sendError(`Passwords do not match`);
    if (this.newPassword.length < 1) return this.notificationService.sendError(`Password cannot be empty`);
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    this.walletService.wallet.password = this.newPassword;
    this.walletService.saveWalletExport();

    this.newPassword = '';
    this.confirmPassword = '';
    this.notificationService.sendSuccess(`Wallet password successfully updated`);
  }

  async exportWallet() {
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    const exportUrl = this.walletService.generateExportUrl();
    this.QRExportUrl = exportUrl;
    this.QRExportImg = await QRCode.toDataURL(exportUrl);
    this.showQRExport = true;
  }

  copied() {
    this.notificationService.sendSuccess(`Wallet seed copied to clipboard!`);
  }

  exportToFile() {
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarning(`Wallet must be unlocked`);

    const fileName = `NanoVault-Wallet.json`;
    const exportData = this.walletService.generateExportData();
    const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, fileName);
    } else {
      const elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = fileName;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }

    this.notificationService.sendSuccess(`Wallet export downloaded!`);
  }

}
