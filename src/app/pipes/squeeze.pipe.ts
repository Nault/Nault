import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'squeeze'
})
export class SqueezePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    const arg = args ? args.split(',') || [] : [];
    const openingChars = arg[0] || 9;
    const closingChars = arg[1] || 5;
    const firstChars = value.split('').slice(0, openingChars).join('');
    const lastChars = value.split('').slice(-closingChars).join('');
    return `${firstChars}...${lastChars}`;
  }

}
