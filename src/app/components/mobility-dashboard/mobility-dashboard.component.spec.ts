import { ComponentFixture, TestBed } from '@angular/core';
import { MobilityDashboardComponent } from './mobility-dashboard.component';
import { provideHttpClient } from '@angular/common/http';

describe('MobilityDashboardComponent', () => {
  let component: MobilityDashboardComponent;
  let fixture: ComponentFixture<MobilityDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobilityDashboardComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(MobilityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create mobility dashboard component', () => {
    expect(component).toBeTruthy();
  });
});
