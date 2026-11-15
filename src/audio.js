// All sound is synthesised with WebAudio – no audio files.
export class AudioSys {
  constructor() { this.ctx = null; this.on = false; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC(); this.on = true;
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); this.master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    const loop = (type, freq, q, gain) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return { g, f };
    };
    this.fall = loop('lowpass', 1100, 0.3, 0); this.river = loop('bandpass', 500, 0.6, 0); this.wind = loop('lowpass', 320, 0.4, 0.05);
    this.fire = loop('bandpass', 900, 0.8, 0);
    // flies
    { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 196; const l = ctx.createOscillator(); l.frequency.value = 31; const lg = ctx.createGain(); lg.gain.value = 26; l.connect(lg); lg.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2; const g = ctx.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.master); o.start(); l.start(); this.buzz = g; }
    // crickets
    { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 4300; const am = ctx.createGain(); am.gain.value = 0; const l = ctx.createOscillator(); l.type = 'square'; l.frequency.value = 38; const lg = ctx.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(am.gain);
      const g = ctx.createGain(); g.gain.value = 0; o.connect(am); am.connect(g); g.connect(this.master); o.start(); l.start(); this.crickets = g; }
    // music bus (kalimba melody, soft pad, bass and a little hand percussion – all synthesised)
    this.musicF = ctx.createBiquadFilter(); this.musicF.type = 'lowpass'; this.musicF.frequency.value = 9000;
    this.musicG = ctx.createGain(); this.musicG.gain.value = 0; this.musicF.connect(this.musicG); this.musicG.connect(this.master);
    this.musicOn = true; this.mStep = 0; this.nextT = ctx.currentTime + 0.6; this.mood = { tunnel: 0, night: 0, win: 0 };
    this.birdT = 1; this.stepT = 0;
  }
  env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = c.createGain(); this.env(g, t, 0.01, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  burst(freq, q, dur, vol, type = 'bandpass', delay = 0, slide = 0) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain(); this.env(g, t, 0.005, vol, dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  step(wood) { if (wood) { this.burst(380 + Math.random() * 120, 3, 0.09, 0.22); this.tone(120 + Math.random() * 30, 0.07, 'sine', 0.12); } else this.burst(900 + Math.random() * 500, 0.8, 0.06, 0.08, 'bandpass'); }
  jump() { this.burst(600, 1, 0.12, 0.1, 'bandpass', 0, 2); }
  land() { this.burst(220, 1, 0.12, 0.2, 'lowpass'); }
  creak() { const f = 180 + Math.random() * 160; this.tone(f, 0.35 + Math.random() * 0.3, 'sawtooth', 0.045, 0.75 + Math.random() * 0.6); this.burst(f * 4, 6, 0.3, 0.03); }
  snap() { this.burst(1800, 0.6, 0.18, 0.7, 'highpass'); this.burst(300, 1, 0.5, 0.6, 'lowpass'); this.tone(90, 0.5, 'sawtooth', 0.3, 0.4); for (let i = 0; i < 6; i++) this.burst(1200 + Math.random() * 1500, 2, 0.08, 0.35, 'bandpass', 0.08 + i * 0.075); }
  crack() { this.burst(700, 1, 0.25, 0.4, 'bandpass', 0, 0.5); this.burst(2500, 1, 0.1, 0.25, 'highpass'); }
  rubble() { for (let i = 0; i < 5; i++) this.burst(200 + Math.random() * 300, 1, 0.25, 0.3, 'lowpass', i * 0.09); }
  splash(v = 0.4) { this.burst(1400, 0.5, 0.55, v, 'bandpass', 0, 0.4); this.burst(300, 0.7, 0.4, v * 0.8, 'lowpass'); }
  bark(p = 1) { for (const dl of [0, 0.19]) { this.tone(420 * p, 0.13, 'sawtooth', 0.22, 0.55, dl); this.tone(640 * p, 0.1, 'square', 0.08, 0.6, dl); this.burst(900 * p, 2, 0.1, 0.18, 'bandpass', dl); } }
  yip(p = 1.9) { this.tone(520 * p, 0.09, 'sawtooth', 0.1, 0.7); this.burst(1500 * p, 3, 0.07, 0.07, 'bandpass'); }
  pickup(kind) {
    const notes = kind === 'sock' ? [392, 370, 311, 233] : kind === 'mirror' ? [659, 880, 1108, 1318, 1760] : [523, 659, 784, 1047];
    notes.forEach((n, i) => { this.tone(n, 0.5, kind === 'sock' ? 'square' : 'triangle', kind === 'sock' ? 0.07 : 0.16, 0, i * 0.09); this.tone(n * 2, 0.4, 'sine', 0.06, 0, i * 0.09); });
  }
  placeChime() { [392, 523, 659].forEach((n, i) => { this.tone(n, 1.6, 'triangle', 0.07, 0, i * 0.12); this.tone(n * 2, 1.2, 'sine', 0.03, 0, i * 0.12); }); }
  chime(i) { const n = [523, 587, 659, 784, 880][i] || 880; this.tone(n, 1.2, 'triangle', 0.2); this.tone(n * 2, 1.0, 'sine', 0.1); this.tone(n * 3, 0.6, 'sine', 0.04); }
  ignite() { this.burst(500, 0.7, 0.5, 0.3, 'bandpass', 0, 3); }
  rumble(dur) { this.burst(70, 0.7, dur, 0.9, 'lowpass'); this.burst(160, 1, dur, 0.4, 'bandpass'); this.tone(41, dur, 'sawtooth', 0.25); }
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1318].forEach((n, i) => { this.tone(n, 0.6, 'triangle', 0.18, 0, i * 0.16); this.tone(n / 2, 0.6, 'sine', 0.1, 0, i * 0.16); }); }
  night() { [392, 330, 262, 196].forEach((n, i) => this.tone(n, 1.2, 'triangle', 0.14, 0, i * 0.35)); }
  // ---------------------------------------------------------------- music
  // "Łatka's theme": 8 bars in A minor (Am F C G | Am F G Em), 8 steps per bar. '.' is a rest.
  static M = {
    chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    bass: [45, 41, 48, 43, 45, 41, 43, 40],
    tuneA: [[69, 0, 72, 76, 0, 74, 72, 0], [69, 0, 72, 77, 0, 76, 72, 0], [67, 0, 72, 76, 79, 0, 76, 0], [74, 0, 71, 74, 0, 67, 71, 0],
      [69, 72, 76, 81, 0, 79, 76, 0], [77, 0, 76, 72, 69, 0, 72, 0], [74, 0, 79, 0, 71, 74, 0, 0], [76, 0, 0, 71, 0, 67, 0, 0]],
    tuneB: [[76, 0, 0, 72, 0, 69, 0, 0], [77, 0, 0, 72, 0, 69, 0, 0], [79, 0, 76, 0, 72, 0, 67, 0], [74, 0, 0, 71, 0, 67, 0, 0],
      [81, 0, 79, 76, 0, 72, 0, 0], [77, 0, 0, 81, 0, 77, 72, 0], [79, 0, 74, 0, 71, 0, 74, 0], [76, 0, 0, 0, 71, 0, 0, 0]],
  };
  mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  mPluck(t, n, vol) {                       // kalimba / marimba
    const c = this.ctx, f = this.mf(n), g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); g.connect(this.musicF);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.95);
    const g2 = c.createGain(); g2.gain.setValueAtTime(vol * 0.45, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); g2.connect(this.musicF);
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4.02; o2.connect(g2); o2.start(t); o2.stop(t + 0.15);
  }
  mPad(t, notes, dur, vol) {                // warm chord swell
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(g); g.connect(this.musicF);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.15);
    for (const n of notes) for (const d of [-7, 7]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(n); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur * 1.2); }
  }
  mBass(t, n, dur, vol) {
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); g.connect(this.musicF);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = this.mf(n); o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
  mDrum(t, vol) {                           // soft hand drum
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); g.connect(this.musicF);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.18); o.connect(g); o.start(t); o.stop(t + 0.25);
  }
  mShake(t, vol) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5500;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); src.connect(f); f.connect(g); g.connect(this.musicF); src.start(t, Math.random()); src.stop(t + 0.1);
  }
  toggleMusic() { this.musicOn = !this.musicOn; return this.musicOn; }
  music(s) {
    const c = this.ctx, now = c.currentTime, M = AudioSys.M;
    this.musicG.gain.setTargetAtTime(this.musicOn && !s.lost ? 0.55 * (1 - s.tunnel * 0.35) : 0, now, 0.4);
    this.musicF.frequency.setTargetAtTime(9000 - 8100 * s.tunnel, now, 0.5);          // muffled, echoey in the tunnel
    if (this.nextT < now - 0.5) this.nextT = now + 0.05;                               // tab was asleep: don't burst-play the backlog
    const stepDur = 60 / (s.win ? 104 : 92 - 12 * s.night) / 2;                        // calmer as night falls, livelier once the puppies are out
    while (this.nextT < now + 0.25) {
      const t = this.nextT, st = this.mStep % 8, bar = Math.floor(this.mStep / 8) % 8, pass = Math.floor(this.mStep / 64) % 4, quiet = s.tunnel > 0.5;
      if (st === 0) { this.mPad(t, M.chords[bar], stepDur * 8, 0.035); this.mBass(t, M.bass[bar], stepDur * 3.5, quiet ? 0.1 : 0.16); }
      if (st === 4 && !quiet) this.mBass(t, M.bass[bar] + 7, stepDur * 2, 0.09);
      const n = (pass === 2 ? M.tuneB : M.tuneA)[bar][st];
      if (n && pass !== 0 || n && bar >= 4) this.mPluck(t, n + (s.win ? 12 : 0) - (quiet ? 12 : 0), quiet ? 0.07 : 0.13);
      else if (!n || pass === 0) { if (st % 2 === 1) this.mPluck(t, M.chords[bar][(st >> 1) % 3] + 12, 0.045); }   // gentle arpeggio in the gaps / intro
      if (pass === 3 && st % 2 === 0) this.mPluck(t, M.chords[bar][(st >> 1) % 3], 0.04);                          // lower counter-line on the last pass
      if (!quiet && s.night < 0.75) { if (st === 0 || st === 3 || st === 6) this.mDrum(t, st === 0 ? 0.16 : 0.09); if (st % 2 === 1) this.mShake(t, 0.035); }
      this.nextT += stepDur; this.mStep++;
    }
  }
  // continuous ambience; d* are distances / levels supplied by the game
  update(dt, s) {
    if (!this.on) return; const c = this.ctx, t = c.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.15);
    const tun = s.tunnel;
    this.music(s);
    set(this.fall.g, 0.5 / (1 + (s.dFall / 45) ** 2) * (1 - tun * 0.85));
    set(this.river.g, 0.12 / (1 + (s.dRiver / 30) ** 2) * (1 - tun * 0.9));
    set(this.wind.g, 0.05 * (1 - tun) + tun * 0.02); this.wind.f.frequency.setTargetAtTime(320 + Math.sin(t * 0.3) * 120 - tun * 200, t, 0.3);
    set(this.buzz, 0.05 / (1 + (s.dSock / 5) ** 2));
    set(this.crickets, 0.022 * s.night * (1 - tun));
    set(this.fire.g, 0.14 / (1 + (s.dFire / 7) ** 2));
    this.birdT -= dt;
    if (this.birdT <= 0 && tun < 0.5) {
      this.birdT = 0.8 + Math.random() * 3.5 + s.night * 5;
      const base = 1800 + Math.random() * 2200, n = 1 + Math.floor(Math.random() * 4), v = 0.035 * (1 - s.night * 0.8);
      for (let i = 0; i < n; i++) this.tone(base * (1 + Math.random() * 0.2), 0.09 + Math.random() * 0.08, 'sine', v, Math.random() < 0.5 ? 1.35 : 0.72, i * 0.14);
    }
    if (s.onBridge && s.moving && Math.random() < dt * 1.6) this.creak();
    if (s.stepRate > 0) { this.stepT -= dt * s.stepRate; if (this.stepT <= 0) { this.stepT = 1; this.step(s.onBridge); } }
  }
}
