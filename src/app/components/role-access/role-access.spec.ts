import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleAccess } from './role-access';

describe('RoleAccess', () => {
  let component: RoleAccess;
  let fixture: ComponentFixture<RoleAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleAccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleAccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
