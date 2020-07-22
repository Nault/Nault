import { Component, OnInit } from '@angular/core';
import {UtilService} from "../../services/util.service";

const nacl = window['nacl'];

@Component({
  selector: 'app-send',
  templateUrl: './remote-signing.component.html',
  styleUrls: ['./remote-signing.component.css']
})
export class RemoteSigningComponent implements OnInit {
  toAccountID: string = '';
  toAccountStatus:number = null;
  constructor(
    private util: UtilService,
    ) { }

  async ngOnInit() {

  }

  validateDestination() {
    if (this.util.account.isValidAccount(this.toAccountID)) this.toAccountStatus = 1
    else this.toAccountStatus = 0
  }
}
