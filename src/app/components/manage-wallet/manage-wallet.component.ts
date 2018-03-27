import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import * as QRCode from 'qrcode';
import {AddressBookService} from "../../services/address-book.service";
import {Router} from "@angular/router";
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
  addressBookShowQRExport = false;
  addressBookQRExportUrl = '';
  addressBookQRExportImg = '';

  constructor(
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    public notifications: NotificationService,
    private router: Router) { }

  async ngOnInit() {
    this.wallet = this.walletService.wallet;
  }

  async changePassword() {
    if (this.newPassword !== this.confirmPassword) return this.notifications.sendError(`Passwords do not match`);
    if (this.newPassword.length < 1) return this.notifications.sendError(`Password cannot be empty`);
    if (this.walletService.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);

    this.walletService.wallet.password = this.newPassword;
    this.walletService.saveWalletExport();

    this.newPassword = '';
    this.confirmPassword = '';
    this.notifications.sendSuccess(`Wallet password successfully updated`);
  }

  async exportWallet() {
    if (this.walletService.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);

    const exportUrl = this.walletService.generateExportUrl();
    this.QRExportUrl = exportUrl;
    this.QRExportImg = await QRCode.toDataURL(exportUrl);
    this.showQRExport = true;
  }

  copied() {
    this.notifications.sendSuccess(`Wallet seed copied to clipboard!`);
  }

  seedMnemonic() {
    return bip.entropyToMnemonic(this.wallet.seed);
  }

  async exportAddressBook() {
    const exportData = this.addressBookService.addressBook;
    if (exportData.length >= 25) {
      return this.notifications.sendError(`Address books with 25 or more entries need to use the file export method.`);
    }
    const base64Data = btoa(JSON.stringify(exportData));
    const exportUrl = `https://nanovault.io/import-address-book#${base64Data}`;

    this.addressBookQRExportUrl = exportUrl;
    this.addressBookQRExportImg = await QRCode.toDataURL(exportUrl);
    this.addressBookShowQRExport = true;
  }

  exportAddressBookToFile() {
    if (this.walletService.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);
    const fileName = `NanoVault-AddressBook.json`;

    const exportData = this.addressBookService.addressBook;
    this.triggerFileDownload(fileName, exportData);

    this.notifications.sendSuccess(`Address book export downloaded!`);
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
      setTimeout(function(){
        document.body.removeChild(elem);
        window.URL.revokeObjectURL(objUrl);
      }, 200);
    }
  }

  exportToFile() {
    if (this.walletService.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);

    const fileName = `NanoVault-Wallet.json`;
    const exportData = this.walletService.generateExportData();
    this.triggerFileDownload(fileName, exportData);

    this.notifications.sendSuccess(`Wallet export downloaded!`);
  }

  importFromFile(files) {
    if (!files.length) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target['result'];
      try {
        const importData = JSON.parse(fileData);
        if (!importData.length || !importData[0].account) {
          return this.notifications.sendError(`Bad import data, make sure you selected a NanoVault Address Book export`)
        }

        const walletEncrypted = btoa(JSON.stringify(importData));
        this.router.navigate(['import-address-book'], { fragment: walletEncrypted });
      } catch (err) {
        this.notifications.sendError(`Unable to parse import data, make sure you selected the right file!`);
      }
    };

    reader.readAsText(file);
  }

}
