import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {WelcomeComponent} from './welcome/welcome.component';
import {ConfigureWalletComponent} from './components/configure-wallet/configure-wallet.component';
import {AccountsComponent} from './components/accounts/accounts.component';
import {SendComponent} from './components/send/send.component';
import {AddressBookComponent} from './components/address-book/address-book.component';
import {ReceiveComponent} from './components/receive/receive.component';
import {ManageWalletComponent} from './components/manage-wallet/manage-wallet.component';
import {ConfigureAppComponent} from './components/configure-app/configure-app.component';
import {AccountDetailsComponent} from './components/account-details/account-details.component';
import {TransactionDetailsComponent} from './components/transaction-details/transaction-details.component';
import {ImportWalletComponent} from './components/import-wallet/import-wallet.component';
import { ImportAddressBookComponent } from './components/import-address-book/import-address-book.component';
import {RepresentativesComponent} from './components/representatives/representatives.component';
import {SweeperComponent} from './components/sweeper/sweeper.component';
import {QrScanComponent} from './components/qr-scan/qr-scan.component';
import {SignComponent} from './components/sign/sign.component';
import {RemoteSigningComponent} from './components/remote-signing/remote-signing.component';
import {ConverterComponent} from './components/converter/converter.component';
import {QrGeneratorComponent} from './components/qr-generator/qr-generator.component';
import { environment } from '../environments/environment';
import {ManageRepresentativesComponent} from './components/manage-representatives/manage-representatives.component';
import { MultisigComponent } from './components/multisig/multisig.component';
import { KeygeneratorComponent } from './components/keygenerator/keygenerator.component';

const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'accounts', component: AccountsComponent },
  { path: 'account/:account', component: AccountDetailsComponent },
  { path: 'address-book', component: AddressBookComponent },
  { path: 'configure-wallet', component: ConfigureWalletComponent },
  { path: 'configure-app', component: ConfigureAppComponent },
  { path: 'import-address-book', component: ImportAddressBookComponent },
  { path: 'import-wallet', component: ImportWalletComponent },
  { path: 'manage-wallet', component: ManageWalletComponent },
  { path: 'qr-scan', component: QrScanComponent },
  { path: 'send', component: SendComponent },
  { path: 'receive', component: ReceiveComponent },
  { path: 'representatives', component: RepresentativesComponent },
  { path: 'manage-representatives', component: ManageRepresentativesComponent },
  { path: 'transaction/:transaction', component: TransactionDetailsComponent },
  { path: 'sweeper', component: SweeperComponent },
  { path: 'sign', component: SignComponent },
  { path: 'remote-signing', component: RemoteSigningComponent },
  { path: 'multisig', component: MultisigComponent },
  { path: 'keygenerator', component: KeygeneratorComponent },
  { path: 'converter', component: ConverterComponent },
  { path: 'qr-generator', component: QrGeneratorComponent },
];

@NgModule({
  imports: [
    // On the desktop apps, use hashes so it works properly using only index.html
    RouterModule.forRoot(routes, { useHash: environment.desktop, relativeLinkResolution: 'legacy' }),
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }


