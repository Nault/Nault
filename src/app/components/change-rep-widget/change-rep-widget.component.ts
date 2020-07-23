import {AfterViewInit, Component, OnInit} from '@angular/core';
import {RepresentativeService} from "../../services/representative.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-change-rep-widget',
  templateUrl: './change-rep-widget.component.html',
  styleUrls: ['./change-rep-widget.component.css']
})
export class ChangeRepWidgetComponent implements OnInit, AfterViewInit {

  changeableRepresentatives = this.repService.changeableReps;
  representatives = []
  showRepHelp = false;
  modalElement = null;

  constructor(private repService: RepresentativeService, private router: Router) { }

  async ngOnInit() {
    // sleep to show prompt later
    // and solve a race condition with the wallet accounts
    await this.sleep(2000);
    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(reps => {
      this.changeableRepresentatives = reps;
    });

    this.representatives = await this.repService.getRepresentativesOverview();
    console.log(this.representatives);
    
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  ngAfterViewInit() {
    const UIkit = window['UIkit'];
    this.modalElement = UIkit.modal('#change-rep-modal');
  }

  showModal() {
    this.modalElement.show();
  }

  closeModal() {
    this.modalElement.hide();
  }

  navigateToRepChangePage() {
    this.router.navigate(['/representatives']);
  }

  changeReps() {
    const allAccounts = this.changeableRepresentatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.modalElement.hide();

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccounts, showRecommended: true } });
  }

}
