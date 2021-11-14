import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hidebalance'
})
export class HideBalancePipe implements PipeTransform {
  transform(input: string, shouldHide: boolean, fractions: number = 3): string {
    if(!shouldHide) return input

    return input.replace(/[0-9]+\./, '*.').replace(/\.[0-9]+/, '.' + '*'.repeat(fractions));
  }
}
