import { Component, OnInit } from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {ApiService} from "../../services/api.service";
import BigNumber from "bignumber.js";
import {UtilService} from "../../services/util.service";
import {RepresentativeService} from "../../services/representative.service";

@Component({
  selector: 'app-representatives',
  templateUrl: './representatives.component.html',
  styleUrls: ['./representatives.component.css']
})
export class RepresentativesComponent implements OnInit {

  report = {
    representatives: [],
    breakdown: [],
  }

  constructor(private wallet: WalletService, private api: ApiService, private util: UtilService, private representativeService: RepresentativeService) { }

  async ngOnInit() {
    console.log(this.wallet.wallet.accounts);
    // Load the representative and weight for each account, then make a unique list.

    // Then load the info for each representative

    // in the future we will hook it up to the representative address book

    // How are we going to show warnings in other places? i guess we will do that in the future once it is working good

    const accountInfos = await Promise.all(this.wallet.wallet.accounts.map(account => this.api.accountInfo(account.id)));
    console.log(`Got account infos: `, accountInfos);

    for (let accountInfo of accountInfos) {
      console.log(`Looping on account: `, accountInfo);
      if (!accountInfo || !accountInfo.representative) continue; // Account doesn't exist yet
      const existingRep = this.report.representatives.find(rep => rep.id == accountInfo.representative);
      if (existingRep) {
        existingRep.weight = existingRep.weight.plus(new BigNumber(accountInfo.balance));
      } else {
        const newRep = {
          id: accountInfo.representative,
          weight: new BigNumber(accountInfo.balance),
        };
        this.report.representatives.push(newRep);
      }
    }

    console.log(`Created full report: `, this.report);

    const repInfos = await Promise.all(this.report.representatives.map(rep => this.api.accountInfo(rep.id).then(res => {
      res.account = rep.id;
      res.delegatedWeight = rep.weight;
      return res;
    })));

    console.log(`Got representative infos... `, repInfos);

    const totalSupply = new BigNumber(133248289);

    // Get info about each one
    const repBreakdown = [];
    for (let repInfo of repInfos) {
      // Determine its percentage.
      const nanoWeight = this.util.nano.rawToMnano(repInfo.weight);

      const percent = nanoWeight.div(totalSupply).times(100);
      console.log(`Rep: ${repInfo.account} , Weight: ${nanoWeight.toString(10)}, Percent of total: ${percent.toFixed(2)}`);

      let status = 'none';

      // Get match
      const knownRep = this.representativeService.getRepresentative(repInfo.account);
      if (knownRep && knownRep.trusted) {
        status = 'trusted';
      } else if (knownRep && knownRep.warn) {
        status = 'alert';
      } else if (percent.gte(15)) {
        status = 'alert'
      } else if (percent.gte(5)) {
        status = 'warn';
      }

      const newRep = {
        id: repInfo.account,
        weight: nanoWeight,
        delegatedWeight: repInfo.delegatedWeight,
        percent: percent,
        status: status,
        label: knownRep ? knownRep.name : null,
      };
      repBreakdown.push(newRep);
    }

    console.log(`Completed breakdown of reps! `, repBreakdown);
    this.report.breakdown = repBreakdown;

  }

}
