import { Component, OnInit } from '@angular/core';
import {WalletService} from '../services/wallet.service';
import {AppSettingsService} from '../services/app-settings.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  currencyName = environment.currency.name;
  donationAccount = environment.donationAddress;

  wallet = this.walletService.wallet;
  isConfigured = this.walletService.isConfigured;

  constructor(private walletService: WalletService, public settingsService: AppSettingsService) { }

  ngOnInit() {

  }

}
