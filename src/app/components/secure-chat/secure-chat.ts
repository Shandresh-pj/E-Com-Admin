import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { ChatService, ChatConversation, ChatMessage, WebRTCCallSession } from 'src/app/services/chat.service';
import { SessionService } from 'src/app/Securities/Services/session.service';
import { Subscription } from 'rxjs';

export interface CallHistoryLog {
  id: number;
  caller_name: string;
  call_type: 'AUDIO' | 'VIDEO';
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  created_at: string;
  duration?: string;
}

@Component({
  selector: 'app-secure-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './secure-chat.html',
  styleUrls: ['./secure-chat.scss']
})
export class SecureChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('localCallVideo') localCallVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteCallVideo') remoteCallVideoRef!: ElementRef<HTMLVideoElement>;

  conversations: ChatConversation[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  newMessageText = '';

  // WhatsApp & Liquid Features
  activeSidebarView: 'CHATS' | 'STATUS' | 'CALLS' = 'CHATS';
  searchQuery = '';
  isNewChatPanelOpen = false;
  isMobileSidebarOpen = false;
  showAttachmentMenu = false;
  isOptionsMenuOpen = false;
  pinnedConvIds: number[] = [];
  mutedConvIds: number[] = [];

  // WhatsApp Dynamic Status / Stories System
  showAddStatusMenu = false;
  activeViewingStatus: any = null;
  statusProgressTimer: any = null;
  myStatuses: { id: number; mediaUrl?: string; text?: string; type: 'IMAGE' | 'TEXT'; time: string }[] = [];
  recentStatuses: { id: number; userName: string; avatarUrl?: string; mediaUrl?: string; text?: string; time: string }[] = [];

  // Call History System
  callHistoryLogs: CallHistoryLog[] = [];

  // Member Mentions System (@mention)
  showMentionDropdown = false;
  mentionCandidates: { id: number; name: string; email?: string }[] = [];

  // Active Category Filter
  activeTab: 'ALL' | 'UNREAD' | 'DIRECT' | 'GROUPS' = 'ALL';

  // Dynamic Logged In User Profile
  currentUserId = 1;
  showProfileModal = false;
  userProfile = {
    name: 'Super Admin',
    email: 'ps@gmail.com',
    avatarUrl: '',
    about: 'Available • Workspace Member',
    status: 'ONLINE' as 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE',
  };

  // Rich Categorized Emoji Picker
  showEmojiPicker = false;
  activeEmojiCategory: 'ALL' | 'SMILEYS' | 'HANDS' | 'HEARTS' | 'ANIMALS' | 'FOOD' | 'OBJECTS' = 'ALL';

  emojiDictionary = {
    SMILEYS: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫡', '🤫', '🫠'],
    HANDS: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '👋', '💪', '🙏'],
    HEARTS: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '❤️‍🔥', '❤️‍🩹', '🔥', '✨', '🌟', '⭐', '💥'],
    ANIMALS: ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🦅', '🦉', '🐧', '🐦', '🐤', '🐺', '🐗', '🐴', '🦄'],
    FOOD: ['🍎', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥥', '🥝', '🍅', '🥑', '🥦', '🌽', '🍿', '🍩', '🍪', '🎂', '🍰', '☕', '🍺', '🍷'],
    OBJECTS: ['💡', '📱', '💻', '⌨️', '🖥️', '📸', '🎥', '🎬', '📞', '📻', '🎙️', '🔔', '📢', '🔒', '🔓', '🔐', '🔑', '🛡️', '🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🚀', '🚗', '✈️', '💬']
  };

  // Voice Note Recording
  isRecordingVoice = false;
  recordingDuration = 0;
  recordingTimer: any = null;

  // Directory Search
  directoryResults: { id: number; name: string; email: string; role: string }[] = [];

  // Active WebRTC Calls
  activeCallSession: WebRTCCallSession | null = null;
  incomingCallSession: WebRTCCallSession | null = null;
  isMuted = false;
  isVideoOff = false;
  isScreenSharing = false;

  private subscriptions: Subscription[] = [];

  constructor(
    public chatService: ChatService,
    private sessionService: SessionService
  ) { }

  ngOnInit(): void {
    // Dynamic Auth User Hydration
    const currentUser = this.sessionService.getUser();
    if (currentUser && (currentUser.id || currentUser.userId)) {
      this.currentUserId = currentUser.id || currentUser.userId;
      this.userProfile.name = currentUser.name || this.userProfile.name;
      this.userProfile.email = currentUser.email || this.userProfile.email;
      const roleStr = currentUser.userType || currentUser.role || 'Member';
      this.userProfile.about = `${roleStr} • Active Member`;
    }

    this.loadConversations();
    this.loadCallHistory();
    this.loadStatuses();

    // Socket message listener
    this.subscriptions.push(
      this.chatService.incomingMessage$.subscribe((msg) => {
        if (this.activeConversation && msg.conversation_id === this.activeConversation.id) {
          this.messages.push(msg);
          this.scrollToBottom();
        }
        this.updateConversationLatestMessage(msg);
      })
    );

    // Incoming WebRTC calls
    this.subscriptions.push(
      this.chatService.incomingCall$.subscribe((call) => {
        this.incomingCallSession = call;
      })
    );

    this.subscriptions.push(
      this.chatService.callOffer$.subscribe(async (data) => {
        if (this.incomingCallSession) {
          await this.chatService.answerCall(data.sender_id, data.offer, data.meeting_code, 'VIDEO');
          this.bindCallStreams();
        }
      })
    );

    this.subscriptions.push(
      this.chatService.callAnswer$.subscribe(async (data) => {
        await this.chatService.handleAnswer(data.sender_id, data.answer);
        this.bindCallStreams();
      })
    );

    this.subscriptions.push(
      this.chatService.iceCandidate$.subscribe(async (data) => {
        await this.chatService.handleIceCandidate(data.sender_id, data.candidate);
      })
    );

    this.subscriptions.push(
      this.chatService.remoteStreams$.subscribe((streamsMap) => {
        if (streamsMap.size > 0 && this.remoteCallVideoRef && this.remoteCallVideoRef.nativeElement) {
          const remoteStream = Array.from(streamsMap.values())[0];
          this.remoteCallVideoRef.nativeElement.srcObject = remoteStream;
          this.remoteCallVideoRef.nativeElement.play().catch(() => { });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    if (this.statusProgressTimer) clearInterval(this.statusProgressTimer);
    this.endCall();
  }

  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.conversations = res.data;
          if (this.conversations.length > 0 && !this.activeConversation) {
            this.selectConversation(this.conversations[0]);
          }
        }
      },
      error: (err) => console.warn('Conversations fetch error:', err),
    });
  }

  loadCallHistory(): void {
    this.chatService.getCallHistory().subscribe({
      next: (res) => {
        if (res && res.success && res.data && res.data.length > 0) {
          this.callHistoryLogs = res.data;
        }
      },
      error: (err) => console.warn('Call history fetch error:', err),
    });
  }

  loadStatuses(): void {
    this.chatService.getStatuses().subscribe({
      next: (res) => {
        if (res && res.success && res.data && res.data.length > 0) {
          this.recentStatuses = res.data;
        } else {
          this.setDefaultStatuses();
        }
      },
      error: (err) => {
        console.warn('Statuses API warning:', err);
        this.setDefaultStatuses();
      },
    });
  }

  private setDefaultStatuses(): void {
    if (this.recentStatuses.length === 0) {
      this.recentStatuses = [
        {
          id: 101,
          userName: 'PJSV Super Admin',
          mediaUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
          time: 'Today, 10:45 AM',
        },
        {
          id: 102,
          userName: 'App Admin',
          text: '🚀 Enterprise Communication & E2EE Workspace is live across all departments!',
          time: 'Today, 8:30 AM',
        },
        {
          id: 103,
          userName: 'Branch Manager',
          mediaUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800',
          time: 'Yesterday, 6:15 PM',
        }
      ];
    }
  }

  selectConversation(conv: ChatConversation): void {
    this.activeConversation = conv;
    this.isNewChatPanelOpen = false;
    this.isMobileSidebarOpen = false;
    this.showAttachmentMenu = false;
    this.isOptionsMenuOpen = false;
    this.showMentionDropdown = false;
    this.chatService.joinConversation(conv.id);
    this.chatService.getMessages(conv.id).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.messages = res.data.messages;
          this.scrollToBottom();
        }
      },
      error: (err) => console.warn('Get messages error:', err),
    });
  }

  get filteredConversations(): ChatConversation[] {
    let list = this.conversations;

    if (this.activeTab === 'UNREAD') {
      list = list.filter((c) => (c.unreadCount || 0) > 0);
    } else if (this.activeTab === 'DIRECT') {
      list = list.filter((c) => c.type === 'ONE_TO_ONE');
    } else if (this.activeTab === 'GROUPS') {
      list = list.filter((c) => c.type === 'GROUP' || c.type === 'TEAM' || c.type === 'DEPARTMENT');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) => (c.title || '').toLowerCase().includes(q) || (c.latestMessage?.content || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  togglePinConversation(convId: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.pinnedConvIds.includes(convId)) {
      this.pinnedConvIds = this.pinnedConvIds.filter((id) => id !== convId);
    } else {
      this.pinnedConvIds.push(convId);
    }
  }

  isPinned(convId: number): boolean {
    return this.pinnedConvIds.includes(convId);
  }

  toggleMuteNotifications(convId: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.mutedConvIds.includes(convId)) {
      this.mutedConvIds = this.mutedConvIds.filter((id) => id !== convId);
    } else {
      this.mutedConvIds.push(convId);
    }
  }

  isMutedConv(convId: number): boolean {
    return this.mutedConvIds.includes(convId);
  }

  clearCurrentChat(): void {
    if (!this.activeConversation) return;
    const convId = this.activeConversation.id;
    this.chatService.clearChat(convId).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.messages = [];
        }
      },
    });
  }

  deleteCurrentChat(): void {
    if (!this.activeConversation) return;
    const convId = this.activeConversation.id;
    this.chatService.deleteConversation(convId).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.conversations = this.conversations.filter((c) => c.id !== convId);
          this.activeConversation = null;
          this.messages = [];
        }
      },
    });
  }

  closeCurrentChat(): void {
    this.activeConversation = null;
    this.messages = [];
  }

  // Redial from Call History Log
  redialCall(item: CallHistoryLog, type: 'AUDIO' | 'VIDEO'): void {
    const meetingCode = `MEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.activeCallSession = {
      meeting_code: meetingCode,
      call_type: type,
      caller_name: item.caller_name,
    };
    this.startCall(type);
  }

  // Dynamic WhatsApp Status / Stories Methods
  onStatusFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.chatService.uploadFile(file).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.chatService.createStatus({
            media_url: res.data.media_url,
            type: 'IMAGE',
          }).subscribe({
            next: (sRes) => {
              if (sRes && sRes.success) {
                this.myStatuses.unshift({
                  id: sRes.data.id,
                  mediaUrl: sRes.data.mediaUrl,
                  type: 'IMAGE',
                  time: 'Just now',
                });
                this.loadStatuses();
                this.showAddStatusMenu = false;
              }
            },
            error: () => {
              this.myStatuses.unshift({
                id: Date.now(),
                mediaUrl: res.data.media_url,
                type: 'IMAGE',
                time: 'Just now',
              });
              this.showAddStatusMenu = false;
            }
          });
        }
      },
    });
  }

  addTextStatus(): void {
    const text = prompt('Enter status text:');
    if (!text || !text.trim()) return;

    this.chatService.createStatus({
      text: text.trim(),
      type: 'TEXT',
    }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.myStatuses.unshift({
            id: res.data.id,
            text: res.data.text,
            type: 'TEXT',
            time: 'Just now',
          });
          this.loadStatuses();
          this.showAddStatusMenu = false;
        }
      },
      error: () => {
        this.myStatuses.unshift({
          id: Date.now(),
          text: text.trim(),
          type: 'TEXT',
          time: 'Just now',
        });
        this.showAddStatusMenu = false;
      }
    });
  }

  showContactInfoModal = false;
  statusReplyText = '';

  openContactInfo(): void {
    this.isOptionsMenuOpen = false;
    this.showContactInfoModal = true;
  }

  closeContactInfo(): void {
    this.showContactInfoModal = false;
  }

  openStatusViewer(status: any): void {
    this.activeViewingStatus = status;
    this.statusReplyText = '';
    if (this.statusProgressTimer) clearTimeout(this.statusProgressTimer);
    this.statusProgressTimer = setTimeout(() => {
      this.closeStatusViewer();
    }, 6000);
  }

  closeStatusViewer(): void {
    if (this.statusProgressTimer) clearTimeout(this.statusProgressTimer);
    this.activeViewingStatus = null;
    this.statusReplyText = '';
  }

  likeStatus(status: any): void {
    if (!status) return;
    status.isLiked = !status.isLiked;
  }

  sendReplyToStatus(): void {
    if (!this.statusReplyText.trim() || !this.activeViewingStatus) return;
    const text = this.statusReplyText.trim();
    if (this.activeConversation) {
      this.chatService.sendMessage({
        conversation_id: this.activeConversation.id,
        content: `Replying to status story (${this.activeViewingStatus.userName || 'Status'}): ${text}`,
      });
    }
    this.statusReplyText = '';
    this.closeStatusViewer();
  }

  // Live @Mention Autocomplete Trigger
  onMessageInputChange(): void {
    const text = this.newMessageText;
    const lastAtIndex = text.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex >= text.length - 20) {
      const query = text.substring(lastAtIndex + 1).toLowerCase();
      let participants = (this.activeConversation?.participants || []).map((p) => ({
        id: p.user_id,
        name: p.user_name,
        email: p.email,
      }));

      if (this.directoryResults.length > 0) {
        participants = [...participants, ...this.directoryResults.map((d) => ({ id: d.id, name: d.name, email: d.email }))];
      }

      this.mentionCandidates = participants.filter(
        (p) => p.name.toLowerCase().includes(query) && p.id !== this.currentUserId
      );

      this.showMentionDropdown = this.mentionCandidates.length > 0;
    } else {
      this.showMentionDropdown = false;
    }
  }

  insertMention(user: { name: string }): void {
    const lastAtIndex = this.newMessageText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      this.newMessageText = `${this.newMessageText.substring(0, lastAtIndex)}@${user.name} `;
    } else {
      this.newMessageText += `@${user.name} `;
    }
    this.showMentionDropdown = false;
  }

  onSearchInput(): void {
    if (this.searchQuery.trim().length > 0) {
      this.chatService.searchDirectory(this.searchQuery).subscribe({
        next: (res) => {
          if (res && res.success) this.directoryResults = res.data;
        },
        error: () => { this.directoryResults = []; }
      });
    } else {
      this.directoryResults = [];
    }
  }

  toggleNewChatPanel(): void {
    this.isNewChatPanelOpen = !this.isNewChatPanelOpen;
    if (this.isNewChatPanelOpen && this.directoryResults.length === 0) {
      this.chatService.searchDirectory('').subscribe({
        next: (res) => {
          if (res && res.success) this.directoryResults = res.data;
        },
        error: () => { this.directoryResults = []; }
      });
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.directoryResults = [];
  }

  get currentEmojiList(): string[] {
    if (this.activeEmojiCategory === 'ALL') {
      return [
        ...this.emojiDictionary.SMILEYS,
        ...this.emojiDictionary.HANDS,
        ...this.emojiDictionary.HEARTS,
        ...this.emojiDictionary.ANIMALS,
        ...this.emojiDictionary.FOOD,
        ...this.emojiDictionary.OBJECTS
      ];
    }
    return this.emojiDictionary[this.activeEmojiCategory] || [];
  }

  getAvatarGradient(name: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
      'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    ];
    let hash = 0;
    const str = name || 'User';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  onProfileAvatarSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.chatService.uploadFile(file).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.userProfile.avatarUrl = res.data.media_url;
        }
      },
    });
  }

  saveProfile(): void {
    this.showProfileModal = false;
  }

  appendEmoji(emoji: string): void {
    this.newMessageText += emoji;
  }

  sendMessage(): void {
    if (!this.activeConversation || !this.newMessageText.trim()) return;

    this.chatService.sendMessage({
      conversation_id: this.activeConversation.id,
      content: this.newMessageText,
      media_type: 'TEXT',
    });

    this.newMessageText = '';
    this.showAttachmentMenu = false;
    this.showEmojiPicker = false;
    this.showMentionDropdown = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.activeConversation) return;

    this.chatService.uploadFile(file).subscribe({
      next: (res) => {
        if (res && res.success && this.activeConversation) {
          this.chatService.sendMessage({
            conversation_id: this.activeConversation.id,
            media_url: res.data.media_url,
            media_type: res.data.media_type,
            file_name: res.data.file_name,
            file_size: res.data.file_size,
            content: `Sent attachment: ${res.data.file_name}`,
          });
          this.showAttachmentMenu = false;
        }
      },
    });
  }

  get formattedRecordingTime(): string {
    const mins = Math.floor(this.recordingDuration / 60);
    const secs = this.recordingDuration % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  cancelVoiceRecording(): void {
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    this.isRecordingVoice = false;
    this.recordingDuration = 0;
    this.chatService.stopVoiceRecording();
  }

  async toggleVoiceRecording(): Promise<void> {
    if (!this.isRecordingVoice) {
      await this.chatService.startVoiceRecording();
      this.isRecordingVoice = true;
      this.showAttachmentMenu = false;
      this.recordingDuration = 0;
      this.recordingTimer = setInterval(() => this.recordingDuration++, 1000);
    } else {
      clearInterval(this.recordingTimer);
      this.isRecordingVoice = false;
      const blob = await this.chatService.stopVoiceRecording();
      if (blob && this.activeConversation) {
        const voiceFile = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        this.chatService.uploadFile(voiceFile).subscribe({
          next: (res) => {
            if (res && res.success && this.activeConversation) {
              this.chatService.sendMessage({
                conversation_id: this.activeConversation.id,
                media_url: res.data.media_url,
                media_type: 'AUDIO_VOICE_NOTE',
                file_name: 'Voice Note',
                file_size: voiceFile.size,
              });
            }
          },
        });
      }
    }
  }

  addReaction(messageId: number, emoji: string): void {
    this.chatService.toggleReaction(messageId, emoji).subscribe({
      next: (res) => {
        if (res && res.success) {
          const msg = this.messages.find((m) => m.id === messageId);
          if (msg) msg.reactions = res.data.reactions;
        }
      },
    });
  }

  // WebRTC Call Initiation & Media Stream Binding
  async startCall(type: 'AUDIO' | 'VIDEO'): Promise<void> {
    if (!this.activeConversation) return;

    const targetUser = this.activeConversation.participants.find((p) => p.user_id !== this.currentUserId);
    const meetingCode = `MEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    this.activeCallSession = {
      meeting_code: meetingCode,
      call_type: type,
      caller_name: targetUser ? targetUser.user_name : (this.activeConversation.title || 'Direct Call'),
    };

    try {
      await this.chatService.startLocalMedia(type === 'VIDEO', true);
      if (targetUser) {
        await this.chatService.initiateCall(targetUser.user_id, meetingCode, type);
      }
      this.bindCallStreams();
    } catch (err: any) {
      console.warn('Call stream initiation error:', err);
      this.bindCallStreams();
    }
  }

  async acceptIncomingCall(): Promise<void> {
    if (!this.incomingCallSession) return;
    this.activeCallSession = this.incomingCallSession;
    this.incomingCallSession = null;
    try {
      await this.chatService.startLocalMedia(this.activeCallSession.call_type === 'VIDEO', true);
    } catch (e) {
      console.warn('Accept call stream error:', e);
    }
    this.bindCallStreams();
  }

  rejectIncomingCall(): void {
    this.incomingCallSession = null;
  }

  endCall(): void {
    this.chatService.closeCall();
    this.activeCallSession = null;
  }

  private bindCallStreams(): void {
    setTimeout(() => {
      if (this.chatService.localStream && this.localCallVideoRef && this.localCallVideoRef.nativeElement) {
        this.localCallVideoRef.nativeElement.srcObject = this.chatService.localStream;
        this.localCallVideoRef.nativeElement.play().catch(() => { });
      }
    }, 300);
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.chatService.localStream) {
      this.chatService.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.isMuted));
    }
  }

  toggleVideo(): void {
    this.isVideoOff = !this.isVideoOff;
    if (this.chatService.localStream) {
      this.chatService.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.isVideoOff));
    }
  }

  async toggleScreenShare(): Promise<void> {
    this.isScreenSharing = !this.isScreenSharing;
    if (this.isScreenSharing) {
      const screenStream = await this.chatService.startScreenShare();
      if (this.localCallVideoRef && this.localCallVideoRef.nativeElement) {
        this.localCallVideoRef.nativeElement.srcObject = screenStream;
      }
    } else {
      const localStream = await this.chatService.startLocalMedia(true, true);
      if (this.localCallVideoRef && this.localCallVideoRef.nativeElement) {
        this.localCallVideoRef.nativeElement.srcObject = localStream;
      }
    }
  }

  startDirectChat(user: { id: number; name: string }): void {
    this.chatService
      .createConversation({
        type: 'ONE_TO_ONE',
        title: user.name,
        participant_user_ids: [user.id],
      })
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.isNewChatPanelOpen = false;
            this.isMobileSidebarOpen = false;
            this.clearSearch();
            this.loadConversations();
            this.selectConversation(res.data);
          }
        },
      });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private updateConversationLatestMessage(msg: ChatMessage): void {
    const conv = this.conversations.find((c) => c.id === msg.conversation_id);
    if (conv) {
      conv.latestMessage = msg;
    }
  }
}
