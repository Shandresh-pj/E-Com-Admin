import { Component, OnInit, inject, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { VehicleCategory, ActiveBooking } from '../../models/mobility.models';
import { MobilityMapComponent } from '../mobility-map/mobility-map.component';
import { VehicleCardComponent } from '../vehicle-card/vehicle-card.component';
import { GoogleMapsService } from '../../services/google-maps.service';

@Component({
  selector: 'app-parcel-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule, MobilityMapComponent, VehicleCardComponent],
  templateUrl: './parcel-logistics.component.html',
  styleUrl: './parcel-logistics.component.scss'
})
export class ParcelLogisticsComponent implements OnInit, AfterViewInit {
  private mobilityService = inject(MobilityService);
  private googleMapsService = inject(GoogleMapsService);

  @ViewChild('pickupInput') pickupInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('dropInput') dropInputRef!: ElementRef<HTMLInputElement>;

  public activeCategoryTab: string = 'Mini Truck';
  public pickupLocation: string = '';
  public dropLocation: string = '';
  public selectedGoodsType: string = 'House Moving & Furniture';
  public addHelpers: boolean = true;
  public receiverPhone: string = '';

  public logisticsCategories = signal<VehicleCategory[]>([]);
  public selectedCategory: VehicleCategory | null = null;
  public activeDispatches = signal<ActiveBooking[]>([]);
  public isSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    this.mobilityService.loadCategories();
    const all = this.mobilityService.categories();
    const logisticsOnly = all.filter((c: VehicleCategory) => c.type === 'Logistics');
    this.logisticsCategories.set(logisticsOnly.length > 0 ? logisticsOnly : all);
    if (logisticsOnly.length > 0) this.selectedCategory = logisticsOnly[0];

    this.fetchActiveDispatches();
  }

  ngAfterViewInit(): void {
    this.initGoogleAutocomplete();
  }

  fetchActiveDispatches(): void {
    this.mobilityService.loadActiveBookings().subscribe((bookings: ActiveBooking[]) => {
      this.activeDispatches.set(bookings.filter((b: ActiveBooking) => b.serviceType === 'Parcel Logistics' || b.status === 'SEARCHING' || (b.status as string) === 'IN_TRANSIT'));
    });
  }

  private initGoogleAutocomplete(): void {
    if (this.pickupInputRef?.nativeElement) {
      this.googleMapsService.attachPlaceAutocomplete(this.pickupInputRef.nativeElement, (place: any) => {
        if (place && place.formatted_address) {
          this.pickupLocation = place.formatted_address;
        }
      });
    }
    if (this.dropInputRef?.nativeElement) {
      this.googleMapsService.attachPlaceAutocomplete(this.dropInputRef.nativeElement, (place: any) => {
        if (place && place.formatted_address) {
          this.dropLocation = place.formatted_address;
        }
      });
    }
  }

  createParcelDispatch(): void {
    if (!this.pickupLocation.trim() || !this.dropLocation.trim()) {
      alert('Please enter pickup and delivery destination addresses.');
      return;
    }
    if (!this.selectedCategory) return;

    this.isSubmitting.set(true);

    this.mobilityService.createBooking({
      serviceType: 'Parcel Logistics',
      customerName: 'TechCorp Enterprise Logistics',
      customerPhone: this.receiverPhone || '+91 98765 43210',
      pickupLocation: this.pickupLocation,
      dropLocation: this.dropLocation,
      vehicleCategory: this.selectedCategory.id,
      vehicleName: this.selectedCategory.name,
      distanceKm: 18.5,
      estimatedMinutes: 42,
      fare: this.selectedCategory.baseFare + 18.5 * this.selectedCategory.perKm + (this.addHelpers ? 350 : 0),
      paymentMethod: 'Corporate Invoice'
    }).subscribe((res: any) => {
      this.isSubmitting.set(false);
      this.fetchActiveDispatches();
      alert(`🎉 Consignment Booking Successful!\nBooking ID: ${res.booking.id}\nDriver Assigned: ${res.booking.driver.name} (${res.booking.driver.vehicle})\nHandover OTP: ${Math.floor(1000 + Math.random() * 9000)}`);
      this.pickupLocation = '';
      this.dropLocation = '';
      this.receiverPhone = '';
    });
  }
}
