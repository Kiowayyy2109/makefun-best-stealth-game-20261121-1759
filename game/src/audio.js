// Nightshade — synthesised sound. One job: every sound is built with WebAudio, no audio files.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._ambience = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._startAmbience();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _startAmbience() {
    // A low, slow drone: two detuned sines through a quiet gain, looping forever.
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(ctx.destination);
    for (const freq of [55, 55.7, 110.3]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    this._ambience = gain;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.08;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
  }

  footstep(sneak) { this._noise(0.07, sneak ? 0.02 : 0.05, sneak ? 400 : 700); }
  guardStep() { this._noise(0.06, 0.035, 500); }
  pickup() { this._tone(660, 0.12, 'sine', 0.14); setTimeout(() => this._tone(990, 0.18, 'sine', 0.14), 90); }
  alert() { this._tone(220, 0.35, 'sawtooth', 0.10, 440); setTimeout(() => this._tone(440, 0.3, 'sawtooth', 0.08, 330), 120); }
  spotted() { this._tone(880, 0.1, 'square', 0.07, 660); }
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.12), i * 130)); }
  lose() { this._tone(196, 0.7, 'sawtooth', 0.09, 98); }
  click() { this._tone(520, 0.06, 'triangle', 0.08); }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
