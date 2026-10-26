import { TILE as T, VIEW_W, VIEW_H, ROWS, CAM_Y } from './constants.js';
import { SPR, CUBS, LAYER_W, buildSprites } from './sprites.js';
import { drawText } from './font.js';
import { audio } from './audio.js';
import { input, touch } from './input.js';
import { LEVELS } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.55, GRAVITY_HOLD = 0.24, MAX_FALL = 6.5;
// The cub's own fall is a touch floatier, with extra hang time near the top of a jump.
const PLAYER_FALL = 0.48, APEX_SPEED = 1.3, APEX_HANG = 0.5;
const WALK = 1.5, ACCEL = 0.09, RUN_ACCEL = 0.13, FRICTION = 0.12, SKID = 0.25;
const GROUND_Y = 12 * T;
const SOLID = new Set(['#', 'B', '?', 'H', 'R', 'U', 'S', '[', ']', 'J']);
const START_LIVES = 5;
const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
const RAINBOW = ['#ff5a5a', '#ffb03a', '#ffe14d', '#6fe35f', '#4fb4ff', '#c04af0'];
const CUB_KEYS = ['A', 'P'];

const game = {
  state: 'title', t: 0, frame: 0,
  cub: 'A', world: 0, lives: START_LIVES, claws: 0, totalClaws: 0, score: 0, time: 0,
  checkpoint: false, combo: 0, paused: false, menu: 0, toast: null,
  hi: loadHi(),
};
let lvl = null;

// ------------------------------------------------------------------ helpers

function loadHi() {
  try { return +localStorage.getItem('bearcubs.hi') || 0; } catch { return 0; }
}

function saveHi() {
  if (game.score <= game.hi) return;
  game.hi = game.score;
  try { localStorage.setItem('bearcubs.hi', String(game.hi)); } catch { /* storage unavailable */ }
}

const pad = (n, len) => String(n).padStart(len, '0');
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function setState(s) {
  game.state = s;
  game.t = 0;
}

function toast(text) {
  game.toast = { text, t: 150 };
}

function tileAt(tx, ty) {
  if (tx < 0 || tx >= lvl.w) return 'S';
  if (ty < 0 || ty >= ROWS) return ' ';
  return lvl.grid[ty][tx];
}

const isSolid = c => SOLID.has(c);

// ------------------------------------------------------------------ level setup

function spawn(e) {
  const x = e.x * T, y = e.y * T;
  switch (e.type) {
    case 'claw': return { type: 'claw', x: x + 3, y: y + 1, w: 10, h: 14 };
    case 'beetle': return { type: 'beetle', x: x + 1, y: y + T - 12, w: 14, h: 12, vx: -0.5, vy: 0, mode: 'walk', active: false, t: 0 };
    case 'bee': return { type: 'bee', x: x + 2, y: y + 3, w: 12, h: 10, vx: -0.6, vy: 0, baseX: x + 2, baseY: y + 3, mode: 'walk', active: false, t: e.x * 13 };
  }
  return null;
}

function loadLevel() {
  const def = LEVELS[game.world];
  const startTile = game.checkpoint && def.checkX ? def.checkX : def.startX;
  lvl = {
    def,
    w: def.w,
    grid: def.grid.map(r => r.slice()),
    theme: def.theme,
    ents: def.ents.map(spawn).filter(Boolean),
    fx: [],
    popups: [],
    bumps: new Map(),
    springs: new Map(),
    poleX: def.goalX * T + 7,
    denX: (def.goalX + 4) * T,
    flagY: 44,
    camX: 0,
    clearPhase: null,
  };
  lvl.player = {
    x: startTile * T + 3, y: GROUND_Y - 18, w: 10, h: 18, vx: 0, vy: 0, facing: 1,
    onGround: false, coyote: 0, jumpBuf: 0, powered: false, invuln: 0, star: 0,
    anim: 0, frame: 'stand', hidden: false, fell: false,
  };
  lvl.camX = clampCam(lvl.player.x - VIEW_W * 0.4);
  game.time = def.time;
  game.combo = 0;
}

function clampCam(x) {
  return Math.max(0, Math.min(lvl.w * T - VIEW_W, x));
}

// ------------------------------------------------------------------ physics

function moveX(e) {
  e.x += e.vx;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { e.x = tx * T - e.w; return true; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { e.x = (tx + 1) * T; return true; }
  }
  return false;
}

// Returns info about what was hit: { floor: [tiles under feet] } or { ceiling: [tx...], ty }.
function moveY(e, cornerSlip = false) {
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  e.onGround = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / T);
    const under = [];
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty);
      if (isSolid(c) || (c === '=' && prevBottom <= ty * T + 0.5)) under.push({ tx, ty, c });
    }
    if (under.length) {
      e.y = ty * T - e.h;
      e.vy = 0;
      e.onGround = true;
      return { floor: under };
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / T);
    const hits = [];
    for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(tx, ty))) hits.push(tx);
    if (hits.length === 1 && x0 !== x1 && cornerSlip) {
      // Clipped a block corner by a few pixels: nudge sideways instead of bonking.
      const tx = hits[0];
      const over = tx === x0 ? (tx + 1) * T - e.x : e.x + e.w - tx * T;
      if (over <= 4) {
        e.x += tx === x0 ? over : -over;
        return null;
      }
    }
    if (hits.length) {
      e.y = (ty + 1) * T;
      e.vy = 0;
      return { ceiling: hits, ty };
    }
  }
  return null;
}

// ------------------------------------------------------------------ effects

function addScore(n, x, y) {
  game.score += n;
  if (x !== undefined) popup(String(n), x, y);
}

function popup(text, x, y) {
  lvl.popups.push({ text, x, y, t: 0 });
}

function sparkle(x, y, n = 6, colors = ['#ffffff', '#ffe14d']) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    lvl.fx.push({ x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, life: 18, size: 2, color: colors[i % colors.length], grav: 0 });
  }
}

function debris(tx, ty) {
  const t = SPR.tiles[lvl.theme].brick;
  const color = getComputedColor(t);
  for (let i = 0; i < 4; i++) {
    lvl.fx.push({
      x: tx * T + 4 + (i % 2) * 8, y: ty * T + 4 + (i >> 1) * 8,
      vx: (i % 2 ? 1 : -1) * (1 + Math.random()), vy: -5 + (i >> 1) * 2,
      life: 60, size: 5, color, grav: 0.35,
    });
  }
}

// Pick the dominant colour of a sprite once (used for brick debris).
const colorCache = new WeakMap();
function getComputedColor(img) {
  if (!colorCache.has(img)) {
    const d = img.getContext('2d').getImageData(4, 4, 1, 1).data;
    colorCache.set(img, `rgb(${d[0]},${d[1]},${d[2]})`);
  }
  return colorCache.get(img);
}

function collectClaw(x, y) {
  game.claws++;
  game.totalClaws++;
  addScore(100);
  audio.sfx('claw');
  sparkle(x, y);
  if (game.claws >= 100) {
    game.claws -= 100;
    oneUp(x, y);
  }
}

function oneUp(x, y) {
  game.lives++;
  audio.sfx('oneup');
  popup('1UP', x, y - 8);
}

// ------------------------------------------------------------------ blocks

function bumpTile(tx, ty) {
  const c = tileAt(tx, ty);
  const p = lvl.player;
  const key = tx + ',' + ty;
  if (c === '?') {
    lvl.grid[ty][tx] = 'U';
    lvl.bumps.set(key, 10);
    lvl.ents.push({ type: 'pop', x: tx * T + 2, y: ty * T - 14, vy: -5, t: 0 });
    collectClaw(tx * T + 8, ty * T - 8);
  } else if (c === 'H' || c === 'R') {
    lvl.grid[ty][tx] = 'U';
    lvl.bumps.set(key, 10);
    lvl.ents.push({ type: c === 'H' ? 'honey' : 'berry', x: tx * T + 1, y: ty * T, w: 14, h: 14, vx: 0, vy: 0, rise: 16, phase: 'rise' });
    audio.sfx('appear');
  } else if (c === 'B') {
    if (p.powered) {
      lvl.grid[ty][tx] = ' ';
      debris(tx, ty);
      addScore(50);
      audio.sfx('break');
    } else {
      lvl.bumps.set(key, 10);
      audio.sfx('bump');
    }
  } else {
    audio.sfx('bump');
  }
  // Knock out anything standing on the block, and grab claws sitting on it.
  const above = { x: tx * T, y: (ty - 1) * T, w: T, h: T };
  for (const e of lvl.ents) {
    if ((e.type === 'beetle' || e.type === 'bee') && e.mode === 'walk' && overlap(e, above)) {
      knockOut(e, tx * T + 8);
      addScore(200, e.x, e.y);
    } else if (e.type === 'claw' && overlap(e, above)) {
      e.dead = true;
      collectClaw(e.x + 5, e.y + 7);
    }
  }
}

function knockOut(e, fromX) {
  e.mode = 'flip';
  e.vy = -4;
  e.vx = e.x + e.w / 2 < fromX ? -1 : 1;
  audio.sfx('kick');
}

// ------------------------------------------------------------------ player

function hurtPlayer() {
  const p = lvl.player;
  if (p.invuln > 0 || p.star > 0 || game.state !== 'play') return;
  if (p.powered) {
    p.powered = false;
    p.invuln = 120;
    audio.sfx('hurt');
    input.rumble(0.5, 250);
  } else {
    killPlayer();
  }
}

function killPlayer(fell = false) {
  if (game.state !== 'play') return;
  const p = lvl.player;
  setState('dying');
  p.vx = 0;
  p.vy = 0;
  p.star = 0;
  p.powered = false;
  p.fell = fell;
  audio.stopMusic();
  audio.playJingle('die');
  input.rumble(0.9, 400);
}

function updatePlayer() {
  const p = lvl.player;
  const cub = CUBS[game.cub];
  const left = input.held('left'), right = input.held('right'), run = input.held('run');
  const maxV = run ? cub.run : WALK;
  const acc = run ? RUN_ACCEL : ACCEL;

  if (left !== right) {
    const dir = left ? -1 : 1;
    if (p.vx * dir < 0 && p.onGround) p.vx += SKID * dir;
    else p.vx += acc * dir;
    p.facing = dir;
  } else if (p.onGround) {
    p.vx = Math.abs(p.vx) <= FRICTION ? 0 : p.vx - Math.sign(p.vx) * FRICTION;
  }
  if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(p.vx) - 0.06);

  if (input.pressed('jump')) p.jumpBuf = 6;
  else if (p.jumpBuf > 0) p.jumpBuf--;
  if (p.onGround) p.coyote = 6;
  else if (p.coyote > 0) p.coyote--;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = -(cub.jump + Math.abs(p.vx) * 0.15);
    p.jumpBuf = 0;
    p.coyote = 0;
    p.onGround = false;
    audio.sfx('jump');
  }
  const holding = input.held('jump');
  let grav = holding && p.vy < 0 ? GRAVITY_HOLD : PLAYER_FALL;
  if (!p.onGround && Math.abs(p.vy) < APEX_SPEED) grav *= APEX_HANG;
  p.vy = Math.min(MAX_FALL, p.vy + grav);

  if (moveX(p)) p.vx = 0;
  const wasGround = p.onGround;
  const hit = moveY(p, true);
  if (hit && hit.ceiling) {
    // Bump the block nearest the middle of the cub's head.
    const mid = p.x + p.w / 2;
    const tx = hit.ceiling.reduce((best, t) => Math.abs(t * T + 8 - mid) < Math.abs(best * T + 8 - mid) ? t : best);
    bumpTile(tx, hit.ty);
  }
  if (hit && hit.floor) {
    const spring = hit.floor.find(f => f.c === 'J');
    if (spring) {
      p.vy = holding ? -8.6 : -7;
      p.onGround = false;
      lvl.springs.set(spring.tx + ',' + spring.ty, 10);
      audio.sfx('spring');
    } else if (!wasGround) {
      game.combo = 0;
      lvl.fx.push({ x: p.x + p.w / 2, y: p.y + p.h - 2, vx: 0, vy: -0.2, life: 10, size: 3, color: '#ffffffaa', grav: 0 });
    }
  }

  // Spikes hurt if the cub's feet sink into the lower half of the tile.
  const fx0 = Math.floor((p.x + 2) / T), fx1 = Math.floor((p.x + p.w - 3) / T);
  const fty = Math.floor((p.y + p.h - 1) / T);
  for (let tx = fx0; tx <= fx1; tx++) {
    if (tileAt(tx, fty) === '^' && p.y + p.h > fty * T + 9) {
      if (p.invuln === 0 && p.star === 0) p.vy = -5;
      hurtPlayer();
    }
  }

  if (p.invuln > 0) p.invuln--;
  if (p.star > 0) {
    p.star--;
    if (game.frame % 4 === 0) sparkle(p.x + Math.random() * p.w, p.y + Math.random() * p.h, 2, RAINBOW);
    if (p.star === 0) audio.tempo = 1;
  }

  if (!p.onGround) p.frame = 'jump';
  else if (Math.abs(p.vx) > 0.1) {
    p.anim += Math.abs(p.vx) * 0.09;
    p.frame = ['run1', 'stand', 'run2', 'stand'][Math.floor(p.anim) % 4];
  } else p.frame = 'stand';

  if (p.y > ROWS * T + 8) killPlayer(true);
}

// ------------------------------------------------------------------ entities

function updateEnts() {
  const p = lvl.player;
  for (const e of lvl.ents) {
    switch (e.type) {
      case 'claw':
        if (overlap(p, e)) {
          e.dead = true;
          collectClaw(e.x + 5, e.y + 7);
        }
        break;
      case 'pop':
        e.vy += 0.35;
        e.y += e.vy;
        if (++e.t >= 24) {
          e.dead = true;
          popup('100', e.x + 6, e.y);
        }
        break;
      case 'honey':
      case 'berry':
        updateItem(e, p);
        break;
      case 'beetle':
      case 'bee':
        updateEnemy(e, p);
        break;
    }
  }
  // Beetles bounce off each other.
  const walkers = lvl.ents.filter(e => e.type === 'beetle' && e.mode === 'walk' && e.active);
  for (let i = 0; i < walkers.length; i++) {
    for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i], b = walkers[j];
      if (overlap(a, b)) {
        const [l, r] = a.x < b.x ? [a, b] : [b, a];
        l.vx = -Math.abs(l.vx);
        r.vx = Math.abs(r.vx);
      }
    }
  }
  lvl.ents = lvl.ents.filter(e => !e.dead);
}

function updateItem(e, p) {
  if (e.phase === 'rise') {
    e.y -= 0.5;
    e.rise -= 0.5;
    if (e.rise <= 0) {
      e.phase = 'move';
      e.vx = e.type === 'berry' ? 1.3 : 1;
    }
  } else {
    e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * 0.7);
    const v = e.vx;
    if (moveX(e)) e.vx = -v;
    moveY(e);
    if (e.type === 'berry' && e.onGround) e.vy = -4.5;
    if (e.y > ROWS * T) e.dead = true;
  }
  if (overlap(p, e) && e.phase === 'move') {
    e.dead = true;
    addScore(1000, e.x + 7, e.y);
    if (e.type === 'honey') {
      p.powered = true;
      audio.sfx('power');
      sparkle(p.x + 5, p.y + 9, 10);
    } else {
      p.star = 600;
      audio.sfx('berry');
      audio.tempo = 1.35;
    }
  }
}

function updateEnemy(e, p) {
  if (!e.active) {
    if (e.x < lvl.camX + VIEW_W + 24) e.active = true;
    else return;
  }
  e.t++;
  if (e.mode === 'walk') {
    if (e.type === 'beetle') {
      e.vy = Math.min(MAX_FALL, e.vy + GRAVITY);
      const v = e.vx;
      if (moveX(e)) e.vx = -v;
      moveY(e);
      if (e.onGround) {
        // Turn around at ledges.
        const ahead = e.vx < 0 ? e.x - 1 : e.x + e.w + 1;
        const below = tileAt(Math.floor(ahead / T), Math.floor((e.y + e.h + 1) / T));
        if (!isSolid(below) && below !== '=') e.vx = -e.vx;
      }
      if (e.y > ROWS * T) e.dead = true;
    } else {
      e.x += e.vx;
      if (e.x < e.baseX - 56) e.vx = 0.6;
      if (e.x > e.baseX + 8) e.vx = -0.6;
      e.y = e.baseY + Math.sin(e.t * 0.07) * 10;
    }
    if (game.state === 'play' && overlap(p, e)) {
      if (p.star > 0) {
        knockOut(e, p.x + p.w / 2);
        addScore(200, e.x, e.y);
      } else if (p.vy > 0 && p.y + p.h - e.y < 10) {
        // Stomp!
        if (e.type === 'beetle') {
          e.mode = 'squish';
          e.t = 0;
        } else {
          e.mode = 'flip';
          e.vy = 0;
          e.vx = 0;
        }
        p.vy = input.held('jump') ? -7 : -4.5;
        audio.sfx('stomp');
        const n = STOMP_SCORES[Math.min(game.combo, STOMP_SCORES.length - 1)];
        if (game.combo >= STOMP_SCORES.length) oneUp(e.x, e.y);
        else addScore(n, e.x + 7, e.y);
        game.combo++;
      } else {
        hurtPlayer();
      }
    }
  } else if (e.mode === 'squish') {
    if (e.t > 30) e.dead = true;
  } else if (e.mode === 'flip') {
    e.vy += GRAVITY * 0.7;
    e.x += e.vx;
    e.y += e.vy;
    if (e.y > ROWS * T + 32) e.dead = true;
  }
}

function updateFx() {
  for (const f of lvl.fx) {
    f.x += f.vx;
    f.y += f.vy;
    f.vy += f.grav;
    f.life--;
  }
  lvl.fx = lvl.fx.filter(f => f.life > 0);
  for (const pu of lvl.popups) {
    pu.y -= 0.6;
    pu.t++;
  }
  lvl.popups = lvl.popups.filter(pu => pu.t < 45);
  for (const m of [lvl.bumps, lvl.springs]) {
    for (const [k, v] of m) {
      if (v <= 1) m.delete(k);
      else m.set(k, v - 1);
    }
  }
}

function updateCamera(snap) {
  const p = lvl.player;
  const target = clampCam(p.x + p.w / 2 - VIEW_W * 0.4);
  lvl.camX = snap ? target : lvl.camX + (target - lvl.camX) * 0.15;
}

// ------------------------------------------------------------------ game flow

function newGame() {
  game.world = startWorld;
  game.lives = START_LIVES;
  game.claws = 0;
  game.totalClaws = 0;
  game.score = 0;
  game.checkpoint = false;
  setState('intro');
}

function startPlay() {
  loadLevel();
  setState('play');
  audio.playSong(lvl.def.music);
}

function startClear() {
  const p = lvl.player;
  setState('clear');
  lvl.clearPhase = 'slide';
  const height = GROUND_Y - (p.y + p.h);
  const bonus = height >= 128 ? 5000 : height >= 96 ? 2000 : height >= 64 ? 800 : height >= 32 ? 400 : 100;
  addScore(bonus, lvl.poleX + 12, p.y);
  p.x = lvl.poleX - p.w + 1;
  p.vx = 0;
  p.vy = 0;
  p.facing = 1;
  p.star = 0;
  audio.tempo = 1;
  audio.stopMusic();
  audio.sfx('flag');
}

function updateClear() {
  const p = lvl.player;
  const bottom = GROUND_Y - p.h;
  switch (lvl.clearPhase) {
    case 'slide':
      p.frame = 'jump';
      p.y = Math.min(bottom, p.y + 2.5);
      lvl.flagY = Math.min(GROUND_Y - 30, lvl.flagY + 2.5);
      if (p.y >= bottom && lvl.flagY >= GROUND_Y - 30 && game.t > 50) {
        lvl.clearPhase = 'walk';
        p.x += p.w + 2;
        audio.playJingle('clear');
      }
      break;
    case 'walk':
      p.vx = 1.2;
      p.vy = Math.min(MAX_FALL, p.vy + GRAVITY);
      moveX(p);
      moveY(p);
      p.anim += 0.12;
      p.frame = p.onGround ? ['run1', 'stand', 'run2', 'stand'][Math.floor(p.anim) % 4] : 'jump';
      if (p.x >= lvl.denX + 30) {
        p.hidden = true;
        lvl.clearPhase = 'tally';
      }
      break;
    case 'tally':
      if (game.time > 0) {
        const n = Math.min(2, game.time);
        game.time -= n;
        game.score += n * 50;
        if (game.frame % 4 === 0) audio.sfx('tick');
      } else {
        lvl.clearPhase = 'wait';
        game.t = 0;
      }
      break;
    case 'wait':
      if (game.t > 120) {
        game.checkpoint = false;
        game.world++;
        saveHi();
        if (game.world >= LEVELS.length) {
          setState('ending');
          audio.playJingle('ending');
        } else {
          setState('intro');
        }
      }
      break;
  }
}

function step() {
  input.update();
  game.frame++;
  game.t++;
  if (game.toast && --game.toast.t <= 0) game.toast = null;
  if (input.pressed('mute')) {
    // If sound hasn't started yet, the tap that started it means "sound on".
    if (!audio.ready && !audio.muted) toast('SOUND ON');
    else toast(audio.toggleMute() ? 'SOUND OFF' : 'SOUND ON');
  }

  const confirm = input.pressed('start') || input.pressed('jump');
  switch (game.state) {
    case 'title': {
      if (game.t === 1) audio.playSong('title');
      if (input.pressed('left') || input.pressed('right')) {
        game.cub = CUB_KEYS[(CUB_KEYS.indexOf(game.cub) + 1) % 2];
        audio.sfx('select');
      }
      if (confirm && game.t > 20) {
        audio.sfx('power');
        newGame();
      }
      break;
    }
    case 'intro':
      if (game.t === 1) audio.stopMusic();
      if (game.t > 150 || (confirm && game.t > 30)) startPlay();
      break;
    case 'play':
      if (input.pressed('start')) {
        game.paused = !game.paused;
        audio.paused = game.paused;
        audio.sfx('pause');
      }
      if (game.paused) break;
      updatePlayer();
      updateEnts();
      updateFx();
      updateCamera();
      if (game.state === 'play') {
        const def = lvl.def;
        if (def.checkX && !game.checkpoint && lvl.player.x > def.checkX * T) {
          game.checkpoint = true;
          audio.sfx('checkpoint');
          popup('CHECKPOINT!', def.checkX * T + 8, GROUND_Y - 40);
        }
        if (lvl.player.x + lvl.player.w >= lvl.poleX) startClear();
        else if (game.frame % 60 === 0 && --game.time <= 0) killPlayer();
      }
      break;
    case 'dying': {
      const p = lvl.player;
      if (!p.fell) {
        if (game.t === 30) p.vy = -6.5;
        if (game.t > 30) {
          p.vy += 0.3;
          p.y += p.vy;
        }
      }
      updateFx();
      if (game.t > 180) {
        game.lives--;
        saveHi();
        if (game.lives <= 0) {
          setState('gameover');
          game.menu = 0;
          audio.playJingle('gameover');
        } else setState('intro');
      }
      break;
    }
    case 'clear':
      updateClear();
      updateEnts();
      updateFx();
      updateCamera();
      break;
    case 'gameover':
      if (input.pressed('up') || input.pressed('down')) {
        game.menu = 1 - game.menu;
        audio.sfx('select');
      }
      if (confirm && game.t > 60) {
        if (game.menu === 0) {
          game.lives = START_LIVES;
          game.score = 0;
          game.claws = 0;
          game.checkpoint = false;
          setState('intro');
        } else setState('title');
      }
      break;
    case 'ending':
      if (confirm && game.t > 120) setState('title');
      break;
  }
}

// ------------------------------------------------------------------ rendering

function drawBackground(theme, cx) {
  const bg = SPR.bg[theme];
  ctx.drawImage(bg.sky, 0, 0);
  for (const layer of bg.layers) {
    let x = -(Math.floor(cx * layer.f) % LAYER_W);
    for (; x < VIEW_W; x += LAYER_W) ctx.drawImage(layer.img, x, 0);
  }
  if (theme === 'snow') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
      const sp = 0.4 + (i % 4) * 0.15;
      const x = ((i * 53.7 + Math.sin(game.frame * 0.02 + i) * 8 - cx * 0.6 + game.frame * 0.2) % VIEW_W + VIEW_W) % VIEW_W;
      const y = (i * 31 + game.frame * sp) % VIEW_H;
      ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, i % 3 ? 1 : 2);
    }
  } else if (theme === 'caves') {
    for (let i = 0; i < 24; i++) {
      const x = ((i * 71.3 - cx * 0.7 + Math.sin(game.frame * 0.03 + i) * 6) % VIEW_W + VIEW_W) % VIEW_W;
      const y = VIEW_H - ((i * 47 + game.frame * (0.2 + (i % 3) * 0.1)) % VIEW_H);
      ctx.fillStyle = (game.frame + i * 7) % 40 < 20 ? '#ffd060' : '#f09020';
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
}

function tileImage(c, tx, ty) {
  const t = SPR.tiles[lvl.theme];
  switch (c) {
    case '#': return tileAt(tx, ty - 1) === '#' ? t.ground : t.groundTop;
    case 'B': return t.brick;
    case '?': case 'H': case 'R': return t.q[(game.frame % 48) < 10 ? 1 : 0];
    case 'U': return t.used;
    case 'S': return t.stone;
    case '=': return t.plat;
    case '^': return t.spikes;
    case '[': return tileAt(tx, ty - 1) === '[' ? t.logL : t.logTL;
    case ']': return tileAt(tx, ty - 1) === ']' ? t.logR : t.logTR;
    case 'J': return t.spring[lvl.springs.has(tx + ',' + ty) ? 1 : 0];
  }
  return null;
}

function drawTiles(cx) {
  const x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.min(lvl.w - 1, x0 + Math.ceil(VIEW_W / T) + 1);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = lvl.grid[ty][tx];
      if (c === ' ') continue;
      const img = tileImage(c, tx, ty);
      if (!img) continue;
      const b = lvl.bumps.get(tx + ',' + ty);
      const off = b ? Math.round(Math.sin((10 - b) / 10 * Math.PI) * 5) : 0;
      ctx.drawImage(img, tx * T - cx, ty * T - CAM_Y - off);
    }
  }
}

function drawScenery(cx) {
  const sc = SPR.scenery[lvl.theme];
  // Bear den at the end of the level.
  ctx.drawImage(sc.den, lvl.denX - cx, GROUND_Y - 56 - CAM_Y);
  // Goal pole + flag
  const px = lvl.poleX - cx;
  ctx.fillStyle = '#2a1608';
  ctx.fillRect(px - 1, 40 - CAM_Y, 4, GROUND_Y - 40);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(px, 40 - CAM_Y, 2, GROUND_Y - 40);
  ctx.fillStyle = '#2a1608';
  ctx.fillRect(px - 3, 34 - CAM_Y, 8, 8);
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(px - 2, 35 - CAM_Y, 6, 6);
  ctx.drawImage(sc.flag, px - 17, Math.round(lvl.flagY) - CAM_Y);
  // Checkpoint
  const ck = lvl.def.checkX;
  if (ck) {
    const x = ck * T + 6 - cx;
    ctx.fillStyle = '#2a1608';
    ctx.fillRect(x, GROUND_Y - 30 - CAM_Y, 3, 30);
    ctx.fillStyle = '#c89a68';
    ctx.fillRect(x + 1, GROUND_Y - 30 - CAM_Y, 1, 30);
    ctx.drawImage(game.checkpoint ? sc.checkOn : sc.checkOff, x + 3, GROUND_Y - 30 - CAM_Y);
  }
}

function drawEnt(e, cx) {
  const x = Math.round(e.x - cx), y = Math.round(e.y - CAM_Y);
  const items = SPR.items, en = SPR.enemies;
  switch (e.type) {
    case 'claw':
      ctx.drawImage(items.clawFrames[Math.floor(game.frame / 8) % 4], x - 1, y);
      break;
    case 'pop':
      ctx.drawImage(items.clawFrames[Math.floor(game.frame / 3) % 4], x, y);
      break;
    case 'honey':
      ctx.drawImage(items.honey, x - 1, y - 2);
      break;
    case 'berry':
      ctx.drawImage(items.berry, x - 1, y - 2);
      break;
    case 'beetle': {
      if (!e.active) return;
      if (e.mode === 'squish') { ctx.drawImage(en.squish, x - 1, y + e.h - 15); break; }
      const f = en.beetle[Math.floor(e.t / 8) % 2];
      ctx.drawImage(e.mode === 'flip' ? f.dead : e.vx > 0 ? f.r : f.l, x - 1, y + e.h - 15);
      break;
    }
    case 'bee': {
      if (!e.active) return;
      const f = en.bee[Math.floor(e.t / 3) % 2];
      ctx.drawImage(e.mode === 'flip' ? f.dead : e.vx > 0 ? f.r : f.l, x - 2, y - 4);
      break;
    }
  }
}

function drawCub(key, frame, facing, x, y, opts = {}) {
  const fr = SPR.cubs[key].frames[frame];
  const img = opts.white ? (facing > 0 ? fr.wr : fr.wl) : facing > 0 ? fr.r : fr.l;
  const s = opts.scale || 1;
  ctx.drawImage(img, x, y, 16 * s, 20 * s);
  if (opts.crown) ctx.drawImage(SPR.items.crown, x + (facing > 0 ? 2 : 5) * s, y - 5 * s, 9 * s, 7 * s);
}

function drawPlayer(cx) {
  const p = lvl.player;
  if (p.hidden) return;
  if (p.invuln > 0 && Math.floor(game.frame / 3) % 2) return;
  const frame = game.state === 'dying' ? 'jump' : p.frame;
  drawCub(game.cub, frame, p.facing, Math.round(p.x - 3 - cx), Math.round(p.y - 2 - CAM_Y), {
    crown: p.powered,
    white: p.star > 0 && Math.floor(game.frame / 2) % 3 === 0,
  });
}

function drawFx(cx) {
  for (const f of lvl.fx) {
    ctx.fillStyle = f.color;
    const s = f.size * Math.min(1, f.life / 10);
    ctx.fillRect(Math.round(f.x - cx - s / 2), Math.round(f.y - CAM_Y - s / 2), Math.ceil(s), Math.ceil(s));
  }
  for (const pu of lvl.popups) {
    drawText(ctx, pu.text, pu.x - cx, pu.y - CAM_Y, { align: 'center', color: '#ffffff' });
  }
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, VIEW_W, 16);
  ctx.drawImage(SPR.cubs[game.cub].head, 4, 3);
  drawText(ctx, '*' + game.lives, 22, 5);
  ctx.drawImage(SPR.items.claw, 58, 1);
  drawText(ctx, '*' + pad(game.claws, 2), 70, 5, { color: '#ffe14d' });
  drawText(ctx, 'SCORE ' + pad(game.score, 6), 112, 5);
  drawText(ctx, 'WORLD ' + (game.world + 1), 214, 5);
  const low = game.time <= 60 && game.state === 'play';
  drawText(ctx, 'TIME ' + pad(Math.max(0, game.time), 3), VIEW_W - 6, 5, {
    align: 'right', color: low && Math.floor(game.frame / 15) % 2 ? '#ff5a5a' : '#ffffff',
  });
}

function drawWorld() {
  const cx = Math.round(lvl.camX);
  drawBackground(lvl.theme, cx);
  for (const e of lvl.ents) if (e.phase === 'rise') drawEnt(e, cx);
  drawScenery(cx);
  drawTiles(cx);
  for (const e of lvl.ents) if (e.phase !== 'rise') drawEnt(e, cx);
  drawPlayer(cx);
  drawFx(cx);
  drawHud();
  if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'PAUSED', VIEW_W / 2, 90, { scale: 3, align: 'center', color: '#ffe14d' });
    drawText(ctx, 'PRESS START TO PLAY', VIEW_W / 2, 124, { align: 'center' });
  }
}

const rainbow = speed => i => RAINBOW[(i + Math.floor(game.frame / speed)) % RAINBOW.length];

function drawGroundStrip(theme, cx) {
  const t = SPR.tiles[theme];
  const off = -(Math.floor(cx) % T);
  for (let x = off; x < VIEW_W; x += T) {
    ctx.drawImage(t.groundTop, x, GROUND_Y - CAM_Y);
    ctx.drawImage(t.ground, x, GROUND_Y + T - CAM_Y);
  }
}

function drawTitle() {
  const cx = game.frame * 0.6;
  drawBackground('meadow', cx);
  drawGroundStrip('meadow', cx);
  drawText(ctx, 'SUPER', VIEW_W / 2, 18, { scale: 2, align: 'center', color: rainbow(8), shadow: '#2a1608' });
  drawText(ctx, 'BEAR CUBS', VIEW_W / 2, 36, { scale: 4, align: 'center', color: rainbow(8), shadow: '#2a1608' });
  drawText(ctx, 'WORLD', VIEW_W / 2, 70, { scale: 2, align: 'center', color: rainbow(8), shadow: '#2a1608' });
  drawText(ctx, 'CHOOSE YOUR CUB!', VIEW_W / 2, 98, { align: 'center', color: '#ffffff', shadow: '#2a1608' });

  CUB_KEYS.forEach((key, i) => {
    const cxm = VIEW_W / 2 + (i === 0 ? -52 : 52);
    const sel = game.cub === key;
    const hop = sel ? Math.abs(Math.sin(game.frame * 0.12)) * 10 : 0;
    if (sel) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cxm - 42, 110, 84, 74);
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(cxm - 42, 110, 84, 2);
      ctx.fillRect(cxm - 42, 182, 84, 2);
      ctx.fillRect(cxm - 42, 110, 2, 74);
      ctx.fillRect(cxm + 40, 110, 2, 74);
    }
    drawText(ctx, CUBS[key].desc, cxm, 115, { align: 'center', color: sel ? '#ffe14d' : '#ffffff', shadow: '#2a1608' });
    drawCub(key, hop > 1 ? 'jump' : 'stand', i === 0 ? 1 : -1, cxm - 16, GROUND_Y - CAM_Y - 40 - Math.round(hop), { scale: 2 });
  });

  if (!game.touch && Math.floor(game.frame / 30) % 2 === 0) {
    drawText(ctx, 'PRESS START', VIEW_W / 2, 190, { align: 'center', color: '#ffffff', shadow: '#2a1608' });
  }
  // On touch screens the on-screen START button sits where this text would be.
  if (!game.touch) {
    const hint = Math.floor(game.frame / 240) % 2
      ? 'PAD: STICK MOVE  A JUMP  X RUN'
      : 'KEYS: ARROWS MOVE  Z JUMP  X RUN';
    drawText(ctx, hint, VIEW_W / 2, 204, { align: 'center', color: '#ffe0a0', shadow: '#2a1608' });
  }
  drawText(ctx, 'HI ' + pad(game.hi, 6), VIEW_W - 6, 4, { align: 'right', color: '#ffffff', shadow: '#2a1608' });
  if (!audio.ready) {
    drawText(ctx, game.touch ? 'TAP ANYWHERE FOR SOUND' : 'CLICK OR PRESS A KEY FOR SOUND', 6, 4, { color: '#ffffff', shadow: '#2a1608' });
  }
}

function drawIntro() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const def = LEVELS[game.world];
  drawText(ctx, 'WORLD ' + (game.world + 1), VIEW_W / 2, 52, { scale: 3, align: 'center', color: '#ffffff', shadow: null });
  drawText(ctx, def.name, VIEW_W / 2, 84, { scale: 2, align: 'center', color: rainbow(10), shadow: null });
  drawCub(game.cub, 'stand', 1, VIEW_W / 2 - 34, 116, { scale: 2 });
  drawText(ctx, '* ' + game.lives, VIEW_W / 2 + 6, 130, { scale: 2, color: '#ffffff', shadow: null });
  if (game.checkpoint) drawText(ctx, 'FROM CHECKPOINT', VIEW_W / 2, 176, { align: 'center', color: '#ffe14d', shadow: null });
  else drawText(ctx, 'GET READY!', VIEW_W / 2, 176, { align: 'center', color: '#ffe14d', shadow: null });
}

function drawGameOver() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawText(ctx, 'GAME OVER', VIEW_W / 2, 60, { scale: 3, align: 'center', color: '#ff5a5a', shadow: null });
  drawText(ctx, 'SCORE ' + pad(game.score, 6), VIEW_W / 2, 100, { align: 'center', color: '#ffffff', shadow: null });
  ['CONTINUE', 'BACK TO TITLE'].forEach((label, i) => {
    const y = 130 + i * 16;
    drawText(ctx, label, VIEW_W / 2 - 36, y, { color: game.menu === i ? '#ffe14d' : '#888888', shadow: null });
    if (game.menu === i) drawText(ctx, '>', VIEW_W / 2 - 50, y, { color: '#ffe14d', shadow: null });
  });
}

function drawEnding() {
  const cx = game.frame * 0.3;
  drawBackground('meadow', cx);
  drawGroundStrip('meadow', cx);
  drawText(ctx, 'HOORAY!', VIEW_W / 2, 22, { scale: 4, align: 'center', color: rainbow(6), shadow: '#2a1608' });
  drawText(ctx, 'THE BEAR CUBS MADE IT HOME!', VIEW_W / 2, 64, { align: 'center', color: '#ffffff', shadow: '#2a1608' });
  drawText(ctx, 'BEAR CLAWS: ' + game.totalClaws, VIEW_W / 2, 82, { align: 'center', color: '#ffe14d', shadow: '#2a1608' });
  drawText(ctx, 'SCORE: ' + game.score, VIEW_W / 2, 96, { align: 'center', color: '#ffffff', shadow: '#2a1608' });
  CUB_KEYS.forEach((key, i) => {
    const phase = game.frame * 0.15 + i * Math.PI;
    const hop = Math.max(0, Math.sin(phase)) * 16;
    drawCub(key, hop > 2 ? 'jump' : 'stand', i === 0 ? 1 : -1, VIEW_W / 2 - 40 + i * 48, GROUND_Y - CAM_Y - 40 - Math.round(hop), { scale: 2 });
  });
  // floating hearts
  for (let i = 0; i < 10; i++) {
    const x = (i * 41 + Math.sin(game.frame * 0.03 + i) * 10) % VIEW_W;
    const y = VIEW_H - ((game.frame * 0.6 + i * 37) % (VIEW_H + 20));
    drawText(ctx, '@', x, y, { color: RAINBOW[i % RAINBOW.length], shadow: null });
  }
  if (!game.touch && game.t > 120 && Math.floor(game.frame / 30) % 2 === 0) {
    drawText(ctx, 'PRESS START', VIEW_W / 2, 194, { align: 'center', color: '#ffffff', shadow: '#2a1608' });
  }
}

function render() {
  ctx.imageSmoothingEnabled = false;
  switch (game.state) {
    case 'title': drawTitle(); break;
    case 'intro': drawIntro(); break;
    case 'gameover': drawGameOver(); break;
    case 'ending': drawEnding(); break;
    default: drawWorld();
  }
  if (game.toast) {
    const w = game.toast.text.length * 6 + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(Math.round(VIEW_W / 2 - w / 2), 19, w, 13);
    drawText(ctx, game.toast.text, VIEW_W / 2, 22, { align: 'center', color: '#ffe14d' });
  }
  if (DEBUG) {
    const a = audio.ctx;
    const info = 'AUDIO ' + (a ? a.state : 'NOT STARTED') + (audio.muted ? ' MUTED' : '') +
      ' SONG ' + (audio.song ? audio.song.name : audio.pending || '-') + (a ? ' ' + a.sampleRate : '');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 34, VIEW_W, 22);
    drawText(ctx, info, 4, 36, { color: '#6fe35f', shadow: null });
    if (lastError) drawText(ctx, lastError.slice(0, 62), 4, 46, { color: '#ff5a5a', shadow: null });
  }
}

// ------------------------------------------------------------------ boot

function resize() {
  const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * s) + 'px';
  canvas.style.height = Math.floor(VIEW_H * s) + 'px';
}

function setupTouch() {
  const el = document.getElementById('touch');
  if (!el || !window.matchMedia('(pointer: coarse)').matches) return;
  el.hidden = false;
  game.touch = true;
  const buttons = [...el.querySelectorAll('[data-act]')];
  // Work out which buttons are under each finger, so a thumb can slide
  // between left and right without lifting, and several can be held at once.
  const sync = e => {
    e.preventDefault();
    for (const b of buttons) touch[b.dataset.act] = false;
    for (const t of e.touches) {
      const hit = document.elementFromPoint(t.clientX, t.clientY);
      const btn = hit && hit.closest('[data-act]');
      if (btn) touch[btn.dataset.act] = true;
    }
    for (const b of buttons) b.classList.toggle('down', touch[b.dataset.act]);
  };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
    document.addEventListener(ev, sync, { passive: false });
  }
}

// Optional URL params for testing: ?world=2&cub=P&play, and ?debug to show
// the audio state and any script error on screen (handy on phones).
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
let lastError = '';
if (DEBUG) {
  window.addEventListener('error', e => { lastError = String(e.message); });
  window.addEventListener('unhandledrejection', e => { lastError = String(e.reason); });
}
const startWorld = Math.max(0, Math.min(LEVELS.length - 1, (+params.get('world') || 1) - 1));

function boot() {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  buildSprites();
  resize();
  window.addEventListener('resize', resize);
  setupTouch();
  // iOS only lets audio start from certain gestures, so listen for all of them.
  for (const ev of ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'click']) {
    window.addEventListener(ev, () => audio.unlock(), { passive: true, capture: true });
  }
  // Coming back to the tab (or iOS ending an interruption) may need a nudge.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) audio.resume(); });
  input.onGamepadConnected(() => toast('CONTROLLER CONNECTED!'));
  // Handy for poking at the game from the browser console.
  window.bearCubs = { game, get level() { return lvl; } };

  if (params.get('cub') === 'P') game.cub = 'P';
  if (params.has('play')) {
    newGame();
    startPlay();
    const x = +params.get('x');
    if (x) {
      lvl.player.x = x * T;
      updateCamera(true);
    }
  }

  let last = performance.now(), acc = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      step();
      acc -= STEP;
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
