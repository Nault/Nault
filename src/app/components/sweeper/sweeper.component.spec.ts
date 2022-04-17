import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SweeperComponent } from './sweeper.component';

describe('SweeperComponent', () => {
  let component: SweeperComponent;
  let fixture: ComponentFixture<SweeperComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SweeperComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SweeperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
