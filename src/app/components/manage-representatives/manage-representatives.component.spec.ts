import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRepresentativesComponent } from './manage-representatives.component';

describe('ManageRepresentativesComponent', () => {
  let component: ManageRepresentativesComponent;
  let fixture: ComponentFixture<ManageRepresentativesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageRepresentativesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageRepresentativesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
