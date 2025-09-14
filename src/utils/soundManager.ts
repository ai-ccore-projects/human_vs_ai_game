// Sound Manager for Web Audio API

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private musicSource: AudioBufferSourceNode | null = null;
  private enabled = true;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.enabled = false;
    }
  }

  // Load a sound from a URL
  async loadSound(name: string, url: string): Promise<void> {
    if (!this.audioContext || this.sounds.has(name)) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound: ${name}`, error);
    }
  }

  // Generate sound effects programmatically
  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
      }

      // Apply envelope (fade in/out)
      const envelope = Math.min(1, t * 10) * Math.min(1, (duration - t) * 10);
      data[i] = sample * envelope * 0.3; // Volume control
    }

    return buffer;
  }

  // Initialize all game sounds
  async initializeSounds(): Promise<void> {
    if (!this.audioContext || !this.enabled) return;

    console.log('🔊 Initializing sounds...');

    // Load sounds from files
    await this.loadSound('backgroundMusic', '/sounds/background.mp3');
    await this.loadSound('correct', '/sounds/correct.mp3');
    await this.loadSound('wrong', '/sounds/wrong.mp3');
    await this.loadSound('click', '/sounds/click.mp3');


    // Generate arcade-style sound effects for fallback
    const soundDefinitions = {
      correct: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
      wrong: { freq: 200, duration: 0.5, type: 'sawtooth' as OscillatorType },
      combo: { freq: 1200, duration: 0.3, type: 'triangle' as OscillatorType },
      gameStart: { freq: 600, duration: 0.4, type: 'square' as OscillatorType },
      gameOver: { freq: 150, duration: 1.0, type: 'sawtooth' as OscillatorType },
      heartLost: { freq: 300, duration: 0.6, type: 'triangle' as OscillatorType },
      highScore: { freq: 1000, duration: 0.8, type: 'sine' as OscillatorType },
      buttonHover: { freq: 400, duration: 0.1, type: 'square' as OscillatorType },
      tick: { freq: 500, duration: 0.05, type: 'square' as OscillatorType }
    };

    for (const [name, config] of Object.entries(soundDefinitions)) {
      if (!this.sounds.has(name)) {
        const buffer = this.generateTone(config.freq, config.duration, config.type);
        if (buffer) {
          this.sounds.set(name, buffer);
        }
      }
    }

    console.log(`✅ Loaded ${this.sounds.size} sounds`);
  }

  // Play a sound effect
  playSound(soundName: string, volume = 1.0): void {
    if (!this.audioContext || !this.enabled) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  // Play background music
  playMusic(soundName: string, volume = 0.3): void {
    if (!this.audioContext || !this.enabled) return;
    this.stopMusic(); // Stop any currently playing music

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Music '${soundName}' not found`);
      return;
    }

    try {
      this.musicSource = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      this.musicSource.buffer = buffer;
      this.musicSource.loop = true;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      this.musicSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      this.musicSource.start();
    } catch (error) {
      console.error('Error playing music:', error);
    }
  }

  // Stop background music
  stopMusic(): void {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource = null;
    }
  }

  // Play combo sound with increasing pitch
  playComboSound(comboCount: number): void {
    if (!this.audioContext || !this.enabled) return;

    const baseFreq = 800;
    const freq = baseFreq + (comboCount * 100);
    const buffer = this.generateTone(freq, 0.2, 'sine');
    
    if (buffer) {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = Math.min(1.0, 0.3 + (comboCount * 0.1));
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    }
  }

  // Resume audio context (required for user interaction)
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Toggle sound on/off
  toggleSound(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Check if sound is enabled
  isEnabled(): boolean {
    return this.enabled;
  }
}
