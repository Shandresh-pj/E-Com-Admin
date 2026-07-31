import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { ChatService } from 'src/app/services/chat.service';

export interface MeetingParticipant {
  id: number;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  avatarColor: string;
  isSpeaking: boolean;
}

@Component({
  selector: 'app-team-meetings',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './team-meetings.html',
  styleUrls: ['./team-meetings.scss']
})
export class TeamMeetingsComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;

  meetingCodeInput = '';
  callHistory: any[] = [];
  activeTab: 'JOIN' | 'SCHEDULE' | 'HISTORY' = 'JOIN';
  meetingDuration = 0;
  meetingDurationTimer: any;
  showInvitePanel = false;
  copiedCode = false;

  isMeetingActive = false;
  currentMeetingCode = '';
  isMuted = false;
  isVideoOff = false;
  isScreenSharing = false;
  isHandRaised = false;
  showParticipantsPanel = false;
  showChatPanel = false;
  chatMessages: { name: string; text: string; time: string }[] = [];
  chatInput = '';

  mockParticipants: MeetingParticipant[] = [
    { id: 1, name: 'You (Host)', isMuted: false, isVideoOff: false, avatarColor: 'linear-gradient(135deg,#6366f1,#a855f7)', isSpeaking: true },
    { id: 2, name: 'Waiting...', isMuted: true, isVideoOff: true, avatarColor: 'linear-gradient(135deg,#10b981,#059669)', isSpeaking: false },
  ];

  scheduledMeetings = [
    { title: 'Q3 Strategy Review', code: 'MEET-STR22', time: 'Today 3:00 PM', participants: 8, type: 'VIDEO' },
    { title: 'Product Sprint Retro', code: 'MEET-SPR77', time: 'Tomorrow 10:00 AM', participants: 5, type: 'VIDEO' },
    { title: 'Branch Heads Sync', code: 'MEET-BRN01', time: 'Thu 2:30 PM', participants: 12, type: 'AUDIO' },
  ];

  gradients = [
    'linear-gradient(135deg,#6366f1,#a855f7)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  ];

  constructor(public chatService: ChatService) { }

  ngOnInit(): void {
    this.loadCallHistory();
  }

  ngOnDestroy(): void {
    this.leaveMeeting();
    if (this.meetingDurationTimer) clearInterval(this.meetingDurationTimer);
  }

  loadCallHistory(): void {
    this.chatService.getCallHistory().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.callHistory = res.data;
        } else {
          this.setMockCallHistory();
        }
      },
      error: () => this.setMockCallHistory(),
    });
  }

  showScheduleModal = false;
  newMeetingTitle = '';
  newMeetingTime = '';
  newMeetingType: 'VIDEO' | 'AUDIO' = 'VIDEO';

  get displayedCallHistory(): any[] {
    if (!this.callHistory || this.callHistory.length === 0) {
      return [
        { meeting_code: 'MEET-A3F2X', caller_name: 'PJSV Super Admin', call_type: 'VIDEO', status: 'ENDED', started_at: new Date(Date.now() - 3600000).toISOString(), duration: '45 min' },
        { meeting_code: 'MEET-B7K9Z', caller_name: 'App Admin', call_type: 'AUDIO', status: 'ENDED', started_at: new Date(Date.now() - 86400000).toISOString(), duration: '12 min' },
        { meeting_code: 'MEET-C2M8P', caller_name: 'Branch Manager', call_type: 'VIDEO', status: 'ENDED', started_at: new Date(Date.now() - 172800000).toISOString(), duration: '1 hr 8 min' },
      ];
    }
    if (this.activeTab === 'JOIN') {
      return this.callHistory.slice(0, 3);
    }
    return this.callHistory;
  }

  openScheduleModal(): void {
    this.showScheduleModal = true;
    this.newMeetingTitle = '';
    this.newMeetingTime = '';
  }

  saveScheduledMeeting(): void {
    if (!this.newMeetingTitle.trim()) return;
    const code = `MEET-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    this.scheduledMeetings.unshift({
      title: this.newMeetingTitle.trim(),
      code: code,
      time: this.newMeetingTime.trim() || 'Today 4:00 PM',
      participants: 6,
      type: this.newMeetingType,
    });
    this.showScheduleModal = false;
    this.newMeetingTitle = '';
    this.newMeetingTime = '';
  }

  private setMockCallHistory(): void {
    this.callHistory = [
      { meeting_code: 'MEET-A3F2X', caller_name: 'PJSV Super Admin', call_type: 'VIDEO', status: 'ENDED', started_at: new Date(Date.now() - 3600000).toISOString(), duration: '45 min' },
      { meeting_code: 'MEET-B7K9Z', caller_name: 'App Admin', call_type: 'AUDIO', status: 'ENDED', started_at: new Date(Date.now() - 86400000).toISOString(), duration: '12 min' },
      { meeting_code: 'MEET-C2M8P', caller_name: 'Branch Manager', call_type: 'VIDEO', status: 'ENDED', started_at: new Date(Date.now() - 172800000).toISOString(), duration: '1 hr 8 min' },
    ];
  }

  async startInstantMeeting(): Promise<void> {
    const meetingCode = `MEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.currentMeetingCode = meetingCode;
    this.isMeetingActive = true;
    this.meetingDuration = 0;
    this.meetingDurationTimer = setInterval(() => this.meetingDuration++, 1000);
    try {
      const stream = await this.chatService.startLocalMedia(true, true);
      this.bindLocalStream(stream);
    } catch (e) {
      console.warn('Media access error:', e);
    }
  }

  async joinMeetingWithCode(): Promise<void> {
    if (!this.meetingCodeInput.trim()) return;
    this.currentMeetingCode = this.meetingCodeInput.trim().toUpperCase();
    this.isMeetingActive = true;
    this.meetingDuration = 0;
    this.meetingDurationTimer = setInterval(() => this.meetingDuration++, 1000);
    try {
      const stream = await this.chatService.startLocalMedia(true, true);
      this.bindLocalStream(stream);
    } catch (e) {
      console.warn('Media access error:', e);
    }
  }

  async joinScheduledMeeting(code: string): Promise<void> {
    this.meetingCodeInput = code;
    await this.joinMeetingWithCode();
  }

  private bindLocalStream(stream: MediaStream): void {
    setTimeout(() => {
      if (this.localVideoRef && this.localVideoRef.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = stream;
        this.localVideoRef.nativeElement.play().catch(() => { });
      }
    }, 200);
  }

  leaveMeeting(): void {
    this.chatService.closeCall();
    this.isMeetingActive = false;
    if (this.meetingDurationTimer) clearInterval(this.meetingDurationTimer);
    this.loadCallHistory();
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.chatService.localStream) {
      this.chatService.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.isMuted));
    }
    this.mockParticipants[0].isMuted = this.isMuted;
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
    if (this.chatService.localStream) {
      this.chatService.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.isVideoOff));
    }
    this.mockParticipants[0].isVideoOff = this.isVideoOff;
  }

  async toggleScreenShare(): Promise<void> {
    this.isScreenSharing = !this.isScreenSharing;
    if (this.isScreenSharing) {
      const screenStream = await this.chatService.startScreenShare();
      this.bindLocalStream(screenStream);
    } else {
      const localStream = await this.chatService.startLocalMedia(true, true);
      this.bindLocalStream(localStream);
    }
  }

  copyMeetingCode(): void {
    navigator.clipboard.writeText(this.currentMeetingCode).then(() => {
      this.copiedCode = true;
      setTimeout(() => this.copiedCode = false, 2000);
    });
  }

  sendChatMessage(): void {
    if (!this.chatInput.trim()) return;
    this.chatMessages.push({
      name: 'You',
      text: this.chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.chatInput = '';
  }

  get formattedDuration(): string {
    const h = Math.floor(this.meetingDuration / 3600);
    const m = Math.floor((this.meetingDuration % 3600) / 60);
    const s = this.meetingDuration % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getAvatarGradient(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.gradients[Math.abs(hash) % this.gradients.length];
  }
}
