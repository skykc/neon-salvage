// Neon Salvage — shared constants, palette and helpers.
// Pure module: no DOM access here, so the simulation can be tested headless.

export const W = 960;
export const H = 640;

export const COLORS = {
  bg0: '#050510',
  bg1: '#0b1030',
  nebulaA: '#1b0f3d',
  nebulaB: '#04263d',
  ship: '#37f6ff',
  shipDark: '#0e7d99',
  enemyChaser: '#ff2e88',
  enemyShooter: '#ff7a1a',
  enemySplitter: '#c65cff',
  enemySmall: '#ff9de2',
  boss: '#ff3355',
  core: '#ffc233',
  bullet: '#8ef6ff',
  ebullet: '#ff5d7a',
  shield: '#59ffa0',
  rapid: '#ffe14d',
  life: '#ff6b9d',
  text: '#dff6ff',
  dim: '#7fa8c9',
};

export const TUNE = {
  playerRadius: 14,
  playerAccel: 1400,
  playerMaxSpeed: 330,
  playerFriction: 0.86,
  playerFireMs: 170,
  rapidFireMs: 80,
  bulletSpeed: 640,
  bulletRadius: 4,
  bulletLife: 1.1,
  ebulletSpeed: 230,
  ebulletRadius: 5,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 2.4,
  dashInvuln: 0.35,
  hitInvuln: 2.0,
  comboWindow: 3.0,
  comboStep: 4,
  comboMaxMult: 5,
  coreScore: 25,
  coreMagnet: 130,
  coreCollect: 26,
  maxLives: 5,
  startLives: 3,
  winWave: 10,
  bossEvery: 5,
  maxParticles: 420,
  shakeHit: 9,
  shakeExplode: 5,
};

// Seeded RNG (mulberry32). Deterministic, so screenshot staging is reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Squared distance, avoids a sqrt in hot collision loops.
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Score table per enemy type.
export const SCORE = {
  chaser: 100,
  shooter: 150,
  splitter: 150,
  small: 50,
  boss: 2000,
};
