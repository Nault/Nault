import { Injectable } from '@angular/core';
import Nano from "hw-app-nano";
import TransportU2F from "@ledgerhq/hw-transport-u2f";
// import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import {Subject} from "rxjs/Subject";
import {ApiService} from "./services/api.service";
import {NotificationService} from "./services/notification.service";
import { environment } from "../environments/environment";
import {DesktopService} from "./services/desktop.service";

export const STATUS_CODES = {
  /**
   * Security status not satisfied is returned when the
   * device is still locked
   */
  SECURITY_STATUS_NOT_SATISFIED: 0x6982,
  /**
   * Conditions of use not satisfied is returned when the
   * user declines the request to complete the action.
   */
  CONDITIONS_OF_USE_NOT_SATISFIED: 0x6985,
  /**
   * Failed to verify the provided signature.
   */
  INVALID_SIGNATURE: 0x6a81,
  /**
   * Parent block data was not found in cache.
   */
  CACHE_MISS: 0x6a82
};

export const LedgerStatus = {
  NOT_CONNECTED: "not-connected",
  LOCKED: "locked",
  READY: "ready",
};


export interface LedgerData {
  status: string;
  nano: any|null;
  transport: any|null;
}

@Injectable()
export class LedgerService {
  walletPrefix = `44'/165'/`;

  waitTimeout = 300000;
  normalTimeout = 5000;
  pollInterval = 15000;

  pollingLedger = false;

  ledger: LedgerData = {
    status: LedgerStatus.NOT_CONNECTED,
    nano: null,
    transport: null,
  };

  isDesktop = true;
  // isDesktop = environment.desktop;

  ledgerStatus$: Subject<any> = new Subject();
  desktopMessage$ = new Subject();

  constructor(private api: ApiService,
              private desktop: DesktopService,
              private notifications: NotificationService) {
    if (this.isDesktop) {
      this.configureDesktop();
    }
  }

  resetLedger() {
    // console.log(`Resetting ledger device`);
    this.ledger.transport = null;
    this.ledger.nano = null;
  }

  configureDesktop() {
    this.desktop.on('ledger', (event, message) => {
      // message.event
      console.log(`Got ledger event from desktop: `, message);
      if (!message || !message.event) return;
      switch (message.event) {
        case 'ledger-status':
          this.ledger.status = message.data.status;
          this.ledgerStatus$.next({ status: message.data.status, statusText: message.data.statusText });
          // Show an error message?
          // this.notifications.sendSuccess(`Got new status from ledger: ${message.data.statusText} (${message.data.status})`);
          break;
        case 'account-details':
          console.log(`Got new account details? `, message.data);

          // send a next message down the main pipeline that gets filtered?
          this.desktopMessage$.next(message);
          break;
        case 'cache-block':
          console.log(`Got cache block details? `, message.data);

          // send a next message down the main pipeline that gets filtered?
          this.desktopMessage$.next(message);
          break;
        case 'sign-block':
          console.log(`Got signed block details? `, message.data);

          // send a next message down the main pipeline that gets filtered?
          this.desktopMessage$.next(message);
          break;
      }
    })

  }

  async getDesktopResponse(eventType, filterFn = undefined) {
    console.log(`Getting desktop response for.... `, eventType);
    return new Promise((resolve, reject) => {
      const sub = this.desktopMessage$
        // .asObservable().filter((m: any) => {
        //   console.log(`desktop response, filtering msg: `, m);
        //   console.log(`Must be type: `, eventType);
        //   return m.event == eventType;
        // })
        .subscribe((response: any) => {
          console.log(`Account details FIRST, got response: `, response);
          console.log(`Checking event type: `, response.event, eventType);
          if (response.event !== eventType) {
            return; // Not the event we want.
          }
          console.log(`Filtering fn? `, filterFn);
          if (filterFn) {
            const shouldSkip = filterFn(response.data);
            console.log(`Should we skip? `, response.data, shouldSkip);
            if (!shouldSkip) return; // This is not the message the subscriber wants
          }
          if (response.data && response.data.error === true) {
            // Request failed!
            return reject(new Error(response.data.errorMessage));
          }
          console.log(`Got the right event.... `, eventType);
          resolve(response.data);
          sub.unsubscribe();
        }, err => {
          console.log(`Account details got error!`, err);
          reject(err);
        })
    })

  }

  async getLedgerAccountDesktop(accountIndex, showOnScreen) {
    console.log(`Requesting account details from desktop... `, accountIndex);
    this.desktop.send('ledger', { event: 'account-details', data: { accountIndex, showOnScreen } });
    console.log(`Waiting for first desktop response....`);
    const details = await this.getDesktopResponse('account-details', a => a.accountIndex === accountIndex);
    console.log(`Got account details response from desktop! `, details);

    return details;
  }

  async updateCacheDesktop(accountIndex, cacheData, signature) {
    console.log(`Caching block... `, accountIndex, cacheData, signature);
    this.desktop.send('ledger', { event: 'cache-block', data: { accountIndex, cacheData, signature } });
    console.log(`Waiting for first desktop response....`);
    try {
      const details = await this.getDesktopResponse('cache-block', a => a.accountIndex === accountIndex);
      console.log(`Got cache response from desktop! `, details);

      return details;
    } catch (err) {
      throw new Error(`Error caching block: ${err.message}`);
    }

  }

  async signBlockDesktop(accountIndex, blockData) {
    console.log(`Requesting block sign from desktop... `, accountIndex, blockData);
    this.desktop.send('ledger', { event: 'sign-block', data: { accountIndex, blockData } });
    console.log(`Waiting for first desktop response....`);
    try {
      const details = await this.getDesktopResponse('sign-block', a => a.accountIndex === accountIndex);
      console.log(`Got sign block response from desktop! `, details);

      return details;
    } catch (err) {
      throw new Error(`Error signing block: ${err.message}`);
    }

  }


  async loadLedger(hideNotifications = false) {
    return new Promise(async (resolve, reject) => {
      if (this.isDesktop) {
        // Send request to desktop for status, listen for the next async response
        this.desktop.send('ledger', { event: 'get-ledger-status' });
        console.log(`Requesting ledger status from desktop...`);
        // const response = await this.getDesktopResponse('ledger-status');
        // if (response && response.)
        let sub = this.ledgerStatus$.subscribe(newStatus => {
          console.log(`Got new status from desktop, setting: `, newStatus);
          sub.unsubscribe();

          if (newStatus.status === LedgerStatus.READY) {
            resolve(true);
          } else {
            reject(new Error(newStatus.statusText || `Unable to load desktop Ledger device`));
          }

          // console.log(`Resolving ledger load : `, newStatus.status === LedgerStatus.READY);
          // resolve(newStatus.status === LedgerStatus.READY);
          // if (newStatus === LedgerStatus.READY) {
          //   resolve(true);
          // } else {
          //   re
          // }
          // resolve(true);
        }, reject);
        return;
      }

      // Load the transport object
      if (!this.ledger.transport) {

        console.log('Looking for ledger, checking for window property');

        const desktopLedger = window['LedgerTransport'];
        console.log(`Got desktop ledger~ ', `, desktopLedger);


        try {
          if (desktopLedger) {
            this.ledger.transport = await desktopLedger.open(null);
            console.log(`Started desktop connection?! `, this.ledger.transport);
          } else {
            this.ledger.transport = await TransportU2F.open(null);
            // this.ledger.transport = await TransportU2F.open(null);
          }
          this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
        } catch (err) {
          if (err.statusText == 'UNKNOWN_ERROR') {
            this.resetLedger();
          }
          this.ledgerStatus$.next(this.ledger.status);
          return resolve(false);
        }
      }

      // Load nano object
      if (!this.ledger.nano) {
        try {
          this.ledger.nano = new Nano(this.ledger.transport);
        } catch (err) {
          if (err.statusText == 'UNKNOWN_ERROR') {
            this.resetLedger();
          }
          this.ledgerStatus$.next(this.ledger.status);
          return resolve(false);
        }
      }

      let resolved = false;
      if (this.ledger.status === LedgerStatus.READY) {
        return resolve(true); // Already ready?
      }

      // Set up a timeout when things are not ready
      setTimeout(() => {
        if (resolved) return;
        this.ledger.status = LedgerStatus.NOT_CONNECTED;
        this.ledgerStatus$.next(this.ledger.status);
        if (!hideNotifications) {
          this.notifications.sendWarning(`Unable to connect to the Ledger device.  Make sure it is unlocked and the Nano application is open`);
        }
        resolved = true;
        return resolve(false);
      }, 2500);

      // Try to load the app config
      try {
        const ledgerConfig = await this.ledger.nano.getAppConfiguration();
        resolved = true;
        if (!ledgerConfig || !ledgerConfig) return resolve(false);
        if (ledgerConfig && ledgerConfig.version) {
          this.ledger.status = LedgerStatus.LOCKED;
          this.ledgerStatus$.next(this.ledger.status);
        }
      } catch (err) {
        if (err.statusText == 'HALTED') {
          this.resetLedger();
        }
        if (!hideNotifications && !resolved) {
          this.notifications.sendWarning(`Ledger device locked.  Unlock and open the Nano application`);
        }
        return resolve(false);
      }

      // Attempt to load account 0 - which confirms the app is unlocked and ready
      try {
        const accountDetails = await this.getLedgerAccount(0);
        this.ledger.status = LedgerStatus.READY;
        this.ledgerStatus$.next(this.ledger.status);

        if (!this.pollingLedger) {
          this.pollingLedger = true;
          this.pollLedgerStatus();
        }
      } catch (err) {
        if (err.statusCode === STATUS_CODES.SECURITY_STATUS_NOT_SATISFIED) {
          if (!hideNotifications) {
            this.notifications.sendWarning(`Ledger device locked.  Unlock and open the Nano application`);
          }
        }
      }

      resolve(true);
    }).catch(err => {
      console.log(`error when loading ledger `, err);
      if (!hideNotifications) {
        console.log(`Showing warning notification with: `, err);
        this.notifications.sendWarning(`Error loading Ledger device: ${typeof err === 'string' ? err : err.message}`, { length: 6000 });
      }

      return null;
    })

  }

  async updateCache(accountIndex, blockHash) {
    if (this.ledger.status !== LedgerStatus.READY) {
      await this.loadLedger(); // Make sure ledger is ready
    }
    const blockResponse = await this.api.blocksInfo([blockHash]);
    const blockData = blockResponse.blocks[blockHash];
    if (!blockData) throw new Error(`Unable to load block data`);
    blockData.contents = JSON.parse(blockData.contents);

    const cacheData = {
      representative: blockData.contents.representative,
      balance: blockData.contents.balance,
      previousBlock: blockData.contents.previous === "0000000000000000000000000000000000000000000000000000000000000000" ? null : blockData.contents.previous,
      sourceBlock: blockData.contents.link,
    };

    if (this.isDesktop) {
      return await this.updateCacheDesktop(accountIndex, cacheData, blockData.contents.signature);
    } else {
      return await this.ledger.nano.cacheBlock(accountIndex, cacheData, blockData.contents.signature);
    }

    // const cacheResponse = await this.ledger.nano.cacheBlock(this.ledgerPath(accountIndex), cacheData, blockData.contents.signature);
    //
    // return cacheResponse;
  }

  async signBlock(accountIndex: number, blockData: any) {
    if (this.ledger.status !== LedgerStatus.READY) {
      await this.loadLedger(); // Make sure ledger is ready
    }
    if (this.isDesktop) {
      return this.signBlockDesktop(accountIndex, blockData);
    } else {
      this.ledger.transport.setExchangeTimeout(this.waitTimeout);
      return await this.ledger.nano.signBlock(this.ledgerPath(accountIndex), blockData);
    }
  }

  ledgerPath(accountIndex: number) {
    return `${this.walletPrefix}${accountIndex}'`;
  }

  async getLedgerAccountWeb(accountIndex: number, showOnScreen = false) {
    this.ledger.transport.setExchangeTimeout(showOnScreen ? this.waitTimeout : this.normalTimeout);
    try {
      return await this.ledger.nano.getAddress(this.ledgerPath(accountIndex), showOnScreen);
    } catch (err) {
      throw err;
    }
  }

  async getLedgerAccount(accountIndex: number, showOnScreen = false) {
    console.log(`Getting new account details....`, accountIndex);
    if (this.isDesktop) {
      return await this.getLedgerAccountDesktop(accountIndex, showOnScreen);
    } else {
      return await this.getLedgerAccountWeb(accountIndex, showOnScreen);
    }

    // this.ledger.transport.setExchangeTimeout(showOnScreen ? this.waitTimeout : this.normalTimeout);
    // try {
    //   return await this.ledger.nano.getAddress(this.ledgerPath(accountIndex), showOnScreen);
    // } catch (err) {
    //   throw err;
    // }
  }

  pollLedgerStatus() {
    if (!this.pollingLedger) return;
    setTimeout(async () => {
      await this.checkLedgerStatus();
      this.pollLedgerStatus();
    }, this.pollInterval);
  }

  async checkLedgerStatus() {
    if (this.ledger.status != LedgerStatus.READY) {
      return;
    }

    try {
      const accountDetails = await this.getLedgerAccount(0);
      this.ledger.status = LedgerStatus.READY;
    } catch (err) {
      this.ledger.status = LedgerStatus.NOT_CONNECTED;
      this.pollingLedger = false;
    }

    this.ledgerStatus$.next(this.ledger.status);
  }



}
