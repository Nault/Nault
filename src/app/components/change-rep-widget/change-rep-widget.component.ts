import {Component, OnInit} from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {RepresentativeService} from "../../services/representative.service";
import {Router} from "@angular/router";
import { NinjaService } from "../../services/ninja.service";

@Component({
  selector: 'app-change-rep-widget',
  templateUrl: './change-rep-widget.component.html',
  styleUrls: ['./change-rep-widget.component.css']
})
export class ChangeRepWidgetComponent implements OnInit {

  changeableRepresentatives = this.repService.changeableReps;
  displayedRepresentatives = [];
  representatives = [];
  showRepHelp = false;
  selectedAccount = null;

  constructor(
    private walletService: WalletService,
    private repService: RepresentativeService,
    private router: Router,
    private ninja: NinjaService
    ) { }

  async ngOnInit() {
    this.representatives = await this.repService.getRepresentativesOverview();
    this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives);    

    this.repService.walletReps$.subscribe(async reps => {
      this.representatives = reps;
      this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives);
    });

    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      this.selectedAccount = acc;
      this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives);
    });

    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(async reps => {
      this.changeableRepresentatives = reps;
    });
  }

  getDisplayedRepresentatives(representatives : any[]) {
    if(this.representatives.length === 0) {
      return [];
    }

    if(this.selectedAccount !== null) {
      const selectedAccountRep =
        this.representatives
          .filter(
            (rep) =>
              rep.accounts.some(
                (a) =>
                  (a.id === this.selectedAccount.id)
              )
          )[0];

      if(selectedAccountRep == null) {
        return [];
      }

      return [ Object.assign( {}, selectedAccountRep ) ];
    }

    let sortedRepresentatives: any[] = [...representatives];

    sortedRepresentatives.sort((a, b) => b.delegatedWeight.minus(a.delegatedWeight));

    return [ Object.assign( {}, sortedRepresentatives[0] ) ];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showRepSelectionForSpecificRepId(requiredRepId : number) {
    const accountsToChangeRepFor = (
        (this.selectedAccount !== null)
      ? this.selectedAccount.id
      : ( // all accounts that delegate to this rep
        this.representatives
          .filter(
            (rep) =>
              (rep.id == requiredRepId)
          )
          .map(
            (rep) =>
              rep.accounts.map(a => a.id).join(',')
          )
          .join(',')
      )
    );

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: accountsToChangeRepFor, showRecommended: true } });
  }

  showRepSelectionForAllChangeableReps() {
    const allAccounts = this.changeableRepresentatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccounts, showRecommended: true } });
  }

}
