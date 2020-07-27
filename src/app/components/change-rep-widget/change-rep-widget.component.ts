import {Component, OnInit} from '@angular/core';
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
  suggestedRep = {
    alias: '',
    account: ''
  };

  constructor(
    private repService: RepresentativeService,
    private router: Router,
    private ninja: NinjaService
    ) { }

  async ngOnInit() {
    this.representatives = await this.repService.getRepresentativesOverview();
    this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives)

    this.repService.walletReps$.subscribe(async reps => {
      this.representatives = reps;
      this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives)
      console.log('GOT REPS: ', this.representatives);
    });

    console.log('INITIAL REPS:', this.representatives);

    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(async reps => {
      this.changeableRepresentatives = reps;

      if (reps.length > 0) {
        this.suggestedRep = await this.ninja.getSuggestedRep();
      }
    });
  }

  getDisplayedRepresentatives(representatives : any[]) {
    if(this.representatives.length === 0) {
      return []
    }

    // todo: when not in total balance view, pass [ representative ] of the currently selected address

    let sortedRepresentatives: any[] = [...representatives]

    sortedRepresentatives.sort((a, b) => b.delegatedWeight.minus(a.delegatedWeight))

    return [ Object.assign( {}, sortedRepresentatives[0] ) ]
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showRepSelectionForSpecificRepId(requiredRepId : number) {
    // in total balance view we want to pass each account that delegates to this rep
    const allAccountsWithThisRep =
      this.representatives
        .filter(
          (rep) =>
            (rep.id == requiredRepId)
        )
        .map(
          (rep) =>
            rep.accounts.map(a => a.id).join(',')
        )
        .join(',');

    // todo: when not in total balance view, pass currently selected address in "accounts"

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccountsWithThisRep, showRecommended: true } });
  }

  showRepSelectionForAllChangeableReps() {
    const allAccounts = this.changeableRepresentatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccounts, showRecommended: true } });
  }

}
