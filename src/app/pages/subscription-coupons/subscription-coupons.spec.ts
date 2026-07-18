import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionCoupons } from './subscription-coupons';

describe('SubscriptionCoupons', () => {
  let component: SubscriptionCoupons;
  let fixture: ComponentFixture<SubscriptionCoupons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionCoupons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionCoupons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
