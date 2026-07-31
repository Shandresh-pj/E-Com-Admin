import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';

export interface FleetItem {
  regNo: string;
  model: string;
  category: string;
  driverName: string;
  health: string;
  energyPct: number;
  isEV: boolean;
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE';
}

@Component({
  selector: 'app-fleet-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fleet-management.component.html',
  styleUrl: './fleet-management.component.scss'
})
export class FleetManagementComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public filterStatus: string = 'ALL';

  public fleetList: FleetItem[] = [
    { regNo: 'KA 01 MJ 8821', model: 'Hyundai Xcent Prime', category: 'Sedan', driverName: 'Rajesh Kumar', health: 'Excellent', energyPct: 82, isEV: false, status: 'ACTIVE' },
    { regNo: 'KA 05 EV 1002', model: 'Tata Ace Gold EV', category: 'Logistics Mini Truck', driverName: 'Vikram Singh', health: 'Optimal', energyPct: 94, isEV: true, status: 'ACTIVE' },
    { regNo: 'KA 03 ET 4490', model: 'Tata Tigor EV Sedan', category: 'BluSmart EV', driverName: 'Anita Sharma', health: 'Optimal', energyPct: 76, isEV: true, status: 'ACTIVE' },
    { regNo: 'KA 02 EX 9011', model: 'TVS King Deluxe Rickshaw', category: 'Auto Rickshaw', driverName: 'Mohammed Ali', health: 'Good', energyPct: 60, isEV: false, status: 'ACTIVE' },
    { regNo: 'KA 51 MB 1234', model: 'Toyota Innova Crysta 2.4Z', category: 'SUV Exec', driverName: 'Suresh Gowda', health: 'Service Due', energyPct: 45, isEV: false, status: 'MAINTENANCE' }
  ];

  ngOnInit(): void {
    this.mobilityService.loadCategories();
  }

  inspectVehicle(item: FleetItem): void {
    alert(`📊 Vehicle Telemetry Log [${item.regNo}]\nModel: ${item.model}\nDriver: ${item.driverName}\nHealth Status: ${item.health}\nEnergy Gauge: ${item.energyPct}%`);
  }
}
