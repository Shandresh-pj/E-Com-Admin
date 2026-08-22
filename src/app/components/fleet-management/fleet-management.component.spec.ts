import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FleetManagementComponent } from './fleet-management.component';
import { provideHttpClient } from '@angular/common/http';

describe('FleetManagementComponent', () => {
  let component: FleetManagementComponent;
  let fixture: ComponentFixture<FleetManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetManagementComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(FleetManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create fleet management component', () => {
    expect(component).toBeTruthy();
  });
});
