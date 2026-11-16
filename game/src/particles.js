// Neon Salvage — particles and floating score text.
// Fixed-capacity pools: objects are reused, never allocated in the hot loop.

import { TUNE } from './config.js';

export function createParticlePools() {
  const particles = [];
  for (let i = 0; i < TUNE.maxParticles; i++) {
    particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.92, glow: false });
  }
  const floaters = [];
  for (let i = 0; i < 24; i++) {
    floaters.push({ alive: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 14 });
  }
  return { particles, floaters };
}

function nextDead(pool) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].alive) return pool[i];
  }
  return null;
}

export function spawnExplosion(pools, x, y, color, count, speed, size = 3) {
  for (let n = 0; n < count; n++) {
    const p = nextDead(pools.particles);
    if (!p) return;
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = 0;
    p.maxLife = 0.45 + Math.random() * 0.5;
    p.size = size * (0.6 + Math.random() * 0.8);
    p.color = color;
    p.drag = 0.9;
    p.glow = true;
  }
}

export function spawnSparks(pools, x, y, color, count) {
  for (let n = 0; n < count; n++) {
    const p = nextDead(pools.particles);
    if (!p) return;
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = 0;
    p.maxLife = 0.25 + Math.random() * 0.25;
    p.size = 2;
    p.color = color;
    p.drag = 0.94;
    p.glow = true;
  }
}

export function spawnTrail(pools, x, y, color) {
  const p = nextDead(pools.particles);
  if (!p) return;
  p.alive = true;
  p.x = x;
  p.y = y;
  p.vx = (Math.random() - 0.5) * 30;
  p.vy = (Math.random() - 0.5) * 30;
  p.life = 0;
  p.maxLife = 0.3;
  p.size = 2.5;
  p.color = color;
  p.drag = 0.95;
  p.glow = false;
}

export function addFloater(pools, x, y, text, color, size = 14) {
  const f = nextDead(pools.floaters);
  if (!f) return;
  f.alive = true;
  f.x = x;
  f.y = y;
  f.life = 0;
  f.maxLife = 1.0;
  f.text = text;
  f.color = color;
  f.size = size;
}

export function updatePools(pools, dt) {
  const ps = pools.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (!p.alive) continue;
    p.life += dt;
    if (p.life >= p.maxLife) {
      p.alive = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
  }
  const fs = pools.floaters;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (!f.alive) continue;
    f.life += dt;
    if (f.life >= f.maxLife) {
      f.alive = false;
      continue;
    }
    f.y -= 34 * dt;
  }
}

export function drawPools(ctx, pools) {
  const ps = pools.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (!p.alive) continue;
    const a = 1 - p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  const fs = pools.floaters;
  ctx.textAlign = 'center';
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (!f.alive) continue;
    const a = 1 - f.life / f.maxLife;
    ctx.globalAlpha = a;
    ctx.font = `bold ${f.size}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
