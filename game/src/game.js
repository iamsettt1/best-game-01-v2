// game.js — STARFALL ARENA boot and main loop.
// Owns the central state, the fixed-step update (player, bullets,
// enemies, shards, collisions, waves, XP), rendering order, the scene
// query parameter used for screenshots, and the __STARFALL__ debug hook.

import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createStarfield, drawBackground, drawArenaFrame } from './render.js';
import { createPlayer, resetPlayer, updatePlayer, damagePlayer, drawPlayer } from './player.js';
import { updateEnemies, drawEnemy, createEnemy } from './enemies.js';
import { createWaveManager, startWave, updateWaves } from './waves.js';
import { rollUpgradeChoices, xpForLevel } from './upgrades.js';
import { drawHud, drawTitle, drawUpgradeScreen, drawPause, drawGameOver, drawVictory } from './ui.js';

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const VIEW_W = 1280;
const VIEW_H = 800;
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = createInput(canvas);
const audio = createAudio();
const effects = createEffects();
const starfield = createStarfield(VIEW_W, VIEW_H);

const state = {
  mode: 'title',
  width: VIEW_W, height: VIEW_H,
  time: 0,
  score: 0, kills: 0,
  level: 1, xp: 0, xpNeeded: xpForLevel(1),
  player: createPlayer(VIEW_W / 2, VIEW_H / 2),
  enemies: [], bullets: [], enemyBullets: [], shards: [],
  waveManager: createWaveManager(),
  choices: [], upgradeCards: [], restartRect: null,
  waveBannerText: '', waveBannerTime: 0,
  victoryShown: false, endless: false,
  pendingNovaCheck: false,
  input, audio, effects,
  onWaveStarted(wave) {
    state.waveBannerText = wave % 5 === 0 ? `WAVE ${wave} — DREADNOUGHT INBOUND` : `WAVE ${wave}`;
    state.waveBannerTime = 2;
  },
  onWaveCleared(wave) {
    const bonus = 100 + wave * 25;
    state.score += bonus;
    effects.addFloater(VIEW_W / 2, 240, `WAVE ${wave} CLEAR  +${bonus}`, '#34d399', 22);
    if (wave >= 10 && !state.victoryShown) {
      state.victoryShown = true;
      state.mode = 'victory';
      audio.victory();
    }
  },
};

function spawnBullet(props) { state.bullets.push(props); }
function spawnEnemyBullet(x, y, ux, uy, speed) {
  state.enemyBullets.push({
    x, y, vx: ux * speed, vy: uy * speed,
    damage: 9, friendly: false, radius: 5, life: 3.2, color: '#fda4af', piercing: 0,
  });
}

function startRun() {
  state.score = 0; state.kills = 0;
  state.level = 1; state.xp = 0; state.xpNeeded = xpForLevel(1);
  state.enemies.length = 0; state.bullets.length = 0;
  state.enemyBullets.length = 0; state.shards.length = 0;
  state.victoryShown = false; state.endless = false;
  state.waveBannerTime = 0;
  effects.clear();
  resetPlayer(state.player, VIEW_W / 2, VIEW_H / 2);
  state.waveManager = createWaveManager();
  startWave(state.waveManager, 1, VIEW_W, VIEW_H);
  state.onWaveStarted(1);
  state.mode = 'playing';
  audio.unlock();
}

function grantXp(amount) {
  state.xp += amount;
  if (state.xp >= state.xpNeeded && state.mode === 'playing') {
    state.xp -= state.xpNeeded;
    state.level += 1;
    state.xpNeeded = xpForLevel(state.level);
    state.choices = rollUpgradeChoices(3);
    state.mode = 'upgrade';
    audio.levelUp();
    effects.addFloater(state.player.x, state.player.y - 34, 'LEVEL UP!', '#fbbf24', 24);
  }
}

function forceLevelUp() {
  if (state.mode === 'title') startRun();
  state.choices = rollUpgradeChoices(3);
  state.mode = 'upgrade';
}

function applyChoice(choice) {
  choice.apply(state.player, state);
  audio.pickup();
  if (state.pendingNovaCheck) { state.pendingNovaCheck = false; resolveDeaths(); }
  state.mode = 'playing';
}

function dropShard(x, y, value) {
  state.shards.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, value, radius: 6, age: Math.random() * 6 });
}

function resolveDeaths() {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.hp > 0) continue;
    state.enemies.splice(i, 1);
    state.kills += 1;
    state.score += enemy.score;
    effects.explosion(enemy.x, enemy.y, enemy.color, enemy.type === 'boss');
    effects.addFloater(enemy.x, enemy.y - 14, `+${enemy.score}`, '#e0f2fe', enemy.type === 'boss' ? 22 : 14);
    effects.shake(enemy.type === 'boss' ? 13 : 4, enemy.type === 'boss' ? 0.45 : 0.18);
    audio.explosion(enemy.type === 'boss');
    const shardCount = enemy.type === 'boss' ? 8 : enemy.xp >= 2 ? 2 : 1;
    for (let s = 0; s < shardCount; s++) dropShard(enemy.x, enemy.y, 1);
    if (enemy.type === 'splitter') {
      for (let m = 0; m < 3; m++) {
        const a = (m / 3) * Math.PI * 2 + Math.random();
        const mini = createEnemy('mini', enemy.x + Math.cos(a) * 16, enemy.y + Math.sin(a) * 16, state.waveManager.wave);
        state.enemies.push(mini);
      }
    }
    if (enemy.type === 'boss') {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
      effects.addFloater(state.player.x, state.player.y - 30, '+20 HULL', '#34d399', 16);
    }
  }
}

function updatePlaying(dt) {
  state.time += dt;
  if (state.waveBannerTime > 0) state.waveBannerTime -= dt;
  updatePlayer(state.player, input, dt, effects, audio, spawnBullet);
  updateWaves(state.waveManager, dt, state);
  updateEnemies(state.enemies, state.player, dt, spawnEnemyBullet, audio);

  for (const list of [state.bullets, state.enemyBullets]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < 8 || b.x > VIEW_W - 8 || b.y < 8 || b.y > VIEW_H - 8) list.splice(i, 1);
    }
  }

  // Player bullets vs enemies.
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    let consumed = false;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const rr = enemy.radius + b.radius;
      if (Math.abs(enemy.x - b.x) < rr && Math.abs(enemy.y - b.y) < rr
        && Math.hypot(enemy.x - b.x, enemy.y - b.y) < rr) {
        enemy.hp -= b.damage;
        enemy.hitFlash = 0.09;
        effects.sparks(b.x, b.y, enemy.color);
        audio.hit();
        if (b.piercing > 0) { b.piercing -= 1; } else { consumed = true; }
        break;
      }
    }
    if (consumed) state.bullets.splice(i, 1);
  }
  resolveDeaths();

  // Enemy bullets vs player.
  if (state.player.alive) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      const rr = state.player.radius + b.radius;
      if (Math.hypot(state.player.x - b.x, state.player.y - b.y) < rr) {
        state.enemyBullets.splice(i, 1);
        damagePlayer(state.player, b.damage, effects, audio);
      }
    }
    // Contact damage.
    for (const enemy of state.enemies) {
      const rr = state.player.radius + enemy.radius - 2;
      if (Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y) < rr) {
        if (damagePlayer(state.player, enemy.contact, effects, audio)) {
          enemy.hp -= 2; enemy.hitFlash = 0.09;
        }
      }
    }
    resolveDeaths();
  }

  // Shards: drift, magnet, collect.
  for (let i = state.shards.length - 1; i >= 0; i--) {
    const s = state.shards[i];
    s.age += dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.vx *= (1 - 3 * dt); s.vy *= (1 - 3 * dt);
    const d = Math.hypot(state.player.x - s.x, state.player.y - s.y);
    if (state.player.alive && d < state.player.magnetRadius) {
      const pull = 420 * (1 - d / state.player.magnetRadius) + 120;
      s.x += ((state.player.x - s.x) / Math.max(1, d)) * pull * dt;
      s.y += ((state.player.y - s.y) / Math.max(1, d)) * pull * dt;
    }
    if (state.player.alive && d < state.player.radius + s.radius + 4) {
      state.shards.splice(i, 1);
      audio.pickup();
      effects.sparks(s.x, s.y, '#818cf8');
      grantXp(s.value);
      if (state.mode !== 'playing') return;
    }
  }

  if (!state.player.alive && state.mode === 'playing') {
    state.mode = 'gameover';
    audio.gameOver();
  }
  effects.update(dt);
  audio.updateMusic(dt, true);
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(103,232,249,0.3)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 3.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of state.enemyBullets) {
    ctx.fillStyle = '#fb7185';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe4e6';
    ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawShards() {
  for (const s of state.shards) {
    const pulse = 1 + 0.2 * Math.sin(s.age * 6);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.age * 2);
    ctx.fillStyle = '#818cf8';
    const r = s.radius * pulse;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }
}

function render() {
  const offset = effects.shakeOffset();
  ctx.save();
  ctx.translate(offset.x, offset.y);
  drawBackground(ctx, starfield, state.time, state.player.vx, state.player.vy);
  drawArenaFrame(ctx, state.time);
  drawShards();
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.time);
  drawPlayer(ctx, state.player, state.time);
  drawBullets();
  effects.draw(ctx);
  ctx.restore();

  if (state.mode === 'title') drawTitle(ctx, state, state.time);
  else {
    drawHud(ctx, state);
    if (state.mode === 'upgrade') drawUpgradeScreen(ctx, state);
    if (state.mode === 'paused') drawPause(ctx, state);
    if (state.mode === 'gameover') drawGameOver(ctx, state);
    if (state.mode === 'victory') drawVictory(ctx, state);
  }
}

function handleClicks() {
  if (!input.mouse.clicked) return;
  audio.unlock();
  const { clickX: x, clickY: y } = input.mouse;
  if (state.mode === 'title') { startRun(); return; }
  if (state.mode === 'upgrade') {
    for (const card of state.upgradeCards) {
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
        applyChoice(card.choice);
        return;
      }
    }
    return;
  }
  if (state.mode === 'gameover' && state.restartRect) {
    const r = state.restartRect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) startRun();
    return;
  }
  if (state.mode === 'victory') { state.endless = true; state.mode = 'playing'; }
}

function handleKeys() {
  if (input.wasPressed('m')) audio.toggleMute();
  if (state.mode === 'title' && (input.wasPressed('enter'))) startRun();
  else if (state.mode === 'playing' && (input.wasPressed('p') || input.wasPressed('escape'))) state.mode = 'paused';
  else if (state.mode === 'paused' && (input.wasPressed('p') || input.wasPressed('escape'))) state.mode = 'playing';
  else if (state.mode === 'upgrade') {
    const idx = input.wasPressed('1') ? 0 : input.wasPressed('2') ? 1 : input.wasPressed('3') ? 2 : -1;
    if (idx >= 0 && state.choices[idx]) applyChoice(state.choices[idx]);
  } else if (state.mode === 'gameover' && input.wasPressed('enter')) startRun();
  else if (state.mode === 'victory' && input.wasPressed('enter')) { state.endless = true; state.mode = 'playing'; }
}

let lastTimestamp = 0;
function frame(timestamp) {
  requestAnimationFrame(frame);
  const rawDt = Math.min(0.05, Math.max(0, (timestamp - lastTimestamp) / 1000 || 0.016));
  lastTimestamp = timestamp;
  handleClicks();
  handleKeys();
  if (state.mode === 'playing') updatePlaying(rawDt);
  else {
    state.time += rawDt;
    effects.update(rawDt);
    audio.updateMusic(rawDt, false);
  }
  render();
  input.endFrame();
  const status = document.getElementById('status');
  if (status) status.textContent = `STARFALL ARENA — mode ${state.mode}, wave ${state.waveManager.wave}, score ${state.score}`;
}

// --- Deterministic scenes for screenshots (?scene=...) ---
function setupScene(name) {
  if (name === 'title') { state.mode = 'title'; return; }
  startRun();
  if (name === 'gameplay') {
    state.waveManager.spawnQueue = [];
    state.waveManager.phase = 'fighting';
    state.waveManager.wave = 3;
    state.waveBannerText = 'WAVE 3';
    state.waveBannerTime = 1.4;
    state.score = 2450; state.kills = 27; state.level = 3;
    state.xp = 6; state.xpNeeded = 13;
    state.player.x = 470; state.player.y = 430;
    state.player.hp = 74;
    const demo = [
      ['chaser', 830, 250], ['chaser', 920, 420], ['weaver', 760, 560],
      ['splitter', 300, 210], ['shooter', 1020, 200], ['weaver', 240, 580],
      ['chaser', 660, 180],
    ];
    for (const [type, x, y] of demo) state.enemies.push(createEnemy(type, x, y, 3));
    for (let i = 0; i < 7; i++) {
      state.bullets.push({ x: 500 + i * 34, y: 408 - i * 13, vx: 760, vy: -240, damage: 1, piercing: 0, friendly: true, radius: 4, life: 1, color: '#67e8f9' });
    }
    state.enemyBullets.push({ x: 900, y: 260, vx: -200, vy: 120, damage: 9, friendly: false, radius: 5, life: 3, color: '#fda4af', piercing: 0 });
    state.enemyBullets.push({ x: 860, y: 300, vx: -200, vy: 120, damage: 9, friendly: false, radius: 5, life: 3, color: '#fda4af', piercing: 0 });
    for (let i = 0; i < 6; i++) dropShard(560 + i * 36, 500 - i * 16, 1);
    effects.explosion(830, 250, '#f472b6', false);
    effects.addFloater(830, 210, '+100', '#e0f2fe', 15);
    state.mode = 'playing';
  } else if (name === 'upgrade') {
    state.score = 1800; state.kills = 19; state.level = 2;
    state.waveManager.spawnQueue = [];
    state.waveManager.phase = 'fighting';
    state.waveManager.wave = 2;
    state.waveBannerTime = 0;
    state.enemies.push(createEnemy('chaser', 900, 300, 2));
    state.enemies.push(createEnemy('weaver', 260, 540, 2));
    forceLevelUp();
  } else if (name === 'gameover') {
    state.score = 6840; state.kills = 63; state.level = 5;
    state.waveManager.spawnQueue = [];
    state.waveManager.phase = 'fighting';
    state.waveManager.wave = 7;
    state.waveBannerTime = 0;
    state.player.hp = 0;
    state.player.alive = false;
    state.mode = 'gameover';
  } else if (name === 'victory') {
    state.score = 12400; state.kills = 118; state.level = 8;
    state.waveManager.spawnQueue = [];
    state.waveManager.phase = 'fighting';
    state.waveManager.wave = 10;
    state.waveBannerTime = 0;
    state.mode = 'victory';
  }
}

const sceneParam = new URLSearchParams(window.location.search).get('scene');
if (sceneParam) setupScene(sceneParam);

window.__STARFALL__ = {
  state,
  startRun,
  setWave(n) {
    if (state.mode === 'title') startRun();
    state.enemies.length = 0;
    state.waveManager.spawnQueue = [];
    startWave(state.waveManager, n, VIEW_W, VIEW_H);
    state.mode = 'playing';
  },
  grantXp, forceLevelUp,
  forceGameOver() { state.player.hp = 0; state.player.alive = false; state.mode = 'gameover'; },
  forceVictory() { state.victoryShown = true; state.mode = 'victory'; },
};

requestAnimationFrame(frame);
