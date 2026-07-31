import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';
import { ActiveBooking } from '../../models/mobility.models';
import { MobilityMapComponent } from '../mobility-map/mobility-map.component';

@Component({
  selector: 'app-live-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, MobilityMapComponent],
  templateUrl: './live-tracking.component.html',
  styleUrl: './live-tracking.component.scss'
})
export class LiveTrackingComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public selectedBooking = signal<ActiveBooking | null>(null);
  public currentSpeed: number = 42;
  public remainingMinutes: number = 18;
  public playbackProgress: number = 35;

  ngOnInit(): void {
    this.mobilityService.loadActiveBookings().subscribe((bookings: ActiveBooking[]) => {
      if (bookings.length > 0) {
        this.selectedBooking.set(bookings[0]);
      }
    });
  }

  callDriver(): void {
    const phone = this.selectedBooking()?.driver?.phone || '+91 98765 43210';
    alert(`📞 Connecting VoIP Encrypted Security Call to Driver at ${phone}...`);
  }

  triggerSosEmergency(): void {
    alert('🚨 EMERGENCY SOS ACTIVATED!\nLocation broadcast to Police Control Room (112), Enterprise Fleet Safety Command & Emergency Contacts.');
  }
}
