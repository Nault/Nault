import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NanoAccountIdComponent } from './nano-account-id.component';

describe('NanoAccountIdComponent', () => {
  let component: NanoAccountIdComponent;
  let fixture: ComponentFixture<NanoAccountIdComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NanoAccountIdComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NanoAccountIdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
