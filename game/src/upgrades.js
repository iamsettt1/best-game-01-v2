// upgrades.js — the level-up upgrade pool for STARFALL ARENA.
// On each level the game pauses and offers three distinct cards drawn
// from this pool; each upgrade stacks and visibly changes the ship.

export const UPGRADES = [
  {
    id: 'rapid', name: 'Rapid Fire', icon: '»', color: '#22d3ee',
    blurb: '+22% fire rate. Hold the trigger and shred.',
    apply(player) { player.fireRate = Math.min(22, player.fireRate * 1.22); },
  },
  {
    id: 'twin', name: 'Twin Cannons', icon: '⫴', color: '#f472b6',
    blurb: '+1 projectile per shot, wider spread.',
    apply(player) { player.bulletCount = Math.min(5, player.bulletCount + 1); },
  },
  {
    id: 'pierce', name: 'Piercing Rounds', icon: '➤', color: '#c084fc',
    blurb: 'Shots pierce +1 enemy and hit harder.',
    apply(player) { player.piercing += 1; player.bulletDamage += 0.35; },
  },
  {
    id: 'magnet', name: 'Magnet Core', icon: '◎', color: '#34d399',
    blurb: '+70% XP magnet radius. Vacuum the shards.',
    apply(player) { player.magnetRadius *= 1.7; },
  },
  {
    id: 'shield', name: 'Shield Plating', icon: '⬡', color: '#fbbf24',
    blurb: '+25 max hull and a shield that blocks one hit.',
    apply(player) {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
      player.shieldTime = 9999;
    },
  },
  {
    id: 'dash', name: 'Dash Surge', icon: '⚡', color: '#67e8f9',
    blurb: 'Dash recharges 35% faster, ship +8% speed.',
    apply(player) {
      player.dashCooldownMax = Math.max(0.7, player.dashCooldownMax * 0.65);
      player.speed *= 1.08;
    },
  },
  {
    id: 'nova', name: 'Nova Burst', icon: '✦', color: '#fb7185',
    blurb: 'Detonate now: heavy damage to every enemy on screen.',
    apply(player, state) {
      if (!state) return;
      for (const enemy of state.enemies) {
        enemy.hp -= 6;
        enemy.hitFlash = 0.15;
        state.effects.burst(enemy.x, enemy.y, '#fb7185', 6, 160, 0.35, 2);
      }
      state.effects.shake(9, 0.3);
      state.effects.flash('251,113,133', 0.14);
      state.pendingNovaCheck = true;
    },
  },
];

export function rollUpgradeChoices(count) {
  const pool = [...UPGRADES];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

export function xpForLevel(level) {
  return 5 + (level - 1) * 4;
}
