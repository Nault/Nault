import { Injectable } from '@angular/core';
import * as Rx from 'rxjs';

type NotificationType = 'info'|'success'|'warning'|'error';

@Injectable()
export class NotificationService {

  notifications$ = new Rx.BehaviorSubject(null);

  constructor() { }

  // This provides an entry point for all components to send notifications.
  // It exposes an observable that the actual component uses to grab new notifications

  sendNotification(type: NotificationType, message: string) {
    this.notifications$.next({ type, message });
  }

  sendInfo(message:string) {
    this.sendNotification('info', message);
  }
  sendSuccess(message:string) {
    this.sendNotification('success', message);
  }
  sendWarning(message:string) {
    this.sendNotification('warning', message);
  }
  sendError(message:string) {
    this.sendNotification('error', message);
  }

}
