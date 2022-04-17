import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { QrGeneratorComponent } from './qr-generator.component';

describe('QrGeneratorComponent', () => {
  let component: QrGeneratorComponent;
  let fixture: ComponentFixture<QrGeneratorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ QrGeneratorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QrGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
