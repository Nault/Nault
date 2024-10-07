import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import BigNumber from 'bignumber.js';
import {BehaviorSubject} from 'rxjs';
import { QrModalService } from '../../services/qr-modal.service';

import {
  ApiService,
  AppSettingsService,
  FullRepresentativeOverview,
  NanoBlockService,
  NotificationService,
  RepresentativeService,
  UtilService,
  WalletService,
  NinjaService
} from '../../services';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-representatives',
  templateUrl: './representatives.component.html',
  styleUrls: ['./representatives.component.css']
})
export class RepresentativesComponent implements OnInit {
  @ViewChild('repInput') repInput;

  changeAccountID: any = null;
  toRepresentativeID = '';

  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';

  representativeOverview = [];
  changingRepresentatives = false;

  selectedAccounts = [];
  fullAccounts = [];

  recommendedReps = [];
  recommendedRepsPaginated = [];
  recommendedRepsLoading = false;
  selectedRecommendedRep = null;
  showRecommendedReps = false;
  loadingRepresentatives = false;

  repsPerPage = 5;
  currentRepPage = 0;

  hideOverview = false;

  representativeList = [];

  constructor(
    private router: ActivatedRoute,
    public walletService: WalletService,
    private api: ApiService,
    private notifications: NotificationService,
    private nanoBlock: NanoBlockService,
    private util: UtilService,
    private representativeService: RepresentativeService,
    public settings: AppSettingsService,
    private ninja: NinjaService,
    private qrModalService: QrModalService,
    private translocoService: TranslocoService) { }

  async ngOnInit() {
    this.representativeService.loadRepresentativeList();

    // Listen for query parameters that set defaults
    this.router.queryParams.subscribe(params => {
      this.hideOverview = params && params.hideOverview;
      this.showRecommendedReps = params && params.showRecommended;

      if (params && params.accounts) {
        this.selectedAccounts = []; // Reset the preselected accounts
        const accounts = params.accounts.split(',');
        for (const account of accounts) {
          this.newAccountID(account);
        }
      }
      if (params && params.representative) {
        this.selectRepresentative(params.representative);
      }
    });

    this.loadingRepresentatives = true;
    let repOverview = await this.representativeService.getRepresentativesOverview();
    // Sort by weight delegated
    repOverview = repOverview.sort(
      (a: FullRepresentativeOverview, b: FullRepresentativeOverview) => b.delegatedWeight.toNumber() - a.delegatedWeight.toNumber()
    );
    this.representativeOverview = repOverview;
    repOverview.forEach(o => this.fullAccounts.push(...o.accounts));
    this.loadingRepresentatives = false;

    this.populateRepresentativeList();

    await this.loadRecommendedReps();
  }

  async populateRepresentativeList() {
    // add trusted/regular local reps to the list
    const localReps = this.representativeService.getSortedRepresentatives();
    this.representativeList.push( ...localReps.filter(rep => (!rep.warn)) );

    if (this.settings.settings.serverAPI) {
      const verifiedReps = await this.ninja.recommendedRandomized();

      // add random recommended reps to the list
      for (const representative of verifiedReps) {
        const temprep = {
          id: representative.account,
          name: representative.alias
        };

        this.representativeList.push(temprep);
      }
    }

    // add untrusted local reps to the list
    this.representativeList.push( ...localReps.filter(rep => (rep.warn)) );
  }

  getAccountLabel(account) {
    const addressBookName = account.addressBookName;

    if (addressBookName != null) {
      return addressBookName;
    }

    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === account.id);

    if (walletAccount == null) {
      return this.translocoService.translate('general.account');
    }

    return (this.translocoService.translate('general.account') + ' #' + walletAccount.index);
  }

  addSelectedAccounts(accounts) {
    for (const account of accounts) {
      this.newAccountID(account.id);
    }

    // Scroll to the representative input
    setTimeout(() => this.repInput.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  newAccountID(accountID) {
    const newAccount = accountID || this.changeAccountID;
    if (!newAccount) {
      return; // Didn't select anything
    }

    const existingAccount = this.selectedAccounts.find(a => a.id === newAccount);
    if (existingAccount) {
      return; // Already selected
    }

    const allExists = this.selectedAccounts.find(a => a.id === 'All Current Accounts');
    if (newAccount === 'all' && !allExists) {
      this.selectedAccounts = []; // Reset the list before adding all
    }
    if (newAccount !== 'all' && allExists) {
      this.selectedAccounts.splice(this.selectedAccounts.indexOf(allExists), 1); // Remove all from the list
    }

    if (newAccount === 'all') {
      if (this.selectedAccounts.length === 0) {
        this.selectedAccounts.push({ id: 'All Current Accounts' });
      }
    } else {
      const walletAccount = this.walletService.getWalletAccount(newAccount);
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

    const matches = this.representativeList
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      // remove duplicate accounts
      .filter((item, pos, self) => this.util.array.findWithAttr(self, 'id', item.id) === pos)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.toRepresentativeID = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  async validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.toRepresentativeID = this.toRepresentativeID.replace(/ /g, '');

    if (this.toRepresentativeID === '') {
      this.representativeListMatch = '';
      return;
    }

    const rep = this.representativeService.getRepresentative(this.toRepresentativeID);
    const ninjaRep = await this.ninja.getAccount(this.toRepresentativeID);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else if (ninjaRep) {
      this.representativeListMatch = ninjaRep.alias;
    } else {
      this.representativeListMatch = '';
    }
  }

  async loadRecommendedReps() {
    this.recommendedRepsLoading = true;
    try {
      const scores = await this.ninja.recommended() as any[];
      const totalSupply = new BigNumber(133248289);

      const reps = scores.map(rep => {
        const nanoWeight = this.util.nano.rawToMnano(rep.votingweight.toString() || 0);
        const percent = nanoWeight.div(totalSupply).times(100);

        // rep.weight = nanoWeight.toString(10);
        rep.weight = this.util.nano.mnanoToRaw(nanoWeight);
        rep.percent = percent.toFixed(3);

        return rep;
      });

      this.recommendedReps = reps;

      this.calculatePage();
      this.recommendedRepsLoading = false;
    } catch (err) {
      this.recommendedRepsLoading = null;
    }

  }

  previousReps() {
    if (this.currentRepPage > 0) {
      this.currentRepPage--;
      this.calculatePage();
    }
  }
  nextReps() {
    if (this.currentRepPage < (this.recommendedReps.length / this.repsPerPage) - 1) {
      this.currentRepPage++;
    } else {
      this.currentRepPage = 0;
    }
    this.calculatePage();
  }

  calculatePage() {
    this.recommendedRepsPaginated = this.recommendedReps.slice(
      (this.currentRepPage * this.repsPerPage),
      (this.currentRepPage * this.repsPerPage) + this.repsPerPage
    );
  }

  selectRecommendedRep(rep) {
    this.selectedRecommendedRep = rep;
    this.toRepresentativeID = rep.account;
    this.showRecommendedReps = false;
    this.representativeListMatch = rep.alias; // We will save if they use this, so this is a nice little helper
  }

  async changeRepresentatives() {
    const accounts = this.selectedAccounts;
    const newRep = this.toRepresentativeID;

    if (this.changingRepresentatives) {
      return; // Already running
    }
    if (this.walletService.isLocked()) {
      const wasUnlocked = await this.walletService.requestWalletUnlock();

      if (wasUnlocked === false) {
        return;
      }
    }
    if (!accounts || !accounts.length) {
      return this.notifications.sendWarning(`You must select at least one account to change`);
    }

    this.changingRepresentatives = true;

    const valid = this.util.account.isValidAccount(newRep);
    if (!valid) {
      this.changingRepresentatives = false;
      return this.notifications.sendWarning(`Representative is not a valid account`);
    }

    const allAccounts = accounts.find(a => a.id === 'All Current Accounts');
    const accountsToChange = allAccounts ? this.walletService.wallet.accounts : accounts;

    // Remove any that don't need their represetatives to be changed
    const accountsNeedingChange = accountsToChange.filter(account => {
      const accountInfo = this.fullAccounts.find(a => a.id === account.id);
      if (!accountInfo || accountInfo.error) {
        return false; // Cant find info, update the account
      }

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
    for (const account of accountsNeedingChange) {
      const walletAccount = this.walletService.getWalletAccount(account.id);
      if (!walletAccount) {
        continue; // Unable to find account in the wallet? wat?
      }

      try {
        const changed = await this.nanoBlock.generateChange(walletAccount, newRep, this.walletService.isLedgerWallet());
        if (!changed) {
          this.notifications.sendError(`Error changing representative for ${account.id}, please try again`);
        }
      } catch (err) {
        this.notifications.sendError('Error changing representative: ' + err.message);
      }
    }

    // Determine if a recommended rep was selected, if so we save an entry in the rep list
    if (this.selectedRecommendedRep && this.selectedRecommendedRep.account && this.selectedRecommendedRep.account === newRep) {
      this.representativeService.saveRepresentative(newRep, this.selectedRecommendedRep.alias, false, false);
    }

    // Good to go!
    this.selectedAccounts = [];
    this.toRepresentativeID = '';
    this.representativeListMatch = '';
    this.changingRepresentatives = false;
    this.selectedRecommendedRep = null;

    this.notifications.sendSuccess(`Successfully updated representatives!`);

    let useCachedReps = false;

    // If the overview panel is displayed, reload its data now
    if (!this.hideOverview) {
      this.loadingRepresentatives = true;
      this.representativeOverview = await this.representativeService.getRepresentativesOverview();
      this.loadingRepresentatives = false;
      useCachedReps = true;
    }

    // Detect if any new reps should be changed
    await this.representativeService.detectChangeableReps(useCachedReps ? this.representativeOverview : null);
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'rep1':
          this.toRepresentativeID = data.content;
          this.validateRepresentative();
          break;
      }
    }, () => {}
    );
  }
}
