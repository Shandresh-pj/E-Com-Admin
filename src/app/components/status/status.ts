import { ChangeDetectorRef, Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { MatTable } from 'src/utils/mat-table/mat-table';

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

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alert: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    this.StatusForm = fb.group({
      StatusCode: ['', Validators.required],
      StatusFor: ['COMMON', Validators.required]
    });
  }

  ngOnInit() {
    this.getStatuses();
  }

  getStatuses() {
    this.commonService.getApi(`Status/All`).subscribe({
      next: (res: any) => {
        this.Statuses = res?.data?.data;
        this.cdr.detectChanges();
      }
    });
  }

  AddNewUser() {
    this.Status_Forms = true;
  }

  editUser(status: any) {
    this.SelectedStatusId = status?.Id;
    this.Status_Forms = true;
    this.Update_button = true;
    this.StatusForm.patchValue({
      StatusCode: status?.StatusCode,
      StatusFor: status?.StatusFor
    });
  }

  deleteUser(status: any) {
    this.commonService.deleteApi(`Status/${status?.Id}`).subscribe({
      next: (res: any) => {
        this.alert.success("Status deleted successfully");
        this.getStatuses();
      }
    });
  }

  cancelStatus() {
    this.Status_Forms = false;
    this.Update_button = false;
    this.StatusForm.reset({ StatusFor: 'COMMON' });
  }

  submit(form: FormGroup) {
    const payload = form.value;
    if (!this.Update_button) {
      this.commonService.postApi(`Status/Add`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Status Created Successfully");
          this.refreshAndClose();
        }
      });
    } else {
      this.commonService.postApi(`Status/Update/${this.SelectedStatusId}`, payload).subscribe({
        next: (res: any) => {
          this.alert.success("Status Updated Successfully");
          this.refreshAndClose();
        }
      });
    }
  }

  private refreshAndClose() {
    this.commonService.getApi(`Status/All`).subscribe({
      next: (res: any) => {
        this.Statuses = res?.data?.data;
        this.cancelStatus();
        this.cdr.detectChanges();
      }
    });
  }
}
