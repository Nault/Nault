import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable()
export class ModalService {

  showAccount$ = new BehaviorSubject(null);
  constructor() { }

  showAccount(account) {
    this.showAccount$.next(account);
  }

}
