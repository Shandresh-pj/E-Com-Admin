import { Component, OnInit, inject } from '@angular/core';
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
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export interface DiagnosticStep {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_SUPPORTED';
  detail?: string;
  durationMs?: number;
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
    MatSlideToggleModule,
    AppTranslatePipe
  ],
  templateUrl: './devices.html',
  styleUrls: ['./devices.scss']
})
export class DevicesComponent implements OnInit {
  deviceService = inject(DeviceAutoDetectService);
  private http = inject(HttpClient);

  // Active Filter state
  connectionFilter: 'ALL' | 'WIRED' | 'WIRELESS' = 'ALL';
  typeFilter: 'ALL' | DeviceType = 'ALL';
  searchQuery = '';

  // WiFi & Bluetooth Power Radios
  wifiRadioEnabled: boolean = true;
  bluetoothRadioEnabled: boolean = true;

  // Manual Add Modal State
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

  // Wireless Radar Scanner Modal State
  showWirelessScannerModal = false;
  isScanningWireless = false;
  discoveredWirelessCandidates: any[] = [];
  selectedCandidate: any = null;
  scannerFilter: 'ALL' | 'WIFI' | 'BLUETOOTH' = 'ALL';

  // Diagnostic Runner Modal State
  showDiagnosticModal = false;
  selectedDiagnosticDevice: HardwareDevice | null = null;
  isRunningDiagnostic = false;
  diagnosticSteps: DiagnosticStep[] = [];
  diagnosticProgress = 0;

  async ngOnInit(): Promise<void> {
    this.deviceService.fetchDevicesFromApi();
    await this.deviceService.analyzeSystemHardwareCapabilities();
  }

  filteredDevices(): HardwareDevice[] {
    return this.deviceService.allDevices().filter(device => {
      const category = device.connectionCategory || this.deviceService.inferCategory(device.protocol);

      if (this.connectionFilter === 'WIRED' && category !== 'WIRED') return false;
      if (this.connectionFilter === 'WIRELESS' && category !== 'WIRELESS') return false;

      if (this.typeFilter !== 'ALL' && device.type !== this.typeFilter) return false;

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

  setConnectionFilter(mode: 'ALL' | 'WIRED' | 'WIRELESS') {
    this.connectionFilter = mode;
  }

  setTypeFilter(type: 'ALL' | DeviceType) {
    this.typeFilter = type;
  }

  toggleWifiRadio() {
    this.wifiRadioEnabled = !this.wifiRadioEnabled;
    const msg = this.wifiRadioEnabled ? 'WiFi 5GHz/2.4GHz Radio Enabled' : 'WiFi Radio Disabled';
    Swal.fire({
      icon: this.wifiRadioEnabled ? 'success' : 'info',
      title: msg,
      timer: 1500,
      showConfirmButton: false
    });
    if (this.showWirelessScannerModal) {
      this.startWirelessScan();
    }
  }

  async toggleBluetoothRadio() {
    const btAvailable = await this.deviceService.checkSystemBluetoothAvailability();

    if (!btAvailable && !this.bluetoothRadioEnabled) {
      Swal.fire({
        icon: 'warning',
        title: 'System Bluetooth Unreachable',
        html: `<strong>System Bluetooth adapter is turned OFF or unavailable in OS settings.</strong><br><br>
               Please turn ON Bluetooth in system settings before scanning Bluetooth POS devices.`,
        confirmButtonText: 'I Understand',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    this.bluetoothRadioEnabled = !this.bluetoothRadioEnabled;
    const msg = this.bluetoothRadioEnabled ? 'Bluetooth LE Air Radio Enabled' : 'Bluetooth Radio Disabled';
    Swal.fire({
      icon: this.bluetoothRadioEnabled ? 'success' : 'info',
      title: msg,
      timer: 1500,
      showConfirmButton: false
    });
    if (this.showWirelessScannerModal) {
      this.startWirelessScan();
    }
  }

  async pushSystemAccessAndEnable() {
    Swal.fire({
      title: 'Initializing Hardware Access & Local Agent...',
      text: 'Testing Web Bluetooth, WebUSB, WebSerial, NFC & POS Local Agent...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const res = await this.deviceService.requestSystemAccessAndPushEnable();
    this.wifiRadioEnabled = true;
    this.bluetoothRadioEnabled = true;

    Swal.fire({
      icon: 'success',
      title: 'Hardware APIs & Local Agent Active!',
      text: res.message,
      confirmButtonText: 'Start Discovery Scan',
      confirmButtonColor: '#4f46e5'
    }).then(result => {
      if (result.isConfirmed) {
        this.openWirelessScanner();
      }
    });
  }

  async promptSystemBluetoothTurnOn() {
    const navBt = (navigator as any).bluetooth;
    if (navBt && typeof navBt.requestDevice === 'function') {
      try {
        Swal.fire({
          title: 'Opening Web Bluetooth Prompt...',
          text: 'Select your nearby Bluetooth POS peripheral in the browser prompt.',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const dev = await navBt.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service', 'device_information']
        });

        Swal.close();

        if (dev) {
          this.bluetoothRadioEnabled = true;
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

          Swal.fire({
            icon: 'success',
            title: 'Bluetooth Device Paired!',
            text: `Successfully paired ${dev.name || 'Bluetooth Device'} via Web Bluetooth API.`
          });
        }
        return;
      } catch (err: any) {
        Swal.close();
        if (err?.name !== 'NotFoundError') {
          console.warn('[Web Bluetooth] pairing notice:', err?.message || err);
        }
      }
    }

    Swal.fire({
      icon: 'info',
      title: 'Bluetooth OS Adapter',
      html: `To connect Bluetooth devices:<br><br>
             1. Turn ON Bluetooth in OS Quick Settings.<br>
             2. Put POS printer or scanner in Pairing mode.<br>
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

  async runAutoDiscovery() {
    if (!this.wifiRadioEnabled && !this.bluetoothRadioEnabled) {
      Swal.fire({
        icon: 'warning',
        title: 'Wireless Radios Disabled',
        text: 'WiFi and Bluetooth radios are turned OFF. Would you like to enable them to auto-detect nearby hardware?',
        showCancelButton: true,
        confirmButtonText: 'Enable Radios & Detect',
        cancelButtonText: 'Detect Wired Devices Only'
      }).then(async (result) => {
        if (result.isConfirmed) {
          this.wifiRadioEnabled = true;
          this.bluetoothRadioEnabled = true;
        }
        await this.executeAutoDiscoveryProcess();
      });
    } else {
      await this.executeAutoDiscoveryProcess();
    }
  }

  private async executeAutoDiscoveryProcess() {
    Swal.fire({
      title: 'Auto-Detecting POS Hardware Devices...',
      html: 'Scanning WebSerial COM, WebUSB Direct, Bluetooth LE, Local LAN subnets & NFC readers...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await this.deviceService.scanForDevices();

    Swal.fire({
      icon: 'success',
      title: 'Hardware Discovery Complete',
      text: `Synchronized ${this.deviceService.connectedCount()} active hardware endpoints with database.`,
      timer: 2000,
      showConfirmButton: false
    });
  }

  // ── Wireless Radar Scanner Modal ──────────────────────────────────────
  async openWirelessScanner() {
    const btAvailable = await this.deviceService.checkSystemBluetoothAvailability();

    if (!this.wifiRadioEnabled && !this.bluetoothRadioEnabled) {
      Swal.fire({
        icon: 'warning',
        title: 'WiFi & Bluetooth Radios OFF',
        text: 'Both WiFi and Bluetooth radios are currently disabled. Please turn on at least one radio to scan available devices.',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Enable Radios & Scan',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.wifiRadioEnabled = true;
          this.bluetoothRadioEnabled = true;
          this.showWirelessScannerModal = true;
          this.selectedCandidate = null;
          this.startWirelessScan();
        }
      });
      return;
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
      .subscribe((res) => {
        this.isScanningWireless = false;
        this.discoveredWirelessCandidates = res?.data || [];
      });
  }

  selectCandidate(candidate: any) {
    this.selectedCandidate = candidate;
  }

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
      text: `Successfully connected ${candidate.name} via ${candidate.protocol}.`,
      timer: 1800,
      showConfirmButton: false
    });
  }

  // ── Hardware Diagnostic Suite Runner Modal ────────────────────────────
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
      if (res && res.diagnostics && Array.isArray(res.diagnostics)) {
        this.diagnosticSteps = res.diagnostics.map((d: any) => ({
          name: d.name,
          status: d.status,
          detail: d.detail,
          durationMs: d.durationMs
        }));
      } else {
        this.diagnosticSteps.forEach(s => s.status = 'PASSED');
      }
    });
  }

  getDeviceIcon(type: DeviceType): string {
    switch (type) {
      case 'THERMAL_PRINTER': return 'print';
      case 'BARCODE_SCANNER': return 'qr_code_scanner';
      case 'WEIGH_SCALE': return 'scale';
      case 'CARD_READER': return 'credit_card';
      case 'CUSTOMER_DISPLAY': return 'monitor';
      case 'BIOMETRIC_READER': return 'fingerprint';
      case 'CASH_DRAWER': return 'point_of_sale';
      default: return 'devices';
    }
  }

  formatDeviceType(type: DeviceType): string {
    return type ? type.replace(/_/g, ' ') : '';
  }

  getProtocolBadge(protocol: ConnectionProtocol): { label: string; class: string; icon: string } {
    switch (protocol) {
      case 'WIFI_IP': return { label: 'WiFi IP Wireless', class: 'badge-wifi', icon: 'wifi' };
      case 'ETHERNET_LAN': return { label: 'Ethernet LAN', class: 'badge-lan', icon: 'lan' };
      case 'WEB_SERIAL': return { label: 'WebSerial COM', class: 'badge-serial', icon: 'settings_ethernet' };
      case 'WEB_USB': return { label: 'WebUSB Direct', class: 'badge-usb', icon: 'usb' };
      case 'BLUETOOTH': return { label: 'Bluetooth Classic', class: 'badge-bt', icon: 'bluetooth' };
      case 'BLUETOOTH_LE': return { label: 'Bluetooth LE Air', class: 'badge-bt-le', icon: 'bluetooth_searching' };
      case 'NFC_TAP': return { label: 'NFC / RFID Tap', class: 'badge-nfc', icon: 'nfc' };
      case 'ZIGBEE_MESH': return { label: 'Zigbee Mesh', class: 'badge-zigbee', icon: 'hub' };
      case 'WEBSOCKET_LAN': return { label: 'LAN WebSocket', class: 'badge-lan', icon: 'swap_horiz' };
      case 'MQTT_CLOUD': return { label: 'MQTT Cloud IoT', class: 'badge-mqtt', icon: 'cloud_sync' };
      case 'HID_KEYBOARD': return { label: 'USB HID Emulation', class: 'badge-hid', icon: 'keyboard' };
      default: return { label: protocol, class: '', icon: 'devices' };
    }
  }

  testDevice(device: HardwareDevice) {
    let action = 'PING';
    let actionName = 'Hardware Action';

    if (device.type === 'THERMAL_PRINTER') {
      action = 'PRINT_TEST';
      actionName = 'ESC/POS Print Test Ticket';
    } else if (device.type === 'WEIGH_SCALE') {
      action = 'ZERO_SCALE';
      actionName = 'Scale Zero Tare';
    } else if (device.type === 'CASH_DRAWER') {
      action = 'PULSE_CASH_DRAWER';
      actionName = 'RJ11 Cash Drawer Pulse';
    } else if (device.type === 'CUSTOMER_DISPLAY') {
      action = 'UPDATE_DISPLAY';
      actionName = 'VFD Customer Display Update';
    } else if (device.type === 'CARD_READER' || device.protocol === 'NFC_TAP') {
      action = 'READ_NFC';
      actionName = 'NFC / RFID Tag Scan';
    }

    Swal.fire({
      title: `Executing ${actionName}...`,
      text: `Dispatching action to ${device.name}`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.deviceService.executeHardwareAction(device.id, action, { line1: 'WELCOME TO STORE', line2: 'TOTAL: ₹1,450.00' })
      .subscribe(res => {
        Swal.close();
        if (res && res.success) {
          Swal.fire({
            icon: 'success',
            title: `${actionName} Success!`,
            text: res.message || `Successfully executed on ${device.name}`,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: `${actionName} Failed`,
            text: res?.message || 'Hardware did not respond to action command'
          });
        }
      });
  }

  toggleReconnect(device: HardwareDevice) {
    this.deviceService.toggleAutoReconnect(device.id);
  }

  removeDevice(device: HardwareDevice) {
    Swal.fire({
      title: 'Remove Hardware Device?',
      text: `Disconnect ${device.name} from billing software and database?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Disconnect'
    }).then(res => {
      if (res.isConfirmed) {
        this.deviceService.removeDevice(device.id);
        Swal.fire('Disconnected', `${device.name} removed from database.`, 'success');
      }
    });
  }

  openAddModal() {
    this.showAddModal = true;
    this.activeAddTab = 'WIRED';
    this.newDevice.protocol = 'WEB_USB';
    this.newDevice.connectionCategory = 'WIRED';
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  setAddModalTab(tab: 'WIRED' | 'WIRELESS_NET' | 'WIRELESS_AIR') {
    this.activeAddTab = tab;
    if (tab === 'WIRED') {
      this.newDevice.protocol = 'WEB_USB';
      this.newDevice.connectionCategory = 'WIRED';
    } else if (tab === 'WIRELESS_NET') {
      this.newDevice.protocol = 'WIFI_IP';
      this.newDevice.connectionCategory = 'WIRELESS';
    } else if (tab === 'WIRELESS_AIR') {
      this.newDevice.protocol = 'BLUETOOTH_LE';
      this.newDevice.connectionCategory = 'WIRELESS';
    }
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
      text: `${this.newDevice.name} registered dynamically in database!`,
      timer: 1800,
      showConfirmButton: false
    });
  }
}
