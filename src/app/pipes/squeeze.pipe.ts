import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'squeeze'
})
export class SqueezePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    const arg = args ? args.split(',') || [] : [];
    const openingChars = arg[0] ? parseInt( arg[0], 10 ) : 10;
    const closingChars = arg[1] ? parseInt( arg[1], 10 ) : 5;
    const firstChars = value.split('').slice(0, openingChars).join('');
    const lastChars = value.split('').slice(-closingChars).join('');

    if ( value.length < (openingChars + closingChars) ) {
      return value;
    }

    return `${firstChars}...${lastChars}`;
  }

}
