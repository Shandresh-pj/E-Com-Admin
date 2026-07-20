import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StandardCheckoutComponent } from './standard-checkout';

describe('StandardCheckoutComponent', () => {
  let component: StandardCheckoutComponent;
  let fixture: ComponentFixture<StandardCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardCheckoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
