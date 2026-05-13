import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCohortsComponent } from './admin-cohorts.component';

describe('AdminCohortsComponent', () => {
  let component: AdminCohortsComponent;
  let fixture: ComponentFixture<AdminCohortsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminCohortsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminCohortsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
