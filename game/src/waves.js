// waves.js — wave composition and spawning for STARFALL ARENA.
// Wave N grows in size and speed, unlocks new enemy types over time,
// and every fifth wave is a boss wave with escorts.

import { createEnemy } from './enemies.js';

export function isBossWave(wave) {
  return wave % 5 === 0;
}

export function waveComposition(wave) {
  const list = [];
  if (isBossWave(wave)) {
    list.push('boss');
    const escorts = 2 + Math.floor(wave / 5);
    for (let i = 0; i < escorts; i++) list.push(i % 2 === 0 ? 'chaser' : 'weaver');
    return list;
  }
  const total = 4 + wave * 2;
  for (let i = 0; i < total; i++) {
    const roll = Math.random();
    if (wave >= 4 && roll < 0.16) list.push('shooter');
    else if (wave >= 3 && roll < 0.36) list.push('splitter');
    else if (wave >= 2 && roll < 0.62) list.push('weaver');
    else list.push('chaser');
  }
  return list;
}

export function createWaveManager() {
  return {
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    phase: 'between',
    announcedWave: 0,
  };
}

export function startWave(manager, wave, width, height) {
  manager.wave = wave;
  manager.spawnQueue = waveComposition(wave);
  manager.spawnTimer = 0.4;
  manager.phase = 'spawning';
  manager.announcedWave = wave;
}

function spawnPoint(width, height, player) {
  // Spawn on the arena edge, away from the player.
  for (let attempt = 0; attempt < 8; attempt++) {
    const side = Math.floor(Math.random() * 4);
    let x; let y;
    const m = 52;
    if (side === 0) { x = m + Math.random() * (width - m * 2); y = m; }
    else if (side === 1) { x = m + Math.random() * (width - m * 2); y = height - m; }
    else if (side === 2) { x = m; y = m + Math.random() * (height - m * 2); }
    else { x = width - m; y = m + Math.random() * (height - m * 2); }
    if (!player || Math.hypot(x - player.x, y - player.y) > 240 || attempt === 7) return { x, y };
  }
  return { x: 60, y: 60 };
}

export function updateWaves(manager, dt, state) {
  if (manager.phase === 'spawning') {
    manager.spawnTimer -= dt;
    if (manager.spawnTimer <= 0 && manager.spawnQueue.length > 0) {
      manager.spawnTimer = manager.wave % 5 === 0 ? 0.7 : Math.max(0.28, 0.85 - manager.wave * 0.05);
      const type = manager.spawnQueue.shift();
      const point = spawnPoint(state.width, state.height, state.player);
      state.enemies.push(createEnemy(type, point.x, point.y, manager.wave));
      state.effects.burst(point.x, point.y, '#f472b6', 8, 120, 0.3, 2);
    }
    if (manager.spawnQueue.length === 0) manager.phase = 'fighting';
  } else if (manager.phase === 'fighting') {
    if (state.enemies.length === 0) {
      manager.phase = 'between';
      manager.betweenTimer = 2.2;
      state.onWaveCleared(manager.wave);
    }
  } else if (manager.phase === 'between') {
    manager.betweenTimer -= dt;
    if (manager.betweenTimer <= 0) {
      startWave(manager, manager.wave + 1, state.width, state.height);
      state.onWaveStarted(manager.wave);
    }
  }
}
