import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';

export const PagesRoutes: Routes = [

  {
    path:'',
    component: StarterComponent,
    title: 'Dashboard Cockpit',

    data:{

      title:'Dashboard Cockpit',

      urls:[
        {
          title:'Dashboard'
        },
        {
          title: 'Starter'
        }
      ]

    }
  },

  {
    path: 'mobility-dashboard',
    loadComponent: () => import('../components/mobility-dashboard/mobility-dashboard.component').then(m => m.MobilityDashboardComponent),
    title: 'Mobility Cockpit',
    data: {
      title: 'Mobility Cockpit',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Mobility' }]
    }
  },

  {
    path: 'ride-booking',
    loadComponent: () => import('../components/ride-booking/ride-booking.component').then(m => m.RideBookingComponent),
    title: 'Ride Booking',
    data: {
      title: 'Ride Booking',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Ride Booking' }]
    }
  },

  {
    path: 'car-rental',
    loadComponent: () => import('../components/car-rental/car-rental.component').then(m => m.CarRentalComponent),
    title: 'Car Rentals',
    data: {
      title: 'Car Rentals',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Car Rentals' }]
    }
  },

  {
    path: 'parcel-logistics',
    loadComponent: () => import('../components/parcel-logistics/parcel-logistics.component').then(m => m.ParcelLogisticsComponent),
    title: 'Parcel Logistics',
    data: {
      title: 'Parcel Logistics',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Logistics' }]
    }
  },

  {
    path: 'fleet-management',
    loadComponent: () => import('../components/fleet-management/fleet-management.component').then(m => m.FleetManagementComponent),
    title: 'Fleet Management',
    data: {
      title: 'Fleet Management',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Fleet' }]
    }
  },

  {
    path: 'corporate-transport',
    loadComponent: () => import('../components/corporate-transport/corporate-transport.component').then(m => m.CorporateTransportComponent),
    title: 'Corporate Transit',
    data: {
      title: 'Corporate Transit',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Corporate Transit' }]
    }
  },

  {
    path: 'live-tracking',
    loadComponent: () => import('../components/live-tracking/live-tracking.component').then(m => m.LiveTrackingComponent),
    title: 'Live Tracking',
    data: {
      title: 'Live Tracking',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Live Tracking' }]
    }
  },

  {
    path: 'vehicle-driver-verification',
    loadComponent: () => import('../components/vehicle-driver-verification/vehicle-driver-verification.component').then(m => m.VehicleDriverVerificationComponent),
    title: 'Driver Verification',
    data: {
      title: 'Driver Verification',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Driver Verification' }]
    }
  },

  {
    path: 'subscription-coupons',
    loadComponent: () => import('./subscription-coupons/subscription-coupons').then(m => m.SubscriptionCouponsComponent),
    title: 'Subscription Coupons',
    data: {
      title: 'Subscription Coupons',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Coupons' }]
    }
  },

  {
    path: 'billing-history',
    loadComponent: () => import('./billing-history/billing-history').then(m => m.BillingHistoryComponent),
    title: 'Billing History',
    data: {
      title: 'Billing History',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Billing' }]
    }
  },

  {
    path: 'checkout',
    loadComponent: () => import('../components/standard-checkout/standard-checkout').then(m => m.StandardCheckoutComponent),
    title: 'Checkout',
    data: {
      title: 'Checkout',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Checkout' }]
    }
  }

];