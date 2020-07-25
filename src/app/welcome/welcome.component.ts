import { Component, OnInit } from '@angular/core';
import {WalletService} from "../services/wallet.service";
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {

  donationAccount = `nano_3niceeeyiaa86k58zhaeygxfkuzgffjtwju9ep33z9c8qekmr3iuc95jbqc8`;

  wallet = this.walletService.wallet;
  isConfigured = this.walletService.isConfigured;
  currencyName = environment.currency.name

  constructor(private walletService: WalletService) { }

  ngOnInit() {

  }

}
