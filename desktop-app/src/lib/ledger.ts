import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';
import Nano from 'hw-app-nano';

import * as rx from 'rxjs';

import { ipcMain } from 'electron';

const STATUS_CODES = {
  SECURITY_STATUS_NOT_SATISFIED: 0x6982,
  CONDITIONS_OF_USE_NOT_SATISFIED: 0x6985,
  INVALID_SIGNATURE: 0x6a81,
  CACHE_MISS: 0x6a82
};

const LedgerStatus = {
  NOT_CONNECTED: "not-connected",
  LOCKED: "locked",
  READY: "ready",
};


export class LedgerService {
  walletPrefix = `44'/165'/`;
  waitTimeout = 300000;
  normalTimeout = 5000;
  pollInterval = 45000;

  pollingLedger = false;
  queryingLedger = false;

  ledgerStatus$ = new rx.Subject();
  ledgerMessage$ = new rx.Subject();

  ledger = {
    status: LedgerStatus.NOT_CONNECTED,
    nano: null,
    transport: null,
  };
  constructor() {

  }

  resetLedger(errorMessage = '') {
    console.log(`Resetting transport/nano objects....`);
    this.ledger.transport = null;
    this.ledger.nano = null;
    // if (this.ledger.status !== LedgerStatus.NOT_CONNECTED) {
    //   this.setLedgerStatus(LedgerStatus.NOT_CONNECTED);
    // }
    this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, errorMessage);
  }

  async loadTransport() {
    return new Promise((resolve, reject) => {
      TransportNodeHid.create().then(trans => {
        console.log(`Wtf got trans?! `, trans);

        this.ledger.transport = trans;
        this.ledger.transport.setDebugMode(true);
        this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
        console.log(`Created ledger?!`, this.ledger.transport);
        console.log(this.ledger.transport.device.getDeviceInfo());

        this.ledger.nano = new Nano(this.ledger.transport);


        resolve(this.ledger.transport);
      }).catch(reject);
    })
  }

  async loadAppConfig(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ledger.nano.getAppConfiguration().then(resolve).catch(reject);
    })
  }

  async loadLedger() {
    console.log(`Loading ledger`);
    if (!this.ledger.transport) {

      console.log('Looking for ledger, checking for window property');

      try {
        // const transport = TransportNodeHid;
        // transport.setListenDevicesDebug(true);
        // console.log(`Transport is? `, transport);

        // TransportNodeHid.create(5000, 20000).then(trans => {
        //   console.log(`Wtf got trans?! `, trans);
        //
        //   this.ledger.transport = trans;
        //   this.ledger.transport.setDebugMode(true);
        //   this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
        //   console.log(`Created ledger?!`, this.ledger.transport);
        //   console.log(this.ledger.transport.device.getDeviceInfo());
        //
        //
        // })

        await this.loadTransport();

        // this.ledger.transport = await TransportNodeHid.create(5000, 20000);
        // this.ledger.transport.setDebugMode(true);
        console.log(`Set debug!`);
        // console.log(`Created ledger?!`, this.ledger.transport);
        // console.log(this.ledger.transport.device.getDeviceInfo());
        console.log(`DEVICES:`);
        console.log(await TransportNodeHid.list());
        // this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
      } catch (err) {
        console.log(`Error loading transport? `, err);
        // if (err.statusText == 'UNKNOWN_ERROR') {
        //   this.resetLedger();
        //   return;
        // }
        this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, `Unable to load Ledger transport: ${err.message || err}`);
        this.resetLedger();
        // this.ledgerStatus$.next(this.ledger.status);
        return;
      }
    }

    if (!this.ledger.nano) {
      try {
        console.log(`Loading nano!`);
        // const nano = Nano;
        // this.ledger.nano = new Nano(this.ledger.transport);
        console.log(`Loaded nano...`, this.ledger.nano);
      } catch (err) {
        console.log(err);
        // if (err.statusText == 'UNKNOWN_ERROR') {
        //   this.resetLedger();
        //   return;
        // }
        this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, `Unable to load Nano transport: ${err.message || err}`);
        this.resetLedger();
        // this.ledgerStatus$.next(this.ledger.status);
        return;
      }
    }

    let resolved = false;
    if (this.ledger.status === LedgerStatus.READY) {
      this.ledgerStatus$.next({ status: this.ledger.status, message: 'Ledger device already ready' });
      return true; // Already ready?
    }

    setTimeout(() => {
      if (resolved || this.ledger.status === LedgerStatus.READY) return;
      console.log(`Timeout expired, sending not connected`);
      this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, `Ledger device not detected`);
      // this.ledger.status = LedgerStatus.NOT_CONNECTED;
      // this.ledgerStatus$.next(this.ledger.status);
      this.resetLedger();
      // if (!hideNotifications) {
      //   this.notifications.sendWarning(`Unable to connect to the Ledger device.  Make sure it is unlocked and the Nano application is open`);
      // }
      resolved = true;
      return false;
    }, 3000);

    // if (this.ledger.status !== LedgerStatus.LOCKED) {
    //   try {
    //     console.log(`Loading ledger app config`);
    //     this.ledger.nano.transport.setDebugMode(true);
    //     // this.ledger.nano.getAppConfiguration().then(appConfig => {
    //     //   console.log(`DELAYED LOAD OF APP CONFIG: `, appConfig);
    //     // }).catch(err => {
    //     //   console.log(`App config err: `, err);
    //     // })
    //     console.log(`About to send....`);
    //     const ledgerConfig = await this.loadAppConfig();
    //     resolved = true;
    //     console.log(`Loaded ledger config? `, ledgerConfig);
    //     if (!ledgerConfig || !ledgerConfig) return false;
    //     if (ledgerConfig && ledgerConfig.version) {
    //       console.log(`Got ledger config, sending locked status`);
    //       // this.setLedgerStatus(LedgerStatus.LOCKED, `Ledger connected, but locked`);
    //       // this.ledger.status = LedgerStatus.LOCKED;
    //       // this.ledgerStatus$.next(this.ledger.status);
    //     }
    //   } catch (err) {
    //     if (err && err.statusCode === 28160) {
    //       // Ledger unlocked, but Nano app closed?
    //     }
    //     console.log(err);
    //     console.log(`'Resetting?????!?`);
    //     // if (err.statusText == 'HALTED') {
    //     //   this.resetLedger();
    //     // }
    //     this.resetLedger();
    //
    //     // if (!hideNotifications && !resolved) {
    //     //   this.notifications.sendWarning(`Ledger device locked.  Unlock and open the Nano application`);
    //     // }
    //     return false;
    //   }
    // }


    // Attempt to load account 0 - which confirms the app is unlocked and ready
    try {
      console.log(`Loading account details`);
      const accountDetails = await this.getLedgerAccount(0);
      this.setLedgerStatus(LedgerStatus.READY, `Ledger device ready`);
      // this.ledger.status = LedgerStatus.READY;
      // this.ledgerStatus$.next(this.ledger.status);
      resolved = true;
      console.log(`Loaded account, sending ready status - turning on polling`);

      if (!this.pollingLedger) {
        this.pollingLedger = true;
        this.pollLedgerStatus();
      }

      return true;
    } catch (err) {
      console.log(err);
      if (err.statusCode === STATUS_CODES.SECURITY_STATUS_NOT_SATISFIED) {
        // if (!hideNotifications) {
        //   this.notifications.sendWarning(`Ledger device locked.  Unlock and open the Nano application`);
        // }
      }
    }

    return false;
  }

  async getLedgerAccount(accountIndex, showOnScreen = false) {
    console.log(`Getting account at index `, accountIndex, 'show?', showOnScreen);

    try {
      this.ledger.transport.setExchangeTimeout(showOnScreen ? this.waitTimeout : this.normalTimeout);

      console.log(`Yolo gl`);
      this.queryingLedger = true;
      const account = await this.ledger.nano.getAddress(this.ledgerPath(accountIndex), showOnScreen);
      this.queryingLedger = false;
      console.log(`Got account: `, account);
      console.log(`Sending message`);
      this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex }, account) });
    } catch (err) {
      this.queryingLedger = false;
      console.log(`Error when getting account: `, err);

      const data = { error: true, errorMessage: typeof err === 'string' ? err : err.message };
      this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex }, data) });

      if (err.statusCode === STATUS_CODES.CONDITIONS_OF_USE_NOT_SATISFIED) {
        // This means they simply denied it...

        return; // We won't reset the ledger status in this instance
      }
      // const data = { error: true, errorMessage: typeof err === 'string' ? err : err.message };
      // this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex }, data) });
      this.resetLedger(data.errorMessage); // Apparently ledger not working?
      throw err;
    }
  }

  async cacheBlock(accountIndex, cacheData, signature) {
    try {
      console.log(`Caching block... `, accountIndex, cacheData, signature);
      this.queryingLedger = true;

      const cacheResponse = await this.ledger.nano.cacheBlock(this.ledgerPath(accountIndex), cacheData, signature);
      this.queryingLedger = false;

      console.log(`Got cache response: `, cacheResponse);
      console.log(`Sending cache response to desktop...?`);
      this.ledgerMessage$.next({ event: 'cache-block', data: Object.assign({ accountIndex }, cacheResponse) });
    } catch (err) {
      this.queryingLedger = false;

      console.log(`Error when caching block: `, err);

      const data = { error: true, errorMessage: typeof err === 'string' ? err : err.message };
      this.ledgerMessage$.next({ event: 'cache-block', data: Object.assign({ accountIndex }, data) });
      this.resetLedger(); // Apparently ledger not working?
      // throw err;
    }
  }

  async signBlock(accountIndex, blockData) {
    try {
      console.log(`signing block... `, accountIndex, blockData);
      this.queryingLedger = true;

      const signResponse = await this.ledger.nano.signBlock(this.ledgerPath(accountIndex), blockData);
      this.queryingLedger = false;

      console.log(`Got sign response?! `, signResponse);
      this.ledgerMessage$.next({ event: 'sign-block', data: Object.assign({ accountIndex }, signResponse) });
    } catch (err) {
      this.queryingLedger = false;

      console.log(`Error when signing block: `, err);

      const data = { error: true, errorMessage: typeof err === 'string' ? err : err.message };
      this.ledgerMessage$.next({ event: 'sign-block', data: Object.assign({ accountIndex }, data) });

      this.resetLedger(); // Apparently ledger not working?
      // throw err;
    }
  }

  setLedgerStatus(status, statusText = '') {
    this.ledger.status = status;
    this.ledgerStatus$.next({ status: this.ledger.status, statusText });
    // if (this.ledger.status !== status) {
    //   this.ledger.status = status;
    //   this.ledgerStatus$.next({ status: this.ledger.status, statusText });
    // }
  }

  ledgerPath(accountIndex) {
    return `${this.walletPrefix}${accountIndex}'`;
  }

  pollLedgerStatus() {
    if (!this.pollingLedger) return;
    setTimeout(async () => {
      await this.checkLedgerStatus();
      this.pollLedgerStatus();
    }, this.pollInterval);
  }

  async checkLedgerStatus() {
    if (this.ledger.status !== LedgerStatus.READY) return;
    if (this.queryingLedger) return; // Already querying ledger, skip this iteration

    try {
      await this.getLedgerAccount(0, false);
      this.setLedgerStatus(LedgerStatus.READY);
      // this.ledger.status = LedgerStatus.READY;
    } catch (err) {
      this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, `Ledger Disconnected: ${err.message || err }`);
      // this.ledger.status = LedgerStatus.NOT_CONNECTED;
      this.pollingLedger = false;
    }

    // this.ledgerStatus$.next({ status: this.ledger.status, message: '' });
  }


}

let sendingWindow = null;

ipcMain.on('msg', (event, data, data2) => {
  // console.log('Got event on ipc main! ', event);
  console.log('Got message on ipc main ', data);
});

export function initialize() {
  const Ledger = new LedgerService();

  // Ledger.loadLedger();

  Ledger.ledgerStatus$.subscribe(newStatus => {
    console.log(`Got new ledger status, attempting to send?`);
    if (!sendingWindow) return;

    console.log(`Sending new status: !?`, newStatus);
    sendingWindow.send('ledger', { event: 'ledger-status', data: newStatus });
  });

  Ledger.ledgerMessage$.subscribe(newMessage => {
    console.log(`Got new ledger message, attempting to send?`);
    if (!sendingWindow) return;

    console.log(`Sending new message: !?`, newMessage);
    sendingWindow.send('ledger', newMessage);
  });



  ipcMain.on('ledger', (event, data) => {
    console.log(`Got ledger message?!`, data);
    sendingWindow = event.sender;
    if (!data || !data.event) return;
    switch (data.event) {
      case 'get-ledger-status':
        Ledger.loadLedger();
        break;
      case 'account-details':
        Ledger.getLedgerAccount(data.data.accountIndex || 0, data.data.showOnScreen || false);
        break;
      case 'cache-block':
        Ledger.cacheBlock(data.data.accountIndex, data.data.cacheData, data.data.signature);
        break;
      case 'sign-block':
        Ledger.signBlock(data.data.accountIndex, data.data.blockData);
        break;
    }
  })
}

// module.exports = {
//   initialize,
// };
