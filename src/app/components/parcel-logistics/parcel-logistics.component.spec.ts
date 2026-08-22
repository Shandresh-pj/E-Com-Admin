import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParcelLogisticsComponent } from './parcel-logistics.component';
import { provideHttpClient } from '@angular/common/http';

describe('ParcelLogisticsComponent', () => {
  let component: ParcelLogisticsComponent;
  let fixture: ComponentFixture<ParcelLogisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParcelLogisticsComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(ParcelLogisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create parcel logistics component', () => {
    expect(component).toBeTruthy();
  });
});
