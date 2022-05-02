import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ImportWalletComponent } from './import-wallet.component';

describe('ImportWalletComponent', () => {
  let component: ImportWalletComponent;
  let fixture: ComponentFixture<ImportWalletComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportWalletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportWalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
