import { Injectable } from '@angular/core';
import {NotificationService} from "./notification.service";
import { IpcRenderer } from 'electron';

@Injectable()
export class DesktopService {

  private _ipc: IpcRenderer | undefined;

  constructor(private notifications: NotificationService) {
    if (window.require) {
      try {
        this._ipc = window.require('electron').ipcRenderer;
      } catch (e) {
        throw e;
      }
    } else {
      console.warn('Electron\'s IPC was not loaded. Normal on web but not desktop.');
    }
  }

  connect() {
  }

  on(channel: string, listener) {
    if (!this._ipc) return false;
    this._ipc.on(channel, listener);
    return true;
  }

  send(channel: string, ...args) {
    if (!this._ipc) return false;
    this._ipc.send(channel, ...args);
    return true;
  }

}
