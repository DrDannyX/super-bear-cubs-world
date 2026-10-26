// Small helpers for building pixel-art sprites at load time.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Build a sprite from rows of characters; each char is looked up in `pal`.
export function fromRows(rows, pal) {
  const w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, rows.length);
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  return c;
}

// Paint a sprite procedurally with a few primitives.
export function paint(w, h, fn) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rect = (x, y, rw, rh, col) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), rw, rh);
  };
  const px = (x, y, col) => rect(x, y, 1, 1, col);
  const ellipse = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
      }
    }
  };
  fn({ g, px, rect, ellipse, w, h });
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  // Reset so later drawing on this canvas (e.g. shirt letters) isn't mirrored.
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

export function flipV(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.translate(0, src.height);
  g.scale(1, -1);
  g.drawImage(src, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

// Solid-colour silhouette of a sprite (used for hurt / power flashes).
export function tint(src, color) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Add a 1px outline around every opaque pixel.
export function addOutline(src, color) {
  const w = src.width, h = src.height;
  const data = src.getContext('2d').getImageData(0, 0, w, h).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  g.drawImage(src, 0, 0);
  return c;
}

// Squash a sprite horizontally (used for the spinning bear claw).
export function squashX(src, scale, outW) {
  const w = Math.max(1, Math.round(src.width * scale));
  const c = makeCanvas(outW, src.height);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, Math.round((outW - w) / 2), 0, w, src.height);
  return c;
}
