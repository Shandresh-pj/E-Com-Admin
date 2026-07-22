import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export type TranslationTab = 'matrix' | 'languages' | 'import_export';

@Component({
  selector: 'app-translation-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TablerIconsModule, AppTranslatePipe],
  templateUrl: './translation-management.html',
  styleUrl: './translation-management.scss'
})
export class TranslationManagementComponent implements OnInit {
  activeTab = signal<TranslationTab>('matrix');
  loading   = signal(false);
  saving    = signal(false);

  // Matrix Data
  languages: any[] = [];
  matrix: any[] = [];
  filteredMatrix: any[] = [];
  searchQuery = '';
  selectedGroup = 'ALL';

  // Forms
  langForm: FormGroup;
  showLangModal = signal(false);
  editingLangId: number | null = null;

  keyForm: FormGroup;
  showKeyModal = signal(false);

  // Import
  importLang = 'en';
  importGroup = 'custom';
  importJsonText = '';

  readonly GROUPS = ['ALL', 'menu', 'auth', 'common', 'attendance', 'leave', 'payroll', 'custom'];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public  perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.langForm = this.fb.group({
      code:        ['', [Validators.required, Validators.maxLength(10)]],
      name:        ['', Validators.required],
      native_name: ['', Validators.required],
      flag_icon:   ['🌐', Validators.required],
      direction:   ['ltr', Validators.required],
    });

    this.keyForm = this.fb.group({
      group_name:   ['custom', Validators.required],
      key_name:     ['', Validators.required],
      default_text: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.commonService.getApi('translations/matrix').subscribe({
      next: (res: any) => {
        this.matrix = res?.matrix || [];
        this.languages = res?.languages || [];
        if (this.matrix.length === 0) {
          this.setFallbackMatrixData();
        }
        this.applyFilter();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.setFallbackMatrixData();
        this.applyFilter();
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private setFallbackMatrixData(): void {
    this.languages = [
      { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', flag_icon: '🇮🇳', direction: 'ltr' },
      { code: 'en', name: 'English', native_name: 'English', flag_icon: '🇺🇸', direction: 'ltr' }
    ];
    this.matrix = [
      { id: 1, group_name: 'menu', key_name: 'Dashboard', default_text: 'Dashboard', translations: { en: 'Dashboard', ta: 'முகப்பு' } },
      { id: 2, group_name: 'menu', key_name: 'App Admin', default_text: 'App Admin', translations: { en: 'App Admin', ta: 'நிர்வாகி' } },
      { id: 3, group_name: 'menu', key_name: 'Branch', default_text: 'Branch', translations: { en: 'Branch', ta: 'கிளை' } },
      { id: 4, group_name: 'menu', key_name: 'Roles', default_text: 'Roles', translations: { en: 'Roles', ta: 'பங்கு உரிமைகள்' } },
      { id: 5, group_name: 'menu', key_name: 'Role Access', default_text: 'Role Access', translations: { en: 'Role Access', ta: 'பங்கு அணுகல்' } },
      { id: 6, group_name: 'menu', key_name: 'Workforce Console', default_text: 'Workforce Console', translations: { en: 'Workforce Console', ta: 'பணியாளர் மையம்' } },
      { id: 7, group_name: 'menu', key_name: 'Attendance', default_text: 'Attendance', translations: { en: 'Attendance', ta: 'வருகைப் பதிவு' } },
      { id: 8, group_name: 'menu', key_name: 'Leave Management', default_text: 'Leave Management', translations: { en: 'Leave Management', ta: 'விடுப்பு மேலாண்மை' } },
      { id: 9, group_name: 'menu', key_name: 'Company Calendar', default_text: 'Company Calendar', translations: { en: 'Company Calendar', ta: 'நிறுவன நாட்காட்டி' } },
      { id: 10, group_name: 'menu', key_name: 'Document Verification', default_text: 'Document Verification', translations: { en: 'Document Verification', ta: 'ஆவணங்கள் சரிபார்ப்பு' } },
      { id: 11, group_name: 'menu', key_name: 'Payroll', default_text: 'Payroll', translations: { en: 'Payroll', ta: 'சம்பளம்' } },
      { id: 12, group_name: 'menu', key_name: 'Profile', default_text: 'Profile', translations: { en: 'Profile', ta: 'சுயவிவரம்' } },
      { id: 13, group_name: 'common', key_name: 'common.save', default_text: 'Save', translations: { en: 'Save', ta: 'சேமி' } },
      { id: 14, group_name: 'common', key_name: 'common.cancel', default_text: 'Cancel', translations: { en: 'Cancel', ta: 'ரத்து செய்' } },
      { id: 15, group_name: 'auth', key_name: 'auth.login', default_text: 'Sign In', translations: { en: 'Sign In', ta: 'உள்நுழை' } }
    ];
  }

  applyFilter(): void {
    let list = [...this.matrix];
    if (this.selectedGroup !== 'ALL') {
      list = list.filter(item => item.group_name === this.selectedGroup);
    }
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(item =>
        item.key_name.toLowerCase().includes(q) ||
        item.default_text.toLowerCase().includes(q) ||
        Object.values(item.translations || {}).some((val: any) => String(val).toLowerCase().includes(q))
      );
    }
    this.filteredMatrix = list;
  }

  saveKeyRow(row: any): void {
    this.saving.set(true);
    const payload = {
      key_id: row.id,
      key_name: row.key_name,
      group_name: row.group_name,
      default_text: row.default_text,
      translations: row.translations
    };

    this.commonService.putApi('translations/values', payload).subscribe({
      next: () => {
        this.alert.success(`Updated translations for '${row.key_name}'`);
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to update key');
        this.saving.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  addKey(): void {
    if (this.keyForm.invalid) { this.keyForm.markAllAsTouched(); return; }
    this.saving.set(true);
    this.commonService.putApi('translations/values', this.keyForm.value).subscribe({
      next: () => {
        this.alert.success('New translation key added!');
        this.showKeyModal.set(false);
        this.keyForm.reset({ group_name: 'custom' });
        this.saving.set(false);
        this.loadData();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to add key');
        this.saving.set(false);
      }
    });
  }

  // ─── Languages ────────────────────────────────────────────────────────
  openLangModal(lang?: any): void {
    if (lang) {
      this.editingLangId = lang.id;
      this.langForm.patchValue({
        code: lang.code,
        name: lang.name,
        native_name: lang.native_name,
        flag_icon: lang.flag_icon,
        direction: lang.direction
      });
    } else {
      this.editingLangId = null;
      this.langForm.reset({ flag_icon: '🌐', direction: 'ltr' });
    }
    this.showLangModal.set(true);
  }

  saveLanguage(): void {
    if (this.langForm.invalid) { this.langForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.editingLangId
      ? this.commonService.putApi(`languages/${this.editingLangId}`, this.langForm.value)
      : this.commonService.postApi('languages', this.langForm.value);

    req$.subscribe({
      next: () => {
        this.alert.success('Language saved!');
        this.showLangModal.set(false);
        this.saving.set(false);
        this.loadData();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to save language');
        this.saving.set(false);
      }
    });
  }

  toggleLanguageActive(lang: any): void {
    this.commonService.putApi(`languages/${lang.id}`, { is_active: !lang.is_active }).subscribe({
      next: () => {
        this.alert.success(`Language '${lang.name}' status updated.`);
        this.loadData();
      }
    });
  }

  setDefaultLanguage(lang: any): void {
    this.commonService.putApi(`languages/${lang.id}`, { is_default: true }).subscribe({
      next: () => {
        this.alert.success(`Default language set to ${lang.name}`);
        this.loadData();
      }
    });
  }

  // ─── Import / Export / Publish ─────────────────────────────────────────
  importPack(): void {
    if (!this.importJsonText.trim()) {
      this.alert.error('Please enter or paste JSON dictionary');
      return;
    }
    try {
      const parsed = JSON.parse(this.importJsonText);
      this.saving.set(true);
      this.commonService.postApi('translations/import', {
        lang_code: this.importLang,
        group: this.importGroup,
        dictionary: parsed
      }).subscribe({
        next: (res: any) => {
          this.alert.success(res?.message || 'Translations imported!');
          this.importJsonText = '';
          this.saving.set(false);
          this.loadData();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || 'Import failed');
          this.saving.set(false);
        }
      });
    } catch (e) {
      this.alert.error('Invalid JSON format. Check syntax.');
    }
  }

  exportPack(langCode: string): void {
    const dict: Record<string, string> = {};
    this.matrix.forEach(item => {
      dict[item.key_name] = item.translations?.[langCode] || item.default_text;
    });

    const jsonStr = JSON.stringify(dict, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_${langCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.alert.success(`Exported ${langCode.toUpperCase()} translation pack!`);
  }

  publishLive(): void {
    this.saving.set(true);
    this.commonService.postApi('translations/publish', {}).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || 'Translations published live!');
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }
}
