import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigureWalletComponent } from './configure-wallet.component';

describe('ConfigureWalletComponent', () => {
  let component: ConfigureWalletComponent;
  let fixture: ComponentFixture<ConfigureWalletComponent>;

  beforeEach(async(() => {
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
