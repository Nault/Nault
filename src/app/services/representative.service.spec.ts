import { TestBed, inject } from '@angular/core/testing';

import { RepresentativeService } from './representative.service';

describe('RepresentativeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RepresentativeService]
    });
  });

  it('should be created', inject([RepresentativeService], (service: RepresentativeService) => {
    expect(service).toBeTruthy();
  }));
});
