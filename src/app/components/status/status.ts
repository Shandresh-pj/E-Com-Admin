import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatTable
  ],
  templateUrl: './status.html',
  styleUrl: './status.scss',
})
export class Status {
  tableColumns = [
    { columnDef: 'Id', header: 'No' },
    { columnDef: 'StatusCode', header: 'Status Code' },
    { columnDef: 'StatusFor', header: 'Status For' },
  ];

  StatusForm: FormGroup;
  Status_Forms: boolean = false;
  Update_button: boolean = false;
  Statuses: any;
  SelectedStatusId: any;

  get commonStatusesCount(): number { return (this.Statuses || []).filter((s: any) => (s.StatusFor || s.statusFor || '').toUpperCase() === 'COMMON').length; }
  get orderStatusesCount(): number { return (this.Statuses || []).filter((s: any) => (s.StatusFor || s.statusFor || '').toUpperCase() === 'ORDER').length; }
  get productStatusesCount(): number { return (this.Statuses || []).filter((s: any) => (s.StatusFor || s.statusFor || '').toUpperCase() === 'PRODUCT').length; }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {
    this.StatusForm = fb.group({
      StatusCode: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9_]+$/)]],
      StatusFor: ['COMMON', [Validators.required, Validators.maxLength(50)]]
    });
  }

  ngOnInit() {
    this.getStatuses();
  }

  getStatuses() {
    this.commonService.getApi(`Status/All`).subscribe({
      next: (res: any) => {
        const rawList = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
        this.Statuses = rawList.map((s: any, idx: number) => {
          const idVal = s?.Id ?? s?.id ?? s?.ID ?? (idx + 1);
          const codeVal = s?.StatusCode ?? s?.statusCode ?? s?.status_code ?? '';
          const forVal = s?.StatusFor ?? s?.statusFor ?? s?.status_for ?? 'COMMON';
          return {
            ...s,
            Id: idVal,
            id: idVal,
            StatusCode: codeVal,
            statusCode: codeVal,
            StatusFor: forVal,
            statusFor: forVal
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.Statuses = [];
        this.cdr.detectChanges();
      }
    });
  }

  AddNewUser() {
    this.Status_Forms = true;
  }

  editUser(status: any) {
    this.SelectedStatusId = status?.Id ?? status?.id ?? status?.ID;
    this.Status_Forms = true;
    this.Update_button = true;
    this.StatusForm.patchValue({
      StatusCode: status?.StatusCode ?? status?.statusCode ?? status?.status_code ?? '',
      StatusFor: status?.StatusFor ?? status?.statusFor ?? status?.status_for ?? 'COMMON'
    });
  }

  deleteUser(status: any) {
    const targetId = status?.Id ?? status?.id ?? status?.ID;
    this.alert.confirm("Are you sure you want to delete this status?").then((result) => {
      if (result.isConfirmed) {
        this.commonService.deleteApi(`Status/${targetId}`).subscribe({
          next: (res: any) => {
            this.alert.success("Status deleted successfully");
            this.getStatuses();
          },
          error: (err: any) => {
            this.alert.error(err?.error?.message || "Failed to delete status");
          }
        });
      }
    });
  }

  cancelStatus() {
    this.Status_Forms = false;
    this.Update_button = false;
    this.StatusForm.reset({ StatusFor: 'COMMON' });
  }

  submit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const payload = form.value;
    if (!this.Update_button) {
      this.commonService.postApi(`Status/Add`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Status Created Successfully");
          this.refreshAndClose();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || "Failed to create status");
        }
      });
    } else {
      const updatePayload = {
        ...payload,
        Id: this.SelectedStatusId,
        id: this.SelectedStatusId
      };
      this.commonService.putApi(`Status/Update/${this.SelectedStatusId}`, updatePayload).pipe(
        catchError(() => this.commonService.patchApi(`Status/${this.SelectedStatusId}`, updatePayload)),
        catchError(() => this.commonService.postApi(`Status/Update/${this.SelectedStatusId}`, updatePayload))
      ).subscribe({
        next: (res: any) => {
          this.alert.success("Status Updated Successfully");
          this.refreshAndClose();
        },
        error: (err: any) => {
          this.alert.error(err?.error?.message || "Failed to update status");
        }
      });
    }
  }

  private refreshAndClose() {
    this.getStatuses();
    this.cancelStatus();
  }
}

