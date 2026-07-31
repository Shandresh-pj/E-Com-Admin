import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleCardComponent } from './vehicle-card.component';

describe('VehicleCardComponent', () => {
  let component: VehicleCardComponent;
  let fixture: ComponentFixture<VehicleCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleCardComponent);
    component = fixture.componentInstance;
    component.category = {
      id: 'sedan',
      name: 'Prime Sedan',
      type: 'Passenger',
      icon: 'ri-car-line',
      baseFare: 80,
      perKm: 22,
      perMin: 3.0,
      capacity: 4,
      luggage: '3 Bags',
      eta: '5 mins',
      dynamicMultiplier: 1.2,
      isEV: false,
      tag: 'Comfort'
    };
    fixture.detectChanges();
  });

  it('should create vehicle card component', () => {
    expect(component).toBeTruthy();
  });
});
