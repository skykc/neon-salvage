// Neon Salvage — game entrypoint: state, fixed-step simulation, game loop.
// The simulation runs at a fixed 60 Hz, separate from rendering, and all
// mutable game data lives in one state object created by createState.

import { W, H, TUNE, COLORS, mulberry32, dist2 } from './config.js';
import { createInput, attachInput, keyPressed, endStepInput } from './input.js';
import { createAudio, ensureAudio } from './audio.js';
import { createParticlePools, updatePools } from './particles.js';
import { createBulletPools, updateBullets } from './bullets.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateEnemies, killEnemy } from './enemies.js';
import { createWorld, startWave, updateWorld } from './world.js';
import { render } from './render.js';
import { stageShot, shotModeFromURL } from './shots.js';

export const STEP = 1 / 60;

export function createState(seed) {
  const rng = mulberry32(seed);
  const state = {
    mode: 'title',
    time: 0,
    frozen: false,
    seed,
    rng,
    score: 0,
    cores: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    lives: TUNE.startLives,
    wave: 0,
    endless: false,
    shake: 0,
    flash: 0,
    kills: 0,
    shotsFired: 0,
    hits: 0,
    banner: '',
    bannerT: 0,
    clearTimer: 0,
    waveState: 'idle',
    spawnQueue: [],
    spawnTimer: 0,
    boss: null,
    gameoverT: 0,
    victoryT: 0,
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    world: null,
    pools: null,
    input: null,
    audio: null,
  };
  state.player = createPlayer();
  state.world = createWorld(rng);
  state.pools = createParticlePools();
  state.input = createInput();
  state.audio = createAudio();
  const bp = createBulletPools();
  state.bullets = bp.player;
  state.ebullets = bp.enemy;
  return state;
}

export function resetRun(state) {
  const seed = (state.seed + 1) >>> 0;
  const fresh = createState(seed);
  fresh.input = state.input;
  fresh.audio = state.audio;
  // Copy every field of the fresh state onto the live one, keeping the same
  // object identity so renderers holding a reference keep working.
  const input = state.input;
  const audio = state.audio;
  for (const k of Object.keys(fresh)) {
    state[k] = fresh[k];
  }
  state.input = input;
  state.audio = audio;
  state.seed = seed;
}

export function startGame(state) {
  resetRun(state);
  state.mode = 'playing';
  state.endless = false;
  ensureAudio(state.audio);
  startWave(state, 1);
}

function continueEndless(state) {
  state.endless = true;
  state.mode = 'playing';
  startWave(state, state.wave + 1);
}

// Player bullets vs enemies. Lives in the step so the headless sim test can
// exercise it without a canvas.
export function collideBullets(state) {
  const bullets = state.bullets;
  const list = state.enemies;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let consumed = false;
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (e.spawnT > 0) continue;
      const rr = e.r + b.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        e.hp -= b.dmg;
        e.flash = 0.08;
        state.hits++;
        consumed = true;
        if (e.hp <= 0) {
          killEnemy(state, j);
        }
        break;
      }
    }
    if (consumed) {
      bullets[i] = bullets[bullets.length - 1];
      bullets.pop();
    }
  }
}

export function step(state, dt) {
  state.time += dt;
  if (state.bannerT > 0) state.bannerT -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 34);
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.4);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.multiplier = 1;
    }
  }

  const input = state.input;

  if (state.mode === 'title') {
    updatePools(state.pools, dt);
    if (
      input.mouseDown ||
      keyPressed(input, 'Enter') ||
      keyPressed(input, 'Space')
    ) {
      startGame(state);
    }
    endStepInput(input);
    return;
  }

  if (state.mode === 'paused') {
    if (keyPressed(input, 'KeyP') || keyPressed(input, 'Escape')) {
      state.mode = 'playing';
    } else if (keyPressed(input, 'KeyR')) {
      startGame(state);
    }
    endStepInput(input);
    return;
  }

  if (state.mode === 'gameover') {
    state.gameoverT += dt;
    updatePools(state.pools, dt);
    updateBullets(state.bullets, dt, W, H);
    updateBullets(state.ebullets, dt, W, H);
    if (state.gameoverT > 0.8 && (input.mouseDown || keyPressed(input, 'KeyR'))) {
      startGame(state);
    }
    endStepInput(input);
    return;
  }

  if (state.mode === 'victory') {
    state.victoryT += dt;
    updatePools(state.pools, dt);
    if (keyPressed(input, 'Enter')) {
      continueEndless(state);
    } else if (keyPressed(input, 'KeyR')) {
      startGame(state);
    }
    endStepInput(input);
    return;
  }

  // Playing.
  if (keyPressed(input, 'KeyP') || keyPressed(input, 'Escape')) {
    state.mode = 'paused';
    endStepInput(input);
    return;
  }
  if (keyPressed(input, 'KeyR')) {
    startGame(state);
    endStepInput(input);
    return;
  }

  updatePlayer(state, dt);
  updateWorld(state, dt);
  updateEnemies(state, dt);
  collideBullets(state);
  updateBullets(state.bullets, dt, W, H);
  updateBullets(state.ebullets, dt, W, H);
  updatePools(state.pools, dt);
  endStepInput(input);
}

export function renderFrame(ctx, state) {
  ctx.clearRect(0, 0, W, H);
  render(ctx, state);
}

export function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seedParam = Number(params.get('seed'));
  const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : (Date.now() % 2147483647);
  const state = createState(seed);
  attachInput(state.input, canvas);
  const wake = () => ensureAudio(state.audio);
  window.addEventListener('mousedown', wake, { once: true });
  window.addEventListener('keydown', wake, { once: true });

  const mode = shotModeFromURL();
  if (mode) {
    stageShot(state, mode);
    renderFrame(ctx, state);
    renderFrame(ctx, state);
    window.__shotReady = true;
    return state;
  }

  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 8) {
      step(state, STEP);
      acc -= STEP;
      guard++;
    }
    if (guard >= 8) acc = 0;
    renderFrame(ctx, state);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return state;
}
