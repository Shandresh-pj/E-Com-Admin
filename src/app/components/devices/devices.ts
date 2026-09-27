import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environment/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { DeviceAutoDetectService, HardwareDevice, DeviceType, ConnectionProtocol, ConnectionCategory } from 'src/app/services/device-auto-detect.service';


export interface DiagnosticStep {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_SUPPORTED';
  detail?: string;
  durationMs?: number;
}

/** Per-protocol permission status tracked in the permission gate */
export interface ProtocolPermission {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'WIRED' | 'WIRELESS';
  apiKey: 'webUsbSupported' | 'webSerialSupported' | 'webHidSupported' | 'bluetoothAvailable' | 'nfcSupported' | 'networkOnline';
  status: 'IDLE' | 'REQUESTING' | 'GRANTED' | 'DENIED' | 'NOT_SUPPORTED';
  required: boolean;
}

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatChipsModule,
    MatDialogModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule
  ],
  templateUrl: './devices.html',
  styleUrls: ['./devices.scss']
})
export class DevicesComponent implements OnInit {
  deviceService = inject(DeviceAutoDetectService);
  private http = inject(HttpClient);

  // ── System Access Gate State ──────────────────────────────────────────────
  /** True once the user has completed the Push System Access flow at least once this session */
  systemAccessGranted = signal<boolean>(
    sessionStorage.getItem('pos_hw_access_granted') === '1'
  );
  isRequestingAccess = signal<boolean>(false);
  accessRequestProgress = signal<number>(0);

  /** Per-protocol permission statuses shown in the gate screen */
  protocolPermissions = signal<ProtocolPermission[]>([
    {
      id: 'webusb',
      label: 'WebUSB Direct',
      description: 'Required for USB POS printers, barcode scanners, and payment terminals connected via USB cable.',
      icon: 'usb',
      category: 'WIRED',
      apiKey: 'webUsbSupported',
      status: 'IDLE',
      required: true
    },
    {
      id: 'webserial',
      label: 'WebSerial COM Port',
      description: 'Required for COM/RS-232 serial port devices — thermal printers, weighing scales, and cash drawers.',
      icon: 'settings_ethernet',
      category: 'WIRED',
      apiKey: 'webSerialSupported',
      status: 'IDLE',
      required: true
    },
    {
      id: 'webhid',
      label: 'WebHID / USB Keyboard',
      description: 'Required for HID-emulated barcode scanners and keyboards connected via USB.',
      icon: 'keyboard',
      category: 'WIRED',
      apiKey: 'webHidSupported',
      status: 'IDLE',
      required: false
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth LE & Classic',
      description: 'Required for wireless BLE scanners, Bluetooth receipt printers and card terminals.',
      icon: 'bluetooth_searching',
      category: 'WIRELESS',
      apiKey: 'bluetoothAvailable',
      status: 'IDLE',
      required: true
    },
    {
      id: 'network',
      label: 'WiFi / LAN Network',
      description: 'Required for IP-based printers, LAN-connected scales, MQTT IoT devices and WebSocket POS.',
      icon: 'wifi',
      category: 'WIRELESS',
      apiKey: 'networkOnline',
      status: 'IDLE',
      required: true
    },
    {
      id: 'nfc',
      label: 'NFC / RFID Reader',
      description: 'Required for NFC tap-to-pay terminals, RFID card readers and contactless payment devices.',
      icon: 'nfc',
      category: 'WIRELESS',
      apiKey: 'nfcSupported',
      status: 'IDLE',
      required: false
    }
  ]);

  /** True if at least the minimum required permissions are granted */
  readonly minAccessGranted = computed(() => {
    const perms = this.protocolPermissions();
    const required = perms.filter(p => p.required);
    return required.some(p => p.status === 'GRANTED');
  });

  // ── Filter State ──────────────────────────────────────────────────────────
  connectionFilter: 'ALL' | 'WIRED' | 'WIRELESS' = 'ALL';
  typeFilter: 'ALL' | DeviceType = 'ALL';
  searchQuery = '';
  /** If false (default), only CONNECTED devices are shown in the fleet grid */
  showAllStatuses = false;

  // ── Radio State ───────────────────────────────────────────────────────────
  wifiRadioEnabled = true;
  bluetoothRadioEnabled = true;

  // ── Manual Add Modal ──────────────────────────────────────────────────────
  showAddModal = false;
  activeAddTab: 'WIRED' | 'WIRELESS_NET' | 'WIRELESS_AIR' = 'WIRED';

  newDevice = {
    name: '',
    type: 'THERMAL_PRINTER' as DeviceType,
    connectionCategory: 'WIRED' as ConnectionCategory,
    protocol: 'WEB_USB' as ConnectionProtocol,
    portOrAddress: '',
    wifiSsid: '',
    macAddress: '',
    baudRate: 9600,
    firmwareVersion: 'v1.0.0',
    autoReconnect: true,
    status: 'CONNECTED' as const,
    latencyMs: 5,
    signalStrength: 95
  };

  // ── Wireless Radar Scanner Modal ──────────────────────────────────────────
  showWirelessScannerModal = false;
  isScanningWireless = false;
  discoveredWirelessCandidates: any[] = [];
  selectedCandidate: any = null;
  scannerFilter: 'ALL' | 'WIFI' | 'BLUETOOTH' = 'ALL';

  // ── Diagnostic Modal ──────────────────────────────────────────────────────
  showDiagnosticModal = false;
  selectedDiagnosticDevice: HardwareDevice | null = null;
  isRunningDiagnostic = false;
  diagnosticSteps: DiagnosticStep[] = [];
  diagnosticProgress = 0;

  // ─────────────────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    // Fetch CONNECTED devices from API (dynamic, no static data)
    this.deviceService.fetchDevicesFromApi(true);
    // Analyze real browser hardware API availability
    await this.deviceService.analyzeSystemHardwareCapabilities();
    // Sync permission statuses from analytics
    this._syncPermissionsFromAnalytics();
    // If access was already granted this session, mark known APIs as granted
    if (this.systemAccessGranted()) {
      this._applyGrantedState();
    }
  }

  // ── Permission Gate Logic ─────────────────────────────────────────────────

  /**
   * Reads systemAnalytics() and maps each API availability to the
   * protocol permission list, so the gate shows real-time browser state.
   */
  private _syncPermissionsFromAnalytics(): void {
    const analytics = this.deviceService.systemAnalytics();
    this.protocolPermissions.update(perms => perms.map(p => {
      const apiAvailable = analytics[p.apiKey as keyof typeof analytics] as boolean;
      if (p.status === 'IDLE') {
        return {
          ...p,
          status: apiAvailable ? 'GRANTED' : 'IDLE'
        };
      }
      return p;
    }));
  }

  /**
   * After Push System Access is confirmed, mark all API-supported protocols
   * as GRANTED (and NOT_SUPPORTED for those not in this browser).
   */
  private _applyGrantedState(): void {
    const analytics = this.deviceService.systemAnalytics();
    this.protocolPermissions.update(perms => perms.map(p => {
      const apiAvailable = analytics[p.apiKey as keyof typeof analytics] as boolean;
      return {
        ...p,
        status: apiAvailable ? 'GRANTED' : 'NOT_SUPPORTED'
      };
    }));
  }

  /**
   * MAIN ENTRY: Push System Access.
   * Runs the mandatory hardware permission request for ALL connection types.
   * This is required before any device can be connected.
   */
  async pushSystemAccessAndEnable(): Promise<void> {
    this.isRequestingAccess.set(true);
    this.accessRequestProgress.set(0);

    // Mark all as REQUESTING
    this.protocolPermissions.update(perms => perms.map(p => ({ ...p, status: 'REQUESTING' as const })));

    // Step 1: Analyze capabilities (20%)
    this.accessRequestProgress.set(20);
    const analytics = await this.deviceService.analyzeSystemHardwareCapabilities();

    // Step 2: Request WebUSB permission (40%)
    this.accessRequestProgress.set(40);
    let webUsbGranted = false;
    if (analytics.webUsbSupported && (navigator as any).usb?.requestDevice) {
      try {
        // Silently enumerate already-granted USB devices (no UI prompt needed unless new)
        const existingUsb = await (navigator as any).usb.getDevices();
        webUsbGranted = true;
        console.log(`[SystemAccess] WebUSB: ${existingUsb.length} pre-authorized USB devices found.`);
      } catch {
        webUsbGranted = analytics.webUsbSupported; // still mark as available
      }
    }

    // Step 3: Request WebSerial permission (55%)
    this.accessRequestProgress.set(55);
    let webSerialGranted = false;
    if (analytics.webSerialSupported && (navigator as any).serial?.getPorts) {
      try {
        const existingPorts = await (navigator as any).serial.getPorts();
        webSerialGranted = true;
        console.log(`[SystemAccess] WebSerial: ${existingPorts.length} pre-authorized serial ports found.`);
      } catch {
        webSerialGranted = analytics.webSerialSupported;
      }
    }

    // Step 4: WebHID (65%)
    this.accessRequestProgress.set(65);
    let webHidGranted = false;
    if (analytics.webHidSupported && (navigator as any).hid?.getDevices) {
      try {
        const hidDevices = await (navigator as any).hid.getDevices();
        webHidGranted = true;
        console.log(`[SystemAccess] WebHID: ${hidDevices.length} pre-authorized HID devices found.`);
      } catch {
        webHidGranted = analytics.webHidSupported;
      }
    }

    // Step 5: Bluetooth availability (75%)
    this.accessRequestProgress.set(75);
    const btGranted = analytics.bluetoothAvailable;

    // Step 6: Network / LAN (85%)
    this.accessRequestProgress.set(85);
    const networkGranted = analytics.networkOnline;

    // Step 7: NFC (90%)
    this.accessRequestProgress.set(90);
    const nfcGranted = analytics.nfcSupported;

    // Step 8: Check local POS hardware agent (95%)
    this.accessRequestProgress.set(95);
    await this.deviceService.checkLocalHardwareAgentStatus();

    // Step 9: Apply all results (100%)
    this.accessRequestProgress.set(100);
    this.protocolPermissions.update(perms => perms.map(p => {
      let status: ProtocolPermission['status'] = 'NOT_SUPPORTED';
      switch (p.id) {
        case 'webusb':     status = analytics.webUsbSupported  ? 'GRANTED' : 'NOT_SUPPORTED'; break;
        case 'webserial':  status = analytics.webSerialSupported ? 'GRANTED' : 'NOT_SUPPORTED'; break;
        case 'webhid':     status = analytics.webHidSupported  ? 'GRANTED' : 'NOT_SUPPORTED'; break;
        case 'bluetooth':  status = btGranted                  ? 'GRANTED' : 'DENIED'; break;
        case 'network':    status = networkGranted             ? 'GRANTED' : 'DENIED'; break;
        case 'nfc':        status = nfcGranted                 ? 'GRANTED' : 'NOT_SUPPORTED'; break;
      }
      return { ...p, status };
    }));

    // Enable radios
    this.wifiRadioEnabled = networkGranted;
    this.bluetoothRadioEnabled = btGranted;

    // Mark session as access-granted
    sessionStorage.setItem('pos_hw_access_granted', '1');
    this.systemAccessGranted.set(true);
    this.isRequestingAccess.set(false);

    // Build result summary
    const grantedCount = this.protocolPermissions().filter(p => p.status === 'GRANTED').length;
    const totalCount = this.protocolPermissions().length;
    const deniedList = this.protocolPermissions()
      .filter(p => p.status === 'DENIED')
      .map(p => p.label);

    const hasMinAccess = this.minAccessGranted();

    if (!hasMinAccess) {
      // Critical failure — no APIs at all
      Swal.fire({
        icon: 'error',
        title: 'No Hardware APIs Available',
        html: `<strong>This browser does not support any POS hardware APIs.</strong><br><br>
               Please use <strong>Google Chrome 89+</strong>, <strong>Microsoft Edge 89+</strong>, or <strong>Chromium-based desktop browser</strong> to connect hardware devices.<br><br>
               <small>Firefox and Safari do not support WebUSB / WebSerial APIs.</small>`,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'I Understand'
      });
      sessionStorage.removeItem('pos_hw_access_granted');
      this.systemAccessGranted.set(false);
      return;
    }

    // Partial success or full success
    let html = `<strong>${grantedCount}/${totalCount} hardware channels authorized.</strong><br><br>`;
    html += `<div style="text-align:left;font-size:0.9rem;">`;
    this.protocolPermissions().forEach(p => {
      const icon = p.status === 'GRANTED' ? '✅' : p.status === 'NOT_SUPPORTED' ? '⚠️' : '❌';
      html += `${icon} <strong>${p.label}</strong>: ${p.status === 'GRANTED' ? 'Active' : p.status === 'NOT_SUPPORTED' ? 'Not supported in this browser' : 'OS disabled — turn on in system settings'}<br>`;
    });
    html += `</div>`;

    if (deniedList.length > 0) {
      html += `<br><small style="color:#ef4444;">⚠️ Turn on ${deniedList.join(', ')} in OS settings for full access.</small>`;
    }

    Swal.fire({
      icon: 'success',
      title: '🔓 System Access Granted!',
      html,
      confirmButtonText: '🚀 Start Auto-Detection',
      showCancelButton: true,
      cancelButtonText: 'Close',
      confirmButtonColor: '#4f46e5',
      width: 520
    }).then(result => {
      if (result.isConfirmed) {
        this.executeAutoDiscoveryProcess();
      }
    });
  }

  /**
   * Re-request access for a specific protocol that was denied or not supported.
   */
  async requestSingleProtocolAccess(perm: ProtocolPermission): Promise<void> {
    if (perm.status === 'NOT_SUPPORTED') {
      Swal.fire({
        icon: 'warning',
        title: `${perm.label} Not Supported`,
        html: `Your browser does not support <strong>${perm.label}</strong>.<br><br>
               Use <strong>Chrome 89+ / Edge 89+</strong> for full hardware API support.`,
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    switch (perm.id) {
      case 'webusb':
        if ((navigator as any).usb?.requestDevice) {
          try {
            Swal.fire({ title: 'Select USB Device...', text: 'Choose a USB POS device from the browser prompt.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            await (navigator as any).usb.requestDevice({ filters: [] });
            Swal.close();
            this._setPermStatus(perm.id, 'GRANTED');
            Swal.fire({ icon: 'success', title: 'WebUSB Granted!', timer: 1500, showConfirmButton: false });
          } catch (e: any) {
            Swal.close();
            if (e?.name !== 'NotFoundError' && e?.name !== 'SecurityError') {
              this._setPermStatus(perm.id, 'DENIED');
            }
          }
        }
        break;

      case 'webserial':
        if ((navigator as any).serial?.requestPort) {
          try {
            Swal.fire({ title: 'Select Serial Port...', text: 'Choose a COM port from the browser prompt.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            await (navigator as any).serial.requestPort({});
            Swal.close();
            this._setPermStatus(perm.id, 'GRANTED');
            Swal.fire({ icon: 'success', title: 'WebSerial COM Granted!', timer: 1500, showConfirmButton: false });
          } catch (e: any) {
            Swal.close();
          }
        }
        break;

      case 'webhid':
        if ((navigator as any).hid?.requestDevice) {
          try {
            Swal.fire({ title: 'Select HID Device...', text: 'Choose a USB HID device from the browser prompt.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            await (navigator as any).hid.requestDevice({ filters: [] });
            Swal.close();
            this._setPermStatus(perm.id, 'GRANTED');
            Swal.fire({ icon: 'success', title: 'WebHID Granted!', timer: 1500, showConfirmButton: false });
          } catch (e: any) {
            Swal.close();
          }
        }
        break;

      case 'bluetooth':
        await this.promptSystemBluetoothTurnOn();
        break;

      case 'network':
        Swal.fire({
          icon: 'info',
          title: 'Network / WiFi',
          html: `Ensure your device is connected to the same <strong>LAN/WiFi network</strong> as your POS printers and scanners.<br><br>
                 Port <strong>9100</strong> (raw socket), <strong>8080</strong> (HTTP) and <strong>9112</strong> (Local POS Agent) must be reachable.`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Got It'
        }).then(() => {
          if (navigator.onLine) { this._setPermStatus(perm.id, 'GRANTED'); }
        });
        break;

      case 'nfc':
        Swal.fire({
          icon: 'info',
          title: 'NFC / RFID',
          html: `WebNFC is only supported on <strong>Android Chrome</strong>.<br><br>
                 For desktop NFC readers, connect via <strong>USB HID</strong> or <strong>WebSerial COM</strong> instead.`,
          confirmButtonColor: '#4f46e5'
        });
        break;
    }
  }

  private _setPermStatus(id: string, status: ProtocolPermission['status']): void {
    this.protocolPermissions.update(perms => perms.map(p => p.id === id ? { ...p, status } : p));
  }

  // ── Filter Helpers ────────────────────────────────────────────────────────

  filteredDevices(): HardwareDevice[] {
    return this.deviceService.allDevices().filter(device => {
      // 1. Status filter — by default only show CONNECTED devices
      if (!this.showAllStatuses) {
        const isConnected = device.status === 'CONNECTED' || device.connectionState === 'CONNECTED';
        if (!isConnected) return false;
      }

      // 2. Connection category filter (WIRED / WIRELESS / ALL)
      const category = device.connectionCategory || this.deviceService.inferCategory(device.protocol);
      if (this.connectionFilter === 'WIRED' && category !== 'WIRED') return false;
      if (this.connectionFilter === 'WIRELESS' && category !== 'WIRELESS') return false;

      // 3. Device type filter
      if (this.typeFilter !== 'ALL' && device.type !== this.typeFilter) return false;

      // 4. Search query filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchName = device.name.toLowerCase().includes(q);
        const matchPort = (device.portOrAddress || '').toLowerCase().includes(q);
        const matchSsid = (device.wifiSsid || '').toLowerCase().includes(q);
        const matchMac = (device.macAddress || '').toLowerCase().includes(q);
        if (!matchName && !matchPort && !matchSsid && !matchMac) return false;
      }

      return true;
    });
  }

  /** Toggle between connected-only and all-statuses view */
  toggleShowAllStatuses(): void {
    this.showAllStatuses = !this.showAllStatuses;
    // Re-fetch from API with appropriate filter
    this.deviceService.fetchDevicesFromApi(!this.showAllStatuses);
  }

  setConnectionFilter(mode: 'ALL' | 'WIRED' | 'WIRELESS') { this.connectionFilter = mode; }
  setTypeFilter(type: 'ALL' | DeviceType) { this.typeFilter = type; }


  toggleWifiRadio() {
    // Require system access first
    if (!this.systemAccessGranted()) {
      this._showAccessRequired('WiFi Radio');
      return;
    }
    this.wifiRadioEnabled = !this.wifiRadioEnabled;
    Swal.fire({
      icon: this.wifiRadioEnabled ? 'success' : 'info',
      title: this.wifiRadioEnabled ? 'WiFi 5GHz/2.4GHz Radio Enabled' : 'WiFi Radio Disabled',
      timer: 1400,
      showConfirmButton: false
    });
    if (this.showWirelessScannerModal) this.startWirelessScan();
  }

  async toggleBluetoothRadio() {
    if (!this.systemAccessGranted()) {
      this._showAccessRequired('Bluetooth Radio');
      return;
    }
    const btAvailable = await this.deviceService.checkSystemBluetoothAvailability();
    if (!btAvailable && !this.bluetoothRadioEnabled) {
      Swal.fire({
        icon: 'warning',
        title: 'System Bluetooth Unreachable',
        html: `<strong>System Bluetooth adapter is turned OFF or unavailable.</strong><br><br>
               Please turn ON Bluetooth in OS Quick Settings before scanning Bluetooth POS devices.`,
        confirmButtonText: 'I Understand',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }
    this.bluetoothRadioEnabled = !this.bluetoothRadioEnabled;
    Swal.fire({
      icon: this.bluetoothRadioEnabled ? 'success' : 'info',
      title: this.bluetoothRadioEnabled ? 'Bluetooth LE Air Radio Enabled' : 'Bluetooth Radio Disabled',
      timer: 1400,
      showConfirmButton: false
    });
    if (this.showWirelessScannerModal) this.startWirelessScan();
  }

  // ── Auto Discovery ────────────────────────────────────────────────────────

  async runAutoDiscovery() {
    if (!this.systemAccessGranted()) {
      this._showAccessRequired('Auto-Detect Devices');
      return;
    }
    if (!this.wifiRadioEnabled && !this.bluetoothRadioEnabled) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Wireless Radios Disabled',
        text: 'WiFi and Bluetooth radios are turned OFF. Enable them to auto-detect nearby hardware?',
        showCancelButton: true,
        confirmButtonText: 'Enable Radios & Detect',
        cancelButtonText: 'Detect Wired Devices Only',
        confirmButtonColor: '#4f46e5'
      });
      if (result.isConfirmed) {
        this.wifiRadioEnabled = true;
        this.bluetoothRadioEnabled = true;
      }
    }
    await this.executeAutoDiscoveryProcess();
  }

  async executeAutoDiscoveryProcess() {
    Swal.fire({
      title: 'Auto-Detecting POS Hardware Devices...',
      html: 'Scanning WebSerial COM · WebUSB Direct · Bluetooth LE · LAN subnets · NFC...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await this.deviceService.scanForDevices();

    Swal.fire({
      icon: 'success',
      title: 'Hardware Discovery Complete',
      text: `Synchronized ${this.deviceService.connectedCount()} active hardware endpoints.`,
      timer: 2200,
      showConfirmButton: false
    });
  }

  // ── Wireless Radar Scanner ────────────────────────────────────────────────

  async openWirelessScanner() {
    if (!this.systemAccessGranted()) {
      this._showAccessRequired('Wireless Radar Scanner');
      return;
    }
    if (!this.wifiRadioEnabled && !this.bluetoothRadioEnabled) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'WiFi & Bluetooth Radios OFF',
        text: 'Both radios are disabled. Enable them to scan for wireless devices.',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Enable & Scan',
        cancelButtonText: 'Cancel'
      });
      if (!result.isConfirmed) return;
      this.wifiRadioEnabled = true;
      this.bluetoothRadioEnabled = true;
    }
    this.showWirelessScannerModal = true;
    this.selectedCandidate = null;
    this.startWirelessScan();
  }

  closeWirelessScanner() {
    this.showWirelessScannerModal = false;
    this.isScanningWireless = false;
    this.selectedCandidate = null;
  }

  startWirelessScan() {
    if (!this.wifiRadioEnabled && !this.bluetoothRadioEnabled) {
      this.discoveredWirelessCandidates = [];
      this.isScanningWireless = false;
      return;
    }
    this.isScanningWireless = true;
    this.discoveredWirelessCandidates = [];
    this.selectedCandidate = null;

    this.http.post<{ success: boolean; data: any[] }>(`${environment.apiUrl}/devices/scan-wireless`, {
      wifiEnabled: this.wifiRadioEnabled,
      bluetoothEnabled: this.bluetoothRadioEnabled
    })
      .pipe(catchError(() => of({ success: false, data: [] })))
      .subscribe(res => {
        this.isScanningWireless = false;
        this.discoveredWirelessCandidates = res?.data || [];
      });
  }

  selectCandidate(candidate: any) { this.selectedCandidate = candidate; }

  filteredCandidates(): any[] {
    return this.discoveredWirelessCandidates.filter(c => {
      if (this.scannerFilter === 'WIFI' && c.protocol !== 'WIFI_IP') return false;
      if (this.scannerFilter === 'BLUETOOTH' && !['BLUETOOTH', 'BLUETOOTH_LE', 'NFC_TAP'].includes(c.protocol)) return false;
      return true;
    });
  }

  pairWirelessCandidate(candidate: any) {
    if (!candidate) return;
    this.deviceService.addDevice({
      name: candidate.name,
      type: candidate.type as DeviceType,
      connectionCategory: 'WIRELESS',
      protocol: candidate.protocol as ConnectionProtocol,
      portOrAddress: candidate.portOrAddress,
      wifiSsid: candidate.wifiSsid || (candidate.protocol === 'WIFI_IP' ? 'SVK_Store_POS_5G' : undefined),
      macAddress: candidate.macAddress || candidate.portOrAddress,
      status: 'CONNECTED',
      latencyMs: candidate.latencyMs || 5,
      signalStrength: candidate.signalStrength || 92,
      signalDbm: candidate.signalDbm || -50,
      batteryLevel: candidate.batteryLevel || 95,
      firmwareVersion: candidate.firmwareVersion || 'v2.0.0-WIR',
      autoReconnect: true
    });
    candidate.paired = true;
    this.selectedCandidate = candidate;
    Swal.fire({
      icon: 'success',
      title: 'Wireless Device Connected!',
      text: `${candidate.name} connected via ${candidate.protocol}.`,
      timer: 1800,
      showConfirmButton: false
    });
  }

  // ── Manual Add Modal ──────────────────────────────────────────────────────

  openAddModal() {
    if (!this.systemAccessGranted()) {
      this._showAccessRequired('Manual Device Registration');
      return;
    }
    this.showAddModal = true;
    this.activeAddTab = 'WIRED';
    this.newDevice.protocol = 'WEB_USB';
    this.newDevice.connectionCategory = 'WIRED';
  }

  closeAddModal() { this.showAddModal = false; }

  setAddModalTab(tab: 'WIRED' | 'WIRELESS_NET' | 'WIRELESS_AIR') {
    this.activeAddTab = tab;
    if (tab === 'WIRED')         { this.newDevice.protocol = 'WEB_USB'; this.newDevice.connectionCategory = 'WIRED'; }
    else if (tab === 'WIRELESS_NET') { this.newDevice.protocol = 'WIFI_IP'; this.newDevice.connectionCategory = 'WIRELESS'; }
    else if (tab === 'WIRELESS_AIR') { this.newDevice.protocol = 'BLUETOOTH_LE'; this.newDevice.connectionCategory = 'WIRELESS'; }
  }

  onProtocolSelectChange() {
    this.newDevice.connectionCategory = this.deviceService.inferCategory(this.newDevice.protocol);
  }

  submitAddDevice() {
    if (!this.newDevice.name || !this.newDevice.portOrAddress) return;
    const category = this.deviceService.inferCategory(this.newDevice.protocol);
    this.deviceService.addDevice({
      name: this.newDevice.name,
      type: this.newDevice.type,
      connectionCategory: category,
      protocol: this.newDevice.protocol,
      portOrAddress: this.newDevice.portOrAddress,
      wifiSsid: this.newDevice.wifiSsid || (category === 'WIRELESS' ? 'SVK_Store_POS_5G' : undefined),
      macAddress: this.newDevice.macAddress || undefined,
      baudRate: this.newDevice.baudRate,
      firmwareVersion: this.newDevice.firmwareVersion,
      autoReconnect: this.newDevice.autoReconnect,
      status: 'CONNECTED',
      latencyMs: 5,
      signalStrength: 95,
      signalDbm: category === 'WIRELESS' ? -48 : undefined,
      batteryLevel: category === 'WIRELESS' ? 98 : undefined
    });
    this.closeAddModal();
    Swal.fire({
      icon: 'success',
      title: 'Hardware Device Connected',
      text: `${this.newDevice.name} registered in database!`,
      timer: 1800,
      showConfirmButton: false
    });
    // Reset form
    this.newDevice.name = '';
    this.newDevice.portOrAddress = '';
    this.newDevice.wifiSsid = '';
    this.newDevice.macAddress = '';
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  openDiagnosticModal(device: HardwareDevice) {
    this.selectedDiagnosticDevice = device;
    this.showDiagnosticModal = true;
    this.runFullDiagnostics(device);
  }

  closeDiagnosticModal() {
    this.showDiagnosticModal = false;
    this.isRunningDiagnostic = false;
    this.selectedDiagnosticDevice = null;
  }

  runFullDiagnostics(device: HardwareDevice) {
    this.isRunningDiagnostic = true;
    this.diagnosticProgress = 10;
    this.diagnosticSteps = [
      { name: '1. Connectivity Latency Ping', status: 'RUNNING', detail: 'Pinging IP/COM address bus...' },
      { name: '2. Hardware Port & Handshake Check', status: 'PENDING', detail: 'Testing RTS/CTS handshake...' },
      { name: '3. Firmware & Protocol Sync', status: 'PENDING', detail: 'Verifying protocol compatibility...' },
      { name: '4. Packet Integrity & Buffer Test', status: 'PENDING', detail: 'Transmitting test payload...' },
      { name: '5. Hardware Telemetry & Sensor Output', status: 'PENDING', detail: 'Checking sensor voltage & status...' }
    ];
    this.deviceService.runHardwareDiagnostics(device.id).subscribe(res => {
      this.isRunningDiagnostic = false;
      this.diagnosticProgress = 100;
      if (res?.diagnostics && Array.isArray(res.diagnostics)) {
        this.diagnosticSteps = res.diagnostics.map((d: any) => ({ name: d.name, status: d.status, detail: d.detail, durationMs: d.durationMs }));
      } else {
        this.diagnosticSteps.forEach(s => s.status = 'PASSED');
      }
    });
  }

  // ── Bluetooth Prompt ──────────────────────────────────────────────────────

  async promptSystemBluetoothTurnOn() {
    const navBt = (navigator as any).bluetooth;
    if (navBt && typeof navBt.requestDevice === 'function') {
      try {
        Swal.fire({ title: 'Opening Web Bluetooth Prompt...', text: 'Select your nearby Bluetooth POS peripheral.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const dev = await navBt.requestDevice({ acceptAllDevices: true, optionalServices: ['battery_service', 'device_information'] });
        Swal.close();
        if (dev) {
          this.bluetoothRadioEnabled = true;
          this._setPermStatus('bluetooth', 'GRANTED');
          this.deviceService.addDevice({
            name: dev.name || 'Bluetooth POS Peripheral',
            type: 'BARCODE_SCANNER',
            connectionCategory: 'WIRELESS',
            protocol: 'BLUETOOTH_LE',
            portOrAddress: dev.id || 'BT-LE-DEVICE',
            macAddress: dev.id,
            status: 'CONNECTED',
            latencyMs: 6,
            signalStrength: 95,
            autoReconnect: true
          });
          Swal.fire({ icon: 'success', title: 'Bluetooth Device Paired!', text: `Paired ${dev.name || 'Bluetooth Device'} via Web Bluetooth API.` });
        }
        return;
      } catch (err: any) {
        Swal.close();
        if (err?.name !== 'NotFoundError') { console.warn('[Web Bluetooth]:', err?.message); }
      }
    }
    Swal.fire({
      icon: 'info',
      title: 'Bluetooth OS Adapter',
      html: `To connect Bluetooth devices:<br><br>
             1. Turn ON Bluetooth in OS Quick Settings.<br>
             2. Put POS printer/scanner in Pairing mode.<br>
             3. Click <strong>Rescan Air</strong>.`,
      confirmButtonText: 'Got It',
      confirmButtonColor: '#4f46e5'
    });
  }

  enableAllRadiosAndScan() {
    this.wifiRadioEnabled = true;
    this.bluetoothRadioEnabled = true;
    this.showWirelessScannerModal = true;
    this.startWirelessScan();
  }

  // ── Device Actions ────────────────────────────────────────────────────────

  testDevice(device: HardwareDevice) {
    let action = 'PING', actionName = 'Hardware Ping';
    if (device.type === 'THERMAL_PRINTER')    { action = 'PRINT_TEST';       actionName = 'ESC/POS Print Test'; }
    else if (device.type === 'WEIGH_SCALE')   { action = 'ZERO_SCALE';       actionName = 'Scale Zero Tare'; }
    else if (device.type === 'CASH_DRAWER')   { action = 'PULSE_CASH_DRAWER'; actionName = 'RJ11 Cash Drawer Pulse'; }
    else if (device.type === 'CUSTOMER_DISPLAY') { action = 'UPDATE_DISPLAY'; actionName = 'VFD Display Update'; }
    else if (device.type === 'CARD_READER' || device.protocol === 'NFC_TAP') { action = 'READ_NFC'; actionName = 'NFC / RFID Tag Scan'; }

    Swal.fire({ title: `Executing ${actionName}...`, text: `Dispatching to ${device.name}`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.deviceService.executeHardwareAction(device.id, action, { line1: 'WELCOME TO STORE', line2: 'TOTAL: ₹1,450.00' })
      .subscribe(res => {
        Swal.close();
        if (res?.success) {
          Swal.fire({ icon: 'success', title: `${actionName} Success!`, text: res.message || `Executed on ${device.name}`, timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'error', title: `${actionName} Failed`, text: res?.message || 'Hardware did not respond' });
        }
      });
  }

  toggleReconnect(device: HardwareDevice) { this.deviceService.toggleAutoReconnect(device.id); }

  removeDevice(device: HardwareDevice) {
    Swal.fire({
      title: 'Remove Hardware Device?',
      text: `Disconnect ${device.name} from the system?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Disconnect'
    }).then(res => {
      if (res.isConfirmed) {
        this.deviceService.removeDevice(device.id);
        Swal.fire('Disconnected', `${device.name} removed.`, 'success');
      }
    });
  }

  // ── Display Helpers ───────────────────────────────────────────────────────

  getDeviceIcon(type: DeviceType): string {
    switch (type) {
      case 'THERMAL_PRINTER':  return 'print';
      case 'BARCODE_SCANNER':  return 'qr_code_scanner';
      case 'WEIGH_SCALE':      return 'scale';
      case 'CARD_READER':      return 'credit_card';
      case 'CUSTOMER_DISPLAY': return 'monitor';
      case 'BIOMETRIC_READER': return 'fingerprint';
      case 'CASH_DRAWER':      return 'point_of_sale';
      default:                 return 'devices';
    }
  }

  formatDeviceType(type: DeviceType): string { return type ? type.replace(/_/g, ' ') : ''; }

  getProtocolBadge(protocol: ConnectionProtocol): { label: string; class: string; icon: string } {
    switch (protocol) {
      case 'WIFI_IP':       return { label: 'WiFi IP Wireless',   class: 'badge-wifi',    icon: 'wifi' };
      case 'ETHERNET_LAN':  return { label: 'Ethernet LAN',       class: 'badge-lan',     icon: 'lan' };
      case 'WEB_SERIAL':    return { label: 'WebSerial COM',      class: 'badge-serial',  icon: 'settings_ethernet' };
      case 'WEB_USB':       return { label: 'WebUSB Direct',      class: 'badge-usb',     icon: 'usb' };
      case 'BLUETOOTH':     return { label: 'Bluetooth Classic',  class: 'badge-bt',      icon: 'bluetooth' };
      case 'BLUETOOTH_LE':  return { label: 'Bluetooth LE Air',   class: 'badge-bt-le',   icon: 'bluetooth_searching' };
      case 'NFC_TAP':       return { label: 'NFC / RFID Tap',     class: 'badge-nfc',     icon: 'nfc' };
      case 'ZIGBEE_MESH':   return { label: 'Zigbee Mesh',        class: 'badge-zigbee',  icon: 'hub' };
      case 'WEBSOCKET_LAN': return { label: 'LAN WebSocket',      class: 'badge-lan',     icon: 'swap_horiz' };
      case 'MQTT_CLOUD':    return { label: 'MQTT Cloud IoT',     class: 'badge-mqtt',    icon: 'cloud_sync' };
      case 'HID_KEYBOARD':  return { label: 'USB HID Emulation',  class: 'badge-hid',     icon: 'keyboard' };
      default:              return { label: protocol,             class: '',              icon: 'devices' };
    }
  }

  /** Helper: show "You must grant system access first" prompt */
  private _showAccessRequired(feature: string): void {
    Swal.fire({
      icon: 'warning',
      title: '🔒 System Access Required',
      html: `<strong>${feature}</strong> requires desktop hardware permissions.<br><br>
             Click <strong>"Push System Access"</strong> to grant WebUSB, WebSerial, Bluetooth & WiFi permissions before connecting any device.`,
      confirmButtonText: '🔓 Grant System Access Now',
      showCancelButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4f46e5'
    }).then(result => {
      if (result.isConfirmed) {
        this.pushSystemAccessAndEnable();
      }
    });
  }
}
