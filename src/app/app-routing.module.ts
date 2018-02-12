import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import {WelcomeComponent} from "./welcome/welcome.component";
import {ConfigureWalletComponent} from "./components/configure-wallet/configure-wallet.component";
import {AccountsComponent} from "./components/accounts/accounts.component";
import {SendComponent} from "./components/send/send.component";
import {AddressBookComponent} from "./components/address-book/address-book.component";
import {ReceiveComponent} from "./components/receive/receive.component";
import {HistoryComponent} from "./components/history/history.component";
import {ManageWalletComponent} from "./components/manage-wallet/manage-wallet.component";
import {ConfigureAppComponent} from "./components/configure-app/configure-app.component";
import {AccountDetailsComponent} from "./components/account-details/account-details.component";

const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'accounts', component: AccountsComponent },
  { path: 'account/:account', component: AccountDetailsComponent },
  { path: 'address-book', component: AddressBookComponent },
  { path: 'configure-wallet', component: ConfigureWalletComponent },
  { path: 'configure-app', component: ConfigureAppComponent },
  { path: 'manage-wallet', component: ManageWalletComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'send', component: SendComponent },
  { path: 'receive', component: ReceiveComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }


