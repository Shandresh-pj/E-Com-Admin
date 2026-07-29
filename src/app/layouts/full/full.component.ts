import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild, ViewEncapsulation, effect, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { CoreService } from 'src/app/services/core.service';

import { filter } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';
import { NavService } from '../../services/nav.service';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AppNavItemComponent } from './sidebar/nav-item/nav-item.component';
import { navItems } from './sidebar/sidebar-data';
import { AppTopstripComponent } from './top-strip/topstrip.component';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { NavItem } from './sidebar/nav-item/nav-item';
import { SocketService } from 'src/app/Securities/Services/socket.service';
import { NotificationService } from 'src/app/services/notification.service';
import { I18nService } from 'src/app/services/i18n.service';


const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';


@Component({
  selector: 'app-full',
  imports: [
    RouterModule,
    AppNavItemComponent,
    MaterialModule,
    FormsModule,
    SidebarComponent,
    NgScrollbarModule,
    TablerIconsModule,
    HeaderComponent,
    AppTopstripComponent
  ],
  templateUrl: './full.component.html',
  styleUrls: [],
  encapsulation: ViewEncapsulation.None
})
export class FullComponent implements OnInit {
  // A signal (not a plain field) so the sidebar updates the instant a
  // socket-driven permissions refresh rebuilds it â€” a plain field mutated
  // inside an effect() isn't guaranteed to be picked up by the same
  // change-detection pass the effect ran in (Angular Signals gotcha).
  navItems = signal<NavItem[]>([]);
  filteredNavItems = signal<NavItem[]>([]);
  sidebarSearch = '';

  /**
   * Sidebar items come from two sources, merged:
   *  1. Menus granted through Permission Management (JWT `menus` â€” matched by path).
   *     Granting a menu to an admin/branch/employee makes it appear on their next login.
   *  2. The static role matrix in sidebar-data.ts (legacy fallback).
   * Super Admin always sees everything. Captions without any visible item under
   * them are dropped.
   */
  private buildNavItems() {
    if (this.authService.isSuperAdmin()) return navItems;

    const currentUserType = this.authService.getUserType();
    const normUserType = String(currentUserType).toLowerCase().trim();

    const grantedPaths = new Set(
      this.authService.getMenus()
        .filter((m: any) => m && (typeof m === 'object' ? m.path || m.route : m))
        .map((m: any) => {
          const str = typeof m === 'object' ? (m.path || m.route || '') : String(m);
          return str.toLowerCase().replace(/\/+$/, '');
        })
    );

    const visible = navItems.filter((item: NavItem) => {
      if (!item.route) return true; // captions are pruned below
      const itemRouteNorm = item.route.toLowerCase().replace(/\/+$/, '');

      if (grantedPaths.has(itemRouteNorm) || grantedPaths.has('all') || grantedPaths.has('*')) return true;
      if (this.permissionService.hasPagePermission(item.route)) return true;
      if (item.roles && item.roles.length) {
        return item.roles.some(r => String(r).toLowerCase().trim() === normUserType);
      }
      return false;
    });

    return visible.filter((item: NavItem, i: number) => {
      if (!item.navCap) return true;
      for (let j = i + 1; j < visible.length; j++) {
        if (visible[j].navCap) break;
        if (visible[j].displayName) return true;
      }
      return false;
    });
  }

  @ViewChild('leftsidenav')
  public sidenav: MatSidenav;
  resView = false;
  @ViewChild('content', { static: true }) content!: MatSidenavContent;
  //get options from service
  options = this.settings.getOptions();
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  get currentThemeClass(): string {
    return this.settings.themeSignal() === 'dark' ? 'dark-theme' : 'light-theme';
  }


  private socketSubscription = Subscription.EMPTY;
  unreadNotificationsCount = 0;
  pendingApprovalsCount = 0;
  lowStockAlertsCount = 0;

  constructor(
    private settings: CoreService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private commonService: CommonService,
    private permissionService: PermissionService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    public i18n: I18nService
  ) {
    this.htmlElement = document.querySelector('html')!;

    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW])
      .subscribe((state) => {
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[MOBILE_VIEW];
        if (this.options.sidenavCollapsed == false) {
          this.options.sidenavCollapsed = state.breakpoints[TABLET_VIEW];
        }
      });

    effect(() => {
      this.permissionService.permissionsUpdated();
      untracked(() => {
        this.loadDynamicMenus();
      });
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.content.scrollTo({ top: 0 });
      });
  }

  ngOnInit(): void {
    this.loadDynamicMenus();

    // Subscribe to WebSocket events
    this.socketService.connect();
    this.socketSubscription = new Subscription();

    this.socketSubscription.add(
      this.socketService.on('new-notification').subscribe((notif: any) => {
        this.unreadNotificationsCount++;
        this.updateNavBadges();
      })
    );

    this.socketSubscription.add(
      this.socketService.on('low-stock-alert').subscribe((alert: any) => {
        this.lowStockAlertsCount++;
        this.updateNavBadges();
      })
    );

    this.socketSubscription.add(
      this.socketService.on('product-approval-update').subscribe(() => {
        this.fetchBadgeCounts();
      })
    );

    this.socketSubscription.add(
      this.socketService.on('stock-update').subscribe(() => {
        this.fetchBadgeCounts();
      })
    );

    this.socketSubscription.add(
      this.socketService.on('branch-transfer-update').subscribe(() => {
        this.fetchBadgeCounts();
      })
    );

    this.fetchBadgeCounts();
  }

  ngOnDestroy() {
    this.layoutChangesSubscription.unsubscribe();
    this.socketSubscription.unsubscribe();
    this.socketService.disconnect();
  }

  fetchBadgeCounts(): void {
    this.notificationService.getNotifications().subscribe({
      next: (res: any) => {
        const notifs = res?.data || [];
        this.unreadNotificationsCount = notifs.filter((n: any) => !n.is_read).length;
        this.updateNavBadges();
      },
      error: (err) => {
        console.error('Failed to load notifications in layout:', err);
      }
    });

    this.commonService.getApi('alerts').subscribe({
      next: (res: any) => {
        const alerts = res?.data || [];
        this.lowStockAlertsCount = alerts.length;
        this.updateNavBadges();
      },
      error: (err) => {
        console.error('Failed to load alerts in layout:', err);
      }
    });

    const isAdmin = this.authService.isSuperAdmin() || this.authService.getUserType() === 'Admin';
    if (isAdmin) {
      this.commonService.getApi('products', { status: 'Pending Approval', limit: 1 }).subscribe({
        next: (res: any) => {
          this.pendingApprovalsCount = res?.total || 0;
          this.updateNavBadges();
        },
        error: (err) => {
          console.error('Failed to load pending products in layout:', err);
        }
      });
    }
  }

  updateNavBadges(): void {
    this.navItems().forEach(item => {
      if (item.displayName === 'Notifications') {
        item.chip = this.unreadNotificationsCount > 0;
        item.chipContent = String(this.unreadNotificationsCount);
        item.chipClass = 'bg-error text-white';
      }
      if (item.displayName === 'Alerts' || item.displayName === 'Low Stock Alerts') {
        item.chip = this.lowStockAlertsCount > 0;
        item.chipContent = String(this.lowStockAlertsCount);
        item.chipClass = 'bg-warning text-dark';
      }
      if (item.children) {
        item.children.forEach(child => {
          if (child.displayName === 'Pending Approval') {
            child.chip = this.pendingApprovalsCount > 0;
            child.chipContent = String(this.pendingApprovalsCount);
            child.chipClass = 'bg-error text-white';
          }
          if (child.displayName === 'Low Stock Alerts') {
            child.chip = this.lowStockAlertsCount > 0;
            child.chipContent = String(this.lowStockAlertsCount);
            child.chipClass = 'bg-warning text-dark';
          }
          if (child.displayName === 'Notifications') {
            child.chip = this.unreadNotificationsCount > 0;
            child.chipContent = String(this.unreadNotificationsCount);
            child.chipClass = 'bg-error text-white';
          }
        });
      }
    });
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
  }

  loadDynamicMenus(): void {
    const apiMenus = this.authService.getMenus() ?? [];
    const isSuperAdmin = this.authService.isSuperAdmin() || apiMenus.includes('ALL');

    let allowedMenus: any[] = [];
    const allStandardMenus = [
      { id: 1, name: 'App Admin', path: '/admin', icon: 'bi-shield-lock-fill', isActive: true },
      { id: 2, name: 'Branch', path: '/branch', icon: 'bi-shop', isActive: true },
      { id: 3, name: 'Employee', path: '/employees', icon: 'bi-people-fill', isActive: true },
      { id: 4, name: 'Roles', path: '/roles', icon: 'bi-key-fill', isActive: true },
      { id: 5, name: 'Role Access', path: '/role-access', icon: 'bi-shield-check', isActive: true },
      { id: 6, name: 'Profile', path: '/profile', icon: 'bi-person-badge-fill', isActive: true },
      { id: 7, name: 'Menu Bar', path: '/menubar', icon: 'bi-list-ul', isActive: true },
      { id: 8, name: 'Status', path: '/status', icon: 'bi-check2-square', isActive: true },
      { id: 9, name: 'Product Attribute', path: '/product-attribute', icon: 'bi-tag-fill', isActive: true },
      { id: 10, name: 'Attribute Value', path: '/attribute-value', icon: 'bi-tags-fill', isActive: true },
      { id: 11, name: 'Category', path: '/category', icon: 'bi-folder-fill', isActive: true },
      { id: 12, name: 'Product', path: '/product', icon: 'bi-box-seam-fill', isActive: true },
      { id: 13, name: 'Orders', path: '/orders', icon: 'bi-cart-fill', isActive: true },
      { id: 99, name: 'Coupons', path: '/coupons', icon: 'bi-ticket-detailed-fill', isActive: true },
      { id: 14, name: 'Change Password', path: '/change-password', icon: 'bi-lock-fill', isActive: true },
      { id: 15, name: 'Audit Logs', path: '/audit-logs', icon: 'bi-clock-history', isActive: true },
      { id: 16, name: 'Alerts', path: '/alerts', icon: 'bi-exclamation-triangle-fill', isActive: true },
      { id: 17, name: 'Attendance', path: '/attendance', icon: 'bi-calendar-check-fill', isActive: true },
      { id: 18, name: 'Branch Stocks', path: '/branch-stocks', icon: 'bi-house-gear-fill', isActive: true },
      { id: 19, name: 'Stocks', path: '/stocks', icon: 'bi-box2-fill', isActive: true },
      { id: 20, name: 'Payroll', path: '/payroll', icon: 'bi-cash-coin', isActive: true },
      { id: 21, name: 'Leave', path: '/leave', icon: 'bi-airplane-fill', isActive: true },
      { id: 22, name: 'Delivery Tracking', path: '/delivery-tracking', icon: 'bi-truck', isActive: true },
      { id: 23, name: 'Payments', path: '/payments', icon: 'bi-credit-card-2-front-fill', isActive: true },
      { id: 24, name: 'Notifications', path: '/notifications', icon: 'bi-bell-fill', isActive: true },
      { id: 25, name: 'Workforce Console', path: '/workforce', icon: 'bi-gear-wide-connected', isActive: true },
      { id: 26, name: 'Invoice Generator', path: '/invoices', icon: 'bi-file-text', isActive: true },
      { id: 27, name: 'Approvals', path: '/approvals', icon: 'bi-check-square', isActive: true },
      { id: 28, name: 'Workforce Requests', path: '/workforce-requests', icon: 'bi-briefcase-fill', isActive: true },
      { id: 29, name: 'Leave Management', path: '/leave', icon: 'bi-calendar-x-fill', isActive: true },
      { id: 30, name: 'CRM Contacts', path: '/crm-contacts', icon: 'bi-people-fill', isActive: true },
      { id: 31, name: 'Profit & Loss', path: '/profit-loss', icon: 'bi-pie-chart-fill', isActive: true },
      { id: 32, name: 'Manage Plans', path: '/manage-subscription-plans', icon: 'bi-gem', isActive: true },
      { id: 33, name: 'Upgrade Plan', path: '/subscription-plans', icon: 'bi-star-fill', isActive: true },
      { id: 34, name: 'Billing History', path: '/billing-history', icon: 'receipt', isActive: true },
      { id: 35, name: 'Subscription Coupons', path: '/subscription-coupons', icon: 'ticket', isActive: true },
      { id: 36, name: 'Standard Checkout', path: '/checkout', icon: 'credit-card', isActive: true },
      { id: 37, name: 'Company Calendar', path: '/calendar', icon: 'calendar-event', isActive: true },
      { id: 38, name: 'Document Verification', path: '/employee-documents', icon: 'file-check', isActive: true },
      { id: 39, name: 'Translation Console', path: '/translations', icon: 'language', isActive: true },
      { id: 40, name: 'POS Billing Machine', path: '/pos-billing', icon: 'bi-receipt-cutoff', isActive: true },
      { id: 41, name: 'Hardware & Devices', path: '/devices', icon: 'bi-cpu-fill', isActive: true }
    ];

    if (isSuperAdmin) {
      allowedMenus = allStandardMenus;
    } else if (Array.isArray(apiMenus) && apiMenus.length > 0 && typeof apiMenus[0] === 'object') {
      allowedMenus = apiMenus.filter((m: any) => {
        if (!m || typeof m !== 'object' || m.isActive === false) return false;
        return this.permissionService.hasPermission(m.id, 'READ') ||
               this.permissionService.hasPagePermission(m.path || m.route);
      });
      if (allowedMenus.length === 0) {
        allowedMenus = allStandardMenus.filter(m => this.permissionService.hasPagePermission(m.path));
      }
    } else {
      allowedMenus = allStandardMenus.filter(m => this.permissionService.hasPagePermission(m.path));
    }

    const norm = (r?: string) => (r || '').toLowerCase().replace(/\/+$/, '');

    const finalItems: NavItem[] = [
      {
        navCap: 'Home',
      },
      {
        displayName: 'Dashboard',
        iconName: 'layout-grid-add',
        route: '/dashboard',
        bgcolor: 'primary',
      }
    ];

    const groupings = [
      {
        navCap: 'Administration & Roles',
        paths: ['/admin', '/crm-contacts', '/branch', '/employees', '/role-access', '/roles', '/audit-logs']
      },
      {
        navCap: 'Catalog & Products',
        paths: ['/category', '/product', '/product-attribute', '/attribute-value', '/coupons']
      },
      {
        navCap: 'POS Billing & Hardware',
        paths: ['/pos-billing', '/devices', '/biometric']
      },
      {
        navCap: 'Inventory & Logistics',
        paths: ['/stocks', '/branch-stocks', '/delivery-tracking', '/alerts']
      },
      {
        navCap: 'Sales, Finance & Subscriptions',
        paths: ['/orders', '/invoices', '/payments', '/profit-loss', '/billing-history', '/subscription-plans', '/manage-subscription-plans', '/subscription-coupons', '/checkout']
      },
      {
        navCap: 'HR & Workforce Console',
        paths: ['/workforce', '/shifts', '/break-policies', '/geofencing', '/workforce-requests', '/attendance', '/leave', '/calendar', '/employee-documents', '/payroll']
      },
      {
        navCap: 'Operations & Settings',
        paths: ['/approvals', '/notifications', '/profile', '/translations', '/menubar', '/status', '/change-password']
      }
    ];

    const isAdmin = this.authService.isSuperAdmin() || this.authService.getUserType() === 'Admin';
    let colorToggle = true;

    for (const group of groupings) {
      const groupItems = allowedMenus
        .filter(m => group.paths.includes(norm(m.path)))
        .map(m => {
          const bgcolor = colorToggle ? 'primary' : 'success';
          colorToggle = !colorToggle;

          const item: NavItem = {
            displayName: m.name,
            route: m.path,
            iconName: this.mapIcon(m.icon),
            bgcolor: bgcolor
          };

          // Special logic for Stocks -> Low Stock Alerts child
          if (norm(m.path) === '/stocks') {
            const stockChildren: NavItem[] = [
              { displayName: 'Stock List', route: '/stocks', queryParams: { view: 'products' }, bgcolor: 'primary' }
            ];
            if (isAdmin) {
              stockChildren.push({ displayName: 'Low Stock Alerts', route: '/alerts', bgcolor: 'error' });
            }
            item.children = stockChildren;
            item.bgcolor = 'warning';
          }

          return item;
        });

      if (groupItems.length > 0) {
        finalItems.push({ navCap: group.navCap });
        finalItems.push(...groupItems);
      }
    }

    // Add any remaining un-grouped menus under "Other Modules"
    const groupedPaths = new Set(groupings.flatMap(g => g.paths));
    const otherItems = allowedMenus
      .filter(m => !groupedPaths.has(norm(m.path)))
      .map(m => {
        const bgcolor = colorToggle ? 'primary' : 'success';
        colorToggle = !colorToggle;
        return {
          displayName: m.name,
          route: m.path,
          iconName: this.mapIcon(m.icon),
          bgcolor: bgcolor
        };
      });

    if (otherItems.length > 0) {
      finalItems.push({ navCap: 'Other Modules' });
      finalItems.push(...otherItems);
    }

    // Notifications Link
    // finalItems.push({
    //   navCap: 'Notifications'
    // });
    // finalItems.push({
    //   displayName: 'Notifications',
    //   iconName: 'bi-bell-fill',
    //   route: '/notifications',
    //   bgcolor: 'error'
    // });

    // finalItems.push({
    //   navCap: 'Settings'
    // });

    // finalItems.push({
    //   displayName: 'Change Password',
    //   iconName: 'lock',
    //   route: '/change-password',
    //   bgcolor: 'success'
    // });

    // Prune duplicates
    const seen = new Set<string>();
    const deduped = finalItems.filter(it => {
      if (!it.route) return true;
      const key = norm(it.route) + (it.children ? '_parent' : '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this.navItems.set(deduped);
    this.filteredNavItems.set(deduped);

    this.updateNavBadges();
  }

  // A handful of Menu records store an icon "name" that was never a real
  // Bootstrap Icons glyph (e.g. "Badge", "settings", "shopping-cart") â€” those
  // resolve to no ::before content at all (not just the wrong icon, an empty
  // slot), because bootstrap-icons only defines rules for its actual glyph
  // names. Map the known-bad ones to a real equivalent; everything else
  // passes through as-is since most DB values already match a real glyph.
  private static readonly ICON_ALIASES: Record<string, string> = {
    badge: 'person-badge-fill',
    settings: 'gear-wide-connected',
    'plane-departure': 'airplane-fill',
    'map-pin': 'geo-alt-fill',
    'git-merge': 'shop',
    category: 'tags-fill',
    'shopping-cart': 'cart-fill',
    'clipboard-list': 'clock-history',
    'list-details': 'list-ul',
    'receipt-2': 'receipt-cutoff',
    devices: 'cpu-fill',
    'chart-pie': 'pie-chart-fill'
  };

  private mapIcon(icon?: string): string {
    const raw = (icon || 'grid-fill').trim().toLowerCase();
    const bare = raw.startsWith('bi-') ? raw.slice(3) : raw.startsWith('bi ') ? raw.slice(3).trim() : raw;
    return `bi-${FullComponent.ICON_ALIASES[bare] ?? bare}`;
  }

  onSidebarSearch(query: string): void {
    if (!query.trim()) {
      this.filteredNavItems.set(this.navItems());
      return;
    }
    const q = query.toLowerCase().trim();
    const all = this.navItems();
    const filtered: NavItem[] = [];
    let currentCap: NavItem | null = null;
    let capAdded = false;

    for (const item of all) {
      if (item.navCap) {
        currentCap = item;
        capAdded = false;
        if (item.navCap.toLowerCase().includes(q)) {
          filtered.push(item);
          capAdded = true;
        }
        continue;
      }
      
      const matchesName = !!item.displayName && item.displayName.toLowerCase().includes(q);
      const matchesRoute = !!item.route && item.route.toLowerCase().includes(q);
      const capMatches = !!currentCap && !!currentCap.navCap && currentCap.navCap.toLowerCase().includes(q);

      if (matchesName || matchesRoute || capMatches) {
        if (currentCap && !capAdded) {
          filtered.push(currentCap);
          capAdded = true;
        }
        filtered.push(item);
      } else if (item.children) {
        const matchingChildren = item.children.filter(
          (c: NavItem) => (c.displayName && c.displayName.toLowerCase().includes(q)) || (c.route && c.route.toLowerCase().includes(q))
        );
        if (matchingChildren.length > 0) {
          if (currentCap && !capAdded) { filtered.push(currentCap); capAdded = true; }
          filtered.push({ ...item, children: matchingChildren });
        }
      }
    }
    this.filteredNavItems.set(filtered);
  }

}



