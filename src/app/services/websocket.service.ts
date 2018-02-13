import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class WebsocketService {

  queuedCommands = [];

  keepaliveTimeout = 60 * 1000;
  reconnectTimeout = 5 * 1000;

  socket = {
    connected: false,
    ws: null,
  };

  subscribedAccounts = [];

  newTransactions$ = new BehaviorSubject(null);

  constructor() { }

  connect() {
    if (this.socket.connected && this.socket.ws) return;
    const ws = new WebSocket('wss://ws.nanovault.io');
    this.socket.ws = ws;

    ws.onopen = event => {
      this.socket.connected = true;
      this.queuedCommands.forEach(event => ws.send(JSON.stringify(event)));

      this.keepalive(); // Start keepalives!
    };
    ws.onerror = event => {
      // this.socket.connected = false;
      console.log(`Socket error`, event);
    };
    ws.onclose = event => {
      this.socket.connected = false;
      console.log(`Socket close`, event);

      // Start attempting to recconect
      setTimeout(() => this.attemptReconnect(), this.reconnectTimeout);
    };
    ws.onmessage = event => {
      try {
        const newEvent = JSON.parse(event.data);

        if (newEvent.event === 'newTransaction') {
          this.newTransactions$.next(newEvent.data);
        }
      } catch (err) {
        console.log(`Error parsing message`, err);
      }
    }
  }

  attemptReconnect() {
    this.connect();
    if (this.reconnectTimeout < 30 * 1000) {
      this.reconnectTimeout += 5 * 1000; // Slowly increase the timeout up to 30 seconds
    }
  }

  keepalive() {
    if (this.socket.connected) {
      this.socket.ws.send(JSON.stringify({ event: 'keepalive' }));
    }

    setTimeout(() => {
      this.keepalive();
    }, this.keepaliveTimeout);
  }



  subscribeAccounts(accountIDs: string[]) {
    const event = { event: 'subscribe', data: accountIDs };
    accountIDs.forEach(account => {
      if (this.subscribedAccounts.indexOf(account) === -1) {
        this.subscribedAccounts.push(account); // Keep a unique list of subscriptions for reconnecting
      }
    });
    if (!this.socket.connected) {
      this.queuedCommands.push(event);
      if (this.queuedCommands.length >= 3) {
        this.queuedCommands.shift(); // Prune queued commands
      }
      return;
    }
    this.socket.ws.send(JSON.stringify(event));
  }

}
