import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverProfile } from '../../models/mobility.models';
import { MobilityService } from '../../services/mobility.service';
import { GoogleMapsService, LocationCoordinates, LiveTripStatus, RouteReplayPoint } from '../../services/google-maps.service';

declare var google: any;

@Component({
  selector: 'app-mobility-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './mobility-map.component.html',
  styleUrl: './mobility-map.component.scss'
})
export class MobilityMapComponent implements OnInit, OnChanges, OnDestroy {
  private mobilityService = inject(MobilityService);
  public googleMapsService = inject(GoogleMapsService);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  @Input() pickupAddress: string = '';
  @Input() dropAddress: string = '';
  @Input() vehicleCategory: string = 'BIKE';

  // Signals for Reactive UI State
  public activeDrivers = signal<DriverProfile[]>([]);
  public selectedDriver = signal<DriverProfile | null>(null);
  public liveTrip = signal<LiveTripStatus | null>(null);
  public showTraffic = signal<boolean>(false);
  public showSidebar = signal<boolean>(false);
  public isReplayMode = signal<boolean>(false);
  public isReplayPlaying = signal<boolean>(false);
  public replayCurrentStep = signal<number>(0);
  public replaySpeed = signal<number>(1);
  public isMapLoaded = signal<boolean>(false);

  // Live Interpolation Tracking State
  public currentAnimatedLocation = signal<LocationCoordinates>({
    lat: 12.9716,
    lng: 77.5946,
    heading: 45,
    speed: 0
  });

  public currentEtaMins = signal<number>(0);
  public remainingDistanceKm = signal<number>(0);
  public routeProgressPercent = signal<number>(0);
  public trafficLevel = signal<string>('MODERATE');
  public alternativeRoutesCount = signal<number>(1);
  public selectedRouteIndex = signal<number>(0);

  // Search & Filter
  public searchQuery: string = '';
  public selectedCategory: string = 'ALL';

  // Replay Points Data
  public replayPoints: RouteReplayPoint[] = [];

  // Google Maps Instance Refs
  private map: any = null;
  private vehicleMarkerInstance: any = null;
  private directionsRenderer: any = null;
  private trafficLayerInstance: any = null;
  private animFrameId: number | null = null;
  private replayIntervalId: any = null;
  private timer: any = null;

  ngOnInit(): void {
    this.initMapSystem();
    this.subscribeToSocketEvents();
    this.timer = setInterval(() => {
      this.fetchDrivers();
    }, 15000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['pickupAddress'] || changes['dropAddress']) && !changes['pickupAddress']?.firstChange) {
      this.loadDirectionsOnNativeMap();
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.replayIntervalId) clearInterval(this.replayIntervalId);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  // ── Init Google Maps or Fallback Canvas Engine ────────────────────────────
  private async initMapSystem(): Promise<void> {
    const isLoaded = await this.googleMapsService.loadSdk();
    this.isMapLoaded.set(isLoaded);

    if (isLoaded && this.mapContainer && typeof google !== 'undefined') {
      try {
        const center = { lat: 12.9716, lng: 77.5946 };
        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
          center,
          zoom: 14,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#312e81' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] }
          ]
        });

        this.directionsRenderer = new google.maps.DirectionsRenderer({
          map: this.map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#10b981',
            strokeWeight: 5,
            strokeOpacity: 0.85
          }
        });

        this.trafficLayerInstance = new google.maps.TrafficLayer();
        this.loadDirectionsOnNativeMap();
      } catch (err) {
        console.warn('Native Google Map initialization error fallback:', err);
      }
    }

    this.fetchDrivers();
  }

  // ── Socket.IO Real-time Events Listener ─────────────────────────────────
  private subscribeToSocketEvents(): void {
    // 1. Live Driver Location Broadcast Updates
    this.googleMapsService.driverLocation$.subscribe(loc => {
      if (loc) {
        this.smoothAnimateToNewLocation(loc);
      }
    });

    // 2. Trip Updates
    this.googleMapsService.tripUpdate$.subscribe(trip => {
      if (trip) {
        this.liveTrip.set(trip);
        this.currentEtaMins.set(trip.remainingDurationMins);
        this.remainingDistanceKm.set(trip.remainingDistanceKm);
        this.routeProgressPercent.set(trip.routeProgressPercent);
        this.smoothAnimateToNewLocation(trip.currentDriverLocation);
      }
    });

    // 3. ETA Updates
    this.googleMapsService.etaUpdate$.subscribe(eta => {
      if (eta) {
        this.currentEtaMins.set(eta.durationMins);
        this.remainingDistanceKm.set(eta.distanceKm);
      }
    });
  }

  // ── Fetch Drivers dynamically via backend ──────────────────────────────────
  async fetchDrivers(): Promise<void> {
    let centerLat = 12.9716;
    let centerLng = 77.5946;

    if (this.pickupAddress) {
      try {
        const pickupLoc = await this.googleMapsService.geocode(this.pickupAddress);
        centerLat = pickupLoc.lat;
        centerLng = pickupLoc.lng;
      } catch {}
    }

    this.mobilityService.loadNearbyDrivers(centerLat, centerLng, this.selectedCategory).subscribe(drivers => {
      let filtered = drivers;
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        filtered = drivers.filter(d => d.name.toLowerCase().includes(q) || d.vehicle.toLowerCase().includes(q));
      }
      this.activeDrivers.set(filtered);
    });
  }

  // ── 60 FPS Continuous Vehicle Interpolation & Heading Animation ───────────
  private smoothAnimateToNewLocation(targetLoc: LocationCoordinates): void {
    const startLoc = this.currentAnimatedLocation();
    const startTime = performance.now();
    const duration = 2500;

    const heading = targetLoc.heading !== undefined
      ? targetLoc.heading
      : this.googleMapsService.calculateHeading(startLoc, targetLoc);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const interpolated = this.googleMapsService.interpolatePosition(startLoc, targetLoc, easeProgress);
      interpolated.heading = heading;
      interpolated.speed = targetLoc.speed || Math.round(25 + Math.sin(now / 300) * 15);

      this.currentAnimatedLocation.set(interpolated);

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      }
    };

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(animate);
  }

  // ── Native Directions ───────────────────────────────────────────────────
  private async loadDirectionsOnNativeMap(): Promise<void> {
    if (!this.pickupAddress || !this.dropAddress) return;

    try {
      const pickupLoc = await this.googleMapsService.geocode(this.pickupAddress);
      const dropLoc = await this.googleMapsService.geocode(this.dropAddress);

      if (this.map && typeof google !== 'undefined') {
        this.map.panTo(pickupLoc);

        if (this.directionsRenderer) {
          const service = new google.maps.DirectionsService();
          service.route({
            origin: new google.maps.LatLng(pickupLoc.lat, pickupLoc.lng),
            destination: new google.maps.LatLng(dropLoc.lat, dropLoc.lng),
            travelMode: google.maps.TravelMode.DRIVING
          }, (result: any, status: any) => {
            if (status === 'OK') {
              this.directionsRenderer.setDirections(result);
            }
          });
        }
      }

      const routeResp = await this.googleMapsService.getRoute(pickupLoc, dropLoc);
      if (routeResp && routeResp.pickupToDrop) {
        this.currentEtaMins.set(Math.round(routeResp.pickupToDrop.durationMins));
        this.remainingDistanceKm.set(Number(routeResp.pickupToDrop.durationMins ? routeResp.pickupToDrop.distanceKm.toFixed(1) : 0));
      }
    } catch (err) {
      console.warn('Geocoding route calculation error:', err);
    }
  }

  // ── Route Replay Scrubber Controls ──────────────────────────────────────
  public startRouteReplay(): void {
    this.isReplayMode.set(true);
    this.googleMapsService.getRouteReplay('TRIP-998241').subscribe(pts => {
      this.replayPoints = pts;
      this.replayCurrentStep.set(0);
      this.playReplay();
    });
  }

  public playReplay(): void {
    if (this.replayIntervalId) clearInterval(this.replayIntervalId);
    this.isReplayPlaying.set(true);

    const speedMs = Math.max(100, Math.round(1000 / this.replaySpeed()));
    this.replayIntervalId = setInterval(() => {
      const nextStep = this.replayCurrentStep() + 1;
      if (nextStep >= this.replayPoints.length) {
        this.pauseReplay();
        return;
      }
      this.replayCurrentStep.set(nextStep);
      const pt = this.replayPoints[nextStep];
      this.currentAnimatedLocation.set({
        lat: pt.lat,
        lng: pt.lng,
        heading: pt.heading,
        speed: pt.speed
      });
      this.routeProgressPercent.set(Math.round((nextStep / (this.replayPoints.length - 1)) * 100));
    }, speedMs);
  }

  public pauseReplay(): void {
    this.isReplayPlaying.set(false);
    if (this.replayIntervalId) clearInterval(this.replayIntervalId);
  }

  public toggleReplayPlay(): void {
    if (this.isReplayPlaying()) {
      this.pauseReplay();
    } else {
      this.playReplay();
    }
  }

  public seekReplay(step: number): void {
    this.replayCurrentStep.set(step);
    if (this.replayPoints[step]) {
      const pt = this.replayPoints[step];
      this.currentAnimatedLocation.set({
        lat: pt.lat,
        lng: pt.lng,
        heading: pt.heading,
        speed: pt.speed
      });
      this.routeProgressPercent.set(Math.round((step / (this.replayPoints.length - 1)) * 100));
    }
  }

  public setReplaySpeed(spd: number): void {
    this.replaySpeed.set(spd);
    if (this.isReplayPlaying()) {
      this.playReplay();
    }
  }

  public stopReplay(): void {
    this.pauseReplay();
    this.isReplayMode.set(false);
    this.fetchDrivers();
  }

  // ── Map User Interactions ────────────────────────────────────────────────
  getX(driver: DriverProfile, index: number): number {
    const basePositions = [220, 310, 420, 510, 590];
    const offset = Math.sin(Date.now() / 1000 + index) * 15;
    return (basePositions[index % basePositions.length] || 400) + offset;
  }

  getY(driver: DriverProfile, index: number): number {
    const basePositions = [320, 240, 260, 180, 150];
    const offset = Math.cos(Date.now() / 1000 + index) * 15;
    return (basePositions[index % basePositions.length] || 250) + offset;
  }

  selectDriver(driver: DriverProfile): void {
    this.selectedDriver.set(driver);
    this.smoothAnimateToNewLocation({
      lat: driver.lat,
      lng: driver.lng,
      heading: 90,
      speed: 35
    });
  }

  toggleTraffic(): void {
    this.showTraffic.update(val => !val);
    if (this.map && this.trafficLayerInstance) {
      if (this.showTraffic()) {
        this.trafficLayerInstance.setMap(this.map);
      } else {
        this.trafficLayerInstance.setMap(null);
      }
    }
  }

  resetView(): void {
    this.selectedDriver.set(null);
    if (this.map && typeof google !== 'undefined') {
      this.map.panTo({ lat: 12.9716, lng: 77.5946 });
      this.map.setZoom(14);
    }
  }
}
