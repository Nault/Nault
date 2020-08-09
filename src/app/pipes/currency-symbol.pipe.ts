import { Pipe, PipeTransform } from '@angular/core';
import {CurrencyPipe} from '@angular/common';

@Pipe({
  name: 'currencySymbol'
})
export class CurrencySymbolPipe extends CurrencyPipe implements PipeTransform {

  // This pipe simply shows the currency symbol ($, BTC, etc) and removes any numeric values
  transform(value: any, args?: any): any {
    const currency = super.transform(0, value, 'symbol', '1.0-2');
    return currency.replace(/[0-9]/g, '');
  }

}
