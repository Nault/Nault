import { Pipe, PipeTransform } from '@angular/core';
import {CurrencyPipe} from "@angular/common";
import {BigNumber} from 'bignumber.js';

@Pipe({
  name: 'fiat'
})
export class FiatPipe extends CurrencyPipe implements PipeTransform {
  // transform(value: any, currencyCode?: string, display?: 'code' | 'symbol' | 'symbol-narrow' | boolean, digits?: string, locale?: string): string | null;

  transform(value: any, currencyCode?: string, display?: 'code' | 'symbol' | 'symbol-narrow' | boolean, digits?: string, locale?: string): any {
    if (currencyCode === '') {
      return ``;
    }
    if (currencyCode === 'BTC') {
      return `BTC ${new BigNumber(new Number(value).toFixed(4) || 0).toFixed(6)}`;
    }
    return super.transform(value, currencyCode, 'symbol-narrow', digits, locale);
  }

}
