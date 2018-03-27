import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportAddressBookComponent } from './import-address-book.component';

describe('ImportAddressBookComponent', () => {
  let component: ImportAddressBookComponent;
  let fixture: ComponentFixture<ImportAddressBookComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportAddressBookComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportAddressBookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
