// Neon Salvage — deterministic screenshot staging.
// Reads ?shot= from the URL and builds a fixed scene per mode with a seeded
// RNG, so the four screenshots are reproducible. The loop is frozen after
// staging and window.__shotReady is set for the screenshot tool.

import { W, H, mulberry32 } from './config.js';
import { createEnemy } from './enemies.js';

function placeEnemy(state, type, x, y) {
  const e = createEnemy(type, x, y, state.wave);
  e.spawnT = 0;
  e.fireTimer = 2;
  return e;
}

export function stageShot(state, mode) {
  const rng = mulberry32(1);
  state.rng = rng;
  state.frozen = true;
  state.time = 12;
  if (mode === 'start') {
    state.mode = 'title';
    state.player.x = W / 2;
    state.player.y = H / 2 + 140;
    state.player.angle = -Math.PI / 2;
    state.enemies = [
      placeEnemy(state, 'chaser', 200, 180),
      placeEnemy(state, 'shooter', 740, 200),
      placeEnemy(state, 'splitter', 640, 420),
      placeEnemy(state, 'chaser', 320, 440),
    ];
    state.enemies[0].angle = 0.6;
    state.enemies[1].angle = -2.4;
    state.enemies[2].angle = 1.2;
    state.enemies[3].angle = 2.6;
  } else if (mode === 'play') {
    state.mode = 'playing';
    state.wave = 3;
    state.waveState = 'spawning';
    state.score = 2450;
    state.combo = 6;
    state.multiplier = 2;
    state.comboTimer = 2.1;
    state.cores = 12;
    state.lives = 3;
    state.kills = 24;
    state.player.x = 430;
    state.player.y = 380;
    state.player.angle = -0.5;
    state.player.vx = 120;
    state.player.vy = -40;
    state.input.mouseX = 700;
    state.input.mouseY = 240;
    state.enemies = [
      placeEnemy(state, 'chaser', 690, 230),
      placeEnemy(state, 'chaser', 760, 330),
      placeEnemy(state, 'shooter', 820, 180),
      placeEnemy(state, 'splitter', 560, 180),
      placeEnemy(state, 'small', 640, 300),
      placeEnemy(state, 'small', 700, 420),
    ];
    state.enemies[0].hp = 1;
    state.bullets = [
      { x: 520, y: 340, vx: 560, vy: -280, r: 4, life: 0.8, dmg: 1 },
      { x: 560, y: 320, vx: 560, vy: -280, r: 4, life: 0.8, dmg: 1 },
      { x: 600, y: 300, vx: 560, vy: -280, r: 4, life: 0.8, dmg: 1 },
    ];
    state.ebullets = [
      { x: 760, y: 260, vx: -160, vy: 120, r: 5, life: 2, dmg: 1 },
      { x: 700, y: 300, vx: -120, vy: 160, r: 5, life: 2, dmg: 1 },
    ];
    state.pickups = [
      { kind: 'core', x: 380, y: 300, vx: 0, vy: 0, t: 0.4, life: 10 },
      { kind: 'core', x: 420, y: 260, vx: 0, vy: 0, t: 1.2, life: 10 },
      { kind: 'shield', x: 500, y: 470, vx: 0, vy: 0, t: 0.8, life: 10 },
    ];
    state.banner = '';
    state.bannerT = 0;
  } else if (mode === 'boss') {
    state.mode = 'playing';
    state.wave = 5;
    state.waveState = 'spawning';
    state.score = 7310;
    state.combo = 11;
    state.multiplier = 3;
    state.comboTimer = 1.6;
    state.cores = 31;
    state.lives = 2;
    state.kills = 58;
    state.player.x = 430;
    state.player.y = 480;
    state.player.angle = -1.2;
    const boss = createEnemy('boss', W / 2, 170, 5);
    boss.spawnT = 0;
    boss.hp = 38;
    boss.maxHp = 60;
    state.boss = boss;
    state.enemies = [
      boss,
      placeEnemy(state, 'chaser', 240, 260),
      placeEnemy(state, 'shooter', 720, 260),
    ];
    state.ebullets = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      state.ebullets.push({
        x: boss.x + Math.cos(a) * 90,
        y: boss.y + Math.sin(a) * 90,
        vx: Math.cos(a) * 190,
        vy: Math.sin(a) * 190,
        r: 5, life: 2.5, dmg: 1,
      });
    }
    state.bullets = [
      { x: 460, y: 420, vx: 220, vy: -600, r: 4, life: 0.8, dmg: 1 },
      { x: 480, y: 400, vx: 260, vy: -580, r: 4, life: 0.8, dmg: 1 },
    ];
    state.banner = '';
    state.bannerT = 0;
  } else if (mode === 'end') {
    state.mode = 'gameover';
    state.gameoverT = 1.5;
    state.score = 12840;
    state.wave = 7;
    state.kills = 86;
    state.cores = 41;
    state.lives = 0;
    state.enemies = [
      placeEnemy(state, 'chaser', 300, 200),
      placeEnemy(state, 'shooter', 660, 240),
      placeEnemy(state, 'splitter', 520, 430),
    ];
  } else {
    state.mode = 'title';
  }
}

export function shotModeFromURL() {
  if (typeof window === 'undefined' || !window.location) return null;
  const q = new URLSearchParams(window.location.search);
  return q.get('shot');
}
