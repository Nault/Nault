import { Component, OnInit } from '@angular/core';
import {ModalService} from "../../services/modal.service";
import {ApiService} from "../../services/api.service";
import {NotificationService} from "../../services/notification.service";
import {AddressBookService} from "../../services/address-book.service";

@Component({
  selector: 'app-account-viewer',
  templateUrl: './account-viewer.component.html',
  styleUrls: ['./account-viewer.component.css']
})
export class AccountViewerComponent implements OnInit {

  accountID: string = '';
  account: any = {};
  addressBookEntry: any = null;

  constructor(private modalService: ModalService, private nodeApi: ApiService, private notifications: NotificationService, private addressBook: AddressBookService) { }

  ngOnInit() {
    this.modalService.showAccount$.subscribe(this.showNewAccount.bind(this))
  }

  copied() {
    this.notifications.sendSuccess(`Account ID copied to clipboard!`);
  }

  async showNewAccount(accountID) {
    this.accountID = accountID;
    if (accountID == null) return; // Nothing here

    this.addressBookEntry = this.addressBook.getAccountName(accountID);

    try {
      const accountInfo = await this.nodeApi.accountInfo(accountID);
      this.account = accountInfo;

      const UIkit = (window as any).UIkit;
      UIkit.modal(document.getElementById('account-viewer')).show();
    } catch (err) {
      this.notifications.sendError(`Unable to load account - make sure node is online`);
    }
  }

}
