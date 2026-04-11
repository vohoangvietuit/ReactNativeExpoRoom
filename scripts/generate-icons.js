#!/usr/bin/env node
/**
 * FitSync Icon Generator
 * Generates all required app icon PNG assets using pure Node.js (no external deps).
 * FitSync brand: blue #208AEF, dark blue #0A5EAA, white
 */
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

/** pixelFn(x, y, w, h) → [r, g, b, a] each 0-255 */
function encodePNG(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = 1 + width * 4;
  const raw = Buffer.allocUnsafe(height * rowBytes);
  raw.fill(0);

  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const o = y * rowBytes + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function dist(x, y, cx, cy) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

// Anti-aliased circle edge check: returns 0-1 coverage
function circleAlpha(x, y, cx, cy, r) {
  const d = dist(x, y, cx, cy);
  return clamp(Math.round((r + 0.5 - d) * 255));
}

// Rounded rect (uniform corner radius) alpha
function roundedRectAlpha(x, y, rx, ry, rw, rh, cr) {
  const inside =
    inRect(x, y, rx + cr, ry, rw - 2 * cr, rh) || inRect(x, y, rx, ry + cr, rw, rh - 2 * cr);
  if (inside) return 255;
  // Check corners
  const corners = [
    [rx + cr, ry + cr],
    [rx + rw - cr, ry + cr],
    [rx + cr, ry + rh - cr],
    [rx + rw - cr, ry + rh - cr],
  ];
  for (const [cx, cy] of corners) {
    const d = dist(x, y, cx, cy);
    if (d <= cr + 0.5) return clamp(Math.round((cr + 0.5 - d) * 255));
  }
  return 0;
}

// ─── FitSync brand ───────────────────────────────────────────────────────────

const BRAND_BLUE = [32, 138, 239]; // #208AEF
const BRAND_DARK = [10, 94, 170]; // #0A5EAA
const WHITE = [255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

// Lerp between two colors based on t (0-1)
function lerpColor(c1, c2, t) {
  return [
    clamp(c1[0] + (c2[0] - c1[0]) * t),
    clamp(c1[1] + (c2[1] - c1[1]) * t),
    clamp(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

/**
 * Draw the stylised "F" letterform used as the FitSync icon mark.
 * Returns pixel alpha (0-255) for white foreground.
 */
function fLetterAlpha(x, y, cx, cy, size) {
  // Dimensions relative to size
  const stemW = size * 0.14; // vertical bar width
  const stemH = size * 0.6; // vertical bar height
  const topBarW = size * 0.38; // top horizontal bar width
  const midBarW = size * 0.28; // middle horizontal bar width
  const barH = size * 0.12; // bar height

  const left = cx - stemW / 2;
  const top = cy - stemH / 2;

  // Vertical stem
  if (x >= left && x < left + stemW && y >= top && y < top + stemH) return 255;

  // Top bar
  if (x >= left && x < left + topBarW && y >= top && y < top + barH) return 255;

  // Middle bar
  if (x >= left && x < left + midBarW && y >= top + stemH * 0.4 && y < top + stemH * 0.4 + barH)
    return 255;

  return 0;
}

// ─── Icon generators ──────────────────────────────────────────────────────────

/** Main app icon: rounded-square blue gradient background + white "F" */
function makeMainIcon(size) {
  return encodePNG(size, size, (x, y, w, h) => {
    const cr = size * 0.22; // corner radius (iOS-style squircle)
    const alpha = roundedRectAlpha(x, y, 0, 0, w, h, cr);
    if (alpha === 0) return [0, 0, 0, 0];

    // Diagonal gradient top-left (light blue) → bottom-right (dark blue)
    const t = (x / w + y / h) / 2;
    const [r, g, b] = lerpColor(BRAND_BLUE, BRAND_DARK, t);

    const fAlpha = fLetterAlpha(x, y, w / 2, h / 2, size * 0.55);
    if (fAlpha > 0) {
      // Blend white F over gradient
      const blend = fAlpha / 255;
      return [
        clamp(r * (1 - blend) + WHITE[0] * blend),
        clamp(g * (1 - blend) + WHITE[1] * blend),
        clamp(b * (1 - blend) + WHITE[2] * blend),
        alpha,
      ];
    }

    return [r, g, b, alpha];
  });
}

/** Adaptive icon foreground: transparent background, white "F" centred in safe zone */
function makeAdaptiveForeground(size) {
  return encodePNG(size, size, (x, y, w, h) => {
    // Android adaptive: 108dp total, 72dp safe zone → ~66% centred
    const safeScale = 0.6;
    const fAlpha = fLetterAlpha(x, y, w / 2, h / 2, size * safeScale);
    if (fAlpha > 0) return [255, 255, 255, fAlpha];
    return [0, 0, 0, 0];
  });
}

/** Adaptive icon background: solid brand blue, fully opaque */
function makeAdaptiveBackground(size) {
  return encodePNG(size, size, () => [...BRAND_BLUE, 255]);
}

/** Monochrome icon: black "F" on transparent (for Android 13+ themed icons) */
function makeMonochrome(size) {
  return encodePNG(size, size, (x, y, w, h) => {
    const fAlpha = fLetterAlpha(x, y, w / 2, h / 2, size * 0.6);
    if (fAlpha > 0) return [0, 0, 0, fAlpha];
    return [0, 0, 0, 0];
  });
}

/** Splash screen icon: white "F" on transparent  */
function makeSplashIcon(size) {
  return encodePNG(size, size, (x, y, w, h) => {
    const fAlpha = fLetterAlpha(x, y, w / 2, h / 2, size * 0.7);
    if (fAlpha > 0) return [255, 255, 255, fAlpha];
    return [0, 0, 0, 0];
  });
}

/** Favicon: small solid blue square */
function makeFavicon(size) {
  return encodePNG(size, size, (x, y, w, h) => {
    const cr = size * 0.15;
    const alpha = roundedRectAlpha(x, y, 0, 0, w, h, cr);
    if (alpha === 0) return [0, 0, 0, 0];
    const fAlpha = fLetterAlpha(x, y, w / 2, h / 2, size * 0.6);
    if (fAlpha > 0) {
      const blend = fAlpha / 255;
      return [
        clamp(BRAND_BLUE[0] * (1 - blend) + WHITE[0] * blend),
        clamp(BRAND_BLUE[1] * (1 - blend) + WHITE[1] * blend),
        clamp(BRAND_BLUE[2] * (1 - blend) + WHITE[2] * blend),
        alpha,
      ];
    }
    return [...BRAND_BLUE, alpha];
  });
}

// ─── Write files ──────────────────────────────────────────────────────────────

const OUT = path.resolve(__dirname, '../apps/mobile/assets/images');

const icons = [
  { file: 'icon.png', gen: () => makeMainIcon(1024), label: 'Main icon (1024×1024)' },
  {
    file: 'android-icon-foreground.png',
    gen: () => makeAdaptiveForeground(1024),
    label: 'Adaptive foreground (1024×1024)',
  },
  {
    file: 'android-icon-background.png',
    gen: () => makeAdaptiveBackground(1024),
    label: 'Adaptive background (1024×1024)',
  },
  {
    file: 'android-icon-monochrome.png',
    gen: () => makeMonochrome(1024),
    label: 'Monochrome (1024×1024)',
  },
  { file: 'splash-icon.png', gen: () => makeSplashIcon(200), label: 'Splash icon (200×200)' },
  { file: 'favicon.png', gen: () => makeFavicon(48), label: 'Favicon (48×48)' },
];

console.log('Generating FitSync icon assets...\n');
for (const { file, gen, label } of icons) {
  process.stdout.write(`  ${label}...`);
  const buf = gen();
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log(` ✓  (${(buf.length / 1024).toFixed(1)} KB)`);
}
console.log('\nDone. Assets written to apps/mobile/assets/images/');
