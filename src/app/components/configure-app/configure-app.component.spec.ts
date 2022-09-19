import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ConfigureAppComponent } from './configure-app.component';

describe('ConfigureAppComponent', () => {
  let component: ConfigureAppComponent;
  let fixture: ComponentFixture<ConfigureAppComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfigureAppComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfigureAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
