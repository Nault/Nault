import { Component } from '@angular/core';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-cloud-api-docs',
  templateUrl: './cloud-api-docs.component.html',
  styleUrls: ['./cloud-api-docs.component.css']
})
export class CloudApiDocsComponent {
  apiBase = environment.cloudWalletApi;
  createKeyExample = '';
  profileExample = '';
  walletExample = '';
  createAccountExample = '';
  receiveExample = '';
  sendExample = '';
  changeRepExample = '';
  responseExample = `{
  "hasWallet": true,
  "encryptedWallet": "{\\"type\\":\\"seed\\",\\"seed\\":\\"U2FsdGVkX...\\"}",
  "walletType": "seed",
  "updatedAt": "2026-03-02 16:00:00"
}`;

  constructor() {
    this.createKeyExample = `curl -X POST ${this.apiBase}/api/api-keys \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"bot-key"}'`;

    this.profileExample = `curl ${this.apiBase}/api/programmatic/profile \\
  -H "x-api-key: npk_..."`;

    this.walletExample = `curl ${this.apiBase}/api/programmatic/wallet \\
  -H "x-api-key: npk_..."`;

    this.createAccountExample = `curl -X POST ${this.apiBase}/api/programmatic/accounts/create \\
  -H "x-api-key: npk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"walletPassword":"your-wallet-password"}'`;

    this.receiveExample = `curl -X POST ${this.apiBase}/api/programmatic/receive \\
  -H "x-api-key: npk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"walletPassword":"your-wallet-password","accountIndex":0,"maxReceives":20}'`;

    this.sendExample = `curl -X POST ${this.apiBase}/api/programmatic/send \\
  -H "x-api-key: npk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"walletPassword":"your-wallet-password","to":"@development","amountNano":"0.001"}'`;

    this.changeRepExample = `curl -X POST ${this.apiBase}/api/programmatic/change-representative \\
  -H "x-api-key: npk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"walletPassword":"your-wallet-password","representative":"nano_1wenanoqm7xbypou7x3nue1isaeddamjdnc3z99tekjbfezdbq8fmb659o7t"}'`;
  }
}
