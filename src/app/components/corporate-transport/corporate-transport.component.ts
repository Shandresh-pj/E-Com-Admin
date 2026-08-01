import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobilityService } from '../../services/mobility.service';

export interface CorporateContract {
  id: string;
  clientName: string;
  category: string;
  activeEmployees: number;
  monthlyAmount: number;
  icon: string;
  themeColor: 'purple' | 'emerald' | 'amber';
}

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
  public rosters = signal<any[]>([]);
  public contracts = signal<CorporateContract[]>([]);
  public isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.fetchRosters();
  }

  fetchRosters(): void {
    this.isLoading.set(true);
    this.mobilityService.getCorporateRosters().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.rosters.set(data);
          // Derive dynamic corporate contract cards from API rosters
          const uniqueClients = Array.from(new Set(data.map((r: any) => r.clientName || 'Corporate Client')));
          const apiContracts: CorporateContract[] = uniqueClients.map((client, idx) => ({
            id: `CNT-${idx + 101}`,
            clientName: client,
            category: idx % 2 === 0 ? 'Enterprise Shift Transit' : 'School & Executive Fleet',
            activeEmployees: (idx + 1) * 180,
            monthlyAmount: (idx + 1) * 350000 + 150000,
            icon: idx % 2 === 0 ? 'ri-building-4-line' : 'ri-bus-line',
            themeColor: idx % 3 === 0 ? 'purple' : (idx % 3 === 1 ? 'emerald' : 'amber')
          }));
          this.contracts.set(apiContracts);
        } else {
          this.rosters.set([]);
          this.contracts.set([]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.rosters.set([]);
        this.contracts.set([]);
        this.isLoading.set(false);
      }
    });
  }

  createRoster(): void {
    const newId = `RST-${Math.floor(100 + Math.random() * 900)}`;
    const newRoster = {
      id: newId,
      clientName: 'TechCorp Global Enterprise',
      shiftTime: '08:00 AM (Morning Shift)',
      vehicleAssigned: 'Tata Tigor EV — KA 01 MJ 8821',
      paxCount: 14,
      securityEscort: true,
      status: 'DISPATCHED'
    };
    this.rosters.update(arr => [newRoster, ...arr]);
    alert(`🎉 Dynamic Roster ${newId} Created & Dispatched!`);
  }
}
