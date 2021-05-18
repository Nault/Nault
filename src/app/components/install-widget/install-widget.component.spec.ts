import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InstallWidgetComponent } from './install-widget.component';

describe('InstallWidgetComponent', () => {
  let component: InstallWidgetComponent;
  let fixture: ComponentFixture<InstallWidgetComponent>;

  beforeEach(async(() => {
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
