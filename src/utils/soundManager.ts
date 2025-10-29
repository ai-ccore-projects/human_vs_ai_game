// src/utils/SoundManager.ts
// Web Audio manager (SSR-safe, lazy initialization, singleton helper)

const isBrowser = typeof window !== 'undefined';

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private musicSource: AudioBufferSourceNode | null = null;
  private enabled = true;

  // Do NOT touch Web APIs here (keeps SSR safe)
  constructor() {}

  // ================= Internal =================

  /** Create AudioContext on demand (client only). */
  private ensureAudioContext(): void {
    if (!isBrowser || !this.enabled) return;
    if (this.audioContext) return;

    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) {
      console.warn('Web Audio API not available on this platform.');
      this.enabled = false;
      return;
    }
    try {
      this.audioContext = new Ctx();
    } catch (error) {
      console.warn('Failed to create AudioContext:', error);
      this.enabled = false;
      this.audioContext = null;
    }
  }

  /** Back-compat shim (if old code still calls initializeAudioContext). */
  public initializeAudioContext(): void {
    this.ensureAudioContext();
  }

  // ================= Public: lifecycle =================

  /** Call from a user gesture (click/tap) to reliably unlock audio on Safari/iOS. */
  public unlock(): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx) return;

    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      src.stop(0);
    } catch {
      /* ignore */
    }
  }

  /** Resume a suspended context (some browsers suspend until interaction). */
  public async resumeAudioContext(): Promise<void> {
    this.ensureAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try { await this.audioContext.resume(); } catch { /* ignore */ }
    }
  }

  /** Toggle sound on/off. Returns the resulting state. */
  public toggleSound(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public get hasContext(): boolean {
    return !!this.audioContext && this.enabled;
  }

  // ================= Loading & generation =================

  /** Load a sound file into an AudioBuffer (no-ops on SSR). */
  public async loadSound(name: string, url: string): Promise<void> {
    this.ensureAudioContext();
    if (!this.audioContext || !this.enabled || this.sounds.has(name)) return;

    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await this.audioContext.decodeAudioData(arr);
      this.sounds.set(name, buf);
    } catch (error) {
      console.error(`Failed to load sound '${name}' from ${url}`, error);
    }
  }

  /** Generate a simple tone (fallback SFX). */
  private generateTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): AudioBuffer | null {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx) return null;

    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'sine':     sample = Math.sin(2 * Math.PI * frequency * t); break;
        case 'square':   sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1; break;
        case 'sawtooth': sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5)); break;
        case 'triangle': sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1; break;
      }

      // Simple attack/release envelope to avoid clicks
      const attack = Math.min(0.02, duration * 0.2);
      const release = Math.min(0.05, duration * 0.3);
      const env =
        t < attack
          ? t / attack
          : t > duration - release
            ? Math.max(0, (duration - t) / release)
            : 1;

      data[i] = sample * env * 0.3; // master gain
    }

    return buffer;
  }

  /** Initialize common game sounds (files + generated fallbacks). */
  public async initializeSounds(): Promise<void> {
    this.ensureAudioContext();
    if (!this.audioContext || !this.enabled) return;

    // File-based (optional; they’ll no-op on SSR)
    await this.loadSound('backgroundMusic', '/sounds/background.mp3');
    await this.loadSound('correct',         '/sounds/correct.mp3');
    await this.loadSound('wrong',           '/sounds/wrong.mp3');
    await this.loadSound('click',           '/sounds/click.mp3');

    // Generated fallbacks if not present yet
    const defs = {
      correct:     { freq: 800,  duration: 0.2, type: 'sine'     as OscillatorType },
      wrong:       { freq: 200,  duration: 0.5, type: 'sawtooth' as OscillatorType },
      combo:       { freq: 1200, duration: 0.3, type: 'triangle' as OscillatorType },
      gameStart:   { freq: 600,  duration: 0.4, type: 'square'   as OscillatorType },
      gameOver:    { freq: 150,  duration: 1.0, type: 'sawtooth' as OscillatorType },
      heartLost:   { freq: 300,  duration: 0.6, type: 'triangle' as OscillatorType },
      highScore:   { freq: 1000, duration: 0.8, type: 'sine'     as OscillatorType },
      buttonHover: { freq: 400,  duration: 0.1, type: 'square'   as OscillatorType },
      tick:        { freq: 500,  duration: 0.05, type: 'square'  as OscillatorType },
    };

    for (const [name, cfg] of Object.entries(defs)) {
      if (!this.sounds.has(name)) {
        const buf = this.generateTone(cfg.freq, cfg.duration, cfg.type);
        if (buf) this.sounds.set(name, buf);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Sounds ready: ${this.sounds.size} buffers`);
  }

  // ================= Playback =================

  /** Play a short SFX by name. */
  public playSound(soundName: string, volume = 1.0): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx || !this.enabled) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      src.connect(gain).connect(ctx.destination);
      src.start();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  /** Start looping background music by buffer name. */
  public playMusic(soundName: string, volume = 0.3): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx || !this.enabled) return;

    this.stopMusic();

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Music '${soundName}' not found`);
      return;
    }

    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      src.loop = true;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      src.connect(gain).connect(ctx.destination);
      src.start();
      this.musicSource = src;
    } catch (error) {
      console.error('Error playing music:', error);
    }
  }

  /** Stop background music if playing. */
  public stopMusic(): void {
    try {
      this.musicSource?.stop();
    } catch {
      /* ignore */
    } finally {
      this.musicSource = null;
    }
  }

  /** Play a combo chirp whose pitch scales with the combo count. */
  public playComboSound(comboCount: number): void {
    this.ensureAudioContext();
    const ctx = this.audioContext;
    if (!ctx || !this.enabled) return;

    const baseFreq = 800;
    const freq = baseFreq + comboCount * 100;
    const buffer = this.generateTone(freq, 0.2, 'sine');
    if (!buffer) return;

    try {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buffer;
      gain.gain.value = Math.min(1.0, 0.3 + comboCount * 0.1);
      src.connect(gain).connect(ctx.destination);
      src.start();
    } catch (error) {
      console.error('Error playing combo sound:', error);
    }
  }

  /** Stop all audio (music + any transient SFX will end naturally). */
  public stopAll(): void {
    this.stopMusic();
  }
}

// =============== Lazy singleton (recommended usage) ===============

let _soundSingleton: SoundManager | null = null;

/** Get a shared SoundManager without touching Web APIs at import time. */
export function getSound(): SoundManager {
  if (!_soundSingleton) _soundSingleton = new SoundManager();
  return _soundSingleton;
}
