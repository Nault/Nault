import { Injectable } from '@angular/core';
import {NotificationService} from "./notification.service";

@Injectable()
export class DesktopService {

  _ipc: any;

  constructor(private notifications: NotificationService) {
  }

  connect() {
    if (window.require) {
      try {
        this._ipc = window.require('electron').ipcRenderer;
      } catch (e) {
        throw e;
      }
    } else {
    }
  }

  on(channel: string, listener) {
    if (!this._ipc) return;
    this._ipc.on(channel, listener);
  }

  send(channel: string, ...args) {
    if (!this._ipc) return;
    this._ipc.send(channel, ...args);
  }

}
