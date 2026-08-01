import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { GoogleMapsService } from '../../services/google-maps.service';
import { RazorpayService } from '../../services/razorpay.service';
import { VehicleCategory, DriverProfile, ActiveBooking, FareBreakdown } from '../../models/mobility.models';
import { MobilityMapComponent } from '../mobility-map/mobility-map.component';
import { VehicleCardComponent } from '../vehicle-card/vehicle-card.component';

declare var google: any;

export interface LocationPreset {
  title: string;
  subtitle: string;
  address: string;
  icon: string;
}

export interface PromoCode {
  code: string;
  label: string;
  discountPercent?: number;
  flatDiscount?: number;
}

@Component({
  selector: 'app-ride-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, MobilityMapComponent, VehicleCardComponent],
  templateUrl: './ride-booking.component.html',
  styleUrl: './ride-booking.component.scss'
})
export class RideBookingComponent implements OnInit, AfterViewInit {
  public mobilityService = inject(MobilityService);
  public googleMapsService = inject(GoogleMapsService);
  public razorpayService = inject(RazorpayService);

  @ViewChild('pickupInput', { static: false }) pickupInputRef!: ElementRef;
  @ViewChild('dropInput', { static: false }) dropInputRef!: ElementRef;

  // Tabs & Service Type
  public activeTab = signal<'new_booking' | 'active_rides' | 'history'>('new_booking');
  public activeType: string = 'Passenger'; // Passenger | Rental | Outstation
  public rentalPackage: string = '4 Hours / 40 Km';
  public scheduleDate: string = '';
  public isScheduled: boolean = false;
  public isLoadingFare = signal<boolean>(false);

  // Address State
  public pickupLocation: string = '';
  public dropLocation: string = '';
  public isSwappingLocations: boolean = false;

  // Payment & Promo
  public paymentMethod: string = 'UPI / Wallet';
  public couponCode: string = '';
  public appliedCoupon: { code: string; label: string; discountPercent?: number; flatDiscount?: number } | null = null;

  // Distance & Duration
  public distanceKm: number = 8.4;
  public estimatedMinutes: number = 24;

  // Vehicle Categories & Selection
  public selectedCategorySignal = signal<VehicleCategory | null>(null);

  // Fare Breakdown Modal
  public isFareModalOpen: boolean = false;
  public currentFareBreakdown = signal<FareBreakdown | null>(null);

  // Booking Lifecycle State
  public bookingStep = signal<'IDLE' | 'SEARCHING' | 'ASSIGNED' | 'IN_TRIP' | 'COMPLETED'>('IDLE');
  public searchingStatusText = signal<string>('Connecting to live dispatch server...');
  public searchingStepIndex = signal<number>(1);
  public currentBooking = signal<ActiveBooking | null>(null);
  public rideOtp = signal<string>('4892');
  public tripProgress = signal<number>(15);

  // Rating Modal
  public isRatingModalOpen: boolean = false;
  public selectedRating: number = 5;
  public driverTip: number = 0;

  // Location Presets
  public quickPresets: LocationPreset[] = [];

  // Available Promo Codes
  public promoCodes: PromoCode[] = [];

  public vehicleCategories = computed(() => {
    const categories = this.mobilityService.categories();
    const filtered = categories.filter(c => c.type === this.activeType);
    return filtered.length > 0 ? filtered : categories;
  });

  public getSelectedCategory(): VehicleCategory | null {
    const current = this.selectedCategorySignal();
    const list = this.vehicleCategories();
    if (current && list.some(c => c.id === current.id)) {
      return current;
    }
    return list.length > 0 ? list[0] : null;
  }

  public changeActiveType(type: string): void {
    this.activeType = type;
    const list = this.vehicleCategories();
    if (list.length > 0) {
      this.selectedCategorySignal.set(list[0]);
    }
    this.updateDistanceDuration();
  }

  private tripTimer: any = null;

  ngOnInit(): void {
    this.mobilityService.loadCategories();
    this.mobilityService.loadActiveBookings();
    const list = this.vehicleCategories();
    if (list.length > 0) {
      this.selectedCategorySignal.set(list[0]);
    }
    this.updateDistanceDuration();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.googleMapsService.loadSdk();
    this.initGoogleAutocomplete();
  }

  private initGoogleAutocomplete(): void {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) return;

    if (this.pickupInputRef?.nativeElement) {
      const pickupAutocomplete = new google.maps.places.Autocomplete(this.pickupInputRef.nativeElement, {
        types: ['geocode', 'establishment']
      });
      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        if (place && (place.formatted_address || place.name)) {
          this.pickupLocation = place.formatted_address || place.name;
          this.updateDistanceDuration();
        }
      });
    }

    if (this.dropInputRef?.nativeElement) {
      const dropAutocomplete = new google.maps.places.Autocomplete(this.dropInputRef.nativeElement, {
        types: ['geocode', 'establishment']
      });
      dropAutocomplete.addListener('place_changed', () => {
        const place = dropAutocomplete.getPlace();
        if (place && (place.formatted_address || place.name)) {
          this.dropLocation = place.formatted_address || place.name;
          this.updateDistanceDuration();
        }
      });
    }
  }

  selectCategory(cat: VehicleCategory): void {
    this.selectedCategorySignal.set(cat);
    this.calculateFareBreakdown();
  }

  swapLocations(): void {
    this.isSwappingLocations = true;
    const temp = this.pickupLocation;
    this.pickupLocation = this.dropLocation;
    this.dropLocation = temp;
    this.updateDistanceDuration();
    setTimeout(() => this.isSwappingLocations = false, 400);
  }

  selectPreset(preset: LocationPreset, targetField: 'pickup' | 'drop'): void {
    if (targetField === 'pickup') {
      this.pickupLocation = preset.address;
    } else {
      this.dropLocation = preset.address;
    }
    this.updateDistanceDuration();
  }

  async updateDistanceDuration(): Promise<void> {
    this.isLoadingFare.set(true);
    try {
      const pickupLoc = await this.googleMapsService.geocode(this.pickupLocation);
      const dropLoc = await this.googleMapsService.geocode(this.dropLocation);
      const routeResp = await this.googleMapsService.getRoute(pickupLoc, dropLoc);

      if (routeResp && routeResp.pickupToDrop) {
        this.distanceKm = Number(routeResp.pickupToDrop.distanceKm.toFixed(1));
        this.estimatedMinutes = Math.round(routeResp.pickupToDrop.durationMins);
      }
    } catch {
      const combine = (this.pickupLocation + this.dropLocation).toLowerCase();
      if (combine.includes('airport')) {
        this.distanceKm = 34.5;
        this.estimatedMinutes = 52;
      } else if (combine.includes('whitefield') || combine.includes('itpl')) {
        this.distanceKm = 18.2;
        this.estimatedMinutes = 42;
      } else if (combine.includes('hebbal') || combine.includes('manyata')) {
        this.distanceKm = 14.8;
        this.estimatedMinutes = 35;
      } else {
        this.distanceKm = 8.4;
        this.estimatedMinutes = 24;
      }
    }
    this.calculateFareBreakdown();
  }

  calculateFare(cat: VehicleCategory): number {
    if (this.currentFareBreakdown() && this.getSelectedCategory()?.id === cat.id) {
      return this.currentFareBreakdown()!.totalFare;
    }
    let base = cat.baseFare + (this.distanceKm * cat.perKm) + (this.estimatedMinutes * cat.perMin);
    base = base * (cat.dynamicMultiplier || 1.0);

    if (this.appliedCoupon) {
      if (this.appliedCoupon.discountPercent) {
        const disc = Math.min((base * this.appliedCoupon.discountPercent) / 100, 150);
        base = Math.max(base - disc, 20);
      } else if (this.appliedCoupon.flatDiscount) {
        base = Math.max(base - this.appliedCoupon.flatDiscount, 20);
      }
    }
    return Math.round(base);
  }

  calculateFareBreakdown(): void {
    const selected = this.getSelectedCategory();
    if (!selected) return;

    this.isLoadingFare.set(true);
    this.mobilityService.calculateFare({
      categoryId: selected.id,
      distanceKm: this.distanceKm,
      durationMin: this.estimatedMinutes,
      surgeMultiplier: selected.dynamicMultiplier || 1.0
    }).subscribe({
      next: (resp) => {
        let discount = 0;
        if (this.appliedCoupon) {
          if (this.appliedCoupon.discountPercent) {
            discount = Math.round(Math.min((resp.breakdown.totalFare * this.appliedCoupon.discountPercent) / 100, 150));
          } else if (this.appliedCoupon.flatDiscount) {
            discount = this.appliedCoupon.flatDiscount;
          }
        }
        const finalTotal = Math.max(resp.breakdown.totalFare - discount, 30);
        this.currentFareBreakdown.set({
          ...resp.breakdown,
          discount,
          totalFare: finalTotal
        });
        this.isLoadingFare.set(false);
      },
      error: () => {
        const baseFare = selected.baseFare;
        const distanceFare = Math.round(this.distanceKm * selected.perKm);
        const timeFare = Math.round(this.estimatedMinutes * selected.perMin);
        const subtotal = baseFare + distanceFare + timeFare;
        const surgeMultiplier = selected.dynamicMultiplier || 1.0;
        const surgeAmount = Math.round(subtotal * (surgeMultiplier - 1.0));
        const tollCharges = this.distanceKm > 15 ? 85 : 0;
        const taxGst = Math.round((subtotal + surgeAmount) * 0.05);

        let discount = 0;
        if (this.appliedCoupon) {
          if (this.appliedCoupon.discountPercent) {
            discount = Math.round(Math.min((subtotal * this.appliedCoupon.discountPercent) / 100, 150));
          } else if (this.appliedCoupon.flatDiscount) {
            discount = this.appliedCoupon.flatDiscount;
          }
        }

        const totalFare = Math.max(Math.round(subtotal + surgeAmount + tollCharges + taxGst - discount), 30);

        this.currentFareBreakdown.set({
          baseFare,
          distanceKm: this.distanceKm,
          distanceFare,
          durationMin: this.estimatedMinutes,
          timeFare,
          surgeMultiplier,
          tollCharges,
          nightCharge: 0,
          taxGst,
          discount,
          totalFare
        });
        this.isLoadingFare.set(false);
      }
    });
  }

  openFareModal(): void {
    this.calculateFareBreakdown();
    this.isFareModalOpen = true;
  }

  closeFareModal(): void {
    this.isFareModalOpen = false;
  }

  applyCouponCode(codeToApply?: string): void {
    const code = (codeToApply || this.couponCode).trim().toUpperCase();
    const found = this.promoCodes.find(p => p.code === code);

    if (found) {
      this.appliedCoupon = found;
      this.couponCode = code;
      this.calculateFareBreakdown();
    } else {
      alert(`Invalid or expired promo coupon: "${code}". Try FIRST50, BLUESMART, or CORP20.`);
    }
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.couponCode = '';
    this.calculateFareBreakdown();
  }

  confirmRideBooking(): void {
    const selected = this.getSelectedCategory();
    if (!selected) {
      alert('Please select a vehicle category.');
      return;
    }
    if (!this.pickupLocation.trim() || !this.dropLocation.trim()) {
      alert('Please enter both Pickup Location and Drop Location.');
      return;
    }

    const finalFare = this.currentFareBreakdown()?.totalFare || this.calculateFare(selected);

    // If online payment method selected (UPI / Wallet, Credit Card) -> Launch Razorpay Gateway
    if (this.paymentMethod.includes('UPI') || this.paymentMethod.includes('Credit Card') || this.paymentMethod.includes('Wallet')) {
      this.initiateRazorpayPayment(selected, finalFare);
    } else {
      this.executeBookingCreation(selected, finalFare, this.paymentMethod);
    }
  }

  async initiateRazorpayPayment(selected: VehicleCategory, finalFare: number): Promise<void> {
    try {
      const rzpResp = await this.razorpayService.openCheckout({
        key: 'rzp_test_TE4sr2G8bmm7c3',
        amount: finalFare * 100, // Amount in paise
        currency: 'INR',
        name: 'Spike Mobility Ride Booking',
        description: `Payment for ${selected.name} Ride`,
        order_id: `order_ride_${Date.now()}`,
        prefill: {
          name: 'Aarav Patel',
          email: 'aarav.patel@example.com',
          contact: '+919870000111'
        },
        theme: { color: '#6366f1' }
      });

      if (rzpResp && rzpResp.razorpay_payment_id) {
        this.executeBookingCreation(selected, finalFare, `${this.paymentMethod} (Paid: ${rzpResp.razorpay_payment_id})`);
      }
    } catch (err: any) {
      console.warn('Payment canceled or failed:', err);
      alert('Payment was canceled or could not be completed. Please try again.');
    }
  }

  executeBookingCreation(selected: VehicleCategory, finalFare: number, paymentMethodStr: string): void {
    // Start Radar Searching Animation
    this.bookingStep.set('SEARCHING');
    this.searchingStepIndex.set(1);
    this.searchingStatusText.set('Connecting to live dispatch server...');

    setTimeout(() => {
      this.searchingStepIndex.set(2);
      this.searchingStatusText.set(`Locating nearest verified ${selected.name} drivers nearby...`);
    }, 1200);

    setTimeout(() => {
      this.searchingStepIndex.set(3);
      this.searchingStatusText.set('Driver accepted ride request! Assigning vehicle...');
    }, 2400);

    setTimeout(() => {
      this.mobilityService.createBooking({
        serviceType: this.activeType === 'Rental' ? 'Car Rental' : 'Ride Booking',
        customerName: 'Aarav Patel',
        customerPhone: '+91 98700 00111',
        pickupLocation: this.pickupLocation,
        dropLocation: this.dropLocation,
        vehicleCategory: selected.id,
        vehicleName: selected.name,
        distanceKm: this.distanceKm,
        estimatedMinutes: this.estimatedMinutes,
        fare: finalFare,
        paymentMethod: paymentMethodStr as any
      }).subscribe(res => {
        const booking = res.booking;
        this.currentBooking.set(booking);
        this.rideOtp.set(Math.floor(1000 + Math.random() * 9000).toString());
        this.bookingStep.set('ASSIGNED');
        this.tripProgress.set(20);

        // Simulate Ride progression
        this.startTripProgressionTimer();
      });
    }, 3600);
  }

  private startTripProgressionTimer(): void {
    if (this.tripTimer) clearInterval(this.tripTimer);

    // After 8s -> Driver Arrived / Trip In Progress
    this.tripTimer = setTimeout(() => {
      if (this.bookingStep() === 'ASSIGNED') {
        this.bookingStep.set('IN_TRIP');
        this.tripProgress.set(65);

        // After another 12s -> Trip Completed
        this.tripTimer = setTimeout(() => {
          if (this.bookingStep() === 'IN_TRIP') {
            this.bookingStep.set('COMPLETED');
            this.tripProgress.set(100);
            this.isRatingModalOpen = true;
          }
        }, 12000);
      }
    }, 8000);
  }

  cancelBooking(): void {
    if (confirm('Are you sure you want to cancel this ride request?')) {
      if (this.tripTimer) clearTimeout(this.tripTimer);
      this.bookingStep.set('IDLE');
      this.currentBooking.set(null);
    }
  }

  simulateCallDriver(): void {
    const driver = this.currentBooking()?.driver;
    alert(`📞 Calling Driver: ${driver?.name || 'Rajesh Kumar'} (${driver?.phone || '+91 98765 43210'})...`);
  }

  simulateMessageDriver(): void {
    const driver = this.currentBooking()?.driver;
    const msg = prompt(`💬 Send Message to ${driver?.name || 'Driver'}:`, 'I am waiting at the main entrance gate.');
    if (msg) {
      alert(`Message sent to driver: "${msg}"`);
    }
  }

  submitRating(): void {
    alert(`🌟 Thank you! Rated ${this.selectedRating} Stars to ${this.currentBooking()?.driver?.name || 'Driver'}. Tip: ₹${this.driverTip}.`);
    this.isRatingModalOpen = false;
    this.bookingStep.set('IDLE');
    this.currentBooking.set(null);
  }

  skipRating(): void {
    this.isRatingModalOpen = false;
    this.bookingStep.set('IDLE');
    this.currentBooking.set(null);
  }
}


