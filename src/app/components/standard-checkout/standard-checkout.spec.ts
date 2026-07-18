import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardCheckout } from './standard-checkout';

describe('StandardCheckout', () => {
  let component: StandardCheckout;
  let fixture: ComponentFixture<StandardCheckout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardCheckout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardCheckout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
