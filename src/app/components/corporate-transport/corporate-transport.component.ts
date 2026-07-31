import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';

@Component({
  selector: 'app-corporate-transport',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corporate-transport.component.html',
  styleUrl: './corporate-transport.component.scss'
})
export class CorporateTransportComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  public activeModule: 'corporate' | 'school' = 'corporate';
  public rosters: any[] = [];

  ngOnInit(): void {
    this.fetchRosters();
  }

  fetchRosters(): void {
    this.mobilityService.getCorporateRosters().subscribe(data => {
      this.rosters = data;
    });
  }

  createRoster(): void {
    alert('AI Roster Optimization Engine: Generated 14 optimal pickup routes for TechCorp Global Morning Shift.');
  }
}
