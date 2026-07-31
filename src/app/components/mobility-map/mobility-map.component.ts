import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriverProfile } from '../../models/mobility.models';
import { MobilityService } from '../../services/mobility.service';

@Component({
  selector: 'app-mobility-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobility-map.component.html',
  styleUrl: './mobility-map.component.scss'
})
export class MobilityMapComponent implements OnInit, OnDestroy {
  private mobilityService = inject(MobilityService);

  @Input() pickupAddress: string = 'MG Road, Bengaluru';
  @Input() dropAddress: string = 'Koramangala, Bengaluru';

  public activeDrivers = signal<DriverProfile[]>([]);
  public selectedDriver = signal<DriverProfile | null>(null);
  public showTraffic = signal<boolean>(false);
  private timer: any;

  ngOnInit(): void {
    this.fetchDrivers();
    this.timer = setInterval(() => {
      this.fetchDrivers();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  fetchDrivers(): void {
    this.mobilityService.loadNearbyDrivers().subscribe(drivers => {
      this.activeDrivers.set(drivers);
    });
  }

  getX(driver: DriverProfile, index: number): number {
    const basePositions = [220, 310, 420, 510, 590];
    const offset = Math.sin(Date.now() / 1000 + index) * 15;
    return (basePositions[index % basePositions.length] || 400) + offset;
  }

  getY(driver: DriverProfile, index: number): number {
    const basePositions = [320, 240, 260, 180, 150];
    const offset = Math.cos(Date.now() / 1000 + index) * 15;
    return (basePositions[index % basePositions.length] || 250) + offset;
  }

  selectDriver(driver: DriverProfile): void {
    this.selectedDriver.set(driver);
  }

  toggleTraffic(): void {
    this.showTraffic.update(val => !val);
  }

  resetView(): void {
    this.selectedDriver.set(null);
  }
}
