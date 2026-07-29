import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private eventSubject = new Subject<{ event: string; data: any }>();
  private currentToken: string | null = null;

  private sessionSubject = new Subject<any>();
  private sessionExpiredSubject = new Subject<void>();
  private sessionRefreshSubject = new Subject<any>();

  session$: Observable<any> = this.sessionSubject.asObservable();
  sessionExpired$: Observable<void> = this.sessionExpiredSubject.asObservable();
  sessionRefresh$: Observable<any> = this.sessionRefreshSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  public connect(token?: string): void {
    if (token) {
      this.currentToken = token;
    }
    if (!this.currentToken) return;

    if (this.socket && this.socket.connected) return;

    const socketUrl = (environment as any).socketUrl || environment.apiUrl.replace(/\/api$/, '');

    try {
      this.socket = io(socketUrl, {
        path: '/ws',
        auth: { token: this.currentToken },
        query: { token: this.currentToken },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        this.ngZone.run(() => {
          console.log('[Socket.IO] Connected successfully with ID:', this.socket?.id);
        });
      });

      this.socket.onAny((event: string, data: any) => {
        this.ngZone.run(() => {
          console.log(`[Socket.IO] Real-time event '${event}':`, data);
          this.eventSubject.next({ event, data });

          if (event === 'permissions-updated') {
            console.log('Received updated permissions via socket', data);
            this.sessionRefreshSubject.next({ permissions: data });
          } else if (event === 'logout') {
            console.log('Force logout event received via socket', data);
            this.sessionExpiredSubject.next();
          }
        });
      });

      this.socket.on('disconnect', (reason) => {
        this.ngZone.run(() => {
          console.log('[Socket.IO] Disconnected from server:', reason);
        });
      });

      this.socket.on('connect_error', (err) => {
        this.ngZone.run(() => {
          console.warn('[Socket.IO] Connection error (retrying in background...):', err?.message || err);
        });
      });

    } catch (e) {
      console.error('[Socket.IO] Initialization failed:', e);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
  }

  public on<T = any>(eventName: string): Observable<T> {
    return this.eventSubject.asObservable().pipe(
      filter((e) => e.event === eventName),
      map((e) => e.data as T)
    );
  }

  public emit(eventName: string, data: any, ack?: (response: any) => void): void {
    if (this.socket && this.socket.connected) {
      if (ack) {
        this.socket.emit(eventName, data, ack);
      } else {
        this.socket.emit(eventName, data);
      }
    }
  }
}
