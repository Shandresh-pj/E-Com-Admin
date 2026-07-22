import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { timeout } from 'rxjs/operators';

export interface LanguageItem {
  id?: number;
  code: string;
  name: string;
  native_name: string;
  flag_icon: string;
  direction: 'ltr' | 'rtl';
  is_default: boolean;
  is_active: boolean;
}

const STORAGE_LANG_KEY = 'svk_hrms_user_lang';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  // ── Reactive Signals ──────────────────────────────────────────────────
  readonly currentLang = signal<string>(localStorage.getItem(STORAGE_LANG_KEY) || 'en');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly availableLanguages = signal<LanguageItem[]>([
    { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', flag_icon: '🇮🇳', direction: 'ltr', is_default: false, is_active: true },
    { code: 'en', name: 'English', native_name: 'English', flag_icon: '🇺🇸', direction: 'ltr', is_default: true, is_active: true }
  ]);
  readonly dictionary = signal<Record<string, string>>({});
  readonly isLoading = signal<boolean>(false);

  // Active language object getter
  readonly activeLanguage = computed(() => {
    const code = this.currentLang();
    return this.availableLanguages().find(l => l.code === code) || {
      code: 'en',
      name: 'English',
      native_name: 'English',
      flag_icon: '🇺🇸',
      direction: 'ltr',
      is_default: true,
      is_active: true
    };
  });

  constructor(
    private commonService: CommonService,
    private http: HttpClient
  ) {
    // Dynamic html dir="rtl"/"ltr" and lang attribute synchronization
    effect(() => {
      const d = this.dir();
      const l = this.currentLang();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', d);
        document.documentElement.setAttribute('lang', l);
        if (d === 'rtl') {
          document.body.classList.add('rtl-mode');
        } else {
          document.body.classList.remove('rtl-mode');
        }
      }
    });

    this.init();
  }

  init(): void {
    this.fetchLanguages();
    this.loadDictionary(this.currentLang());
  }

  private sortLanguagesCustom(list: LanguageItem[]): LanguageItem[] {
    return [...list].sort((a, b) => {
      const codeA = a.code.toLowerCase();
      const codeB = b.code.toLowerCase();
      if (codeA === 'ta') return -1;
      if (codeB === 'ta') return 1;
      if (codeA === 'en') return -1;
      if (codeB === 'en') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  fetchLanguages(): void {
    this.commonService.getApi('languages').pipe(timeout(2000)).subscribe({
      next: (res: any) => {
        const list: LanguageItem[] = res?.data || [];
        if (list.length > 0) {
          const releaseLangs = list.filter(l => l.code === 'ta' || l.code === 'en');
          const sorted = this.sortLanguagesCustom(releaseLangs.length ? releaseLangs : list);
          this.availableLanguages.set(sorted);
          const active = sorted.find(l => l.code === this.currentLang());
          if (active) {
            this.dir.set(active.direction);
          }
        }
      },
      error: () => {
        const fallbackList: LanguageItem[] = [
          { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', flag_icon: '🇮🇳', direction: 'ltr', is_default: false, is_active: true },
          { code: 'en', name: 'English', native_name: 'English', flag_icon: '🇺🇸', direction: 'ltr', is_default: true, is_active: true }
        ];
        this.availableLanguages.set(fallbackList);
      }
    });
  }

  setLanguage(langCode: string): void {
    if (!langCode) return;
    const cleanCode = langCode.toLowerCase();
    this.currentLang.set(cleanCode);
    localStorage.setItem(STORAGE_LANG_KEY, cleanCode);

    const langObj = this.availableLanguages().find(l => l.code === cleanCode);
    if (langObj) {
      this.dir.set(langObj.direction);
    } else if (cleanCode === 'ar' || cleanCode === 'he') {
      this.dir.set('rtl');
    } else {
      this.dir.set('ltr');
    }

    this.loadDictionary(cleanCode);
  }

  loadDictionary(langCode: string): void {
    this.isLoading.set(true);
    const cleanCode = langCode.toLowerCase();
    
    // Always load local asset dictionary first as primary baseline
    this.http.get<Record<string, string>>(`assets/i18n/${cleanCode}.json`).subscribe({
      next: (localDict) => {
        const baseDict = localDict || {};
        // Fetch backend overrides and merge
        this.commonService.getApi(`translations/${cleanCode}`).pipe(timeout(2000)).subscribe({
          next: (res: any) => {
            const apiDict = res?.dictionary || {};
            this.dictionary.set({ ...baseDict, ...apiDict });
            this.isLoading.set(false);
          },
          error: () => {
            this.dictionary.set(baseDict);
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.loadAssetFallback(cleanCode);
      }
    });
  }

  private loadAssetFallback(langCode: string): void {
    this.http.get<Record<string, string>>(`assets/i18n/${langCode}.json`).subscribe({
      next: (jsonDict) => {
        this.dictionary.set(jsonDict || {});
        this.isLoading.set(false);
      },
      error: () => {
        // Ultimate fallback to English assets
        if (langCode !== 'en') {
          this.http.get<Record<string, string>>(`assets/i18n/en.json`).subscribe({
            next: (enDict) => {
              this.dictionary.set(enDict || {});
              this.isLoading.set(false);
            },
            error: () => { this.isLoading.set(false); }
          });
        } else {
          this.isLoading.set(false);
        }
      }
    });
  }

  translate(key: string, params?: Record<string, any>): string {
    if (!key) return '';
    const dict = this.dictionary();
    let text = dict[key] || key;

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`{{\\s*${p}\\s*}}`, 'g'), String(params[p]));
        text = text.replace(new RegExp(`:${p}`, 'g'), String(params[p]));
      });
    }
    return text;
  }

  formatDate(dateInput: string | Date | number, options?: Intl.DateTimeFormatOptions): string {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const locale = this.currentLang() === 'ta' ? 'ta-IN' : (this.currentLang() === 'hi' ? 'hi-IN' : (this.currentLang() === 'ar' ? 'ar-SA' : 'en-US'));
    return new Intl.DateTimeFormat(locale, options || { dateStyle: 'medium' }).format(d);
  }

  formatCurrency(amount: number, currency = 'INR'): string {
    const locale = this.currentLang() === 'ta' ? 'ta-IN' : (this.currentLang() === 'hi' ? 'hi-IN' : (this.currentLang() === 'ar' ? 'ar-SA' : 'en-US'));
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  }
}
