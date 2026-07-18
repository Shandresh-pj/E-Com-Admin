import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';

export const PagesRoutes: Routes = [

  {
    path:'',
    component: StarterComponent,
    title: 'Dashboard & Executive Analytics Cockpit',

    data:{

      title:'Dashboard & Executive Analytics Cockpit',

      urls:[
        {
          title:'Dashboard'
        },
        {
          title: 'Starter Page'
        }
      ]

    }
  },

  {
    path: 'subscription-coupons',
    loadComponent: () => import('./subscription-coupons/subscription-coupons').then(m => m.SubscriptionCouponsComponent),
    title: 'Subscription Coupons Management',
    data: {
      title: 'Subscription Coupons Management',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Coupons' }]
    }
  },

  {
    path: 'billing-history',
    loadComponent: () => import('./billing-history/billing-history').then(m => m.BillingHistoryComponent),
    title: 'Billing & Invoice History',
    data: {
      title: 'Billing & Invoice History',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Billing' }]
    }
  },

  {
    path: 'checkout',
    loadComponent: () => import('../components/standard-checkout/standard-checkout').then(m => m.StandardCheckoutComponent),
    title: 'Standard Payment Checkout',
    data: {
      title: 'Standard Payment Checkout',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Checkout' }]
    }
  }

];