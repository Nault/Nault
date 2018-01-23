import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'squeeze'
})
export class SqueezePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    const openingChars = 12;
    const closingChars = 6;
    const firstChars = value.split('').slice(0, openingChars).join('');
    const lastChars = value.split('').slice(-closingChars).join('');
    return `${firstChars}.....${lastChars}`;
  }

}
