import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { VehicleCategory } from '../../models/mobility.models';
import { MobilityMapComponent } from '../mobility-map/mobility-map.component';
import { VehicleCardComponent } from '../vehicle-card/vehicle-card.component';

@Component({
  selector: 'app-ride-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, MobilityMapComponent, VehicleCardComponent],
  templateUrl: './ride-booking.component.html',
  styleUrl: './ride-booking.component.scss'
})
export class RideBookingComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public activeType: string = 'Passenger';
  public pickupLocation: string = 'MG Road Metro Station, Bengaluru';
  public dropLocation: string = 'Koramangala 5th Block, Bengaluru';
  public paymentMethod: string = 'UPI / Wallet';
  public couponCode: string = '';

  public vehicleCategories = signal<VehicleCategory[]>([]);
  public selectedCategory: VehicleCategory | null = null;

  ngOnInit(): void {
    this.mobilityService.loadCategories();
    const categories = this.mobilityService.categories();
    const passengerOnly = categories.filter(c => c.type === 'Passenger');
    this.vehicleCategories.set(passengerOnly.length > 0 ? passengerOnly : categories);
    if (passengerOnly.length > 0) this.selectedCategory = passengerOnly[0];
  }

  calculateFare(cat: VehicleCategory): number {
    return (cat.baseFare + 8.4 * cat.perKm + 24 * cat.perMin) * cat.dynamicMultiplier;
  }

  applyCoupon(): void {
    if (this.couponCode.toUpperCase() === 'FIRST50') {
      alert('🎉 Promo Coupon FIRST50 Applied! 50% Flat Discount added.');
    } else {
      alert('Invalid or Expired Coupon Code.');
    }
  }

  confirmRideBooking(): void {
    if (!this.selectedCategory) return;

    const validPaymentMethod = (this.paymentMethod === 'Cash to Driver' ? 'Cash' : 
                               (this.paymentMethod === 'Corporate Credit Card' ? 'Corporate Invoice' : 'UPI / Card')) as any;

    this.mobilityService.createBooking({
      serviceType: 'Ride Booking',
      customerName: 'Aarav Patel',
      customerPhone: '+91 98700 00111',
      pickupLocation: this.pickupLocation,
      dropLocation: this.dropLocation,
      vehicleCategory: this.selectedCategory.id,
      vehicleName: this.selectedCategory.name,
      distanceKm: 8.4,
      estimatedMinutes: 24,
      fare: this.calculateFare(this.selectedCategory),
      paymentMethod: validPaymentMethod
    }).subscribe(res => {
      alert(`🎉 Ride Booked Successfully!\nBooking ID: ${res.booking.id}\nDriver ${res.booking.driver.name} is en route in ${res.booking.driver.vehicle}.`);
    });
  }
}
