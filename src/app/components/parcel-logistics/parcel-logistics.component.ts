import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { VehicleCategory } from '../../models/mobility.models';
import { MobilityMapComponent } from '../mobility-map/mobility-map.component';
import { VehicleCardComponent } from '../vehicle-card/vehicle-card.component';

@Component({
  selector: 'app-parcel-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule, MobilityMapComponent, VehicleCardComponent],
  templateUrl: './parcel-logistics.component.html',
  styleUrl: './parcel-logistics.component.scss'
})
export class ParcelLogisticsComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public activeCategoryTab: string = 'Mini Truck';
  public pickupLocation: string = 'Whitefield Industrial Area, Hub 4';
  public dropLocation: string = 'Electronic City Phase 1, Gate 2';
  public selectedGoodsType: string = 'House Moving & Furniture';
  public addHelpers: boolean = true;
  public receiverPhone: string = '+91 99887 76655';

  public logisticsCategories = signal<VehicleCategory[]>([]);
  public selectedCategory: VehicleCategory | null = null;

  ngOnInit(): void {
    this.mobilityService.loadCategories();
    const all = this.mobilityService.categories();
    const logisticsOnly = all.filter(c => c.type === 'Logistics');
    this.logisticsCategories.set(logisticsOnly.length > 0 ? logisticsOnly : all);
    if (logisticsOnly.length > 0) this.selectedCategory = logisticsOnly[0];
  }

  createParcelDispatch(): void {
    if (!this.selectedCategory) return;

    this.mobilityService.createBooking({
      serviceType: 'Parcel Logistics',
      customerName: 'TechCorp Enterprise Logistics',
      customerPhone: this.receiverPhone,
      pickupLocation: this.pickupLocation,
      dropLocation: this.dropLocation,
      vehicleCategory: this.selectedCategory.id,
      vehicleName: this.selectedCategory.name,
      distanceKm: 22.4,
      estimatedMinutes: 48,
      fare: this.selectedCategory.baseFare + 22.4 * this.selectedCategory.perKm + (this.addHelpers ? 350 : 0),
      paymentMethod: 'Corporate Invoice'
    }).subscribe(res => {
      alert(`🎉 Consignment Booking Successful!\nBooking ID: ${res.booking.id}\nDriver Assigned: ${res.booking.driver.name} (${res.booking.driver.vehicle})\nHandover OTP: ${Math.floor(1000 + Math.random() * 9000)}`);
    });
  }
}
