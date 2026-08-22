import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliveryTracking } from './delivery-tracking';
import { provideHttpClient } from '@angular/common/http';

describe('DeliveryTracking', () => {
  let component: DeliveryTracking;
  let fixture: ComponentFixture<DeliveryTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryTracking],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryTracking);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create delivery tracking component', () => {
    expect(component).toBeTruthy();
  });
});
