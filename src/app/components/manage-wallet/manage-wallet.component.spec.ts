import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ManageWalletComponent } from './manage-wallet.component';

describe('ManageWalletComponent', () => {
  let component: ManageWalletComponent;
  let fixture: ComponentFixture<ManageWalletComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageWalletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageWalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
