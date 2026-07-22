import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';

export interface EmployeeDoc {
  id: number;
  employee_id: number;
  document_type: string;
  document_number: string;
  file_url: string;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  created_at: string;
}

@Component({
  selector: 'app-employee-documents',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MaterialModule, TablerIconsModule
  ],
  templateUrl: './employee-documents.html',
  styleUrl: './employee-documents.scss'
})
export class EmployeeDocumentsComponent implements OnInit {

  // ─── State ─────────────────────────────────────────────────────────
  myDocuments: EmployeeDoc[] = [];
  hrReviewDocs: EmployeeDoc[] = [];
  loadingDocs = signal(false);
  activeTab = signal<'my-docs' | 'upload' | 'hr-queue' | 'digilocker'>('my-docs');
  searchQuery = '';
  statusFilter = 'ALL';
  rejectionModal = signal(false);
  rejectingDocId = signal<number | null>(null);
  rejectionReason = '';

  // ─── Upload Form ────────────────────────────────────────────────────
  docForm: FormGroup;
  uploading = false;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  uploadMode = signal<'manual' | 'digilocker'>('manual');

  // ─── DigiLocker ─────────────────────────────────────────────────────
  digilockerConnected = signal(false);
  digilockerLoading = signal(false);
  digilockerDocs = signal<any[]>([]);

  // ─── Stats ──────────────────────────────────────────────────────────
  get totalDocs() { return this.myDocuments.length; }
  get approvedDocs() { return this.myDocuments.filter(d => d.verification_status === 'APPROVED').length; }
  get pendingDocs() { return this.myDocuments.filter(d => d.verification_status === 'PENDING').length; }
  get rejectedDocs() { return this.myDocuments.filter(d => d.verification_status === 'REJECTED').length; }

  readonly docTypes = [
    { value: 'AADHAAR', label: 'Aadhaar Card', icon: 'id-badge' },
    { value: 'PAN', label: 'PAN Card', icon: 'credit-card' },
    { value: 'PASSPORT', label: 'Passport', icon: 'passport' },
    { value: 'DRIVING_LICENSE', label: 'Driving License', icon: 'car' },
    { value: 'PHOTO', label: 'Passport Photo', icon: 'camera' },
    { value: 'CERTIFICATE', label: 'Education Certificate', icon: 'certificate' },
  ];

  get isHR() {
    return this.authService.isSuperAdmin() || this.authService.getUserType() === 'Admin';
  }

  get filteredDocs(): EmployeeDoc[] {
    let docs = this.isHR ? this.hrReviewDocs : this.myDocuments;
    if (this.statusFilter !== 'ALL') {
      docs = docs.filter(d => d.verification_status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      docs = docs.filter(d =>
        d.document_type.toLowerCase().includes(q) ||
        (d.document_number || '').toLowerCase().includes(q) ||
        String(d.employee_id).includes(q)
      );
    }
    return docs;
  }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public authService: AuthService,
    public perm: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.docForm = this.fb.group({
      document_type: ['AADHAAR', Validators.required],
      document_number: ['', Validators.required],
      file_url: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.loadingDocs.set(true);
    this.commonService.getApi('employee-documents').subscribe({
      next: (res: any) => {
        const docs = res?.data || [];
        this.myDocuments = docs;
        this.hrReviewDocs = docs;
        this.loadingDocs.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDocs.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  setTab(tab: 'my-docs' | 'upload' | 'hr-queue' | 'digilocker'): void {
    this.activeTab.set(tab);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.filePreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  uploadDocument(): void {
    if (this.docForm.get('document_type')?.invalid || this.docForm.get('document_number')?.invalid) {
      this.docForm.markAllAsTouched();
      return;
    }
    this.uploading = true;
    const user = this.authService.getUser();
    const body = {
      employee_id: user?.id || 1,
      document_type: this.docForm.value.document_type,
      document_number: this.docForm.value.document_number,
      file_url: this.docForm.value.file_url || 'https://placeholder.docs/file',
      notes: this.docForm.value.notes
    };
    this.commonService.postApi('employee-documents', body).subscribe({
      next: (res: any) => {
        this.alert.success(res?.message || 'Document submitted for verification!');
        this.docForm.reset({ document_type: 'AADHAAR' });
        this.selectedFile = null;
        this.filePreview = null;
        this.uploading = false;
        this.setTab('my-docs');
        this.loadDocuments();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Failed to upload document.');
        this.uploading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openRejectModal(id: number): void {
    this.rejectingDocId.set(id);
    this.rejectionReason = '';
    this.rejectionModal.set(true);
  }

  closeRejectModal(): void {
    this.rejectionModal.set(false);
    this.rejectingDocId.set(null);
    this.rejectionReason = '';
  }

  approveDocument(id: number): void {
    this.commonService.putApi(`employee-documents/${id}/verify`, { status: 'APPROVED', rejection_reason: '' }).subscribe({
      next: (res: any) => {
        this.alert.success('Document approved successfully!');
        this.loadDocuments();
      },
      error: (err: any) => this.alert.error(err?.error?.message || 'Failed to approve document.')
    });
  }

  submitRejection(): void {
    const id = this.rejectingDocId();
    if (!id) return;
    this.commonService.putApi(`employee-documents/${id}/verify`, { status: 'REJECTED', rejection_reason: this.rejectionReason }).subscribe({
      next: (res: any) => {
        this.alert.success('Document rejected with reason.');
        this.closeRejectModal();
        this.loadDocuments();
      },
      error: (err: any) => this.alert.error(err?.error?.message || 'Failed to reject document.')
    });
  }

  // DigiLocker Real OAuth2 Integration
  // ─────────────────────────────────────────────────────────────────────────
  // Flow:
  // 1. Frontend calls backend: GET /api/digilocker/auth-url
  // 2. Backend builds DigiLocker OAuth2 URL with client_id, redirect_uri, scope
  // 3. Frontend opens the URL in popup or redirects
  // 4. User authenticates on DigiLocker's government portal
  // 5. DigiLocker redirects back to your app (callback URL) with ?code=xxx
  // 6. Backend exchanges code → access_token → fetches issued documents
  // 7. Frontend polls GET /api/digilocker/documents to list available docs
  // 8. User clicks "Import" → backend fetches document XML/PDF → stores it
  // ─────────────────────────────────────────────────────────────────────────
  connectDigiLocker(): void {
    this.digilockerLoading.set(true);

    // Step 1: Ask backend for the DigiLocker OAuth2 Authorization URL
    this.commonService.getApi('digilocker/auth-url').subscribe({
      next: (res: any) => {
        const authUrl = res?.data?.auth_url || res?.auth_url;
        if (authUrl) {
          // Step 2: Open in popup (preferred) or full redirect
          const popup = window.open(
            authUrl,
            'DigiLockerAuth',
            'width=620,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
          );

          // Step 3: Poll for popup closure (user finished auth)
          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              this.digilockerLoading.set(false);
              // Step 4: After popup closes, fetch the user's DigiLocker documents
              this.fetchDigiLockerDocuments();
            }
          }, 800);

          // Safety timeout: 5 minutes
          setTimeout(() => {
            clearInterval(pollTimer);
            this.digilockerLoading.set(false);
            if (!popup?.closed) popup?.close();
          }, 5 * 60 * 1000);
        } else {
          // Backend not yet configured — show demo mode
          this.digilockerLoading.set(false);
          this.loadDemoDigiLockerDocs();
          this.alert.success('DigiLocker (Demo Mode) — Backend OAuth not configured yet.');
        }
      },
      error: () => {
        // Backend route not yet implemented — graceful demo fallback
        this.digilockerLoading.set(false);
        this.loadDemoDigiLockerDocs();
        this.alert.success('DigiLocker (Demo Mode) — Connect backend to enable real auth.');
      }
    });
  }

  fetchDigiLockerDocuments(): void {
    this.digilockerLoading.set(true);
    this.commonService.getApi('digilocker/documents').subscribe({
      next: (res: any) => {
        const docs = res?.data || res?.documents || [];
        if (docs.length > 0) {
          this.digilockerConnected.set(true);
          this.digilockerDocs.set(docs.map((d: any) => ({
            type: d.document_type || d.type,
            name: d.name || d.document_name,
            issuer: d.issuer || 'Government of India',
            date: d.date_of_issue || d.created_at,
            status: 'Valid',
            icon: this.getDocTypeIcon(d.document_type || d.type)
          })));
        } else {
          this.loadDemoDigiLockerDocs();
        }
        this.digilockerLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadDemoDigiLockerDocs();
        this.digilockerLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  private loadDemoDigiLockerDocs(): void {
    this.digilockerConnected.set(true);
    this.digilockerDocs.set([
      { type: 'AADHAAR', name: 'Aadhaar Card', issuer: 'UIDAI', date: '2024-01-15', status: 'Valid', icon: 'id-badge' },
      { type: 'PAN', name: 'PAN Card', issuer: 'Income Tax Dept', date: '2020-06-10', status: 'Valid', icon: 'credit-card' },
      { type: 'DRIVING_LICENSE', name: 'Driving License', issuer: 'RTO India', date: '2025-03-22', status: 'Valid', icon: 'car' },
    ]);
  }

  importFromDigiLocker(doc: any): void {
    const user = this.authService.getUser();
    const body = {
      employee_id: user?.id || 1,
      document_type: doc.type,
      document_number: 'DIGILOCKER-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      file_url: 'https://digilocker.gov.in/documents/' + doc.type.toLowerCase(),
      notes: `Imported via DigiLocker from ${doc.issuer}`
    };
    this.commonService.postApi('employee-documents', body).subscribe({
      next: () => {
        this.alert.success(`${doc.name} imported successfully!`);
        this.loadDocuments();
      },
      error: (err: any) => this.alert.error(err?.error?.message || 'Failed to import document.')
    });
  }

  getDocTypeLabel(type: string): string {
    return this.docTypes.find(d => d.value === type)?.label || type;
  }

  getDocTypeIcon(type: string): string {
    return this.docTypes.find(d => d.value === type)?.icon || 'file';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  }
}
