import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import {WelcomeComponent} from "./welcome/welcome.component";
import {ConfigureWalletComponent} from "./components/configure-wallet/configure-wallet.component";
import {AccountsComponent} from "./components/accounts/accounts.component";
import {SendComponent} from "./components/send/send.component";
import {AddressBookComponent} from "./components/address-book/address-book.component";
import {ReceiveComponent} from "./components/receive/receive.component";
import {ManageWalletComponent} from "./components/manage-wallet/manage-wallet.component";
import {ConfigureAppComponent} from "./components/configure-app/configure-app.component";
import {AccountDetailsComponent} from "./components/account-details/account-details.component";
import {TransactionDetailsComponent} from "./components/transaction-details/transaction-details.component";
import {ImportWalletComponent} from "./components/import-wallet/import-wallet.component";
import { ImportAddressBookComponent } from './components/import-address-book/import-address-book.component';
import {RepresentativesComponent} from "./components/representatives/representatives.component";

import { environment } from '../environments/environment';
import {ManageRepresentativesComponent} from "./components/manage-representatives/manage-representatives.component";

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
  { path: 'send', component: SendComponent },
  { path: 'receive', component: ReceiveComponent },
  { path: 'representatives', component: RepresentativesComponent },
  { path: 'manage-representatives', component: ManageRepresentativesComponent },
  { path: 'transaction/:transaction', component: TransactionDetailsComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { useHash: environment.desktop }), // On the desktop apps, use hashes so it works properly using only index.html
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }


