import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private ws: WebSocket | null = null;
  private eventSubject = new Subject<{ event: string; data: any }>();
  private isConnected = false;
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
    if (this.ws || this.isConnected) return;
    if (!this.currentToken) return;

    const socketBase = environment.socketUrl || environment.apiUrl.replace(/\/api$/, '');
    const wsUrl = socketBase.replace(/^http/, 'ws') + '/ws/?EIO=4&transport=websocket';

    try {
      this.ws = new WebSocket(wsUrl);

      // The native WebSocket isn't reliably zone-patched, so its callbacks can
      // run outside Angular's zone — state updates happen but nothing tells
      // Angular to re-render until an unrelated zone-patched event (like a
      // route change) forces a change-detection pass. Force it explicitly.
      this.ws.onopen = () => {
        this.ngZone.run(() => {
          console.log('[WebSocket] Connected');
          this.isConnected = true;
        });
      };

      this.ws.onmessage = (event) => {
        this.ngZone.run(() => {
          console.log('[WebSocket] Message received:', event.data);
          this.handleMessage(event.data);
        });
      };

      this.ws.onerror = (err) => {
        this.ngZone.run(() => {
          console.error('[WebSocket] Error:', err);
        });
      };

      this.ws.onclose = () => {
        this.ngZone.run(() => {
          console.log('[WebSocket] Disconnected');
          this.cleanup();
          if (this.currentToken) {
            setTimeout(() => this.connect(), 3000);
          }
        });
      };

    } catch (e) {
      console.error('[WebSocket] Connection failed:', e);
      setTimeout(() => this.connect(), 3000);
    }
  }

  public disconnect(): void {
    this.cleanup();
    this.currentToken = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup(): void {
    this.isConnected = false;
  }

  private handleMessage(data: string): void {
    if (!data) return;

    const eioType = data.charAt(0);
    const payload = data.substring(1);

    if (eioType === '0') {
      try {
        // Handshake ack only — the server drives the ping/pong heartbeat
        // from here (Engine.IO v4: server pings, client only pongs below).
        JSON.parse(payload);

        const connectPayload = `40${JSON.stringify({ token: this.currentToken })}`;
        this.sendRaw(connectPayload);

      } catch (err) {
        console.error('[WebSocket] Failed to parse EIO open packet:', err);
      }
    } else if (eioType === '2') {
      // Server ping — reply with pong. Never send '2' (ping) ourselves;
      // under EIO v4 only the server initiates pings, and a client-sent
      // ping is a protocol violation that gets the connection dropped.
      this.sendRaw('3');
    } else if (eioType === '4') {
      const sioType = payload.charAt(0);
      const sioPayload = payload.substring(1);

      if (sioType === '2') {
        try {
          const parsed = JSON.parse(sioPayload);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            const event = parsed[0];
            const eventData = parsed[1];
            this.eventSubject.next({ event, data: eventData });

            if (event === 'permissions-updated') {
              console.log('Received updated permissions via socket', eventData);
              this.sessionRefreshSubject.next({ permissions: eventData });
            } else if (event === 'logout') {
              console.log('Force logout event received via socket', eventData);
              this.sessionExpiredSubject.next();
            }
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse SIO message:', err);
        }
      }
    }
  }

  private sendRaw(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Message sent:', message);
      this.ws.send(message);
    }
  }

  public on<T = any>(eventName: string): Observable<T> {
    return this.eventSubject.asObservable().pipe(
      filter((e) => e.event === eventName),
      map((e) => e.data as T)
    );
  }

  public emit(eventName: string, data: any): void {
    const payload = `42${JSON.stringify([eventName, data])}`;
    this.sendRaw(payload);
  }
}
