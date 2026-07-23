import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playBreakStart() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 523.25, now, 0.15, 'sine'); // C5
      this.playTone(ctx, 659.25, now + 0.15, 0.25, 'sine'); // E5
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  playBreakReminder() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 587.33, now, 0.2, 'triangle'); // D5
      this.playTone(ctx, 587.33, now + 0.25, 0.2, 'triangle'); // D5
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  playBreakExceeded() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 880, now, 0.15, 'sawtooth'); // A5
      this.playTone(ctx, 440, now + 0.18, 0.3, 'sawtooth'); // A4
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  playCheckInSuccess() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 440, now, 0.1, 'sine'); // A4
      this.playTone(ctx, 554.37, now + 0.1, 0.1, 'sine'); // C#5
      this.playTone(ctx, 659.25, now + 0.2, 0.25, 'sine'); // E5
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  playCheckOutSuccess() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 659.25, now, 0.1, 'sine'); // E5
      this.playTone(ctx, 554.37, now + 0.1, 0.1, 'sine'); // C#5
      this.playTone(ctx, 440, now + 0.2, 0.25, 'sine'); // A4
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  playNotificationChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.playTone(ctx, 783.99, now, 0.15, 'sine'); // G5
      this.playTone(ctx, 1046.50, now + 0.15, 0.3, 'sine'); // C6
    } catch (e) {
      console.warn('Audio feedback unavailable:', e);
    }
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, type: OscillatorType) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
