import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FareBreakdown, VehicleCategory } from '../../models/mobility.models';

@Component({
  selector: 'app-fare-breakdown-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fare-breakdown-dialog.component.html',
  styleUrl: './fare-breakdown-dialog.component.scss'
})
export class FareBreakdownDialogComponent {
  @Input() category?: VehicleCategory;
  @Input() breakdown?: FareBreakdown;
  @Output() onClose = new EventEmitter<void>();
}
