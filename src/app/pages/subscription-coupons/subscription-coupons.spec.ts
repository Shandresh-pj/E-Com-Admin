import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubscriptionCouponsComponent } from './subscription-coupons';

describe('SubscriptionCouponsComponent', () => {
  let component: SubscriptionCouponsComponent;
  let fixture: ComponentFixture<SubscriptionCouponsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionCouponsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubscriptionCouponsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
