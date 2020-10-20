import {AfterViewInit, Component, OnInit} from '@angular/core';
import {AddressBookService} from '../../services/address-book.service';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ModalService} from '../../services/modal.service';
import {UtilService} from '../../services/util.service';
import { QrModalService } from '../../services/qr-modal.service';
import {Router} from '@angular/router';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-address-book',
  templateUrl: './address-book.component.html',
  styleUrls: ['./address-book.component.css']
})
export class AddressBookComponent implements OnInit, AfterViewInit {

  activePanel = 0;

  addressBook$ = this.addressBookService.addressBook$;
  newAddressAccount = '';
  newAddressName = '';
  addressBookShowQRExport = false;
  addressBookQRExportUrl = '';
  addressBookQRExportImg = '';
  importExport = false;

  constructor(
    private addressBookService: AddressBookService,
    private walletService: WalletService,
    public notificationService: NotificationService,
    public modal: ModalService,
    private util: UtilService,
    private qrModalService: QrModalService,
    private router: Router) { }

  async ngOnInit() {
    this.addressBookService.loadAddressBook();
  }

  ngAfterViewInit() {
    // Listen for reordering events
    document.getElementById('address-book-sortable').addEventListener('moved', (e) => {
      const element = e.target as HTMLDivElement;
      const elements = element.children;

      const result = [].slice.call(elements);
      const datas = result.map(el => el.dataset.account);

      this.addressBookService.setAddressBookOrder(datas);
      this.notificationService.sendSuccess(`Updated address book order`);
    });
  }

  editEntry(addressBook) {
    this.newAddressAccount = addressBook.account;
    this.newAddressName = addressBook.name;
    this.activePanel = 1;
    setTimeout(() => {
      document.getElementById('new-address-name').focus();
    }, 150);
  }

  async saveNewAddress() {
    if (!this.newAddressAccount || !this.newAddressName) return this.notificationService.sendError(`Account and name are required`);

    this.newAddressAccount = this.newAddressAccount.replace(/ /g, ''); // Remove spaces

    // Make sure name doesn't exist
    if (this.addressBookService.nameExists(this.newAddressName)) {
      return this.notificationService.sendError(`This name is already in use!  Please use a unique name`);
    }

    // Make sure the address is valid
    const valid = this.util.account.isValidAccount(this.newAddressAccount);
    if (!valid) return this.notificationService.sendWarning(`Account ID is not a valid account`);

    try {
      await this.addressBookService.saveAddress(this.newAddressAccount, this.newAddressName);
      this.notificationService.sendSuccess(`Successfully created new name for account!`);
      // IF this is one of our accounts, set its name, and hope things update?
      const walletAccount = this.walletService.wallet.accounts.find(a => a.id.toLowerCase() === this.newAddressAccount.toLowerCase());
      if (walletAccount) {
        walletAccount.addressBookName = this.newAddressName;
      }
      this.cancelNewAddress();
    } catch (err) {
      this.notificationService.sendError(`Unable to save entry: ${err.message}`);
    }
  }

  cancelNewAddress() {
    this.newAddressName = '';
    this.newAddressAccount = '';
    this.activePanel = 0;
  }

  copied() {
    this.notificationService.sendSuccess(`Account address copied to clipboard!`);
  }

  async deleteAddress(account) {
    try {
      this.addressBookService.deleteAddress(account);
      this.notificationService.sendSuccess(`Successfully deleted address book entry`);
    } catch (err) {
      this.notificationService.sendError(`Unable to delete entry: ${err.message}`);
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

  async exportAddressBook() {
    const exportData = this.addressBookService.addressBook;
    if (exportData.length >= 25) {
      return this.notificationService.sendError(`Address books with more than 24 entries need to use the file export method.`);
    }
    const base64Data = btoa(JSON.stringify(exportData));
    const exportUrl = `https://nault.cc/import-address-book#${base64Data}`;

    this.addressBookQRExportUrl = exportUrl;
    this.addressBookQRExportImg = await QRCode.toDataURL(exportUrl);
    this.addressBookShowQRExport = true;
  }

  exportAddressBookToFile() {
    const fileName = `Nault-AddressBook.json`;

    const exportData = this.addressBookService.addressBook;
    this.triggerFileDownload(fileName, exportData);

    this.notificationService.sendSuccess(`Address book export downloaded!`);
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
        if (!importData.length || !importData[0].account) {
          return this.notificationService.sendError(`Bad import data, make sure you selected a Nault Address Book export`);
        }

        const encoded = btoa(JSON.stringify(importData));
        this.router.navigate(['import-address-book'], { fragment: encoded });
      } catch (err) {
        this.notificationService.sendError(`Unable to parse import data, make sure you selected the right file!`);
      }
    };

    reader.readAsText(file);
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

}
