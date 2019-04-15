import {AfterViewInit, Component, OnInit} from '@angular/core';
import {RepresentativeService} from "../../services/representative.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-change-rep-widget',
  templateUrl: './change-rep-widget.component.html',
  styleUrls: ['./change-rep-widget.component.css']
})
export class ChangeRepWidgetComponent implements OnInit, AfterViewInit {

  representatives = this.repService.changeableReps;
  modalElement = null;

  constructor(private repService: RepresentativeService, private router: Router) { }

  async ngOnInit() {
    await this.repService.detectChangeableReps();

    this.repService.changeableReps$.subscribe(reps => {
      this.representatives = reps;
    });
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

}
