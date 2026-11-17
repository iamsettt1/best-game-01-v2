// render.js — background, parallax starfield, nebula gradient and the
// arena frame for STARFALL ARENA. Everything is drawn procedurally on
// the canvas; there are no image assets.

export const ARENA = { margin: 28 };

export function createStarfield(width, height) {
  const layers = [];
  const specs = [
    { count: 90, speed: 6, size: 1, alpha: 0.45 },
    { count: 60, speed: 14, size: 1.6, alpha: 0.7 },
    { count: 30, speed: 26, size: 2.4, alpha: 1 },
  ];
  for (const spec of specs) {
    const stars = [];
    for (let i = 0; i < spec.count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    layers.push({ ...spec, stars });
  }
  return { layers, width, height };
}

export function drawBackground(ctx, starfield, time, playerVx, playerVy) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#070b24');
  gradient.addColorStop(0.55, '#050816');
  gradient.addColorStop(1, '#0a0620');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Soft nebula blobs, drifting very slowly.
  const blobs = [
    { x: w * 0.22, y: h * 0.28, r: 300, color: 'rgba(38,20,90,0.35)' },
    { x: w * 0.8, y: h * 0.65, r: 360, color: 'rgba(10,60,80,0.28)' },
    { x: w * 0.6, y: h * 0.15, r: 220, color: 'rgba(90,16,70,0.22)' },
  ];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const bx = b.x + Math.sin(time * 0.05 + i * 2.1) * 24;
    const by = b.y + Math.cos(time * 0.04 + i * 1.7) * 18;
    const radial = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
    radial.addColorStop(0, b.color);
    radial.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2);
  }

  // Parallax stars drift opposite the player's motion.
  for (const layer of starfield.layers) {
    for (const star of layer.stars) {
      star.x -= (layer.speed * 0.016 + playerVx * 0.008 * layer.speed * 0.04);
      star.y -= (layer.speed * 0.006 + playerVy * 0.008 * layer.speed * 0.04);
      if (star.x < -4) star.x += w + 8;
      if (star.x > w + 4) star.x -= w + 8;
      if (star.y < -4) star.y += h + 8;
      if (star.y > h + 4) star.y -= h + 8;
      const tw = 0.65 + 0.35 * Math.sin(time * 2 + star.twinkle);
      ctx.globalAlpha = layer.alpha * tw;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(star.x, star.y, layer.size, layer.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawArenaFrame(ctx, time) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const m = ARENA.margin;
  const pulse = 0.55 + 0.25 * Math.sin(time * 1.6);
  ctx.strokeStyle = `rgba(34,211,238,${pulse.toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(34,211,238,0.12)';
  ctx.lineWidth = 8;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  // Corner brackets.
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  const len = 26;
  const corners = [
    [m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1],
  ];
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of corners) {
    ctx.moveTo(cx + len * sx, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + len * sy);
  }
  ctx.stroke();
}

export function clampToArena(entity, radius) {
  const canvas = document.getElementById('arena');
  const w = canvas ? canvas.width : 1280;
  const h = canvas ? canvas.height : 800;
  const m = ARENA.margin + radius;
  entity.x = Math.max(m, Math.min(w - m, entity.x));
  entity.y = Math.max(m, Math.min(h - m, entity.y));
}
