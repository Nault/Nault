import { TestBed, inject } from '@angular/core/testing';

import { RemoteSignService } from './remote-sign.service';

describe('RemoteSignService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RemoteSignService]
    });
  });

  it('should be created', inject([RemoteSignService], (service: RemoteSignService) => {
    expect(service).toBeTruthy();
  }));
});
