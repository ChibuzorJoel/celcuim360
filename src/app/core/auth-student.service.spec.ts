import { TestBed } from '@angular/core/testing';

import { AuthStudentService } from './auth-student.service';

describe('AuthStudentService', () => {
  let service: AuthStudentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthStudentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
