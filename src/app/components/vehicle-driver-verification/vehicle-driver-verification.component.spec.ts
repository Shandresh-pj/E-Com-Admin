import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleDriverVerificationComponent } from './vehicle-driver-verification.component';
import { provideHttpClient } from '@angular/common/http';

describe('VehicleDriverVerificationComponent', () => {
  let component: VehicleDriverVerificationComponent;
  let fixture: ComponentFixture<VehicleDriverVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleDriverVerificationComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleDriverVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create vehicle driver verification component', () => {
    expect(component).toBeTruthy();
  });
});
