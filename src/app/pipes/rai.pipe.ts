import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rai'
})
export class RaiPipe implements PipeTransform {
  precision = 6;

  rai  = 1000000000000000000000000000;

  transform(value: any, args?: any): any {
    const opts = args.split(',');
    const denomination = opts[0] || 'nano';
    const hideText = opts[1] || false;

    switch (denomination.toLowerCase()) {
      default:
      case 'nano': return `${(value / this.rai).toFixed(0)}${!hideText ? ' nano' : ''}`;
      case 'raw': return `${value}${!hideText ? ' raw' : ''}`;
    }
  }

  toFixed(num, fixed) {
    if (isNaN(num)) {
      return 0;
    }
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
  }

}
