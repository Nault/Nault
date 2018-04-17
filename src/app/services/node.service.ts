import { Injectable } from '@angular/core';
import {NotificationService} from "./notification.service";

@Injectable()
export class NodeService {

  node = {
    status: null, // null - loading, false - offline, true - online
  };

  constructor(private notifications: NotificationService) { }

  setOffline() {
    if (this.node.status === false) return; // Already offline
    this.node.status = false;

    this.notifications.sendError(`Unable to connect to the Nano node, your balances may be inaccurate!`, { identifier: 'node-offline', length: 0 });
  }

  setOnline() {
    if (this.node.status) return; // Already online

    this.node.status = true;
    this.notifications.removeNotification('node-offline');
  }

}
