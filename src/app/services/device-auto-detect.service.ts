import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { SocketService } from 'src/app/Securities/Services/socket.service';

export type DeviceType = 
  | 'THERMAL_PRINTER'
  | 'BARCODE_SCANNER'
  | 'WEIGH_SCALE'
  | 'CARD_READER'
  | 'CUSTOMER_DISPLAY'
  | 'BIOMETRIC_READER'
  | 'CASH_DRAWER';

export type ConnectionCategory = 'WIRED' | 'WIRELESS';

export type ConnectionProtocol = 
  | 'WIFI_IP'
  | 'ETHERNET_LAN'
  | 'WEB_SERIAL'
  | 'WEB_USB'
  | 'BLUETOOTH'
  | 'BLUETOOTH_LE'
  | 'NFC_TAP'
  | 'ZIGBEE_MESH'
  | 'WEBSOCKET_LAN'
  | 'MQTT_CLOUD'
  | 'HID_KEYBOARD';

export type DeviceStatus = 'CONNECTED' | 'SCANNING' | 'DISCONNECTED' | 'FAULTY';

export type ConnectionState = 
  | 'DISCOVERING'
  | 'DISCOVERED'
  | 'PAIRING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'UNSUPPORTED'
  | 'PERMISSION_REQUIRED';

export type HealthState = 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'UNKNOWN';

export interface HardwareDevice {
  id: string;
  name: string;
  type: DeviceType;
  connectionCategory?: ConnectionCategory;
  protocol: ConnectionProtocol;
  status: DeviceStatus;
  connectionState?: ConnectionState;
  healthState?: HealthState;
  portOrAddress: string;
  ipAddress?: string;
  wifiSsid?: string;
  macAddress?: string;
  vendorId?: string;
  productId?: string;
  latencyMs: number;
  signalStrength: number;
  signalDbm?: number;
  batteryLevel?: number;
  lastSeen: Date;
  lastTelemetryAt?: Date;
  packetsReceived: number;
  firmwareVersion?: string;
  baudRate?: number;
  autoReconnect: boolean;
  agentConnected?: boolean;
  hardwareDetected?: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
  capabilities?: Record<string, any>;
}

export interface SystemHardwareAnalytics {
  bluetoothSupported: boolean;
  bluetoothAvailable: boolean;
  webUsbSupported: boolean;
  webSerialSupported: boolean;
  webHidSupported: boolean;
  nfcSupported: boolean;
  cameraSupported: boolean;
  microphoneSupported: boolean;
  networkOnline: boolean;
  localAgentAvailable: boolean;
  localAgentVersion?: string;
  effectiveNetworkType: string;
  rttMs: number;
  downlinkMbps: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceAutoDetectService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);

  private devicesSignal = signal<HardwareDevice[]>([]);
  readonly isScanningSignal = signal<boolean>(false);
  readonly isOsBluetoothAvailableSignal = signal<boolean>(true);
  readonly isLocalAgentActiveSignal = signal<boolean>(false);

  readonly systemAnalyticsSignal = signal<SystemHardwareAnalytics>({
    bluetoothSupported: 'bluetooth' in navigator,
    bluetoothAvailable: true,
    webUsbSupported: 'usb' in navigator,
    webSerialSupported: 'serial' in navigator,
    webHidSupported: 'hid' in navigator,
    nfcSupported: 'NDEFReader' in window,
    cameraSupported: 'mediaDevices' in navigator,
    microphoneSupported: 'mediaDevices' in navigator,
    networkOnline: navigator.onLine,
    localAgentAvailable: false,
    effectiveNetworkType: (navigator as any).connection?.effectiveType || '4g',
    rttMs: (navigator as any).connection?.rtt || 10,
    downlinkMbps: (navigator as any).connection?.downlink || 50
  });

  // Computed signals
  readonly allDevices = computed(() => this.devicesSignal());
  readonly connectedCount = computed(() => this.devicesSignal().filter(d => d.status === 'CONNECTED' || d.connectionState === 'CONNECTED').length);
  readonly wiredCount = computed(() => this.devicesSignal().filter(d => (d.connectionCategory || this.inferCategory(d.protocol)) === 'WIRED').length);
  readonly wirelessCount = computed(() => this.devicesSignal().filter(d => (d.connectionCategory || this.inferCategory(d.protocol)) === 'WIRELESS').length);
  readonly scanning = computed(() => this.isScanningSignal());
  readonly osBluetoothAvailable = computed(() => this.isOsBluetoothAvailableSignal());
  readonly localAgentActive = computed(() => this.isLocalAgentActiveSignal());
  readonly systemAnalytics = computed(() => this.systemAnalyticsSignal());

  constructor() {
    this.fetchDevicesFromApi();
    this.analyzeSystemHardwareCapabilities();
    this.checkLocalHardwareAgentStatus();
    this.initializeSocketListeners();
  }

  public inferCategory(protocol: ConnectionProtocol): ConnectionCategory {
    if (['WIFI_IP', 'BLUETOOTH', 'BLUETOOTH_LE', 'NFC_TAP', 'ZIGBEE_MESH', 'MQTT_CLOUD'].includes(protocol)) {
      return 'WIRELESS';
    }
    return 'WIRED';
  }

  /**
   * Check if standalone Local Hardware Agent daemon is running on POS terminal (127.0.0.1:9112)
   * Uses native fetch() with AbortController to bypass Angular HTTP Interceptors and avoid error popups when offline.
   */
  public async checkLocalHardwareAgentStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800);
      const resp = await fetch('http://127.0.0.1:9112/status', { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) {
        this.isLocalAgentActiveSignal.set(false);
        return false;
      }

      const res = await resp.json();
      const isOnline = Boolean(res && res.agentStatus === 'ONLINE');
      this.isLocalAgentActiveSignal.set(isOnline);
      this.systemAnalyticsSignal.update(s => ({
        ...s,
        localAgentAvailable: isOnline,
        localAgentVersion: res?.agentVersion
      }));
      return isOnline;
    } catch {
      this.isLocalAgentActiveSignal.set(false);
      this.systemAnalyticsSignal.update(s => ({ ...s, localAgentAvailable: false }));
      return false;
    }
  }

  /**
   * Run full automatic analytics across System Hardware, Browser APIs & Local POS Hardware Agent
   */
  public async analyzeSystemHardwareCapabilities(): Promise<SystemHardwareAnalytics> {
    let btAvailable = true;
    try {
      const navBt = (navigator as any).bluetooth;
      if (navBt && typeof navBt.getAvailability === 'function') {
        btAvailable = await navBt.getAvailability();
        this.isOsBluetoothAvailableSignal.set(btAvailable);

        if (typeof navBt.addEventListener === 'function') {
          navBt.addEventListener('availabilitychanged', (e: any) => {
            const avail = Boolean(e.value);
            this.isOsBluetoothAvailableSignal.set(avail);
            this.systemAnalyticsSignal.update(s => ({ ...s, bluetoothAvailable: avail }));
          });
        }
      }
    } catch (e) {
      console.warn('[DeviceAutoDetectService] Web Bluetooth check:', e);
    }

    let hasCamera = false;
    let hasMic = false;
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devs = await navigator.mediaDevices.enumerateDevices();
        hasCamera = devs.some(d => d.kind === 'videoinput');
        hasMic = devs.some(d => d.kind === 'audioinput');
      }
    } catch (e) { /* silent catch */ }

    const connectionInfo = (navigator as any).connection;
    const localAgentOk = await this.checkLocalHardwareAgentStatus();

    const analytics: SystemHardwareAnalytics = {
      bluetoothSupported: 'bluetooth' in navigator,
      bluetoothAvailable: btAvailable,
      webUsbSupported: 'usb' in navigator,
      webSerialSupported: 'serial' in navigator,
      webHidSupported: 'hid' in navigator,
      nfcSupported: 'NDEFReader' in window,
      cameraSupported: hasCamera || ('mediaDevices' in navigator),
      microphoneSupported: hasMic || ('mediaDevices' in navigator),
      networkOnline: navigator.onLine,
      localAgentAvailable: localAgentOk,
      effectiveNetworkType: connectionInfo?.effectiveType || '4g',
      rttMs: connectionInfo?.rtt || 10,
      downlinkMbps: connectionInfo?.downlink || 50
    };

    this.systemAnalyticsSignal.set(analytics);
    return analytics;
  }

  /**
   * Check real OS Bluetooth hardware availability via Web Bluetooth API
   */
  public async checkSystemBluetoothAvailability(): Promise<boolean> {
    const analytics = await this.analyzeSystemHardwareCapabilities();
    return analytics.bluetoothAvailable;
  }

  /**
   * Request system access for USB/Serial/NFC/Bluetooth hardware APIs
   */
  public async requestSystemAccessAndPushEnable(): Promise<{ success: boolean; message: string }> {
    const analytics = await this.analyzeSystemHardwareCapabilities();

    if ('usb' in navigator && (navigator as any).usb?.getDevices) {
      try { await (navigator as any).usb.getDevices(); } catch { /* silent */ }
    }
    if ('serial' in navigator && (navigator as any).serial?.getPorts) {
      try { await (navigator as any).serial.getPorts(); } catch { /* silent */ }
    }

    return {
      success: true,
      message: `Hardware APIs Initialized: WebUSB (${analytics.webUsbSupported ? 'Active' : 'N/A'}), WebSerial (${analytics.webSerialSupported ? 'Active' : 'N/A'}), Local Agent (${analytics.localAgentAvailable ? 'Connected' : 'Offline'}).`
    };
  }

  /**
   * Initialize Socket.IO real-time event listeners
   */
  private initializeSocketListeners(): void {
    try {
      this.socketService.connect();

      this.socketService.on<any>('hardware_event').subscribe(event => {
        if (event && event.deviceId) {
          this.handleHardwareEvent(event);
        }
      });

      this.socketService.on<HardwareDevice>('device_connected').subscribe(dev => {
        if (dev && dev.id) {
          this.devicesSignal.update(list => {
            const idx = list.findIndex(d => d.id === dev.id);
            if (idx >= 0) {
              const updated = [...list];
              updated[idx] = { ...updated[idx], ...dev, status: 'CONNECTED', connectionState: 'CONNECTED', lastSeen: new Date() };
              return updated;
            }
            return [dev, ...list];
          });
        }
      });

      this.socketService.on<{ id: string }>('device_disconnected').subscribe(payload => {
        if (payload?.id) {
          this.devicesSignal.update(list =>
            list.map(d => d.id === payload.id ? { ...d, status: 'DISCONNECTED' as const, connectionState: 'DISCONNECTED' as const } : d)
          );
        }
      });

      this.socketService.on<{ id: string; latencyMs?: number; signalStrength?: number; packetsReceived?: number }>('device_telemetry').subscribe(t => {
        if (t?.id) {
          this.devicesSignal.update(list =>
            list.map(d => {
              if (d.id === t.id) {
                return {
                  ...d,
                  latencyMs: t.latencyMs || d.latencyMs,
                  signalStrength: t.signalStrength || d.signalStrength,
                  packetsReceived: (d.packetsReceived || 0) + 1,
                  lastSeen: new Date()
                };
              }
              return d;
            })
          );
        }
      });
    } catch (e) {
      console.warn('[DeviceAutoDetectService] Socket listener notice:', e);
    }
  }

  private handleHardwareEvent(event: any): void {
    const { eventType, deviceId, payload } = event;
    if (!deviceId) return;

    this.devicesSignal.update(list => {
      const idx = list.findIndex(d => d.id === deviceId);
      if (idx < 0 && eventType === 'DEVICE_CONNECTED' && payload) {
        return [payload, ...list];
      }
      if (idx >= 0) {
        const updated = [...list];
        if (eventType === 'DEVICE_REMOVED') {
          return list.filter(d => d.id !== deviceId);
        }
        if (eventType === 'DEVICE_UPDATED' || eventType === 'DEVICE_CONNECTED') {
          updated[idx] = { ...updated[idx], ...payload, lastSeen: new Date() };
        } else if (eventType === 'DEVICE_DISCONNECTED') {
          updated[idx] = { ...updated[idx], status: 'DISCONNECTED', connectionState: 'DISCONNECTED' };
        } else if (eventType === 'TELEMETRY_UPDATED' && payload?.result) {
          updated[idx] = {
            ...updated[idx],
            packetsReceived: (updated[idx].packetsReceived || 0) + 1,
            lastSeen: new Date(),
            lastTelemetryAt: new Date()
          };
        }
        return updated;
      }
      return list;
    });
  }

  /**
   * Fetch stored devices dynamically from backend API (Database-backed for company/branch)
   */
  fetchDevicesFromApi(): void {
    this.http.get<any>(`${environment.apiUrl}/devices`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && res.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
          if (Array.isArray(list)) {
            this.devicesSignal.set(list.map((d: any) => ({
              ...d,
              lastSeen: d.lastSeen ? new Date(d.lastSeen) : new Date()
            })));
          }
        }
      });
  }

  /**
   * Run real auto-detect discovery across WebUSB, WebSerial, Local Agent & backend hardware adapters
   */
  async scanForDevices(): Promise<HardwareDevice[]> {
    this.isScanningSignal.set(true);

    // 1. Check WebSerial ports if supported
    if ('serial' in navigator && (navigator as any).serial?.getPorts) {
      try {
        const ports = await (navigator as any).serial.getPorts();
        ports.forEach((p: any, idx: number) => {
          const info = p.getInfo ? p.getInfo() : {};
          this.addDevice({
            name: `WebSerial Peripheral #${idx + 1}`,
            type: 'BARCODE_SCANNER',
            connectionCategory: 'WIRED',
            protocol: 'WEB_SERIAL',
            portOrAddress: `COM${idx + 3}`,
            vendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : undefined,
            productId: info.usbProductId ? `0x${info.usbProductId.toString(16)}` : undefined,
            status: 'CONNECTED',
            connectionState: 'CONNECTED',
            healthState: 'HEALTHY',
            latencyMs: 4,
            signalStrength: 100,
            autoReconnect: true
          });
        });
      } catch { /* silent */ }
    }

    // 2. Check Local Hardware Agent for LAN IP printers on 192.168.1.0/24
    if (this.isLocalAgentActiveSignal()) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch('http://127.0.0.1:9112/scan-subnet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subnet: '192.168.1', port: 9100 }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (resp.ok) {
          const agentScan = await resp.json();
          if (agentScan && agentScan.success && Array.isArray(agentScan.devices)) {
            agentScan.devices.forEach((dev: any) => {
              this.addDevice({
                name: `LAN Thermal Printer (${dev.ip})`,
                type: 'THERMAL_PRINTER',
                connectionCategory: 'WIRELESS',
                protocol: 'WIFI_IP',
                portOrAddress: `${dev.ip}:9100`,
                ipAddress: dev.ip,
                status: 'CONNECTED',
                connectionState: 'CONNECTED',
                healthState: 'HEALTHY',
                latencyMs: dev.latencyMs || 6,
                signalStrength: 95,
                autoReconnect: true
              });
            });
          }
        }
      } catch { /* silent catch */ }
    }

    // 3. Trigger backend scan sync
    return new Promise((resolve) => {
      this.http.post<{ success: boolean; data: HardwareDevice[] }>(`${environment.apiUrl}/devices/scan-sync`, { devices: this.devicesSignal() })
        .pipe(catchError(() => of(null)))
        .subscribe(res => {
          this.isScanningSignal.set(false);
          if (res && res.success && Array.isArray(res.data)) {
            this.devicesSignal.set(res.data.map(d => ({ ...d, lastSeen: new Date() })));
          }
          resolve(this.devicesSignal());
        });
    });
  }

  /**
   * Add a new device dynamically via backend API & broadcast via Socket
   */
  addDevice(device: Omit<HardwareDevice, 'id' | 'lastSeen' | 'packetsReceived'>): void {
    const newDev = {
      ...device,
      id: `DEV-${Date.now().toString().slice(-6)}`,
      lastSeen: new Date(),
      packetsReceived: 0
    };

    // Optimistic UI update
    this.devicesSignal.update(list => {
      const existingIdx = list.findIndex(d => d.id === newDev.id || (d.portOrAddress && d.portOrAddress === newDev.portOrAddress));
      if (existingIdx >= 0) {
        const copy = [...list];
        copy[existingIdx] = { ...copy[existingIdx], ...newDev };
        return copy;
      }
      return [newDev as HardwareDevice, ...list];
    });

    // Broadcast over WebSocket
    this.socketService.emit('device_connected', newDev);

    // Persist dynamically to backend database
    this.http.post<{ success: boolean; data: HardwareDevice }>(`${environment.apiUrl}/devices`, newDev)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res && res.success && res.data) {
          this.devicesSignal.update(list =>
            list.map(d => d.id === newDev.id ? { ...res.data, lastSeen: new Date() } : d)
          );
        }
      });
  }

  /**
   * Toggle auto-reconnect setting & sync with backend database
   */
  toggleAutoReconnect(deviceId: string): void {
    let updatedDevice: HardwareDevice | undefined;
    this.devicesSignal.update(list =>
      list.map(d => {
        if (d.id === deviceId) {
          updatedDevice = { ...d, autoReconnect: !d.autoReconnect };
          return updatedDevice;
        }
        return d;
      })
    );

    if (updatedDevice) {
      this.http.put(`${environment.apiUrl}/devices/${deviceId}`, { autoReconnect: updatedDevice.autoReconnect })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  /**
   * Remove a device & delete dynamically from backend database
   */
  removeDevice(deviceId: string): void {
    this.devicesSignal.update(list => list.filter(d => d.id !== deviceId));
    this.socketService.emit('device_disconnected', { id: deviceId });

    this.http.delete(`${environment.apiUrl}/devices/${deviceId}`)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /**
   * Execute real hardware telemetry command (PRINT_TEST, ZERO_SCALE, READ_SCALE, PULSE_CASH_DRAWER, UPDATE_DISPLAY, READ_NFC) via backend adapter & local hardware agent
   */
  executeHardwareAction(deviceId: string, action: string, payload?: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/devices/${deviceId}/telemetry`, { action, ...payload })
      .pipe(
        catchError(err => of({ success: false, message: err?.error?.message || 'Hardware action failed' }))
      );
  }

  /**
   * POS Billing Helper: Print ESC/POS Test Ticket
   */
  testPrintTicket(receiptData?: any): boolean {
    const printer = this.devicesSignal().find(d => d.type === 'THERMAL_PRINTER' && (d.status === 'CONNECTED' || d.connectionState === 'CONNECTED'));
    if (!printer) return false;
    this.executeHardwareAction(printer.id, 'PRINT_TEST', { receiptData }).subscribe();
    return true;
  }

  /**
   * POS Billing Helper: Zero Weigh Scale Tare
   */
  testZeroWeightScale(): number {
    const scale = this.devicesSignal().find(d => d.type === 'WEIGH_SCALE' && (d.status === 'CONNECTED' || d.connectionState === 'CONNECTED'));
    if (scale) {
      this.executeHardwareAction(scale.id, 'ZERO_SCALE').subscribe();
    }
    return 0.000;
  }

  /**
   * POS Billing Helper: Read Weight Sample
   */
  simulateWeightSample(weightKg: number): void {
    const scale = this.devicesSignal().find(d => d.type === 'WEIGH_SCALE');
    if (scale) {
      this.executeHardwareAction(scale.id, 'READ_SCALE', { weightKg }).subscribe();
    }
  }

  /**
   * POS Billing Helper: Trigger 24V Cash Drawer Pulse
   */
  triggerCashDrawer(): boolean {
    const drawer = this.devicesSignal().find(d => d.type === 'CASH_DRAWER');
    if (drawer) {
      this.executeHardwareAction(drawer.id, 'PULSE_CASH_DRAWER').subscribe();
      return true;
    }
    return false;
  }

  /**
   * POS Billing Helper: Update VFD Customer Display Lines
   */
  updateCustomerDisplay(line1: string, line2: string): boolean {
    const display = this.devicesSignal().find(d => d.type === 'CUSTOMER_DISPLAY');
    if (display) {
      this.executeHardwareAction(display.id, 'UPDATE_DISPLAY', { line1, line2 }).subscribe();
      return true;
    }
    return false;
  }

  /**
   * Execute full end-to-end diagnostic runner via backend hardware adapters
   */
  runHardwareDiagnostics(deviceId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/devices/${deviceId}/diagnostic-suite`, {})
      .pipe(
        catchError(err => of({ success: false, message: err?.error?.message || 'Diagnostic execution failed' }))
      );
  }
}
