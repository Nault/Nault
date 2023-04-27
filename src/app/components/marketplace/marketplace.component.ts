import { Component, OnInit } from '@angular/core';
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





const images = 56

function template(index) {
    return `
    <div class="market-star">
        <i class='bx bx-star'></i>
    </div>
    <div class="market-image">
        <img class="img" src="https://raw.githubusercontent.com/luisDanielRoviraContreras/img/master/files/${index}.png" alt="">
        <img class="bg" src="https://raw.githubusercontent.com/luisDanielRoviraContreras/img/master/files/${index}.png alt="">
    </div>

    <div class="market-text">
        <h3>
            Training shoes
        </h3>
        <p>
            The Nike SuperRep Go shoes combine comfortable foam cushioning,
        </p>
    </div>

    <div class="market-price">
        129.99$
    </div>

    <div class="market-btn">
        <Button onclick="handleAdd(event)" class="add">
            Buy Now
        </Button>

        <div class="market-input-btns">
            <Button onclick="plusLess(event, 'less')" class="less">
                <i class='bx bx-minus' ></i>
            </Button>
            <input value="1" type="text">
            <Button onclick="plusLess(event, 'plus')" class="plus">
                <i class='bx bx-plus'></i>
            </Button>
        </div>
    </div>
    `
}

for (let index = 1; index < 20; index++) {
    const element = document.createElement('div');
    element.classList.add('card')
    element.innerHTML = template(index)
    document.querySelector('.market-cards-1').appendChild(element)
}
for (let index = 21; index < 40; index++) {
    const element = document.createElement('div');
    element.classList.add('card')
    element.innerHTML = template(index)
    document.querySelector('.market-cards-2').appendChild(element)
}
for (let index = 41; index < 56; index++) {
    const element = document.createElement('div');
    element.classList.add('card')
    element.innerHTML = template(index)
    document.querySelector('.market-cards-3').appendChild(element)
}
    
function handleAdd(event) {
    const card = event.target.closest('.card')
    card.classList.add('add-active')
    console.log(card)
}

function plusLess(event, type) {
    const card = event.target.closest('.card')
    const input = card.querySelector('input')
    let oldVal = Number(input.value)
    if (type == 'less') {
        if (oldVal == 1) {
            card.classList.remove('add-active')
            return
        }
        input.value = oldVal -= 1
    } else {
        input.value = oldVal += 1
    }
}





  }


}
