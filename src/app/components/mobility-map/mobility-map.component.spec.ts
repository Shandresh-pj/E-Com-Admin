import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobilityMapComponent } from './mobility-map.component';
import { provideHttpClient } from '@angular/common/http';

describe('MobilityMapComponent', () => {
  let component: MobilityMapComponent;
  let fixture: ComponentFixture<MobilityMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobilityMapComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(MobilityMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create mobility map component', () => {
    expect(component).toBeTruthy();
  });
});
