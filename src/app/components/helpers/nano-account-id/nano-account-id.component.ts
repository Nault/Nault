import {Component, Input, OnChanges, HostBinding} from '@angular/core';

@Component({
  selector: 'app-nano-account-id',
  templateUrl: './nano-account-id.component.html',
  styleUrls: ['./nano-account-id.component.css'],
})
export class NanoAccountIdComponent implements OnChanges {

  @HostBinding('class') classes: string;
  @Input() accountID: string;
  @Input() known: [];
  @Input() middle: 'on'|'off'|'auto'|'break' = 'auto';

  name = '';
  firstCharacters = '';
  middleCharacters = '';
  lastCharacters = '';

  constructor() { }

  capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
  }

  ngOnChanges() {
    
    const accountID = this.accountID;
    const openingChars = 10;
    const closingChars = 5;

    var known = localStorage.getItem('nano-known') ? JSON.parse(localStorage.getItem('nano-known')) : []

    var found = known.filter(a => a['address'] == accountID)
    this.name = found.length && found[found.length - 1] ? this.capitalizeFirstLetter(found[found.length - 1]['name']) : ''

    if (this.middle === 'auto') this.classes = 'uk-flex';
    if (this.middle === 'break') this.classes = 'nano-address-breakable';
    this.firstCharacters = accountID?.split('').slice(0, openingChars).join('').replace('nano_', '');
    this.lastCharacters = accountID?.split('').slice(-closingChars).join('');
    if (this.middle !== 'off') {
      this.middleCharacters = accountID?.split('').slice(openingChars, -closingChars).join('');
    }
  }

}
