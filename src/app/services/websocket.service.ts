import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class WebsocketService {

  queuedCommands = [];

  socket = {
    connected: false,
    ws: null,
  };

  newTransactions$ = new BehaviorSubject(null);

  constructor() { }

  connect() {
    console.log(`connecting`);
    // const ws = new WebSocket('ws://localhost:3333');
    const ws = new WebSocket('ws://ws.nanovault.io');
    this.socket.ws = ws;

    ws.onopen = event => {
      this.socket.connected = true;
      console.log(`Socket open`, event);
      this.queuedCommands.forEach(event => ws.send(JSON.stringify(event)));
    };
    ws.onerror = event => {
      console.log(`Socket error`, event);
    };
    ws.onclose = event => {
      this.socket.connected = false;
      console.log(`Socket close`, event);
    };
    ws.onmessage = event => {
      console.log(`Got message! `, event);
      try {
        const newEvent = JSON.parse(event.data);
        console.log(`Parsed event!!`, newEvent);

        if (newEvent.event === 'newTransaction') {
          // apparently we got something, just trigger a pending for all basically? ezpz?
          this.newTransactions$.next(newEvent.data);
        }
      } catch (err) {
        console.log(`Error parsing message`, err);
      }
    }
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
    console.log(`Sending subscribe for accounts`, event);
    this.socket.ws.send(JSON.stringify(event));
  }

}
