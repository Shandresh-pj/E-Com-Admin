import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environment/environment';
import { io, Socket } from 'socket.io-client';

export interface ChatConversation {
  id: number;
  title: string | null;
  type: string;
  company_id: number;
  branch_id?: number | null;
  department_id?: number | null;
  team_id?: number | null;
  is_encrypted: boolean;
  avatar_url?: string | null;
  participants: {
    id: number;
    user_id: number;
    role: string;
    public_key?: string | null;
    user_name: string;
    email?: string;
  }[];
  latestMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  content: string | null;
  encrypted_content?: string | null;
  iv_salt?: string | null;
  media_url?: string | null;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO_VOICE_NOTE' | 'DOCUMENT' | 'FILE';
  file_name?: string | null;
  file_size?: number | null;
  reply_to_id?: number | null;
  reactions?: Record<string, number[]>;
  is_edited?: boolean;
  is_deleted?: boolean;
  is_delivered?: boolean;
  is_read?: boolean;
  created_at: string;
}

export interface WebRTCCallSession {
  meeting_code: string;
  session_id?: number;
  call_type: 'AUDIO' | 'VIDEO' | 'MEETING';
  caller_id?: number;
  caller_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private socket!: Socket;

  public activeConversation$ = new BehaviorSubject<ChatConversation | null>(null);
  public incomingMessage$ = new Subject<ChatMessage>();
  public typingStatus$ = new Subject<{ user_id: number; conversation_id: number; is_typing: boolean }>();
  public incomingCall$ = new Subject<WebRTCCallSession>();
  public callOffer$ = new Subject<{ sender_id: number; offer: any; meeting_code: string }>();
  public callAnswer$ = new Subject<{ sender_id: number; answer: any; meeting_code: string }>();
  public iceCandidate$ = new Subject<{ sender_id: number; candidate: any; meeting_code: string }>();
  public callEnded$ = new Subject<{ meeting_code: string }>();

  // Media Recording for Voice Notes
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // WebRTC PeerConnections
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  public localStream: MediaStream | null = null;
  public remoteStreams$ = new BehaviorSubject<Map<number, MediaStream>>(new Map());

  constructor(private http: HttpClient) {
    this.initSocket();
  }

  private initSocket(): void {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const socketUrl = environment.apiUrl.replace(/\/api\/?$/, '');

    this.socket = io(socketUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token }
    });

    this.socket.on('connect', () => {
      console.log('[ChatService] Socket Connected:', this.socket.id);
    });

    this.socket.on('chat:message_received', (msg: ChatMessage) => {
      this.incomingMessage$.next(msg);
    });

    this.socket.on('chat:user_typing', (data: any) => {
      this.typingStatus$.next(data);
    });

    this.socket.on('call:incoming', (data: WebRTCCallSession) => {
      this.incomingCall$.next(data);
    });

    this.socket.on('call:offer', (data: any) => {
      this.callOffer$.next(data);
    });

    this.socket.on('call:answer', (data: any) => {
      this.callAnswer$.next(data);
    });

    this.socket.on('call:ice_candidate', (data: any) => {
      this.iceCandidate$.next(data);
    });

    this.socket.on('call:ended', (data: any) => {
      this.callEnded$.next(data);
      this.closeCall();
    });
  }

  // ── REST API Calls ──────────────────────────────────────────────────────────
  getConversations(): Observable<{ success: boolean; data: ChatConversation[] }> {
    return this.http.get<{ success: boolean; data: ChatConversation[] }>(`${this.apiUrl}/chat/conversations`);
  }

  createConversation(payload: {
    type: string;
    title?: string;
    participant_user_ids: number[];
    branch_id?: number;
    department_id?: number;
    team_id?: number;
  }): Observable<{ success: boolean; data: ChatConversation }> {
    return this.http.post<{ success: boolean; data: ChatConversation }>(`${this.apiUrl}/chat/conversations`, payload);
  }

  getMessages(conversationId: number, page = 1, limit = 50): Observable<{ success: boolean; data: { messages: ChatMessage[]; total: number } }> {
    return this.http.get<{ success: boolean; data: { messages: ChatMessage[]; total: number } }>(
      `${this.apiUrl}/chat/messages/${conversationId}?page=${page}&limit=${limit}`
    );
  }

  uploadFile(file: File): Observable<{ success: boolean; data: { file_name: string; file_size: number; media_url: string; media_type: any } }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/chat/upload`, formData);
  }

  toggleReaction(messageId: number, emoji: string): Observable<{ success: boolean; data: ChatMessage }> {
    return this.http.post<{ success: boolean; data: ChatMessage }>(`${this.apiUrl}/chat/reactions`, { message_id: messageId, emoji });
  }

  searchDirectory(query: string): Observable<{ success: boolean; data: { id: number; name: string; email: string; role: string }[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/chat/directory?q=${encodeURIComponent(query)}`);
  }

  getCallHistory(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/chat/calls/history`);
  }

  getStatuses(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.apiUrl}/chat/statuses`);
  }

  createStatus(payload: { media_url?: string; text?: string; type: string }): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/chat/statuses`, payload);
  }

  clearChat(conversationId: number): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/chat/clear`, { conversation_id: conversationId });
  }

  deleteConversation(conversationId: number): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.apiUrl}/chat/delete-conversation`, { conversation_id: conversationId });
  }

  // ── Real-Time Socket Actions ────────────────────────────────────────────────
  joinConversation(conversationId: number): void {
    if (this.socket) {
      this.socket.emit('join-conversation', { conversation_id: conversationId });
    }
  }

  sendMessage(payload: {
    conversation_id: number;
    content?: string;
    encrypted_content?: string;
    iv_salt?: string;
    media_url?: string;
    media_type?: string;
    file_name?: string;
    file_size?: number;
    reply_to_id?: number;
  }): void {
    if (this.socket) {
      this.socket.emit('chat:send', payload);
    }
  }

  sendTyping(conversationId: number, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('chat:typing', { conversation_id: conversationId, is_typing: isTyping });
    }
  }

  // ── Voice Recording API ────────────────────────────────────────────────────
  startVoiceRecording(): Promise<void> {
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.start();
    });
  }

  stopVoiceRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(new Blob());
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        // Stop audio tracks
        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
        this.mediaRecorder = null;
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  // ── WebRTC Calling & Screen Sharing ───────────────────────────────────────
  async startLocalMedia(video = true, audio = true): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
    return this.localStream;
  }

  async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    if (this.localStream) {
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = Array.from(this.peerConnections.values())[0]?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
    return screenStream;
  }

  createPeerConnection(targetUserId: number, meetingCode: string): RTCPeerConnection {
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(rtcConfig);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('call:ice_candidate', {
          target_user_id: targetUserId,
          candidate: event.candidate,
          meeting_code: meetingCode,
        });
      }
    };

    pc.ontrack = (event) => {
      const map = this.remoteStreams$.value;
      map.set(targetUserId, event.streams[0]);
      this.remoteStreams$.next(new Map(map));
    };

    this.peerConnections.set(targetUserId, pc);
    return pc;
  }

  async initiateCall(targetUserId: number, meetingCode: string, callType: 'AUDIO' | 'VIDEO' | 'MEETING'): Promise<void> {
    await this.startLocalMedia(callType !== 'AUDIO', true);
    const pc = this.createPeerConnection(targetUserId, meetingCode);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('call:offer', {
      target_user_id: targetUserId,
      offer,
      meeting_code: meetingCode,
    });
  }

  async answerCall(targetUserId: number, offer: any, meetingCode: string, callType: 'AUDIO' | 'VIDEO' | 'MEETING'): Promise<void> {
    await this.startLocalMedia(callType !== 'AUDIO', true);
    const pc = this.createPeerConnection(targetUserId, meetingCode);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('call:answer', {
      target_user_id: targetUserId,
      answer,
      meeting_code: meetingCode,
    });
  }

  async handleAnswer(targetUserId: number, answer: any): Promise<void> {
    const pc = this.peerConnections.get(targetUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(targetUserId: number, candidate: any): Promise<void> {
    const pc = this.peerConnections.get(targetUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  closeCall(): void {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStreams$.next(new Map());
  }
}
