// input.js — keyboard and mouse state for STARFALL ARENA.
// Tracks held keys, mouse position in canvas space, and edge-triggered
// presses so the game loop can poll a simple snapshot each frame.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 400, down: false, clicked: false, clickX: 0, clickY: 0 };
  let lastKey = '';

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!held.has(key)) pressed.add(key);
    held.add(key);
    lastKey = key;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event.clientX, event.clientY);
    mouse.x = p.x; mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event.clientX, event.clientY);
    mouse.x = p.x; mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = p.x; mouse.clickY = p.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('touchstart', (event) => {
    const t = event.touches[0];
    if (!t) return;
    const p = canvasPoint(t.clientX, t.clientY);
    mouse.x = p.x; mouse.y = p.y; mouse.down = true;
    mouse.clicked = true; mouse.clickX = p.x; mouse.clickY = p.y;
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (event) => {
    const t = event.touches[0];
    if (!t) return;
    const p = canvasPoint(t.clientX, t.clientY);
    mouse.x = p.x; mouse.y = p.y;
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { mouse.down = false; });

  return {
    held,
    mouse,
    isDown(key) { return held.has(key); },
    wasPressed(key) { return pressed.has(key); },
    axisX() {
      let value = 0;
      if (held.has('a') || held.has('arrowleft')) value -= 1;
      if (held.has('d') || held.has('arrowright')) value += 1;
      return value;
    },
    axisY() {
      let value = 0;
      if (held.has('w') || held.has('arrowup')) value -= 1;
      if (held.has('s') || held.has('arrowdown')) value += 1;
      return value;
    },
    firing() { return mouse.down || held.has(' '); },
    dashRequested() { return pressed.has('shift'); },
    endFrame() { pressed.clear(); mouse.clicked = false; },
    get lastKey() { return lastKey; },
  };
}
