import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WalletWidgetComponent } from './wallet-widget.component';

describe('WalletWidgetComponent', () => {
  let component: WalletWidgetComponent;
  let fixture: ComponentFixture<WalletWidgetComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ WalletWidgetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WalletWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
