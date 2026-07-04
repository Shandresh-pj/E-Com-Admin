import { TestBed } from '@angular/core/testing';
import { CoreService } from './core.service';
import { defaults } from '../config';

describe('CoreService', () => {
  let service: CoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return default options initially', () => {
    const options = service.getOptions();
    expect(options).toEqual(defaults);
  });

  it('should update options correctly', () => {
    service.setOptions({ sidenavOpened: true });
    const options = service.getOptions();
    expect(options.sidenavOpened).toBe(true);
    // Ensure it keeps other default values
    expect(options.sidenavCollapsed).toBe(defaults.sidenavCollapsed);
  });
});
