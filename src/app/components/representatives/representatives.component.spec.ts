import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RepresentativesComponent } from './representatives.component';

describe('RepresentativesComponent', () => {
  let component: RepresentativesComponent;
  let fixture: ComponentFixture<RepresentativesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RepresentativesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RepresentativesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
