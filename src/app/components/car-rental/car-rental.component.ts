import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { RentalCar } from '../../models/mobility.models';

export interface ExtendedRentalCar extends RentalCar {
  city?: string;
  fuelType?: 'Electric' | 'Petrol' | 'Diesel';
  locationHub?: string;
  rating?: number;
  tripsCount?: number;
  features?: string[];
  depositAmount?: number;
}

@Component({
  selector: 'app-car-rental',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './car-rental.component.html',
  styleUrl: './car-rental.component.scss'
})
export class CarRentalComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public selectedCategoryTab: 'Self Drive' | 'Chauffeur Driven' | 'Wedding & Luxury' = 'Self Drive';
  public selectedCity: string = 'All Cities';
  public pickupDateTime: string = '2026-08-01T10:00';
  public returnDateTime: string = '2026-08-03T10:00';
  public rentalDaysCount: number = 2;
  public rentalHoursCount: number = 48;

  public transmissionFilter: 'ALL' | 'Automatic' | 'Manual' = 'ALL';
  public fuelFilter: 'ALL' | 'Electric' | 'Petrol' | 'Diesel' = 'ALL';
  public doorstepDelivery: boolean = true;
  public doorstepAddress: string = 'Koramangala 4th Block, Bengaluru';
  public addInsuranceProtection: boolean = true;

  public selectedPackageId: string = 'PKG-24H';
  public selectedCarForBooking: ExtendedRentalCar | null = null;
  public bookingStep: number = 1;
  public riderName: string = 'Aarav Patel';
  public riderPhone: string = '+91 98765 43210';
  public drivingLicenseNo: string = 'DL-142026889201';

  public confirmedReservations: any[] = [];

  public rentalPackages: any[] = [];
  public fleetCatalog: ExtendedRentalCar[] = [];
  public filteredFleetList: ExtendedRentalCar[] = [];

  ngOnInit(): void {
    this.calculateRentalDuration();
    this.fetchCatalogFromApi();
  }

  fetchCatalogFromApi(): void {
    this.mobilityService.getRentalCatalog().subscribe(data => {
      if (data.rentals && data.rentals.length) {
        this.fleetCatalog = data.rentals;
      }
      if (data.packages && data.packages.length) {
        this.rentalPackages = data.packages;
      }
      this.filterFleet();
    });
  }

  filterFleet(): void {
    this.filteredFleetList = this.fleetCatalog.filter(car => {
      if (this.selectedCategoryTab === 'Self Drive' && car.type !== 'Self Drive') return false;
      if (this.selectedCategoryTab === 'Chauffeur Driven' && car.type !== 'Chauffeur Driven') return false;
      if (this.selectedCategoryTab === 'Wedding & Luxury' && car.category !== 'Luxury') return false;
      if (this.selectedCity !== 'All Cities' && car.city !== this.selectedCity) return false;
      if (this.transmissionFilter !== 'ALL' && car.transmission !== this.transmissionFilter) return false;
      if (this.fuelFilter !== 'ALL' && car.fuelType !== this.fuelFilter) return false;
      return true;
    });
  }

  calculateRentalDuration(): void {
    const start = new Date(this.pickupDateTime).getTime();
    const end = new Date(this.returnDateTime).getTime();
    const diffMs = Math.max(end - start, 3600000 * 24);
    this.rentalHoursCount = Math.round(diffMs / 3600000);
    this.rentalDaysCount = Math.max(Math.ceil(this.rentalHoursCount / 24), 1);
  }

  openBookingModal(car: ExtendedRentalCar): void {
    this.selectedCarForBooking = car;
    this.bookingStep = 1;
  }

  closeBookingModal(): void {
    this.selectedCarForBooking = null;
    this.bookingStep = 1;
  }

  calculateTotalRentalCost(): number {
    if (!this.selectedCarForBooking) return 0;
    let base = this.selectedCarForBooking.dailyRate * this.rentalDaysCount;
    let delivery = this.doorstepDelivery ? 250 : 0;
    let insurance = this.addInsuranceProtection ? (299 * this.rentalDaysCount) : 0;
    let tax = base * 0.05;
    return base + delivery + insurance + tax;
  }

  confirmRentalBooking(): void {
    if (!this.selectedCarForBooking) return;

    const totalCost = this.calculateTotalRentalCost();

    this.mobilityService.createBooking({
      serviceType: 'Car Rental',
      customerName: this.riderName,
      customerPhone: this.riderPhone,
      pickupLocation: this.doorstepDelivery ? this.doorstepAddress : 'Central Hub',
      dropLocation: this.doorstepDelivery ? this.doorstepAddress : 'Central Hub',
      vehicleCategory: this.selectedCarForBooking.category,
      vehicleName: this.selectedCarForBooking.title,
      distanceKm: this.rentalDaysCount * 100,
      estimatedMinutes: this.rentalDaysCount * 1440,
      fare: totalCost,
      paymentMethod: 'UPI / Card'
    }).subscribe(res => {
      const newRes = {
        id: res.booking.id,
        car: this.selectedCarForBooking,
        pickupTime: this.pickupDateTime.replace('T', ' '),
        returnTime: this.returnDateTime.replace('T', ' '),
        totalPaid: totalCost,
        handoverOtp: res.booking.otp || Math.floor(1000 + Math.random() * 9000)
      };

      this.confirmedReservations.unshift(newRes);
      alert(`🎉 Car Reservation Confirmed!\nBooking Ref: ${newRes.id}\nVehicle: ${this.selectedCarForBooking?.title}\nHandover OTP: ${newRes.handoverOtp}\nDoorstep delivery dispatched.`);
      this.closeBookingModal();
    });
  }
}
