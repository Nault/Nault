import { Component, OnInit } from '@angular/core';
import {UtilService} from '../../services/util.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { RemoteSignService } from '../../services/remote-sign.service';
import { QrModalService } from '../../services/qr-modal.service';
import { AddressBookService } from 'app/services/address-book.service';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'app-send',
  templateUrl: './remote-signing.component.html',
  styleUrls: ['./remote-signing.component.css']
})
export class RemoteSigningComponent implements OnInit {
  toAccountID = '';
  toAccountStatus: number = null;
  unsignedBlock = '';
  signedBlock = '';
  unsignedStatus: number = null;
  signedStatus: number = null;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';

  constructor(
    private util: UtilService,
    private router: Router,
    private notificationService: NotificationService,
    private remoteSignService: RemoteSignService,
    private qrModalService: QrModalService,
    private addressBookService: AddressBookService,
  ) { }

  async ngOnInit() {
    this.addressBookService.loadAddressBook();
  }

  validateDestination() {
    // The timeout is used to solve a bug where the results get hidden too fast and the click is never registered
    setTimeout(() => this.showAddressBook = false, 400);

    if (this.toAccountID === '') {
      this.toAccountStatus = null;
      return false;
    }
    if (this.util.account.isValidAccount(this.toAccountID)) {
      this.toAccountStatus = 1;
      return true;
    } else {
      this.toAccountStatus = 0;
      return false;
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

  selectBookEntry(account) {
    this.showAddressBook = false;
    this.toAccountID = account;
    this.searchAddressBook();
    this.validateDestination();
  }

  validateUnsigned(string) {
    if (string === '') {
      this.unsignedStatus = null;
      return false;
    }
    let url = null;
    if (string.startsWith('nanosign:')) {
      url = new URL(string);
    }
    if (url && this.remoteSignService.checkSignBlock(url.pathname)) {
      this.unsignedStatus = 1;
    } else {
      this.unsignedStatus = 0;
    }
  }

  validateSigned(string) {
    if (string === '') {
      this.signedStatus = null;
      return false;
    }
    let url = null;
    if (string.startsWith('nanoprocess:')) {
      url = new URL(string);
    }
    if (url && this.remoteSignService.checkSignBlock(url.pathname) && this.remoteSignService.checkProcessBlock(url.pathname)) {
      this.signedStatus = 1;
    } else {
      this.signedStatus = 0;
    }
  }

  start() {
    if (this.validateDestination()) {
      this.router.navigate(['account', this.toAccountID], { queryParams: {sign: 1}});
    } else {
      this.notificationService.sendWarning('Invalid nano account!');
    }
  }

  navigateBlock(block) {
    let badScheme = false;

    if (block.startsWith('nanosign:') || block.startsWith('nanoprocess:')) {
      const url = new URL(block);
      if (url.protocol === 'nanosign:') {
        this.remoteSignService.navigateSignBlock(url);
      } else if (url.protocol === 'nanoprocess:') {
        this.remoteSignService.navigateProcessBlock(url);
      } else {
        badScheme = true;
      }
    } else {
      badScheme = true;
    }
    if (badScheme) {
      this.notificationService.sendWarning('Not a recognized block format!', { length: 5000 });
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.toAccountID = data.content;
          break;
      }
    }, () => {}
    );
  }
}
