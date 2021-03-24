import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'amountsplit'
})
export class AmountSplitPipe implements PipeTransform {
  transform(input: string, idx: number): string {
    const splitAmount = input.split('.')[idx];

    if (idx === 0) {
      // Integer
      return splitAmount.replace('BTC ', '');
    }

    // Fractional

    if (splitAmount == null) {
      return '';
    }

    const fractionalAmount = splitAmount.replace(/0+$/g, '');

    if (fractionalAmount === '') {
      return '';
    }

    return ( '.' + fractionalAmount );
  }
}
