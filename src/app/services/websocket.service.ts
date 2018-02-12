import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class WebsocketService {

  queuedCommands = [];

  keepaliveTimeout = 60 * 1000;

  socket = {
    connected: false,
    ws: null,
  };

  newTransactions$ = new BehaviorSubject(null);

  constructor() { }

  connect() {
    const ws = new WebSocket('wss://ws.nanovault.io');
    this.socket.ws = ws;

    ws.onopen = event => {
      this.socket.connected = true;
      this.queuedCommands.forEach(event => ws.send(JSON.stringify(event)));

      this.keepalive(); // Start keepalives!
    };
    ws.onerror = event => {
      console.log(`Socket error`, event);
    };
    ws.onclose = event => {
      this.socket.connected = false;
      console.log(`Socket close`, event);
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
