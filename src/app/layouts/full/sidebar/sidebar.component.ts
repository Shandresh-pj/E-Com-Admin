import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BrandingComponent } from './branding.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/Securities/Services/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [BrandingComponent, TablerIconsModule, MaterialModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit {
  constructor(private authService:AuthService) {
    const user = this.authService.getUser();
    const user1 = this.authService.getRoles();
    const user2 = this.authService.getPermissions();
    const user3 = this.authService.getMenus();

    console.log("aaaa-1",user)
    console.log("aaaa-2",user1)
    console.log("aaaa-3",user2)
    console.log("aaaa-4",user3)
  }
  @Input() showToggle = true;
  @Output() toggleMobileNav = new EventEmitter<void>();
  @Output() toggleCollapsed = new EventEmitter<void>();

 

  ngOnInit(): void {}
}
