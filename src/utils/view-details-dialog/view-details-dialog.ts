import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ViewDetailField {
  label: string;
  value: any;
  isImage?: boolean;
  isImageList?: boolean;
  isVideo?: boolean;
}

export interface ViewDetailsDialogData {
  title: string;
  fields: ViewDetailField[];
}

@Component({
  selector: 'app-view-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './view-details-dialog.html',
  styleUrl: './view-details-dialog.scss',
})
export class ViewDetailsDialog {
  constructor(
    public dialogRef: MatDialogRef<ViewDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ViewDetailsDialogData
  ) {}

  close() {
    this.dialogRef.close();
  }
}
