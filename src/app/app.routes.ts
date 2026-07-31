import { Routes } from '@angular/router';

import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';

import { AuthGuard } from './Securities/Guard/auth.guard';
import { NonAuthGuard } from './Securities/Guard/nonauth.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';

import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './pages/contact/contact.component';

export const routes: Routes = [

  // default landing page
  {
    path: '',
    component: HomeComponent,
    title: 'Enterprise ERP & Mobility OS',
    pathMatch: 'full'
  },

  {
    path: 'home',
    component: HomeComponent,
    title: 'Enterprise ERP & Mobility OS'
  },

  {
    path: 'contact',
    component: ContactComponent,
    title: 'Workspace Access & Support'
  },

  // Public pages
  {
    path: 'authentication',
    component: BlankComponent,
    canMatch: [NonAuthGuard],

    loadChildren: () =>
      import('./pages/authentication/authentication.routes')
        .then(m => m.AuthenticationRoutes)
  },

  // Protected pages
  {
    path: '',
    component: FullComponent,
    canMatch: [AuthGuard],

    children: [

      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes')
            .then(m => m.PagesRoutes)
      },

      {
        path: 'mobility-dashboard',
        loadComponent: () =>
          import('./components/mobility-dashboard/mobility-dashboard.component')
            .then(m => m.MobilityDashboardComponent),
        title: 'Mobility Cockpit'
      },

      {
        path: 'ride-booking',
        loadComponent: () =>
          import('./components/ride-booking/ride-booking.component')
            .then(m => m.RideBookingComponent),
        title: 'Ride Booking'
      },

      {
        path: 'car-rental',
        loadComponent: () =>
          import('./components/car-rental/car-rental.component')
            .then(m => m.CarRentalComponent),
        title: 'Car Rentals'
      },

      {
        path: 'parcel-logistics',
        loadComponent: () =>
          import('./components/parcel-logistics/parcel-logistics.component')
            .then(m => m.ParcelLogisticsComponent),
        title: 'Parcel Logistics'
      },

      {
        path: 'fleet-management',
        loadComponent: () =>
          import('./components/fleet-management/fleet-management.component')
            .then(m => m.FleetManagementComponent),
        title: 'Fleet Management'
      },

      {
        path: 'corporate-transport',
        loadComponent: () =>
          import('./components/corporate-transport/corporate-transport.component')
            .then(m => m.CorporateTransportComponent),
        title: 'Corporate Transit'
      },

      {
        path: 'live-tracking',
        loadComponent: () =>
          import('./components/live-tracking/live-tracking.component')
            .then(m => m.LiveTrackingComponent),
        title: 'Live Tracking'
      },

      {
        path: 'vehicle-driver-verification',
        loadComponent: () =>
          import('./components/vehicle-driver-verification/vehicle-driver-verification.component')
            .then(m => m.VehicleDriverVerificationComponent),
        title: 'Driver Verification'
      },

      {
        path: 'subscription-plans',
        loadComponent: () => 
          import('./pages/subscription-plans/subscription-plans.component')
            .then(m => m.SubscriptionPlansComponent),
        title: 'Subscription Plans'
      },

      {
        path: 'billing-history',
        loadComponent: () => 
          import('./pages/billing-history/billing-history')
            .then(m => m.BillingHistoryComponent),
        title: 'Billing History'
      },

      {
        path: 'subscription-coupons',
        loadComponent: () => 
          import('./pages/subscription-coupons/subscription-coupons')
            .then(m => m.SubscriptionCouponsComponent),
        title: 'Subscription Coupons'
      },

      {
        path: 'checkout',
        loadComponent: () => 
          import('./components/standard-checkout/standard-checkout')
            .then(m => m.StandardCheckoutComponent),
        title: 'Checkout'
      },

      {
        path: '',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes')
            .then(m => m.UiComponentsRoutes)
      },

      {
        path: '',
        loadChildren: () =>
          import('./pages/extra/extra.routes')
            .then(m => m.ExtraRoutes)
      },

      {
        path: '',
        loadChildren: () =>
          import('./components/components.routes')
            .then(m => m.ComponentsRoutes)
      },

    ]
  },

  {
    path: 'unauthorized',
    component: FullComponent,
    canMatch: [AuthGuard],
    children: [
      { path: '', component: UnauthorizedComponent }
    ]
  },

  {
    path: '**',
    redirectTo: 'authentication/login'
  }

];