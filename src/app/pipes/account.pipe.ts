import { Pipe, PipeTransform } from '@angular/core';
import {UtilService} from '../services/util.service';
import {AppSettingsService} from '../services/app-settings.service';

@Pipe({
  name: 'account'
})
export class AccountPipe implements PipeTransform {

  constructor(private util: UtilService, private settings: AppSettingsService) {

  }

  transform(value: any, args?: any): any {
    // const val = this.util.account.setPrefix(value, this.settings.settings.displayPrefix);

    return value;
  }

}
