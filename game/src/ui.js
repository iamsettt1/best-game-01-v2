// ui.js — HUD, title screen, upgrade cards, pause, game-over and
// victory screens for STARFALL ARENA. All UI is drawn on the canvas so
// screenshots show the complete game loop.

function panel(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill(); ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawHud(ctx, state) {
  const { player, score, kills } = state;
  const w = ctx.canvas.width;
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`SCORE ${score}`, 44, 58);
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`KILLS ${kills}`, 44, 80);

  ctx.textAlign = 'center';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = state.waveManager.wave % 5 === 0 && state.enemies.some((e) => e.type === 'boss') ? '#fb7185' : '#e0f2fe';
  ctx.fillText(`WAVE ${state.waveManager.wave}`, w / 2, 58);
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`ENEMIES ${state.enemies.length + state.waveManager.spawnQueue.length}`, w / 2, 78);

  ctx.textAlign = 'right';
  ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`LEVEL ${state.level}`, w - 44, 54);
  ctx.fillStyle = state.audio.muted ? '#64748b' : '#94a3b8';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(state.audio.muted ? 'SOUND OFF [M]' : 'SOUND ON [M]', w - 44, 74);

  // Hull bar with heart pips.
  const hpFrac = player.hp / player.maxHp;
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fda4af';
  ctx.fillText('♥ HULL', 44, 108);
  bar(ctx, 44, 114, 230, 14, hpFrac, hpFrac > 0.3 ? '#22d3ee' : '#fb7185', 'rgba(255,255,255,0.1)');
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 282, 126);

  // XP bar along the bottom of the arena.
  const h = ctx.canvas.height;
  const xpFrac = state.xp / state.xpNeeded;
  ctx.fillStyle = '#a5b4fc';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`XP — LEVEL ${state.level}`, 44, h - 48);
  bar(ctx, 44, h - 42, w - 88, 10, xpFrac, '#818cf8', 'rgba(255,255,255,0.1)');

  // Dash cooldown indicator.
  const dashFrac = 1 - Math.max(0, player.dashCooldown) / player.dashCooldownMax;
  ctx.fillStyle = dashFrac >= 1 ? '#67e8f9' : '#64748b';
  ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dashFrac >= 1 ? 'DASH READY [SHIFT]' : 'DASH CHARGING…', 44, 148);
  bar(ctx, 44, 154, 140, 7, dashFrac, '#22d3ee', 'rgba(255,255,255,0.1)');

  // Boss HP bar.
  const boss = state.enemies.find((e) => e.type === 'boss');
  if (boss) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fb7185';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`⚠ DREADNOUGHT — PHASE ${boss.phase} ⚠`, w / 2, 104);
    bar(ctx, w / 2 - 220, 112, 440, 12, boss.hp / boss.maxHp, '#fb7185', 'rgba(255,255,255,0.1)');
  }

  if (state.waveBannerTime > 0) {
    ctx.globalAlpha = Math.min(1, state.waveBannerTime);
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(state.waveBannerText, w / 2, 190);
    ctx.globalAlpha = 1;
  }
}

export function drawTitle(ctx, state, time) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(3,6,20,0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  const glowPulse = 0.7 + 0.3 * Math.sin(time * 2.2);
  ctx.font = 'bold 84px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = `rgba(34,211,238,${glowPulse.toFixed(3)})`;
  ctx.fillText('STARFALL', w / 2, h * 0.3);
  ctx.fillStyle = '#f472b6';
  ctx.fillText('ARENA', w / 2, h * 0.3 + 82);
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('One ship. Endless waves. Clear the sector by Wave 10.', w / 2, h * 0.3 + 126);

  panel(ctx, w / 2 - 300, h * 0.52, 600, 132, 'rgba(8,15,35,0.85)', 'rgba(34,211,238,0.4)');
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  const lines = [
    'WASD / Arrows — Move        Mouse — Aim',
    'Click / Hold or Space — Fire    Shift — Dash',
    'Collect XP shards, level up, choose upgrades',
    'P / Esc — Pause      M — Mute',
  ];
  lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.52 + 36 + i * 26));

  const blink = Math.floor(time * 2) % 2 === 0;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = blink ? '#fbbf24' : '#b45309';
  ctx.fillText('▶  CLICK OR PRESS ENTER TO LAUNCH', w / 2, h * 0.52 + 178);
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Survive the Chasers, Weavers, Splitters and Shooters — beware the Dreadnought every 5 waves.', w / 2, h - 52);
}

export function drawUpgradeScreen(ctx, state) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(3,6,20,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`LEVEL ${state.level} — CHOOSE AN UPGRADE`, w / 2, 168);
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Click a card or press 1 · 2 · 3 — the arena is paused', w / 2, 198);

  const cardW = 300; const cardH = 240; const gap = 28;
  const totalW = cardW * 3 + gap * 2;
  const startX = (w - totalW) / 2;
  const y = 250;
  state.upgradeCards = [];
  state.choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const hover = state.input.mouse.x >= x && state.input.mouse.x <= x + cardW
      && state.input.mouse.y >= y && state.input.mouse.y <= y + cardH;
    panel(ctx, x, y, cardW, cardH, hover ? 'rgba(20,32,60,0.97)' : 'rgba(10,18,40,0.95)', choice.color);
    ctx.fillStyle = choice.color;
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(choice.icon, x + cardW / 2, y + 78);
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(choice.name, x + cardW / 2, y + 122);
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    wrapText(ctx, choice.blurb, x + cardW / 2, y + 154, cardW - 36, 20);
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = choice.color;
    ctx.fillText(`[ ${i + 1} ]`, x + cardW / 2, y + cardH - 18);
    state.upgradeCards.push({ x, y, w: cardW, h: cardH, choice });
  });
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) { lines.push(line); line = word; }
    else line = trial;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

export function drawPause(ctx, state) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(3,6,20,0.66)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('PAUSED', w / 2, h / 2 - 20);
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Press P or Esc to resume', w / 2, h / 2 + 24);
}

export function drawGameOver(ctx, state) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(20,4,12,0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fb7185';
  ctx.fillText('SHIP DOWN', w / 2, 210);
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('The sector remembers your stand, pilot.', w / 2, 246);
  panel(ctx, w / 2 - 230, 280, 460, 168, 'rgba(10,14,32,0.92)', 'rgba(251,113,133,0.5)');
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`FINAL SCORE   ${state.score}`, w / 2, 326);
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Wave reached   ${state.waveManager.wave}`, w / 2, 362);
  ctx.fillText(`Kills   ${state.kills}      Level   ${state.level}`, w / 2, 396);
  drawRestartButton(ctx, state, w / 2, 486);
}

export function drawVictory(ctx, state) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = 'rgba(4,20,14,0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = 'bold 62px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('★ SECTOR CLEARED ★', w / 2, 210);
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('You survived to Wave 10. The arena is yours.', w / 2, 246);
  panel(ctx, w / 2 - 230, 280, 460, 168, 'rgba(8,24,20,0.92)', 'rgba(52,211,153,0.55)');
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`SCORE   ${state.score}`, w / 2, 326);
  ctx.font = '19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Wave reached   ${state.waveManager.wave}`, w / 2, 362);
  ctx.fillText(`Kills   ${state.kills}      Level   ${state.level}`, w / 2, 396);
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('ENDLESS MODE — CLICK OR ENTER TO KEEP FLYING', w / 2, 492);
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('Waves keep escalating. How long can you last?', w / 2, 522);
}

function drawRestartButton(ctx, state, cx, y) {
  const w = 260; const h = 56;
  const x = cx - w / 2;
  const hover = state.input.mouse.x >= x && state.input.mouse.x <= x + w
    && state.input.mouse.y >= y && state.input.mouse.y <= y + h;
  panel(ctx, x, y, w, h, hover ? 'rgba(34,211,238,0.3)' : 'rgba(15,30,55,0.95)', '#22d3ee');
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('↻  RESTART', cx, y + 37);
  state.restartRect = { x, y, w, h };
}
