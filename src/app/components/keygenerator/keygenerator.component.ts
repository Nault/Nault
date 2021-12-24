import { Component, OnInit } from '@angular/core';
import {UtilService} from '../../services/util.service';
import * as bip39 from 'bip39';
import {NotificationService} from '../../services/notification.service';

@Component({
  selector: 'app-keygenerator',
  templateUrl: './keygenerator.component.html',
  styleUrls: ['./keygenerator.component.css']
})
export class KeygeneratorComponent implements OnInit {
  seed = '';
  mnemonic = '';
  privateKey = '';
  account = '';
  newWalletMnemonicLines = [];

  constructor(
    private util: UtilService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
  }

  generate() {
    // generate random bytes and create seed/mnemonic
    const seedBytes = this.util.account.generateSeedBytes();
    this.seed = this.util.hex.fromUint8(seedBytes).toUpperCase();
    this.mnemonic = bip39.entropyToMnemonic(this.seed);
    // derive private/public keys using index 0
    const keyBytes = this.util.account.generateAccountSecretKeyBytes(seedBytes, 0);
    const keyPair = this.util.account.generateAccountKeyPair(keyBytes);
    this.privateKey = this.util.hex.fromUint8(keyPair.secretKey).toUpperCase();
    this.account = this.util.account.getPublicAccountID(keyPair.publicKey);

    // Split the seed up so we can show 4 per line
    const words = this.mnemonic.split(' ');
    const lines = [
      words.slice(0, 4),
      words.slice(4, 8),
      words.slice(8, 12),
      words.slice(12, 16),
      words.slice(16, 20),
      words.slice(20, 24),
    ];
    this.newWalletMnemonicLines = lines;
  }

  copied() {
    this.notificationService.removeNotification('success-copied');
    this.notificationService.sendSuccess(`Successfully copied to clipboard!`, { identifier: 'success-copied' });
  }
}
