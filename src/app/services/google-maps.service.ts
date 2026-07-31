import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from 'src/environment/environment';
import { io, Socket } from 'socket.io-client';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface FareCalculation {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  surgeAmount: number;
  tolls: number;
  tax: number;
  totalFare: number;
  distanceKm: number;
  durationMins: number;
}

export interface RideBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  pickup: LocationCoordinates;
  destination: LocationCoordinates;
  status: 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  driverId?: string;
  driverName?: string;
  driverVehicle?: string;
  driverPhone?: string;
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK';
  fare: FareCalculation;
  createdAt: Date;
}

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private apiKey = environment.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';
  public isSdkLoaded = signal<boolean>(false);
  private socket: Socket | null = null;
  
  public liveDriverLocation$ = new BehaviorSubject<LocationCoordinates | null>(null);
  public activeBooking$ = new BehaviorSubject<RideBooking | null>(null);

  constructor(private http: HttpClient) {
    this.initSocket();
  }

  private initSocket() {
    try {
      this.socket = io(environment.socketUrl || 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      this.socket.on('driver_location_update', (data: any) => {
        if (data && data.lat && data.lng) {
          this.liveDriverLocation$.next({ lat: data.lat, lng: data.lng, address: data.address });
        }
      });

      this.socket.on('booking_status_change', (booking: RideBooking) => {
        if (booking) {
          this.activeBooking$.next(booking);
        }
      });
    } catch (e) {
      console.warn('Socket connection fallback mode:', e);
    }
  }

  public loadSdk(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        this.isSdkLoaded.set(true);
        resolve();
        return;
      }

      if (this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry,visualization,directions`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.isSdkLoaded.set(true);
          resolve();
        };
        script.onerror = () => {
          this.isSdkLoaded.set(false);
          resolve();
        };
        document.head.appendChild(script);
      } else {
        this.isSdkLoaded.set(false);
        resolve();
      }
    });
  }

  // Fare Calculation Engine (Rapido / Swiggy / Zomato algorithm)
  public calculateFare(
    distanceKm: number,
    durationMins: number,
    vehicleType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK' = 'BIKE',
    surgeMultiplier: number = 1.0
  ): FareCalculation {
    let base = 25;
    let ratePerKm = 12;
    let ratePerMin = 1.5;

    switch (vehicleType) {
      case 'AUTO':
        base = 35; ratePerKm = 15; ratePerMin = 2.0; break;
      case 'CAB_SEDAN':
        base = 50; ratePerKm = 22; ratePerMin = 3.0; break;
      case 'CAB_SUV':
        base = 80; ratePerKm = 28; ratePerMin = 4.0; break;
      case 'DELIVERY_TRUCK':
        base = 120; ratePerKm = 35; ratePerMin = 5.0; break;
    }

    const distanceFare = distanceKm * ratePerKm;
    const timeFare = durationMins * ratePerMin;
    const subtotal = base + distanceFare + timeFare;
    const surgeAmount = subtotal * (surgeMultiplier - 1.0);
    const tolls = distanceKm > 15 ? 45 : 0;
    const tax = (subtotal + surgeAmount) * 0.05; // 5% GST/Tax
    const totalFare = Math.round(subtotal + surgeAmount + tolls + tax);

    return {
      baseFare: Math.round(base),
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      surgeAmount: Math.round(surgeAmount),
      tolls,
      tax: Math.round(tax),
      totalFare,
      distanceKm: Number(distanceKm.toFixed(1)),
      durationMins: Math.round(durationMins)
    };
  }

  // Real-Time Location Broadcasting
  public broadcastDriverLocation(driverId: string, lat: number, lng: number, status: string = 'ONLINE') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_driver_location', { driverId, lat, lng, status, timestamp: new Date() });
    }
  }

  // Geocoding helper
  public geocode(address: string): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng(), address: results[0].formatted_address });
          } else {
            reject(status);
          }
        });
      } else {
        // Fallback default coordinate (New York City Center)
        resolve({ lat: 40.7128, lng: -74.0060, address });
      }
    });
  }

  // Reverse Geocoding helper
  public reverseGeocode(lat: number, lng: number): Promise<string> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        });
      } else {
        resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    });
  }
}
