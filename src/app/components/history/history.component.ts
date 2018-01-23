import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {ModalService} from "../../services/modal.service";
import {AddressBookService} from "../../services/address-book.service";
import {ApiService} from "../../services/api.service";

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  accountHistory: any[] = [];

  accounts = this.walletService.wallet.accounts;

  constructor(private walletService: WalletService, public modal: ModalService, private addressBook: AddressBookService, private api: ApiService) { }

  async ngOnInit() {
  }

  async getAccountHistory(account) {
    this.accountHistory = [];

    const history = await this.api.accountHistory(account);
    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistory = history.history.map(h => {
        h.addressBookName = this.addressBook.getAccountName(h.account) || null;
        return h;
      });
    }
  }

}
