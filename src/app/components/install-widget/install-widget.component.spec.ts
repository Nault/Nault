import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { InstallWidgetComponent } from './install-widget.component';

describe('InstallWidgetComponent', () => {
  let component: InstallWidgetComponent;
  let fixture: ComponentFixture<InstallWidgetComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ InstallWidgetComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstallWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
