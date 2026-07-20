import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillingHistoryComponent } from './billing-history';

describe('BillingHistoryComponent', () => {
  let component: BillingHistoryComponent;
  let fixture: ComponentFixture<BillingHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillingHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
