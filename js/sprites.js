// All the game's pixel art, generated at load time.
import { fromRows, paint, flipH, flipV, tint, addOutline, squashX, makeCanvas } from './gfx.js';
import { TILE, VIEW_W, VIEW_H } from './constants.js';

// ---------------------------------------------------------------- the cubs

export const CUBS = {
  A: {
    name: 'A', desc: 'SUPER JUMPER', jump: 5.9, run: 2.6,
    fur: '#8b5a2b', furDark: '#5e3a18', shirt: '#e8413a', shirtDark: '#a8241f', letter: '#ffe14d',
  },
  P: {
    name: 'P', desc: 'SPEEDY RUNNER', jump: 5.5, run: 3.0,
    fur: '#c4843f', furDark: '#8a5424', shirt: '#3a8ef0', shirtDark: '#2456a8', letter: '#ffffff',
  },
};

const CUB_TOP = [
  '..kkk..kkk......',
  '.kbdbkkbdbk.....',
  '.kbbbbbbbbbk....',
  'kbbbbbbbbbbbk...',
  'kbbbbbbbwebbk...',
  'kbbbbbbbwebbbkk.',
  'kbbbbbbpbbllllnk',
  '.kbbbbbbbllllllk',
  '..kbbbbbbkllllk.',
  '...kkkkkkkkkkk..',
  '...kcccccccck...',
  '..kccccccccccck.',
  '..kcccccccccbbk.',
  '..kccccccccckk..',
  '..kccccccccck...',
  '..kCCCCCCCCCk...',
];

const CUB_LEGS = {
  stand: ['...kbbbkbbbk....', '...kbbbkbbbk....', '..kdddk.kdddk...', '..kkkkk.kkkkk...'],
  run1: ['..kbbbk.kbbbk...', '.kbbbk...kbbbk..', 'kdddk.....kdddk.', 'kkkk.......kkkk.'],
  run2: ['...kbbbbbbk.....', '....kbbbbk......', '...kdddddk......', '...kkkkkkk......'],
  jump: ['..kbbbk.kbbbk...', '..kdddk..kdddk..', '..kkkkk..kkkkk..', '................'],
};

const LETTERS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
};

function buildCub(cub) {
  const pal = {
    k: '#2a1608', b: cub.fur, d: cub.furDark, w: '#ffffff', e: '#1a0e08', l: '#f0cf9a',
    n: '#1a0e08', p: '#ff8fa0', c: cub.shirt, C: cub.shirtDark,
  };
  const frames = {};
  // Letters are stamped after flipping so they never read backwards.
  const stamp = (spr, x0) => {
    const g = spr.getContext('2d');
    g.fillStyle = cub.letter;
    LETTERS[cub.name].forEach((row, y) => {
      for (let x = 0; x < 3; x++) if (row[x] === '#') g.fillRect(x0 + x, 10 + y, 1, 1);
    });
    return spr;
  };
  for (const [name, legs] of Object.entries(CUB_LEGS)) {
    const spr = fromRows(CUB_TOP.concat(legs), pal);
    const left = stamp(flipH(spr), 8);
    stamp(spr, 5);
    frames[name] = { r: spr, l: left, wr: tint(spr, '#ffffff'), wl: tint(left, '#ffffff') };
  }
  // Head-only crop for the HUD.
  const head = makeCanvas(16, 10);
  head.getContext('2d').drawImage(frames.stand.r, 0, 0);
  return { frames, head };
}

// ---------------------------------------------------------------- items

const DIAMOND_ROWS = [
  '...kkkkkk...',
  '..kwcwcwCCk.',
  '.kwcwcwcCCCk',
  'kkkkkkkkkkkk',
  'kwcccccCCCdk',
  '.kwccccCCdk.',
  '..kwcccCdk..',
  '...kwccdk...',
  '....kwdk....',
  '.....kk.....',
];

const HONEY_ROWS = [
  '...kkkkkkkk...',
  '..kRRWRRWRRk..',
  '..kkkkkkkkkk..',
  '...kyyyyyyk...',
  '..kywyyyyyyk..',
  '.kywyyyyyyyyk.',
  '.kywyyyyyyyyk.',
  '.kyyyyyyyyyYk.',
  '.kyyyyyyyyyYk.',
  '.kyyyyyyyyYYk.',
  '..kyyyyyyYYk..',
  '...kkkkkkkk...',
];

const BERRY_ROWS = [
  '....gGg.....',
  '...gGGGg....',
  '..kkkkkkkk..',
  '.kmwmmmmmmk.',
  '.kwmmMmmMmk.',
  '.kmmMmmMmmk.',
  '.kmMmmMmmMk.',
  '..kmmMmmMk..',
  '..kmMmmMmk..',
  '...kmmMmk...',
  '....kkkk....',
];

const CROWN_ROWS = [
  'y..y..y',
  'yy.y.yy',
  'yyyyyyy',
  'yryyyry',
  'yyyyyyy',
];

function centered(src, w, h) {
  const c = makeCanvas(w, h);
  c.getContext('2d').drawImage(src, Math.floor((w - src.width) / 2), h - src.height - 1);
  return c;
}

function buildItems() {
  const diamond = fromRows(DIAMOND_ROWS, { k: '#1a3a6a', w: '#ffffff', c: '#9ae8ff', C: '#40c0f0', d: '#1a80c8' });
  const diamondFrames = [1, 0.6, 0.2, 0.6].map(s => squashX(diamond, s, 12));
  const honey = centered(fromRows(HONEY_ROWS, {
    k: '#4a2400', R: '#e8413a', W: '#ffffff', y: '#ffb81c', Y: '#d07800', w: '#fff3b0',
  }), 16, 16);
  const berry = centered(fromRows(BERRY_ROWS, {
    k: '#2a0a3a', m: '#c04af0', M: '#6a1aa0', w: '#ffffff', g: '#6fe36f', G: '#2f8e3f',
  }), 16, 16);
  const crown = addOutline(centered(fromRows(CROWN_ROWS, { y: '#ffd23a', r: '#e8413a' }), 9, 7), '#5a3a00');
  return { diamond, diamondFrames, honey, berry, crown };
}

// ---------------------------------------------------------------- enemies

function buildBeetle(frame) {
  const s = paint(16, 16, ({ px, ellipse }) => {
    ellipse(9, 8.5, 5.5, 4.5, '#e8413a');
    ellipse(8, 7, 2.5, 1.5, '#ff8a7a');
    for (let y = 4; y <= 12; y++) px(9, y, '#7a1010');
    [[6, 9], [11, 7], [12, 10], [7, 11]].forEach(([x, y]) => { px(x, y, '#2a0a0a'); px(x + 1, y, '#2a0a0a'); });
    ellipse(3.5, 10, 2.5, 2.5, '#2a1a2a');
    px(2, 9, '#ffffff'); px(4, 9, '#ffffff'); px(2, 10, '#ffffff'); px(4, 10, '#ffffff');
    px(1, 10, '#000000'); px(3, 10, '#000000');
    const legs = frame === 0 ? [4, 8, 12] : [5, 9, 13];
    legs.forEach(x => px(x, 13, '#2a1a2a'));
  });
  return addOutline(s, '#1a0a0a');
}

function buildBee(frame) {
  const s = paint(16, 16, ({ px, ellipse, rect }) => {
    if (frame === 0) ellipse(9, 4, 3, 2.5, '#e8f8ff');
    else ellipse(10, 5.5, 3.5, 1.5, '#e8f8ff');
    ellipse(8.5, 9.5, 5.5, 3.5, '#ffd23a');
    rect(8, 6, 1, 8, '#2a1a10'); rect(9, 6, 1, 8, '#2a1a10');
    rect(11, 6, 1, 8, '#2a1a10');
    px(13, 10, '#2a1a10'); px(14, 10, '#2a1a10');
    px(4, 8, '#ffffff'); px(5, 8, '#ffffff'); px(4, 9, '#000000');
    px(4, 11, '#e8413a');
  });
  return addOutline(s, '#2a1a10');
}

function buildEnemies() {
  const beetle = [buildBeetle(0), buildBeetle(1)];
  const squish = addOutline(paint(16, 16, ({ px, ellipse }) => {
    ellipse(8.5, 12.5, 6, 2, '#e8413a');
    px(5, 12, '#2a0a0a'); px(10, 12, '#2a0a0a');
    ellipse(3, 13, 1.5, 1.5, '#2a1a2a');
  }), '#1a0a0a');
  const bee = [buildBee(0), buildBee(1)];
  const mirror = arr => arr.map(f => ({ l: f, r: flipH(f), dead: flipV(f) }));
  return { beetle: mirror(beetle), squish, bee: mirror(bee) };
}

// ---------------------------------------------------------------- themes

export const THEMES = {
  meadow: {
    sky: ['#4fb4ff', '#8fdcff', '#d4f6ff'],
    g: '#6fe35f', G: '#2fa83f', d: '#d8843c', D: '#9a5424', s: '#f4b070',
    r: '#e0683a', R: '#6a2810', h: '#ffa880',
    stone: ['#f0c8a0', '#c08858', '#7a4a28'],
    plat: ['#ffe0a0', '#d8a050', '#7a4a18'],
    log: ['#c88a48', '#8a5424', '#4a2810', '#f4d090', '#c89850'],
    den: ['#a86a34', '#6fe35f', '#2a1206'],
  },
  caves: {
    sky: ['#140a1c', '#2a1424', '#4a2a1a'],
    g: '#ffc23a', G: '#d07a10', d: '#6a4a38', D: '#3e2a1e', s: '#8a6a50',
    r: '#f0a020', R: '#5a2e06', h: '#ffe080',
    stone: ['#a89080', '#786050', '#3e2e24'],
    plat: ['#ffe080', '#e0a020', '#6a3a08'],
    log: ['#a87048', '#6a4424', '#30180a', '#e8c080', '#b08850'],
    den: ['#f0a020', '#ffd060', '#3a1a04'],
  },
  snow: {
    sky: ['#4a3a98', '#d8709a', '#ffc890'],
    g: '#ffffff', G: '#b8d8f8', d: '#6a7ab8', D: '#46508a', s: '#9aaae0',
    r: '#9ad4f4', R: '#2a5a90', h: '#e8f8ff',
    stone: ['#e0e8f8', '#a0b0d0', '#5a6a98'],
    plat: ['#ffffff', '#a8d0f0', '#3a5a90'],
    log: ['#a87858', '#6a4a34', '#3a2418', '#f0e0c0', '#c8a888'],
    den: ['#e8f4ff', '#ffffff', '#2a3a6a'],
  },
};

const GROUND_TOP = [
  'gggggggggggggggg',
  'gggggggggggggggg',
  'GgggGggggggGgggg',
  'GGgGGGggGgGGGgGG',
  'dGdGdGGdGGdGdGGd',
  'dddddddDdddddddd',
  'ddDdddddddddsddd',
  'dddddsdddddddddd',
  'dddddddddDdddddd',
  'dDdddddddddddddd',
  'dddddddsdddddDdd',
  'ddddDddddddddddd',
  'dddddddddddddddd',
  'ddsddddddDdddddd',
  'dddddddddddddsdd',
  'dDdddddddddddddd',
];

const GROUND_FILL = [
  'dddddddDdddddddd',
  'ddDdddddddddsddd',
  'dddddsdddddddddd',
  'dddddddddDdddddd',
  'dDdddddddddddddd',
  'dddddddsdddddDdd',
  'ddddDddddddddddd',
  'dddddddddddddddd',
  'ddsddddddDdddddd',
  'dddddddddddddsdd',
  'dDdddddddddddddd',
  'ddddddDddddddddd',
  'dddsdddddddddDdd',
  'dddddddddddddddd',
  'dddddddDdddsdddd',
  'ddDddddddddddddd',
];

const PAW_BLOCK = [
  'kkkkkkkkkkkkkkkk',
  'kwwwwwwwwwwwwwwk',
  'kwyyyyyyyyyyyyYk',
  'kwyyyppyyppyyyYk',
  'kwyyyppyyppyyyYk',
  'kwppyyyyyyyyppYk',
  'kwppyyyyyyyyppYk',
  'kwyyyyyyyyyyyyYk',
  'kwyyyyppppyyyyYk',
  'kwyyyppppppyyyYk',
  'kwyyppppppppyyYk',
  'kwyyppppppppyyYk',
  'kwyyyppppppyyyYk',
  'kwyyyyyyyyyyyyYk',
  'kYYYYYYYYYYYYYYk',
  'kkkkkkkkkkkkkkkk',
];

function buildTiles(t) {
  const groundPal = { g: t.g, G: t.G, d: t.d, D: t.D, s: t.s };
  const brick = paint(TILE, TILE, ({ rect, px }) => {
    rect(0, 0, 16, 16, t.r);
    rect(0, 0, 16, 1, t.R); rect(0, 8, 16, 1, t.R);
    for (let y = 1; y < 8; y++) { px(7, y, t.R); px(15, y, t.R); }
    for (let y = 9; y < 16; y++) { px(3, y, t.R); px(11, y, t.R); }
    rect(0, 1, 7, 1, t.h); rect(8, 1, 7, 1, t.h);
    rect(0, 9, 3, 1, t.h); rect(4, 9, 7, 1, t.h); rect(12, 9, 4, 1, t.h);
  });
  const block = (y, w, Y, p) => fromRows(PAW_BLOCK, { k: '#5a2a00', w, y, Y, p });
  const [s1, s2, s3] = t.stone;
  const stone = paint(TILE, TILE, ({ rect, px }) => {
    rect(0, 0, 16, 16, s2);
    rect(0, 0, 16, 1, s1); rect(0, 0, 1, 16, s1);
    rect(0, 15, 16, 1, s3); rect(15, 0, 1, 16, s3);
    rect(3, 3, 10, 10, s1); rect(4, 4, 9, 9, s2);
    px(3, 12, s3); px(12, 3, s3);
  });
  const [p1, p2, p3] = t.plat;
  const plat = paint(TILE, TILE, ({ rect, px }) => {
    rect(0, 0, 16, 6, p2);
    rect(0, 0, 16, 1, p3); rect(0, 1, 16, 1, p1); rect(0, 5, 16, 1, p3);
    px(0, 2, p3); px(0, 3, p3); px(0, 4, p3); px(8, 2, p3); px(8, 3, p3); px(8, 4, p3);
    px(4, 3, p3); px(12, 3, p3);
  });
  const spikes = paint(TILE, TILE, ({ px }) => {
    for (let s = 0; s < 2; s++) {
      for (let r = 0; r < 8; r++) {
        const half = Math.floor(r / 2) + 1;
        for (let x = 4 - half; x < 4 + half; x++) px(s * 8 + x, 8 + r, x < 4 ? '#f0f4ff' : '#8890b0');
      }
    }
  });
  // Logs are two tiles wide; paint at 32px then slice into halves.
  const [l1, l2, l3, l4, l5] = t.log;
  const logBody = paint(32, 16, ({ rect }) => {
    rect(0, 0, 32, 16, l1);
    rect(0, 0, 1, 16, l3); rect(31, 0, 1, 16, l3);
    rect(1, 0, 3, 16, l4);
    rect(26, 0, 5, 16, l2);
    [8, 14, 20].forEach(x => rect(x, 0, 1, 16, l2));
    rect(11, 4, 1, 5, l2); rect(17, 9, 1, 5, l2);
  });
  const logTop = paint(32, 16, ({ g, ellipse, rect }) => {
    g.drawImage(logBody, 0, 0);
    ellipse(16, 5, 16, 5, l3);
    ellipse(16, 5, 15, 4, l4);
    ellipse(16, 5, 11, 3, l5);
    ellipse(16, 5, 7, 2, l4);
    ellipse(16, 5, 3, 1, l5);
    rect(0, 10, 32, 1, l3);
  });
  const half = (src, x) => {
    const c = makeCanvas(16, 16);
    c.getContext('2d').drawImage(src, -x, 0);
    return c;
  };
  const shroom = squash => paint(TILE, TILE, ({ ellipse, rect, px }) => {
    rect(5, 10, 6, 6, '#2a1608'); rect(6, 10, 4, 6, '#f8e0b0');
    const top = 2 + squash;
    ellipse(8, top + 5, 8, 5, '#2a1608');
    ellipse(8, top + 5, 7, 4, '#e8413a');
    rect(0, top + 8, 16, 2, '#2a1608');
    px(4, top + 3, '#fff'); px(5, top + 3, '#fff'); px(4, top + 4, '#fff'); px(5, top + 4, '#fff');
    px(10, top + 2, '#fff'); px(11, top + 2, '#fff'); px(11, top + 3, '#fff');
    px(8, top + 6, '#fff');
  });
  return {
    groundTop: fromRows(GROUND_TOP, groundPal),
    ground: fromRows(GROUND_FILL, groundPal),
    brick,
    q: [block('#ffc93a', '#fff6c0', '#c87a10', '#8a4a10'), block('#ffe680', '#ffffff', '#e09a20', '#a85a10')],
    used: block('#a8743c', '#c89a68', '#704818', '#704818'),
    stone,
    plat,
    spikes,
    logTL: half(logTop, 0), logTR: half(logTop, 16),
    logL: half(logBody, 0), logR: half(logBody, 16),
    spring: [shroom(0), shroom(3)],
  };
}

// ---------------------------------------------------------------- scenery

function buildScenery(t) {
  const [body, cap, door] = t.den;
  const den = addOutline(paint(72, 56, ({ ellipse, rect, px }) => {
    ellipse(36, 58, 34, 50, body);
    ellipse(36, 58, 34, 50, body);
    for (let x = 4; x < 68; x++) {
      const dx = (x + 0.5 - 36) / 34;
      const y = Math.round(58 - 50 * Math.sqrt(Math.max(0, 1 - dx * dx)));
      rect(x, y, 1, 4 + ((x * 7) % 3), cap);
    }
    ellipse(36, 36, 10, 10, door);
    rect(26, 36, 20, 20, door);
    // little paw sign over the door
    ellipse(36, 20, 3, 2.5, door);
    [[31, 16], [34, 14], [38, 14], [41, 16]].forEach(([x, y]) => { px(x, y, door); px(x + 1, y, door); });
  }), '#1a0a04');
  const flag = addOutline(paint(18, 14, ({ rect, ellipse, px }) => {
    rect(1, 1, 16, 12, '#3fc44f');
    rect(1, 1, 16, 2, '#7fe88f');
    ellipse(9, 9, 3, 2.5, '#ffffff');
    [[5, 5], [8, 4], [11, 4], [13, 6]].forEach(([x, y]) => px(x, y, '#ffffff'));
  }), '#103a10');
  const pennant = color => addOutline(paint(12, 10, ({ px }) => {
    for (let y = 1; y < 9; y++) {
      const len = 9 - Math.abs(y - 4.5) * 2;
      for (let x = 1; x < 1 + len; x++) px(x, y, color);
    }
  }), '#1a1a1a');
  return { den, flag, checkOff: pennant('#a0a0a0'), checkOn: pennant('#ffd23a') };
}

// Turn anti-aliased path drawing back into hard pixels.
function pixelate(c) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return c;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

// Banded, dithered 8-bit style sky.
function buildSky(stops) {
  const c = makeCanvas(VIEW_W, VIEW_H);
  const g = c.getContext('2d');
  const bands = 12, bh = VIEW_H / bands;
  const colorAt = t => {
    const seg = t * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    return mix(stops[i], stops[i + 1], seg - i);
  };
  for (let b = 0; b < bands; b++) {
    g.fillStyle = colorAt(b / (bands - 1));
    g.fillRect(0, Math.floor(b * bh), VIEW_W, Math.ceil(bh) + 1);
    if (b > 0) {
      // checkerboard dither into the previous band
      g.fillStyle = colorAt((b - 1) / (bands - 1));
      const y0 = Math.floor(b * bh);
      for (let y = y0; y < y0 + 2; y++) {
        for (let x = (y % 2); x < VIEW_W; x += 2) g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

const LAYER_W = 512;

// Draw a shape at x and its wrapped copies so layers tile seamlessly.
function wrapped(fn) {
  for (const off of [-LAYER_W, 0, LAYER_W]) fn(off);
}

function cloud(g, x, y, s) {
  const blobs = [[0, 6, 9, 7], [10, 0, 12, 11], [24, 4, 10, 8], [-8, 10, 8, 5], [32, 10, 8, 5]];
  g.fillStyle = '#a8dcf8';
  blobs.forEach(([bx, by, rx, ry]) => { g.beginPath(); g.ellipse(x + bx * s, y + by * s + 2, rx * s, ry * s, 0, 0, 7); g.fill(); });
  g.fillStyle = '#ffffff';
  blobs.forEach(([bx, by, rx, ry]) => { g.beginPath(); g.ellipse(x + bx * s, y + by * s, rx * s, ry * s, 0, 0, 7); g.fill(); });
}

function buildBackground(key) {
  const t = THEMES[key];
  const layers = [];
  const layer = (f, draw) => {
    const c = makeCanvas(LAYER_W, VIEW_H);
    draw(c.getContext('2d'));
    layers.push({ img: pixelate(c), f });
  };
  if (key === 'meadow') {
    layer(0.1, g => {
      [[40, 30, 1], [200, 58, 0.8], [330, 22, 1.1], [455, 70, 0.7]].forEach(([x, y, s]) => wrapped(o => cloud(g, x + o, y, s)));
    });
    layer(0.25, g => {
      [[60, 200, 90, 80], [250, 215, 120, 95], [430, 205, 80, 60]].forEach(([x, y, rx, ry]) => wrapped(o => {
        g.fillStyle = '#3f9e4f';
        g.beginPath(); g.ellipse(x + o, y, rx + 2, ry + 2, 0, 0, 7); g.fill();
        g.fillStyle = '#7ad86a';
        g.beginPath(); g.ellipse(x + o, y, rx, ry, 0, 0, 7); g.fill();
        g.fillStyle = '#9ae88a';
        for (let i = 0; i < 6; i++) g.fillRect(x + o - rx / 2 + i * rx / 4, y - ry * 0.6 + (i % 2) * 14, 4, 2);
      }));
    });
    layer(0.55, g => {
      for (let i = 0; i < 9; i++) {
        const x = i * 57 + (i % 3) * 11, r = 10 + (i % 3) * 4;
        wrapped(o => {
          g.fillStyle = '#1f7a2f';
          [[-r, 3], [0, 0], [r, 3]].forEach(([bx, by]) => { g.beginPath(); g.ellipse(x + o + bx, 186 + by, r + 1, r + 1, 0, 0, 7); g.fill(); });
          g.fillStyle = '#3fbe4f';
          [[-r, 3], [0, 0], [r, 3]].forEach(([bx, by]) => { g.beginPath(); g.ellipse(x + o + bx, 186 + by, r, r, 0, 0, 7); g.fill(); });
          g.fillStyle = ['#ff6a8a', '#ffe14d', '#ffffff'][i % 3];
          g.fillRect(x + o - 3, 178, 2, 2); g.fillRect(x + o + 6, 181, 2, 2);
        });
      }
    });
  } else if (key === 'caves') {
    layer(0.15, g => {
      // honeycomb wall
      const hw = 24, hh = 21;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < LAYER_W / hw + 1; col++) {
          const cx = col * hw + (row % 2) * hw / 2, cy = row * hh;
          g.fillStyle = '#3a2210';
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + k * Math.PI / 3;
            g.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
          }
          g.fill();
          g.fillStyle = (row * 7 + col * 3) % 11 === 0 ? '#7a4a12' : '#24140a';
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 6 + k * Math.PI / 3;
            g.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
          }
          g.fill();
        }
      }
    });
    layer(0.5, g => {
      for (let i = 0; i < 14; i++) {
        const x = i * 37 + (i % 4) * 7, len = 20 + ((i * 13) % 40);
        wrapped(o => {
          g.fillStyle = '#1a0c06';
          g.beginPath(); g.moveTo(x + o - 9, 0); g.lineTo(x + o + 9, 0); g.lineTo(x + o, len); g.fill();
          g.fillStyle = '#f0a020';
          if (i % 3 === 0) g.fillRect(x + o - 1, len + 4, 3, 3);
        });
      }
    });
  } else if (key === 'snow') {
    layer(0.12, g => {
      [[40, 70, 90], [180, 50, 120], [330, 80, 100], [460, 60, 90]].forEach(([x, peak, half]) => wrapped(o => {
        g.fillStyle = '#7a6ab8';
        g.beginPath(); g.moveTo(x + o - half, 200); g.lineTo(x + o, peak); g.lineTo(x + o + half, 200); g.fill();
        g.fillStyle = '#5a4a98';
        g.beginPath(); g.moveTo(x + o, peak); g.lineTo(x + o + half, 200); g.lineTo(x + o + half * 0.3, 200); g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(x + o - half * 0.3, peak + 30); g.lineTo(x + o, peak); g.lineTo(x + o + half * 0.3, peak + 30);
        g.lineTo(x + o + 8, peak + 24); g.lineTo(x + o, peak + 32); g.lineTo(x + o - 10, peak + 24); g.fill();
      }));
    });
    layer(0.45, g => {
      for (let i = 0; i < 16; i++) {
        const x = i * 32 + (i % 3) * 9, h = 34 + (i % 4) * 10;
        wrapped(o => {
          for (let tier = 0; tier < 3; tier++) {
            const ty = 186 - h + tier * h / 3.2, tw = 6 + tier * 4;
            g.fillStyle = '#1f4a4a';
            g.beginPath(); g.moveTo(x + o, ty); g.lineTo(x + o + tw, ty + h / 2.6); g.lineTo(x + o - tw, ty + h / 2.6); g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath(); g.moveTo(x + o, ty); g.lineTo(x + o + tw / 3, ty + h / 8); g.lineTo(x + o - tw / 3, ty + h / 8); g.fill();
          }
          g.fillStyle = '#4a2a1a';
          g.fillRect(x + o - 2, 184, 4, 6);
        });
      }
    });
  }
  return { sky: buildSky(t.sky), layers };
}

// ---------------------------------------------------------------- build all

export const SPR = {};

export function buildSprites() {
  SPR.cubs = { A: buildCub(CUBS.A), P: buildCub(CUBS.P) };
  SPR.items = buildItems();
  SPR.enemies = buildEnemies();
  SPR.tiles = {};
  SPR.scenery = {};
  SPR.bg = {};
  for (const key of Object.keys(THEMES)) {
    SPR.tiles[key] = buildTiles(THEMES[key]);
    SPR.scenery[key] = buildScenery(THEMES[key]);
    SPR.bg[key] = buildBackground(key);
  }
}

export { LAYER_W };
