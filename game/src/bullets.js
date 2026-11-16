// Neon Salvage — bullets (player and enemy).
// Plain arrays with swap-remove; no allocation in the update loop.

import { TUNE } from './config.js';

export function createBulletPools() {
  return { player: [], enemy: [] };
}

export function firePlayerBullet(pool, x, y, vx, vy) {
  pool.push({ x, y, vx, vy, r: TUNE.bulletRadius, life: TUNE.bulletLife, dmg: 1 });
}

export function fireEnemyBullet(pool, x, y, vx, vy) {
  pool.push({ x, y, vx, vy, r: TUNE.ebulletRadius, life: 3.2, dmg: 1 });
}

export function updateBullets(pool, dt, w, h) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const b = pool[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) {
      pool[i] = pool[pool.length - 1];
      pool.pop();
    }
  }
}

export function drawPlayerBullets(ctx, pool) {
  ctx.fillStyle = '#8ef6ff';
  for (let i = 0; i < pool.length; i++) {
    const b = pool[i];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawEnemyBullets(ctx, pool) {
  ctx.fillStyle = '#ff5d7a';
  for (let i = 0; i < pool.length; i++) {
    const b = pool[i];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
