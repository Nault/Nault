import { Injectable } from '@angular/core';
import {NotificationService} from "./notification.service";

@Injectable()
export class DesktopService {

  _ipc: any;

  constructor(private notifications: NotificationService) {
    console.log('Desktop service loading');
    if (window.require) {
      try {
        this._ipc = window.require('electron').ipcRenderer;
        console.log('Loaded ipc ', this._ipc);
      } catch (e) {
        throw e;
      }
    } else {
      console.warn('Unable to load electrons IPC');
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
