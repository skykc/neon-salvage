// Neon Salvage — enemies: chasers, shooters, splitters, smalls and the boss.
// One job: enemy shape, movement, firing and death behaviour.

import { W, H, COLORS, SCORE, clamp, angleTo } from './config.js';
import { fireEnemyBullet } from './bullets.js';
import { spawnExplosion, spawnSparks, addFloater } from './particles.js';
import { sfxExplosion, sfxEnemyShoot } from './audio.js';

export const ENEMY_DEF = {
  chaser: { r: 15, hp: 2, speed: 115, score: SCORE.chaser, color: COLORS.enemyChaser },
  shooter: { r: 15, hp: 2, speed: 70, score: SCORE.shooter, color: COLORS.enemyShooter },
  splitter: { r: 20, hp: 3, speed: 80, score: SCORE.splitter, color: COLORS.enemySplitter },
  small: { r: 9, hp: 1, speed: 190, score: SCORE.small, color: COLORS.enemySmall },
  boss: { r: 46, hp: 60, speed: 55, score: SCORE.boss, color: COLORS.boss },
};

export function createEnemy(type, x, y, wave) {
  const def = ENEMY_DEF[type];
  const hpScale = 1 + Math.max(0, wave - 1) * 0.12;
  return {
    type,
    x, y,
    vx: 0, vy: 0,
    r: def.r,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * (1 + Math.min(0.4, (wave - 1) * 0.03)),
    score: def.score,
    color: def.color,
    angle: 0,
    fireTimer: 1 + Math.random() * 1.5,
    burst: 0,
    burstTimer: 0,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
    spawnT: 0.5,
  };
}

export function spawnEnemyAtEdge(state, type, rng) {
  const margin = 40;
  const side = Math.floor(rng() * 4);
  let x, y;
  if (side === 0) { x = margin + rng() * (W - margin * 2); y = -margin; }
  else if (side === 1) { x = margin + rng() * (W - margin * 2); y = H + margin; }
  else if (side === 2) { x = -margin; y = margin + rng() * (H - margin * 2); }
  else { x = W + margin; y = margin + rng() * (H - margin * 2); }
  return createEnemy(type, x, y, state.wave);
}

export function updateEnemies(state, dt) {
  const p = state.player;
  const list = state.enemies;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.flash > 0) e.flash -= dt;
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      continue;
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (e.type === 'chaser' || e.type === 'small') {
      e.vx += (dx / d) * e.speed * 2.4 * dt;
      e.vy += (dy / d) * e.speed * 2.4 * dt;
      const sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      const cap = e.speed * (e.type === 'small' ? 1.4 : 1);
      if (sp > cap) {
        e.vx = (e.vx / sp) * cap;
        e.vy = (e.vy / sp) * cap;
      }
      e.angle = Math.atan2(e.vy, e.vx);
    } else if (e.type === 'shooter') {
      e.wobble += dt;
      const keep = 260;
      const tx = p.x + Math.cos(e.wobble * 0.7) * 120;
      const ty = p.y + Math.sin(e.wobble * 0.7) * 120;
      const ddx = tx - e.x;
      const ddy = ty - e.y;
      const dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const want = dd > keep ? 1 : -0.6;
      e.vx += (ddx / dd) * e.speed * want * dt * 2;
      e.vy += (ddy / dd) * e.speed * want * dt * 2;
      const sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (sp > e.speed) {
        e.vx = (e.vx / sp) * e.speed;
        e.vy = (e.vy / sp) * e.speed;
      }
      e.angle = angleTo(e.x, e.y, p.x, p.y);
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && d < 560) {
        const a = angleTo(e.x, e.y, p.x, p.y);
        const bs = 230;
        fireEnemyBullet(state.ebullets, e.x, e.y, Math.cos(a) * bs, Math.sin(a) * bs);
        sfxEnemyShoot(state.audio);
        e.fireTimer = 1.6 + Math.random() * 0.9;
      }
    } else if (e.type === 'splitter') {
      e.wobble += dt;
      e.vx += (dx / d) * e.speed * 1.6 * dt;
      e.vy += (dy / d) * e.speed * 1.6 * dt;
      const sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (sp > e.speed) {
        e.vx = (e.vx / sp) * e.speed;
        e.vy = (e.vy / sp) * e.speed;
      }
      e.angle += dt * 2;
    } else if (e.type === 'boss') {
      e.wobble += dt;
      const tx = W / 2 + Math.sin(e.wobble * 0.5) * 260;
      const ty = 150 + Math.sin(e.wobble * 0.9) * 70;
      e.x += (tx - e.x) * 0.8 * dt;
      e.y += (ty - e.y) * 0.8 * dt;
      e.angle += dt * 0.8;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.burst = 3;
        e.burstTimer = 0;
        e.fireTimer = 2.2;
      }
      if (e.burst > 0) {
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = 0.22;
          e.burst--;
          const n = 12;
          const off = Math.random() * Math.PI;
          for (let k = 0; k < n; k++) {
            const a = off + (k / n) * Math.PI * 2;
            fireEnemyBullet(state.ebullets, e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190);
          }
          sfxEnemyShoot(state.audio);
        }
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = clamp(e.x, -60, W + 60);
    e.y = clamp(e.y, -60, H + 60);
  }
}

// Called when an enemy's hp reaches 0. Handles splitter children, drops and
// scoring. Returns nothing; mutates state.
export function killEnemy(state, index) {
  const list = state.enemies;
  const e = list[index];
  const pts = e.score * state.multiplier;
  state.score += pts;
  state.kills++;
  state.combo++;
  state.comboTimer = 3.0;
  state.multiplier = Math.min(1 + Math.floor(state.combo / 4), 5);
  addFloater(state.pools, e.x, e.y - 10, `+${pts}`, '#ffe14d', e.type === 'boss' ? 22 : 14);
  spawnExplosion(state.pools, e.x, e.y, e.color, e.type === 'boss' ? 70 : 22, e.type === 'boss' ? 260 : 190, e.type === 'boss' ? 4 : 3);
  sfxExplosion(state.audio, e.type === 'boss');
  state.shake = Math.max(state.shake, e.type === 'boss' ? 12 : 4);
  if (e.type === 'splitter') {
    for (let k = 0; k < 2; k++) {
      const s = createEnemy('small', e.x + (k === 0 ? -14 : 14), e.y, state.wave);
      s.spawnT = 0.15;
      s.vx = (k === 0 ? -1 : 1) * 120;
      list.push(s);
    }
  }
  if (e.type === 'boss') {
    state.boss = null;
    for (let k = 0; k < 5; k++) {
      state.pickups.push({
        kind: 'core', x: e.x + (k - 2) * 34, y: e.y, vx: 0, vy: 0,
        t: 0, life: 12,
      });
    }
  } else {
    const r = state.rng();
    if (r < 0.55) {
      state.pickups.push({ kind: 'core', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, life: 10 });
    } else if (r < 0.6) {
      state.pickups.push({ kind: 'shield', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, life: 10 });
    } else if (r < 0.65) {
      state.pickups.push({ kind: 'rapid', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, life: 10 });
    } else if (r < 0.67 && state.wave >= 5 && state.lives < 5) {
      state.pickups.push({ kind: 'life', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, life: 10 });
    }
  }
  list[index] = list[list.length - 1];
  list.pop();
}

export function drawEnemies(ctx, state) {
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const flash = e.flash > 0;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.strokeStyle = flash ? '#ffffff' : e.color;
    ctx.lineWidth = 2;
    if (e.type === 'chaser') {
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -11);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'shooter') {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a0a00';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2a0a00';
      ctx.fillRect(8, -2, 12, 4);
    } else if (e.type === 'splitter') {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 11, Math.sin(a) * 11, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#2a0a33';
      ctx.fill();
    } else if (e.type === 'small') {
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'boss') {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = k % 2 === 0 ? 46 : 30;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a0208';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8ba0';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (e.type === 'boss') {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(e.x - 40, e.y - 58, 80, 6);
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(e.x - 40, e.y - 58, 80 * (e.hp / e.maxHp), 6);
    } else if (e.hp < e.maxHp && e.type !== 'small') {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(e.x - 14, e.y - e.r - 9, 28, 3);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - 14, e.y - e.r - 9, 28 * (e.hp / e.maxHp), 3);
    }
    if (e.spawnT > 0) {
      ctx.globalAlpha = 0.5 * (e.spawnT / 0.5);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
