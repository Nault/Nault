import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import BigNumber from 'bignumber.js';
import {UtilService} from '../../services/util.service';
import {NanoBlockService} from '../../services/nano-block.service';
// import {Subject, timer} from 'rxjs';
// import {debounce} from 'rxjs/operators';
import {Router} from '@angular/router';
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
  selector: 'app-donate',
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.css']
})

export class DonateComponent implements OnInit {

  // accounts = this.walletService.wallet.accounts;
  // isLedgerWallet = this.walletService.isLedgerWallet();
  // isSingleKeyWallet = this.walletService.isSingleKeyWallet();
  // viewAdvanced = false;
  hidePopup = true;
  string = '';

  // // When we change the accounts, redetect changable reps (Debounce by 5 seconds)
  // accountsChanged$ = new Subject();
  // reloadRepWarning$ = this.accountsChanged$.pipe(debounce(() => timer(5000)));

  constructor(
    private http: HttpClient,
    // private walletService: WalletService,
    // private notificationService: NotificationService,
    // public modal: ModalService,
    // public settings: AppSettingsService,
    private nanoBlock: NanoBlockService,
    // private representatives: RepresentativeService,
    private router: Router,
    private util: UtilService,
    // private ledger: LedgerService,
    // private translocoService: TranslocoService
    ) { }

  async ngOnInit() {

    var on = false

    // this.showPopup = false

    window.addEventListener(
      "message",
      (event) => {
        if (event.data && typeof event.data === 'string' && event.data.includes('nano:')) {
          
          this.string = event.data

          const params = new URLSearchParams(this.string.split('?')[1]);

          this.router.navigate(['send'], { queryParams: { 
            to: event.data.replace('nano:', '').split('?')[0],
            amount: params.getAll('amount') || "0",
            callback: params.getAll('callback'),
          } });

        }
      },
      false
    );

  }

  close() {
    this.hidePopup = true
    // document.getElementById("approveDeepLink").style.display = "none" ;
  }

  approve() {

//     console.log( 
// this.string
//      )

    // this.router.navigate(['send'], { queryParams: { 
    //   to: this.string.replace('nano:', '').split('?')[0],
    //   amount: this.string.replace('nano:', '').split('?')[1].replace('amount=', ''),
    // } });
    
    // const newHash = await this.nanoBlock.generateSend(walletAccount, destinationID, this.rawAmount, this.walletService.isLedgerWallet());

  }


}
