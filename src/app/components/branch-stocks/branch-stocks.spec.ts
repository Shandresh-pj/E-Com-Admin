import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchStocks } from './branch-stocks';

describe('BranchStocks', () => {
  let component: BranchStocks;
  let fixture: ComponentFixture<BranchStocks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchStocks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchStocks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
