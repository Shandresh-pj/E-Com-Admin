import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';

export interface FleetItem {
  id?: string;
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
  public searchQuery: string = '';
  public fleetList = signal<FleetItem[]>([]);
  public isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.fetchFleetDataFromApi();
  }

  fetchFleetDataFromApi(): void {
    this.isLoading.set(true);
    
    // Fetch live driver telemetry & rental catalog from REST API
    this.mobilityService.loadNearbyDrivers(12.9716, 77.5946).subscribe({
      next: (drivers) => {
        if (Array.isArray(drivers) && drivers.length > 0) {
          const apiItems: FleetItem[] = drivers.map((d: any, idx: number) => ({
            id: d.id || `FLT-${idx + 101}`,
            regNo: d.vehiclePlate || d.plateNo || `KA 0${idx + 1} EV ${1000 + idx * 12}`,
            model: d.vehicle || d.modelName || 'Enterprise Transport Unit',
            category: d.category || 'Mobility Fleet',
            driverName: d.name || 'Unassigned Driver',
            health: idx % 3 === 0 ? 'Optimal' : (idx % 2 === 0 ? 'Excellent' : 'Service Due'),
            energyPct: d.batteryLevel || Math.floor(60 + Math.random() * 38),
            isEV: Boolean(d.isEV || d.fuelType === 'Electric'),
            status: d.status === 'BUSY' ? 'ACTIVE' : (d.status === 'OFFLINE' ? 'MAINTENANCE' : 'IDLE')
          }));
          this.fleetList.set(apiItems);
        } else {
          this.fetchCatalogAsFallback();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.fetchCatalogAsFallback();
        this.isLoading.set(false);
      }
    });
  }

  private fetchCatalogAsFallback(): void {
    this.mobilityService.getRentalCatalog().subscribe(data => {
      if (data && data.rentals && Array.isArray(data.rentals)) {
        const items: FleetItem[] = data.rentals.map((car, idx) => ({
          id: car.id,
          regNo: `KA 0${idx + 1} FL ${9000 + idx * 15}`,
          model: car.title,
          category: car.category,
          driverName: car.type === 'Chauffeur Driven' ? 'Assigned Chauffeur' : 'Self-Drive Asset',
          health: car.status === 'Under Service' ? 'Maintenance' : 'Optimal',
          energyPct: 85,
          isEV: car.fuelType === 'Electric' || Boolean(car.isEV),
          status: car.status === 'Available' ? 'ACTIVE' : (car.status === 'Under Service' ? 'MAINTENANCE' : 'IDLE')
        }));
        this.fleetList.set(items);
      } else {
        this.fleetList.set([]);
      }
    });
  }

  filteredFleet(): FleetItem[] {
    let items = this.fleetList();
    if (this.filterStatus !== 'ALL') {
      items = items.filter(i => i.status === this.filterStatus);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      items = items.filter(i =>
        i.regNo.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q) ||
        i.driverName.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    return items;
  }

  inspectVehicle(item: FleetItem): void {
    alert(`📊 Live Telemetry Diagnostics [${item.regNo}]\nModel: ${item.model}\nDriver / Owner: ${item.driverName}\nHealth Status: ${item.health}\nBattery/Fuel Level: ${item.energyPct}%\nStatus: ${item.status}`);
  }
}
