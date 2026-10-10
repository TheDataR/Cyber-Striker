// Cyber Striker - Procedural High-Fidelity Audio & Futuristic Rock Synth Music Engine

import { WeaponClassKey } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMusicActive: boolean = false;
  private musicTimer: number | null = null;
  private currentStep: number = 0;
  private distortionCurve: Float32Array<ArrayBuffer> | null = null;

  private sfxVolume: number = 0.55; // Comfortable, relaxing, not blasting loud
  private musicVolume: number = 0.45;
  private musicMuted: boolean = false;

  private lastEdgeSoundTime: number = 0;

  constructor() {
    // Context will be lazily initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master dynamics compressor to keep audio smooth, punchy, and non-fatiguing like CS
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(compressor);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.distortionCurve = this.createDistortionCurve(45);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Set SFX Volume (0 to 1)
  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  // Set Music Volume (0 to 1)
  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx && !this.musicMuted) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMusicMute(): boolean {
    this.musicMuted = !this.musicMuted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime, 0.05);
    }
    return !this.musicMuted;
  }

  public isMuted(): boolean {
    return this.musicMuted;
  }

  // ==========================================
  // WEAPON SHOOTING SOUNDS (CS STYLE, RELAXING & SATISFYING)
  // ==========================================
  public playShoot(weapon: WeaponClassKey | 'pistol' | 'knife') {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const t = this.ctx.state === 'running' ? this.ctx.currentTime : 0;

    switch (weapon) {
      case 'ar':
        this.playAssaultRifle(t);
        break;
      case 'smg':
        this.playSubmachineGun(t);
        break;
      case 'shotgun':
        this.playShotgun(t);
        break;
      case 'sniper':
        this.playSniper(t);
        break;
      case 'knife':
        this.playKnife(t);
        break;
      default:
        this.playPistol(t);
        break;
    }
  }

  // CS-style Assault Rifle: M4/AK balanced thwack + warm chest thump + mechanical cycle
  private playAssaultRifle(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    // 1. Low punch (warm, damped bass thump ~95Hz -> 45Hz)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    oscGain.gain.setValueAtTime(0.38, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);

    // 2. Mid mechanical snap (filtered noise transient, crisp but soft)
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.018));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.Q.value = 1.6;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // 3. Subtle CS bolt mechanical clink (delayed 35ms)
    const bolt = this.ctx.createOscillator();
    const boltGain = this.ctx.createGain();
    bolt.type = 'triangle';
    bolt.frequency.setValueAtTime(740, t + 0.035);
    bolt.frequency.exponentialRampToValueAtTime(480, t + 0.065);
    boltGain.gain.setValueAtTime(0, t);
    boltGain.gain.setValueAtTime(0.06, t + 0.035);
    boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    bolt.connect(boltGain);
    boltGain.connect(this.sfxGain);
    bolt.start(t + 0.035);
    bolt.stop(t + 0.075);
  }

  // CS-style Submachine Gun (Vector / UMP): Rapid, lighter suppressed pop, soft & satisfying
  private playSubmachineGun(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.075);
    oscGain.gain.setValueAtTime(0.32, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.085);

    // Tight click
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1850, t);
    click.frequency.exponentialRampToValueAtTime(600, t + 0.04);
    clickGain.gain.setValueAtTime(0.18, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    click.connect(clickGain);
    clickGain.connect(this.sfxGain);
    click.start(t);
    click.stop(t + 0.05);
  }

  // CS-style Combat Shotgun: Deep double-impact bass thud + mechanical pump slide
  private playShotgun(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    // Heavy low punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.16);
    oscGain.gain.setValueAtTime(0.48, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);

    // Blast noise body
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // Satisfying mechanical pump rack sound (delayed ~110ms)
    const pump = this.ctx.createOscillator();
    const pumpGain = this.ctx.createGain();
    pump.type = 'triangle';
    pump.frequency.setValueAtTime(420, t + 0.11);
    pump.frequency.linearRampToValueAtTime(680, t + 0.14);
    pumpGain.gain.setValueAtTime(0, t);
    pumpGain.gain.setValueAtTime(0.12, t + 0.11);
    pumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    pump.connect(pumpGain);
    pumpGain.connect(this.sfxGain);
    pump.start(t + 0.11);
    pump.stop(t + 0.17);
  }

  // CS-style Sniper Rifle (AWP): Supersonic snap + reverberant deep body + metallic bolt echo
  private playSniper(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    // 1. Supersonic crack transient
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(2200, t);
    snap.frequency.exponentialRampToValueAtTime(280, t + 0.04);
    snapGain.gain.setValueAtTime(0.36, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    snap.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snap.start(t);
    snap.stop(t + 0.06);

    // 2. Deep sub body
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.24);
    subGain.gain.setValueAtTime(0.48, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.25);

    // 3. Metallic bolt cycle click (delayed 140ms)
    const bolt = this.ctx.createOscillator();
    const boltGain = this.ctx.createGain();
    bolt.type = 'sine';
    bolt.frequency.setValueAtTime(1450, t + 0.14);
    bolt.frequency.exponentialRampToValueAtTime(880, t + 0.19);
    boltGain.gain.setValueAtTime(0, t);
    boltGain.gain.setValueAtTime(0.09, t + 0.14);
    boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    bolt.connect(boltGain);
    boltGain.connect(this.sfxGain);
    bolt.start(t + 0.14);
    bolt.stop(t + 0.22);
  }

  // CS-style Pistol: Suppressed USP tap
  private playPistol(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    oscGain.gain.setValueAtTime(0.32, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // CS Knife swipe
  private playKnife(t: number) {
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.09);
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ==========================================
  // HITMARKER SOUNDS (CS DINK & SATISFYING CONFIRMATION)
  // ==========================================
  public playHitmarker(isHeadshot: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // Iconic CS Headshot "Dink": crystal clear dual metallic bell chime
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1980, t);
      osc1.frequency.exponentialRampToValueAtTime(1920, t + 0.14);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(3450, t);
      osc2.frequency.exponentialRampToValueAtTime(3200, t + 0.14);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.16);
      osc2.stop(t + 0.16);
    } else {
      // CS Body hit tick: clean, satisfying acoustic "thock"
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.055);
    }
  }

  // CS-style Kill Confirmation sound
  public playKillConfirm() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587, t); // D5
    osc1.frequency.setValueAtTime(880, t + 0.06); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(293, t);
    osc2.frequency.setValueAtTime(440, t + 0.06);

    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }

  // Edge barrier collision / proximity sizzle
  public playEdgeBarrier() {
    const now = performance.now();
    if (now - this.lastEdgeSoundTime < 320) return;
    this.lastEdgeSoundTime = now;

    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(380, t + 0.08);
    osc.frequency.linearRampToValueAtTime(80, t + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // ==========================================
  // PROCEDURAL FUTURISTIC ROCK MENU MUSIC (CS TACTICAL ROCK STYLE)
  // ==========================================
  // Heavy driving beat at 130 BPM with distorted synth-guitar power chords,
  // punchy cyber rock kick/snare, and high-tech 16th-note arpeggiator!
  public startMenuMusic() {
    this.initContext();
    if (this.isMusicActive) return;
    this.isMusicActive = true;
    this.currentStep = 0;

    const tempoBpm = 130;
    const stepDurationMs = (60000 / tempoBpm) / 4; // 16th note steps

    this.musicTimer = window.setInterval(() => {
      this.playMusicStep(this.currentStep);
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar rock loop
    }, stepDurationMs);
  }

  public stopMenuMusic() {
    this.isMusicActive = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public isMusicRunning(): boolean {
    return this.isMusicActive && !this.musicMuted;
  }

  private playMusicStep(step: number) {
    if (!this.ctx || !this.musicGain || this.musicMuted) return;
    const t = this.ctx.currentTime;

    const stepInBeat = step % 4;
    const beatInBar = Math.floor((step % 16) / 4);
    const bar = Math.floor(step / 16);

    // 1. DRUMS (Kick, Snare, Hi-hats)
    // Kick drum: on beats 1 and 3, plus syncopated 16th in rock groove
    const isKick = (stepInBeat === 0 && (beatInBar === 0 || beatInBar === 2)) || (beatInBar === 3 && stepInBeat === 2);
    if (isKick) {
      this.synthRockKick(t);
    }

    // Snare drum: on beats 2 and 4
    const isSnare = stepInBeat === 0 && (beatInBar === 1 || beatInBar === 3);
    if (isSnare) {
      this.synthRockSnare(t);
    }

    // Hi-hats: steady 16th note drive
    if (step % 2 === 0) {
      this.synthRockHiHat(t, stepInBeat === 0);
    }

    // 2. FUTURISTIC ROCK DISTORTED GUITAR RIFF
    // Rock Riff progression (D - F - G - G# - G - F pattern)
    // Bar 0: D power chord riff
    // Bar 1: F -> G transition
    // Bar 2: G# -> G cyber tension
    // Bar 3: D resolution with rhythmic drive
    const chordNotesByBar = [
      [73.42, 110.0, 146.83], // D2, A2, D3 power chord
      [87.31, 130.81, 174.61], // F2, C3, F3
      [98.0, 146.83, 196.0],  // G2, D3, G3
      [73.42, 110.0, 146.83]  // D2, A2, D3
    ];

    // Guitar hits on rhythmic syncopations
    const isGuitarHit = stepInBeat === 0 || (beatInBar === 2 && stepInBeat === 2);
    if (isGuitarHit) {
      const chord = chordNotesByBar[bar % 4];
      const isAccented = beatInBar === 0 && stepInBeat === 0;
      this.synthDistortedGuitar(t, chord, isAccented ? 0.35 : 0.22);
    }

    // 3. CYBER ARPEGGIATOR (Futuristic Counter-Strike electronic layer)
    const arpeggioNotes = [293.66, 349.23, 440.0, 523.25, 587.33, 698.46, 880.0]; // D minor pentatonic scale
    const arpIdx = (step * 3) % arpeggioNotes.length;
    this.synthCyberArp(t, arpeggioNotes[arpIdx]);
  }

  // Procedural Rock Kick
  private synthRockKick(t: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Procedural Rock Snare
  private synthRockSnare(t: number) {
    if (!this.ctx || !this.musicGain) return;

    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.11);

    // Snare wires (noise burst)
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);
    noise.start(t);
  }

  // Procedural Hi-hat
  private synthRockHiHat(t: number, isAccent: boolean) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.008));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.14 : 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }

  // Procedural Distorted Cyber Guitar (with wave-shaper distortion & cabinet filter)
  private synthDistortedGuitar(t: number, frequencies: number[], durationGain: number) {
    if (!this.ctx || !this.musicGain) return;

    const guitarNode = this.ctx.createGain();
    const distortion = this.ctx.createWaveShaper();
    if (this.distortionCurve) {
      distortion.curve = this.distortionCurve;
    }
    distortion.oversample = '2x';

    // Guitar Amp Cabinet Filter (lowpass around 3200Hz to eliminate harsh fizz)
    const cabFilter = this.ctx.createBiquadFilter();
    cabFilter.type = 'lowpass';
    cabFilter.frequency.setValueAtTime(3200, t);
    cabFilter.Q.value = 1.2;

    const masterNoteGain = this.ctx.createGain();
    masterNoteGain.gain.setValueAtTime(durationGain, t);
    masterNoteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    for (const freq of frequencies) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      // Slight chorus detune
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t);
      osc.connect(distortion);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    distortion.connect(cabFilter);
    cabFilter.connect(masterNoteGain);
    masterNoteGain.connect(this.musicGain);
  }

  // High-Tech Cyber Arpeggio (CS Danger Zone style electronics)
  private synthCyberArp(t: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.value = 2.0;

    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }
}

export const soundManager = new SoundEngine();
