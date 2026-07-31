export type VehicleType = 'Passenger' | 'Logistics' | 'Rental';

export interface VehicleCategory {
  id: string;
  name: string;
  type: VehicleType;
  icon: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  capacity: number | string;
  luggage: string;
  eta: string;
  dynamicMultiplier: number;
  isEV: boolean;
  tag: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicle: string;
  category: string;
  lat: number;
  lng: number;
  status: 'AVAILABLE' | 'IN_TRIP' | 'OFFLINE';
  avatar: string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceKm: number;
  distanceFare: number;
  durationMin: number;
  timeFare: number;
  surgeMultiplier: number;
  tollCharges: number;
  nightCharge: number;
  taxGst: number;
  discount: number;
  totalFare: number;
}

export interface FareEstimateResponse {
  category: VehicleCategory;
  breakdown: FareBreakdown;
}

export interface BookingRequest {
  serviceType: 'Ride Booking' | 'Taxi Booking' | 'Car Rental' | 'Parcel Logistics' | 'Freight Logistics' | 'Corporate Travel';
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropLocation: string;
  vehicleCategory: string;
  vehicleName: string;
  distanceKm: number;
  estimatedMinutes: number;
  fare: number;
  paymentMethod: 'Wallet' | 'UPI / Card' | 'Cash' | 'Corporate Invoice';
  notes?: string;
  packageType?: string;
}

export interface ActiveBooking {
  id: string;
  serviceType: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  dropLocation: string;
  vehicleCategory: string;
  vehicleName: string;
  driver: DriverProfile;
  distanceKm: number;
  estimatedMinutes: number;
  fare: number;
  status: 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  otp?: string;
  createdAt: string;
}

export interface RentalCar {
  id: string;
  title: string;
  type: 'Self Drive' | 'Chauffeur Driven';
  category: 'Hatchback' | 'Sedan' | 'SUV' | 'Luxury' | 'Van/Bus';
  hourlyRate: number;
  dailyRate: number;
  fuelIncluded: boolean;
  transmission: 'Automatic' | 'Manual';
  seating: number;
  image: string;
  status: 'Available' | 'Reserved';
}

export interface DashboardMetrics {
  totalBookingsToday: number;
  activeRidesNow: number;
  totalRevenueToday: number;
  activeDriversOnline: number;
  fleetUtilizationRate: string;
  customerSatisfaction: string;
  logisticsCompletedKm: number;
  co2SavedEvKm: number;
}

export interface RevenueChartPoint {
  month: string;
  ride: number;
  rental: number;
  logistics: number;
}

export interface DashboardStatsResponse {
  role: string;
  metrics: DashboardMetrics;
  liveDispatchQueue: ActiveBooking[];
  revenueChart: RevenueChartPoint[];
}

export type DashboardStats = DashboardStatsResponse;
