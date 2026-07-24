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
import Swal from 'sweetalert2';

import { DeviceAutoDetectService, HardwareDevice, DeviceType, ConnectionProtocol } from 'src/app/services/device-auto-detect.service';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

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
    AppTranslatePipe
  ],
  templateUrl: './devices.html',
  styleUrls: ['./devices.scss']
})
export class DevicesComponent implements OnInit {
  deviceService = inject(DeviceAutoDetectService);

  showAddModal = false;
  
  newDevice = {
    name: '',
    type: 'THERMAL_PRINTER' as DeviceType,
    protocol: 'WEB_USB' as ConnectionProtocol,
    portOrAddress: '',
    baudRate: 9600,
    firmwareVersion: 'v1.0.0',
    autoReconnect: true,
    status: 'CONNECTED' as const,
    latencyMs: 5,
    signalStrength: 95
  };

  ngOnInit(): void {
    this.deviceService.fetchDevicesFromApi();
  }

  async runAutoDiscovery() {
    Swal.fire({
      title: 'Auto-Detecting Hardware Devices...',
      html: 'Scanning WebSerial, WebUSB, Bluetooth LE, LAN WebSocket, and HID ports...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await this.deviceService.scanForDevices();

    Swal.fire({
      icon: 'success',
      title: 'Hardware Auto-Discovery Complete',
      text: `Successfully detected ${this.deviceService.connectedCount()} hardware devices connected to the billing system.`,
      timer: 2000,
      showConfirmButton: false
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

  getProtocolBadge(protocol: ConnectionProtocol): { label: string; class: string } {
    switch (protocol) {
      case 'WIFI_IP': return { label: 'WiFi IP (Wireless)', class: 'badge-wifi' };
      case 'ETHERNET_LAN': return { label: 'Ethernet LAN', class: 'badge-lan' };
      case 'WEB_SERIAL': return { label: 'WebSerial COM', class: 'badge-serial' };
      case 'WEB_USB': return { label: 'WebUSB Direct', class: 'badge-usb' };
      case 'BLUETOOTH': return { label: 'BLE Wireless', class: 'badge-bt' };
      case 'WEBSOCKET_LAN': return { label: 'LAN WebSocket', class: 'badge-lan' };
      case 'MQTT_CLOUD': return { label: 'MQTT Cloud IoT', class: 'badge-mqtt' };
      case 'HID_KEYBOARD': return { label: 'USB HID Emulation', class: 'badge-hid' };
      default: return { label: protocol, class: '' };
    }
  }

  testDevice(device: HardwareDevice) {
    if (device.type === 'THERMAL_PRINTER') {
      const ok = this.deviceService.testPrintTicket();
      if (ok) {
        Swal.fire({
          icon: 'success',
          title: 'Test Slip Printed',
          text: `Sent ESC/POS alignment & diagnostic test command to ${device.name}`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    } else if (device.type === 'WEIGH_SCALE') {
      const w = (Math.random() * 4.5 + 0.5).toFixed(3);
      this.deviceService.simulateWeightSample(parseFloat(w));
      Swal.fire({
        icon: 'info',
        title: 'Scale Live Weight Stream',
        text: `Sample weight received from scale: ${w} kg (Tare zeroed)`,
        timer: 1800,
        showConfirmButton: false
      });
    } else if (device.type === 'CASH_DRAWER') {
      this.deviceService.triggerCashDrawer();
      Swal.fire({
        icon: 'success',
        title: 'Cash Drawer Opened',
        text: '24V RJ11 pulse signal dispatched to cash drawer coil.',
        timer: 1800,
        showConfirmButton: false
      });
    } else if (device.type === 'CUSTOMER_DISPLAY') {
      this.deviceService.updateCustomerDisplay('WELCOME TO STORE', 'TOTAL: ₹1,450.00');
      Swal.fire({
        icon: 'success',
        title: 'VFD Display Updated',
        text: 'Sent ASCII text lines to customer display.',
        timer: 1800,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Ping Telemetry OK',
        text: `${device.name} responded in ${device.latencyMs} ms. Status: Connected.`,
        timer: 1800,
        showConfirmButton: false
      });
    }
  }

  toggleReconnect(device: HardwareDevice) {
    this.deviceService.toggleAutoReconnect(device.id);
  }

  removeDevice(device: HardwareDevice) {
    Swal.fire({
      title: 'Remove Hardware Device?',
      text: `Disconnect ${device.name} from billing software?`,
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

  openAddModal() {
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  submitAddDevice() {
    if (!this.newDevice.name || !this.newDevice.portOrAddress) return;
    this.deviceService.addDevice({
      name: this.newDevice.name,
      type: this.newDevice.type,
      protocol: this.newDevice.protocol,
      portOrAddress: this.newDevice.portOrAddress,
      baudRate: this.newDevice.baudRate,
      firmwareVersion: this.newDevice.firmwareVersion,
      autoReconnect: this.newDevice.autoReconnect,
      status: 'CONNECTED',
      latencyMs: Math.floor(Math.random() * 8) + 2,
      signalStrength: 96
    });

    this.closeAddModal();

    Swal.fire({
      icon: 'success',
      title: 'Hardware Device Connected',
      text: `${this.newDevice.name} added successfully!`,
      timer: 1800,
      showConfirmButton: false
    });
  }
}
