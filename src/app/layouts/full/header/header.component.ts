import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { Router, RouterModule } from '@angular/router';

import { NgScrollbarModule } from 'ngx-scrollbar';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { CoreService } from 'src/app/services/core.service';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    ThemeToggleComponent
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
  constructor( 
    private router: Router,
    private commonService: CommonService,
    private authService: AuthService,
    private alert: AlertService,
    public coreService: CoreService
  ) {}

  toggleTheme() {
    this.coreService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.coreService.themeSignal() === 'dark';
  }


  onLogout() {
    this.authService.logout();
    this.router.navigate(['/authentication/login']);
  }

  ProfilePage(){
    this.router.navigate(['/components/profile']);
  }
}