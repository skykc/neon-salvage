// Neon Salvage — synthesized sound effects, no audio files.
// Everything is built with OscillatorNode / a tiny noise buffer, so the game
// ships zero audio assets. Safe to call before any user gesture: the context
// is created lazily and every effect no-ops when audio is unavailable.

export function createAudio() {
  return {
    ctx: null,
    master: null,
    noiseBuf: null,
    muted: false,
  };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.22;
    audio.master.connect(audio.ctx.destination);
    const len = audio.ctx.sampleRate * 0.5;
    audio.noiseBuf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = audio.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    audio.ctx = null;
  }
}

function tone(audio, freq0, freq1, dur, type, vol, when = 0) {
  if (!audio.ctx || !audio.master || audio.muted) return;
  const t0 = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq0, t0);
  if (freq1 !== freq0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(audio.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(audio, dur, vol, filterFreq) {
  if (!audio.ctx || !audio.master || !audio.noiseBuf || audio.muted) return;
  const t0 = audio.ctx.currentTime;
  const src = audio.ctx.createBufferSource();
  src.buffer = audio.noiseBuf;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = audio.ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(audio.master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export function sfxShoot(audio) {
  tone(audio, 880, 320, 0.09, 'square', 0.16);
}

export function sfxEnemyShoot(audio) {
  tone(audio, 320, 180, 0.12, 'sawtooth', 0.1);
}

export function sfxExplosion(audio, big) {
  noise(audio, big ? 0.55 : 0.3, big ? 0.5 : 0.3, big ? 900 : 1600);
  tone(audio, big ? 160 : 220, 40, big ? 0.5 : 0.3, 'sine', 0.4);
}

export function sfxPickup(audio) {
  tone(audio, 660, 660, 0.07, 'sine', 0.22);
  tone(audio, 990, 990, 0.09, 'sine', 0.22, 0.06);
}

export function sfxHit(audio) {
  noise(audio, 0.25, 0.4, 700);
  tone(audio, 200, 60, 0.25, 'sawtooth', 0.3);
}

export function sfxDash(audio) {
  noise(audio, 0.18, 0.18, 3200);
}

export function sfxWave(audio) {
  tone(audio, 440, 440, 0.1, 'triangle', 0.22);
  tone(audio, 554, 554, 0.1, 'triangle', 0.22, 0.09);
  tone(audio, 659, 659, 0.16, 'triangle', 0.22, 0.18);
}

export function sfxLife(audio) {
  tone(audio, 523, 523, 0.1, 'sine', 0.22);
  tone(audio, 659, 659, 0.1, 'sine', 0.22, 0.09);
  tone(audio, 784, 784, 0.18, 'sine', 0.22, 0.18);
}

export function sfxVictory(audio) {
  [523, 659, 784, 1047].forEach((f, i) => tone(audio, f, f, 0.22, 'triangle', 0.22, i * 0.12));
}

export function sfxGameOver(audio) {
  [392, 330, 262, 196].forEach((f, i) => tone(audio, f, f * 0.9, 0.3, 'sawtooth', 0.18, i * 0.16));
}
