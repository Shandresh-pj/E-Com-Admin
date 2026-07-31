import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleCategory } from '../../models/mobility.models';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.scss'
})
export class VehicleCardComponent {
  @Input() category!: VehicleCategory;
  @Input() estimatedFare: number = 0;
  @Input() isSelected: boolean = false;
  @Output() onSelect = new EventEmitter<VehicleCategory>();
}
