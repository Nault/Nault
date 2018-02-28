import { TestBed, inject } from '@angular/core/testing';

import { PowService } from './pow.service';

describe('PowService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PowService]
    });
  });

  it('should be created', inject([PowService], (service: PowService) => {
    expect(service).toBeTruthy();
  }));
});
