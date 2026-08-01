import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { RazorpayService } from '../../services/razorpay.service';
import { RentalCar } from '../../models/mobility.models';

export type ExtendedRentalCar = RentalCar;

@Component({
  selector: 'app-car-rental',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './car-rental.component.html',
  styleUrl: './car-rental.component.scss'
})
export class CarRentalComponent implements OnInit {
  public mobilityService = inject(MobilityService);
  public razorpayService = inject(RazorpayService);

  // View Mode: Marketplace for Customers vs Fleet Admin Management
  public activeViewTab: 'MARKETPLACE' | 'FLEET_ADMIN' = 'MARKETPLACE';

  // Filters & State
  public selectedCategoryTab: 'Self Drive' | 'Chauffeur Driven' | 'Wedding & Luxury' = 'Self Drive';
  public selectedCity: string = 'All Cities';
  public pickupDateTime: string = '2026-08-01T10:00';
  public returnDateTime: string = '2026-08-03T10:00';
  public rentalDaysCount: number = 2;
  public rentalHoursCount: number = 48;

  public transmissionFilter: 'ALL' | 'Automatic' | 'Manual' = 'ALL';
  public fuelFilter: 'ALL' | 'Electric' | 'Petrol' | 'Diesel' = 'ALL';
  public searchQuery: string = '';
  public doorstepDelivery: boolean = true;
  public doorstepAddress: string = 'Koramangala 4th Block, Bengaluru';
  public addInsuranceProtection: boolean = true;

  public selectedPackageId: string = 'PKG-24H';
  public selectedCarForBooking: ExtendedRentalCar | null = null;
  public bookingStep: number = 1;
  public riderName: string = '';
  public riderPhone: string = '';
  public drivingLicenseNo: string = '';

  public confirmedReservations: any[] = [];
  public rentalPackages: any[] = [];
  public fleetCatalog: ExtendedRentalCar[] = [];
  public filteredFleetList: ExtendedRentalCar[] = [];

  // Admin Fleet CRUD Modal State
  public isCarModalOpen: boolean = false;
  public isEditing: boolean = false;
  public editingCarId: string | null = null;

  // Form Fields for Add / Edit Car
  public carForm = {
    title: '',
    category: 'SUV' as 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Van/Bus' | 'EV',
    type: 'Self Drive' as 'Self Drive' | 'Chauffeur Driven',
    transmission: 'Automatic' as 'Automatic' | 'Manual',
    fuelType: 'Petrol' as 'Electric' | 'Petrol' | 'Diesel',
    dailyRate: 2400,
    hourlyRate: 180,
    seating: 5,
    city: 'Bengaluru',
    locationHub: 'Indiranagar Hub',
    depositAmount: 1500,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80',
    images: [] as string[],
    status: 'Available' as 'Available' | 'Reserved' | 'Rented' | 'Under Service',
    features: 'Unlimited KM, GPS Tracker, Full Tank, Bluetooth, EV Fast Charge'
  };

  // Image Upload Handlers
  onSingleImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imgUrl = e.target.result;
        this.carForm.image = imgUrl;
        if (!this.carForm.images.includes(imgUrl)) {
          this.carForm.images.unshift(imgUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onMultipleImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      Array.from(input.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const imgUrl = e.target.result;
          if (!this.carForm.images.includes(imgUrl)) {
            this.carForm.images.push(imgUrl);
          }
          if (!this.carForm.image) {
            this.carForm.image = imgUrl;
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeGalleryImage(index: number): void {
    const removed = this.carForm.images.splice(index, 1);
    if (removed[0] === this.carForm.image && this.carForm.images.length > 0) {
      this.carForm.image = this.carForm.images[0];
    }
  }

  setPrimaryImage(url: string): void {
    this.carForm.image = url;
  }

  ngOnInit(): void {
    this.calculateRentalDuration();
    this.fetchCatalogFromApi();
  }

  fetchCatalogFromApi(): void {
    this.mobilityService.getRentalCatalog().subscribe(data => {
      if (data && data.rentals && Array.isArray(data.rentals)) {
        this.fleetCatalog = data.rentals.map(car => ({
          ...car,
          city: car.city || '',
          fuelType: car.fuelType || (car.isEV ? 'Electric' : 'Petrol'),
          locationHub: car.locationHub || 'Central Hub',
          rating: car.rating || 5.0,
          tripsCount: car.tripsCount || 0,
          features: car.features || [],
          depositAmount: car.depositAmount !== undefined ? car.depositAmount : 0,
          status: car.status || 'Available',
          images: car.images && car.images.length ? car.images : [car.image]
        }));
      } else {
        this.fleetCatalog = [];
      }

      if (data && data.packages && Array.isArray(data.packages)) {
        this.rentalPackages = data.packages;
      } else {
        this.rentalPackages = [];
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
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        return car.title.toLowerCase().includes(q) || (car.category && car.category.toLowerCase().includes(q));
      }
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

  // ── Customer Booking Modal ────────────────────────────────────────────────
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
    return Math.round(base + delivery + insurance + tax);
  }

  async confirmRentalBooking(): Promise<void> {
    if (!this.selectedCarForBooking) return;
    const totalCost = this.calculateTotalRentalCost();

    try {
      // Trigger Razorpay Checkout Modal
      const rzpResp = await this.razorpayService.openCheckout({
        key: 'rzp_test_TE4sr2G8bmm7c3',
        amount: totalCost * 100,
        currency: 'INR',
        name: 'Spike Car Rental Reservation',
        description: `Rental for ${this.selectedCarForBooking.title} (${this.rentalDaysCount} Days)`,
        order_id: `order_car_${Date.now()}`,
        prefill: {
          name: this.riderName,
          email: 'aarav.patel@example.com',
          contact: this.riderPhone
        },
        theme: { color: '#10b981' }
      });

      this.executeCarReservation(totalCost, rzpResp?.razorpay_payment_id || 'PAY-ONLINE-DIRECT');
    } catch {
      // If Razorpay modal is dismissed or offline, allow fallback instant confirmation
      this.executeCarReservation(totalCost, 'PAY-UPON-HANDOVER');
    }
  }

  private executeCarReservation(totalCost: number, paymentRef: string): void {
    if (!this.selectedCarForBooking) return;

    this.mobilityService.createBooking({
      serviceType: 'Car Rental',
      customerName: this.riderName,
      customerPhone: this.riderPhone,
      pickupLocation: this.doorstepDelivery ? this.doorstepAddress : (this.selectedCarForBooking.locationHub || 'Central Hub'),
      dropLocation: this.doorstepDelivery ? this.doorstepAddress : (this.selectedCarForBooking.locationHub || 'Central Hub'),
      vehicleCategory: this.selectedCarForBooking.category,
      vehicleName: this.selectedCarForBooking.title,
      distanceKm: this.rentalDaysCount * 120,
      estimatedMinutes: this.rentalDaysCount * 1440,
      fare: totalCost,
      paymentMethod: `UPI / Card (${paymentRef})` as any
    }).subscribe(res => {
      const newRes = {
        id: res.booking.id,
        car: this.selectedCarForBooking,
        pickupTime: this.pickupDateTime.replace('T', ' '),
        returnTime: this.returnDateTime.replace('T', ' '),
        totalPaid: totalCost,
        handoverOtp: res.booking.otp || Math.floor(1000 + Math.random() * 9000),
        paymentRef
      };

      this.confirmedReservations.unshift(newRes);
      alert(`🎉 Car Reservation Confirmed!\nBooking Ref: ${newRes.id}\nVehicle: ${this.selectedCarForBooking?.title}\nHandover OTP: ${newRes.handoverOtp}\nDoorstep delivery dispatched.`);
      this.closeBookingModal();
    });
  }

  // ── Fleet Admin CRUD Operations ──────────────────────────────────────────
  openAddCarModal(): void {
    this.isEditing = false;
    this.editingCarId = null;
    const defaultImg = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80';
    this.carForm = {
      title: '',
      category: 'SUV' as 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Van/Bus' | 'EV',
      type: 'Self Drive',
      transmission: 'Automatic',
      fuelType: 'Petrol',
      dailyRate: 2500,
      hourlyRate: 200,
      seating: 5,
      city: 'Bengaluru',
      locationHub: 'Indiranagar Hub',
      depositAmount: 1500,
      image: defaultImg,
      images: [defaultImg],
      status: 'Available',
      features: 'Unlimited KM, GPS Tracker, Touchscreen, Leather Seats'
    };
    this.isCarModalOpen = true;
  }

  openEditCarModal(car: ExtendedRentalCar): void {
    this.isEditing = true;
    this.editingCarId = car.id;
    const primaryImg = car.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80';
    const galleryImgs = car.images && car.images.length ? [...car.images] : [primaryImg];

    this.carForm = {
      title: car.title,
      category: (car.category || 'SUV') as 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Van/Bus' | 'EV',
      type: car.type || 'Self Drive',
      transmission: car.transmission || 'Automatic',
      fuelType: car.fuelType || 'Petrol',
      dailyRate: car.dailyRate || 2500,
      hourlyRate: car.hourlyRate || 200,
      seating: car.seating || 5,
      city: car.city || 'Bengaluru',
      locationHub: car.locationHub || 'Central Hub',
      depositAmount: car.depositAmount || 1500,
      image: primaryImg,
      images: galleryImgs,
      status: car.status || 'Available',
      features: (car.features || ['Unlimited KM', 'Insured']).join(', ')
    };
    this.isCarModalOpen = true;
  }

  closeCarModal(): void {
    this.isCarModalOpen = false;
  }

  public isSavingCar = signal<boolean>(false);

  saveFleetCar(): void {
    if (!this.carForm.title.trim()) {
      alert('Please enter a vehicle title.');
      return;
    }

    this.isSavingCar.set(true);

    const payload: Partial<ExtendedRentalCar> = {
      title: this.carForm.title,
      category: this.carForm.category,
      type: this.carForm.type,
      transmission: this.carForm.transmission,
      fuelType: this.carForm.fuelType,
      dailyRate: Number(this.carForm.dailyRate),
      hourlyRate: Number(this.carForm.hourlyRate),
      seating: Number(this.carForm.seating),
      city: this.carForm.city,
      locationHub: this.carForm.locationHub,
      depositAmount: Number(this.carForm.depositAmount),
      image: this.carForm.image,
      images: this.carForm.images && this.carForm.images.length ? this.carForm.images : [this.carForm.image],
      status: this.carForm.status,
      isEV: this.carForm.fuelType === 'Electric',
      features: this.carForm.features.split(',').map(s => s.trim()).filter(Boolean)
    };

    if (this.isEditing && this.editingCarId) {
      this.mobilityService.updateRentalCar(this.editingCarId, payload).subscribe(() => {
        const idx = this.fleetCatalog.findIndex(c => c.id === this.editingCarId);
        if (idx !== -1) {
          this.fleetCatalog[idx] = { ...this.fleetCatalog[idx], ...payload };
        }
        this.filterFleet();
        this.isSavingCar.set(false);
        this.closeCarModal();
      });
    } else {
      const newId = `RENT-${Math.floor(100 + Math.random() * 900)}`;
      const newCar: ExtendedRentalCar = {
        id: newId,
        rating: 5.0,
        tripsCount: 0,
        ...payload
      } as ExtendedRentalCar;

      this.mobilityService.addRentalCar(newCar).subscribe(() => {
        this.fleetCatalog.unshift(newCar);
        this.filterFleet();
        this.isSavingCar.set(false);
        this.closeCarModal();
      });
    }
  }

  deleteFleetCar(car: ExtendedRentalCar): void {
    if (confirm(`Are you sure you want to remove "${car.title}" from the rental catalog?`)) {
      this.mobilityService.deleteRentalCar(car.id).subscribe(() => {
        this.fleetCatalog = this.fleetCatalog.filter(c => c.id !== car.id);
        this.filterFleet();
        alert(`Vehicle "${car.title}" removed from catalog.`);
      });
    }
  }

  toggleVehicleStatus(car: ExtendedRentalCar): void {
    const nextStatus: Record<string, 'Available' | 'Rented' | 'Under Service'> = {
      'Available': 'Rented',
      'Rented': 'Under Service',
      'Under Service': 'Available'
    };
    car.status = nextStatus[car.status || 'Available'];
    this.mobilityService.updateRentalCar(car.id, { status: car.status }).subscribe();
  }
}
