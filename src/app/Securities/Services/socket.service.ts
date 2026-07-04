import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private sessionSubject = new Subject<any>();
  private sessionExpiredSubject = new Subject<void>();
  private sessionRefreshSubject = new Subject<any>();

  session$: Observable<any> = this.sessionSubject.asObservable();
  sessionExpired$: Observable<void> = this.sessionExpiredSubject.asObservable();
  sessionRefresh$: Observable<any> = this.sessionRefreshSubject.asObservable();

  connect(token: string): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(environment.socketUrl, {
      auth: { token },
      path: '/ws',
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    this.socket.on('permissions-updated', (data: any) => {
      console.log('Received updated permissions via socket', data);
      this.sessionRefreshSubject.next({ permissions: data });
    });

    this.socket.on('logout', (data: any) => {
      console.log('Force logout event received via socket', data);
      this.sessionExpiredSubject.next();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
