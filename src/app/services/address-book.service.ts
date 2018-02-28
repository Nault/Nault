import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable()
export class AddressBookService {
  storeKey = `nanovault-addressbook`;

  addressBook = [];

  addressBook$ = new BehaviorSubject([]);

  constructor() { }

  loadAddressBook() {
    let addressBook = [];
    const addressBookStore = localStorage.getItem(this.storeKey);
    if (addressBookStore) {
      addressBook = JSON.parse(addressBookStore);
    }
    this.addressBook = addressBook;
    this.addressBook$.next(this.addressBook);

    return this.addressBook;
  }

  async saveAddress(account, name) {
    const existingName = this.addressBook.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existingName) throw new Error(`Name already exists in the address book`);

    const existingAccount = this.addressBook.find(a => a.account.toLowerCase() === account.toLowerCase());
    if (existingAccount) {
      existingAccount.name = name;
    } else {
      this.addressBook.push({ account, name });
    }
    this.saveAddressBook();
    this.addressBook$.next(this.addressBook);

  }

  async deleteAddress(account) {
    const existingAccountIndex = this.addressBook.findIndex(a => a.account.toLowerCase() === account.toLowerCase());
    if (existingAccountIndex === -1) return;

    this.addressBook.splice(existingAccountIndex, 1);

    this.saveAddressBook();

    this.addressBook$.next(this.addressBook);
  }

  saveAddressBook(): void {
    localStorage.setItem(this.storeKey, JSON.stringify(this.addressBook));
  }

  getAccountName(account: string): string|null {
    const match = this.addressBook.find(a => a.account.toLowerCase() === account.toLowerCase());
    return match && match.name || null;
  }

  nameExists(name: string): boolean {
    return this.addressBook.findIndex(a => a.name.toLowerCase() === name.toLowerCase()) !== -1;
  }

}
