import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DesktopService {
  /**
   * Returns true if the application is running inside an Electron Desktop shell.
   */
  readonly isDesktop: boolean = this.detectDesktopEnvironment();

  private detectDesktopEnvironment(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const userAgent = window.navigator?.userAgent?.toLowerCase() || '';
    const isElectronUA = userAgent.includes('electron');
    const hasElectronGlobal = (window as any).isElectron === true || typeof (window as any).electronAPI !== 'undefined';
    return isElectronUA || hasElectronGlobal;
  }
}
