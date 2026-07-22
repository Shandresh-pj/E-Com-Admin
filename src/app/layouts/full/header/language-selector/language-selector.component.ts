import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { I18nService, LanguageItem } from 'src/app/services/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TablerIconsModule, MaterialModule],
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.scss'
})
export class LanguageSelectorComponent {
  searchQuery = '';

  constructor(
    public i18n: I18nService,
    private cdr: ChangeDetectorRef
  ) {}

  selectLanguage(lang: LanguageItem): void {
    this.i18n.setLanguage(lang.code);
    this.searchQuery = '';
  }

  get filteredLanguages(): LanguageItem[] {
    const list = this.i18n.availableLanguages();
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return list.filter(l => l.is_active);
    return list.filter(l =>
      l.is_active && (
        l.name.toLowerCase().includes(q) ||
        l.native_name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
      )
    );
  }
}
