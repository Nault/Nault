import { Component, OnInit } from '@angular/core';
import {UtilService} from '../../services/util.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { RemoteSignService } from '../../services/remote-sign.service';
import { QrModalService } from '../../services/qr-modal.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
const base32 = window['base32'];

@Component({
  selector: 'app-multisig',
  templateUrl: './multisig.component.html',
  styleUrls: ['./multisig.component.less']
})
export class MultisigComponent implements OnInit {
  // The multisig wasm library can be validated by running build-or-validate_musig_wasm.sh
  private wasmURL = '../../../assets/lib/musig-nano/musig_nano.wasm.b64';

  wasm = null;
  accountAdd = '';
  inputAccountData = '';
  accountAddStatus: number = null;
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
    private http: HttpClient,
  ) {
    // Read the wasm file for multisig
    this.getWASM().subscribe(data => {
      const wasmString = atob(data);
      const wasmBytes = new Uint8Array(wasmString.length);
      for (let i = 0; i < wasmString.length; i++) {
        wasmBytes[i] = wasmString.charCodeAt(i);
      }

      const imports = {
        wasi_snapshot_preview1: {
          fd_write: (fd, iovs, errno, nwritten) => {
            console.error('fd_write called: unimplemented');
            return 0;
          },
          proc_exit: () => {
            console.error('proc_exit called: unimplemented');
            return 0;
          },
          environ_sizes_get: () => {
            console.error('environ_sizes_get called: unimplemented');
            return 0;
          },
          environ_get: () => {
            console.error('environ_get called: unimplemented');
            return 0;
          },
          random_get: (ptr, len) => {
            crypto.getRandomValues(new Uint8Array(this.wasm.memory.buffer, ptr, len));
            return 0;
          }
        },
        wasi_unstable: {
          random_get: (ptr, len) => {
            crypto.getRandomValues(new Uint8Array(this.wasm.memory.buffer, ptr, len));
            return 0;
          }
        },
      };
      WebAssembly.instantiate(wasmBytes, imports).then(w => {
        this.wasm = w.instance.exports;
      }).catch(console.error);
    });
  }

  async ngOnInit() {
  }

  // Load multisig rust library from local file via http
  getWASM(): Observable<any> {
    return this.http.get(this.wasmURL, {headers: new HttpHeaders({
      'Accept': 'text/html, application/xhtml+xml, */*',
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    responseType: 'text'});
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }

  addAccount() {
    if (this.accountAddStatus !== 1) {
      this.notificationService.sendWarning('Invalid Nano address!');
      return;
    }
    if (this.inputAccountData.includes(this.accountAdd.replace('xrb_', 'nano_'))) {
      this.notificationService.sendWarning('Account already added!');
      return;
    }
    this.inputAccountData = this.inputAccountData + this.accountAdd.replace('xrb_', 'nano_') + '\n',
    this.accountAdd = '';
    this.accountAddStatus = null;
  }

  generateMultisig() {
    const addresses = this.inputAccountData.trim().split('\n');
    if (addresses.length > 1) {
      this.alertError(this.aggregate.bind(this)).bind(this)();
    } else {
      this.notificationService.sendWarning('Must have at least 2 participating addresses!');
    }
  }

  alertError(f) {
    return function () {
      try {
        f();
      } catch (err) {
        console.error(err.toString());
        this.notificationService.sendError(err.toString(), {length: 6000});
      }
    };
  }

  copyToWasm(bytes, ptr = null) {
    if (!ptr) {
      ptr = this.wasm.musig_malloc(bytes.length);
    }
    const buf = new Uint8Array(this.wasm.memory.buffer, ptr, bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      buf[i] = bytes[i];
    }
    return ptr;
  }
  copyFromWasm(ptr, length) {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = this.wasm.memory.buffer[ptr + i];
    }
    return out;
  }

  wasmError(errCode) {
    throw new Error('Multisig error ' + errCode + ': ' + this.wasmErrors[errCode]);
  }

  aggregate() {
    let addresses = [];
    addresses = this.inputAccountData.trim().split('\n');
    if (addresses.length < 2) {
      throw new Error('This requires at least 2 newline-separated addresses');
    }
    const pubkeys = [];
    for (let address of addresses) {
      address = address.trim();
      if (!address.startsWith('xrb_') && !address.startsWith('nano_')) {
        throw new Error('Nano addresses must start with xrb_ or nano_');
      }
      address = address.split('_', 2)[1];
      try {
        const bytes = base32.decode(address);
        if (bytes.length !== 37) {
          throw new Error('Wrong nano address length');
        }
        const pubkey = bytes.subarray(0, 32);
        const checksum_ = this.util.account.getAccountChecksum(pubkey);
        if (!this.util.array.equalArrays(bytes.subarray(32), checksum_)) {
          throw new Error('Invalid nano address checksum');
        }
        pubkeys.push(pubkey);
      } catch (err_) {
          console.error(err_.toString());
          throw new Error('Invalid nano address (bad character?)');
      }
    }
    const pubkeyPtrs = this.wasm.musig_malloc(pubkeys.length * 4);
    const pubkeyPtrsBuf = new Uint32Array(this.wasm.memory.buffer, pubkeyPtrs, pubkeys.length);
    for (let i = 0; i < pubkeys.length; i++) {
      pubkeyPtrsBuf[i] = this.copyToWasm(pubkeys[i]);
    }
    const outPtr = this.wasm.musig_malloc(33);
    const outBuf = new Uint8Array(this.wasm.memory.buffer, outPtr, 33);
    outBuf[0] = 0;
    this.wasm.musig_aggregate_public_keys(pubkeyPtrs, pubkeys.length, outPtr, outPtr + 1);
    for (let i = 0; i < pubkeyPtrsBuf.length; i++) {
      this.wasm.musig_free(pubkeyPtrsBuf[i]);
    }
    this.wasm.musig_free(pubkeyPtrs);
    const err = outBuf[0];
    if (err !== 0) {
      this.wasm.musig_free(outPtr);
        throw this.wasmError(err);
    }
    const aggPubkey = outBuf.subarray(1).slice();
    const checksum = this.util.account.getAccountChecksum(aggPubkey);
    const fullAddress = new Uint8Array(37);
    for (let i = 0; i < 32; i++) {
      fullAddress[i] = aggPubkey[i];
    }
    for (let i = 0; i < 5; i++) {
      fullAddress[32 + i] = checksum[i];
    }
    const fullAddressFinal = 'nano_' + base32.encode(fullAddress);
    this.multisigAccount = fullAddressFinal;
    console.log('Multisig Account: ' + fullAddressFinal);
    this.wasm.musig_free(outPtr);
    return aggPubkey;
  }

  validateAccountAdd() {
    if (this.accountAdd === '') {
      this.accountAddStatus = null;
      return false;
    }
    if (this.util.account.isValidAccount(this.accountAdd)) {
      this.accountAddStatus = 1;
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
      this.notificationService.sendWarning('Invalid Nano account!');
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
