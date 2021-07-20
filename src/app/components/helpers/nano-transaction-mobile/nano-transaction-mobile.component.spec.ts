import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NanoTransactionMobileComponent } from './nano-transaction-mobile.component';

describe('NanoTransactionMobileComponent', () => {
  let component: NanoTransactionMobileComponent;
  let fixture: ComponentFixture<NanoTransactionMobileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NanoTransactionMobileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NanoTransactionMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
