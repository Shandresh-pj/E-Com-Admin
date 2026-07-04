import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild, ViewEncapsulation, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { CoreService } from 'src/app/services/core.service';

import { filter } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';
import { NavService } from '../../services/nav.service';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';

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


const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';


@Component({
  selector: 'app-full',
  imports: [
    RouterModule,
    AppNavItemComponent,
    MaterialModule,
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
  navItems: NavItem[] = [];

  /**
   * Sidebar items come from two sources, merged:
   *  1. Menus granted through Permission Management (JWT `menus` — matched by path).
   *     Granting a menu to an admin/branch/employee makes it appear on their next login.
   *  2. The static role matrix in sidebar-data.ts (legacy fallback).
   * Super Admin always sees everything. Captions without any visible item under
   * them are dropped.
   */
  private buildNavItems() {
    if (this.authService.isSuperAdmin()) return navItems;

    const grantedPaths = new Set(
      this.authService.getMenus()
        .filter((m: any) => m && typeof m === 'object' && m.path)
        .map((m: any) => String(m.path).toLowerCase().replace(/\/+$/, ''))
    );

    const visible = navItems.filter((item: NavItem) => {
      if (!item.route) return true; // captions are pruned below
      if (grantedPaths.has(item.route.toLowerCase().replace(/\/+$/, ''))) return true;
      if (!item.roles || !item.roles.length) return true; // universal items
      return item.roles.includes(this.authService.getUserType());
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


  constructor(
    private settings: CoreService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private commonService: CommonService,
    private permissionService: PermissionService,
  ) {
    this.htmlElement = document.querySelector('html')!;
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW])
      .subscribe((state) => {
        // SidenavOpened must be reset true when layout changes
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[MOBILE_VIEW];
        if (this.options.sidenavCollapsed == false) {
          this.options.sidenavCollapsed = state.breakpoints[TABLET_VIEW];
        }
      });

    // Reactively reload menus whenever permissions are updated
    effect(() => {
      this.permissionService.permissionsUpdated();
      this.loadDynamicMenus();
    });

    // This is for scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.content.scrollTo({ top: 0 });
      });
  }

  ngOnInit(): void {
    this.navItems = this.buildNavItems();
    this.loadDynamicMenus();
  }

  ngOnDestroy() {
    this.layoutChangesSubscription.unsubscribe();
  }

  toggleCollapsed() {
    this.isContentWidthFixed = false;
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }

  resetCollapsedState(timer = 400) {
    setTimeout(() => this.settings.setOptions(this.options), timer);
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
    //this.settings.setOptions(this.options);
  }

  loadDynamicMenus(): void {
    const apiMenus = this.authService.getMenus() ?? [];
    
    // Filter active menus and those the user has READ permission for
    const allowedMenus = apiMenus.filter((m: any) => {
      if (m.isActive === false) return false;
      return this.permissionService.hasPermission(m.id, 'READ');
    });

    // Now map allowed menus to NavItems
    let colorToggle = true;
    const dynamicItems: NavItem[] = allowedMenus.map((m: any) => {
      const bgcolor = colorToggle ? 'primary' : 'success';
      colorToggle = !colorToggle;

      return {
        displayName: m.name,
        route: m.path,
        iconName: this.mapIcon(m.icon || 'bi-grid-fill'),
        bgcolor: bgcolor
      };
    });

    // Build the final navItems list
    // Always include Dashboard at the top
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

    if (dynamicItems.length > 0) {
      finalItems.push({
        navCap: 'Modules'
      });
      finalItems.push(...dynamicItems);
    }

    // Always include Change Password at the bottom under Settings
    finalItems.push({
      navCap: 'Settings'
    });

    // Only add the hardcoded "Menu Bar" if the API menus didn't already
    // supply it, otherwise the sidebar shows two identical entries.
    const norm = (r?: string) => (r || '').toLowerCase().replace(/\/+$/, '');
    const hasMenuBar = dynamicItems.some(d => norm(d.route) === '/components/menubar');
    if (this.authService.isSuperAdmin() && !hasMenuBar) {
      finalItems.push({
        displayName: 'Menu Bar',
        iconName: 'list-check',
        route: '/components/menubar',
        bgcolor: 'primary'
      });
    }

    finalItems.push({
      displayName: 'Change Password',
      iconName: 'lock',
      route: '/components/change-password',
      bgcolor: colorToggle ? 'primary' : 'success'
    });

    // Final guard: drop any duplicate routes (keep first occurrence).
    const seen = new Set<string>();
    this.navItems = finalItems.filter(it => {
      if (!it.route) return true; // keep captions
      const key = norm(it.route);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapIcon(icon: string): string {
    const lowercase = String(icon).toLowerCase();
    if (lowercase.startsWith('bi-') || lowercase.startsWith('bi ')) return icon;
    if (lowercase.includes('dashboard') || lowercase === 'dashboard-icon') return 'bi-grid-fill';
    if (lowercase.includes('admin') || lowercase === 'archive') return 'bi-archive-fill';
    if (lowercase.includes('branch') || lowercase === 'badge') return 'bi-shop';
    if (lowercase.includes('employee') || lowercase.includes('user')) return 'bi-people-fill';
    if (lowercase.includes('role') || lowercase.includes('key')) return 'bi-key-fill';
    if (lowercase.includes('product') || lowercase === 'box') return 'bi-box-seam-fill';
    if (lowercase.includes('category')) return 'bi-tags-fill';
    if (lowercase.includes('attribute') || lowercase === 'tag') return 'bi-tag-fill';
    if (lowercase.includes('order') || lowercase === 'shopping-cart') return 'bi-cart-fill';
    if (lowercase.includes('log') || lowercase.includes('list')) return 'bi-card-list';
    if (lowercase.includes('status')) return 'bi-list-check';
    if (lowercase.includes('lock') || lowercase.includes('password')) return 'bi-lock-fill';
    return 'bi-' + icon;
  }

}
