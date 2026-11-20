// news-image-20261119 — one image summing up Thursday 19 November 2026.
// Node 22, standard library only. No network, no external assets.
// Writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png): 1024x1024 PNG.
// Deterministic: no randomness, no clocks, no timestamps in the output.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits, most significant bit left.
// Only the characters the layout uses are defined; unknown chars draw blank.
// ---------------------------------------------------------------------------
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
};

// ---------------------------------------------------------------------------
// Framebuffer: 1024x1024 RGB.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

function setPix(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

function fill(r, g, b) {
  for (let i = 0; i < px.length; i += 3) { px[i] = r; px[i + 1] = g; px[i + 2] = b; }
}

function rect(x, y, w, h, r, g, b) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPix(xx, yy, r, g, b);
  }
}

// Filled circle via horizontal scanlines.
function disc(cx, cy, rad, r, g, b) {
  for (let dy = -rad; dy <= rad; dy++) {
    const dx = Math.floor(Math.sqrt(rad * rad - dy * dy));
    for (let xx = cx - dx; xx <= cx + dx; xx++) setPix(xx, cy + dy, r, g, b);
  }
}

// Circle outline, 1px thick.
function ring(cx, cy, rad, r, g, b) {
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    setPix(Math.round(cx + rad * Math.cos(t)), Math.round(cy + rad * Math.sin(t)), r, g, b);
  }
}

// Bresenham line, 1px thick.
function line(x0, y0, x1, y1, r, g, b) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPix(x, y, r, g, b);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function drawChar(ch, x, y, s, r, g, b) {
  const glyph = FONT[ch] || FONT[' '];
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (0x10 >> col)) rect(x + col * s, y + row * s, s, s, r, g, b);
    }
  }
}

function textWidth(str, s) {
  return str.length * 6 * s - s;
}

// align: 'l' left, 'c' centred on x.
function drawText(str, x, y, s, r, g, b, align) {
  let sx = x;
  if (align === 'c') sx = x - Math.floor(textWidth(str, s) / 2);
  for (let i = 0; i < str.length; i++) drawChar(str[i], sx + i * 6 * s, y, s, r, g, b);
}

// Greedy word wrap to a pixel width; returns lines.
function wrap(str, maxW, s) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, s) <= maxW) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder: filter-0 scanlines, zlib deflate, CRC32. No ancillary chunks,
// so the output carries no timestamps and is byte-identical across runs.
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
  crc.copy(out, 8 + data.length);
  return out;
}

function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Colours.
// ---------------------------------------------------------------------------
const PAPER = [246, 241, 227];
const INK = [20, 18, 16];
const RED = [163, 22, 33];
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// ---------------------------------------------------------------------------
// Scenes. Each draws inside (x, y, w, h) — the picture area of one panel.
// ---------------------------------------------------------------------------

// 1. Three flags over a summit table: US, China, Russia.
function sceneSummit(x, y, w, h) {
  rect(x, y, w, h, 214, 228, 240); // pale sky
  rect(x, y + h - 26, w, 26, 122, 94, 60); // table
  const flags = [
    { fx: x + 52, pole: 0, draw: (fx, fy) => {
      for (let i = 0; i < 7; i++) rect(fx, fy + i * 6, 62, 6, i % 2 ? 255 : 178, i % 2 ? 255 : 34, i % 2 ? 255 : 34);
      rect(fx, fy, 26, 20, 60, 59, 110);
      for (let s = 0; s < 6; s++) setPix(fx + 4 + (s % 3) * 7, fy + 4 + Math.floor(s / 3) * 7, 255, 255, 255);
    } },
    { fx: x + 196, pole: 1, draw: (fx, fy) => {
      rect(fx, fy, 62, 42, 222, 32, 32);
      disc(fx + 14, fy + 12, 5, 255, 222, 0);
      disc(fx + 34, fy + 8, 2, 255, 222, 0);
      disc(fx + 40, fy + 14, 2, 255, 222, 0);
      disc(fx + 34, fy + 20, 2, 255, 222, 0);
    } },
    { fx: x + 340, pole: 2, draw: (fx, fy) => {
      rect(fx, fy, 62, 14, 255, 255, 255);
      rect(fx, fy + 14, 62, 14, 0, 87, 183);
      rect(fx, fy + 28, 62, 14, 213, 0, 0);
    } },
  ];
  for (const f of flags) {
    line(f.fx + 2, y + 8, f.fx + 2, y + h - 26, 60, 50, 40);
    disc(f.fx + 2, y + 6, 3, 200, 170, 60);
    f.draw(f.fx + 6, y + 12);
  }
  // Microphones on the table.
  for (const mx of [x + 150, x + 230, x + 310]) {
    line(mx, y + h - 52, mx, y + h - 26, 40, 40, 40);
    disc(mx, y + h - 56, 5, 40, 40, 40);
  }
}

// 2. Vice City sunset: banded sky, sun, skyline, palms.
function sceneVice(x, y, w, h) {
  const bands = [
    [255, 183, 77], [255, 140, 90], [244, 114, 140],
    [199, 91, 160], [124, 74, 160], [70, 52, 140],
  ];
  const bh = Math.ceil(h / bands.length);
  bands.forEach((c, i) => rect(x, y + i * bh, w, bh, c[0], c[1], c[2]));
  disc(x + Math.floor(w * 0.68), y + 46, 26, 255, 240, 180); // sun
  // Skyline.
  const sky = [[0, 78, 34, 46], [52, 66, 44, 58], [112, 84, 30, 40], [160, 60, 52, 64], [230, 72, 36, 52], [284, 58, 46, 66], [350, 80, 34, 44], [404, 66, 40, 58]];
  for (const [bx, by, bw, bh2] of sky) rect(x + bx, y + h - 30 - bh2, bw, bh2, 30, 20, 46);
  rect(x, y + h - 30, w, 30, 24, 16, 40); // ground
  // Two palm silhouettes.
  for (const px0 of [x + 30, x + w - 46]) {
    line(px0, y + h - 30, px0 + 8, y + h - 92, 24, 16, 40);
    line(px0 + 8, y + h - 92, px0 - 16, y + h - 108, 24, 16, 40);
    line(px0 + 8, y + h - 92, px0 + 32, y + h - 108, 24, 16, 40);
    line(px0 + 8, y + h - 92, px0 + 6, y + h - 118, 24, 16, 40);
    line(px0 + 8, y + h - 92, px0 - 4, y + h - 116, 24, 16, 40);
  }
  drawText('VI', x + Math.floor(w / 2) - 10, y + 8, 4, 255, 255, 255, 'l');
}

// 3. Voyager 1 in deep space: fixed star field, gold dish, Earth.
function sceneVoyager(x, y, w, h) {
  rect(x, y, w, h, 8, 16, 40);
  let seed = 19112026; // fixed seed: deterministic star field
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 70; i++) {
    const sx = x + Math.floor(rnd() * w);
    const sy = y + Math.floor(rnd() * h);
    const s = rnd() > 0.85 ? 2 : 1;
    rect(sx, sy, s, s, 255, 255, 255);
  }
  // Trajectory from Earth to the probe.
  for (let i = 0; i <= 24; i++) {
    const tx = x + 60 + i * 14;
    const ty = y + h - 34 - Math.floor(i * 3.4);
    if (i % 2 === 0) rect(tx, ty, 7, 2, 140, 190, 230);
  }
  disc(x + 62, y + h - 30, 20, 70, 130, 200); // Earth
  disc(x + 56, y + h - 36, 6, 90, 180, 110);
  disc(x + 70, y + h - 22, 4, 90, 180, 110);
  // Voyager: bus + dish + boom.
  const cx = x + Math.floor(w * 0.72);
  const cy = y + 52;
  line(cx - 60, cy + 40, cx, cy + 8, 200, 200, 200);
  rect(cx - 14, cy - 6, 28, 14, 200, 170, 90);
  line(cx + 14, cy + 2, cx + 46, cy - 26, 220, 220, 220);
  disc(cx + 48, cy - 28, 12, 240, 230, 200);
  ring(cx + 48, cy - 28, 12, 180, 170, 140);
  line(cx - 14, cy + 4, cx - 44, cy + 22, 220, 220, 220);
  disc(cx - 46, cy + 24, 3, 255, 100, 60);
}

// 4. Van Gogh's "Chestnut Trees in Blossom": framed canvas, tree, blossom.
function sceneVanGogh(x, y, w, h) {
  rect(x, y, w, h, 60, 52, 44); // dark wall
  const fx = x + 70, fy = y + 10, fw = w - 140, fh = h - 20;
  rect(fx - 8, fy - 8, fw + 16, fh + 16, 190, 150, 60); // gold frame
  rect(fx, fy, fw, Math.floor(fh * 0.55), 150, 190, 235); // sky
  rect(fx, fy + Math.floor(fh * 0.55), fw, fh - Math.floor(fh * 0.55), 120, 170, 90); // field
  disc(fx + fw - 40, fy + 22, 12, 255, 240, 160); // sun
  // Chestnut tree: trunk + blossom canopy.
  const tx = fx + Math.floor(fw * 0.42);
  rect(tx - 7, fy + 34, 14, fh - 34, 90, 60, 35);
  line(tx - 7, fy + 50, tx - 30, fy + 30, 90, 60, 35);
  line(tx + 7, fy + 46, tx + 32, fy + 26, 90, 60, 35);
  const blobs = [[-46, 18, 26], [-18, 6, 30], [14, 10, 28], [40, 24, 24], [-30, 34, 20], [26, 34, 20]];
  for (const [bx, by, br] of blobs) {
    disc(tx + bx, fy + by, br, 90, 140, 70);
    disc(tx + bx - 6, fy + by - 4, 6, 250, 245, 235);
    disc(tx + bx + 8, fy + by + 2, 5, 250, 245, 235);
    disc(tx + bx, fy + by + 8, 4, 240, 200, 220);
  }
  // Price tag on the frame.
  rect(fx + fw - 96, fy + fh - 26, 88, 18, 20, 18, 16);
  drawText('$190.4M', fx + fw - 92, fy + fh - 23, 1, 255, 220, 90, 'l');
  // Falling blossom petals in the field below the tree.
  const petals = [[30, 96, 3], [66, 108, 2], [104, 100, 3], [150, 112, 2], [196, 102, 3], [238, 110, 2], [282, 98, 3], [330, 108, 2]];
  for (const [px0, py0, pr] of petals) disc(fx + px0, fy + py0, pr, 250, 235, 240);
}

// 5. Kerch Bridge: sea, deck with a broken gap, smoke, arch.
function sceneKerch(x, y, w, h) {
  rect(x, y, w, h, 180, 205, 225); // grey-blue sky
  rect(x, y + 84, w, h - 84, 40, 110, 160); // sea
  // Waves.
  for (let i = 0; i < 8; i++) {
    const wx = x + 20 + i * 56;
    line(wx, y + 108 + (i % 2) * 12, wx + 26, y + 108 + (i % 2) * 12, 200, 225, 240);
    line(wx + 8, y + 126 + (i % 3) * 6, wx + 30, y + 126 + (i % 3) * 6, 170, 205, 225);
  }
  // Bridge arch.
  for (let a = 0; a <= 180; a += 2) {
    const t = (a * Math.PI) / 180;
    setPix(Math.round(x + 60 + 170 * (1 - Math.cos(t)) * 0.5 + 60), Math.round(y + 78 - 44 * Math.sin(t)), 90, 90, 95);
  }
  // Deck: two segments with a gap in the middle.
  rect(x + 30, y + 72, 150, 10, 70, 72, 78);
  rect(x + 290, y + 72, 150, 10, 70, 72, 78);
  line(x + 30, y + 82, x + 180, y + 82, 50, 52, 56);
  line(x + 290, y + 82, x + 440, y + 82, 50, 52, 56);
  // Pillars.
  rect(x + 60, y + 82, 12, 34, 60, 62, 66);
  rect(x + 400, y + 82, 12, 34, 60, 62, 66);
  // Broken deck piece tilting into the sea.
  line(x + 196, y + 78, x + 236, y + 96, 70, 72, 78);
  line(x + 200, y + 84, x + 240, y + 102, 70, 72, 78);
  // Smoke puffs above the gap.
  disc(x + 218, y + 44, 12, 120, 120, 125);
  disc(x + 236, y + 30, 16, 140, 140, 145);
  disc(x + 256, y + 48, 10, 110, 110, 115);
  disc(x + 246, y + 16, 12, 160, 160, 165);
}

// 6. Cyclone Akvan: spiral over the sea, coastline, rain.
function sceneCyclone(x, y, w, h) {
  rect(x, y, w, h, 120, 160, 190); // sea
  // Land (India's east coast) bottom right.
  for (let i = 0; i < 60; i++) {
    const lx = x + w - 10 - i * 4;
    const ly = y + h - 8 - Math.floor(26 * Math.sin(i / 9) + i * 0.4);
    rect(lx, ly, 6, y + h - ly, 200, 170, 110);
  }
  // Spiral: concentric arcs.
  const cx = x + Math.floor(w * 0.42);
  const cy = y + Math.floor(h * 0.46);
  for (let r = 12; r <= 62; r += 11) {
    for (let a = 20; a < 320; a += 2) {
      const t = ((a + r * 3) * Math.PI) / 180;
      setPix(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t) * 0.9), 255, 255, 255);
    }
  }
  disc(cx, cy, 8, 240, 240, 235); // eye
  // Rain streaks.
  for (let i = 0; i < 26; i++) {
    const rx = x + 14 + ((i * 37) % (w - 30));
    const ry = y + 8 + ((i * 53) % (h - 40));
    line(rx, ry, rx - 6, ry + 12, 220, 235, 245);
  }
  // Evacuation arrow inland.
  line(x + w - 96, y + h - 40, x + w - 46, y + h - 40, 163, 22, 33);
  line(x + w - 46, y + h - 40, x + w - 56, y + h - 48, 163, 22, 33);
  line(x + w - 46, y + h - 40, x + w - 56, y + h - 32, 163, 22, 33);
}

// ---------------------------------------------------------------------------
// Panels: title strip, scene, caption. Six stories of 19 November 2026.
// ---------------------------------------------------------------------------
const PANELS = [
  {
    title: 'SUMMIT IN SHENZHEN', color: [31, 58, 95], scene: sceneSummit,
    caption: 'Trump, Xi and Putin meet for the first time at the APEC summit in Shenzhen. Nuclear arms, trade, Ukraine and Iran - no deal expected.',
  },
  {
    title: 'VICE CITY RETURNS', color: [123, 45, 139], scene: sceneVice,
    caption: 'GTA VI begins its global rollout. Gamers return to Vice City after a thirteen-year wait.',
  },
  {
    title: 'VOYAGER 1, ONE LIGHT-DAY OUT', color: [11, 42, 74], scene: sceneVoyager,
    caption: 'NASA marks the day after Voyager 1 crossed one light-day from Earth - nearly 50 years out.',
  },
  {
    title: 'VAN GOGH RECORD', color: [154, 123, 10], scene: sceneVanGogh,
    caption: '"Chestnut Trees in Blossom" sells for a record $190.4 million after a row over its Nazi past.',
  },
  {
    title: 'KERCH BRIDGE HIT AGAIN', color: [139, 26, 26], scene: sceneKerch,
    caption: 'The Crimean Bridge is attacked again - the third strike in a week. Traffic is halted.',
  },
  {
    title: 'CYCLONE AKVAN', color: [15, 118, 110], scene: sceneCyclone,
    caption: "Cyclone Akvan bears down on India's east coast. More than 46,700 people evacuated.",
  },
];

function drawPanel(p, x, y, w, h) {
  rect(x, y, w, h, 255, 255, 255); // panel paper
  // Border.
  rect(x, y, w, 2, ...INK);
  rect(x, y + h - 2, w, 2, ...INK);
  rect(x, y, 2, h, ...INK);
  rect(x + w - 2, y, 2, h, ...INK);
  // Title strip.
  rect(x + 2, y + 2, w - 4, 36, ...p.color);
  drawText(p.title, x + 14, y + 13, 2, ...WHITE, 'l');
  // Scene.
  p.scene(x + 2, y + 38, w - 4, 140);
  // Caption. The bitmap font holds capitals only, so uppercase first.
  const lines = wrap(p.caption.toUpperCase(), w - 28, 2);
  for (let i = 0; i < lines.length; i++) {
    drawText(lines[i], x + 14, y + 38 + 140 + 10 + i * 18, 2, ...INK, 'l');
  }
}

// ---------------------------------------------------------------------------
// Front page composition.
// ---------------------------------------------------------------------------
function main() {
  fill(...PAPER);
  const M = 24; // margin

  // Masthead.
  drawText('THE WORLD TODAY', Math.floor(W / 2), M, 6, ...INK, 'c');
  rect(M, M + 54, W - 2 * M, 4, ...RED);
  drawText('THURSDAY 19 NOVEMBER 2026', Math.floor(W / 2), M + 66, 3, ...INK, 'c');
  rect(M, M + 96, W - 2 * M, 3, ...INK);

  // Grid: 2 columns x 3 rows.
  const gridTop = M + 112;
  const gap = 14;
  const colW = Math.floor((W - 2 * M - gap) / 2);
  const rowH = 270;
  for (let i = 0; i < 6; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawPanel(PANELS[i], M + col * (colW + gap), gridTop + row * (rowH + gap), colW, rowH);
  }

  // Footer line.
  const footY = gridTop + 3 * rowH + 2 * gap + 12;
  drawText('ONE DAY OF SUMMITS, MILESTONES, AND STORMS.', Math.floor(W / 2), footY, 2, ...INK, 'c');

  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'entry.png');
  fs.writeFileSync(outPath, png);
  console.log('wrote ' + outPath + ' (' + png.length + ' bytes)');
}

main();
