import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

@Component({
  selector: 'app-roles',
  imports: [ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatTable,
    AppTranslatePipe],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {

  RolesForm: FormGroup;
  Roles: any[] = [];
  isSubmitting = false;
  isEditing = false;
  selectedRoleId: number | null = null;

  tableColumns = [
    { columnDef: 'id',   header: 'No' },
    { columnDef: 'name', header: 'Roles Name' },
  ];

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private auth: AuthService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    public perm: PermissionService
  ) {
    this.RolesForm = fb.group({
      name:     ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true, Validators.required]
    });
  }

  ngOnInit() {
    this.getRoles();
  }

  getRoles() {
    this.commonService.getApi('roles').subscribe({
      next: (res: any) => {
        this.Roles = res?.data ?? [];
        this.cdr.detectChanges();
      }
    });
  }

  cancelRoles() {
    this.RolesForm.reset({ isActive: true });
    this.isEditing = false;
    this.selectedRoleId = null;
  }

  onsubmit(form: FormGroup) {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = form.getRawValue();

    const request$ = this.isEditing && this.selectedRoleId
      ? this.commonService.putApi(`roles/${this.selectedRoleId}`, payload)
      : this.commonService.postApi('roles', payload);

    request$.subscribe({
      next: () => {
        this.alert.success(this.isEditing ? 'Role updated successfully' : 'Role created successfully');
        this.cancelRoles();
        this.getRoles();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  /** Called by the mat-table edit action button. */
  onEdit(role: any) {
    this.selectedRoleId = role.id;
    this.isEditing = true;
    this.RolesForm.patchValue({
      name:     role.name,
      isActive: role.isActive ?? role.is_active ?? true
    });
  }

  /** Called by the mat-table delete action button. */
  onDelete(role: any) {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"? This cannot be undone.`)) return;

    this.commonService.deleteApi(`roles/${role.id}`).subscribe({
      next: () => {
        this.alert.success('Role deleted successfully');
        this.getRoles();
        this.cdr.detectChanges();
      }
    });
  }
}
