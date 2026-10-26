// Keyboard, Xbox / standard gamepad, and touch input merged into one set of actions.

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK', 'ArrowUp', 'KeyW'],
  run: ['KeyX', 'KeyJ', 'ShiftLeft', 'ShiftRight'],
  start: ['Enter', 'Escape', 'KeyP'],
  mute: ['KeyM'],
};

// Standard gamepad mapping (what Xbox controllers report in browsers):
// 0=A 1=B 2=X 3=Y 6=LT 7=RT 8=View 9=Menu 12-15=D-pad
const PAD = {
  jump: [0, 3],
  run: [1, 2, 6, 7],
  start: [9],
  mute: [8],
  up: [12], down: [13], left: [14], right: [15],
};

const keys = new Set();
export const touch = {};
let prev = {}, cur = {};
let onConnect = null;
let lastPad = null;

window.addEventListener('keydown', e => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('gamepadconnected', e => onConnect && onConnect(e.gamepad));

function read() {
  const s = {};
  for (const a in KEYMAP) s[a] = KEYMAP[a].some(k => keys.has(k)) || !!touch[a];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p || !p.connected) continue;
    const b = i => !!(p.buttons[i] && p.buttons[i].pressed);
    for (const a in PAD) if (PAD[a].some(b)) { s[a] = true; lastPad = p; }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (ax < -0.4) s.left = true;
    if (ax > 0.4) s.right = true;
    if (ay < -0.6) s.up = true;
    if (ay > 0.6) s.down = true;
  }
  return s;
}

export const input = {
  update() {
    prev = cur;
    cur = read();
  },
  held: a => !!cur[a],
  pressed: a => !!cur[a] && !prev[a],
  anyPressed() {
    return Object.keys(cur).some(a => cur[a] && !prev[a]);
  },
  onGamepadConnected(fn) {
    onConnect = fn;
  },
  rumble(strong = 0.6, ms = 200) {
    const act = lastPad && lastPad.vibrationActuator;
    if (act && act.playEffect) {
      act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 }).catch(() => {});
    }
  },
};
