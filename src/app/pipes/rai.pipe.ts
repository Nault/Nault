import { Pipe, PipeTransform } from '@angular/core';
import {AppSettingsService} from "../services/app-settings.service";

@Pipe({
  name: 'rai'
})
export class RaiPipe implements PipeTransform {
  precision = 4;

  mrai = 1000000000000000000000000000000;
  krai = 1000000000000000000000000000;
  rai  = 1000000000000000000000000;

  // constructor(private appSettings: AppSettingsService) {
  //
  // }

  transform(value: any, args?: any): any {
    const opts = args.split(',');
    let denomination = opts[0] || 'mrai';
    const hideText = opts[1] || false;

    // if (denomination === 'configured') {
    //   denomination = this.appSettings.getAppSetting('displayDenomination');
    // }

    switch (denomination.toLowerCase()) {
      default:
      case 'xrb': return `${(value / this.mrai).toFixed(6)}${!hideText ? ' XRB': ''}`;
      case 'mrai': return `${(value / this.mrai).toFixed(this.precision)}${!hideText ? ' mRai': ''}`;
      case 'krai': return `${(value / this.krai).toFixed(3)}${!hideText ? ' kRai': ''}`;
      case 'rai': return `${(value / this.rai).toFixed(0)}${!hideText ? ' Rai': ''}`;
      case 'raw': return `${value}${!hideText ? ' raw': ''}`;
      case 'dynamic':
        const rai = (value / this.rai);
        if (rai >= 1000000) {
          return `${(value / this.mrai).toFixed(this.precision)}${!hideText ? ' mRai': ''}`;
        } else if (rai >= 1000) {
          return `${(value / this.krai).toFixed(this.precision)}${!hideText ? ' kRai': ''}`;
        } else if (rai >= 0.00001) {
          return `${(value / this.rai).toFixed(this.precision)}${!hideText ? ' Rai': ''}`;
        } else if (rai === 0) {
          return `${value}${!hideText ? ' mRai': ''}`;
        } else {
          return `${value}${!hideText ? ' raw': ''}`;
        }
    }
  }

}
