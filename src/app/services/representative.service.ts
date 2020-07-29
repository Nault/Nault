import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";
import {BaseApiAccount, WalletApiAccount, WalletService} from "./wallet.service";
import BigNumber from "bignumber.js";
import {ApiService} from "./api.service";
import {UtilService} from "./util.service";
import { NinjaService } from './ninja.service';

export interface RepresentativeStatus {
  online: boolean;
  veryHighWeight: boolean;
  highWeight: boolean;
  veryLowUptime: boolean;
  lowUptime: boolean;
  markedToAvoid: boolean;
  trusted: boolean;
  warn: boolean;
  known: boolean;
  uptime: Number;
  score: Number;
}

export interface RepresentativeOverview {
  id: string;
  weight: BigNumber;
  accounts: WalletApiAccount[];
}

export interface StoredRepresentative {
 id: string;
 name: string;
 warn?: boolean;
 trusted?: boolean;
}


export interface RepresentativeApiOverview extends BaseApiAccount {
  account: string;
  accounts: WalletApiAccount[];
  delegatedWeight: BigNumber;
}

export interface FullRepresentativeOverview extends RepresentativeApiOverview {
  id: string;
  percent: BigNumber;
  statusText: string;
  label: string|null;
  status: RepresentativeStatus;
}


@Injectable()
export class RepresentativeService {
  storeKey = `nanovault-representatives`;

  representatives$ = new BehaviorSubject([]);
  representatives = [];

  walletReps$ = new BehaviorSubject([]);
  walletReps = [];

  changeableReps$ = new BehaviorSubject([]);
  changeableReps = [];

  onlineStakeTotal = new BigNumber(115202418);

  loaded = false;

  constructor(
    private wallet: WalletService,
    private api: ApiService,
    private util: UtilService,
    private ninja: NinjaService
  ) {
    this.representatives = this.defaultRepresentatives;
  }

  /**
   * Determine if any accounts in the wallet need a rep change
   * @returns {Promise<FullRepresentativeOverview[]>}
   */
  async detectChangeableReps(): Promise<FullRepresentativeOverview[]> {
    const representatives = await this.getRepresentativesOverview();

    // Now based on some of their properties, we filter them out
    const needsChange = [];
    for (const rep of representatives) {
      if (rep.status.trusted) {
        continue; // Reps marked as trusted are good no matter their status
      }

      // If we have high weight, low uptime or marked as warn, then we need to change
      if (
            rep.status.highWeight
          || rep.status.veryHighWeight
          || rep.status.lowUptime
          || rep.status.veryLowUptime
          || rep.status.warn
        ) {
          needsChange.push(rep);
      }
    }

    this.changeableReps = needsChange;
    this.changeableReps$.next(needsChange);

    return needsChange;
  }

  /**
   * Get a detailed overview of representatives for all acounts in the wallet
   * @returns {Promise<FullRepresentativeOverview[]>}
   */
  async getRepresentativesOverview(): Promise<FullRepresentativeOverview[]> {
    // First get the details of all representatives for accounts in our wallet
    const accounts = await this.wallet.getAccountsDetails();
    const uniqueReps = this.getUniqueRepresentatives(accounts);
    const representatives = await this.getRepresentativesDetails(uniqueReps);
    const onlineReps = await this.getOnlineRepresentatives();
    const quorum = await this.api.confirmationQuorum();

    const online_stake_total = this.util.nano.rawToMnano(quorum.online_stake_total);
    this.onlineStakeTotal = new BigNumber(online_stake_total);

    const allReps = [];

    // Now, loop through each representative and determine some details about it
    for (const representative of representatives) {
      const repOnline = onlineReps.indexOf(representative.account) !== -1;
      const knownRep = this.getRepresentative(representative.account);
      const knownRepNinja = await this.ninja.getAccount(representative.account);

      const nanoWeight = this.util.nano.rawToMnano(representative.weight || 0);
      const percent = nanoWeight.div(this.onlineStakeTotal).times(100);

      const repStatus: RepresentativeStatus = {
        online: repOnline,
        veryHighWeight: false,
        highWeight: false,
        veryLowUptime: false,
        lowUptime: false,
        markedToAvoid: false,
        trusted: false,
        warn: false,
        known: false,
        uptime: null,
        score: null
      };

      // Determine the status based on some factors
      let status = 'none';
      let label;

      if (percent.gte(3)) {
        status = 'alert'; // Has extremely high voting weight
        repStatus.veryHighWeight = true;
      } else if (percent.gte(1)) {
        status = 'warn'; // Has high voting weight
        repStatus.highWeight = true;
      }

      if (knownRep) {
        status = status === 'none' ? 'ok' : status; // In our list
        label = knownRep.name;
        repStatus.known = true;
        if (knownRep.trusted) {
          status = 'trusted'; // In our list and marked as trusted
          repStatus.trusted = true;
        }
        if (knownRep.warn) {
          status = 'alert'; // In our list and marked for avoidance
          repStatus.markedToAvoid = true;
          repStatus.warn = true;
        }
      } else if (knownRepNinja) {
        status = status === 'none' ? 'ok' : status; // In our list
        label = knownRepNinja.alias;
        repStatus.uptime = knownRepNinja.uptime_over.week;
        repStatus.score = knownRepNinja.score;
        if (knownRepNinja.uptime_over.week < 90) {
          status = 'alert';
          repStatus.veryLowUptime = true;
          repStatus.warn = true;
        } else if (knownRepNinja.uptime_over.week < 99) {
          if (status !== 'alert') {
            status = 'warn';
          }
          repStatus.lowUptime = true;
          repStatus.warn = true;
        }
      }

      const additionalData = {
        id: representative.account,
        percent: percent,
        statusText: status,
        label: label,
        status: repStatus,
      };

      const fullRep = { ...representative, ...additionalData };
      allReps.push(fullRep);
    }

    this.walletReps = allReps;
    this.walletReps$.next(allReps);

    return allReps;
  }

  /**
   * Build a list of unique representatives based on the accounts provided
   * Many accounts may share the same representative
   * @param accounts
   * @returns {RepresentativeOverview[]}
   */
  getUniqueRepresentatives(accounts: WalletApiAccount[]): RepresentativeOverview[] {
    const representatives = [];
    for (let account of accounts) {
      if (!account || !account.representative) continue; // Account doesn't exist yet

      const existingRep = representatives.find(rep => rep.id == account.representative);
      if (existingRep) {
        existingRep.weight = existingRep.weight.plus(new BigNumber(account.balance));
        existingRep.accounts.push(account);
      } else {
        const newRep = {
          id: account.representative,
          weight: new BigNumber(account.balance),
          accounts: [account],
        };
        representatives.push(newRep);
      }
    }

    return representatives;
  }

  /**
   * Get a list of all online representatives
   * @returns {Promise<string[]>}
   */
  async getOnlineRepresentatives(): Promise<string[]> {
    const representatives = [];
    const reps = await this.api.representativesOnline();
    if (!reps) return representatives;
    for (let representative in reps.representatives) {
      if (!reps.representatives.hasOwnProperty(representative)) continue;
      representatives.push(reps.representatives[representative]);
    }

    return representatives;
  }

  /**
   * Add detailed API information to each representative
   * Note: The uglyness allows for requests to run in parallel
   * @param {RepresentativeOverview[]} representatives
   * @returns {Promise<RepresentativeApiOverview[]>}
   */
  async getRepresentativesDetails(representatives: RepresentativeOverview[]): Promise<RepresentativeApiOverview[]> {
    const repInfos = await Promise.all(
      representatives.map(rep =>
        this.api.accountInfo(rep.id)
          .then((res: RepresentativeApiOverview) => {
            res.account = rep.id;
            res.delegatedWeight = rep.weight;
            res.accounts = rep.accounts;

            return res;
          })
      )
    );

    return repInfos;
  }

  /**
   * Load the stored/known representative list from local storage
   * @returns {StoredRepresentative[]}
   */
  loadRepresentativeList(): StoredRepresentative[] {
    if (this.loaded) return this.representatives;

    let list = this.defaultRepresentatives;
    const representativeStore = localStorage.getItem(this.storeKey);
    if (representativeStore) {
      list = JSON.parse(representativeStore);
    }
    this.representatives = list;
    this.representatives$.next(list);
    this.loaded = true;

    return list;
  }

  patchXrbPrefixData() {
    const representativeStore = localStorage.getItem(this.storeKey);
    if (!representativeStore) return;

    const list = JSON.parse(representativeStore);

    const newRepList = list.map(entry => {
      if (entry.id.indexOf('xrb_') !== -1) {
        entry.id = entry.id.replace('xrb_', 'nano_');
      }
      return entry;
    });

    localStorage.setItem(this.storeKey, JSON.stringify(newRepList));

    return true;
  }

  getRepresentative(id): StoredRepresentative | undefined {
    return this.representatives.find(rep => rep.id == id);
  }

  // Reset representatives list to the default one
  resetRepresentativeList() {
    localStorage.removeItem(this.storeKey);
    this.representatives = this.defaultRepresentatives;
    this.loaded = false;
  }


  saveRepresentative(accountID, name, trusted = false, warn = false): void {
    const newRepresentative: any = {
      id: accountID,
      name: name,
    };
    if (trusted) newRepresentative.trusted = true;
    if (warn) newRepresentative.warn = true;

    const existingRepresentative = this.representatives.find(r => r.name.toLowerCase() === name.toLowerCase() || r.id.toLowerCase() === accountID.toLowerCase());
    if (existingRepresentative) {
      this.representatives.splice(this.representatives.indexOf(existingRepresentative), 1, newRepresentative);
    } else {
      this.representatives.push(newRepresentative);
    }

    this.saveRepresentatives();
    this.representatives$.next(this.representatives);
  }

  deleteRepresentative(accountID): void {
    const existingIndex = this.representatives.findIndex(a => a.id.toLowerCase() === accountID.toLowerCase());
    if (existingIndex === -1) return;

    this.representatives.splice(existingIndex, 1);

    this.saveRepresentatives();
    this.representatives$.next(this.representatives);
  }

  saveRepresentatives(): void {
    localStorage.setItem(this.storeKey, JSON.stringify(this.representatives));
  }

  getSortedRepresentatives() {
    const weightedReps = this.representatives.map(r => {
      if (r.trusted) {
        r.weight = 2;
      } else if (r.warn) {
        r.weight = 0;
      } else {
        r.weight = 1;
      }
      return r;
    });

    return weightedReps.sort((a, b) => b.weight - a.weight);
  }

  // Default representatives list
  // tslint:disable-next-line:member-ordering
  defaultRepresentatives = [
    {
      id: 'nano_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
      name: 'Nano Foundation #1',
      warn: true,
    },
    {
      id: 'nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
      name: 'Nano Foundation #2',
      warn: true,
    },
    {
      id: 'nano_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p',
      name: 'Nano Foundation #3',
      warn: true,
    },
    {
      id: 'nano_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
      name: 'Nano Foundation #4',
      warn: true,
    },
    {
      id: 'nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
      name: 'Nano Foundation #5',
      warn: true,
    },
    {
      id: 'nano_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy',
      name: 'Nano Foundation #6',
      warn: true,
    },
    {
      id: 'nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
      name: 'Nano Foundation #7',
      warn: true,
    },
    {
      id: 'nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
      name: 'Nano Foundation #8',
      warn: true,
    },
  ];

}
