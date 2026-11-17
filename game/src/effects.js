// effects.js — particles, screen shake, hit flashes and floating score
// text for STARFALL ARENA. Pure feedback juice: nothing here changes
// gameplay, everything here makes actions feel physical.

export function createEffects() {
  const particles = [];
  const floaters = [];
  let shakeMagnitude = 0;
  let shakeTime = 0;
  let shakeDuration = 0.001;
  let flashAlpha = 0;
  let flashColor = '255,60,90';

  function burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.9);
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.5 + Math.random() * 0.8),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.9),
        color,
      });
    }
    if (particles.length > 900) particles.splice(0, particles.length - 900);
  }

  return {
    particles,
    floaters,
    burst,
    explosion(x, y, color, big) {
      burst(x, y, color, big ? 46 : 20, big ? 320 : 220, big ? 0.9 : 0.55, big ? 3.4 : 2.4);
      burst(x, y, '#ffffff', big ? 14 : 6, 160, 0.3, 2);
    },
    trail(x, y, color) {
      particles.push({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.32, maxLife: 0.32, size: 2.2, color,
      });
    },
    sparks(x, y, color) { burst(x, y, color, 8, 200, 0.3, 1.8); },
    addFloater(x, y, text, color, size) {
      floaters.push({ x, y, text, color, size: size || 15, life: 1.1, maxLife: 1.1 });
      if (floaters.length > 40) floaters.shift();
    },
    shake(amount, duration) {
      if (amount > shakeMagnitude || shakeTime <= 0) {
        shakeMagnitude = amount; shakeDuration = Math.max(0.05, duration); shakeTime = duration;
      }
    },
    flash(color, alpha) { flashColor = color; flashAlpha = Math.max(flashAlpha, alpha); },
    shakeOffset() {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      const strength = shakeMagnitude * (shakeTime / shakeDuration);
      return { x: (Math.random() - 0.5) * 2 * strength, y: (Math.random() - 0.5) * 2 * strength };
    },
    update(dt) {
      if (shakeTime > 0) shakeTime -= dt;
      flashAlpha = Math.max(0, flashAlpha - dt * 2.4);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= (1 - 2.2 * dt); p.vy *= (1 - 2.2 * dt);
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life -= dt; f.y -= 34 * dt;
        if (f.life <= 0) floaters.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of particles) {
        const t = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const f of floaters) {
        const t = Math.max(0, f.life / f.maxLife);
        ctx.globalAlpha = Math.min(1, t * 1.6);
        ctx.font = `bold ${f.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(${flashColor},${flashAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    },
    clear() { particles.length = 0; floaters.length = 0; shakeTime = 0; flashAlpha = 0; },
  };
}
