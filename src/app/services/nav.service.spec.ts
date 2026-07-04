import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { NavService } from './nav.service';

describe('NavService', () => {
  let service: NavService;
  let eventsSubject: Subject<any>;

  beforeEach(() => {
    eventsSubject = new Subject<any>();
    
    TestBed.configureTestingModule({
      providers: [
        NavService,
        {
          provide: Router,
          useValue: {
            events: eventsSubject.asObservable()
          }
        }
      ]
    });
    
    service = TestBed.inject(NavService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have undefined currentUrl initially', () => {
    expect(service.currentUrl()).toBeUndefined();
  });

  it('should update currentUrl on NavigationEnd event', () => {
    const navEndEvent = new NavigationEnd(1, '/dashboard', '/dashboard');
    eventsSubject.next(navEndEvent);
    
    expect(service.currentUrl()).toBe('/dashboard');
  });

  it('should not update currentUrl on other router events', () => {
    // Send a plain event that is not NavigationEnd
    eventsSubject.next({ id: 1, url: '/dashboard' });
    
    expect(service.currentUrl()).toBeUndefined();
  });
});
