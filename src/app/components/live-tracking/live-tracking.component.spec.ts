import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveTrackingComponent } from './live-tracking.component';
import { provideHttpClient } from '@angular/common/http';

describe('LiveTrackingComponent', () => {
  let component: LiveTrackingComponent;
  let fixture: ComponentFixture<LiveTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTrackingComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(LiveTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create live tracking component', () => {
    expect(component).toBeTruthy();
  });
});
