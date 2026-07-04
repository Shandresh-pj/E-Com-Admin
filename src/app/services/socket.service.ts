import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { TokenService } from '../Securities/Services/token.service';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private ws: WebSocket | null = null;
  private eventSubject = new Subject<{ event: string; data: any }>();
  private pingIntervalId: any = null;
  private isConnected = false;

  constructor(private tokenService: TokenService) {
    if (this.tokenService.isLoggedIn()) {
      this.connect();
    }
  }

  public connect(): void {
    if (this.ws || this.isConnected) return;

    const token = this.tokenService.getToken();
    if (!token) return;

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/?EIO=4&transport=websocket';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.cleanup();
        if (this.tokenService.isLoggedIn()) {
          setTimeout(() => this.connect(), 3000);
        }
      };

    } catch (e) {
      console.error('[WebSocket] Connection failed:', e);
      setTimeout(() => this.connect(), 3000);
    }
  }

  public disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup(): void {
    this.isConnected = false;
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private handleMessage(data: string): void {
    if (!data) return;

    const eioType = data.charAt(0);
    const payload = data.substring(1);

    if (eioType === '0') {
      try {
        const config = JSON.parse(payload);
        const pingInterval = config.pingInterval || 25000;
        this.startHeartbeat(pingInterval);

        const token = this.tokenService.getToken();
        const connectPayload = `40${JSON.stringify({ token })}`;
        this.sendRaw(connectPayload);

      } catch (err) {
        console.error('[WebSocket] Failed to parse EIO open packet:', err);
      }
    } else if (eioType === '2') {
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
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse SIO message:', err);
        }
      }
    }
  }

  private startHeartbeat(interval: number): void {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);

    this.pingIntervalId = setInterval(() => {
      if (this.isConnected) {
        this.sendRaw('2');
      }
    }, interval);
  }

  private sendRaw(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
