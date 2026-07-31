import { ComponentFixture, TestBed } from '@angular/core';
import { RideBookingComponent } from './ride-booking.component';
import { provideHttpClient } from '@angular/common/http';

describe('RideBookingComponent', () => {
  let component: RideBookingComponent;
  let fixture: ComponentFixture<RideBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RideBookingComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(RideBookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create ride booking component', () => {
    expect(component).toBeTruthy();
  });
});
