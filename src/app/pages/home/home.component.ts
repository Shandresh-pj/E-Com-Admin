import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  Inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { SubscriptionService, SubscriptionPlan } from 'src/app/services/subscription.service';
import { SubscriptionCheckoutModalComponent } from 'src/app/components/subscription-checkout-modal/subscription-checkout-modal.component';

export interface AiFeature {
  icon: string;
  title: string;
  desc: string;
  tag: string;
}

export interface Module {
  icon: string;
  title: string;
  desc: string;
  gradient: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  text: string;
  rating: number;
  initials: string;
  color: string;
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
  // Scroll state
  isScrolled = signal(false);
  // Mobile menu state
  mobileMenuOpen = signal(false);

  // Animated counters
  usersCount = signal(0);
  productsCount = signal(0);
  invoicesCount = signal(0);
  uptimeVal = signal(0);
  countersStarted = false;

  // FAQ
  openFaqIndex = signal<number | null>(null);

  // Billing Cycle (Monthly vs Yearly)
  billingCycle = signal<'Monthly' | 'Yearly'>('Monthly');

  toggleBilling() {
    this.billingCycle.set(this.billingCycle() === 'Monthly' ? 'Yearly' : 'Monthly');
  }

  // Owl-Carousel Pricing state
  activePriceSlide = signal(1); // 0: Starter, 1: Professional (default), 2: Business, 3: Enterprise
  pricingPlans = signal<SubscriptionPlan[]>([]);

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
  }

  openSubscriptionModal(plan: SubscriptionPlan, mode: 'trial' | 'pay') {
    this.dialog.open(SubscriptionCheckoutModalComponent, {
      width: '580px',
      maxWidth: '95vw',
      panelClass: 'cyber-modal-overlay',
      data: {
        plan,
        billingCycle: this.billingCycle(),
        initialMode: mode
      }
    });
  }

  // Visibility tracking
  visibleSections = signal<Set<string>>(new Set());

  // Interactive Command Center Tab & Analytics Showcase
  activeHeroTab = signal<'live' | 'branches' | 'ai'>('live');
  liveRevenue = signal(428900);
  liveOrders = signal(1284);
  liveNotification = signal<string | null>(null);

  liveTransactions = signal([
    { id: '#INV-8941', branch: 'Mumbai HQ', amount: '₹42,500', status: 'Paid', time: 'Just now', icon: '💳', color: '#10b981' },
    { id: '#ORD-3819', branch: 'Delhi Hub', amount: '₹18,200', status: 'Processing', time: '2m ago', icon: '📦', color: '#3b82f6' },
    { id: '#STK-1049', branch: 'Bengaluru', amount: '98.8% Stock', status: 'AI Audited', time: '4m ago', icon: '🤖', color: '#8b5cf6' },
    { id: '#INV-8940', branch: 'Hyderabad', amount: '₹64,000', status: 'Paid', time: '7m ago', icon: '✅', color: '#10b981' },
  ]);

  branchesData = [
    { name: 'Mumbai HQ', orders: '482', revenue: '₹1.84L', status: '99.9% SLA', healthy: true },
    { name: 'Delhi NCR Hub', orders: '310', revenue: '₹1.12L', status: '99.4% SLA', healthy: true },
    { name: 'Bengaluru Tech Hub', orders: '240', revenue: '₹88.4K', status: '100% SLA', healthy: true },
    { name: 'Hyderabad Branch', orders: '152', revenue: '₹44.1K', status: '98.9% SLA', healthy: true },
  ];

  setHeroTab(tab: 'live' | 'branches' | 'ai') {
    this.activeHeroTab.set(tab);
  }

  simulateLiveOrder() {
    const branches = ['Mumbai HQ', 'Delhi Hub', 'Bengaluru Hub', 'Pune Branch', 'Chennai Hub'];
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const amt = Math.floor(Math.random() * 45000) + 5000;
    const newTx = {
      id: `#INV-${Math.floor(1000 + Math.random() * 9000)}`,
      branch,
      amount: `₹${amt.toLocaleString()}`,
      status: 'Paid Live',
      time: 'Just now',
      icon: '⚡',
      color: '#10b981'
    };

    this.liveRevenue.update(v => v + amt);
    this.liveOrders.update(v => v + 1);
    this.liveTransactions.update(list => [newTx, ...list.slice(0, 3)]);
    this.liveNotification.set(`Live Transaction Processed: ${newTx.id} (${newTx.amount})`);
    setTimeout(() => this.liveNotification.set(null), 3500);
  }

  triggerAiAudit() {
    this.liveNotification.set('🤖 AI Autonomous Stock & Fraud Audit Complete — 0 Anomalies Found across 6 Branches.');
    setTimeout(() => this.liveNotification.set(null), 4000);
  }

  // Typing headline
  typedText = signal('');
  private headlines = ['Inventory', 'Invoices', 'Analytics', 'Workflows', 'Customers', 'AI Insights'];
  private headlineIndex = 0;
  private charIndex = 0;
  private isDeleting = false;

  private observers: IntersectionObserver[] = [];
  private intervals: any[] = [];
  private scrollListener!: () => void;

  aiFeatures: AiFeature[] = [
    { icon: '✍️', title: 'Description Generator', desc: 'Generate compelling product descriptions instantly', tag: 'GPT-4o' },
    { icon: '🏷️', title: 'Smart Tag Engine', desc: 'AI-suggested tags for maximum discoverability', tag: 'NLP' },
    { icon: '📦', title: 'Category Classifier', desc: 'Automatically classify products to correct categories', tag: 'ML' },
    { icon: '🧾', title: 'Invoice Summarizer', desc: 'Concise summaries for complex invoice documents', tag: 'LLM' },
    { icon: '📊', title: 'Sales Forecasting', desc: 'Predict revenue trends with neural-network models', tag: 'Forecast' },
    { icon: '💬', title: 'Customer Reply AI', desc: 'Draft professional responses in seconds', tag: 'GenAI' },
    { icon: '📧', title: 'Email Composer', desc: 'Context-aware business email generation', tag: 'GPT' },
    { icon: '🔍', title: 'Smart Search', desc: 'Semantic search across all your business data', tag: 'Vector' },
    { icon: '🔄', title: 'Return Handler', desc: 'Automated return approval recommendations', tag: 'Rules AI' },
    { icon: '📈', title: 'Dashboard Insights', desc: 'Natural-language KPI summaries every morning', tag: 'Analytics AI' },
    { icon: '🌐', title: 'Auto Translator', desc: 'Translate product listings to 40+ languages', tag: 'Translate' },
    { icon: '⭐', title: 'Review Analyzer', desc: 'Sentiment analysis on customer feedback at scale', tag: 'Sentiment' },
    { icon: '🛒', title: 'Purchase Advisor', desc: 'Reorder suggestions based on stock velocity', tag: 'Optimizer' },
    { icon: '🤖', title: 'AI Chat Assistant', desc: 'Embedded assistant for all internal queries', tag: 'Chat' },
    { icon: '🔔', title: 'Anomaly Alerts', desc: 'Real-time fraud and anomaly detection', tag: 'Detection' },
    { icon: '📋', title: 'Order Summarizer', desc: 'Instant order status summaries for customers', tag: 'Summary' },
    { icon: '💡', title: 'Inventory Advisor', desc: 'Dead-stock and overstock prevention insights', tag: 'Insight' },
    { icon: '📝', title: 'Grammar Corrector', desc: 'Refine all business text automatically', tag: 'Polish' },
  ];

  modules: Module[] = [
    { icon: '📦', title: 'Products', desc: 'Manage catalog, variants, and attributes', gradient: 'from-indigo-500 to-violet-500' },
    { icon: '🛒', title: 'Orders', desc: 'Track, process, and fulfill orders', gradient: 'from-blue-500 to-cyan-500' },
    { icon: '🏭', title: 'Inventory', desc: 'Real-time stock across all branches', gradient: 'from-emerald-500 to-teal-500' },
    { icon: '🧾', title: 'Invoices', desc: 'Generate, send, and track invoices', gradient: 'from-amber-500 to-orange-500' },
    { icon: '🤝', title: 'Suppliers', desc: 'Vendor management and purchase orders', gradient: 'from-rose-500 to-pink-500' },
    { icon: '👥', title: 'Customers', desc: 'CRM, history, and loyalty tracking', gradient: 'from-violet-500 to-purple-500' },
    { icon: '👔', title: 'Employees', desc: 'HR, payroll, shifts, and attendance', gradient: 'from-sky-500 to-blue-500' },
    { icon: '🏢', title: 'Warehouse', desc: 'Multi-branch stock and transfers', gradient: 'from-teal-500 to-cyan-500' },
    { icon: '📊', title: 'Analytics', desc: 'Deep business intelligence dashboards', gradient: 'from-indigo-500 to-blue-500' },
    { icon: '💳', title: 'Payments', desc: 'Payment tracking and reconciliation', gradient: 'from-green-500 to-emerald-500' },
    { icon: '📈', title: 'Sales', desc: 'Pipeline, targets, and commissions', gradient: 'from-orange-500 to-red-500' },
    { icon: '📉', title: 'Purchases', desc: 'Purchase order and receiving workflow', gradient: 'from-purple-500 to-indigo-500' },
    { icon: '📋', title: 'Reports', desc: 'Scheduled and on-demand PDF reports', gradient: 'from-cyan-500 to-teal-500' },
    { icon: '🔔', title: 'Notifications', desc: 'Real-time alerts and push notifications', gradient: 'from-yellow-500 to-amber-500' },
    { icon: '✅', title: 'Approvals', desc: 'Multi-level approval workflows', gradient: 'from-lime-500 to-green-500' },
    { icon: '🛡️', title: 'Roles & Access', desc: 'Granular RBAC for all users', gradient: 'from-red-500 to-rose-500' },
    { icon: '⚙️', title: 'Settings', desc: 'Company, branch, and system config', gradient: 'from-slate-400 to-slate-600' },
    { icon: '📝', title: 'Audit Logs', desc: 'Full audit trail for every action', gradient: 'from-violet-500 to-pink-500' },
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Arjun Mehta',
      role: 'Head of Operations',
      company: 'NovaTech Retail',
      text: 'This platform completely transformed our inventory management. The AI-powered insights alone save us 30+ hours per week.',
      rating: 5,
      initials: 'AM',
      color: '#6366f1',
    },
    {
      name: 'Priya Sharma',
      role: 'CEO',
      company: 'Kiran Fashion House',
      text: 'The invoice generation and approval workflow replaced 3 separate legacy systems. Outstanding product.',
      rating: 5,
      initials: 'PS',
      color: '#8b5cf6',
    },
    {
      name: 'Rajan Rao',
      role: 'IT Director',
      company: 'GlobalMart Solutions',
      text: 'Enterprise-grade security, beautiful UI, and the Gemini AI integration is next level. Our team adopted it in days.',
      rating: 5,
      initials: 'RR',
      color: '#06b6d4',
    },
    {
      name: 'Deepa Nair',
      role: 'Product Manager',
      company: 'Shopwise India',
      text: 'Migrated from SAP to this platform. Saved 60% on licensing costs and the feature set is comparable.',
      rating: 5,
      initials: 'DN',
      color: '#10b981',
    },
    {
      name: 'Vikram Singh',
      role: 'Finance Controller',
      company: 'Pinnacle Distributors',
      text: 'Real-time analytics and AI invoice summaries have completely eliminated manual reporting. A game-changer.',
      rating: 5,
      initials: 'VS',
      color: '#f59e0b',
    },
    {
      name: 'Anita Kulkarni',
      role: 'Operations Manager',
      company: 'BrightPath Commerce',
      text: 'Best platform for managing multiple branches. The role-based access control is exactly what we needed.',
      rating: 5,
      initials: 'AK',
      color: '#ec4899',
    },
  ];

  faqs: FaqItem[] = [
    { q: 'How does the AI product description generator work?', a: 'Our platform integrates with Google Gemini AI. Simply enter a product name and category, and the AI generates a professional, SEO-optimized description in seconds.' },
    { q: 'Is my business data secure?', a: 'All data is encrypted at rest and in transit using AES-256 and TLS 1.3. We use Neon Serverless PostgreSQL with enterprise-grade security and daily automated backups.' },
    { q: 'Can I manage multiple warehouses and branches?', a: 'Yes. The platform supports unlimited branches. Stock, transfers, orders, and employees can be managed independently per branch with consolidated reporting.' },
    { q: 'What roles and permissions does the platform support?', a: 'Full RBAC with Super Admin, Admin, Shopkeeper, Employee, and Customer roles. Custom permissions can be configured per module per user.' },
    { q: 'Does it support multi-currency and GST/tax invoicing?', a: 'Yes. Invoice settings support multiple tax configurations, discount types, and can be customized per company and branch.' },
    { q: 'Can I migrate from my existing ERP system?', a: 'Our team provides a full data migration service. CSV import tools are available for products, customers, suppliers, and historical orders.' },
    { q: 'Is there a free trial?', a: 'Yes, all plans include a 14-day free trial with full feature access. No credit card required.' },
    { q: 'What kind of support is available?', a: 'We offer 24/7 email support, priority chat support on Professional and Enterprise plans, and dedicated account managers on Enterprise.' },
    { q: 'Does the platform have a mobile app?', a: 'A mobile-responsive web app is available now. Native iOS and Android apps are on our 2026 roadmap.' },
    { q: 'Can I use my own domain for the admin panel?', a: 'Yes. Enterprise plan customers can configure custom domains with SSL certificates managed by our infrastructure team.' },
  ];

  companies = [
    'NovaTech', 'Kiran Fashion', 'GlobalMart', 'Shopwise', 'Pinnacle', 'BrightPath',
    'IndiaMart Pro', 'UrbanRetail', 'SkyCommerce', 'PeakDistributors', 'QuickMart', 'ZenithSales',
  ];

  workflowSteps = [
    { num: '01', title: 'Set Up Your Company', desc: 'Create your company profile, branches, and configure tax settings in minutes.' },
    { num: '02', title: 'Import Your Products', desc: 'Upload your catalog via CSV or add products manually with AI-assisted descriptions.' },
    { num: '03', title: 'Onboard Your Team', desc: 'Invite employees, assign roles, and configure granular access permissions.' },
    { num: '04', title: 'Start Taking Orders', desc: 'Manage orders, track inventory, and generate invoices automatically.' },
    { num: '05', title: 'Gain AI Insights', desc: 'Let the AI analyze your business and surface actionable growth insights.' },
    { num: '06', title: 'Scale Effortlessly', desc: 'Add branches, integrate payment gateways, and grow without technical limits.' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.subscriptionService.getPlans().subscribe((plans) => {
      this.pricingPlans.set(plans);
      this.cdr.markForCheck();
    });

    if (!isPlatformBrowser(this.platformId)) return;

    // Scroll listener for nav
    this.scrollListener = () => {
      this.isScrolled.set(window.scrollY > 60);
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });

    // Start typing animation outside zone
    this.startTyping();

    // Auto-start counters so numbers always display cleanly
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

  private initScrollReveal() {
    const revealTargets = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            const sectionId = (entry.target as HTMLElement).dataset['reveal'];
            if ((sectionId === 'stats' || sectionId === 'telemetry') && !this.countersStarted) {
              this.countersStarted = true;
              this.startCounters();
            }
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    revealTargets.forEach((el) => {
      obs.observe(el);
      // Fallback check for elements already in viewport on load
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.95) {
        el.classList.add('revealed');
        const sectionId = (el as HTMLElement).dataset['reveal'];
        if ((sectionId === 'stats' || sectionId === 'telemetry') && !this.countersStarted) {
          this.countersStarted = true;
          this.startCounters();
        }
      }
    });
    this.observers.push(obs);
  }

  private startCounters() {
    this.animateCounter(this.usersCount, 12000, 1800);
    this.animateCounter(this.productsCount, 850000, 2000);
    this.animateCounter(this.invoicesCount, 3200000, 2200);
    this.animateDecimalCounter(this.uptimeVal, 99.98, 1500);
    this.cdr.markForCheck();
  }

  private animateCounter(sig: ReturnType<typeof signal<number>>, target: number, duration: number) {
    const start = performance.now();
    this.ngZone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
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
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        sig.set(Number((progress * target).toFixed(2)));
        this.cdr.detectChanges();
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

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

  toggleMobileMenu() {
    const next = !this.mobileMenuOpen();
    this.mobileMenuOpen.set(next);
    // Lock/unlock body scroll
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = next ? 'hidden' : '';
    }
  }

  scrollToSection(event: Event, sectionId: string) {
    if (event) {
      event.preventDefault();
    }
    if (this.mobileMenuOpen()) {
      this.toggleMobileMenu();
    }
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(sectionId);
      if (el) {
        const navHeight = 110;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }

  toggleFaq(i: number) {
    this.openFaqIndex.set(this.openFaqIndex() === i ? null : i);
  }

  isFaqOpen(i: number): boolean {
    return this.openFaqIndex() === i;
  }

  formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M+';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K+';
    return n.toString() + '+';
  }

  trackByIndex(i: number) {
    return i;
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollListener);
      document.body.style.overflow = ''; // reset mobile menu scroll lock
    }
    this.observers.forEach((o) => o.disconnect());
    this.intervals.forEach((t) => clearTimeout(t));
  }
}
