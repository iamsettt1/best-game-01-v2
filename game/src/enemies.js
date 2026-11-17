// enemies.js — every hostile in STARFALL ARENA: Chaser, Weaver,
// Splitter (and its Minis), Shooter, and the multi-phase Boss. Each type
// has its own movement, firing pattern, colour and silhouette.

export const ENEMY_TYPES = {
  chaser: { hp: 3, speed: 118, radius: 13, score: 100, xp: 1, color: '#f472b6', contact: 12 },
  weaver: { hp: 2, speed: 132, radius: 12, score: 150, xp: 1, color: '#c084fc', contact: 10 },
  splitter: { hp: 5, speed: 84, radius: 17, score: 200, xp: 2, color: '#34d399', contact: 12 },
  mini: { hp: 1, speed: 178, radius: 8, score: 60, xp: 1, color: '#6ee7b7', contact: 8 },
  shooter: { hp: 4, speed: 96, radius: 14, score: 250, xp: 2, color: '#fbbf24', contact: 10 },
  boss: { hp: 130, speed: 52, radius: 44, score: 2500, xp: 14, color: '#fb7185', contact: 22 },
};

let nextEnemyId = 1;

export function createEnemy(type, x, y, waveScale) {
  const base = ENEMY_TYPES[type];
  const hpBoost = type === 'boss' ? 1 + (waveScale - 1) * 0.35 : 1 + (waveScale - 1) * 0.12;
  return {
    id: nextEnemyId++,
    type, x, y, vx: 0, vy: 0,
    hp: Math.round(base.hp * hpBoost),
    maxHp: Math.round(base.hp * hpBoost),
    speed: base.speed * (1 + (waveScale - 1) * 0.045),
    radius: base.radius,
    score: base.score, xp: base.xp, color: base.color, contact: base.contact,
    age: Math.random() * 10,
    fireTimer: 1 + Math.random() * 1.4,
    burstTimer: 2.4,
    phase: 1,
    hitFlash: 0,
    wobbleSeed: Math.random() * Math.PI * 2,
  };
}

export function updateEnemies(enemies, player, dt, spawnEnemyBullet, audio) {
  for (const enemy of enemies) {
    enemy.age += dt;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / dist;
    const uy = dy / dist;

    if (enemy.type === 'chaser' || enemy.type === 'mini') {
      enemy.vx = ux * enemy.speed; enemy.vy = uy * enemy.speed;
    } else if (enemy.type === 'weaver') {
      const sway = Math.sin(enemy.age * 4.4 + enemy.wobbleSeed) * 0.85;
      const px = -uy * sway; const py = ux * sway;
      enemy.vx = (ux + px) * enemy.speed; enemy.vy = (uy + py) * enemy.speed;
    } else if (enemy.type === 'splitter') {
      const pulse = 1 + 0.18 * Math.sin(enemy.age * 3);
      enemy.vx = ux * enemy.speed * pulse; enemy.vy = uy * enemy.speed * pulse;
    } else if (enemy.type === 'shooter') {
      const desired = 250;
      const radial = dist > desired + 30 ? 1 : dist < desired - 30 ? -0.8 : 0;
      const orbit = 0.55;
      enemy.vx = (ux * radial + -uy * orbit) * enemy.speed;
      enemy.vy = (uy * radial + ux * orbit) * enemy.speed;
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && dist < 560 && player.alive) {
        enemy.fireTimer = 1.7 + Math.random() * 0.7;
        spawnEnemyBullet(enemy.x, enemy.y, ux, uy, 265);
        audio.enemyShoot();
      }
    } else if (enemy.type === 'boss') {
      updateBoss(enemy, player, dt, dist, ux, uy, spawnEnemyBullet, audio);
    }
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
  }
}

function updateBoss(enemy, player, dt, dist, ux, uy, spawnEnemyBullet, audio) {
  const hpFrac = enemy.hp / enemy.maxHp;
  enemy.phase = hpFrac > 0.66 ? 1 : hpFrac > 0.33 ? 2 : 3;
  const speedMul = enemy.phase === 3 ? 1.5 : enemy.phase === 2 ? 1.2 : 1;
  const desired = enemy.phase === 1 ? 300 : 230;
  const radial = dist > desired ? 1 : -0.4;
  const orbitDir = Math.sin(enemy.age * 0.4) > 0 ? 1 : -1;
  enemy.vx = (ux * radial + -uy * 0.5 * orbitDir) * enemy.speed * speedMul;
  enemy.vy = (uy * radial + ux * 0.5 * orbitDir) * enemy.speed * speedMul;

  enemy.fireTimer -= dt;
  if (enemy.fireTimer <= 0 && player.alive) {
    enemy.fireTimer = enemy.phase === 3 ? 1.15 : 1.6;
    const aimed = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const shots = enemy.phase === 1 ? 3 : 5;
    for (let i = 0; i < shots; i++) {
      const a = aimed + (i - (shots - 1) / 2) * 0.22;
      spawnEnemyBullet(enemy.x, enemy.y, Math.cos(a), Math.sin(a), 240);
    }
    audio.enemyShoot();
  }
  enemy.burstTimer -= dt;
  if (enemy.burstTimer <= 0 && player.alive) {
    enemy.burstTimer = enemy.phase === 3 ? 2.6 : 3.6;
    const count = enemy.phase === 1 ? 12 : 18;
    const baseAngle = enemy.age;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i / count) * Math.PI * 2;
      spawnEnemyBullet(enemy.x, enemy.y, Math.cos(a), Math.sin(a), 175);
    }
    audio.enemyShoot();
  }
}

export function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.hitFlash > 0;
  const body = flash ? '#ffffff' : enemy.color;
  ctx.lineWidth = 2;

  if (enemy.type === 'chaser' || enemy.type === 'mini') {
    const angle = Math.atan2(enemy.vy, enemy.vx);
    ctx.rotate(angle);
    const r = enemy.radius;
    ctx.fillStyle = '#2a0a1e'; ctx.strokeStyle = body;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, -r * 0.75); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.8, r * 0.75);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'weaver') {
    ctx.rotate(Math.sin(enemy.age * 4.4 + enemy.wobbleSeed) * 0.5);
    const r = enemy.radius;
    ctx.fillStyle = '#1d0b33'; ctx.strokeStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body;
    ctx.fillRect(-2.5, -2.5, 5, 5);
  } else if (enemy.type === 'splitter') {
    const r = enemy.radius * (1 + 0.06 * Math.sin(enemy.age * 3));
    ctx.fillStyle = '#06281c'; ctx.strokeStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body;
    for (let i = 0; i < 3; i++) {
      const a = enemy.age * 1.4 + (i / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 4, 0, Math.PI * 2); ctx.fill();
    }
  } else if (enemy.type === 'shooter') {
    const r = enemy.radius;
    ctx.fillStyle = '#2b1d05'; ctx.strokeStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + enemy.age * 0.7;
      const px = Math.cos(a) * r; const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'boss') {
    drawBoss(ctx, enemy, body, time);
  }
  ctx.restore();

  // Mini HP ticks for tougher regular enemies.
  if (enemy.type !== 'boss' && enemy.hp < enemy.maxHp && enemy.maxHp >= 4) {
    const w = enemy.radius * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, w, 3);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, w * (enemy.hp / enemy.maxHp), 3);
  }
}

function drawBoss(ctx, enemy, body, time) {
  const r = enemy.radius;
  ctx.rotate(time * 0.35);
  ctx.fillStyle = '#2b0a14'; ctx.strokeStyle = body; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const px = Math.cos(a) * rr; const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(-time * 0.8);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = enemy.phase === 3 ? '#ffffff' : '#fb7185';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.26 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.fill();
}
