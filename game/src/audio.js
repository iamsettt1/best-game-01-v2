// audio.js — WebAudio-synthesized sound effects and a looping synth
// pattern for STARFALL ARENA. No audio files: every sound is built from
// oscillators and noise buffers at runtime.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let started = false;

  function ensureContext() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, volume, slideTo, destination) {
    if (!ensureContext() || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(destination || master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, volume, filterFreq) {
    if (!ensureContext() || muted) return;
    const now = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.start(now);
  }

  const BASS_LINE = [55, 55, 82.4, 55, 55, 98, 73.4, 65.4];
  const ARP_LINE = [220, 277, 330, 440, 330, 277, 220, 165];

  return {
    unlock() {
      if (!ensureContext()) return;
      if (ctx.state === 'suspended') ctx.resume();
      started = true;
    },
    get muted() { return muted; },
    get started() { return started; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    shoot() { tone(880 + Math.random() * 120, 0.07, 'square', 0.08, 320); },
    enemyShoot() { tone(340, 0.1, 'sawtooth', 0.05, 180); },
    hit() { tone(200, 0.06, 'square', 0.1, 90); },
    playerHit() { tone(140, 0.22, 'sawtooth', 0.22, 50); noiseBurst(0.18, 0.2, 900); },
    explosion(big) {
      noiseBurst(big ? 0.5 : 0.25, big ? 0.4 : 0.22, big ? 500 : 800);
      tone(big ? 90 : 130, big ? 0.45 : 0.25, 'triangle', 0.3, 30);
    },
    pickup() { tone(660, 0.08, 'sine', 0.14, 990); tone(990, 0.1, 'sine', 0.1, 1320); },
    dash() { noiseBurst(0.14, 0.12, 2400); tone(300, 0.14, 'sine', 0.08, 700); },
    levelUp() {
      tone(523, 0.12, 'triangle', 0.18);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.18), 90);
      setTimeout(() => tone(784, 0.2, 'triangle', 0.2), 180);
    },
    gameOver() {
      tone(392, 0.3, 'triangle', 0.2, 380);
      setTimeout(() => tone(311, 0.3, 'triangle', 0.2, 300), 220);
      setTimeout(() => tone(262, 0.6, 'triangle', 0.22, 130), 440);
    },
    victory() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.28, 'triangle', 0.2), i * 140));
    },
    updateMusic(dt, playing) {
      if (!ctx || muted || !playing) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer = 0.21;
      const step = musicStep % 8;
      tone(BASS_LINE[step], 0.2, 'triangle', 0.5, null, musicGain);
      if (musicStep % 2 === 0) tone(ARP_LINE[step], 0.16, 'sine', 0.35, null, musicGain);
      musicStep++;
    },
  };
}
