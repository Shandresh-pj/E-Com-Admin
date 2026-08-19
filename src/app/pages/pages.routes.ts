import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { RoleGuard } from '../Securities/Guard/role.guard';

export const PagesRoutes: Routes = [

  // Dashboard — universal for all authenticated users (RoleGuard always allows /dashboard)
  {
    path: '',
    component: StarterComponent,
    canActivate: [RoleGuard],
    title: 'Dashboard Cockpit',
    data: {
      title: 'Dashboard Cockpit',
      urls: [{ title: 'Dashboard' }, { title: 'Starter' }]
    }
  },

  // ─── Mobility & Fleet (under /dashboard prefix) ───────────────────────────
  {
    path: 'mobility-dashboard',
    loadComponent: () => import('../components/mobility-dashboard/mobility-dashboard.component').then(m => m.MobilityDashboardComponent),
    canActivate: [RoleGuard],
    title: 'Mobility Cockpit',
    data: {
      title: 'Mobility Cockpit',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Mobility' }]
    }
  },
  {
    path: 'ride-booking',
    loadComponent: () => import('../components/ride-booking/ride-booking.component').then(m => m.RideBookingComponent),
    canActivate: [RoleGuard],
    title: 'Ride Booking',
    data: {
      title: 'Ride Booking',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Ride Booking' }]
    }
  },
  {
    path: 'car-rental',
    loadComponent: () => import('../components/car-rental/car-rental.component').then(m => m.CarRentalComponent),
    canActivate: [RoleGuard],
    title: 'Car Rentals',
    data: {
      title: 'Car Rentals',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Car Rentals' }]
    }
  },
  {
    path: 'parcel-logistics',
    loadComponent: () => import('../components/parcel-logistics/parcel-logistics.component').then(m => m.ParcelLogisticsComponent),
    canActivate: [RoleGuard],
    title: 'Parcel Logistics',
    data: {
      title: 'Parcel Logistics',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Logistics' }]
    }
  },
  {
    path: 'fleet-management',
    loadComponent: () => import('../components/fleet-management/fleet-management.component').then(m => m.FleetManagementComponent),
    canActivate: [RoleGuard],
    title: 'Fleet Management',
    data: {
      title: 'Fleet Management',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Fleet' }]
    }
  },
  {
    path: 'corporate-transport',
    loadComponent: () => import('../components/corporate-transport/corporate-transport.component').then(m => m.CorporateTransportComponent),
    canActivate: [RoleGuard],
    title: 'Corporate Transit',
    data: {
      title: 'Corporate Transit',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Corporate Transit' }]
    }
  },
  {
    path: 'live-tracking',
    loadComponent: () => import('../components/live-tracking/live-tracking.component').then(m => m.LiveTrackingComponent),
    canActivate: [RoleGuard],
    title: 'Live Tracking',
    data: {
      title: 'Live Tracking',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Live Tracking' }]
    }
  },
  {
    path: 'vehicle-driver-verification',
    loadComponent: () => import('../components/vehicle-driver-verification/vehicle-driver-verification.component').then(m => m.VehicleDriverVerificationComponent),
    canActivate: [RoleGuard],
    title: 'Driver Verification',
    data: {
      title: 'Driver Verification',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Driver Verification' }]
    }
  },

  // ─── Subscription & Billing (under /dashboard prefix) ────────────────────
  {
    path: 'subscription-coupons',
    loadComponent: () => import('./subscription-coupons/subscription-coupons').then(m => m.SubscriptionCouponsComponent),
    canActivate: [RoleGuard],
    title: 'Subscription Coupons',
    data: {
      title: 'Subscription Coupons',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Coupons' }]
    }
  },
  {
    path: 'billing-history',
    loadComponent: () => import('./billing-history/billing-history').then(m => m.BillingHistoryComponent),
    canActivate: [RoleGuard],
    title: 'Billing History',
    data: {
      title: 'Billing History',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Billing' }]
    }
  },
  {
    path: 'checkout',
    loadComponent: () => import('../components/standard-checkout/standard-checkout').then(m => m.StandardCheckoutComponent),
    canActivate: [RoleGuard],
    title: 'Checkout',
    data: {
      title: 'Checkout',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Checkout' }]
    }
  }

];