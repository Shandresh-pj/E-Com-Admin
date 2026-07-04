import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryTracking } from './delivery-tracking';

describe('DeliveryTracking', () => {
  let component: DeliveryTracking;
  let fixture: ComponentFixture<DeliveryTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryTracking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryTracking);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
