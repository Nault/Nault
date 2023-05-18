import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// import {Subject, timer} from 'rxjs';
// import {debounce} from 'rxjs/operators';
// import {Router} from '@angular/router';
import {
  AppSettingsService,
  // LedgerService,
  // LedgerStatus,
  // ModalService,
  // NotificationService,
  // RepresentativeService,
  // WalletService
} from '../../services';
// import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.css']
})

export class MarketplaceComponent implements OnInit {

  // accounts = this.walletService.wallet.accounts;
  // isLedgerWallet = this.walletService.isLedgerWallet();
  // isSingleKeyWallet = this.walletService.isSingleKeyWallet();
  // viewAdvanced = false;
  // newAccountIndex = null;

  // // When we change the accounts, redetect changable reps (Debounce by 5 seconds)
  // accountsChanged$ = new Subject();
  // reloadRepWarning$ = this.accountsChanged$.pipe(debounce(() => timer(5000)));

  constructor(
    private http: HttpClient,
    // private walletService: WalletService,
    // private notificationService: NotificationService,
    // public modal: ModalService,
    // public settings: AppSettingsService,
    // private representatives: RepresentativeService,
    // private router: Router,
    // private ledger: LedgerService,
    // private translocoService: TranslocoService
    ) { }

  async ngOnInit() {



  }


}
