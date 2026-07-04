import {
  ChangeDetectorRef,
  Component,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { NavItem } from './nav-item';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavService } from '../../../../services/nav.service';

import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-item',
  imports: [TranslateModule, TablerIconsModule, MaterialModule, CommonModule],
  templateUrl: './nav-item.component.html',
  styleUrls: [],
})
export class AppNavItemComponent implements OnChanges, OnInit, OnDestroy {
  @Output() notify: EventEmitter<boolean> = new EventEmitter<boolean>();

  @Input() item: NavItem | any;

  expanded: any = false;
  /** Whether this item matches the current route (drives the highlight). */
  active = false;

  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
  @Input() depth: any;

  private routerSub = Subscription.EMPTY;

  constructor(
    public navService: NavService,
    public router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Recompute active state on every navigation. These items live inside
    // Material's OnPush `mat-nav-list`, so mutating a field from an RxJS
    // callback does NOT refresh the view on its own — the previously active
    // item stayed highlighted. `markForCheck()` forces the update.
    this.active = this.isMenuActive(this.item);
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.active = this.isMenuActive(this.item);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  ngOnChanges() {
    this.active = this.isMenuActive(this.item);
    // `expanded` drives the accordion for parent items with children AND is one
    // of the classes that paints the highlight bar. Leaf items must never be
    // "expanded", otherwise a loose prefix match leaves them highlighted even
    // after navigating elsewhere (the highlight persisting across pages).
    const hasChildren = !!(this.item.children && this.item.children.length);
    if (!hasChildren) {
      this.expanded = false;
      this.ariaExpanded = false;
      return;
    }
    const url = this.navService.currentUrl();
    if (this.item.route && url) {
      this.expanded = url.indexOf(`/${this.item.route}`) === 0;
      this.ariaExpanded = this.expanded;
    }
  }

  /**
   * Deterministic active check: normalize both the current URL and the item's
   * route (strip query/fragment, trailing slashes, ensure a single leading
   * slash) and compare exactly. Avoids the unreliable results of the deprecated
   * `router.isActive(url, true)` overload with the API-supplied menu paths,
   * which left stale items highlighted.
   */
  isMenuActive(item: NavItem | any): boolean {
    if (!item?.route) return false;
    const normalize = (url: string) =>
      ('/' + String(url).split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '')).toLowerCase();
    return normalize(this.router.url) === normalize(item.route);
  }

  onItemSelected(item: NavItem, event?: MouseEvent) {
    // Drop focus from the clicked item so Material's focus state-layer
    // background does not persist after navigating to another menu.
    (event?.currentTarget as HTMLElement | undefined)?.blur();

    if (!item.children || !item.children.length) {
      if (item.route) {
        this.router.navigate([item.route]);
      }
    }
    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
    }
    //scroll
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    if (!this.expanded) {
      if (window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }

  openExternalLink(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  onSubItemSelected(item: NavItem) {
    if (!item.children || !item.children.length) {
      if (this.expanded && window.innerWidth < 1024) {
        this.notify.emit();
      }
    }
  }
}
