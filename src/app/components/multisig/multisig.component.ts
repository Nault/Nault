import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UtilService } from '../../services/util.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { RemoteSignService } from '../../services/remote-sign.service';
import { QrModalService } from '../../services/qr-modal.service';
import { MusigService } from '../../services/musig.service';

@Component({
  selector: 'app-multisig',
  templateUrl: './multisig.component.html',
  styleUrls: ['./multisig.component.css']
})
export class MultisigComponent implements OnInit {
  accountAdd = '';
  showAddBox = false;
  storedAccounts = [];
  accountAddStatus: number = null;
  createdMultisig = '';
  multisigAccount = '';
  multisigAccountStatus: number = null;
  unsignedBlock = '';
  unsignedStatus: number = null;
  showAdvancedOptions = false; // if displaying more info
  wasmErrors = ['No error', 'Internal error', 'Invalid parameter(s)', 'Invalid Participant Input'];

  constructor(
    private util: UtilService,
    private router: Router,
    private notificationService: NotificationService,
    private remoteSignService: RemoteSignService,
    private qrModalService: QrModalService,
    private musigService: MusigService,
  ) { }

  @ViewChild('accountAddFocus') _el: ElementRef;

  async ngOnInit() {
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

  setFocus() {
    this.showAddBox = true;
    // Auto set focus to the box (but must be rendered first!)
    setTimeout(() => { this._el.nativeElement.focus(); }, 200);
  }

  addAccount() {
    if (this.accountAddStatus !== 1) {
      this.notificationService.removeNotification('account-invalid');
      this.notificationService.sendWarning('Invalid nano address!', {identifier: 'account-invalid'});
      return;
    }
    if (this.storedAccounts.includes(this.accountAdd.replace('xrb_', 'nano_').toLocaleLowerCase())) {
      this.notificationService.removeNotification('account-added');
      this.notificationService.sendWarning('Account already added!', {identifier: 'account-added'});
      return;
    }
    this.storedAccounts.push(this.accountAdd.replace('xrb_', 'nano_').toLocaleLowerCase());
    this.accountAdd = '';
    this.accountAddStatus = null;
    this.showAddBox = false;
    this.createdMultisig = ''; // invalidate previous multisig to avoid mistakes
  }

  removeSelectedAccount(account) {
    this.storedAccounts.splice(this.storedAccounts.indexOf(account), 1);
    this.createdMultisig = ''; // invalidate previous multisig to avoid mistakes
  }

  generateMultisig() {
    this.createdMultisig = this.musigService.runAggregate(this.storedAccounts, null)?.multisig;
  }

  reset() {
    this.accountAdd = '';
    this.storedAccounts = [];
    this.accountAddStatus = null;
    this.createdMultisig = '';
    this.showAddBox = false;
  }

  validateAccountAdd() {
    if (this.accountAdd === '') {
      this.accountAddStatus = null;
      return false;
    }
    if (this.util.account.isValidAccount(this.accountAdd)) {
      this.accountAddStatus = 1;
      this.addAccount();
      return true;
    } else {
      this.accountAddStatus = 0;
      return false;
    }
  }

  validateMultisig() {
    if (this.multisigAccount === '') {
      this.multisigAccountStatus = null;
      return false;
    }
    if (this.util.account.isValidAccount(this.multisigAccount)) {
      this.multisigAccountStatus = 1;
      return true;
    } else {
      this.multisigAccountStatus = 0;
      return false;
    }
  }

  validateUnsigned(string) {
    if (string === '') {
      this.unsignedStatus = null;
      return false;
    }
    let url = null;
    if (string.startsWith('nanosign:')) {
      url = new URL(string);
    }
    if (url && this.remoteSignService.checkSignBlock(url.pathname)) {
      this.unsignedStatus = 1;
    } else {
      this.unsignedStatus = 0;
    }
  }

  navigateAccount() {
    if (this.validateMultisig()) {
      this.router.navigate(['account', this.multisigAccount], { queryParams: {sign: 1}});
    } else {
      this.notificationService.sendWarning('Invalid nano account!');
    }
  }

  navigateBlock(block) {
    let badScheme = false;

    if (block.startsWith('nanosign:') || block.startsWith('nanoprocess:')) {
      const url = new URL(block);
      if (url.protocol === 'nanosign:') {
        this.remoteSignService.navigateSignBlock(url);
      } else if (url.protocol === 'nanoprocess:') {
        this.remoteSignService.navigateProcessBlock(url);
      } else {
        badScheme = true;
      }
    } else {
      badScheme = true;
    }
    if (badScheme) {
      this.notificationService.sendWarning('Not a recognized block format!', { length: 5000 });
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'accountAdd':
          this.accountAdd = data.content;
          this.validateAccountAdd();
          break;
        case 'multisig':
          this.multisigAccount = data.content;
          this.validateMultisig();
          break;
      }
    }, () => {}
    );
  }
}
