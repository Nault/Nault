import { TestBed } from '@angular/core/testing';

import { QrModalService } from './qr-modal.service';

describe('QrModalService', () => {
  let service: QrModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
