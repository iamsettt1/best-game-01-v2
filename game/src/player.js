// player.js — the player's starfighter for STARFALL ARENA: movement,
// dashing, firing, shield, and the vector ship drawing with engine glow.

import { clampToArena } from './render.js';

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    radius: 13,
    angle: -Math.PI / 2,
    hp: 100, maxHp: 100,
    speed: 330,
    fireCooldown: 0,
    fireRate: 7,
    bulletDamage: 1,
    bulletCount: 1,
    piercing: 0,
    magnetRadius: 90,
    dashCooldown: 0,
    dashCooldownMax: 2.2,
    dashTime: 0,
    invulnerableTime: 0,
    shieldTime: 0,
    alive: true,
    thrust: 0,
  };
}

export function resetPlayer(player, x, y) {
  const fresh = createPlayer(x, y);
  Object.assign(player, fresh);
}

export function updatePlayer(player, input, dt, effects, audio, spawnBullet) {
  if (!player.alive) return;
  const ax = input.axisX();
  const ay = input.axisY();
  const moving = ax !== 0 || ay !== 0;
  const norm = moving ? 1 / Math.hypot(ax, ay) : 0;

  const dashing = player.dashTime > 0;
  const currentSpeed = dashing ? player.speed * 3.1 : player.speed;
  const targetVx = ax * norm * currentSpeed;
  const targetVy = ay * norm * currentSpeed;
  const blend = dashing ? 1 : Math.min(1, dt * 14);
  player.vx += (targetVx - player.vx) * blend;
  player.vy += (targetVy - player.vy) * blend;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  clampToArena(player, player.radius);
  player.thrust = moving || dashing ? Math.min(1, player.thrust + dt * 8) : Math.max(0, player.thrust - dt * 6);

  player.angle = Math.atan2(input.mouse.y - player.y, input.mouse.x - player.x);

  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.dashTime > 0) player.dashTime -= dt;
  if (player.invulnerableTime > 0) player.invulnerableTime -= dt;
  if (player.shieldTime > 0) player.shieldTime -= dt;

  if (input.dashRequested() && player.dashCooldown <= 0 && moving) {
    player.dashTime = 0.16;
    player.dashCooldown = player.dashCooldownMax;
    player.invulnerableTime = Math.max(player.invulnerableTime, 0.22);
    effects.burst(player.x, player.y, '#22d3ee', 14, 180, 0.35, 2.2);
    audio.dash();
  }
  if (dashing) effects.trail(player.x, player.y, '#22d3ee');

  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (input.firing() && player.fireCooldown <= 0) {
    player.fireCooldown = 1 / player.fireRate;
    fireGuns(player, spawnBullet);
    audio.shoot();
  }
}

function fireGuns(player, spawnBullet) {
  const spreadStep = 0.11;
  const count = player.bulletCount;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spreadStep;
    const angle = player.angle + offset;
    const noseX = player.x + Math.cos(player.angle) * 16;
    const noseY = player.y + Math.sin(player.angle) * 16;
    spawnBullet({
      x: noseX, y: noseY,
      vx: Math.cos(angle) * 760,
      vy: Math.sin(angle) * 760,
      damage: player.bulletDamage,
      piercing: player.piercing,
      friendly: true,
      radius: 4,
      life: 1.1,
      color: '#67e8f9',
    });
  }
}

export function damagePlayer(player, amount, effects, audio) {
  if (!player.alive || player.invulnerableTime > 0) return false;
  if (player.shieldTime > 0) {
    player.shieldTime = 0;
    player.invulnerableTime = 0.6;
    effects.burst(player.x, player.y, '#fbbf24', 18, 240, 0.4, 2.4);
    effects.addFloater(player.x, player.y - 26, 'SHIELD BLOCK', '#fbbf24', 14);
    audio.hit();
    return false;
  }
  player.hp -= amount;
  player.invulnerableTime = 0.55;
  effects.shake(7, 0.25);
  effects.flash('255,60,90', 0.16);
  effects.burst(player.x, player.y, '#fb7185', 16, 240, 0.45, 2.4);
  audio.playerHit();
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    effects.explosion(player.x, player.y, '#22d3ee', true);
    effects.explosion(player.x, player.y, '#f472b6', false);
    effects.shake(14, 0.5);
    audio.explosion(true);
  }
  return true;
}

export function drawPlayer(ctx, player, time) {
  if (!player.alive) return;
  const blink = player.invulnerableTime > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // Engine glow and flame.
  const flame = 10 + player.thrust * 12 + Math.sin(time * 30) * 3;
  const glow = ctx.createRadialGradient(-12, 0, 0, -12, 0, 26);
  glow.addColorStop(0, 'rgba(251,191,36,0.75)');
  glow.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(-12, 0, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-11, -4); ctx.lineTo(-11 - flame, 0); ctx.lineTo(-11, 4); ctx.closePath(); ctx.fill();

  // Hull: sleek arrow ship.
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.fillStyle = '#0e2a3a';
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-8, -11); ctx.lineTo(-13, -5);
  ctx.lineTo(-10, 0); ctx.lineTo(-13, 5); ctx.lineTo(-8, 11);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a5f3fc';
  ctx.beginPath(); ctx.arc(4, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (player.shieldTime > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(251,191,36,${0.55 + 0.3 * Math.sin(time * 6)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
