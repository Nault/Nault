import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ConfigureWalletComponent } from './configure-wallet.component';

describe('ConfigureWalletComponent', () => {
  let component: ConfigureWalletComponent;
  let fixture: ComponentFixture<ConfigureWalletComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigureWalletComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigureWalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
