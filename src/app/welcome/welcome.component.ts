import { Component, OnInit } from '@angular/core';
import {WalletService} from "../services/wallet.service";

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {

  wallet = this.walletService.wallet;

  constructor(private walletService: WalletService) { }

  ngOnInit() {
  }

}
