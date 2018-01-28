import {Component, OnInit} from '@angular/core';
import {WalletService} from "./services/wallet.service";
import {AddressBookService} from "./services/address-book.service";
import {AppSettingsService} from "./services/app-settings.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  wallet = this.walletService.wallet;

  constructor(private walletService: WalletService, private addressBook: AddressBookService, private settings: AppSettingsService) { }

  async ngOnInit() {
    await this.addressBook.loadAddressBook();
    await this.walletService.loadStoredWallet();
    this.settings.loadAppSettings();
  }
}
