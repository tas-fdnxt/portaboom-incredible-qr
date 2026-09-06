/**
 * Magic Tree send-still for Fabian.
 *
 * Encodes the living tip showtime URL (living10, never DEST) as ECC H.
 * Dark modules are 2.5D PORTABOOM / boom geometry in a regular QR grid.
 * The hero PORTABOOM stands IN the field (center data modules), not in a
 * sky band outside the quiet zone — PR#28 sticker is rejected.
 *
 * paintClean is a regression fixture only. paintLivingMatrix (flat cubes)
 * is not the send file.
 */
import { writeFile, mkdir, copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { DEST, LIVING_SHOWTIME_URL } from "./showtime-url.mjs";
import { vocabFor, inFinder, isTiming, inAlignment } from "../qr-encode.js";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const ART = "/opt/cursor/artifacts";
const require = createRequire(import.meta.url);

/** twin-tidy5 / living10 livery — scan tops stay dark enough for jsQR. */
const CREAM = [244, 239, 230];
const INK = [17, 19, 24];
const INK_SIDE = [10, 12, 16];
const NAVY = [27, 42, 74];
const NAVY_SIDE = [12, 16, 28];
const CAB_TOP = [96, 42, 6];
const CAB_FACE = [168, 78, 16];
const CAB_SIDE = [72, 36, 10];
const CAB_BAND = [27, 42, 74];
const STRIPE_R = [120, 18, 22];
const STRIPE_W = [52, 22, 20];
const STRIPE_TOP = [40, 14, 16];
const LED = [42, 255, 85];
const LED_CYAN = [40, 220, 230];
const LED_OFF = [62, 20, 20];
const AMBER_OFF = [90, 52, 8];
const STEEL = [160, 166, 174];
const STOP_R = [176, 18, 24];
const STOP_INK = [250, 250, 250];

/** Square modules so finders stay square. 3D lives inside each cell. */
const MOD = 18;
const QUIET = 4;
const TOP_H = 11;
const FACE_H = MOD - TOP_H;
const SIDE = 3;

function loadQrcode() {
  try {
    return require("qrcode");
  } catch {
    return null;
  }
}

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isReserved(n, r, c) {
  if (inFinder(n, r, c) || isTiming(r, c) || inAlignment(n, r, c)) return true;
  if (r === 7 && (c <= 7 || c >= n - 8)) return true;
  if (c === 7 && (r <= 7 || r >= n - 8)) return true;
  if (r === 8 && (c <= 8 || c >= n - 8)) return true;
  if (c === 8 && (r <= 8 || r >= n - 7)) return true;
  if (n >= 45) {
    if (r < 6 && c >= n - 11 && c <= n - 9) return true;
    if (c < 6 && r >= n - 11 && r <= n - 9) return true;
  }
  return false;
}

function paintClean(matrix, modulePx = 16, quiet = QUIET) {
  const n = matrix.length;
  const dim = (n + quiet * 2) * modulePx;
  const png = new PNG({ width: dim, height: dim });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      const x0 = (c + quiet) * modulePx;
      const y0 = (r + quiet) * modulePx;
      for (let y = 0; y < modulePx; y += 1) {
        for (let x = 0; x < modulePx; x += 1) {
          const o = ((y0 + y) * dim + (x0 + x)) * 4;
          png.data[o] = 17;
          png.data[o + 1] = 19;
          png.data[o + 2] = 24;
          png.data[o + 3] = 255;
        }
      }
    }
  }
  return png;
}

function paintLivingMatrix(matrix, modulePx = 14, quiet = QUIET) {
  const n = matrix.length;
  const dim = (n + quiet * 2) * modulePx;
  const png = new PNG({ width: dim, height: dim });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  const bag = [
    [238, 114, 2],
    [192, 20, 33],
    [27, 42, 74],
    [42, 255, 85],
  ];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      let rgb = INK;
      if (inFinder(n, r, c)) rgb = INK;
      else if (isTiming(r, c)) rgb = r % 2 ? STRIPE_R : STRIPE_W;
      else rgb = bag[(r * 11 + c * 3) % bag.length];
      const x0 = (c + quiet) * modulePx;
      const y0 = (r + quiet) * modulePx;
      for (let y = 0; y < modulePx; y += 1) {
        for (let x = 0; x < modulePx; x += 1) {
          const o = ((y0 + y) * dim + (x0 + x)) * 4;
          png.data[o] = rgb[0];
          png.data[o + 1] = rgb[1];
          png.data[o + 2] = rgb[2];
          png.data[o + 3] = 255;
        }
      }
    }
  }
  return png;
}

function setPx(png, x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const o = (y * png.width + x) * 4;
  png.data[o] = rgb[0];
  png.data[o + 1] = rgb[1];
  png.data[o + 2] = rgb[2];
  png.data[o + 3] = a;
}

function fillRect(png, x0, y0, w, h, rgb) {
  const x1 = Math.min(png.width, x0 + w);
  const y1 = Math.min(png.height, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) setPx(png, x, y, rgb);
  }
}

function fillDisc(png, cx, cy, r, rgb) {
  const r2 = r * r;
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= r2) setPx(png, cx + x, cy + y, rgb);
    }
  }
}

const GLYPHS = {
  P: ["1110", "1001", "1110", "1000", "1000"],
  O: ["0110", "1001", "1001", "1001", "0110"],
  R: ["1110", "1001", "1110", "1010", "1001"],
  T: ["1111", "0100", "0100", "0100", "0100"],
  A: ["0110", "1001", "1111", "1001", "1001"],
  B: ["1110", "1001", "1110", "1001", "1110"],
  M: ["1001", "1111", "1111", "1001", "1001"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  C: ["0111", "1000", "1000", "1000", "0111"],
  U: ["1001", "1001", "1001", "1001", "0110"],
  "0": ["0110", "1001", "1001", "1001", "0110"],
  "1": ["0100", "1100", "0100", "0100", "1110"],
  ".": ["0000", "0000", "0000", "0000", "0100"],
  " ": ["0000", "0000", "0000", "0000", "0000"],
};

function drawWord(png, x0, y0, text, rgb, px = 2, gap = 1) {
  for (let i = 0; i < text.length; i += 1) {
    const g = GLYPHS[text[i]] || GLYPHS[" "];
    for (let gy = 0; gy < 5; gy += 1) {
      for (let gx = 0; gx < 4; gx += 1) {
        if (g[gy][gx] !== "1") continue;
        fillRect(png, x0 + i * (4 * px + gap) + gx * px, y0 + gy * px, px, px, rgb);
      }
    }
  }
}

async function loadDecal() {
  const p = join(ROOT, "door_decal.png");
  if (!existsSync(p)) return null;
  try {
    return PNG.sync.read(await readFile(p));
  } catch {
    return null;
  }
}

function blitDecal(png, decal, dx, dy, dw, dh) {
  if (!decal) return;
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(decal.height - 1, Math.floor((y / dh) * decal.height));
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(decal.width - 1, Math.floor((x / dw) * decal.width));
      const i = (sy * decal.width + sx) * 4;
      const r = decal.data[i];
      const g = decal.data[i + 1];
      const b = decal.data[i + 2];
      if (r + g + b < 48) continue;
      setPx(png, dx + x, dy + y, [r, g, b]);
    }
  }
}

function stripeColor(y, y0, faceH) {
  const band = Math.floor(((y - y0) / Math.max(1, faceH)) * 6);
  return band % 2 ? STRIPE_R : STRIPE_W;
}

function moduleColors(n, r, c, dark) {
  if (!dark) return { top: CREAM, face: [236, 230, 220], side: [228, 222, 212] };
  const vocab = vocabFor(n, r, c);
  const reserved = isReserved(n, r, c);
  if (vocab === "finder" || (reserved && vocab !== "timing" && vocab !== "boom")) {
    return { top: INK, face: INK, side: INK_SIDE };
  }
  if (vocab === "cabinet") return { top: CAB_TOP, face: CAB_FACE, side: CAB_SIDE };
  if (vocab === "led") return { top: NAVY, face: NAVY, side: NAVY_SIDE };
  if (vocab === "head") return { top: INK, face: [28, 30, 36], side: INK_SIDE };
  if (vocab === "boom" || vocab === "timing") {
    return { top: STRIPE_TOP, face: null, side: STRIPE_TOP };
  }
  return { top: INK, face: NAVY, side: NAVY_SIDE };
}

function cellX(c, ox) {
  return ox + (c + QUIET) * MOD;
}
function cellY(r, oy) {
  return oy + (r + QUIET) * MOD;
}

function paintModule(png, n, r, c, dark, ox, oy) {
  const x0 = cellX(c, ox);
  const y0 = cellY(r, oy);
  const vocab = dark ? vocabFor(n, r, c) : "light";
  const cols = moduleColors(n, r, c, dark);
  if (!dark) {
    fillRect(png, x0, y0, MOD, MOD, CREAM);
    return;
  }
  fillRect(png, x0, y0, MOD, TOP_H, cols.top);
  for (let y = 0; y < FACE_H; y += 1) {
    for (let x = 0; x < MOD - SIDE; x += 1) {
      const rgb = cols.face === null
        ? stripeColor(y0 + TOP_H + y, y0 + TOP_H, FACE_H)
        : cols.face;
      setPx(png, x0 + x, y0 + TOP_H + y, rgb);
    }
  }
  for (let y = 0; y < MOD; y += 1) {
    for (let x = 0; x < SIDE; x += 1) {
      const rgb = cols.side === null ? stripeColor(y0 + y, y0, MOD) : cols.side;
      setPx(png, x0 + MOD - SIDE + x, y0 + y, rgb);
    }
  }
  if (vocab === "cabinet" && !isReserved(n, r, c)) {
    fillRect(png, x0 + 2, y0 + TOP_H + 1, MOD - SIDE - 4, 2, CAB_BAND);
    fillDisc(png, x0 + 4, y0 + TOP_H + 4, 1, LED);
    fillDisc(png, x0 + MOD - SIDE - 5, y0 + TOP_H + 4, 1, LED);
  } else if ((vocab === "head" || vocab === "led") && !isReserved(n, r, c)) {
    fillDisc(png, x0 + Math.floor((MOD - SIDE) / 2), y0 + TOP_H + 3, 2, LED);
  }
}

function drawHeroInField(png, matrix, ox, oy, decal) {
  const n = matrix.length;
  const fieldLeft = cellX(0, ox);
  const fieldRight = cellX(n - 1, ox) + MOD;
  const fieldTop = cellY(0, oy);
  const fieldBottom = cellY(n - 1, oy) + MOD;

  const cabW = 5 * MOD;
  const cabH = 6 * MOD;
  const cabX = Math.floor((fieldLeft + fieldRight) / 2 - cabW / 2);
  const cabY = cellY(20, oy);
  const cabRight = cabX + cabW;
  const cabBottom = cabY + cabH;

  fillRect(png, cabX + cabW - 5, cabY + 10, 8, cabH - 10, CAB_SIDE);
  fillRect(png, cabX, cabY, cabW, cabH, CAB_FACE);
  fillRect(png, cabX, cabY, cabW, 8, CAB_TOP);
  fillRect(png, cabX, cabY + Math.floor(cabH * 0.58), cabW, 8, CAB_BAND);
  fillDisc(png, cabX + 22, cabY + 22, 6, LED_CYAN);
  fillDisc(png, cabX + cabW - 22, cabY + 22, 6, LED_CYAN);
  fillDisc(png, cabX + 22, cabY + 22, 3, LED);
  fillDisc(png, cabX + cabW - 22, cabY + 22, 3, LED);
  if (decal) blitDecal(png, decal, cabX + 10, cabY + 36, cabW - 20, 26);
  else {
    drawWord(png, cabX + 12, cabY + 38, "PORTA", INK, 2, 1);
    drawWord(png, cabX + 12, cabY + 52, "BOOM", INK, 2, 1);
  }
  drawWord(png, cabX + 8, cabY + cabH - 16, "PORTABOOM.COM.AU", [32, 24, 18], 1, 1);

  const poleX = cabX + Math.floor(cabW * 0.62);
  const boomTop = cellY(9, oy);
  const boomH = cabY - boomTop;
  for (let y = boomTop; y < cabY + 8; y += 5) {
    fillRect(png, poleX, y, 6, 4, y % 10 < 5 ? STRIPE_R : STRIPE_W);
  }
  fillRect(png, poleX + 6, boomTop, 3, boomH + 8, STRIPE_TOP);

  fillDisc(png, poleX + 3, boomTop + 10, 10, STOP_R);
  fillDisc(png, poleX + 3, boomTop + 10, 7, STOP_R);
  drawWord(png, poleX - 10, boomTop + 7, "STOP", [220, 220, 220], 1, 1);

  const tlX = cabX + Math.floor(cabW * 0.28);
  const tlTop = cabY - 52;
  fillRect(png, tlX - 2, tlTop, 5, cabY - tlTop + 4, STEEL);
  fillRect(png, tlX - 9, tlTop, 18, 44, INK);
  fillDisc(png, tlX, tlTop + 8, 5, LED_OFF);
  fillDisc(png, tlX, tlTop + 20, 5, AMBER_OFF);
  fillDisc(png, tlX, tlTop + 33, 6, LED);

  return {
    field: { left: fieldLeft, right: fieldRight, top: fieldTop, bottom: fieldBottom },
    hero: {
      cabX,
      cabY,
      cabW,
      cabH,
      cabRight,
      cabBottom,
      boomTop,
      tlTop,
      insideField: cabX >= fieldLeft
        && cabRight <= fieldRight + SIDE
        && cabY >= fieldTop
        && cabBottom <= fieldBottom
        && boomTop >= fieldTop
        && tlTop >= fieldTop,
    },
  };
}

function restoreBits(png, matrix, ox, oy) {
  const n = matrix.length;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const dark = !!matrix[r][c];
      const reserved = isReserved(n, r, c);
      if (dark && !reserved) continue;
      paintModule(png, n, r, c, dark, ox, oy);
    }
  }
}

/** Keep dark-module scan faces dark after the hero is woven in. */
function enforceDarkCaps(png, matrix, ox, oy) {
  const n = matrix.length;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      const x0 = cellX(c, ox);
      const y0 = cellY(r, oy);
      const cols = moduleColors(n, r, c, true);
      for (let y = 0; y < TOP_H; y += 1) {
        for (let x = 0; x < MOD; x += 1) {
          const px = x0 + x;
          const py = y0 + y;
          if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
          const o = (py * png.width + px) * 4;
          if (lum(png.data[o], png.data[o + 1], png.data[o + 2]) > 92) {
            png.data[o] = cols.top[0];
            png.data[o + 1] = cols.top[1];
            png.data[o + 2] = cols.top[2];
          }
        }
      }
    }
  }
}

function paintLivingField(matrix, decal) {
  const n = matrix.length;
  const width = (n + QUIET * 2) * MOD + 8;
  const height = (n + QUIET * 2) * MOD + 8;
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  const ox = 4;
  const oy = 4;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      paintModule(png, n, r, c, !!matrix[r][c], ox, oy);
    }
  }
  const placed = drawHeroInField(png, matrix, ox, oy, decal);
  restoreBits(png, matrix, ox, oy);
  enforceDarkCaps(png, matrix, ox, oy);
  return { png, placed, ox, oy };
}

function tryDecode(img, w, h, how) {
  try {
    const a = jsQR(img, w, h, { inversionAttempts: "attemptBoth" });
    if (a) return { data: a.data, how };
  } catch { /* continue */ }
  try {
    const b = jsQR(img, w, h, { inversionAttempts: "dontInvert" });
    if (b) return { data: b.data, how: `${how}-ni` };
  } catch { /* continue */ }
  return null;
}

function scalePng(png, tw, th) {
  const out = new Uint8ClampedArray(tw * th * 4);
  const { width: W, height: H, data } = png;
  for (let y = 0; y < th; y += 1) {
    const sy = Math.min(H - 1, Math.round((y + 0.5) * H / th - 0.5));
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(W - 1, Math.round((x + 0.5) * W / tw - 0.5));
      const i = (sy * W + sx) * 4;
      const o = (y * tw + x) * 4;
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
      out[o + 3] = 255;
    }
  }
  return out;
}

function bboxCrop(png, thresh = 52) {
  const { width: W, height: H, data } = png;
  let minX = W;
  let minY = H;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (lum(data[i], data[i + 1], data[i + 2]) < thresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX) return null;
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.12);
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const bw = Math.min(W, maxX + pad) - x0;
  const bh = Math.min(H, maxY + pad) - y0;
  const crop = new Uint8ClampedArray(bw * bh * 4);
  for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const i = ((y0 + y) * W + (x0 + x)) * 4;
      const o = (y * bw + x) * 4;
      crop[o] = data[i];
      crop[o + 1] = data[i + 1];
      crop[o + 2] = data[i + 2];
      crop[o + 3] = 255;
    }
  }
  return { crop, bw, bh };
}

function decodePng(png) {
  const { width, height, data } = png;
  const img = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const native = tryDecode(img, width, height, "native");
  if (native) return native;
  const box = bboxCrop(png);
  if (box) {
    const hit = tryDecode(box.crop, box.bw, box.bh, "bbox");
    if (hit) return hit;
  }
  for (const side of [960, 800, 640, 512]) {
    const tw = side;
    const th = Math.round(side * height / width);
    const scaled = scalePng(png, tw, th);
    const hit = tryDecode(scaled, tw, th, `scale${side}`);
    if (hit) return hit;
  }
  return null;
}

function analyzeLook(png, placed) {
  const { width: W, height: H, data } = png;
  const field = placed.field;
  let orange = 0;
  let orangeInField = 0;
  let orangeOutside = 0;
  let stripe = 0;
  let led = 0;
  let cream = 0;
  let ink = 0;
  let chromeQuiet = 0;
  const seen = new Set();
  const step = 2;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const L = lum(r, g, b);
      seen.add(`${r >> 4}-${g >> 4}-${b >> 4}`);
      const inField = x >= field.left && x <= field.right && y >= field.top && y <= field.bottom;
      const inQuiet = !inField;
      const isOrange = r > 85 && g > 28 && g < 170 && b < 90 && r > g + 24;
      const isStripe = r > 90 && g < 55 && b < 55;
      const isLed = g > 180 && r < 160 && b < 200;
      if (isOrange) {
        orange += 1;
        if (inField) orangeInField += 1;
        else orangeOutside += 1;
      } else if (isStripe) stripe += 1;
      else if (isLed) led += 1;
      else if (L > 210) cream += 1;
      else if (L < 40) ink += 1;
      if (inQuiet && L < 200 && !isOrange) {
        if (Math.max(r, g, b) - Math.min(r, g, b) > 18) chromeQuiet += 1;
      }
    }
  }
  const samples = Math.ceil(W / step) * Math.ceil(H / step);
  const hero = placed.hero;
  const sticker = orangeOutside > orangeInField * 0.25 || hero.insideField !== true;
  return {
    orange,
    orangeInField,
    orangeOutside,
    stripe,
    led,
    cream,
    ink,
    chromeQuiet,
    uniqueish: seen.size,
    samples,
    heroInField: hero.insideField === true && orangeInField > 80,
    chromeOutsideBorder: chromeQuiet > 160 || orangeOutside > 40,
    sticker,
    notFlatBW: orange > 200 && seen.size >= 14,
    livingPalette: orange > 80 && led > 8 && stripe > 20,
    notPaintClean: orange > 80,
    geometryInField: orangeInField > 80 && hero.insideField === true,
  };
}

export { paintLivingField, decodePng, analyzeLook };

export async function makeShowtimeQr(opts = {}) {
  const QRCode = loadQrcode();
  if (!QRCode) throw new Error("qrcode package missing — npm i qrcode");
  const url = opts.url || LIVING_SHOWTIME_URL;
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const matrix = [];
  let dark = 0;
  for (let r = 0; r < n; r += 1) {
    const row = [];
    for (let c = 0; c < n; c += 1) {
      const bit = qr.modules.get(r, c) ? 1 : 0;
      row.push(bit);
      dark += bit;
    }
    matrix.push(row);
  }
  await mkdir(OUT, { recursive: true });
  if (existsSync(dirname(ART))) await mkdir(ART, { recursive: true });

  const clean = paintClean(matrix);
  const cleanPath = join(OUT, "fabian-showtime-qr-paint-clean.png");
  await writeFile(cleanPath, PNG.sync.write(clean));
  const cleanHit = decodePng(clean);

  const flat = paintLivingMatrix(matrix);
  const flatPath = join(OUT, "fabian-showtime-qr-living-matrix.png");
  await writeFile(flatPath, PNG.sync.write(flat));
  const flatHit = decodePng(flat);

  const decal = await loadDecal();
  const { png: sendPng, placed } = paintLivingField(matrix, decal);
  const sendHit = decodePng(sendPng);
  const sendPath = join(OUT, "fabian-showtime-qr.png");
  const rootPath = join(ROOT, "fabian-showtime-qr.png");
  await writeFile(sendPath, PNG.sync.write(sendPng));
  await writeFile(rootPath, PNG.sync.write(sendPng));

  const look = analyzeLook(sendPng, placed);
  const scaled800 = scalePng(sendPng, 800, Math.round(800 * sendPng.height / sendPng.width));
  const phoneHit = tryDecode(
    scaled800,
    800,
    Math.round(800 * sendPng.height / sendPng.width),
    "phone-800",
  );
  const match = sendHit?.data === url;
  const proof = {
    url,
    ecc: "H",
    version: qr.version,
    size: n,
    dark,
    style: "magic-tree-living-field",
    rejected: {
      paintClean: "novel B&W QR — fixture only",
      paintLivingMatrix: "flat coloured cubes",
      pr28Sticker: "PORTABOOM / chrome outside QR border",
      destInSend: "send file must not encode DEST",
    },
    clean: {
      file: sendPath,
      decoded: sendHit?.data || null,
      match,
      how: sendHit?.how || null,
    },
    paintClean: {
      file: cleanPath,
      decoded: cleanHit?.data || null,
      match: cleanHit?.data === url,
      note: "regression fixture only — not the tip send file",
    },
    livingMatrix: {
      file: flatPath,
      decoded: flatHit?.data || null,
      match: flatHit?.data === url,
      note: "rejected flat-cube painter — not the send file",
    },
    livingStill: {
      file: sendPath,
      root: rootPath,
      decoded: sendHit?.data || null,
      match,
      how: sendHit?.how || null,
      look,
      hero: placed.hero,
      field: placed.field,
    },
    phoneScan: {
      how: "Point a phone camera at fabian-showtime-qr.png. It must open the living10 showtime door URL, never DEST.",
      jsQR: match,
      downscale800: phoneHit?.data === url,
      downscaleDecoded: phoneHit?.data || null,
      notDest: sendHit?.data !== DEST && sendHit?.data === url,
    },
  };
  await writeFile(join(OUT, "fabian-showtime-qr.json"), JSON.stringify(proof, null, 2));
  try {
    if (existsSync(ART) || existsSync(dirname(ART))) {
      await mkdir(ART, { recursive: true });
      await copyFile(sendPath, join(ART, "fabian-showtime-qr.png"));
      await copyFile(cleanPath, join(ART, "fabian-showtime-qr-paint-clean.png"));
      await writeFile(join(ART, "fabian-showtime-qr.json"), JSON.stringify(proof, null, 2));
    }
  } catch (err) {
    console.warn("artifact copy skipped", err.message);
  }
  return proof;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  makeShowtimeQr()
    .then((proof) => {
      console.log(JSON.stringify(proof, null, 2));
      const still = proof.livingStill;
      const fail = !still.match
        || still.decoded === DEST
        || still.look.sticker
        || still.look.chromeOutsideBorder
        || !still.look.geometryInField
        || !still.look.notFlatBW;
      process.exit(fail ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
