import { ComponentFixture, TestBed } from '@angular/core';
import { CorporateTransportComponent } from './corporate-transport.component';

describe('CorporateTransportComponent', () => {
  let component: CorporateTransportComponent;
  let fixture: ComponentFixture<CorporateTransportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CorporateTransportComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CorporateTransportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create corporate transport component', () => {
    expect(component).toBeTruthy();
  });
});
