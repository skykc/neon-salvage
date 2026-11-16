// Neon Salvage — the salvage skiff: movement, dash, firing, damage.
// One job: everything about the player ship.

import { W, H, TUNE, COLORS, clamp, dist2, angleTo } from './config.js';
import { keyDown, keyPressed } from './input.js';
import { firePlayerBullet } from './bullets.js';
import { spawnSparks, spawnTrail, spawnExplosion, addFloater } from './particles.js';
import { sfxShoot, sfxHit, sfxDash, sfxPickup, sfxLife, sfxExplosion, sfxGameOver } from './audio.js';

export function createPlayer() {
  return {
    x: W / 2,
    y: H / 2 + 60,
    vx: 0,
    vy: 0,
    r: TUNE.playerRadius,
    angle: -Math.PI / 2,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashing: false,
    invuln: 0,
    shield: false,
    rapidTimer: 0,
    thrust: 0,
  };
}

export function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;
  const rng = state.rng;

  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.rapidTimer > 0) p.rapidTimer -= dt;

  // Aim at the mouse.
  p.angle = angleTo(p.x, p.y, input.mouseX, input.mouseY);

  // WASD / arrows thrust.
  let ax = 0;
  let ay = 0;
  if (keyDown(input, 'KeyW') || keyDown(input, 'ArrowUp')) ay -= 1;
  if (keyDown(input, 'KeyS') || keyDown(input, 'ArrowDown')) ay += 1;
  if (keyDown(input, 'KeyA') || keyDown(input, 'ArrowLeft')) ax -= 1;
  if (keyDown(input, 'KeyD') || keyDown(input, 'ArrowRight')) ax += 1;
  const len = Math.sqrt(ax * ax + ay * ay);
  if (len > 0) {
    ax /= len;
    ay /= len;
    p.vx += ax * TUNE.playerAccel * dt;
    p.vy += ay * TUNE.playerAccel * dt;
    p.thrust = 1;
  } else {
    p.thrust = 0;
  }

  // Dash on Shift: a short burst toward the current move direction (or aim).
  if ((keyPressed(input, 'ShiftLeft') || keyPressed(input, 'ShiftRight')) && p.dashCooldown <= 0) {
    let dx = ax;
    let dy = ay;
    if (len === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    p.vx = dx * TUNE.dashSpeed;
    p.vy = dy * TUNE.dashSpeed;
    p.dashTimer = TUNE.dashTime;
    p.dashCooldown = TUNE.dashCooldown;
    p.invuln = Math.max(p.invuln, TUNE.dashInvuln);
    p.dashing = true;
    sfxDash(state.audio);
    spawnSparks(state.pools, p.x, p.y, COLORS.ship, 10);
  }
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) p.dashing = false;
  }

  // Friction + speed cap (not while dashing).
  if (!p.dashing) {
    p.vx *= Math.pow(TUNE.playerFriction, dt * 60);
    p.vy *= Math.pow(TUNE.playerFriction, dt * 60);
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp > TUNE.playerMaxSpeed) {
      p.vx = (p.vx / sp) * TUNE.playerMaxSpeed;
      p.vy = (p.vy / sp) * TUNE.playerMaxSpeed;
    }
  }
  p.x = clamp(p.x + p.vx * dt, p.r, W - p.r);
  p.y = clamp(p.y + p.vy * dt, p.r, H - p.r);

  // Engine trail.
  if (p.thrust > 0 && Math.random() < 0.6) {
    const bx = p.x - Math.cos(p.angle) * 16;
    const by = p.y - Math.sin(p.angle) * 16;
    spawnTrail(state.pools, bx, by, '#37f6ff');
  }

  // Fire: mouse held or Space.
  p.fireTimer -= dt;
  const wantFire = input.mouseDown || keyDown(input, 'Space');
  if (wantFire && p.fireTimer <= 0) {
    const rate = p.rapidTimer > 0 ? TUNE.rapidFireMs : TUNE.playerFireMs;
    p.fireTimer = rate / 1000;
    const spread = p.rapidTimer > 0 ? 0.09 : 0.05;
    const a = p.angle + (rng() - 0.5) * spread;
    const nx = p.x + Math.cos(p.angle) * 20;
    const ny = p.y + Math.sin(p.angle) * 20;
    firePlayerBullet(state.bullets, nx, ny, Math.cos(a) * TUNE.bulletSpeed, Math.sin(a) * TUNE.bulletSpeed);
    state.shotsFired++;
    sfxShoot(state.audio);
    p.vx -= Math.cos(p.angle) * 12;
    p.vy -= Math.sin(p.angle) * 12;
  }

  // Enemy bullets vs player.
  const eb = state.ebullets;
  for (let i = eb.length - 1; i >= 0; i--) {
    const b = eb[i];
    if (dist2(b.x, b.y, p.x, p.y) < (b.r + p.r - 2) * (b.r + p.r - 2)) {
      eb[i] = eb[eb.length - 1];
      eb.pop();
      damagePlayer(state);
      break;
    }
  }

  // Enemies touching the player.
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.spawnT > 0) continue;
    const rr = e.r + p.r - 4;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      damagePlayer(state);
      // Shove the enemy away so one touch is not two hits.
      const a = angleTo(p.x, p.y, e.x, e.y);
      e.vx = Math.cos(a) * 220;
      e.vy = Math.sin(a) * 220;
      break;
    }
  }

  // Pickups: magnet + collect.
  const pk = state.pickups;
  for (let i = pk.length - 1; i >= 0; i--) {
    const k = pk[i];
    const d2 = dist2(k.x, k.y, p.x, p.y);
    if (d2 < TUNE.coreMagnet * TUNE.coreMagnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 520 * dt;
      k.x += ((p.x - k.x) / d) * pull;
      k.y += ((p.y - k.y) / d) * pull;
    }
    if (d2 < TUNE.coreCollect * TUNE.coreCollect) {
      collectPickup(state, k);
      pk[i] = pk[pk.length - 1];
      pk.pop();
    }
  }
}

export function damagePlayer(state) {
  const p = state.player;
  if (p.invuln > 0 || state.mode !== 'playing') return;
  if (p.shield) {
    p.shield = false;
    p.invuln = 1.2;
    spawnSparks(state.pools, p.x, p.y, COLORS.shield, 18);
    addFloater(state.pools, p.x, p.y - 24, 'SHIELD DOWN', COLORS.shield, 14);
    sfxHit(state.audio);
    return;
  }
  state.lives--;
  state.combo = 0;
  state.multiplier = 1;
  state.comboTimer = 0;
  p.invuln = TUNE.hitInvuln;
  state.shake = Math.max(state.shake, TUNE.shakeHit);
  state.flash = 0.35;
  spawnSparks(state.pools, p.x, p.y, COLORS.ship, 26);
  sfxHit(state.audio);
  if (state.lives <= 0) {
    state.lives = 0;
    state.mode = 'gameover';
    state.gameoverT = 0;
    spawnExplosion(state.pools, p.x, p.y, COLORS.ship, 60, 280, 4);
    sfxExplosion(state.audio, true);
    sfxGameOver(state.audio);
  }
}

export function collectPickup(state, k) {
  const p = state.player;
  if (k.kind === 'core') {
    state.cores++;
    state.score += TUNE.coreScore * state.multiplier;
    addFloater(state.pools, k.x, k.y - 8, `+${TUNE.coreScore * state.multiplier}`, COLORS.core, 12);
    sfxPickup(state.audio);
  } else if (k.kind === 'shield') {
    p.shield = true;
    addFloater(state.pools, k.x, k.y - 8, 'SHIELD!', COLORS.shield, 15);
    sfxPickup(state.audio);
  } else if (k.kind === 'rapid') {
    p.rapidTimer = 8;
    addFloater(state.pools, k.x, k.y - 8, 'RAPID FIRE!', COLORS.rapid, 15);
    sfxPickup(state.audio);
  } else if (k.kind === 'life') {
    state.lives = Math.min(state.lives + 1, TUNE.maxLives);
    addFloater(state.pools, k.x, k.y - 8, '+1 LIFE', COLORS.life, 16);
    sfxLife(state.audio);
  }
  spawnSparks(state.pools, k.x, k.y, COLORS.core, 6);
}

export function drawPlayer(ctx, state) {
  const p = state.player;
  if (state.mode === 'gameover') return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0 && !p.dashing) {
    ctx.globalAlpha = 0.35;
  }
  // Shield ring.
  if (p.shield) {
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = COLORS.shield;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Skiff hull: arrow body with twin prongs and a cockpit.
  ctx.fillStyle = COLORS.ship;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-6, -4);
  ctx.lineTo(-6, 4);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#062a33';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  // Engine flame.
  if (p.thrust > 0) {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(-12 - 10 - Math.random() * 8, 0);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Dash cooldown arc under the ship.
  if (p.dashCooldown > 0) {
    const frac = 1 - p.dashCooldown / TUNE.dashCooldown;
    ctx.strokeStyle = 'rgba(55,246,255,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}
