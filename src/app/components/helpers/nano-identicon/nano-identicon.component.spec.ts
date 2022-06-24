import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NanoIdenticonComponent } from './nano-identicon.component';

describe('NanoIdenticonComponent', () => {
  let component: NanoIdenticonComponent;
  let fixture: ComponentFixture<NanoIdenticonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ NanoIdenticonComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NanoIdenticonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
