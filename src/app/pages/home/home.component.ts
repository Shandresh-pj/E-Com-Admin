import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  AfterViewInit,
  PLATFORM_ID,
  Inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { SubscriptionService, SubscriptionPlan } from 'src/app/services/subscription.service';

// ── Interfaces ──────────────────────────────────────────────────────────────
export interface RoleApp {
  id: string;
  name: string;
  subtitle: string;
  platform: string;
  status: 'live' | 'soon';
  color: string;
  features: string[];
}

export interface DesktopScreen {
  id: string;
  name: string;
  desc: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, MaterialModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  Math = Math;

  // ── Nav & UI State ─────────────────────────────────────────────────────
  isScrolled     = signal(false);
  mobileMenuOpen = signal(false);

  // ── Animated Counters ─────────────────────────────────────────────────
  usersCount    = signal(0);
  productsCount = signal(0);
  invoicesCount = signal(0);
  uptimeVal     = signal(0);
  countersStarted = false;

  // ── FAQ ───────────────────────────────────────────────────────────────
  openFaqIndex = signal<number | null>(null);

  // ── Billing ───────────────────────────────────────────────────────────
  billingCycle = signal<'Monthly' | 'Yearly'>('Monthly');

  // ── ROI Calculator ────────────────────────────────────────────────────
  branchesCount = signal<number>(4);
  ordersCount   = signal<number>(1500);

  formatIndianRupees(val: number): string {
    if (isNaN(val) || val === null || val === undefined) return '0';
    const rounded = Math.round(val);
    const str = rounded.toString();
    if (str.length <= 3) return str;
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return formattedOther + ',' + lastThree;
  }

  formatNumberWithCommas(val: number): string {
    if (isNaN(val) || val === null || val === undefined) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  estimatedSavings = computed(() => {
    const branchSavings = this.branchesCount() * 24000;
    const orderSavings  = this.ordersCount() * 15;
    return branchSavings + orderSavings;
  });

  formattedEstimatedSavings = computed(() => {
    return this.formatIndianRupees(this.estimatedSavings());
  });

  updateBranches(event: any) { this.branchesCount.set(Number(event.target.value)); }
  updateOrders(event: any)   { this.ordersCount.set(Number(event.target.value)); }

  toggleBilling() {
    this.billingCycle.set(this.billingCycle() === 'Monthly' ? 'Yearly' : 'Monthly');
  }

  // ── Pricing Carousel ──────────────────────────────────────────────────
  activePriceSlide = signal(1);
  pricingPlans     = signal<SubscriptionPlan[]>([]);

  nextPriceSlide() {
    const len = this.pricingPlans().length || 4;
    this.activePriceSlide.set((this.activePriceSlide() + 1) % len);
  }
  prevPriceSlide() {
    const len = this.pricingPlans().length || 4;
    this.activePriceSlide.set((this.activePriceSlide() - 1 + len) % len);
  }
  goToPriceSlide(index: number) {
    this.activePriceSlide.set(index);
    if (isPlatformBrowser(this.platformId)) {
      const grid = document.querySelector('.hm__pricing-grid');
      if (grid) {
        const cards = grid.querySelectorAll('.hm__price-card');
        if (cards[index]) {
          cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }

  openSubscriptionModal(plan: SubscriptionPlan, mode: 'trial' | 'pay') {
    this.router.navigate(['/contact'], {
      queryParams: { plan_id: plan.id, plan_name: plan.name, cycle: this.billingCycle(), mode }
    });
  }

  // ── Typing Headline ───────────────────────────────────────────────────
  typedText = signal('');
  private headlines    = ['Inventory', 'Invoices', 'Analytics', 'Workflows', 'Customers', 'AI Insights'];
  private headlineIndex = 0;
  private charIndex     = 0;
  private isDeleting    = false;

  private observers: IntersectionObserver[] = [];
  private intervals: any[] = [];
  private scrollListener!: () => void;

  // ══════════════════════════════════════════════════════════════════════
  // NEW: ROLE-BASED APPLICATION ECOSYSTEM
  // ══════════════════════════════════════════════════════════════════════
  activeRole = signal<string>('customer');

  roleApps: RoleApp[] = [
    {
      id: 'customer',
      name: 'Customer',
      subtitle: 'Shopping Experience',
      platform: 'iOS & Android',
      status: 'soon',
      color: '#6366f1',
      features: [
        'Browse & search products with AI recommendations',
        'Seamless checkout with multiple payment options',
        'Real-time order tracking & delivery updates',
        'Loyalty rewards & personalized offers',
        'In-app support & order history'
      ]
    },
    {
      id: 'admin',
      name: 'Admin',
      subtitle: 'Enterprise Management',
      platform: 'Web & Desktop',
      status: 'live',
      color: '#8b5cf6',
      features: [
        'Role-based access control & audit logs',
        'Full multi-branch control & analytics',
        'Gemini AI sales forecasting & inventory insights',
        'Global product catalog & pricing management',
        'Multi-tenant enterprise configuration'
      ]
    },
    {
      id: 'branch',
      name: 'Branch',
      subtitle: 'Branch Operations',
      platform: 'Web & Mobile',
      status: 'live',
      color: '#06b6d4',
      features: [
        'Branch-level dashboard & operations',
        'Local inventory management & transfers',
        'POS billing & invoice generation',
        'Staff scheduling & attendance tracking',
        'Branch performance reports'
      ]
    },
    {
      id: 'employee',
      name: 'Employee',
      subtitle: 'Workforce Tools',
      platform: 'Mobile App',
      status: 'soon',
      color: '#10b981',
      features: [
        'View payslips & document center',
        'Attendance check-in & shift tracking',
        'Task assignment & workflow status',
        'Leave management & request history',
        'Internal team communication'
      ]
    },
    {
      id: 'delivery',
      name: 'Delivery',
      subtitle: 'Logistics & Routing',
      platform: 'Mobile App',
      status: 'soon',
      color: '#f59e0b',
      features: [
        'Optimized delivery route navigation',
        'Real-time order pickup & drop-off tracking',
        'Digital proof of delivery with e-signature',
        'Earnings dashboard & payout history',
        'In-app communication with customers'
      ]
    },
    {
      id: 'doctor',
      name: 'Doctor',
      subtitle: 'Healthcare Portal',
      platform: 'Web & Mobile',
      status: 'soon',
      color: '#f43f5e',
      features: [
        'Patient appointment management',
        'Digital prescriptions & consultation notes',
        'Medical history & patient records',
        'Pharmacy integration & medicine ordering',
        'Telemedicine & video consultation'
      ]
    }
  ];

  setActiveRole(roleId: string) {
    this.activeRole.set(roleId);
  }

  getActiveRoleApp(): RoleApp {
    return this.roleApps.find(r => r.id === this.activeRole()) || this.roleApps[0];
  }

  // ══════════════════════════════════════════════════════════════════════
  // NEW: DESKTOP SOFTWARE SCREENS
  // ══════════════════════════════════════════════════════════════════════
  activeDesktopScreen = signal<string>('dashboard');

  desktopScreens: DesktopScreen[] = [
    { id: 'dashboard', name: 'Dashboard', desc: 'Real-time analytics & KPIs across all branches' },
    { id: 'inventory', name: 'Inventory', desc: 'Multi-warehouse stock management & transfers' },
    { id: 'billing',   name: 'Billing',   desc: 'GST-compliant invoicing & POS terminal' },
    { id: 'reports',   name: 'Reports',   desc: 'Advanced business intelligence & exports' },
    { id: 'workforce', name: 'Workforce', desc: 'HR, payroll, attendance & scheduling' },
  ];

  setDesktopScreen(id: string) {
    this.activeDesktopScreen.set(id);
  }

  // ── Platform Capabilities ─────────────────────────────────────────────
  capabilities = [
    { title: 'AI-Powered Intelligence', desc: '18 embedded AI modules for descriptions, forecasting, anomaly detection, and automated insights — powered by Google Gemini.', items: ['Smart product descriptions', 'Demand forecasting', 'Anomaly detection'] },
    { title: 'Multi-Branch Architecture', desc: 'Manage unlimited branches, warehouses, and regions from a single unified platform with consolidated reporting.', items: ['Unlimited branches', 'Inter-branch transfers', 'Consolidated reports'] },
    { title: 'Real-Time Telemetry', desc: 'Live WebSocket-powered dashboards with instant stock updates, order processing, and role-synchronized state.', items: ['Socket.IO live sync', 'Real-time inventory', 'Live order tracking'] },
    { title: 'Enterprise Security', desc: 'Zero-trust authentication with granular RBAC, immutable audit logs, and encrypted data at rest and in transit.', items: ['Role-based access', 'Full audit trail', 'AES-256 encryption'] },
    { title: 'Workflow Automation', desc: 'Multi-level approval chains, configurable business rules, automated notifications, and trigger-based actions.', items: ['Approval workflows', 'Push notifications', 'Automated triggers'] },
    { title: 'Deep Analytics', desc: 'Real-time dashboards with revenue tracking, inventory health, employee performance, and AI-generated insights.', items: ['Revenue analytics', 'Inventory health', 'PDF/Excel exports'] },
  ];

  // ── How It Works ─────────────────────────────────────────────────────
  workflowSteps = [
    { num: '01', title: 'Set Up Your Company',  desc: 'Create your company profile, branches, and configure tax settings in minutes.' },
    { num: '02', title: 'Import Your Products',  desc: 'Upload your catalog via CSV or add products manually with AI-assisted descriptions.' },
    { num: '03', title: 'Onboard Your Team',     desc: 'Invite employees, assign roles, and configure granular access permissions.' },
    { num: '04', title: 'Start Operations',      desc: 'Manage orders, track inventory, and generate invoices automatically.' },
    { num: '05', title: 'Gain AI Insights',      desc: 'Let the AI analyze your business and surface actionable growth insights.' },
    { num: '06', title: 'Scale Effortlessly',    desc: 'Add branches, integrate payment gateways, and grow without limits.' },
  ];

  // ── Testimonials ──────────────────────────────────────────────────────
  testimonials = [
    { name: 'Arjun Mehta',    role: 'Head of Operations',  company: 'NovaTech Retail',        text: 'This platform completely transformed our inventory management. The AI-powered insights alone save us 30+ hours per week.', initials: 'AM', color: '#6366f1' },
    { name: 'Priya Sharma',   role: 'CEO',                  company: 'Kiran Fashion House',    text: 'The invoice generation and approval workflow replaced 3 separate legacy systems. Outstanding product.',                    initials: 'PS', color: '#8b5cf6' },
    { name: 'Rajan Rao',      role: 'IT Director',          company: 'GlobalMart Solutions',   text: 'Enterprise-grade security, beautiful UI, and the Gemini AI integration is next level. Our team adopted it in days.',       initials: 'RR', color: '#06b6d4' },
    { name: 'Deepa Nair',     role: 'Product Manager',      company: 'Shopwise India',         text: 'Migrated from SAP to this platform. Saved 60% on licensing costs and the feature set is comparable.',                     initials: 'DN', color: '#10b981' },
    { name: 'Vikram Singh',   role: 'Finance Controller',   company: 'Pinnacle Distributors',  text: 'Real-time analytics and AI invoice summaries have completely eliminated manual reporting. A game-changer.',               initials: 'VS', color: '#f59e0b' },
    { name: 'Anita Kulkarni', role: 'Operations Manager',   company: 'BrightPath Commerce',    text: 'Best platform for managing multiple branches. The role-based access control is exactly what we needed.',                  initials: 'AK', color: '#ec4899' },
  ];

  // ── FAQs ──────────────────────────────────────────────────────────────
  faqs: FaqItem[] = [
    { q: 'How does the AI product description generator work?', a: 'Our platform integrates with Google Gemini AI. Simply enter a product name and category, and the AI generates a professional, SEO-optimized description in seconds.' },
    { q: 'Is my business data secure?',                         a: 'All data is encrypted at rest and in transit using AES-256 and TLS 1.3. We use Neon Serverless PostgreSQL with enterprise-grade security and daily automated backups.' },
    { q: 'Can I manage multiple warehouses and branches?',      a: 'Yes. The platform supports unlimited branches. Stock, transfers, orders, and employees can be managed independently per branch with consolidated reporting.' },
    { q: 'What roles and permissions does the platform support?', a: 'Full RBAC with Super Admin, Admin, Branch Manager, Employee, and Customer roles. Custom permissions can be configured per module per user.' },
    { q: 'Does it support multi-currency and GST/tax invoicing?', a: 'Yes. Invoice settings support multiple tax configurations, discount types, and can be customized per company and branch.' },
    { q: 'Can I migrate from my existing ERP system?',          a: 'Our team provides a full data migration service. CSV import tools are available for products, customers, suppliers, and historical orders.' },
    { q: 'Is there a free trial?',                              a: 'Yes, all plans include a 14-day free trial with full feature access. No credit card required.' },
    { q: 'What kind of support is available?',                  a: 'We offer 24/7 email support, priority chat support on Professional and Enterprise plans, and dedicated account managers on Enterprise.' },
    { q: 'Does the platform have a mobile app?',                a: 'Native mobile applications for Customer, Employee, and Delivery roles are launching soon. The admin panel is fully responsive for mobile use.' },
    { q: 'Can I use my own domain for the admin panel?',        a: 'Yes. Enterprise plan customers can configure custom domains with SSL certificates managed by our infrastructure team.' },
  ];

  // ── Trusted Companies ─────────────────────────────────────────────────
  companies = [
    'NovaTech', 'Kiran Fashion', 'GlobalMart', 'Shopwise', 'Pinnacle', 'BrightPath',
    'IndiaMart Pro', 'UrbanRetail', 'SkyCommerce', 'PeakDistributors', 'QuickMart', 'ZenithSales',
  ];

  // ── Platform Modules ──────────────────────────────────────────────────
  modules = [
    { title: 'Products',       desc: 'Manage catalog, variants, and SKUs',          color: '#6366f1', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { title: 'Orders',         desc: 'Track, process, and fulfill orders live',     color: '#06b6d4', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { title: 'Inventory',      desc: 'Real-time multi-branch stock levels',        color: '#10b981', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { title: 'Invoices',       desc: 'Generate, send, and track GST invoices',      color: '#8b5cf6', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { title: 'Customers',      desc: 'CRM, purchasing history, and loyalty',       color: '#f59e0b', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5 5 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { title: 'Employees',      desc: 'HR, payroll, shifts, and attendance',         color: '#ec4899', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { title: 'Analytics',      desc: 'Deep BI dashboards and sales forecasts',     color: '#3b82f6', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { title: 'Payments',       desc: 'Payment tracking and Razorpay sync',         color: '#14b8a6', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { title: 'Approvals',      desc: 'Multi-level corporate approval chains',      color: '#a855f7', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { title: 'Notifications',  desc: 'Real-time WebSocket alerts & push messages', color: '#f43f5e', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { title: 'Roles & Access', desc: 'Granular RBAC for security & compliance',    color: '#6366f1', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { title: 'Audit Logs',     desc: 'Immutable logs for every system action',     color: '#64748b', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  private fallbackPricingPlans: SubscriptionPlan[] = [
    {
      id: 'starter', name: 'Starter', badge: 'CORE ESSENTIALS',
      monthlyPrice: 2999, yearlyPrice: 2399, description: 'Perfect for single-branch businesses getting started.',
      features: [
        { text: '1 Branch / Warehouse', highlight: false },
        { text: 'Up to 5 Users', highlight: false },
        { text: 'Products & Inventory', highlight: false },
        { text: 'Invoice Generation (GST)', highlight: true },
        { text: 'Basic Analytics', highlight: false },
        { text: 'Email Support', highlight: false },
      ],
      hasFreeTrial: true, freeTrialDays: 14, recommended: false,
      razorpayPlanIdMonthly: '', razorpayPlanIdYearly: ''
    },
    {
      id: 'professional', name: 'Professional', badge: 'MOST POPULAR',
      monthlyPrice: 7999, yearlyPrice: 6399, description: 'For growing businesses with multiple branches.',
      features: [
        { text: 'Up to 5 Branches', highlight: false },
        { text: 'Up to 25 Users', highlight: false },
        { text: 'Full ERP Suite (12 Modules)', highlight: true },
        { text: 'AI Product Descriptions (Gemini)', highlight: true },
        { text: 'Advanced Analytics & Reports', highlight: true },
        { text: 'Razorpay Payment Integration', highlight: false },
        { text: 'Priority Chat Support', highlight: false },
      ],
      hasFreeTrial: true, freeTrialDays: 14, recommended: true,
      razorpayPlanIdMonthly: '', razorpayPlanIdYearly: ''
    },
    {
      id: 'enterprise', name: 'Enterprise', badge: 'ENTERPRISE SCALE',
      monthlyPrice: 0, yearlyPrice: 0, description: 'Custom pricing for large-scale multi-brand operations.',
      features: [
        { text: 'Unlimited Branches', highlight: true },
        { text: 'Unlimited Users', highlight: true },
        { text: 'All 18 AI & ERP Modules', highlight: true },
        { text: 'White-label & Custom Domain', highlight: false },
        { text: 'Dedicated Account Manager', highlight: false },
        { text: 'SLA 99.99% Guarantee', highlight: false },
        { text: '24/7 Premium Support', highlight: false },
      ],
      hasFreeTrial: false, freeTrialDays: 0, recommended: false,
      razorpayPlanIdMonthly: '', razorpayPlanIdYearly: ''
    }
  ];

  ngOnInit() {
    this.pricingPlans.set(this.fallbackPricingPlans);

    this.subscriptionService.getPlans().subscribe({
      next: (plans) => {
        if (plans && plans.length > 0) {
          this.pricingPlans.set(plans);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Fallback plans already set
      }
    });

    if (!isPlatformBrowser(this.platformId)) return;

    // Scroll listener
    this.scrollListener = () => { this.isScrolled.set(window.scrollY > 60); };
    window.addEventListener('scroll', this.scrollListener, { passive: true });

    // Typing animation
    this.startTyping();

    // Auto-start counters
    setTimeout(() => {
      if (!this.countersStarted) {
        this.countersStarted = true;
        this.startCounters();
      }
    }, 400);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initScrollReveal();
  }

  // ── Scroll Reveal ─────────────────────────────────────────────────────
  private initScrollReveal() {
    const targets = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            const sid = (entry.target as HTMLElement).dataset['reveal'];
            if ((sid === 'stats' || sid === 'telemetry') && !this.countersStarted) {
              this.countersStarted = true;
              this.startCounters();
            }
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );
    targets.forEach((el) => {
      obs.observe(el);
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.95) {
        el.classList.add('revealed');
        const sid = (el as HTMLElement).dataset['reveal'];
        if ((sid === 'stats' || sid === 'telemetry') && !this.countersStarted) {
          this.countersStarted = true;
          this.startCounters();
        }
      }
    });
    this.observers.push(obs);
  }

  // ── Counter Animations ────────────────────────────────────────────────
  private startCounters() {
    this.animateCounter(this.usersCount,    12000,    1800);
    this.animateCounter(this.productsCount, 850000,   2000);
    this.animateCounter(this.invoicesCount, 3200000,  2200);
    this.animateDecimalCounter(this.uptimeVal, 99.98, 1500);
    this.cdr.markForCheck();
  }

  private animateCounter(sig: ReturnType<typeof signal<number>>, target: number, duration: number) {
    const start = performance.now();
    this.ngZone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        sig.set(Math.round(eased * target));
        this.cdr.detectChanges();
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  private animateDecimalCounter(sig: ReturnType<typeof signal<number>>, target: number, duration: number) {
    const start = performance.now();
    this.ngZone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        sig.set(Number((progress * target).toFixed(2)));
        this.cdr.detectChanges();
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ── Typing Animation ──────────────────────────────────────────────────
  private startTyping() {
    this.ngZone.runOutsideAngular(() => {
      const typeStep = () => {
        const current = this.headlines[this.headlineIndex];
        if (!this.isDeleting) {
          this.typedText.set(current.substring(0, this.charIndex + 1));
          this.charIndex++;
          if (this.charIndex === current.length) {
            this.isDeleting = true;
            const t = setTimeout(typeStep, 2000);
            this.intervals.push(t);
            this.cdr.detectChanges();
            return;
          }
        } else {
          this.typedText.set(current.substring(0, this.charIndex - 1));
          this.charIndex--;
          if (this.charIndex === 0) {
            this.isDeleting = false;
            this.headlineIndex = (this.headlineIndex + 1) % this.headlines.length;
          }
        }
        this.cdr.detectChanges();
        const delay = this.isDeleting ? 60 : 100;
        const t = setTimeout(typeStep, delay);
        this.intervals.push(t);
      };
      typeStep();
    });
  }

  // ── Mobile Menu ───────────────────────────────────────────────────────
  toggleMobileMenu() {
    const next = !this.mobileMenuOpen();
    this.mobileMenuOpen.set(next);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = next ? 'hidden' : '';
    }
  }

  scrollToSection(event: Event, sectionId: string) {
    if (event) event.preventDefault();
    if (this.mobileMenuOpen()) this.toggleMobileMenu();
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ── FAQ ───────────────────────────────────────────────────────────────
  toggleFaq(i: number) { this.openFaqIndex.set(this.openFaqIndex() === i ? null : i); }
  isFaqOpen(i: number): boolean { return this.openFaqIndex() === i; }

  // ── Helpers ───────────────────────────────────────────────────────────
  formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M+';
    if (n >= 1000)    return (n / 1000).toFixed(0) + 'K+';
    return n.toString() + '+';
  }

  trackByIndex(i: number) { return i; }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollListener);
      document.body.style.overflow = '';
    }
    this.observers.forEach(o => o.disconnect());
    this.intervals.forEach(t => clearTimeout(t));
  }
}
