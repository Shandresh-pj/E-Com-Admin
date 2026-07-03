import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
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
  navItems = this.buildNavItems();

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

    const visible = navItems.filter(item => {
      if (!item.route) return true; // captions are pruned below
      if (grantedPaths.has(item.route.toLowerCase().replace(/\/+$/, ''))) return true;
      if (!item.roles || !item.roles.length) return true; // universal items
      return item.roles.includes(this.authService.getUserType());
    });

    return visible.filter((item, i) => {
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

    // Initialize project theme with options


    // This is for scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.content.scrollTo({ top: 0 });
      });
  }

  ngOnInit(): void { }

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

}
