import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarRentalComponent } from './car-rental.component';
import { provideHttpClient } from '@angular/common/http';

describe('CarRentalComponent', () => {
  let component: CarRentalComponent;
  let fixture: ComponentFixture<CarRentalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarRentalComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(CarRentalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create car rental component', () => {
    expect(component).toBeTruthy();
  });
});
