import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {ModalService} from "../../services/modal.service";
import {AddressBookService} from "../../services/address-book.service";
import {ApiService} from "../../services/api.service";
import {NotificationService} from "../../services/notification.service";
import {AppSettingsService} from "../../services/app-settings.service";

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  accountHistory: any[] = [];

  accounts = this.walletService.wallet.accounts;

  searchPerformed = false;

  constructor(private walletService: WalletService, public modal: ModalService, private addressBook: AddressBookService, private api: ApiService, private notifications: NotificationService, public settings: AppSettingsService) { }

  async ngOnInit() {
  }

  async getAccountHistory(account) {
    this.searchPerformed = true;
    this.accountHistory = [];

    const history = await this.api.accountHistory(account);
    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistory = history.history.map(h => {
        h.addressBookName = this.addressBook.getAccountName(h.account) || null;
        return h;
      });
    }
  }

  async getBlockData(hash) {
    const blockData = await this.api.blocksInfo([hash]);
    console.log(`Got block data: `, blockData);
    const hashData = blockData.blocks[hash];
    console.log(`got hash data: `, hashData);
    const hashContents = JSON.parse(hashData.contents);
    console.log(`Hash contents: `, hashContents);
  }

  copied() {
    this.notifications.sendSuccess(`Successfully copied to clipboard!`);
  }

}
