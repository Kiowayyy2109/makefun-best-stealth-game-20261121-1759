// Nightshade — rendering. One job: draw the whole game on the canvas.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS } from './config.js';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (game.state === 'title') { this.drawTitle(game); return; }
    this.drawWorld(game);
    this.drawGuards(game);
    this.drawPlayer(game);
    this.drawHud(game);
    if (game.state === 'won') this.drawEnd(game, true);
    if (game.state === 'lost') this.drawEnd(game, false);
    if (game.state === 'leveldone') this.drawLevelDone(game);
    if (game.state === 'briefing') this.drawBriefing(game);
  }

  drawWorld(game) {
    const ctx = this.ctx;
    const world = game.world;
    const t = game.time;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE, y = r * TILE;
        const ch = world.tileAt(c, r);
        if (ch === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, TILE, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x, y + 8, TILE, 2);
          continue;
        }
        ctx.fillStyle = (c + r) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        if (ch === 'S') {
          ctx.fillStyle = COLORS.shadow;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(120, 160, 255, 0.10)';
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SHADOW', x + TILE / 2, y + TILE - 8);
        }
        if (ch === 'C') {
          ctx.fillStyle = COLORS.crate;
          ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          ctx.fillStyle = COLORS.crateTop;
          ctx.fillRect(x + 6, y + 6, TILE - 12, 10);
          ctx.strokeStyle = 'rgba(0,0,0,0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
          ctx.beginPath();
          ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + TILE - 6, y + TILE - 6);
          ctx.moveTo(x + TILE - 6, y + 6); ctx.lineTo(x + 6, y + TILE - 6);
          ctx.stroke();
        }
      }
    }
    // Exit portal: locked (dim) until every core is taken, then bright and pulsing.
    const ex = world.exit;
    const open = game.coresGot >= game.coresTotal;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.save();
    ctx.globalAlpha = open ? 0.55 + 0.35 * pulse : 0.25;
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = open ? '#b8ffdd' : '#2c6b4a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = open ? '#062b18' : '#9fd8b8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', ex.x, ex.y + 4);
    // Data cores: glowing diamonds, gently bobbing.
    for (const core of world.cores) {
      if (core.taken) continue;
      const bob = Math.sin(t * 2.5 + core.x) * 3;
      const glow = 0.5 + 0.3 * Math.sin(t * 4 + core.y);
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = COLORS.core;
      ctx.beginPath(); ctx.arc(core.x, core.y + bob, 18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(core.x, core.y + bob - 10);
      ctx.lineTo(core.x + 8, core.y + bob);
      ctx.lineTo(core.x, core.y + bob + 10);
      ctx.lineTo(core.x - 8, core.y + bob);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.beginPath(); ctx.arc(core.x, core.y + bob, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawGuards(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      // Vision cone, clipped by walls: draw as a fan of short rays so it hugs cover.
      const color = g.state === 'chase' ? COLORS.coneAlert
        : g.suspicion >= 30 ? COLORS.coneWary : COLORS.coneCalm;
      ctx.fillStyle = color;
      const rays = 26;
      const half = 0.62;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      for (let i = 0; i <= rays; i++) {
        const a = g.angle - half + (2 * half * i) / rays;
        let reach = 235;
        for (let d = 12; d <= 235; d += 12) {
          const px = g.x + Math.cos(a) * d;
          const py = g.y + Math.sin(a) * d;
          if (game.world.solidAt(Math.floor(px / TILE), Math.floor(py / TILE))) { reach = d; break; }
        }
        ctx.lineTo(g.x + Math.cos(a) * reach, g.y + Math.sin(a) * reach);
      }
      ctx.closePath();
      ctx.fill();
      // Footstep puffs: faint dots trailing a walking guard, so you can hear
      // (and see) where a patrol has just been.
      if (g.stepTick) {
        game.footprints.push({ x: g.x, y: g.y, life: 1 });
      }
      // Guard body: armoured warden with a facing tick.
      ctx.fillStyle = COLORS.guardArmor;
      ctx.beginPath(); ctx.arc(g.x, g.y, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.guard;
      ctx.beginPath(); ctx.arc(g.x, g.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd9d9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
      ctx.stroke();
      // Suspicion arc above the guard + ? / ! marker.
      if (g.suspicion > 2) {
        ctx.strokeStyle = g.suspicion >= 100 ? '#ff4646' : '#ffd65a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 24, -Math.PI / 2, -Math.PI / 2 + (g.suspicion / 100) * Math.PI * 2);
        ctx.stroke();
      }
      if (g.state === 'chase') {
        ctx.fillStyle = '#ff4646';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 30);
      } else if (g.state === 'wary' || g.state === 'search') {
        ctx.fillStyle = '#ffd65a';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', g.x, g.y - 30);
      }
    }
    // Footprints fade out.
    for (const f of game.footprints) {
      ctx.fillStyle = `rgba(255, 220, 180, ${0.35 * f.life})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    // Noise ring while running: shows exactly how far your footsteps carry.
    if (p.noisePulse > 0) {
      ctx.strokeStyle = `rgba(127, 231, 255, ${0.5 * p.noisePulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 130 * (1 - p.noisePulse * 0.55), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Shadow under the player, then the hooded infiltrator.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#06222e';
    ctx.beginPath(); ctx.arc(p.x + p.dirX * 4, p.y + p.dirY * 4, 4, 0, Math.PI * 2); ctx.fill();
    if (p.sneaking) {
      ctx.fillStyle = '#bfe9ff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAKING', p.x, p.y - 26);
    }
    if (game.world.isShadow(p.x, p.y)) {
      ctx.fillStyle = '#9db8ff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN IN SHADOW', p.x, p.y - (p.sneaking ? 40 : 26));
    }
  }

  drawHud(game) {
    const ctx = this.ctx;
    const maxSuspicion = game.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
    ctx.fillStyle = 'rgba(5, 7, 16, 0.82)';
    roundRect(ctx, 10, 8, 560, 44, 8); ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`LEVEL ${game.levelIndex + 1} — ${game.levelName}`, 22, 30);
    ctx.fillStyle = COLORS.core;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`◆ ${game.coresGot}/${game.coresTotal} CORES`, 330, 30);
    ctx.fillStyle = '#9db8ff';
    ctx.fillText(`⏱ ${game.timerText()}`, 470, 30);
    // Detection meter, top right.
    ctx.fillStyle = 'rgba(5, 7, 16, 0.82)';
    roundRect(ctx, VIEW_W - 330, 8, 320, 44, 8); ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DETECTION', VIEW_W - 318, 30);
    const w = 170;
    ctx.fillStyle = '#20263d';
    roundRect(ctx, VIEW_W - 220, 20, w, 16, 4); ctx.fill();
    ctx.fillStyle = maxSuspicion >= 100 ? '#ff4646' : maxSuspicion >= 30 ? '#ffb13d' : '#39d98a';
    if (maxSuspicion > 0) {
      roundRect(ctx, VIEW_W - 220, 20, Math.max(6, (w * maxSuspicion) / 100), 16, 4); ctx.fill();
    }
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${Math.round(maxSuspicion)}%`, VIEW_W - 42, 30);
    // Bottom hint bar.
    ctx.fillStyle = 'rgba(5, 7, 16, 0.72)';
    roundRect(ctx, 10, VIEW_H - 34, 700, 26, 6); ctx.fill();
    ctx.fillStyle = '#aeb8d8';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / arrows move · SHIFT sneak · M mute · R restart · stay out of the cones', 20, VIEW_H - 21);
    // Alert banner when any guard is chasing; a grab warns you to break away.
    if (game.grabGrace > 0) {
      ctx.fillStyle = 'rgba(255, 40, 40, 0.9)';
      roundRect(ctx, VIEW_W / 2 - 170, 60, 340, 34, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GRABBED — RUN! BREAK AWAY!', VIEW_W / 2, 77);
    } else if (game.guards.some((g) => g.state === 'chase')) {
      ctx.fillStyle = 'rgba(255, 40, 40, 0.85)';
      roundRect(ctx, VIEW_W / 2 - 170, 60, 340, 34, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('! SPOTTED — BREAK LINE OF SIGHT !', VIEW_W / 2, 77);
    }
    ctx.textBaseline = 'alphabetic';
  }

  drawTitle(game) {
    const ctx = this.ctx;
    ctx.fillStyle = '#07080f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // A moody backdrop: the gallery floor with one sweeping cone.
    ctx.fillStyle = '#10131f';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if ((c + r) % 2 === 0) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
    ctx.fillStyle = 'rgba(255, 214, 90, 0.13)';
    conePath(ctx, 980, 180, 0.7, 420, 0.62); ctx.fill();
    ctx.fillStyle = 'rgba(255, 214, 90, 0.13)';
    conePath(ctx, 300, 560, -1.1, 380, 0.62); ctx.fill();
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath(); ctx.arc(980, 180, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(300, 560, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fe7ff';
    ctx.beginPath(); ctx.arc(640, 420, 15, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecff';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('NIGHTSHADE', VIEW_W / 2, 190);
    ctx.fillStyle = '#ffcf4d';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('— THE EMBER VAULT —', VIEW_W / 2, 232);
    ctx.fillStyle = '#c6cdea';
    ctx.font = '18px monospace';
    ctx.fillText('A top-down stealth game. Steal the ember cores. Never be seen.', VIEW_W / 2, 300);
    ctx.fillText('Sneak through shadows, mind the vision cones, mind your footsteps.', VIEW_W / 2, 330);
    ctx.fillStyle = '#7fe7ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press ENTER to begin  ·  WASD move  ·  SHIFT sneak  ·  M mute', VIEW_W / 2, 500);
    ctx.fillStyle = '#8b93b0';
    ctx.font = '14px monospace';
    ctx.fillText('3 levels · guards patrol, suspect, chase and search · run and they hear you', VIEW_W / 2, 540);
  }

  drawBriefing(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 5, 12, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffcf4d';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(`LEVEL ${game.levelIndex + 1}: ${game.levelName}`, VIEW_W / 2, 280);
    ctx.fillStyle = '#e8ecff';
    ctx.font = '19px monospace';
    ctx.fillText(game.levelBriefing, VIEW_W / 2, 330);
    ctx.fillStyle = '#7fe7ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press ENTER to start', VIEW_W / 2, 400);
  }

  drawLevelDone(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 5, 12, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#39d98a';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('LEVEL CLEAR — UNSEEN', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecff';
    ctx.font = '19px monospace';
    ctx.fillText(`Time ${game.timerText()} · spotted ${game.timesSpotted} time(s)`, VIEW_W / 2, 350);
    ctx.fillStyle = '#7fe7ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press ENTER for the next level', VIEW_W / 2, 410);
  }

  drawEnd(game, won) {
    const ctx = this.ctx;
    ctx.fillStyle = won ? 'rgba(4, 30, 16, 0.82)' : 'rgba(30, 4, 8, 0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#39d98a' : '#ff5d5d';
    ctx.font = 'bold 46px monospace';
    ctx.fillText(won ? 'THE VAULT IS YOURS' : 'CAUGHT IN THE LIGHT', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecff';
    ctx.font = '19px monospace';
    if (won) {
      ctx.fillText(`All 3 levels cleared in ${game.timerText()} · spotted ${game.timesSpotted} time(s)`, VIEW_W / 2, 350);
      ctx.fillText('The ember cores are yours — and nobody ever saw you coming.', VIEW_W / 2, 382);
    } else {
      ctx.fillText('A warden laid hands on you. The vault keeps its secrets — this time.', VIEW_W / 2, 350);
    }
    ctx.fillStyle = '#7fe7ff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press R to try again', VIEW_W / 2, 440);
  }
}
