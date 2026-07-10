import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkforceRequests } from './workforce-requests';

describe('WorkforceRequests', () => {
  let component: WorkforceRequests;
  let fixture: ComponentFixture<WorkforceRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkforceRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkforceRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
