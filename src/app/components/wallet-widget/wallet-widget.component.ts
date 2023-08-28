import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {LedgerService, LedgerStatus} from '../../services/ledger.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {PowService} from '../../services/pow.service';

@Component({
  selector: 'app-wallet-widget',
  templateUrl: './wallet-widget.component.html',
  styleUrls: ['./wallet-widget.component.css']
})
export class WalletWidgetComponent implements OnInit {
  wallet = this.walletService.wallet;

  ledgerStatus = {
    status: 'not-connected',
    statusText: '',
  };
  powAlert = false;

  unlockPassword = '';

  modal: any = null;
  mayAttemptUnlock = true;
  timeoutIdAllowingUnlock: any = null;

  constructor(
    public walletService: WalletService,
    private notificationService: NotificationService,
    public ledgerService: LedgerService,
    public settings: AppSettingsService,
    private powService: PowService) { }

  @ViewChild('passwordInput') passwordInput: ElementRef;

  ngOnInit() {
    const UIkit = (window as any).UIkit;
    const modal = UIkit.modal(document.getElementById('unlock-wallet-modal'));
    UIkit.util.on('#unlock-wallet-modal', 'hidden', () => {
      this.onModalHidden();
    });
    this.modal = modal;

    this.ledgerService.ledgerStatus$.subscribe((ledgerStatus) => {
      this.ledgerStatus = ledgerStatus;
    });

    // Detect if a PoW is taking too long and alert
    this.powService.powAlert$.subscribe(async shouldAlert => {
      if (shouldAlert) {
        this.powAlert = true;
      } else {
        this.powAlert = false;
      }
    });

    this.walletService.wallet.unlockModalRequested$.subscribe(async wasRequested => {
      if (wasRequested === true) {
        this.showModal();
      }
    });
  }

  showModal() {
    this.unlockPassword = '';
    this.modal.show();
  }

  onModalHidden() {
    this.unlockPassword = '';
    this.walletService.wallet.unlockModalRequested$.next(false);
  }

  async lockWallet() {
    if (this.wallet.type === 'ledger') {
      return; // No need to lock a ledger wallet, no password saved
    }
    if (!this.wallet.password) {
      return this.notificationService.sendWarning(`You must set a password on your wallet - it is currently blank!`);
    }
    const locked = await this.walletService.lockWallet();
    if (locked) {
      this.notificationService.sendSuccess(`Wallet locked`);
    } else {
      this.notificationService.sendError(`Unable to lock wallet`);
    }
  }

  async reloadLedger() {
    this.notificationService.sendInfo(`Checking Ledger Status...`, { identifier: 'ledger-status', length: 0 });
    try {
      await this.ledgerService.loadLedger();
      this.notificationService.removeNotification('ledger-status');
      if (this.ledgerStatus.status === LedgerStatus.READY) {
        this.notificationService.sendSuccess(`Successfully connected to Ledger device`);
      }
    } catch (err) {
      console.log(`Got error when loading ledger! `, err);
      this.notificationService.removeNotification('ledger-status');
      // this.notificationService.sendError(`Unable to load Ledger Device: ${err.message}`);
    }
  }

  allowUnlock(params: any) {
    this.mayAttemptUnlock = true;
    this.timeoutIdAllowingUnlock = null;
    this.unlockPassword = '';

    if (params.focusInputElement === true) {
      setTimeout(() => { this.passwordInput.nativeElement.focus(); }, 10);
    }
  }

  async unlockWallet() {
    if (this.mayAttemptUnlock === false) {
      return;
    }

    this.mayAttemptUnlock = false;

    if (this.timeoutIdAllowingUnlock !== null) {
      clearTimeout(this.timeoutIdAllowingUnlock);
    }

    this.timeoutIdAllowingUnlock = setTimeout(
      () => {
        this.allowUnlock({ focusInputElement: true });
      },
      500
    );

    const unlocked = await this.walletService.unlockWallet(this.unlockPassword);

    if (unlocked) {
      this.notificationService.sendSuccess(`Wallet unlocked`);
      this.modal.hide();
      if (this.unlockPassword.length < 6) {
        // eslint-disable-next-line max-len
        this.notificationService.sendWarning(`You are using an insecure password and encouraged to change it from settings > manage wallet`);
      }

      if (this.timeoutIdAllowingUnlock !== null) {
        clearTimeout(this.timeoutIdAllowingUnlock);
        this.timeoutIdAllowingUnlock = null;
      }

      this.allowUnlock({ focusInputElement: false });
    } else {
      this.notificationService.sendError(`Incorrect password, please try again!`);
    }
  }

  cancelPow() {
    this.powService.cancelAllPow(true);
  }

}
