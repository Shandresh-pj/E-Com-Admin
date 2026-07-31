import { ComponentFixture, TestBed } from '@angular/core';
import { FareBreakdownDialogComponent } from './fare-breakdown-dialog.component';

describe('FareBreakdownDialogComponent', () => {
  let component: FareBreakdownDialogComponent;
  let fixture: ComponentFixture<FareBreakdownDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FareBreakdownDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FareBreakdownDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create fare breakdown dialog component', () => {
    expect(component).toBeTruthy();
  });
});
