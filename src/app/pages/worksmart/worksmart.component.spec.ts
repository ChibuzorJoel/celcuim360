import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorksmartComponent } from './worksmart.component';

describe('WorksmartComponent', () => {
  let component: WorksmartComponent;
  let fixture: ComponentFixture<WorksmartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorksmartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorksmartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
