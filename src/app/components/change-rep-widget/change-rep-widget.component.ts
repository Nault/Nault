import {Component, OnInit} from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {RepresentativeService} from '../../services/representative.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-change-rep-widget',
  templateUrl: './change-rep-widget.component.html',
  styleUrls: ['./change-rep-widget.component.css']
})
export class ChangeRepWidgetComponent implements OnInit {

  changeableRepresentatives = this.repService.changeableReps;
  displayedRepresentatives = [];
  representatives = [];
  showRepChangeRequired = false;
  showRepHelp = false;
  selectedAccount = null;

  constructor(
    private walletService: WalletService,
    private repService: RepresentativeService,
    private router: Router
    ) { }

  async ngOnInit() {
    this.representatives = await this.repService.getRepresentativesOverview();
    this.updateDisplayedRepresentatives();

    this.repService.walletReps$.subscribe(async reps => {
      this.representatives = reps;
      this.updateDisplayedRepresentatives();
    });

    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      this.selectedAccount = acc;
      this.updateDisplayedRepresentatives();
    });

    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(async reps => {
      // Includes both acceptable and bad reps
      // When user clicks 'Rep Change Required' action, acceptable reps will also be included
      this.changeableRepresentatives = reps;

      // However 'Rep Change Required' action will only appear when there is at least one bad rep
      this.showRepChangeRequired = reps.some(rep => (rep.status.changeRequired === true));

      this.updateDisplayedRepresentatives();
    });
  }

  updateDisplayedRepresentatives() {
    this.displayedRepresentatives = this.getDisplayedRepresentatives(this.representatives);
  }

  includeRepRequiringChange(displayedReps: any[]) {
    const repRequiringChange =
      this.changeableRepresentatives
        .sort((a, b) => b.delegatedWeight.minus(a.delegatedWeight))
        .filter(
          (changeableRep) => (
              (changeableRep.status.changeRequired === true)
            && displayedReps.every(
              (displayedRep) =>
                (displayedRep.id !== changeableRep.id)
            )
          )
        )[0];

    if (repRequiringChange == null) {
      return [...displayedReps];
    }

    return [ ...displayedReps, Object.assign({}, repRequiringChange) ];
  }

  getDisplayedRepresentatives(representatives: any[]) {
    if (this.representatives.length === 0) {
      return [];
    }

    if (this.selectedAccount !== null) {
      const selectedAccountRep =
        this.representatives
          .filter(
            (rep) =>
              rep.accounts.some(
                (a) =>
                  (a.id === this.selectedAccount.id)
              )
          )[0];

      if (selectedAccountRep == null) {
        return [];
      }

      const displayedRepsAllAccounts = [ Object.assign( {}, selectedAccountRep ) ];

      return this.includeRepRequiringChange(displayedRepsAllAccounts);
    }

    const sortedRepresentatives: any[] = [...representatives];

    sortedRepresentatives.sort((a, b) => b.delegatedWeight.minus(a.delegatedWeight));

    const displayedReps = [ Object.assign( {}, sortedRepresentatives[0] ) ];

    return this.includeRepRequiringChange(displayedReps);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showRepSelectionForSpecificRep(clickedRep) {
    this.showRepHelp = false;
    const accountsToChangeRepFor = (
        (
            (this.selectedAccount !== null)
          && clickedRep.accounts.some(a => (a.id === this.selectedAccount.id))
        )
      ? this.selectedAccount.id
      : ( // all accounts that delegate to this rep
        this.representatives
          .filter(
            (rep) =>
              (rep.id === clickedRep.id)
          )
          .map(
            (rep) =>
              rep.accounts.map(a => a.id).join(',')
          )
          .join(',')
      )
    );

    this.router.navigate(['/representatives'], {
      queryParams: { hideOverview: true, accounts: accountsToChangeRepFor, showRecommended: true }
    });
  }

  showRepSelectionForAllChangeableReps() {
    const allAccounts = this.changeableRepresentatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccounts, showRecommended: true } });
  }

}
