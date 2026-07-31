import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { DashboardStatsResponse, ActiveBooking } from '../../models/mobility.models';

@Component({
  selector: 'app-mobility-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mobility-dashboard.component.html',
  styleUrl: './mobility-dashboard.component.scss'
})
export class MobilityDashboardComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public currentRole: string = 'super_admin';
  public stats = signal<DashboardStatsResponse | null>(null);
  public activeBookings = signal<ActiveBooking[]>([]);

  public defaultRevenueChart = [
    { month: 'Jan', ride: 45000, rental: 28000, logistics: 52000 },
    { month: 'Feb', ride: 52000, rental: 31000, logistics: 61000 },
    { month: 'Mar', ride: 61000, rental: 39000, logistics: 74000 },
    { month: 'Apr', ride: 78000, rental: 45000, logistics: 89000 },
    { month: 'May', ride: 92000, rental: 58000, logistics: 105000 },
    { month: 'Jun', ride: 115000, rental: 64000, logistics: 132000 }
  ];

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.mobilityService.getDashboardStats(this.currentRole).subscribe((stats: DashboardStatsResponse) => {
      this.stats.set(stats);
    });

    this.mobilityService.loadActiveBookings().subscribe((bookings: ActiveBooking[]) => {
      this.activeBookings.set(bookings);
    });
  }

  switchRole(role: string): void {
    this.currentRole = role;
    this.fetchData();
  }
}
