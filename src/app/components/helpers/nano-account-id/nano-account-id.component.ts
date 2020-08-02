import {Component, Input, OnChanges} from '@angular/core';

@Component({
  selector: 'app-nano-account-id',
  templateUrl: './nano-account-id.component.html',
  styleUrls: ['./nano-account-id.component.css'],
  host: {
    '[class.uk-flex]': 'middle === "auto"'
  }
})
export class NanoAccountIdComponent implements OnChanges {

  @Input('accountID') accountID: string;
  @Input('middle') middle: 'on'|'off'|'auto' = 'auto';

  firstCharacters = '';
  middleCharacters = '';
  lastCharacters = '';

  constructor() { }

  ngOnChanges() {
    const accountID = this.accountID;
    const openingChars = 10;
    const closingChars = 5;
    this.firstCharacters = accountID.split('').slice(0, openingChars).join('');
    this.lastCharacters = accountID.split('').slice(-closingChars).join('');
    if (this.middle !== 'off') {
      this.middleCharacters = accountID.split('').slice(openingChars, -closingChars).join('');
    }
  }

}
