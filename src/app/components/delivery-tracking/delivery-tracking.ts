import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { environment } from 'src/environment/environment';
import { GoogleMapsService, FareCalculation, RideBooking, LocationCoordinates } from 'src/app/services/google-maps.service';
import { TableColumn } from 'src/utils/mat-table/mat-table';

declare var google: any;
declare var L: any;

@Component({
  selector: 'app-delivery-tracking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatRadioModule
  ],
  templateUrl: './delivery-tracking.html',
  styleUrl: './delivery-tracking.scss',
})
export class DeliveryTracking implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef;

  googleMapsApiKey = environment.googleMapsApiKey || 'YOUR_GOOGLE_MAPS_API_KEY';
  
  // App Mode Switcher (Rapido Ride Booking | Swiggy Food Delivery | Fleet Admin Console | Driver Console)
  appMode: 'RIDE_BOOKING' | 'FOOD_DELIVERY' | 'FLEET_ADMIN' | 'DRIVER_CONSOLE' = 'RIDE_BOOKING';
  
  mapEngine: 'LEAFLET' | 'GOOGLE' = 'LEAFLET';
  mapTileStyle: 'STREET' | 'DARK' | 'SATELLITE' = 'STREET';
  showTrafficLayer = true;
  showHeatmap = false;
  showGeofence = true;

  googleMapInstance: any = null;
  googleTrafficLayer: any = null;
  leafletMapInstance: any = null;
  leafletTileLayer: any = null;
  leafletMarker: any = null;
  leafletCompletedPolyline: any = null;
  leafletRemainingPolyline: any = null;
  leafletGeofenceCircle: any = null;

  isSimulating = true;
  simulationInterval: any = null;
  currentWaypointIndex = 2;

  // Selected Vehicle Type for Ride & Logistics Booking
  selectedVehicle: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK' = 'BIKE';
  surgeMultiplier = 1.25; // Dynamic peak hours surge

  pickupInput = 'Central City Hub, 5th Avenue, NY';
  destinationInput = '742 Evergreen Terrace, Brooklyn, NY';
  pickupCoords: LocationCoordinates = { lat: 40.7278, lng: -74.0260, address: 'Central City Hub' };
  destCoords: LocationCoordinates = { lat: 40.7030, lng: -73.9910, address: '742 Evergreen Terrace' };

  estimatedFare: FareCalculation | null = null;
  activeBookingState: 'IDLE' | 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'IN_TRANSIT' | 'ARRIVED' | 'COMPLETED' = 'IDLE';

  // Driver Console State
  isDriverOnline = true;
  driverTripStatus: 'OFFLINE' | 'IDLE' | 'REQUEST_RECEIVED' | 'ACCEPTED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' = 'IDLE';

  streetWaypoints: [number, number][] = [
    [40.7278, -74.0260],
    [40.7240, -74.0210],
    [40.7200, -74.0160],
    [40.7160, -74.0110],
    [40.7128, -74.0060],
    [40.7095, -74.0010],
    [40.7060, -73.9960],
    [40.7030, -73.9910]
  ];

  tableColumns: TableColumn[] = [
    { columnDef: 'invoice_no', header: 'Trip / Invoice' },
    { columnDef: 'delivery_boy_name', header: 'Agent / Driver' },
    { columnDef: 'coordinates', header: 'Coordinates', type: 'custom' },
    { columnDef: 'created_at', header: 'Dispatched At' },
    { columnDef: 'status', header: 'Status', type: 'badge' }
  ];

  trackings: any[] = [];
  orders: any[] = [];
  employees: any[] = [];
  companies: any[] = [];
  branches: any[] = [];

  trackingForm: FormGroup;
  locationForm: FormGroup;

  activeTab: 'MAP' | 'LIST' = 'MAP';
  statusFilter: 'ALL' | 'ON_THE_WAY' | 'DELIVERED' = 'ALL';
  searchQuery = '';

  showStartForm = false;
  showLocationForm = false;
  selectedTrackingId: number | null = null;
  selectedActiveTrack: any = null;
  loading = false;
  currentUser: any = null;
  detectedEmployee: any = null;

  mockLiveDeliveries = [
    {
      id: 101,
      invoice_no: 'TRIP-2026-089',
      delivery_boy_name: 'Alex Vance (Rapido Captain)',
      delivery_boy_phone: '+1 (555) 234-5678',
      delivery_boy_avatar: 'linear-gradient(135deg,#6366f1,#a855f7)',
      vehicle_no: 'NY-882-TRK (Yamaha FZ)',
      vehicle_type: 'BIKE',
      speed: '42 km/h',
      eta: '12 mins',
      distance_remaining: '2.4 km',
      latitude: 40.7128,
      longitude: -74.0060,
      customer_name: 'Sophia Bennett',
      customer_address: '742 Evergreen Terrace, Brooklyn, NY',
      status: 'ON_THE_WAY',
      created_at: 'Today 10:15 AM'
    },
    {
      id: 102,
      invoice_no: 'SWIGGY-2026-092',
      delivery_boy_name: 'Marcus Chen (Zomato Partner)',
      delivery_boy_phone: '+1 (555) 876-5432',
      delivery_boy_avatar: 'linear-gradient(135deg,#10b981,#059669)',
      vehicle_no: 'NY-419-EXP (Honda Activa)',
      vehicle_type: 'AUTO',
      speed: '38 km/h',
      eta: '18 mins',
      distance_remaining: '4.8 km',
      latitude: 40.7306,
      longitude: -73.9352,
      customer_name: 'David Miller',
      customer_address: '120 Broadway Ave, Manhattan, NY',
      status: 'MOVING',
      created_at: 'Today 11:30 AM'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService,
    public mapsService: GoogleMapsService,
    private cdr: ChangeDetectorRef
  ) {
    this.trackingForm = this.fb.group({
      order_id: ['', Validators.required],
      delivery_boy_id: ['', Validators.required],
      company_id: ['', Validators.required],
      branch_id: ['', Validators.required],
      latitude: [40.7128, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [-74.0060, [Validators.required, Validators.min(-180), Validators.max(180)]]
    });

    this.locationForm = this.fb.group({
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.selectedActiveTrack = this.mockLiveDeliveries[0];
    this.updateFareEstimate();
    this.loadInitialData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMapEngine();
    }, 300);
  }

  ngOnDestroy() {
    this.stopLiveSimulation();
    if (this.leafletMapInstance) {
      this.leafletMapInstance.remove();
    }
  }

  setAppMode(mode: 'RIDE_BOOKING' | 'FOOD_DELIVERY' | 'FLEET_ADMIN' | 'DRIVER_CONSOLE') {
    this.appMode = mode;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.leafletMapInstance) {
        this.leafletMapInstance.invalidateSize();
      }
    }, 200);
  }

  selectVehicle(vehicle: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK') {
    this.selectedVehicle = vehicle;
    this.updateFareEstimate();
  }

  updateFareEstimate() {
    const distanceKm = 4.2;
    const durationMins = 14;
    this.estimatedFare = this.mapsService.calculateFare(
      distanceKm,
      durationMins,
      this.selectedVehicle,
      this.surgeMultiplier
    );
  }

  getFareForVehicle(type: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV' | 'DELIVERY_TRUCK'): number {
    return this.mapsService.calculateFare(4.2, 14, type, this.surgeMultiplier).totalFare;
  }

  confirmBooking() {
    this.activeBookingState = 'SEARCHING_DRIVER';
    this.alert.success("Searching for nearby Rapido & Swiggy Captains...");
    setTimeout(() => {
      this.activeBookingState = 'DRIVER_ASSIGNED';
      this.alert.success("Driver Assigned! Alex Vance is on the way to pickup location.");
    }, 2500);
  }

  initMapEngine() {
    this.mapsService.loadSdk().then(() => {
      if (this.mapsService.isSdkLoaded()) {
        this.mapEngine = 'GOOGLE';
        this.initGoogleMaps();
      } else {
        this.mapEngine = 'LEAFLET';
        this.initLeafletMap();
      }
    });
  }

  initLeafletMap() {
    if (typeof L !== 'undefined') {
      this.renderLeafletMap();
      this.startLiveSimulation();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        this.renderLeafletMap();
        this.startLiveSimulation();
      };
      document.head.appendChild(script);
    }
  }

  renderLeafletMap() {
    if (!this.mapContainerRef || !this.mapContainerRef.nativeElement || typeof L === 'undefined') return;

    if (this.leafletMapInstance) {
      this.leafletMapInstance.remove();
      this.leafletMapInstance = null;
    }

    const active = this.selectedActiveTrack || this.mockLiveDeliveries[0];
    const currentPos = this.streetWaypoints[this.currentWaypointIndex];

    this.leafletMapInstance = L.map(this.mapContainerRef.nativeElement).setView(currentPos, 14);

    this.updateLeafletTileLayer();

    // Geofencing Circle Boundary (2.5 km Delivery Zone)
    if (this.showGeofence) {
      this.leafletGeofenceCircle = L.circle([40.7128, -74.0060], {
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        radius: 2500
      }).addTo(this.leafletMapInstance);
      this.leafletGeofenceCircle.bindPopup('<b>Active Operational Geofence Boundary (2.5 KM Radius)</b>');
    }

    // Delivery Vehicle Marker with Live Pulsing Radar Aura
    const vehicleIconChar = this.selectedVehicle === 'BIKE' ? '🏍️' : this.selectedVehicle === 'AUTO' ? '🛺' : '🚗';
    const vehicleHtml = `<div class="leaflet-agent-pin"><div class="pulse-ring"></div><div class="pin-inner">${vehicleIconChar}</div></div>`;
    const agentIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: vehicleHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.leafletMarker = L.marker(currentPos, { icon: agentIcon }).addTo(this.leafletMapInstance);
    this.leafletMarker.bindPopup(`<b>${active.delivery_boy_name}</b><br>Vehicle: ${active.vehicle_no}<br>Status: ${active.status}`).openPopup();

    // Central Pickup / Warehouse Hub Pin
    const warehouseIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="leaflet-dest-pin warehouse">🏬</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    L.marker(this.streetWaypoints[0], { icon: warehouseIcon }).addTo(this.leafletMapInstance).bindPopup('<b>Pickup Hub / Restaurant</b>');

    // Customer Destination Pin
    const customerIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="leaflet-dest-pin customer">📍</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const destPos = this.streetWaypoints[this.streetWaypoints.length - 1];
    L.marker(destPos, { icon: customerIcon }).addTo(this.leafletMapInstance).bindPopup(`<b>Customer: ${active.customer_name}</b><br>${active.customer_address}`);

    this.drawRoutePolylines();
    this.cdr.detectChanges();
  }

  updateLeafletTileLayer() {
    if (!this.leafletMapInstance || typeof L === 'undefined') return;

    if (this.leafletTileLayer) {
      this.leafletMapInstance.removeLayer(this.leafletTileLayer);
    }

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let subdomains = 'abcd';

    if (this.mapTileStyle === 'DARK') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (this.mapTileStyle === 'SATELLITE') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = '';
    }

    this.leafletTileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Esri',
      subdomains: subdomains,
      maxZoom: 19
    }).addTo(this.leafletMapInstance);
  }

  setTileStyle(style: 'STREET' | 'DARK' | 'SATELLITE') {
    this.mapTileStyle = style;
    if (this.mapEngine === 'LEAFLET') {
      this.updateLeafletTileLayer();
    }
  }

  toggleTrafficLayer() {
    this.showTrafficLayer = !this.showTrafficLayer;
    if (this.mapEngine === 'GOOGLE' && this.googleMapInstance) {
      if (this.showTrafficLayer) {
        if (!this.googleTrafficLayer) this.googleTrafficLayer = new google.maps.TrafficLayer();
        this.googleTrafficLayer.setMap(this.googleMapInstance);
      } else if (this.googleTrafficLayer) {
        this.googleTrafficLayer.setMap(null);
      }
    } else {
      this.alert.info(`Traffic congestion layer ${this.showTrafficLayer ? 'Enabled' : 'Disabled'}`);
    }
  }

  toggleGeofence() {
    this.showGeofence = !this.showGeofence;
    if (this.leafletMapInstance && this.leafletGeofenceCircle) {
      if (this.showGeofence) {
        this.leafletGeofenceCircle.addTo(this.leafletMapInstance);
      } else {
        this.leafletMapInstance.removeLayer(this.leafletGeofenceCircle);
      }
    }
  }

  drawRoutePolylines() {
    if (!this.leafletMapInstance || typeof L === 'undefined') return;

    if (this.leafletCompletedPolyline) this.leafletMapInstance.removeLayer(this.leafletCompletedPolyline);
    if (this.leafletRemainingPolyline) this.leafletMapInstance.removeLayer(this.leafletRemainingPolyline);

    const completedPath = this.streetWaypoints.slice(0, this.currentWaypointIndex + 1);
    const remainingPath = this.streetWaypoints.slice(this.currentWaypointIndex);

    // Traveled Route (Solid Emerald Line)
    this.leafletCompletedPolyline = L.polyline(completedPath, { color: '#10b981', weight: 5, opacity: 0.9 }).addTo(this.leafletMapInstance);

    // Remaining Route (Dashed Violet Line)
    this.leafletRemainingPolyline = L.polyline(remainingPath, { color: '#6366f1', weight: 4, opacity: 0.8, dashArray: '8, 8' }).addTo(this.leafletMapInstance);
  }

  startLiveSimulation() {
    this.stopLiveSimulation();
    this.isSimulating = true;
    this.simulationInterval = setInterval(() => {
      this.advanceVehicleAlongStreet();
    }, 2500);
  }

  stopLiveSimulation() {
    this.isSimulating = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  toggleSimulation() {
    if (this.isSimulating) {
      this.stopLiveSimulation();
      this.alert.info("Live street motion paused");
    } else {
      this.startLiveSimulation();
      this.alert.success("Live GPS movement resumed");
    }
  }

  advanceVehicleAlongStreet() {
    if (this.currentWaypointIndex < this.streetWaypoints.length - 1) {
      this.currentWaypointIndex++;
    } else {
      this.currentWaypointIndex = 0;
    }

    const nextPos = this.streetWaypoints[this.currentWaypointIndex];
    if (this.selectedActiveTrack) {
      this.selectedActiveTrack.latitude = nextPos[0];
      this.selectedActiveTrack.longitude = nextPos[1];

      const remDistanceKm = ((this.streetWaypoints.length - 1 - this.currentWaypointIndex) * 0.4).toFixed(1);
      const remEtaMins = Math.ceil((this.streetWaypoints.length - 1 - this.currentWaypointIndex) * 2.5);

      this.selectedActiveTrack.distance_remaining = `${remDistanceKm} km`;
      this.selectedActiveTrack.eta = `${remEtaMins} mins`;
      this.selectedActiveTrack.speed = `${38 + Math.floor(Math.random() * 8)} km/h`;

      // Broadcast coordinate update via WebSocket service
      this.mapsService.broadcastDriverLocation('DRV-882', nextPos[0], nextPos[1], 'ONLINE');
    }

    if (this.mapEngine === 'LEAFLET' && this.leafletMapInstance && this.leafletMarker) {
      this.leafletMarker.setLatLng(nextPos);
      this.leafletMapInstance.panTo(nextPos, { animate: true, duration: 1.2 });
      this.drawRoutePolylines();
    } else if (this.mapEngine === 'GOOGLE' && this.googleMapInstance) {
      this.googleMapInstance.panTo({ lat: nextPos[0], lng: nextPos[1] });
    }

    this.cdr.detectChanges();
  }

  initGoogleMaps() {
    if (typeof google !== 'undefined' && google.maps) {
      this.renderGoogleMap();
    } else {
      this.mapEngine = 'LEAFLET';
      this.initLeafletMap();
    }
  }

  renderGoogleMap() {
    if (!this.mapContainerRef || !this.mapContainerRef.nativeElement) return;
    const active = this.selectedActiveTrack || this.mockLiveDeliveries[0];
    const centerPos = { lat: active.latitude || 40.7128, lng: active.longitude || -74.0060 };

    this.googleMapInstance = new google.maps.Map(this.mapContainerRef.nativeElement, {
      zoom: 14,
      center: centerPos,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
      ]
    });

    if (this.showTrafficLayer) {
      this.googleTrafficLayer = new google.maps.TrafficLayer();
      this.googleTrafficLayer.setMap(this.googleMapInstance);
    }

    new google.maps.Marker({
      position: centerPos,
      map: this.googleMapInstance,
      title: active.delivery_boy_name || 'Delivery Agent'
    });
  }

  selectTrackForMap(track: any) {
    this.selectedActiveTrack = track;
    this.currentWaypointIndex = 2;
    const lat = track.latitude || 40.7128;
    const lng = track.longitude || -74.0060;

    if (this.mapEngine === 'LEAFLET' && this.leafletMapInstance) {
      this.leafletMapInstance.setView([lat, lng], 14);
      if (this.leafletMarker) {
        this.leafletMarker.setLatLng([lat, lng]);
      }
      this.drawRoutePolylines();
    } else if (this.mapEngine === 'GOOGLE' && this.googleMapInstance) {
      this.googleMapInstance.setCenter({ lat, lng });
    }
  }

  get filteredTrackings() {
    let list = this.trackings.length > 0 ? this.trackings : this.mockLiveDeliveries;
    if (this.statusFilter !== 'ALL') {
      list = list.filter(t => t.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.invoice_no || '').toLowerCase().includes(q) ||
        (t.delivery_boy_name || '').toLowerCase().includes(q) ||
        (t.customer_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  loadInitialData() {
    this.loading = true;

    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => { this.branches = res?.data || []; }
    });

    this.commonService.getApi('orders').subscribe({
      next: (res: any) => { this.orders = res?.data || []; }
    });

    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employees = res?.data || [];
        this.detectEmployeeMapping();
        this.loadTrackings();
      },
      error: () => { this.loading = false; }
    });
  }

  detectEmployeeMapping() {
    if (!this.currentUser) return;

    const mapped = this.employees.find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase()
    );

    if (mapped) {
      this.detectedEmployee = mapped;
      this.trackingForm.patchValue({
        delivery_boy_id: mapped.id,
        company_id: mapped.company_id || (mapped.company?.id),
        branch_id: mapped.branch_id || (mapped.branch?.id)
      });
    }
  }

  loadTrackings() {
    this.commonService.getApi('delivery-tracking').subscribe({
      next: (res: any) => {
        const rawList = res?.data || [];
        if (rawList.length > 0) {
          this.trackings = rawList.map((item: any) => {
            const dboy = this.employees.find(e => e.id === item.delivery_boy_id);
            const order = this.orders.find(o => o.id === item.order_id);
            return {
              ...item,
              delivery_boy_name: dboy ? dboy.name : `ID: ${item.delivery_boy_id}`,
              invoice_no: order ? order.invoice_no : `Order #${item.order_id}`,
              created_at: item.created_at ? new Date(item.created_at).toLocaleString() : '-'
            };
          });
          this.selectedActiveTrack = this.trackings[0];
          if (this.leafletMapInstance) {
            this.renderLeafletMap();
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tracking data:', err);
        this.loading = false;
      }
    });
  }

  toggleStartForm() {
    this.showStartForm = !this.showStartForm;
    this.showLocationForm = false;
    if (!this.showStartForm) {
      this.trackingForm.reset({
        latitude: 40.7128,
        longitude: -74.0060
      });
      this.detectEmployeeMapping();
    }
  }

  startDelivery() {
    if (this.trackingForm.invalid) {
      this.trackingForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.trackingForm.value;

    this.commonService.postApi('delivery-tracking/start', payload).subscribe({
      next: () => {
        this.alert.success("Delivery dispatched successfully");
        this.toggleStartForm();
        this.loadTrackings();
      },
      error: (err) => {
        console.error('Failed to start delivery:', err);
        this.alert.error("Failed to start: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  openLocationDialog(row: any) {
    this.selectedTrackingId = row.id;
    this.showLocationForm = true;
    this.showStartForm = false;
    this.locationForm.patchValue({
      latitude: row.latitude,
      longitude: row.longitude
    });
  }

  cancelLocationUpdate() {
    this.showLocationForm = false;
    this.selectedTrackingId = null;
    this.locationForm.reset();
  }

  submitLocationUpdate() {
    if (this.locationForm.invalid || !this.selectedTrackingId) {
      this.locationForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const original = this.trackings.find(t => t.id === this.selectedTrackingId) || this.selectedActiveTrack;
    if (!original) return;

    const payload = {
      order_id: original.order_id,
      delivery_boy_id: original.delivery_boy_id,
      company_id: original.company_id,
      branch_id: original.branch_id,
      latitude: Number(this.locationForm.value.latitude),
      longitude: Number(this.locationForm.value.longitude),
      status: original.status
    };

    this.commonService.postApi('delivery-tracking/location', payload).subscribe({
      next: () => {
        this.alert.success("Live location updated");
        this.cancelLocationUpdate();
        this.loadTrackings();
      },
      error: (err) => {
        console.error('Failed to update location:', err);
        this.alert.error("Location update failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  markAsDelivered(row: any) {
    this.alert.confirm("Are you sure you want to mark this trip/order as Completed?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.postApi(`delivery-tracking/delivered/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Trip completed!");
            this.loadTrackings();
          },
          error: (err) => {
            console.error('Failed to mark delivered:', err);
            this.alert.error("Mark delivered failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }

  deleteTracking(row: any) {
    this.alert.confirm("Are you sure you want to delete this assignment?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.deleteApi(`delivery-tracking/${row.id}`).subscribe({
          next: () => {
            this.alert.success("Tracking record deleted");
            this.loadTrackings();
          },
          error: (err) => {
            console.error('Failed to delete tracking:', err);
            this.alert.error("Delete failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }
}
