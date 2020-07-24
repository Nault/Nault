import {AfterViewInit, Component, OnInit} from '@angular/core';
import {RepresentativeService} from "../../services/representative.service";
import {Router} from "@angular/router";
import { NinjaService } from "../../services/ninja.service";

@Component({
  selector: 'app-change-rep-widget',
  templateUrl: './change-rep-widget.component.html',
  styleUrls: ['./change-rep-widget.component.css']
})
export class ChangeRepWidgetComponent implements OnInit, AfterViewInit {

  representatives = this.repService.changeableReps;
  modalElement = null;
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
    // sleep to show prompt later
    // and solve a race condition with the wallet accounts
    await this.sleep(2000);
    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(async reps => {
      this.representatives = reps;

      if(reps.length > 0){
        this.suggestedRep = await this.ninja.getSuggestedRep()
      }
    });
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

  changeReps() {
    const allAccounts = this.representatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.modalElement.hide();

    this.router.navigate(['/representatives'], { queryParams: { hideOverview: true, accounts: allAccounts, showRecommended: true } });
  }

  changeToRep(representative) {
    const allAccounts = this.representatives.map(rep => rep.accounts.map(a => a.id).join(',')).join(',');

    this.modalElement.hide();

    this.router.navigate(['/representatives'], { queryParams: { accounts: allAccounts, representative: representative } });
  }

}
