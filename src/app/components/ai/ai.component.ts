import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
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
  NotificationService,
  // RepresentativeService,
  WalletService
} from '../../services';
// import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-ai',
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.css']
})

export class AiComponent implements OnInit {

  @ViewChild('aiFrame') childIframe: ElementRef;

  // accounts = this.walletService.wallet.accounts;
  // isLedgerWallet = this.walletService.isLedgerWallet();
  // isSingleKeyWallet = this.walletService.isSingleKeyWallet();
  // viewAdvanced = false;
  // hidePopup = true;
  // string = '';
  locked = this.walletService.isLocked();

  // // When we change the accounts, redetect changable reps (Debounce by 5 seconds)
  // accountsChanged$ = new Subject();
  // reloadRepWarning$ = this.accountsChanged$.pipe(debounce(() => timer(5000)));

  constructor(
    private http: HttpClient,
    private walletService: WalletService,
    private notificationService: NotificationService,
    // public modal: ModalService,
    // public settings: AppSettingsService,
    private nanoBlock: NanoBlockService,
    // private representatives: RepresentativeService,
    private router: Router,
    private util: UtilService,
    // private ledger: LedgerService,
    // private translocoService: TranslocoService
    ) { }

  ngOnChanges() {
    this.locked = this.walletService.isLocked()
  }

  async ngOnInit() {

    var self = this

    var on = false




if (this.walletService.isLocked()) {

      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        this.router.navigate(['accounts']);
        return;
      }

    }


    // this.showPopup = false

    // window.addEventListener(
    //   "prompt",
    //   (event) => {
    //     // if (event.data && typeof event.data === 'string' && event.data.includes('success')) {

    //     //   this.purchasePrompt
          
    //     //   // this.string = event.data

    //     //   // const params = new URLSearchParams(this.string.split('?')[1]);

    //     //   // this.router.navigate(['send'], { queryParams: { 
    //     //   //   to: event.data.replace('nano:', '').split('?')[0],
    //     //   //   amount: params.getAll('amount') || "0",
    //     //   //   callback: params.getAll('callback'),
    //     //   // } });

    //     // }
    //     alert('Yooo')
    //   },
    //   false
    // );

    window.onmessage = function(e) {
        if (e.data == 'mounted') {
            // alert('It mounted');
        }
        if (e.data == 'prompt') {
            // alert('It prompted');
            self.purchasePrompt()
        }
    };

    // window.addEventListener("message", ({data}) => {
    //   console.log("Message from worker: " + data); // 3
    // });


    // window.addEventListener('message', receiveMessage, false);

    // function receiveMessage(event) {
    //   // Check the origin of the message to ensure it's from a trusted source
    //   if (event.origin !== 'http://example.com') {
    //     return;
    //   }
      
    //   // Log the received message from the child iframe
    //   console.log('Received message from child iframe:', event.data);

    // }

    // iframe.contentWindow.postMessage('purchase', '*');

  }

  ngAfterViewInit() {
    // Get the reference to the iframe element
   const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement => input !== null && input.tagName === 'IFRAME';

   //  var iframe = document.getElementById('aiFrame');

   //  if (isIFrame(iframe) && iframe.contentWindow) {
   //      iframe.contentWindow.postMessage('message', '*');
   //      console.log("sdas")
   //  }

    // Add an event listener to listen for messages from the child iframe
    window.addEventListener('message', this.receiveMessage.bind(this), false);

    // Send a message to the child iframe
    // iframe.contentWindow.postMessage('Hello from parent!', 'http://example.com');
  }

  receiveMessage(event: MessageEvent) {
    // Check the origin of the message to ensure it's from a trusted source
    // if (event.origin !== 'http://example.com') {
    //   return;
    // }

    // Log the received message from the child iframe
    // if (event.data.action === 'loading') this.notificationService.sendError(`Thinking..`);
    if (event.data.action === 'prompt') this.purchasePrompt()
  }

  async purchasePrompt() {

    // console.log('CHILD->PARENT:', "Purchasing Prompt");

    if (this.walletService.isLocked()) {

      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        this.router.navigate(['accounts']);
        return;
      }

    }

    const walletAccount = this.walletService.wallet.accounts[0]

    try {

      // hard code
      const destinationID = 'nano_1chatai164r4whzni648buh5u58ju9kfej8kmw4h73zhmszxbb7k1dgto6gu';

      const newHash = await this.nanoBlock.generateSend(walletAccount, destinationID,this.util.nano.mnanoToRaw('0.001'), this.walletService.isLedgerWallet());
      // const newHash = await this.nanoBlock.generateSend(walletAccount, destinationID,this.util.nano.mnanoToRaw('0.01'), this.walletService.isLedgerWallet());

      if (newHash) {

        const isIFrame = (input: HTMLElement | null): input is HTMLIFrameElement => input !== null && input.tagName === 'IFRAME';

        var iframe = document.getElementById('aiFrame');

        if (isIFrame(iframe) && iframe.contentWindow) {

            iframe.contentWindow.postMessage({ hash: newHash }, '*');

            // this.notificationService.sendError(`Sent.`);
            // this.notificationService.sendSuccess(`Payed 0.01`);

        }

      } else {
        
        if (!this.walletService.isLedgerWallet()) {
          this.notificationService.sendError(`Error paying, please try again.`);
        }

      }

    } catch (err) {

      console.log( err.message )

      // this.notificationService.sendError(`Error paying: ${err.message}`);
    
    }

    await this.walletService.reloadBalances();

    // return newHash

  }


}
