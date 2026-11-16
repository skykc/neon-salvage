// Neon Salvage — waves, spawning, asteroids and pickups.
// One job: the world around the fight (what appears, when, and where).

import { W, H, TUNE, mulberry32 } from './config.js';
import { spawnEnemyAtEdge, createEnemy } from './enemies.js';
import { sfxWave, sfxVictory } from './audio.js';

export function createWorld(rng) {
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: rng() * W,
      y: rng() * H,
      r: 0.5 + rng() * 1.6,
      tw: rng() * Math.PI * 2,
      sp: 0.4 + rng() * 1.2,
    });
  }
  const asteroids = [];
  for (let i = 0; i < 9; i++) {
    const r = 18 + rng() * 34;
    const verts = [];
    const n = 8;
    for (let k = 0; k < n; k++) {
      verts.push(0.72 + rng() * 0.5);
    }
    asteroids.push({
      x: rng() * W,
      y: rng() * H,
      r,
      verts,
      rot: rng() * Math.PI * 2,
      rotV: (rng() - 0.5) * 0.25,
      vx: (rng() - 0.5) * 14,
      vy: (rng() - 0.5) * 14,
    });
  }
  return { stars, asteroids };
}

// Wave composition: escalating mix, boss every 5th wave.
export function waveComposition(wave) {
  const chasers = 4 + wave;
  const shooters = 2 + Math.floor(wave / 2);
  const splitters = Math.floor(wave / 2);
  const boss = wave % TUNE.bossEvery === 0;
  return { chasers, shooters, splitters, boss };
}

export function startWave(state, wave) {
  state.wave = wave;
  state.waveState = 'spawning';
  state.spawnQueue = [];
  const comp = waveComposition(wave);
  for (let i = 0; i < comp.chasers; i++) state.spawnQueue.push('chaser');
  for (let i = 0; i < comp.shooters; i++) state.spawnQueue.push('shooter');
  for (let i = 0; i < comp.splitters; i++) state.spawnQueue.push('splitter');
  // Shuffle the queue with the seeded RNG.
  const rng = state.rng;
  for (let i = state.spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = state.spawnQueue[i];
    state.spawnQueue[i] = state.spawnQueue[j];
    state.spawnQueue[j] = t;
  }
  state.spawnTimer = 0.4;
  if (comp.boss) {
    const boss = spawnBoss(state);
    state.boss = boss;
    state.enemies.push(boss);
  }
  state.banner = 'WAVE ' + wave + (comp.boss ? ' — SALVAGE WRECKER' : '');
  state.bannerT = 2.2;
  sfxWave(state.audio);
}

export function spawnBoss(state) {
  const boss = createEnemy('boss', W / 2, -60, state.wave);
  boss.spawnT = 0.8;
  return boss;
}

export function updateWorld(state, dt) {
  // Drift the decorative asteroids.
  const ast = state.world.asteroids;
  for (let i = 0; i < ast.length; i++) {
    const a = ast[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotV * dt;
    if (a.x < -60) a.x = W + 60;
    if (a.x > W + 60) a.x = -60;
    if (a.y < -60) a.y = H + 60;
    if (a.y > H + 60) a.y = -60;
  }
  // Twinkle the stars.
  const stars = state.world.stars;
  for (let i = 0; i < stars.length; i++) stars[i].tw += dt * stars[i].sp;

  if (state.mode !== 'playing') return;

  // Feed the spawn queue, one drone at a time.
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < 26) {
      state.spawnTimer = 0.55;
      const type = state.spawnQueue.pop();
      state.enemies.push(spawnEnemyAtEdge(state, type, state.rng));
    }
  }

  // Pickups drift and expire.
  const pk = state.pickups;
  for (let i = pk.length - 1; i >= 0; i--) {
    const k = pk[i];
    k.t += dt;
    k.life -= dt;
    if (k.life <= 0) {
      pk[i] = pk[pk.length - 1];
      pk.pop();
    }
  }

  // Wave clear: queue empty, no enemies left (and no boss).
  if (
    state.spawnQueue.length === 0 &&
    state.enemies.length === 0 &&
    state.waveState === 'spawning'
  ) {
    state.waveState = 'clear';
    if (state.wave >= TUNE.winWave && !state.endless) {
      state.mode = 'victory';
      state.victoryT = 0;
      sfxVictory(state.audio);
      return;
    }
    state.banner = 'WAVE ' + state.wave + ' CLEARED';
    state.bannerT = 2.0;
    state.clearTimer = 2.0;
  }
  if (state.waveState === 'clear' && state.mode === 'playing') {
    state.clearTimer -= dt;
    if (state.clearTimer <= 0) {
      startWave(state, state.wave + 1);
    }
  }
}
