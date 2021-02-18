import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import {HttpClientModule, HttpClient} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {WelcomeComponent} from './welcome/welcome.component';
import {AppRoutingModule} from './app-routing.module';
import {UtilService} from './services/util.service';
import {WalletService} from './services/wallet.service';
import {ConfigureWalletComponent} from './components/configure-wallet/configure-wallet.component';
import {NotificationService} from './services/notification.service';
import {NotificationsComponent} from './components/notifications/notifications.component';
import {RaiPipe} from './pipes/rai.pipe';
import {AccountsComponent} from './components/accounts/accounts.component';
import {ApiService} from './services/api.service';
import {AddressBookService} from './services/address-book.service';
import {SendComponent} from './components/send/send.component';
import {SqueezePipe} from './pipes/squeeze.pipe';
import {ModalService} from './services/modal.service';
import {AddressBookComponent} from './components/address-book/address-book.component';
import {ClipboardModule} from 'ngx-clipboard';
import {ReceiveComponent} from './components/receive/receive.component';
import {WalletWidgetComponent} from './components/wallet-widget/wallet-widget.component';
import {ManageWalletComponent} from './components/manage-wallet/manage-wallet.component';
import {WorkPoolService} from './services/work-pool.service';
import {ConfigureAppComponent} from './components/configure-app/configure-app.component';
import {AppSettingsService} from './services/app-settings.service';
import {WebsocketService} from './services/websocket.service';
import {NanoBlockService} from './services/nano-block.service';
import { AccountDetailsComponent } from './components/account-details/account-details.component';
import { TransactionDetailsComponent } from './components/transaction-details/transaction-details.component';
import {PriceService} from './services/price.service';
import { FiatPipe } from './pipes/fiat.pipe';
import { AmountSplitPipe } from './pipes/amount-split.pipe';
import { ImportWalletComponent } from './components/import-wallet/import-wallet.component';
import { NanoAccountIdComponent } from './components/helpers/nano-account-id/nano-account-id.component';
import {PowService} from './services/pow.service';
import { ImportAddressBookComponent } from './components/import-address-book/import-address-book.component';
import { CurrencySymbolPipe } from './pipes/currency-symbol.pipe';
import { RepresentativesComponent } from './components/representatives/representatives.component';
import {RepresentativeService} from './services/representative.service';
import {ManageRepresentativesComponent} from './components/manage-representatives/manage-representatives.component';
import {NodeService} from './services/node.service';
import {LedgerService} from './services/ledger.service';
import {DesktopService} from './services/desktop.service';
import { AccountPipe } from './pipes/account.pipe';
import { ChangeRepWidgetComponent } from './components/change-rep-widget/change-rep-widget.component';
import { SweeperComponent } from './components/sweeper/sweeper.component';
import { QrScanComponent } from './components/qr-scan/qr-scan.component';
import {SignComponent} from './components/sign/sign.component';
import {RemoteSigningComponent} from './components/remote-signing/remote-signing.component';
import {RemoteSignService} from './services/remote-sign.service';
import { QrModalComponent } from './components/qr-modal/qr-modal.component';
import { QrModalService } from './services/qr-modal.service';
import { NgbModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PasswordStrengthMeterModule } from 'angular-password-strength-meter';

// QR code module
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { NinjaService } from './services';
import { ConverterComponent } from './components/converter/converter.component';
import { QrGeneratorComponent } from './components/qr-generator/qr-generator.component';

// ngx-translate
import {TranslateModule, TranslateLoader} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';

// AoT requires an exported function for factories
export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    ConfigureWalletComponent,
    NotificationsComponent,
    RaiPipe,
    SqueezePipe,
    AccountsComponent,
    SendComponent,
    AddressBookComponent,
    ReceiveComponent,
    WalletWidgetComponent,
    ManageWalletComponent,
    ConfigureAppComponent,
    AccountDetailsComponent,
    TransactionDetailsComponent,
    FiatPipe,
    AmountSplitPipe,
    ImportWalletComponent,
    NanoAccountIdComponent,
    ImportAddressBookComponent,
    CurrencySymbolPipe,
    RepresentativesComponent,
    ManageRepresentativesComponent,
    AccountPipe,
    ChangeRepWidgetComponent,
    SweeperComponent,
    QrScanComponent,
    SignComponent,
    RemoteSigningComponent,
    QrModalComponent,
    ConverterComponent,
    QrGeneratorComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    ClipboardModule,
    ZXingScannerModule,
    NgbModule,
    PasswordStrengthMeterModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: (createTranslateLoader),
          deps: [HttpClient]
      }
    }),
  ],
  providers: [
    UtilService,
    WalletService,
    NotificationService,
    ApiService,
    AddressBookService,
    ModalService,
    WorkPoolService,
    AppSettingsService,
    WebsocketService,
    NanoBlockService,
    PriceService,
    PowService,
    RepresentativeService,
    NodeService,
    LedgerService,
    DesktopService,
    RemoteSignService,
    NinjaService,
    NgbActiveModal,
    QrModalService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
