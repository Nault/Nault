import { Component, OnInit } from '@angular/core';
import {NotificationService} from '../../services/notification.service';
import {ActivatedRoute} from '@angular/router';
import {AddressBookService} from '../../services/address-book.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-import-address-book',
  templateUrl: './import-address-book.component.html',
  styleUrls: ['./import-address-book.component.css']
})
export class ImportAddressBookComponent implements OnInit {
  activePanel = 'error';

  validImportData = false;
  importData: any = null;

  conflictingEntries = 0;
  newEntries = 0;
  existingEntries = 0;
  hostname = '';

  constructor(
    private route: ActivatedRoute,
    private notifications: NotificationService,
    private addressBook: AddressBookService,
    private router: Router) { }

  ngOnInit() {
    const importData = this.route.snapshot.fragment;
    const queryData = this.route.snapshot.queryParams;
    if (!importData || !importData.length) {
      return this.importDataError(`No import data found.  Check your link and try again.`);
    }

    if ('hostname' in queryData) this.hostname = queryData.hostname;
    const decodedData = atob(importData);

    try {
      const importBlob = JSON.parse(decodedData);
      if (!importBlob || !importBlob.length) {
        return this.importDataError(`Bad import data.  Check your link and try again.`);
      }
      this.validImportData = true;
      this.importData = importBlob;
      this.activePanel = 'import';

      // Now, find conflicting accounts
      for (const entry of importBlob) {
        if (!entry.account || !entry.name) {
          continue; // Data missing?
        }
        entry.originalName = this.addressBook.getAccountName(entry.account);
        if (!entry.originalName) {
          this.newEntries++;
        } else if (entry.originalName === entry.name) {
          this.existingEntries++;
        } else {
          this.conflictingEntries++;
        }
      }

    } catch (err) {
      return this.importDataError(`Unable to decode import data.  Check your link and try again.`);
    }
  }

  async confirmImport() {
    // Go through our address book and see which ones need to be saved
    let importedCount = 0;
    for (const entry of this.importData) {
      if (!entry.originalName) {
        await this.addressBook.saveAddress(entry.account, entry.name);
        importedCount++;
      } else if (entry.originalName && entry.originalName !== entry.name) {
        await this.addressBook.saveAddress(entry.account, entry.name);
        importedCount++;
      }
    }

    this.router.navigate(['address-book']);
    this.notifications.sendSuccess(`Successfully imported ${importedCount} address book entries`);
  }

  importDataError(message) {
    this.activePanel = 'error';
    return this.notifications.sendError(message);
  }

}
