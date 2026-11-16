// Neon Salvage — rendering: background, asteroids, pickups, entity layers.
// One job: turn the state into pixels, in a fixed draw order.

import { W, H, COLORS } from './config.js';
import { drawPlayer } from './player.js';
import { drawEnemies } from './enemies.js';
import { drawPlayerBullets, drawEnemyBullets } from './bullets.js';
import { drawPools } from './particles.js';
import { drawHUD, drawTitle, drawPaused, drawGameOver, drawVictory } from './hud.js';

let nebulaCanvas = null;

function buildNebula() {
  if (nebulaCanvas) return nebulaCanvas;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLORS.bg0);
  grad.addColorStop(1, COLORS.bg1);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // Soft nebula blobs.
  const blobs = [
    { x: 180, y: 140, r: 260, c: COLORS.nebulaA },
    { x: 760, y: 420, r: 300, c: COLORS.nebulaB },
    { x: 520, y: 90, r: 200, c: '#160a33' },
    { x: 120, y: 520, r: 220, c: '#031a2e' },
  ];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const rg = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rg.addColorStop(0, b.c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  nebulaCanvas = c;
  return c;
}

export function drawBackground(ctx, state) {
  const neb = buildNebula();
  ctx.drawImage(neb, 0, 0);
  const stars = state.world.stars;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.tw));
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
}

export function drawAsteroids(ctx, state) {
  const list = state.world.asteroids;
  ctx.strokeStyle = '#3a5a7d';
  ctx.fillStyle = '#101a30';
  ctx.lineWidth = 2;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    for (let k = 0; k < a.verts.length; k++) {
      const ang = (k / a.verts.length) * Math.PI * 2;
      const rr = a.r * a.verts[k];
      const px = Math.cos(ang) * rr;
      const py = Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawPickups(ctx, state) {
  const pk = state.pickups;
  for (let i = 0; i < pk.length; i++) {
    const k = pk[i];
    const bob = Math.sin(k.t * 4) * 3;
    const blink = k.life < 3 ? (Math.floor(k.t * 8) % 2 === 0 ? 1 : 0.25) : 1;
    ctx.globalAlpha = blink;
    if (k.kind === 'core') {
      ctx.fillStyle = COLORS.core;
      ctx.save();
      ctx.translate(k.x, k.y + bob);
      ctx.rotate(k.t * 2);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (k.kind === 'shield') {
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.shield;
      ctx.beginPath();
      ctx.arc(k.x, k.y + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (k.kind === 'rapid') {
      ctx.fillStyle = COLORS.rapid;
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('»»', k.x, k.y + bob + 5);
    } else if (k.kind === 'life') {
      ctx.fillStyle = COLORS.life;
      ctx.beginPath();
      ctx.arc(k.x - 4, k.y + bob, 5, 0, Math.PI * 2);
      ctx.arc(k.x + 4, k.y + bob, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(k.x - 9, k.y + bob + 2);
      ctx.lineTo(k.x, k.y + bob + 11);
      ctx.lineTo(k.x + 9, k.y + bob + 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function render(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    const s = state.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, state);
  drawAsteroids(ctx, state);
  drawPickups(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawPlayerBullets(ctx, state.bullets);
  drawEnemyBullets(ctx, state.ebullets);
  drawPools(ctx, state.pools);
  ctx.restore();

  // Hit flash.
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 90, ${state.flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (state.mode === 'title') drawTitle(ctx, state);
  else if (state.mode === 'paused') {
    drawHUD(ctx, state);
    drawPaused(ctx);
  } else if (state.mode === 'gameover') drawGameOver(ctx, state);
  else if (state.mode === 'victory') drawVictory(ctx, state);
  else drawHUD(ctx, state);
}
