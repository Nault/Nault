import { Pipe, PipeTransform } from '@angular/core';
import {CurrencyPipe} from "@angular/common";

@Pipe({
  name: 'currencySymbol'
})
export class CurrencySymbolPipe extends CurrencyPipe implements PipeTransform {

  // This pipe simply shows the currency symbol ($, BTC, etc) and removes any numeric values
  transform(value: any, args?: any): any {
    let currency = super.transform(0, value, true, '1.0-2');
    return currency.replace(/[0-9]/g, '');
  }

}
