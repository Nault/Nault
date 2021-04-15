import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MultisigComponent } from './multisig.component';

describe('MultisigComponent', () => {
  let component: MultisigComponent;
  let fixture: ComponentFixture<MultisigComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MultisigComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultisigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
