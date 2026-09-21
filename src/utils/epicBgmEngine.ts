// Tactical War Room Epic Music Synthesizer & Universal Audio Stream Engine
// Supports both dynamic Web Audio API Synthesis AND Direct Audio Link Streams (MP3/WAV/OGG)
// with Auto-Random/Shuffle on end, Custom Admin Playlists, and Persistent Global Control.

import { SoundtrackItem, AudioPlaybackMode, AudioSettings } from '../types';

let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedCtx = new AudioCtx();
      }
    }
    if (sharedCtx && sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

// Tactical UI Sound Effects
export function playTacticalSound(type: 'click' | 'like' | 'comment' | 'correct' | 'wrong' | 'timer' | 'win' | 'switch') {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  try {
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);

    } else if (type === 'switch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);

    } else if (type === 'like') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

    } else if (type === 'comment') {
      const freqs = [659.25, 880, 1174.66];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.16);
      });

    } else if (type === 'correct' || type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.18, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });

    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'timer') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

export type SynthTrackId = 'epic_march' | 'cyber_mission' | 'triumph_anthem' | 'strategic_zen';

// 🛑 هیچ قطعه پیش‌فرضی به صورت هاردکد وجود ندارد. کلیه موسیقی‌ها باید توسط ادمین در پنل ایجاد و در Supabase ذخیره شوند.
export const DEFAULT_SOUNDTRACKS: SoundtrackItem[] = [];

export const TRACK_LIST = DEFAULT_SOUNDTRACKS; // backward compat

// شناسه‌های قطعات پیش‌فرض قدیمی جهت پاک‌سازی خودکار در صورت وجود در حافظه مرورگر
const LEGACY_DEFAULT_IDS = new Set([
  'track-synth-march',
  'track-url-epic-orchestra',
  'track-synth-cyber',
  'track-url-tactical-drums',
  'track-synth-triumph',
  'track-synth-zen'
]);

class UniversalAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private masterGain: GainNode | null = null;
  private timerId: number | null = null;
  private synthStep: number = 0;
  private synthCycleSeconds: number = 0;
  private volume: number = 0.35;
  
  // HTML5 Audio Element for URL-based tracks
  private audioElement: HTMLAudioElement | null = null;
  private isUsingUrlAudio: boolean = false;

  // Playlist & Settings
  private playlist: SoundtrackItem[] = [];
  private currentTrack: SoundtrackItem | null = null;
  private playbackMode: AudioPlaybackMode = 'random';
  private autoAdvanceTimerId: number | null = null;

  // Synthesis data
  private marchChords = [
    { root: 146.83, notes: [293.66, 349.23, 440.0, 587.33] },
    { root: 116.54, notes: [233.08, 293.66, 349.23, 466.16] },
    { root: 174.61, notes: [349.23, 440.0, 523.25, 698.46] },
    { root: 130.81, notes: [261.63, 329.63, 392.0, 523.25] },
  ];
  private marchMelody = [
    587.33, 0, 587.33, 659.25, 698.46, 0, 587.33, 0, 880.0, 0, 783.99, 0, 698.46, 659.25, 587.33, 0,
    466.16, 0, 466.16, 587.33, 698.46, 0, 880.0, 0, 932.33, 0, 880.0, 0, 698.46, 0, 587.33, 0,
    523.25, 0, 659.25, 0, 698.46, 0, 783.99, 0, 880.0, 0, 1046.5, 0, 880.0, 0, 698.46, 0,
    523.25, 0, 659.25, 0, 783.99, 0, 880.0, 0, 659.25, 0, 587.33, 0, 523.25, 440.0, 587.33, 0
  ];

  private cyberChords = [
    { root: 92.50, notes: [185.00, 220.00, 277.18, 370.00] },
    { root: 110.00, notes: [220.00, 277.18, 329.63, 440.00] },
    { root: 98.00, notes: [196.00, 246.94, 293.66, 392.00] },
    { root: 82.41, notes: [164.81, 207.65, 246.94, 329.63] },
  ];
  private cyberArpNotes = [
    370.00, 440.00, 554.37, 740.00, 554.37, 440.00, 370.00, 440.00,
    440.00, 554.37, 659.25, 880.00, 659.25, 554.37, 440.00, 554.37,
    392.00, 493.88, 587.33, 783.99, 587.33, 493.88, 392.00, 493.88,
    329.63, 415.30, 493.88, 659.25, 493.88, 415.30, 329.63, 415.30
  ];

  private triumphChords = [
    { root: 98.00, notes: [196.00, 246.94, 293.66, 392.00] },
    { root: 82.41, notes: [164.81, 196.00, 246.94, 329.63] },
    { root: 130.81, notes: [261.63, 329.63, 392.00, 523.25] },
    { root: 146.83, notes: [293.66, 369.99, 440.00, 587.33] }
  ];
  private triumphMelody = [
    392.00, 0, 493.88, 0, 587.33, 0, 783.99, 0, 783.99, 0, 880.00, 0, 783.99, 587.33, 493.88, 0,
    329.63, 0, 392.00, 0, 493.88, 0, 659.25, 0, 587.33, 0, 493.88, 0, 392.00, 0, 493.88, 0,
    523.25, 0, 659.25, 0, 783.99, 0, 1046.5, 0, 880.00, 0, 783.99, 0, 659.25, 0, 587.33, 0,
    587.33, 0, 739.99, 0, 880.00, 0, 1174.66, 0, 987.77, 0, 880.00, 0, 783.99, 0, 587.33, 0
  ];

  private zenChords = [
    { root: 110.00, notes: [220.00, 261.63, 329.63, 440.00] },
    { root: 87.31, notes: [174.61, 220.00, 261.63, 349.23] },
    { root: 130.81, notes: [261.63, 329.63, 392.00, 523.25] },
    { root: 98.00, notes: [196.00, 246.94, 293.66, 392.00] }
  ];
  private zenChimes = [
    440.00, 0, 0, 0, 659.25, 0, 0, 0, 523.25, 0, 0, 0, 880.00, 0, 0, 0,
    349.23, 0, 0, 0, 523.25, 0, 0, 0, 440.00, 0, 0, 0, 698.46, 0, 0, 0,
    523.25, 0, 0, 0, 659.25, 0, 0, 0, 783.99, 0, 0, 0, 1046.5, 0, 0, 0,
    392.00, 0, 0, 0, 587.33, 0, 0, 0, 493.88, 0, 0, 0, 783.99, 0, 0, 0
  ];

  constructor() {
    this.initPlaylist();
    this.setupAudioElement();
  }

  private initPlaylist() {
    try {
      const savedList = localStorage.getItem('warroom_soundtracks');
      if (savedList) {
        const parsed = JSON.parse(savedList);
        const filtered = Array.isArray(parsed)
          ? parsed.filter((t: any) => t && typeof t === 'object' && !LEGACY_DEFAULT_IDS.has(t.id))
          : [];
        this.playlist = filtered;
        if (filtered.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
          localStorage.setItem('warroom_soundtracks', JSON.stringify(filtered));
        }
      } else {
        this.playlist = [];
      }

      const savedSettings = localStorage.getItem('warroom_audio_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.playbackMode) this.playbackMode = parsed.playbackMode;
        if (parsed.defaultVolume !== undefined) this.volume = parsed.defaultVolume / 100;
        if (parsed.activeTrackId) {
          const found = this.playlist.find(t => t.id === parsed.activeTrackId && t.is_active);
          if (found) this.currentTrack = found;
        }
      }

      if (!this.currentTrack && this.playlist.length > 0) {
        this.currentTrack = this.playlist.find(t => t.is_active) || null;
      }
    } catch {
      this.playlist = [];
      this.currentTrack = null;
    }
  }

  /** آیا حداقل یک قطعه فعال در لیست پخش وجود دارد؟ */
  public getHasActiveTracks(): boolean {
    return Boolean(Array.isArray(this.playlist) && this.playlist.length > 0 && this.playlist.some(t => t.is_active));
  }

  private setupAudioElement() {
    if (typeof window === 'undefined') return;
    if (this.audioElement) return;

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = false; // We handle loop via playlist mode
    this.audioElement.volume = this.volume;

    // When URL track ends, automatically advance according to playback mode!
    this.audioElement.addEventListener('ended', () => {
      if (this.isRunning && this.isUsingUrlAudio) {
        console.log('Track ended naturally, auto-advancing according to mode:', this.playbackMode);
        this.handleTrackEnded();
      }
    });

    // Error fallback: ONLY if actively expecting this URL track to play
    this.audioElement.addEventListener('error', (e) => {
      if (this.isRunning && this.isUsingUrlAudio && this.currentTrack?.sourceType === 'url' && this.audioElement?.src) {
        console.warn('Audio link load failed, switching to backup synth:', e);
        const token = this.playbackToken;
        try {
          this.audioElement.removeAttribute('src');
          this.audioElement.load();
        } catch {}
        this.playSynthMode('epic_march', token);
      }
    });
  }

  // Handle when current track finishes
  private handleTrackEnded() {
    if (!this.isRunning) return;

    if (this.playbackMode === 'repeat_one') {
      // Replay the same track
      if (this.currentTrack) {
        this.playTrack(this.currentTrack);
      }
    } else if (this.playbackMode === 'random') {
      // Pick a random track from active playlist
      this.nextRandomTrack();
    } else {
      // Sequential next
      this.nextSequentialTrack();
    }
  }

  public getPlaylist(): SoundtrackItem[] {
    return this.playlist;
  }

  public setPlaylist(newPlaylist: SoundtrackItem[]) {
    this.playlist = Array.isArray(newPlaylist) ? newPlaylist : [];
    try {
      localStorage.setItem('warroom_soundtracks', JSON.stringify(this.playlist));
      window.dispatchEvent(new CustomEvent('warroom_soundtracks_updated', { detail: this.playlist }));
    } catch {}
    pushMusicStateToSupabase(); // 📡 همگام‌سازی با Supabase

    // اگر هیچ قطعه فعالی باقی نمانده است، موسیقی قطع شده و کلیه ارجاعات پاک می‌شوند
    if (!this.getHasActiveTracks()) {
      this.stopAllAudio();
      this.isRunning = false;
      this.currentTrack = null;
      try {
        localStorage.setItem('warroom_music_enabled', 'false');
      } catch {}
      window.dispatchEvent(new CustomEvent('warroom_music_state_changed', { 
        detail: { isRunning: false, track: null } 
      }));
      window.dispatchEvent(new CustomEvent('warroom_track_changed', { detail: null }));
      return;
    }

    // بررسی اینکه آیا ترک فعلی حذف یا غیرفعال شده است
    if (this.currentTrack && !this.playlist.some(t => t.id === this.currentTrack?.id && t.is_active)) {
      const firstActive = this.playlist.find(t => t.is_active);
      if (firstActive) {
        if (this.isRunning) {
          this.playTrack(firstActive);
        } else {
          this.currentTrack = firstActive;
        }
      } else {
        this.stopAllAudio();
        this.isRunning = false;
        this.currentTrack = null;
      }
    }
  }

  public getPlaybackMode(): AudioPlaybackMode {
    return this.playbackMode;
  }

  public setPlaybackMode(mode: AudioPlaybackMode) {
    this.playbackMode = mode;
    try {
      const savedSettings = JSON.parse(localStorage.getItem('warroom_audio_settings') || '{}');
      savedSettings.playbackMode = mode;
      localStorage.setItem('warroom_audio_settings', JSON.stringify(savedSettings));
      window.dispatchEvent(new CustomEvent('warroom_audio_settings_updated', { detail: savedSettings }));
    } catch {}
    pushMusicStateToSupabase(); // 📡 همگام‌سازی با Supabase
  }

  public getCurrentTrack(): SoundtrackItem | null {
    if (!this.currentTrack && this.playlist.length > 0) {
      this.currentTrack = this.playlist.find(t => t.is_active) || this.playlist[0];
    }
    return this.currentTrack;
  }

  public setTrack(trackIdOrObj: string | SoundtrackItem) {
    let track: SoundtrackItem | undefined;
    if (typeof trackIdOrObj === 'string') {
      track = this.playlist.find(t => t.id === trackIdOrObj || (t.synthTrackId && t.synthTrackId === trackIdOrObj));
    } else {
      track = trackIdOrObj;
    }

    if (!track) return;
    this.currentTrack = track;

    try {
      const savedSettings = JSON.parse(localStorage.getItem('warroom_audio_settings') || '{}');
      savedSettings.activeTrackId = track.id;
      localStorage.setItem('warroom_audio_settings', JSON.stringify(savedSettings));
      localStorage.setItem('warroom_selected_track', track.id);
      window.dispatchEvent(new CustomEvent('warroom_track_changed', { detail: track }));
    } catch {}

    pushMusicStateToSupabase(); // 📡 همگام‌سازی با Supabase

    if (this.isRunning) {
      this.playTrack(track);
    }
  }

  public nextRandomTrack() {
    const activeTracks = this.playlist.filter(t => t.is_active);
    if (activeTracks.length === 0) return;
    if (activeTracks.length === 1) {
      this.playTrack(activeTracks[0]);
      return;
    }

    // Pick random different track
    const otherTracks = activeTracks.filter(t => t.id !== this.currentTrack?.id);
    const pool = otherTracks.length > 0 ? otherTracks : activeTracks;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const selected = pool[randomIndex];
    this.setTrack(selected);
  }

  public nextSequentialTrack() {
    const activeTracks = this.playlist.filter(t => t.is_active);
    if (activeTracks.length === 0) return;

    const currentIndex = activeTracks.findIndex(t => t.id === this.currentTrack?.id);
    const nextIndex = (currentIndex + 1) % activeTracks.length;
    this.setTrack(activeTracks[nextIndex]);
  }

  public nextTrack() {
    if (this.playbackMode === 'random') {
      this.nextRandomTrack();
    } else {
      this.nextSequentialTrack();
    }
  }

  public playNext() {
    this.nextTrack();
  }

  public prevTrack() {
    const activeTracks = this.playlist.filter(t => t.is_active);
    if (activeTracks.length === 0) return;

    const currentIndex = activeTracks.findIndex(t => t.id === this.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + activeTracks.length) % activeTracks.length;
    this.setTrack(activeTracks[prevIndex]);
  }

  public playPrevious() {
    this.prevTrack();
  }

  // Token generation to enforce strictly ONE single audio stream and prevent race conditions
  private playbackToken: number = 0;

  public stopAllAudio(): number {
    this.playbackToken++;
    const currentToken = this.playbackToken;

    // 1. Cancel any auto-advance timer
    if (this.autoAdvanceTimerId !== null) {
      window.clearTimeout(this.autoAdvanceTimerId);
      this.autoAdvanceTimerId = null;
    }

    // 2. Kill synth interval timer immediately
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    // 3. Immediately silence and disconnect Web Audio master gain
    if (this.masterGain) {
      try {
        if (this.ctx && this.ctx.state !== 'closed') {
          this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    // 4. Fully halt, silence, and unload HTML5 audio element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
      } catch {}
    }
    this.isUsingUrlAudio = false;

    return currentToken;
  }

  public start() {
    // اگر هیچ قطعه فعالی در سرور یا لیست وجود ندارد، هیچ موسیقی‌ای پخش نمی‌شود
    if (!this.getHasActiveTracks()) {
      this.stopAllAudio();
      this.isRunning = false;
      this.currentTrack = null;
      return;
    }

    // Strictly prevent starting if already running - ONE track only!
    if (this.isRunning) return;

    try {
      localStorage.setItem('warroom_music_enabled', 'true');
    } catch {}

    const track = this.getCurrentTrack();
    if (track && track.is_active) {
      this.playTrack(track);
    } else {
      const firstActive = this.playlist.find(t => t.is_active);
      if (firstActive) {
        this.playTrack(firstActive);
      }
    }
  }

  public playTrack(track: SoundtrackItem) {
    if (!track) return;

    // Atomically stop all audio first
    const token = this.stopAllAudio();
    this.isRunning = true;
    this.currentTrack = track;

    // Persist and dispatch active track state
    try {
      localStorage.setItem('warroom_music_enabled', 'true');
      const savedSettings = JSON.parse(localStorage.getItem('warroom_audio_settings') || '{}');
      savedSettings.activeTrackId = track.id;
      localStorage.setItem('warroom_audio_settings', JSON.stringify(savedSettings));
      window.dispatchEvent(new CustomEvent('warroom_track_changed', { detail: track }));
      window.dispatchEvent(new CustomEvent('warroom_music_state_changed', { 
        detail: { isRunning: true, track } 
      }));
    } catch {}

    if (track.sourceType === 'url' && track.url) {
      // 1. Single URL Audio Playback
      this.playUrlAudio(track.url, token);
    } else {
      // 2. Single Synthesizer Playback
      const synthId = track.synthTrackId || 'epic_march';
      this.playSynthMode(synthId, token);

      // Auto-advance after track duration
      const duration = (track.durationSeconds || 90) * 1000;
      this.autoAdvanceTimerId = window.setTimeout(() => {
        if (this.isRunning && this.playbackToken === token) {
          console.log('Synth cycle completed, auto-advancing to next track...');
          this.handleTrackEnded();
        }
      }, duration);
    }
  }

  private playUrlAudio(url: string, token: number) {
    this.isUsingUrlAudio = true;
    if (!this.audioElement) {
      this.setupAudioElement();
    }
    if (!this.audioElement) return;

    try {
      this.audioElement.src = url;
      this.audioElement.volume = this.volume;
      this.audioElement.currentTime = 0;
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If playback was cancelled or another track took over, do nothing
          if (this.isRunning && this.playbackToken === token) {
            console.warn('URL Audio blocked or network failed, switching cleanly to backup synth:', err);
            try {
              if (this.audioElement) {
                this.audioElement.pause();
                this.audioElement.removeAttribute('src');
                this.audioElement.load();
              }
            } catch {}
            this.playSynthMode('epic_march', token);
          }
        });
      }
    } catch (e) {
      if (this.isRunning && this.playbackToken === token) {
        console.warn('Audio URL error:', e);
        this.playSynthMode('epic_march', token);
      }
    }
  }

  private playSynthMode(synthId: SynthTrackId, token: number) {
    if (!this.isRunning || this.playbackToken !== token) return;
    this.isUsingUrlAudio = false;

    // Guarantee audio element is halted and detached
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
      } catch {}
    }

    // Guarantee any previous synth interval is dead
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.ctx = getAudioContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.synthStep = 0;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.8);
    this.masterGain.connect(this.ctx.destination);

    let stepDuration = 125;
    if (synthId === 'cyber_mission') stepDuration = 117;
    else if (synthId === 'triumph_anthem') stepDuration = 134;
    else if (synthId === 'strategic_zen') stepDuration = 166;

    this.timerId = window.setInterval(() => {
      if (this.isRunning && this.playbackToken === token) {
        this.tickSynth(synthId);
      } else {
        if (this.timerId !== null) {
          window.clearInterval(this.timerId);
          this.timerId = null;
        }
      }
    }, stepDuration);
  }

  public stop() {
    this.isRunning = false;
    try {
      localStorage.setItem('warroom_music_enabled', 'false');
      window.dispatchEvent(new CustomEvent('warroom_music_state_changed', { 
        detail: { isRunning: false, track: this.currentTrack } 
      }));
    } catch {}

    this.stopAllAudio();
  }

  public toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.masterGain && this.ctx && this.ctx.state !== 'closed') {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {}
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  // Synthesizer step tick
  private tickSynth(synthId: SynthTrackId) {
    if (!this.isRunning || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const step = this.synthStep;

    switch (synthId) {
      case 'cyber_mission':
        this.tickCyber(now, step);
        break;
      case 'triumph_anthem':
        this.tickTriumph(now, step);
        break;
      case 'strategic_zen':
        this.tickZen(now, step);
        break;
      case 'epic_march':
      default:
        this.tickMarch(now, step);
        break;
    }

    this.synthStep = (this.synthStep + 1) % 64;
  }

  private tickMarch(now: number, step: number) {
    const barIdx = Math.floor(step / 16) % 4;
    const chord = this.marchChords[barIdx];
    const beatInBar = step % 16;

    if (beatInBar === 0 || beatInBar === 6 || beatInBar === 8 || beatInBar === 12 || beatInBar === 14) {
      this.playWarDrum(now, beatInBar === 0 ? 0.35 : 0.22);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.playSnare(now, 0.16);
    }
    if (beatInBar === 0 || beatInBar === 8) {
      this.playBassDrone(now, chord.root, 0.25, 0.9);
    }
    if (beatInBar === 0) {
      chord.notes.forEach((freq) => {
        this.playBrassNote(now, freq, 0.08, 1.8);
      });
    }
    const melodyFreq = this.marchMelody[step % 64];
    if (melodyFreq > 0) {
      this.playLeadNote(now, melodyFreq, 0.12, 0.28);
    }
  }

  private tickCyber(now: number, step: number) {
    const barIdx = Math.floor(step / 16) % 4;
    const chord = this.cyberChords[barIdx];
    const beatInBar = step % 16;

    if (beatInBar % 4 === 0) {
      this.playCyberKick(now, 0.32);
    }
    if (beatInBar % 2 === 1) {
      this.playHiHat(now, 0.06);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.playCyberClap(now, 0.18);
    }
    const bassOct = beatInBar % 2 === 0 ? chord.root : chord.root * 1.5;
    this.playCyberBass(now, bassOct, 0.18, 0.12);

    const arpFreq = this.cyberArpNotes[step % 32];
    if (arpFreq) {
      this.playCyberArp(now, arpFreq, 0.09, 0.12);
    }
  }

  private tickTriumph(now: number, step: number) {
    const barIdx = Math.floor(step / 16) % 4;
    const chord = this.triumphChords[barIdx];
    const beatInBar = step % 16;

    if (beatInBar === 0 || beatInBar === 8 || beatInBar === 10) {
      this.playWarDrum(now, beatInBar === 0 ? 0.30 : 0.18);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.playSnare(now, 0.14);
    }
    if (beatInBar === 0) {
      chord.notes.forEach((freq) => {
        this.playBrassNote(now, freq, 0.09, 2.0);
      });
      this.playChime(now, chord.notes[2] * 2, 0.15, 1.2);
    }
    if (beatInBar === 0 || beatInBar === 8) {
      this.playBassDrone(now, chord.root, 0.22, 1.0);
    }
    const melodyFreq = this.triumphMelody[step % 64];
    if (melodyFreq > 0) {
      this.playLeadNote(now, melodyFreq, 0.14, 0.32);
    }
  }

  private tickZen(now: number, step: number) {
    const barIdx = Math.floor(step / 16) % 4;
    const chord = this.zenChords[barIdx];
    const beatInBar = step % 16;

    if (beatInBar === 0) {
      this.playSubPulse(now, chord.root * 0.5, 0.20, 1.8);
      chord.notes.forEach((freq) => {
        this.playPadNote(now, freq, 0.06, 2.8);
      });
    }
    const chimeFreq = this.zenChimes[step % 64];
    if (chimeFreq > 0) {
      this.playChime(now, chimeFreq, 0.11, 0.9);
    }
  }

  // --- Audio Synthesis Generator primitives ---
  private playWarDrum(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.15);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  private playCyberKick(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.09);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playSnare(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.13);
  }

  private playCyberClap(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.Q.setValueAtTime(3, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.12);
  }

  private playHiHat(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playBassDrone(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + duration);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playCyberBass(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playSubPulse(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playBrassNote(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playPadNote(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private playLeadNote(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  private playCyberArp(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + duration);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private playChime(time: number, freq: number, gainLevel: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

export const battleMusicSynth = new UniversalAudioEngine();

// ============================================================================
// 📡 Supabase Sync — Music Playlist & Audio Settings (جدول warroom_kv)
// ============================================================================
// لیست موسیقی و تنظیمات پخش به صورت ابری همگام می‌شوند تا ادمین در یک
// دستگاه لیست جدید بسازد و روی همه‌ی دستگاه‌های کاربران اعمال شود.
// در نبود Supabase، رفتار قبلی (localStorage) بدون تغییر باقی می‌ماند.
// ============================================================================
import { isSupabaseEnabled, supabase } from '../lib/supabaseData';

const musicKvTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function readLocalAudioSettings(): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem('warroom_audio_settings') || '{}') || {};
  } catch {
    return {};
  }
}

/** ذخیره‌ی حالت فعلی موسیقی (لیست + تنظیمات) در Supabase — با Debounce */
function pushMusicStateToSupabase(): void {
  if (!isSupabaseEnabled || !supabase) return;
  if (musicKvTimers.music) clearTimeout(musicKvTimers.music);
  musicKvTimers.music = setTimeout(async () => {
    try {
      const playlist = battleMusicSynth.getPlaylist();
      const localSettings = readLocalAudioSettings();
      const settings: Record<string, any> = {
        ...localSettings,
        playbackMode: battleMusicSynth.getPlaybackMode(),
        activeTrackId: battleMusicSynth.getCurrentTrack()?.id || localSettings.activeTrackId || '',
        defaultVolume: Math.round(battleMusicSynth.getVolume() * 100)
      };
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase!.from('warroom_kv').upsert({ id: 'soundtracks', value: { items: playlist } }),
        supabase!.from('warroom_kv').upsert({ id: 'audio_settings', value: settings })
      ]);
      if (e1 || e2) {
        console.warn('[WarRoom] همگام‌سازی موسیقی با Supabase ناموفق بود:', e1?.message || e2?.message);
      }
    } catch (err) {
      console.warn('[WarRoom] خطا در همگام‌سازی موسیقی با Supabase:', err);
    }
  }, 1200);
}

/** ذخیره‌ی فوری و بدون تاخیر لیست موسیقی در Supabase (جهت استفاده در پنل ادمین) */
export async function syncSoundtracksNow(playlist: SoundtrackItem[]): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;
  try {
    const localSettings = readLocalAudioSettings();
    const settings: Record<string, any> = {
      ...localSettings,
      playbackMode: battleMusicSynth.getPlaybackMode(),
      activeTrackId: battleMusicSynth.getCurrentTrack()?.id || '',
      defaultVolume: Math.round(battleMusicSynth.getVolume() * 100)
    };
    await Promise.all([
      supabase.from('warroom_kv').upsert({ id: 'soundtracks', value: { items: playlist } }),
      supabase.from('warroom_kv').upsert({ id: 'audio_settings', value: settings })
    ]);
  } catch (err) {
    console.warn('[WarRoom] همگام‌سازی فوری موسیقی با Supabase ناموفق بود:', err);
  }
}

/** بارگذاری اولیه‌ی لیست موسیقی و تنظیمات از ابر (اگر ادمین تغییری کرده باشد) */
(async () => {
  if (!isSupabaseEnabled || !supabase) return;
  try {
    const [{ data: tracksRow }, { data: settingsRow }] = await Promise.all([
      supabase.from('warroom_kv').select('value').eq('id', 'soundtracks').maybeSingle(),
      supabase.from('warroom_kv').select('value').eq('id', 'audio_settings').maybeSingle()
    ]);
    const items: SoundtrackItem[] | undefined = Array.isArray((tracksRow?.value as any)?.items)
      ? ((tracksRow!.value as any).items as SoundtrackItem[])
      : undefined;
    const remoteSettings: Record<string, any> | null = (settingsRow?.value as any) || null;

    if (Array.isArray(items)) {
      // حذف هرگونه قطعات تست قدیمی و بارگذاری لیست واقعی دریافتی از سرور
      const cleanItems = items.filter(t => t && !LEGACY_DEFAULT_IDS.has(t.id));
      battleMusicSynth.setPlaylist(cleanItems);
    } else {
      // در صورتی که در Supabase هنوز هیچ آهنگی تعریف نشده باشد، لیست خالی است
      battleMusicSynth.setPlaylist([]);
    }

    if (remoteSettings) {
      if (remoteSettings.playbackMode) {
        battleMusicSynth.setPlaybackMode(remoteSettings.playbackMode);
      }
      if (typeof remoteSettings.defaultVolume === 'number') {
        battleMusicSynth.setVolume(remoteSettings.defaultVolume / 100);
      }
      if (remoteSettings.activeTrackId) {
        battleMusicSynth.setTrack(remoteSettings.activeTrackId);
      }
    }
  } catch (err) {
    console.warn('[WarRoom] بارگذاری تنظیمات موسیقی از Supabase ناموفق بود:', err);
  }
})();
