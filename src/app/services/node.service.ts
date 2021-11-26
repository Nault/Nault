import { Injectable } from '@angular/core';
import {NotificationService} from './notification.service';

@Injectable()
export class NodeService {

  node = {
    status: null, // null - loading, false - offline, true - online
  };

  constructor(private notifications: NotificationService) { }

  setOffline(msg = `Unable to connect to the nano node, your balances may be inaccurate!`) {
    if (this.node.status === false) return; // Already offline
    this.node.status = false;

    if (msg) this.notifications.sendError(msg, { identifier: 'node-offline', length: 0 });
  }

  setOnline() {
    if (this.node.status) return; // Already online

    this.node.status = true;
    this.notifications.removeNotification('node-offline');
  }

  setLoading() {
    this.node.status = null;
  }

}
