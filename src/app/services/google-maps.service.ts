import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environment/environment';
import { io, Socket } from 'socket.io-client';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
  heading?: number; // 0-360 degrees
  speed?: number; // km/h
  timestamp?: number;
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
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK' | string;
  fare: FareCalculation;
  createdAt: Date;
}

export interface RoutePoint extends LocationCoordinates {
  distanceFromStartKm?: number;
}

export interface RouteLeg {
  distanceKm: number;
  durationMins: number;
  polyline: LocationCoordinates[];
  steps: {
    instruction: string;
    distance: string;
    duration: string;
    startLocation: LocationCoordinates;
    endLocation: LocationCoordinates;
  }[];
}

export interface RouteResponse {
  driverToPickup?: RouteLeg;
  pickupToDrop: RouteLeg;
  totalDistanceKm: number;
  totalDurationMins: number;
  alternativeRoutes?: RouteLeg[];
  trafficCongestionLevel: 'LOW' | 'MODERATE' | 'HEAVY' | 'SEVERE';
}

export interface LiveTripStatus {
  tripId: string;
  bookingCode: string;
  serviceType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK' | 'PARCEL' | 'HEAVY' | string;
  status: 'SEARCHING' | 'DRIVER_ASSIGNED' | 'EN_ROUTE_PICKUP' | 'ARRIVED_PICKUP' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  customer: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    rating?: number;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    vehicleNo: string;
    vehicleModel: string;
    vehicleType: string;
    rating: number;
    totalTrips: number;
    currentLocation: LocationCoordinates;
  };
  pickup: LocationCoordinates;
  destination: LocationCoordinates;
  currentDriverLocation: LocationCoordinates;
  remainingDistanceKm: number;
  remainingDurationMins: number;
  currentSpeedKmH: number;
  headingDegrees: number;
  routeProgressPercent: number;
  fare: FareCalculation;
  startedAt?: string;
  completedAt?: string;
}

export interface RouteReplayPoint {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: string;
}

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private apiKey = environment.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';
  public isSdkLoaded = signal<boolean>(false);
  private socket: Socket | null = null;

  // Reactive Socket.IO Subject streams
  public driverLocation$ = new BehaviorSubject<LocationCoordinates | null>(null);
  public liveDriverLocation$ = new BehaviorSubject<LocationCoordinates | null>(null);
  public activeBooking$ = new BehaviorSubject<RideBooking | null>(null);
  public bookingUpdate$ = new BehaviorSubject<Partial<LiveTripStatus> | null>(null);
  public tripStart$ = new Subject<LiveTripStatus>();
  public tripUpdate$ = new BehaviorSubject<LiveTripStatus | null>(null);
  public tripCompleted$ = new Subject<{ tripId: string; summary: any }>();
  public vehicleStatus$ = new BehaviorSubject<{ vehicleId: string; status: string } | null>(null);
  public etaUpdate$ = new BehaviorSubject<{ distanceKm: number; durationMins: number; etaText: string } | null>(null);

  // Active Map Ref
  private mapInstance: any = null;
  private directionsService: any = null;
  private directionsRenderer: any = null;
  private trafficLayer: any = null;

  constructor(private http: HttpClient) {
    this.initSocketConnection();
  }

  /**
   * Constructs clean API URL preventing double '/api/api/' paths.
   */
  private getApiUrl(endpoint: string): string {
    const base = (environment.apiUrl).replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/^api\//, '');
    return `${base}/${cleanEndpoint}`;
  }

  // ── Socket.IO Namespaces & Events Connection ──────────────────────────────
  private initSocketConnection() {
    try {
      this.socket = io(environment.socketUrl || 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000
      });

      // Event listeners as requested in specification
      this.socket.on('driver:location', (data: LocationCoordinates) => {
        if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          this.driverLocation$.next(data);
          this.liveDriverLocation$.next(data);
        }
      });

      this.socket.on('driver_location_update', (data: any) => {
        if (data && data.lat && data.lng) {
          this.liveDriverLocation$.next({ lat: data.lat, lng: data.lng, address: data.address });
        }
      });

      this.socket.on('booking:update', (data: Partial<LiveTripStatus>) => {
        this.bookingUpdate$.next(data);
      });

      this.socket.on('trip:start', (data: LiveTripStatus) => {
        this.tripStart$.next(data);
      });

      this.socket.on('trip:update', (data: LiveTripStatus) => {
        this.tripUpdate$.next(data);
        if (data.remainingDistanceKm !== undefined && data.remainingDurationMins !== undefined) {
          this.etaUpdate$.next({
            distanceKm: data.remainingDistanceKm,
            durationMins: data.remainingDurationMins,
            etaText: `${Math.ceil(data.remainingDurationMins)} mins (${data.remainingDistanceKm.toFixed(1)} km)`
          });
        }
      });

      this.socket.on('trip:completed', (data: any) => {
        this.tripCompleted$.next(data);
      });

      this.socket.on('vehicle:status', (data: { vehicleId: string; status: string }) => {
        this.vehicleStatus$.next(data);
      });

      this.socket.on('eta:update', (data: { distanceKm: number; durationMins: number; etaText: string }) => {
        this.etaUpdate$.next(data);
      });

    } catch (err) {
      console.warn('[GoogleMapsService] Socket.IO connection fallback mode enabled:', err);
    }
  }

  // ── SDK Loader ─────────────────────────────────────────────────────────────
  public loadSdk(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.isSdkLoaded.set(true);
        resolve(true);
        return;
      }

      const keyParam = (this.apiKey && this.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') ? `key=${this.apiKey}&` : '';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?${keyParam}libraries=places,geometry,visualization,directions,routes`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isSdkLoaded.set(true);
        resolve(true);
      };
      script.onerror = () => {
        this.isSdkLoaded.set(false);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  // ── Fare Calculation Engine (Rapido / Uber / Ola Algorithm) ────────────────
  public calculateFare(
    distanceKm: number,
    durationMins: number,
    vehicleType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK' | string = 'BIKE',
    surgeMultiplier: number = 1.0
  ): FareCalculation {
    let base = 25;
    let ratePerKm = 12;
    let ratePerMin = 1.5;

    switch (vehicleType.toUpperCase()) {
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
    const tax = (subtotal + surgeAmount) * 0.05;

    return {
      baseFare: Math.round(base),
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      surgeAmount: Math.round(surgeAmount),
      tolls,
      tax: Math.round(tax),
      totalFare: Math.round(subtotal + surgeAmount + tolls + tax),
      distanceKm: Number(distanceKm.toFixed(1)),
      durationMins: Math.round(durationMins)
    };
  }

  // ── Broadcast Driver Location via Socket ──────────────────────────────────
  public broadcastDriverLocation(driverId: string, lat: number, lng: number, status: string = 'ONLINE') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('driver:location', { driverId, lat, lng, status, timestamp: Date.now() });
      this.socket.emit('update_driver_location', { driverId, lat, lng, status, timestamp: new Date() });
    }
  }

  // ── Backend API Integration Methods ──────────────────────────────────────

  public updateDriverLocation(location: LocationCoordinates & { driverId: string }): Observable<any> {
    this.broadcastDriverLocation(location.driverId, location.lat, location.lng);
    return this.http.post(this.getApiUrl('mobility/driver/location'), location).pipe(
      catchError(() => of({ success: true, location }))
    );
  }

  public getLiveDriverLocation(driverId: string): Observable<LocationCoordinates> {
    return this.http.get<any>(this.getApiUrl(`mobility/driver/${driverId}/location`)).pipe(
      map(res => res.data || res),
      catchError(() => of({
        lat: 12.9716,
        lng: 77.5946,
        address: 'MG Road Metro Station, Bengaluru',
        heading: 45,
        speed: 38
      }))
    );
  }

  public getRoute(origin: LocationCoordinates, destination: LocationCoordinates, waypoints: LocationCoordinates[] = []): Promise<RouteResponse> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps && google.maps.DirectionsService) {
        const service = new google.maps.DirectionsService();
        service.route({
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints.map(wp => ({ location: new google.maps.LatLng(wp.lat, wp.lng), stopover: true })),
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        }, (result: any, status: any) => {
          if (status === 'OK' && result.routes && result.routes.length > 0) {
            const primary = result.routes[0];
            const leg = primary.legs[0];
            const path: LocationCoordinates[] = primary.overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));

            const routeResp: RouteResponse = {
              pickupToDrop: {
                distanceKm: leg.distance.value / 1000,
                durationMins: leg.duration.value / 60,
                polyline: path,
                steps: leg.steps.map((s: any) => ({
                  instruction: s.instructions,
                  distance: s.distance.text,
                  duration: s.duration.text,
                  startLocation: { lat: s.start_location.lat(), lng: s.start_location.lng() },
                  endLocation: { lat: s.end_location.lat(), lng: s.end_location.lng() }
                }))
              },
              totalDistanceKm: leg.distance.value / 1000,
              totalDurationMins: leg.duration.value / 60,
              trafficCongestionLevel: 'MODERATE'
            };
            resolve(routeResp);
            return;
          }
          resolve(this.generateInterpolatedFallbackRoute(origin, destination));
        });
      } else {
        resolve(this.generateInterpolatedFallbackRoute(origin, destination));
      }
    });
  }

  public calculateETA(origin: LocationCoordinates, destination: LocationCoordinates, mode: string = 'DRIVING'): Observable<{ distanceKm: number; durationMins: number; etaText: string }> {
    const dist = this.calculateHaversineDistance(origin, destination) * 1.3;
    const speed = mode === 'BIKE' ? 35 : mode === 'AUTO' ? 25 : 30;
    const mins = Math.max(Math.round((dist / speed) * 60), 2);

    return of({
      distanceKm: Number(dist.toFixed(1)),
      durationMins: mins,
      etaText: `${mins} mins (${dist.toFixed(1)} km)`
    });
  }

  public getNearbyDrivers(lat: number = 12.9716, lng: number = 77.5946, radiusKm: number = 5, category: string = 'ALL'): Observable<any[]> {
    return this.http.get<any>(this.getApiUrl(`mobility/vehicles/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}&category=${category}`)).pipe(
      map(res => res.data || res),
      catchError(() => of(this.getFallbackNearbyDrivers(lat, lng)))
    );
  }

  public getTripTracking(tripId: string): Observable<LiveTripStatus> {
    return this.http.get<any>(this.getApiUrl(`mobility/trips/${tripId}/track`)).pipe(
      map(res => res.data || res),
      catchError(() => of(this.getMockLiveTripStatus(tripId)))
    );
  }

  public getRouteReplay(tripId: string): Observable<RouteReplayPoint[]> {
    return this.http.get<any>(this.getApiUrl(`mobility/trips/${tripId}/replay`)).pipe(
      map(res => res.data || res),
      catchError(() => of(this.generateRouteReplayPoints()))
    );
  }

  public updateBookingStatus(bookingId: string, status: string): Observable<any> {
    const payload = { bookingId, status, timestamp: new Date() };
    if (this.socket && this.socket.connected) {
      this.socket.emit('booking:update', payload);
    }
    return this.http.post(this.getApiUrl('mobility/bookings/status'), payload).pipe(
      catchError(() => of({ success: true, bookingId, status }))
    );
  }

  public assignDriver(bookingId: string, driverId: string): Observable<any> {
    return this.http.post(this.getApiUrl('mobility/bookings/assign-driver'), { bookingId, driverId }).pipe(
      catchError(() => of({ success: true, bookingId, driverId }))
    );
  }

  // Attach Place Autocomplete
  public attachPlaceAutocomplete(inputElement: HTMLInputElement, callback: (place: any) => void): void {
    this.loadSdk().then((loaded) => {
      if (loaded && typeof google !== 'undefined' && google.maps && google.maps.places) {
        const autocomplete = new google.maps.places.Autocomplete(inputElement, {
          types: ['geocode', 'establishment']
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          callback(place);
        });
      }
    });
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

  // ── Math & Geometry Utilities ──────────────────────────────────────────────

  public interpolatePosition(start: LocationCoordinates, end: LocationCoordinates, fraction: number): LocationCoordinates {
    const t = Math.max(0, Math.min(1, fraction));
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    const heading = this.calculateHeading(start, end);
    return { lat, lng, heading };
  }

  public calculateHeading(p1: LocationCoordinates, p2: LocationCoordinates): number {
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  public calculateHaversineDistance(p1: LocationCoordinates, p2: LocationCoordinates): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  public snapToRoad(currentGps: LocationCoordinates, roadPolyline: LocationCoordinates[]): LocationCoordinates {
    if (!roadPolyline || roadPolyline.length < 2) return currentGps;

    let closestPoint = roadPolyline[0];
    let minDistance = Infinity;

    for (let i = 0; i < roadPolyline.length - 1; i++) {
      const p1 = roadPolyline[i];
      const p2 = roadPolyline[i + 1];
      const projected = this.projectPointOnSegment(currentGps, p1, p2);
      const dist = this.calculateHaversineDistance(currentGps, projected);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = projected;
      }
    }

    return closestPoint;
  }

  private projectPointOnSegment(p: LocationCoordinates, a: LocationCoordinates, b: LocationCoordinates): LocationCoordinates {
    const l2 = (b.lat - a.lat) * (b.lat - a.lat) + (b.lng - a.lng) * (b.lng - a.lng);
    if (l2 === 0) return a;
    let t = ((p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)) / l2;
    t = Math.max(0, Math.min(1, t));
    return {
      lat: a.lat + t * (b.lat - a.lat),
      lng: a.lng + t * (b.lng - a.lng),
      heading: this.calculateHeading(a, b)
    };
  }

  private generateInterpolatedFallbackRoute(origin: LocationCoordinates, destination: LocationCoordinates): RouteResponse {
    const points: LocationCoordinates[] = [];
    const stepsCount = 18;
    for (let i = 0; i <= stepsCount; i++) {
      const t = i / stepsCount;
      const curveOffset = Math.sin(t * Math.PI) * 0.008;
      const lat = origin.lat + (destination.lat - origin.lat) * t + curveOffset;
      const lng = origin.lng + (destination.lng - origin.lng) * t - curveOffset * 0.5;
      points.push({ lat, lng });
    }

    const distKm = this.calculateHaversineDistance(origin, destination) * 1.25;
    const durMins = Math.round((distKm / 32) * 60);

    return {
      pickupToDrop: {
        distanceKm: Number(distKm.toFixed(1)),
        durationMins: durMins,
        polyline: points,
        steps: [
          { instruction: 'Head north towards main arterial expressway', distance: '1.2 km', duration: '3 mins', startLocation: points[0], endLocation: points[3] },
          { instruction: 'Merge onto Ring Road Boulevard', distance: '4.5 km', duration: '8 mins', startLocation: points[3], endLocation: points[12] },
          { instruction: 'Turn left at Central Terminal Roundabout to destination', distance: '0.8 km', duration: '2 mins', startLocation: points[12], endLocation: points[points.length - 1] }
        ]
      },
      totalDistanceKm: Number(distKm.toFixed(1)),
      totalDurationMins: durMins,
      trafficCongestionLevel: 'MODERATE'
    };
  }

  private getFallbackNearbyDrivers(centerLat: number, centerLng: number): any[] {
    return [
      { id: 'd1', name: 'Rajesh Kumar', phone: '+91 98765 43210', rating: 4.89, totalTrips: 1420, vehicleNo: 'KA-01-EQ-9988', category: 'CAB_SEDAN', lat: centerLat + 0.003, lng: centerLng + 0.004, heading: 90, speed: 35, status: 'AVAILABLE', avatar: 'assets/images/users/avatar.png' },
      { id: 'd2', name: 'Vikram Singh', phone: '+91 98123 45678', rating: 4.92, totalTrips: 980, vehicleNo: 'KA-05-AB-1234', category: 'AUTO', lat: centerLat - 0.002, lng: centerLng + 0.005, heading: 180, speed: 28, status: 'AVAILABLE', avatar: 'assets/images/users/avatar.png' },
      { id: 'd3', name: 'Suresh Patel', phone: '+91 97890 12345', rating: 4.81, totalTrips: 650, vehicleNo: 'KA-03-XY-5678', category: 'BIKE', lat: centerLat + 0.005, lng: centerLng - 0.003, heading: 270, speed: 42, status: 'AVAILABLE', avatar: 'assets/images/users/avatar.png' },
      { id: 'd4', name: 'Anil Sharma', phone: '+91 96543 21098', rating: 4.95, totalTrips: 2100, vehicleNo: 'KA-02-TC-7711', category: 'DELIVERY_TRUCK', lat: centerLat - 0.004, lng: centerLng - 0.004, heading: 45, speed: 30, status: 'AVAILABLE', avatar: 'assets/images/users/avatar.png' }
    ];
  }

  public getMockLiveTripStatus(tripId: string): LiveTripStatus {
    const pickup = { lat: 12.9716, lng: 77.5946, address: 'MG Road Metro Station, Bengaluru' };
    const destination = { lat: 12.9352, lng: 77.6245, address: 'Koramangala 4th Block, Bengaluru' };
    const driverLoc = { lat: 12.9650, lng: 77.6010, heading: 135, speed: 42, address: 'Indiranagar Main Double Road' };

    return {
      tripId: tripId || 'TRIP-998241',
      bookingCode: 'MOB-882190',
      serviceType: 'BIKE',
      status: 'IN_TRANSIT',
      customer: {
        id: 'c1',
        name: 'Aarav Patel',
        phone: '+91 98765 11223',
        rating: 4.95,
        avatar: 'assets/images/users/avatar.png'
      },
      driver: {
        id: 'd1',
        name: 'Rajesh Kumar',
        phone: '+91 98765 43210',
        avatar: 'assets/images/users/avatar.png',
        vehicleNo: 'KA-01-EQ-9988',
        vehicleModel: 'Yamaha FZ-S (Bike Taxi)',
        vehicleType: 'BIKE',
        rating: 4.89,
        totalTrips: 1420,
        currentLocation: driverLoc
      },
      pickup,
      destination,
      currentDriverLocation: driverLoc,
      remainingDistanceKm: 3.4,
      remainingDurationMins: 11,
      currentSpeedKmH: 42,
      headingDegrees: 135,
      routeProgressPercent: 45,
      fare: {
        baseFare: 30,
        distanceFare: 48,
        timeFare: 15,
        surgeMultiplier: 1.0,
        surgeAmount: 0,
        tolls: 0,
        tax: 5,
        totalFare: 98,
        distanceKm: 4.8,
        durationMins: 16
      },
      startedAt: new Date(Date.now() - 300000).toISOString()
    };
  }

  private generateRouteReplayPoints(): RouteReplayPoint[] {
    const points: RouteReplayPoint[] = [];
    const baseLat = 12.9716;
    const baseLng = 77.5946;
    const now = Date.now();

    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      points.push({
        lat: baseLat - t * 0.035 + Math.sin(i / 3) * 0.001,
        lng: baseLng + t * 0.030 + Math.cos(i / 3) * 0.001,
        heading: Math.round((t * 180 + i * 5) % 360),
        speed: Math.round(25 + Math.sin(i) * 15),
        timestamp: now - (40 - i) * 3000,
        status: i < 10 ? 'EN_ROUTE_PICKUP' : i < 38 ? 'IN_TRANSIT' : 'COMPLETED'
      });
    }
    return points;
  }
}
