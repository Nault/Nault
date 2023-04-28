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

var vendors = await this.http.get('https://market.nano.to').toPromise()

const images = 56

function template(product) {
    return `

    <div class="market-star">
        <i class='bx bx-star'></i>
    </div>

    <div class="market-image">
        <img class="img" src="${product.images[0]}" alt="">
    </div>

    <div class="market-text">
        <h3>
            ${product['title']}
        </h3>
        <p>
            ${product['description'] ? product['description'] : ''}
        </p>
    </div>

    <div class="market-price">
        ${product['price']} NANO
    </div>

    <div class="market-btn">

        <Button onclick="handleAdd(event)" class="add">
            ${product['button'] ? product['button'] : 'Buy Now'}
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


    for (var index in vendors) {

        var vendor = vendors[index]

        const title = document.createElement('h2');
        const container = document.createElement('div');
        
        container.classList.add('market-cards')
        
        title.innerHTML = `<h3 class="marketplace-h3">${vendor['title']}</h3>`
        container.innerHTML = ``
        
        document.getElementById('market-cards').appendChild(title)
        document.getElementById('market-cards').appendChild(container)

        for (var product of vendors[index]['products']) {
            const element = document.createElement('div');
            element.classList.add('card')
            element.innerHTML = template(product)
            container.appendChild(element)
        }

    }
    

  }


}
