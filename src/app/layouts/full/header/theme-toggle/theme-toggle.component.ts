import { Component, ViewEncapsulation } from '@angular/core';

import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ThemeToggleComponent {
  constructor(public coreService: CoreService) {}

  toggleTheme(): void {
    this.coreService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.coreService.themeSignal() === 'dark';
  }
}
