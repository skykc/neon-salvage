// Neon Salvage — all screen text: HUD, title, pause, wave banners, end screens.
// One job: draw words and bars on the canvas, never game logic.

import { W, H, COLORS, TUNE } from './config.js';

const FONT = '"Segoe UI", system-ui, sans-serif';

export function drawHUD(ctx, state) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top bar background.
  ctx.fillStyle = 'rgba(3, 8, 24, 0.55)';
  ctx.fillRect(0, 0, W, 44);

  ctx.font = 'bold 20px ' + FONT;
  ctx.fillStyle = COLORS.text;
  ctx.fillText('SCORE ' + state.score.toLocaleString('en-US'), 16, 29);

  ctx.font = 'bold 16px ' + FONT;
  ctx.fillStyle = state.combo >= 8 ? '#ffe14d' : COLORS.dim;
  ctx.fillText('COMBO x' + state.multiplier + '  (' + state.combo + ')', 220, 28);

  ctx.font = 'bold 16px ' + FONT;
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText('WAVE ' + state.wave, W / 2, 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.core;
  ctx.fillText('◆ ' + state.cores + ' CORES', W - 16, 28);

  // Lives as little ships.
  ctx.textAlign = 'left';
  for (let i = 0; i < state.lives; i++) {
    const x = 20 + i * 26;
    const y = 60;
    ctx.fillStyle = COLORS.ship;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 6);
    ctx.lineTo(x - 5, y + 5);
    ctx.lineTo(x + 8, y + 5);
    ctx.closePath();
    ctx.fill();
  }
  // Shield indicator.
  if (state.player.shield) {
    ctx.fillStyle = COLORS.shield;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('SHIELD', 20 + state.lives * 26 + 8, 66);
  }
  // Rapid fire timer.
  if (state.player.rapidTimer > 0) {
    ctx.fillStyle = COLORS.rapid;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('RAPID ' + state.player.rapidTimer.toFixed(0) + 's', 20 + state.lives * 26 + 8 + (state.player.shield ? 62 : 0), 66);
  }
  // Dash cooldown.
  const dashFrac = 1 - Math.max(0, state.player.dashCooldown) / TUNE.dashCooldown;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(16, H - 22, 120, 8);
  ctx.fillStyle = dashFrac >= 1 ? COLORS.ship : '#0e7d99';
  ctx.fillRect(16, H - 22, 120 * dashFrac, 8);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px ' + FONT;
  ctx.fillText('DASH [SHIFT]', 142, H - 14);

  // Combo timer bar.
  if (state.combo > 0) {
    const f = state.comboTimer / 3.0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(220, 34, 120, 5);
    ctx.fillStyle = '#ffe14d';
    ctx.fillRect(220, 34, 120 * Math.max(0, f), 5);
  }

  // Boss health bar.
  if (state.boss) {
    const b = state.boss;
    const bw = 420;
    const bx = (W - bw) / 2;
    const by = 58;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8ba0';
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText('SALVAGE WRECKER', W / 2, by - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = COLORS.boss;
    ctx.fillRect(bx, by, bw * Math.max(0, b.hp / b.maxHp), 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(bx, by, bw, 10);
  }

  // Wave banner.
  if (state.bannerT > 0 && state.banner) {
    const a = Math.min(1, state.bannerT);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px ' + FONT;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.banner, W / 2, H / 2 - 40);
    ctx.globalAlpha = 1;
  }
}

export function drawTitle(ctx, state) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#37f6ff';
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText('NEON SALVAGE', W / 2, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = '20px ' + FONT;
  ctx.fillText('Pilot a salvage skiff through the neon asteroid field.', W / 2, 232);
  ctx.fillText('Blast drones, collect their energy cores, survive 10 waves.', W / 2, 260);

  ctx.font = '16px ' + FONT;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('WASD / ARROWS — move      MOUSE — aim      CLICK / SPACE — shoot', W / 2, 330);
  ctx.fillText('SHIFT — dash      P — pause      R — restart', W / 2, 356);
  ctx.fillText('Chain kills to raise your combo. A hit resets it.', W / 2, 382);
  ctx.fillText('Clear wave 10 to win the sector — then keep going endless.', W / 2, 408);

  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('CLICK TO START', W / 2, 480);
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px ' + FONT;
  ctx.fillText('Best played with sound on. No downloads — everything is drawn and', W / 2, 560);
  ctx.fillText('synthesized in your browser.', W / 2, 580);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 8, 24, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px ' + FONT;
  ctx.fillText('Press P to resume — R to restart', W / 2, H / 2 + 26);
}

export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(10, 2, 8, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d7a';
  ctx.font = 'bold 52px ' + FONT;
  ctx.fillText('SKIFF DESTROYED', W / 2, 220);
  ctx.fillStyle = COLORS.text;
  ctx.font = '24px ' + FONT;
  ctx.fillText('Final score: ' + state.score.toLocaleString('en-US'), W / 2, 280);
  ctx.font = '18px ' + FONT;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('Wave reached: ' + state.wave + '    •    Drones destroyed: ' + state.kills + '    •    Cores: ' + state.cores, W / 2, 316);
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('CLICK OR PRESS R TO FLY AGAIN', W / 2, 390);
  ctx.globalAlpha = 1;
}

export function drawVictory(ctx, state) {
  ctx.fillStyle = 'rgba(2, 12, 8, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#59ffa0';
  ctx.font = 'bold 54px ' + FONT;
  ctx.fillText('SECTOR CLEARED', W / 2, 210);
  ctx.fillStyle = COLORS.text;
  ctx.font = '22px ' + FONT;
  ctx.fillText('All 10 waves cleared. The field is yours, salvager.', W / 2, 256);
  ctx.font = '24px ' + FONT;
  ctx.fillText('Final score: ' + state.score.toLocaleString('en-US'), W / 2, 300);
  ctx.font = '18px ' + FONT;
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('Drones destroyed: ' + state.kills + '    •    Cores: ' + state.cores, W / 2, 332);
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe14d';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('PRESS ENTER TO KEEP GOING — ENDLESS MODE', W / 2, 400);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px ' + FONT;
  ctx.fillText('or press R to start a fresh run', W / 2, 432);
}
