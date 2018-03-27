import {AfterViewInit, Component, OnInit} from '@angular/core';
import {AddressBookService} from "../../services/address-book.service";
import {WalletService} from "../../services/wallet.service";
import {NotificationService} from "../../services/notification.service";
import {ModalService} from "../../services/modal.service";
import {ApiService} from "../../services/api.service";
import {Router} from "@angular/router";

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

  constructor(
    private addressBookService: AddressBookService,
    private walletService: WalletService,
    private notificationService: NotificationService,
    public modal: ModalService,
    private router: Router,
    private nodeApi: ApiService) { }

  async ngOnInit() {
    this.addressBookService.loadAddressBook();
  }

  ngAfterViewInit() {
    // Listen for reordering events
    document.getElementById('address-book-sortable').addEventListener('moved', (e) => {
      const elements = e.srcElement.children;

      const result = [].slice.call(elements);
      const datas = result.map(e => e.dataset.account);

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
    const valid = await this.nodeApi.validateAccountNumber(this.newAddressAccount);
    if (!valid || valid.valid !== '1') return this.notificationService.sendWarning(`Account ID is not a valid account`);

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
      this.notificationService.sendError(`Unable to save entry: ${err.message}`)
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
      this.notificationService.sendSuccess(`Successfully deleted address book entry`)
    } catch (err) {
      this.notificationService.sendError(`Unable to delete entry: ${err.message}`)
    }
  }

}
