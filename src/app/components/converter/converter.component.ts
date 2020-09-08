import { Component, OnInit, OnDestroy } from '@angular/core';
import {UtilService} from '../../services/util.service';
import {AppSettingsService} from '../../services/app-settings.service';
import * as nanocurrency from 'nanocurrency';
import {PriceService} from '../../services/price.service';
import { BigNumber } from 'bignumber.js';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-converter',
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.less']
})
export class ConverterComponent implements OnInit, OnDestroy {
  Mnano = '1';
  raw = '';
  invalidMnano = false;
  invalidRaw = false;
  invalidFiat = false;
  fiatPrice = '0';
  priceSub = null;

  constructor(
    private util: UtilService,
    public settings: AppSettingsService,
    private price: PriceService,
    public notifications: NotificationService,
  ) { }

  ngOnInit(): void {
    BigNumber.config({ DECIMAL_PLACES: 30 });
    this.Mnano = '1';

    this.priceSub = this.price.lastPrice$.subscribe(event => {
      this.fiatPrice = (new BigNumber(this.Mnano)).times(this.price.price.lastPrice).toString();
    });

    this.unitChange('mnano');
  }

  ngOnDestroy() {
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
  }

  unitChange(unit) {
    switch (unit) {
      case 'mnano':
        if (this.util.account.isValidNanoAmount(this.Mnano)) {
          this.raw = nanocurrency.convert(this.Mnano, {from: nanocurrency.Unit.NANO, to: nanocurrency.Unit.raw});
          this.fiatPrice = (new BigNumber(this.Mnano)).times(this.price.price.lastPrice).toString(10);
          this.invalidMnano = false;
          this.invalidRaw = false;
          this.invalidFiat = false;
        } else {
          this.raw = '';
          this.fiatPrice = '';
          this.invalidMnano = true;
        }
        break;
      case 'raw':
        if (this.util.account.isValidAmount(this.raw)) {
          this.Mnano = nanocurrency.convert(this.raw, {from: nanocurrency.Unit.raw, to: nanocurrency.Unit.NANO});
          this.fiatPrice = (new BigNumber(this.Mnano)).times(this.price.price.lastPrice).toString(10);
          this.invalidRaw = false;
          this.invalidMnano = false;
          this.invalidFiat = false;
        } else {
          this.Mnano = '';
          this.fiatPrice = '';
          this.invalidRaw = true;
        }
        break;
      case 'fiat':
        if (this.util.string.isNumeric(this.fiatPrice)) {
          this.Mnano = (new BigNumber(this.fiatPrice)).dividedBy(this.price.price.lastPrice).toString(10);
          this.raw = nanocurrency.convert(this.Mnano, {from: nanocurrency.Unit.NANO, to: nanocurrency.Unit.raw});
          this.invalidRaw = false;
          this.invalidMnano = false;
          this.invalidFiat = false;
        } else {
          this.Mnano = '';
          this.raw = '';
          this.invalidFiat = true;
        }
        break;
    }
  }

}
