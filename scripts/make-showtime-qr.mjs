/**
 * Stationary send QR for Fabian.
 * Encodes the living Incredible QR page (showtime=1 / living10).
 * Tip file is a living-still: regular H-matrix of that URL dressed as the
 * elevated PORTABOOM cuboid field + hero (black scan caps, cabinet fronts,
 * one traffic light, one striped boom). Not a plain novel B&W QR, not
 * wordmark-only colored squares, not DEST.
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

const CREAM = [244, 239, 230];
const INK = [17, 19, 24];
const NAVY = [27, 42, 74];
const CAB_SCAN = [180, 90, 20];
const STRIPE_R = [120, 18, 22];
const STRIPE_K = [32, 20, 18];
const LED = [42, 255, 85];
const LED_OFF = [62, 20, 20];
const STEEL = [160, 166, 174];
const TL_GREEN = [8, 46, 28];
const STOP_R = [176, 18, 24];

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

function paintClean(matrix, modulePx = 16, quiet = 4) {
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
  const band = Math.floor(((y - y0) / Math.max(1, faceH)) * 5);
  return band % 2 ? STRIPE_R : STRIPE_K;
}

function moduleColors(n, r, c, dark) {
  if (!dark) return { top: CREAM, face: CREAM, side: CREAM };
  const vocab = vocabFor(n, r, c);
  const reserved = isReserved(n, r, c);
  if (vocab === "finder" || (reserved && vocab !== "timing" && vocab !== "boom")) {
    return { top: INK, face: INK, side: [10, 12, 16] };
  }
  if (vocab === "cabinet") return { top: CAB_SCAN, face: CAB_SCAN, side: [92, 48, 12] };
  if (vocab === "led") return { top: NAVY, face: NAVY, side: [12, 16, 28] };
  if (vocab === "head") return { top: INK, face: INK, side: [10, 12, 16] };
  if (vocab === "boom" || vocab === "timing") {
    return { top: [48, 16, 18], face: null, side: null };
  }
  return { top: INK, face: NAVY, side: [10, 12, 16] };
}

function paintLivingStill(matrix, decal) {
  const n = matrix.length;
  const quiet = 4;
  const top = 15;
  const face = 7;
  const side = 5;
  const cellW = top;
  const cellH = top + face;
  const sky = 168;
  const ground = 8;
  const width = (n + quiet * 2) * cellW + side + 4;
  const height = sky + (n + quiet * 2) * cellH + ground;
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }

  const ox = 2;
  const oy = sky;
  const cellX = (c) => ox + (c + quiet) * cellW;
  const cellY = (r) => oy + (r + quiet) * cellH;
  const hero = { r0: 22, r1: 25, c0: 22, c1: 25 };
  const inHero = (r, c) => r >= hero.r0 && r <= hero.r1 && c >= hero.c0 && c <= hero.c1;

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const dark = !!matrix[r][c];
      const x0 = cellX(c);
      const y0 = cellY(r);
      const vocab = dark ? vocabFor(n, r, c) : "light";
      const cols = moduleColors(n, r, c, dark);
      if (inHero(r, c) && dark && !isReserved(n, r, c)) {
        cols.top = CAB_SCAN;
        cols.face = CAB_SCAN;
        cols.side = [92, 48, 12];
      }
      fillRect(png, x0, y0, top, top, cols.top);
      for (let y = 0; y < face; y += 1) {
        for (let x = 0; x < top; x += 1) {
          const rgb = cols.face === null ? stripeColor(y0 + top + y, y0 + top, face) : cols.face;
          setPx(png, x0 + x, y0 + top + y, rgb);
        }
      }
      if (dark) {
        for (let y = 0; y < cellH; y += 1) {
          for (let x = 0; x < side; x += 1) {
            const rgb = cols.side === null ? stripeColor(y0 + y, y0, cellH) : cols.side;
            setPx(png, x0 + top + x, y0 + y, rgb);
          }
        }
        if (vocab === "cabinet" && !isReserved(n, r, c)) {
          fillDisc(png, x0 + 4, y0 + top + 3, 1, LED);
          fillDisc(png, x0 + top - 5, y0 + top + 3, 1, LED);
        }
      }
    }
  }

  const fieldLeft = cellX(0);
  const fieldRight = cellX(n - 1) + top;
  const cabW = 72;
  const cabH = 96;
  const cabX = Math.floor((fieldLeft + fieldRight) / 2 - cabW / 2);
  const cabY = sky - 36;
  fillRect(png, cabX + cabW - 4, cabY + 8, 10, cabH - 8, [92, 48, 12]);
  fillRect(png, cabX, cabY, cabW, cabH, CAB_SCAN);
  fillRect(png, cabX, cabY + 58, cabW, 10, NAVY);
  fillDisc(png, cabX + 22, cabY + 22, 6, LED);
  fillDisc(png, cabX + 50, cabY + 22, 6, LED);
  if (decal) blitDecal(png, decal, cabX + 8, cabY + 34, cabW - 16, 28);
  else {
    drawWord(png, cabX + 10, cabY + 36, "PORTA", INK, 2, 1);
    drawWord(png, cabX + 10, cabY + 50, "BOOM", INK, 2, 1);
  }
  drawWord(png, cabX + 6, cabY + 78, "PORTABOOM.COM.AU", [32, 24, 18], 1, 1);

  const tlX = cabX + Math.floor(cabW / 2);
  fillRect(png, tlX - 7, 20, 14, cabY - 16, TL_GREEN);
  fillDisc(png, tlX, 32, 4, LED_OFF);
  fillDisc(png, tlX, 46, 4, [90, 52, 8]);
  fillDisc(png, tlX, 62, 5, LED);
  const poleX = tlX + 12;
  for (let y = 6; y < 28; y += 4) {
    fillRect(png, poleX, y, 4, 3, y % 8 < 4 ? STRIPE_R : [48, 16, 18]);
  }
  fillDisc(png, poleX + 2, 12, 8, STOP_R);
  drawWord(png, poleX - 8, 9, "STOP", [250, 250, 250], 1, 1);

  const quietTop = oy + quiet * cellH;
  if (cabY + cabH > quietTop) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const cols = moduleColors(n, r, c, !!matrix[r][c]);
        fillRect(png, cellX(c), cellY(r), top, top, cols.top);
      }
    }
  }

  return png;
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

function analyzeLook(png) {
  const { width: W, height: H, data } = png;
  let orange = 0;
  let stripe = 0;
  let led = 0;
  let cream = 0;
  let ink = 0;
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
      if (r > 140 && g > 50 && g < 160 && b < 80 && r > g + 30) orange += 1;
      else if (r > 90 && g < 50 && b < 50) stripe += 1;
      else if (g > 180 && r < 140 && b < 180) led += 1;
      else if (L > 210) cream += 1;
      else if (L < 40) ink += 1;
    }
  }
  const samples = Math.ceil(W / step) * Math.ceil(H / step);
  return {
    orange,
    stripe,
    led,
    cream,
    ink,
    uniqueish: seen.size,
    samples,
    notFlatBW: orange > 200 && seen.size >= 14,
    heroReadable: orange > 120,
    livingPalette: orange > 80 && led > 8,
  };
}

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

  const decal = await loadDecal();
  const sendPng = paintLivingStill(matrix, decal);
  const sendHit = decodePng(sendPng);
  const sendPath = join(OUT, "fabian-showtime-qr.png");
  const rootPath = join(ROOT, "fabian-showtime-qr.png");
  await writeFile(sendPath, PNG.sync.write(sendPng));
  await writeFile(rootPath, PNG.sync.write(sendPng));

  const look = analyzeLook(sendPng);
  const scaled800 = scalePng(sendPng, 800, Math.round(800 * sendPng.height / sendPng.width));
  const phoneHit = tryDecode(scaled800, 800, Math.round(800 * sendPng.height / sendPng.width), "phone-800");
  const proof = {
    url,
    ecc: "H",
    version: qr.version,
    size: n,
    dark,
    style: "living-still-cuboid-field",
    clean: {
      file: sendPath,
      decoded: sendHit?.data || null,
      match: sendHit?.data === url,
      how: sendHit?.how || null,
    },
    paintClean: {
      file: cleanPath,
      decoded: cleanHit?.data || null,
      match: cleanHit?.data === url,
      note: "regression fixture only — not the tip send file",
    },
    livingStill: {
      file: sendPath,
      root: rootPath,
      decoded: sendHit?.data || null,
      match: sendHit?.data === url,
      how: sendHit?.how || null,
      look,
    },
    phoneScan: {
      how: "Point a phone camera at fabian-showtime-qr.png. It must open the living10 showtime door URL, never DEST.",
      jsQR: sendHit?.data === url,
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
      if (!proof.livingStill.match || proof.livingStill.decoded === DEST) process.exit(1);
      if (!proof.livingStill.look.notFlatBW && !proof.livingStill.look.livingPalette) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
