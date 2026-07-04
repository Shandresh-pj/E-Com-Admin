import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';

@Component({
  selector: 'app-delivery-tracking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './delivery-tracking.html',
  styleUrl: './delivery-tracking.scss',
})
export class DeliveryTracking implements OnInit {
  trackings: any[] = [];
  orders: any[] = [];
  employees: any[] = [];
  companies: any[] = [];
  branches: any[] = [];

  trackingForm: FormGroup;
  locationForm: FormGroup;
  
  showStartForm = false;
  showLocationForm = false;
  selectedTrackingId: number | null = null;
  loading = false;
  currentUser: any = null;
  detectedEmployee: any = null;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    public perm: PermissionService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.trackingForm = this.fb.group({
      order_id: ['', Validators.required],
      delivery_boy_id: ['', Validators.required],
      company_id: ['', Validators.required],
      branch_id: ['', Validators.required],
      latitude: [40.7128, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [-74.0060, [Validators.required, Validators.min(-180), Validators.max(180)]]
    });

    this.locationForm = this.fb.group({
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]]
    });
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading = true;

    this.commonService.getApi('companies').subscribe({
      next: (res: any) => { this.companies = res?.data || []; }
    });

    this.commonService.getApi('branches').subscribe({
      next: (res: any) => { this.branches = res?.data || []; }
    });

    this.commonService.getApi('orders').subscribe({
      next: (res: any) => { this.orders = res?.data || []; }
    });

    this.commonService.getApi('employees').subscribe({
      next: (res: any) => {
        this.employees = res?.data || [];
        this.detectEmployeeMapping();
        this.loadTrackings();
      },
      error: () => { this.loading = false; }
    });
  }

  detectEmployeeMapping() {
    if (!this.currentUser) return;

    const mapped = this.employees.find(
      e => e.email?.toLowerCase() === this.currentUser.email?.toLowerCase()
    );

    if (mapped) {
      this.detectedEmployee = mapped;
      this.trackingForm.patchValue({
        delivery_boy_id: mapped.id,
        company_id: mapped.company_id || (mapped.company?.id),
        branch_id: mapped.branch_id || (mapped.branch?.id)
      });
    }
  }

  loadTrackings() {
    this.commonService.getApi('delivery-tracking').subscribe({
      next: (res: any) => {
        const rawList = res?.data || [];
        this.trackings = rawList.map((item: any) => {
          const dboy = this.employees.find(e => e.id === item.delivery_boy_id);
          const order = this.orders.find(o => o.id === item.order_id);
          return {
            ...item,
            delivery_boy_name: dboy ? dboy.name : `ID: ${item.delivery_boy_id}`,
            invoice_no: order ? order.invoice_no : `Order #${item.order_id}`,
            created_at: item.created_at ? new Date(item.created_at).toLocaleString() : '-'
          };
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tracking data:', err);
        this.loading = false;
      }
    });
  }

  toggleStartForm() {
    this.showStartForm = !this.showStartForm;
    this.showLocationForm = false;
    if (!this.showStartForm) {
      this.trackingForm.reset({
        latitude: 40.7128,
        longitude: -74.0060
      });
      this.detectEmployeeMapping();
    }
  }

  startDelivery() {
    if (this.trackingForm.invalid) {
      this.trackingForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.trackingForm.value;

    this.commonService.postApi('delivery-tracking/start', payload).subscribe({
      next: () => {
        this.alert.success("Delivery started successfully");
        this.toggleStartForm();
        this.loadTrackings();
      },
      error: (err) => {
        console.error('Failed to start delivery:', err);
        this.alert.error("Failed to start: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  openLocationDialog(row: any) {
    this.selectedTrackingId = row.id;
    this.showLocationForm = true;
    this.showStartForm = false;
    this.locationForm.patchValue({
      latitude: row.latitude,
      longitude: row.longitude
    });
  }

  cancelLocationUpdate() {
    this.showLocationForm = false;
    this.selectedTrackingId = null;
    this.locationForm.reset();
  }

  submitLocationUpdate() {
    if (this.locationForm.invalid || !this.selectedTrackingId) {
      this.locationForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const original = this.trackings.find(t => t.id === this.selectedTrackingId);
    if (!original) return;

    const payload = {
      order_id: original.order_id,
      delivery_boy_id: original.delivery_boy_id,
      company_id: original.company_id,
      branch_id: original.branch_id,
      latitude: Number(this.locationForm.value.latitude),
      longitude: Number(this.locationForm.value.longitude),
      status: original.status
    };

    this.commonService.postApi('delivery-tracking/location', payload).subscribe({
      next: () => {
        this.alert.success("Live location updated");
        this.cancelLocationUpdate();
        this.loadTrackings();
      },
      error: (err) => {
        console.error('Failed to update location:', err);
        this.alert.error("Location update failed: " + (err.error?.message || "Internal error"));
        this.loading = false;
      }
    });
  }

  markAsDelivered(row: any) {
    this.alert.confirm("Are you sure you want to mark this order as Delivered?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.postApi(`delivery-tracking/delivered/${row.id}`, {}).subscribe({
          next: () => {
            this.alert.success("Order delivered!");
            this.loadTrackings();
          },
          error: (err) => {
            console.error('Failed to mark delivered:', err);
            this.alert.error("Mark delivered failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }

  deleteTracking(row: any) {
    this.alert.confirm("Are you sure you want to delete this tracking assignment?").then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.commonService.deleteApi(`delivery-tracking/${row.id}`).subscribe({
          next: () => {
            this.alert.success("Tracking record deleted");
            this.loadTrackings();
          },
          error: (err) => {
            console.error('Failed to delete tracking:', err);
            this.alert.error("Delete failed: " + (err.error?.message || "Internal error"));
            this.loading = false;
          }
        });
      }
    });
  }
}
