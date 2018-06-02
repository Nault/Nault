import {Component, OnInit, ViewChild} from '@angular/core';
import {WalletService} from "../../services/wallet.service";
import {ApiService} from "../../services/api.service";
import BigNumber from "bignumber.js";
import {UtilService} from "../../services/util.service";
import {RepresentativeService} from "../../services/representative.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {NotificationService} from "../../services/notification.service";
import {NanoBlockService} from "../../services/nano-block.service";

@Component({
  selector: 'app-representatives',
  templateUrl: './representatives.component.html',
  styleUrls: ['./representatives.component.css']
})
export class RepresentativesComponent implements OnInit {

  @ViewChild('repInput') repInput;

  changeAccountID: any = null;
  toRepresentativeID: string = '';

  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';

  representativeOverview = [];
  changingRepresentatives = false;

  selectedAccounts = [];
  fullAccounts = [];

  constructor(
    public wallet: WalletService,
    private api: ApiService,
    private notifications: NotificationService,
    private nanoBlock: NanoBlockService,
    private util: UtilService,
    private representativeService: RepresentativeService,
    public settings: AppSettingsService) { }

  async ngOnInit() {
    this.representativeService.loadRepresentativeList();
    await this.loadRepresentativeOverview();
  }

  async loadRepresentativeOverview() {
    const onlineReps = await this.getOnlineRepresentatives();
    // TODO: Handling for unopened accounts?

    const walletAccountInfos = await this.getWalletAccountDetails();
    this.fullAccounts = walletAccountInfos;

    // Get a unique list of representatives for our accounts
    const uniqueRepresentatives = this.getAccountRepresentatives(walletAccountInfos);

    // Get full info about each representative
    const representativesDetails = await this.getRepresentativesDetails(uniqueRepresentatives);

    // Build up the overview object for each representative
    const totalSupply = new BigNumber(133248289);
    let representativesOverview = [];

    for (const representative of representativesDetails) {
      const repOnline = onlineReps.indexOf(representative.account) !== -1;
      const knownRep = this.representativeService.getRepresentative(representative.account);

      const nanoWeight = this.util.nano.rawToMnano(representative.weight || 0);
      const percent = nanoWeight.div(totalSupply).times(100);

      // Determine the status based on some factors
      let status = 'none';
      if (knownRep && knownRep.trusted) {
        status = 'trusted'; // In our list and marked as trusted
      } else if (knownRep && knownRep.warn) {
        status = 'alert'; // In our list and marked for avoidance
      } else if (percent.gte(10)) {
        status = 'alert'; // Has extremely high voting weight
      } else if (percent.gte(1)) {
        status = 'warn'; // Has high voting weight
      } else if (knownRep) {
        status = 'known'; // In our list
      }

      const repOverview = {
        id: representative.account,
        weight: nanoWeight,
        delegatedWeight: representative.delegatedWeight,
        percent: percent,
        status: status,
        label: knownRep ? knownRep.name : null,
        online: repOnline,
        accounts: representative.accounts,
      };

      representativesOverview.push(repOverview);
    }

    // Sort by weight delegated
    representativesOverview = representativesOverview.sort((a, b) => b.delegatedWeight - a.delegatedWeight);

    this.representativeOverview = representativesOverview;
  }

  async getWalletAccountDetails(): Promise<any> {
    // Run an accountInfo call for each account in the wallet to get their representatives
    const walletAccountInfos = await Promise.all(
      this.wallet.wallet.accounts.map(account =>
        this.api.accountInfo(account.id)
          .then(res => {
            res.id = account.id;
            res.addressBookName = account.addressBookName;

            return res;
          })
      )
    );

    return walletAccountInfos;
  }

  async getRepresentativesDetails(representatives): Promise<any> {
    // Run an accountInfo call for each representative, carry on data.  The uglyness allows for them to run in parallel
    const repInfos = await Promise.all(
      representatives.map(rep =>
        this.api.accountInfo(rep.id)
          .then(res => {
            res.account = rep.id;
            res.delegatedWeight = rep.weight;
            res.accounts = rep.accounts;

            return res;
          })
      )
    );

    return repInfos;
  }

  // Make a unique list of representatives used in all accounts
  getAccountRepresentatives(walletAccountInfos) {
    const representatives = [];
    for (let accountInfo of walletAccountInfos) {
      if (!accountInfo || !accountInfo.representative) continue; // Account doesn't exist yet

      const existingRep = representatives.find(rep => rep.id == accountInfo.representative);
      if (existingRep) {
        existingRep.weight = existingRep.weight.plus(new BigNumber(accountInfo.balance));
        existingRep.accounts.push(accountInfo);
      } else {
        const newRep = {
          id: accountInfo.representative,
          weight: new BigNumber(accountInfo.balance),
          accounts: [accountInfo],
        };
        representatives.push(newRep);
      }
    }

    return representatives;
  }

  async getOnlineRepresentatives() {
    const representatives = [];
    try {
      const reps = await this.api.representativesOnline();
      for (let representative in reps.representatives) {
        if (!reps.representatives.hasOwnProperty(representative)) continue;
        representatives.push(representative);
      }
    } catch (err) {
      this.notifications.sendWarning(`Unable to determine online status of representatives`);
    }

    return representatives;
  }

  addSelectedAccounts(accounts) {
    for (let account of accounts) {
      this.newAccountID(account.id);
    }

    // Scroll to the representative input
    setTimeout(() => this.repInput.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  newAccountID(accountID) {
    const newAccount = accountID || this.changeAccountID;
    if (!newAccount) return; // Didn't select anything

    const existingAccount = this.selectedAccounts.find(a => a.id === newAccount);
    if (existingAccount) return; // Already selected

    const allExists = this.selectedAccounts.find(a => a.id === 'All Accounts');
    if (newAccount === 'all' && !allExists) {
      this.selectedAccounts = []; // Reset the list before adding all
    }
    if (newAccount !== 'all' && allExists) {
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(allExists), 1); // Remove all from the list
    }

    if (newAccount === 'all') {
      this.selectedAccounts.push({ id: 'All Accounts' });
    } else {
      const walletAccount = this.wallet.getWalletAccount(newAccount);
      this.selectedAccounts.push(walletAccount);
    }

    setTimeout(() => this.changeAccountID = null, 10);
  }

  removeSelectedAccount(account) {
    this.selectedAccounts.splice(this.selectedAccounts.indexOf(account), 1); // Remove all from the list
  }

  searchRepresentatives() {
    this.showRepresentatives = true;
    const search = this.toRepresentativeID || '';
    const representatives = this.representativeService.getSortedRepresentatives();

    const matches = representatives
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.toRepresentativeID = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.toRepresentativeID = this.toRepresentativeID.replace(/ /g, '');
    const rep = this.representativeService.getRepresentative(this.toRepresentativeID);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else {
      this.representativeListMatch = '';
    }
  }

  async changeRepresentatives() {
    const accounts = this.selectedAccounts;
    const newRep = this.toRepresentativeID;

    if (this.changingRepresentatives) return; // Already running
    if (this.wallet.walletIsLocked()) return this.notifications.sendWarning(`Wallet must be unlocked`);
    if (!accounts || !accounts.length) return this.notifications.sendWarning(`You must select at least one account to change`);

    this.changingRepresentatives = true;

    const valid = await this.api.validateAccountNumber(newRep);
    if (!valid || valid.valid !== '1') {
      this.changingRepresentatives = false;
      return this.notifications.sendWarning(`Representative is not a valid account`);
    }

    const allAccounts = accounts.find(a => a.id === 'All Accounts');
    const accountsToChange = allAccounts ? this.wallet.wallet.accounts : accounts;

    // Remove any that don't need their represetatives to be changed
    const accountsNeedingChange = accountsToChange.filter(account => {
      const accountInfo = this.fullAccounts.find(a => a.id === account.id);
      if (!accountInfo || accountInfo.error) return false; // Cant find info, update the account

      if (accountInfo.representative.toLowerCase() === newRep.toLowerCase()) {
        return false; // This account already has this representative, reject it
      }

      return true;
    });

    if (!accountsNeedingChange.length) {
      this.changingRepresentatives = false;
      return this.notifications.sendInfo(`None of the accounts selected need to be updated`);
    }

    // Now loop and change them
    for (let account of accountsNeedingChange) {
      const walletAccount = this.wallet.getWalletAccount(account.id);
      if (!walletAccount) continue; // Unable to find account in the wallet? wat?

      try {
        const changed = await this.nanoBlock.generateChange(walletAccount, newRep, this.wallet.isLedgerWallet());
        if (!changed) {
          this.notifications.sendError(`Error changing representative for ${account.id}, please try again`);
        }
      } catch (err) {
        this.notifications.sendError(err.message);
      }
    }

    // Good to go!
    this.selectedAccounts = [];
    this.toRepresentativeID = '';
    this.representativeListMatch = '';
    this.changingRepresentatives = false;

    this.notifications.sendSuccess(`Successfully updated representatives!`);

    await this.loadRepresentativeOverview();
  }


}
