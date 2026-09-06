/**
 * Overnight PREVIEW OPTIONS baker — no new QR libs.
 *
 * OPTION 1: louder Magic Tree still from existing vocabFor / finder / Life modules.
 * OPTION 2: STANDARD ECC-H QR (tip URL) + decorative TAS arc-ring chrome.
 * OPTION 3: hybrid print plate of 1 + 2.
 * OPTION 4: NOT LIVE mock only (no rs-as-QR claim).
 * OPTION 5: no still — query tip is ?v=preview5 (see preview-options/).
 *
 * Payload is always the living10 tip. Never DEST. Never overwrite
 * fabian-showtime-qr.png / app.js living10 door.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { DEST, LIVING_SHOWTIME_URL } from "./showtime-url.mjs";
import { vocabFor, inFinder, isTiming, inAlignment } from "../qr-encode.js";
import { paintLivingField, decodePng as decodeLivingStill } from "./make-showtime-qr.mjs";

const require = createRequire(import.meta.url);
const QRCode = require("qrcode");

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "preview-options");

const TIP = LIVING_SHOWTIME_URL;
const CREAM = [244, 239, 230];
const INK = [17, 19, 24];
const INK_SIDE = [10, 12, 16];
const NAVY = [27, 42, 74];
const NAVY_SIDE = [12, 16, 28];
const CAB_TOP = [72, 28, 4];
const CAB_FACE = [176, 74, 10];
const CAB_SIDE = [96, 42, 8];
const CAB_BAND = [27, 42, 74];
const STRIPE_R = [192, 20, 33];
const STRIPE_W = [72, 28, 24];
const STRIPE_TOP = [40, 14, 16];
const LED = [42, 255, 85];
const LED_CYAN = [40, 220, 230];
const STEEL = [197, 208, 211];
const ORANGE = [238, 114, 2];
const STOP_R = [192, 20, 33];

const MOD = 18;
const QUIET = 4;
const TOP_H = 11;
const FACE_H = MOD - TOP_H;
const SIDE = 3;

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

function encodeTipMatrix() {
  const qr = QRCode.create(TIP, { errorCorrectionLevel: "H" });
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
  return { matrix, n, dark, version: qr.version, ecc: "H" };
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
  const x1 = Math.min(png.width, Math.round(x0 + w));
  const y1 = Math.min(png.height, Math.round(y0 + h));
  for (let y = Math.max(0, Math.round(y0)); y < y1; y += 1) {
    for (let x = Math.max(0, Math.round(x0)); x < x1; x += 1) setPx(png, x, y, rgb);
  }
}

function fillDisc(png, cx, cy, r, rgb) {
  const rr = Math.ceil(r);
  const r2 = r * r;
  for (let y = -rr; y <= rr; y += 1) {
    for (let x = -rr; x <= rr; x += 1) {
      if (x * x + y * y <= r2) setPx(png, Math.round(cx + x), Math.round(cy + y), rgb);
    }
  }
}

function fillRing(png, cx, cy, r0, r1, rgb, gapDeg = 16, rotDeg = 0) {
  const outer = Math.ceil(r1);
  const r0sq = r0 * r0;
  const r1sq = r1 * r1;
  const gap = (gapDeg * Math.PI) / 180;
  const rot = (rotDeg * Math.PI) / 180;
  for (let y = -outer; y <= outer; y += 1) {
    for (let x = -outer; x <= outer; x += 1) {
      const d2 = x * x + y * y;
      if (d2 < r0sq || d2 > r1sq) continue;
      let ang = Math.atan2(y, x) - rot;
      while (ang < -Math.PI) ang += Math.PI * 2;
      while (ang > Math.PI) ang -= Math.PI * 2;
      if (Math.abs(ang) < gap * 0.5) continue;
      setPx(png, Math.round(cx + x), Math.round(cy + y), rgb);
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
  E: ["1111", "1000", "1110", "1000", "1111"],
  V: ["1001", "1001", "1001", "1001", "0110"],
  I: ["1110", "0100", "0100", "0100", "1110"],
  W: ["1001", "1001", "1111", "1111", "1001"],
  N: ["1001", "1101", "1111", "1011", "1001"],
  L: ["1000", "1000", "1000", "1000", "1111"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  C: ["0111", "1000", "1000", "1000", "0111"],
  U: ["1001", "1001", "1001", "1001", "0110"],
  K: ["1001", "1010", "1100", "1010", "1001"],
  D: ["1110", "1001", "1001", "1001", "1110"],
  G: ["0111", "1000", "1011", "1001", "0111"],
  Y: ["1001", "1001", "0110", "0100", "0100"],
  H: ["1001", "1001", "1111", "1001", "1001"],
  F: ["1111", "1000", "1110", "1000", "1000"],
  X: ["1001", "0110", "0100", "0110", "1001"],
  Q: ["0110", "1001", "1001", "1010", "0101"],
  Z: ["1111", "0010", "0100", "1000", "1111"],
  J: ["0111", "0010", "0010", "1010", "0100"],
  "0": ["0110", "1001", "1001", "1001", "0110"],
  "1": ["0100", "1100", "0100", "0100", "1110"],
  "2": ["1110", "0001", "0110", "1000", "1111"],
  "3": ["1110", "0001", "0110", "0001", "1110"],
  "4": ["1001", "1001", "1111", "0001", "0001"],
  "5": ["1111", "1000", "1110", "0001", "1110"],
  "-": ["0000", "0000", "1111", "0000", "0000"],
  "·": ["0000", "0100", "0000", "0000", "0000"],
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

function moduleColors(n, r, c, dark) {
  if (!dark) return { top: CREAM, face: [236, 230, 220], side: [228, 222, 212] };
  const vocab = vocabFor(n, r, c);
  const reserved = isReserved(n, r, c);
  if (vocab === "finder" || (reserved && vocab !== "timing" && vocab !== "boom")) {
    return { top: INK, face: INK, side: INK_SIDE, life: true };
  }
  if (vocab === "cabinet") return { top: CAB_TOP, face: CAB_FACE, side: CAB_SIDE };
  if (vocab === "led") return { top: NAVY, face: NAVY, side: NAVY_SIDE };
  if (vocab === "head") return { top: INK, face: [28, 30, 36], side: INK_SIDE };
  if (vocab === "boom" || vocab === "timing") {
    return { top: STRIPE_TOP, face: null, side: STRIPE_TOP };
  }
  return { top: INK, face: NAVY, side: NAVY_SIDE };
}

function stripeColor(y, y0, faceH) {
  const band = Math.floor(((y - y0) / Math.max(1, faceH)) * 6);
  return band % 2 ? STRIPE_R : STRIPE_W;
}

function paintModule(png, n, r, c, dark, ox, oy) {
  const x0 = ox + (c + QUIET) * MOD;
  const y0 = oy + (r + QUIET) * MOD;
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
  if (vocab === "finder") {
    fillRect(png, x0 + 1, y0 + TOP_H, MOD - SIDE - 2, 1, STEEL);
    fillDisc(png, x0 + 4, y0 + TOP_H + 3, 1, LED);
  } else if (vocab === "cabinet" && !isReserved(n, r, c)) {
    fillRect(png, x0 + 2, y0 + TOP_H + 1, MOD - SIDE - 4, 2, CAB_BAND);
    fillDisc(png, x0 + 4, y0 + TOP_H + 4, 1, LED);
    fillDisc(png, x0 + MOD - SIDE - 5, y0 + TOP_H + 4, 1, LED);
  } else if ((vocab === "head" || vocab === "led") && !isReserved(n, r, c)) {
    fillDisc(png, x0 + Math.floor((MOD - SIDE) / 2), y0 + TOP_H + 3, 2, LED);
  }
}

function drawHeroInField(png, matrix, ox, oy) {
  const n = matrix.length;
  const fieldLeft = ox + QUIET * MOD;
  const fieldRight = ox + (n + QUIET) * MOD;
  const fieldTop = oy + QUIET * MOD;
  const fieldBottom = oy + (n + QUIET) * MOD;
  const cabW = 5 * MOD;
  const cabH = 6 * MOD;
  const cabX = Math.floor((fieldLeft + fieldRight) / 2 - cabW / 2);
  const cabY = oy + (20 + QUIET) * MOD;
  fillRect(png, cabX + cabW - 5, cabY + 10, 8, cabH - 10, CAB_SIDE);
  fillRect(png, cabX, cabY, cabW, cabH, CAB_FACE);
  fillRect(png, cabX, cabY, cabW, 8, CAB_TOP);
  fillRect(png, cabX, cabY + Math.floor(cabH * 0.58), cabW, 8, CAB_BAND);
  fillDisc(png, cabX + 22, cabY + 22, 6, LED_CYAN);
  fillDisc(png, cabX + cabW - 22, cabY + 22, 6, LED_CYAN);
  fillDisc(png, cabX + 22, cabY + 22, 3, LED);
  fillDisc(png, cabX + cabW - 22, cabY + 22, 3, LED);
  drawWord(png, cabX + 12, cabY + 38, "PORTA", INK, 2, 1);
  drawWord(png, cabX + 12, cabY + 52, "BOOM", INK, 2, 1);
  const poleX = cabX + Math.floor(cabW * 0.62);
  const boomTop = oy + (9 + QUIET) * MOD;
  for (let y = boomTop; y < cabY + 8; y += 5) {
    fillRect(png, poleX, y, 6, 4, y % 10 < 5 ? STRIPE_R : STRIPE_W);
  }
  fillRect(png, poleX + 6, boomTop, 3, cabY - boomTop + 8, STRIPE_TOP);
  fillDisc(png, poleX + 3, boomTop + 10, 10, STOP_R);
  drawWord(png, poleX - 10, boomTop + 7, "STOP", [220, 220, 220], 1, 1);
  const tlX = cabX + Math.floor(cabW * 0.28);
  const tlTop = cabY - 52;
  fillRect(png, tlX - 2, tlTop, 5, cabY - tlTop + 4, STEEL);
  fillRect(png, tlX - 9, tlTop, 18, 44, INK);
  fillDisc(png, tlX, tlTop + 8, 5, [62, 20, 20]);
  fillDisc(png, tlX, tlTop + 20, 5, [90, 52, 8]);
  fillDisc(png, tlX, tlTop + 33, 6, LED);
  return {
    field: { left: fieldLeft, right: fieldRight, top: fieldTop, bottom: fieldBottom },
    hero: {
      cabX,
      cabY,
      cabW,
      cabH,
      insideField: cabX >= fieldLeft && cabX + cabW <= fieldRight
        && cabY >= fieldTop && cabY + cabH <= fieldBottom
        && boomTop >= fieldTop && tlTop >= fieldTop,
    },
  };
}

function restoreBits(png, matrix, ox, oy) {
  const n = matrix.length;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const dark = !!matrix[r][c];
      if (dark && !isReserved(n, r, c)) continue;
      paintModule(png, n, r, c, dark, ox, oy);
    }
  }
}

function enforceDarkCaps(png, matrix, ox, oy) {
  const n = matrix.length;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      const x0 = ox + (c + QUIET) * MOD;
      const y0 = oy + (r + QUIET) * MOD;
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

function paintOption1(matrix) {
  // Proven Magic Tree painter from the living tip baker (finders / Life / cabinet vocab).
  // Do not invent a second matrix painter that fails jsQR.
  return paintLivingField(matrix, null);
}

function option1Svg(matrix) {
  const n = matrix.length;
  const dim = (n + QUIET * 2) * MOD + 8;
  const ox = 4;
  const oy = 4;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}">`,
    `<rect width="100%" height="100%" fill="rgb(${CREAM.join(",")})"/>`,
    `<title>OPTION 1 · PREVIEW · Magic Tree send-still · not READY</title>`,
  ];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      const x = ox + (c + QUIET) * MOD;
      const y = oy + (r + QUIET) * MOD;
      const vocab = vocabFor(n, r, c);
      let fill = `rgb(${INK.join(",")})`;
      if (vocab === "cabinet") fill = `rgb(${CAB_FACE.join(",")})`;
      else if (vocab === "led") fill = `rgb(${NAVY.join(",")})`;
      else if (vocab === "boom" || vocab === "timing") fill = `rgb(${STRIPE_R.join(",")})`;
      else if (vocab === "finder") fill = `rgb(${INK.join(",")})`;
      parts.push(`<rect x="${x}" y="${y}" width="${MOD}" height="${TOP_H}" fill="${fill}"/>`);
      parts.push(`<rect x="${x}" y="${y + TOP_H}" width="${MOD - SIDE}" height="${FACE_H}" fill="${fill}"/>`);
    }
  }
  parts.push("</svg>");
  return parts.join("\n");
}

function paintStandardQr(matrix, modulePx = 10, quiet = QUIET) {
  const n = matrix.length;
  const dim = (n + quiet * 2) * modulePx;
  const png = new PNG({ width: dim, height: dim });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      fillRect(png, (c + quiet) * modulePx, (r + quiet) * modulePx, modulePx, modulePx, INK);
    }
  }
  return png;
}

function blit(dst, src, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(src.height - 1, Math.floor((y / dh) * src.height));
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor((x / dw) * src.width));
      const i = (sy * src.width + sx) * 4;
      setPx(dst, dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2]]);
    }
  }
}

function paintOption2(matrix) {
  const size = 1100;
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  const cx = size / 2;
  const cy = size / 2;
  const R = 520;
  fillDisc(png, cx, cy, R, CREAM);
  const rings = [
    { r0: 0.88, r1: 0.98, rgb: ORANGE, gap: 18, rot: -78 },
    { r0: 0.76, r1: 0.85, rgb: NAVY, gap: 14, rot: -40 },
    { r0: 0.64, r1: 0.73, rgb: ORANGE, gap: 16, rot: 22 },
    { r0: 0.53, r1: 0.61, rgb: NAVY, gap: 12, rot: -12 },
    { r0: 0.43, r1: 0.50, rgb: ORANGE, gap: 20, rot: 55 },
  ];
  for (const ring of rings) {
    fillRing(png, cx, cy, ring.r0 * R, ring.r1 * R, ring.rgb, ring.gap, ring.rot);
  }
  const qr = paintStandardQr(matrix, 8, QUIET);
  const qrSize = 420;
  const qrX = Math.round(cx - qrSize / 2);
  const qrY = Math.round(cy - qrSize / 2);
  fillRect(png, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, CREAM);
  blit(png, qr, qrX, qrY, qrSize, qrSize);
  return { png, qr };
}

function option2Svg(matrix) {
  const n = matrix.length;
  const modulePx = 8;
  const quiet = QUIET;
  const qrDim = (n + quiet * 2) * modulePx;
  const size = 1100;
  const cx = 550;
  const cy = 550;
  const R = 520;
  const qrX = cx - 210;
  const qrY = cy - 210;
  const scale = 420 / qrDim;
  const rings = [
    { r0: 0.88, r1: 0.98, color: "#EE7202", rot: -78, dash: "62 28" },
    { r0: 0.76, r1: 0.85, color: "#1B2A4A", rot: -40, dash: "48 22" },
    { r0: 0.64, r1: 0.73, color: "#EE7202", rot: 22, dash: "40 20" },
    { r0: 0.53, r1: 0.61, color: "#1B2A4A", rot: -12, dash: "34 18" },
    { r0: 0.43, r1: 0.50, color: "#EE7202", rot: 55, dash: "28 16" },
  ];
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `<title>OPTION 2 · PREVIEW · circular STANDARD QR + TAS ring chrome · not an App Clip</title>`,
    `<rect width="100%" height="100%" fill="#F4EFE6"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#F4EFE6"/>`,
  ];
  for (const ring of rings) {
    const r = ((ring.r0 + ring.r1) / 2) * R;
    const sw = (ring.r1 - ring.r0) * R;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${ring.color}" ` +
      `stroke-width="${sw.toFixed(1)}" stroke-dasharray="${ring.dash}" ` +
      `transform="rotate(${ring.rot} ${cx} ${cy})" stroke-linecap="round"/>`,
    );
  }
  parts.push(`<g transform="translate(${qrX} ${qrY}) scale(${scale.toFixed(4)})">`);
  parts.push(`<rect width="${qrDim}" height="${qrDim}" fill="#F4EFE6"/>`);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      parts.push(
        `<rect x="${(c + quiet) * modulePx}" y="${(r + quiet) * modulePx}" ` +
        `width="${modulePx}" height="${modulePx}" fill="#111318"/>`,
      );
    }
  }
  parts.push("</g></svg>");
  return parts.join("\n");
}

function paintOption3(opt1, opt2) {
  const w = 1600;
  const h = 1100;
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  fillRect(png, 0, 0, w, 88, NAVY);
  drawWord(png, 28, 28, "OPTION 3  PREVIEW  HYBRID PACK", [250, 250, 250], 4, 2);
  drawWord(png, 28, 108, "SCAN TO LIVING TIP THEN DEST AFTER SHOWTIME", NAVY, 3, 2);
  drawWord(png, 28, 148, "NOT READY   NFC MOCK LATER", [120, 80, 40], 2, 1);
  blit(png, opt1, 40, 200, 700, 700);
  blit(png, opt2, 860, 200, 700, 700);
  drawWord(png, 40, 920, "OPTION 1 MAGIC TREE STILL", NAVY, 2, 1);
  drawWord(png, 860, 920, "OPTION 2 STANDARD QR PLUS RINGS", NAVY, 2, 1);
  drawWord(png, 40, 980, "PAYLOAD LIVING10 SHOWTIME NEVER DEST", INK, 2, 1);
  fillRect(png, 0, h - 36, w, 36, ORANGE);
  drawWord(png, 28, h - 28, "PREVIEW OPTIONS SANDBOX   DO NOT SEND", [255, 255, 255], 2, 1);
  return png;
}

function paintOption4Mock() {
  const size = 900;
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = CREAM[0];
    png.data[i + 1] = CREAM[1];
    png.data[i + 2] = CREAM[2];
    png.data[i + 3] = 255;
  }
  const cx = size / 2;
  const cy = size / 2 + 20;
  const R = 340;
  fillDisc(png, cx, cy, R, CREAM);
  const rings = [
    { r0: 0.86, r1: 0.98, rgb: ORANGE, gap: 20, rot: -70 },
    { r0: 0.70, r1: 0.82, rgb: NAVY, gap: 16, rot: -30 },
    { r0: 0.54, r1: 0.66, rgb: ORANGE, gap: 18, rot: 25 },
    { r0: 0.38, r1: 0.50, rgb: NAVY, gap: 14, rot: -8 },
    { r0: 0.22, r1: 0.34, rgb: ORANGE, gap: 22, rot: 50 },
  ];
  for (const ring of rings) {
    fillRing(png, cx, cy, ring.r0 * R, ring.r1 * R, ring.rgb, ring.gap, ring.rot);
  }
  fillDisc(png, cx, cy, R * 0.16, NAVY);
  fillRect(png, 0, 0, size, 70, [176, 18, 24]);
  drawWord(png, 40, 22, "NOT LIVE  NOT AN APP CLIP", [255, 255, 255], 4, 2);
  fillRect(png, 0, size - 70, size, 70, [176, 18, 24]);
  drawWord(png, 40, size - 48, "OPTION 4 PREVIEW  NO CAMERA CARD", [255, 255, 255], 3, 2);
  return png;
}

function option4Svg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" width="900" height="900">
  <title>OPTION 4 · PREVIEW · NOT LIVE · NOT AN APP CLIP</title>
  <rect width="900" height="900" fill="#F4EFE6"/>
  <rect width="900" height="70" fill="#B01218"/>
  <text x="450" y="46" text-anchor="middle" fill="#fff" font-family="ui-monospace,monospace" font-size="28" font-weight="800">NOT LIVE · NOT AN APP CLIP</text>
  <circle cx="450" cy="470" r="340" fill="#F4EFE6"/>
  <circle cx="450" cy="470" r="312" fill="none" stroke="#EE7202" stroke-width="40" stroke-dasharray="70 32" transform="rotate(-70 450 470)"/>
  <circle cx="450" cy="470" r="258" fill="none" stroke="#1B2A4A" stroke-width="40" stroke-dasharray="56 26" transform="rotate(-30 450 470)"/>
  <circle cx="450" cy="470" r="204" fill="none" stroke="#EE7202" stroke-width="40" stroke-dasharray="48 24" transform="rotate(25 450 470)"/>
  <circle cx="450" cy="470" r="150" fill="none" stroke="#1B2A4A" stroke-width="40" stroke-dasharray="40 20" transform="rotate(-8 450 470)"/>
  <circle cx="450" cy="470" r="96" fill="none" stroke="#EE7202" stroke-width="40" stroke-dasharray="32 18" transform="rotate(50 450 470)"/>
  <circle cx="450" cy="470" r="54" fill="#1B2A4A"/>
  <text x="450" y="476" text-anchor="middle" fill="#F4EFE6" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" font-weight="800">MOCK</text>
  <rect y="830" width="900" height="70" fill="#B01218"/>
  <text x="450" y="876" text-anchor="middle" fill="#fff" font-family="ui-monospace,monospace" font-size="22" font-weight="800">rs/appclipcode = VISUAL MOCK ONLY</text>
</svg>
`;
}

function tryDecode(img, w, h, how) {
  try {
    const a = jsQR(img, w, h, { inversionAttempts: "attemptBoth" });
    if (a) return { data: a.data, how };
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
    const hit = tryDecode(scalePng(png, tw, th), tw, th, `scale${side}`);
    if (hit) return hit;
  }
  return null;
}

function analyzeLook(png, placed) {
  const { width: W, height: H, data } = png;
  let orange = 0;
  let orangeOutside = 0;
  let led = 0;
  const field = placed.field;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isOrange = r > 85 && g > 28 && g < 170 && b < 90 && r > g + 24;
      const inField = x >= field.left && x <= field.right && y >= field.top && y <= field.bottom;
      if (isOrange) {
        orange += 1;
        if (!inField) orangeOutside += 1;
      }
      if (g > 180 && r < 160 && b < 200) led += 1;
    }
  }
  return {
    orange,
    orangeOutside,
    led,
    heroInField: placed.hero.insideField === true,
    sticker: orangeOutside > 40 || placed.hero.insideField !== true,
    notFlatBW: orange > 200,
  };
}

async function writePng(name, png) {
  const path = join(OUT, name);
  await writeFile(path, PNG.sync.write(png));
  return path;
}

export async function makePreviewOptions() {
  await mkdir(OUT, { recursive: true });
  const spec = encodeTipMatrix();
  const { matrix, n, dark, version, ecc } = spec;

  const opt1 = paintOption1(matrix);
  const opt1Path = await writePng("OPTION_1_PREVIEW_send-still.png", opt1.png);
  await writeFile(join(OUT, "OPTION_1_PREVIEW_send-still.svg"), option1Svg(matrix));
  const opt1Hit = decodeLivingStill(opt1.png) || decodePng(opt1.png);
  const look = analyzeLook(opt1.png, opt1.placed);

  const opt2 = paintOption2(matrix);
  const opt2Door = await writePng("OPTION_2_PREVIEW_circular-door.png", opt2.png);
  const opt2Qr = await writePng("OPTION_2_PREVIEW_standard-qr.png", opt2.qr);
  await writeFile(join(OUT, "OPTION_2_PREVIEW_circular-door.svg"), option2Svg(matrix));
  const opt2DoorHit = decodePng(opt2.png);
  const opt2QrHit = decodePng(opt2.qr);

  const plate = paintOption3(opt1.png, opt2.png);
  const platePath = await writePng("OPTION_3_PREVIEW_print-plate.png", plate);
  const plateHit = decodePng(plate);

  const mock = paintOption4Mock();
  await writePng("OPTION_4_PREVIEW_mock.png", mock);
  await writeFile(join(OUT, "OPTION_4_PREVIEW_mock.svg"), option4Svg());
  const mockHit = decodePng(mock);

  const proof = {
    label: "PREVIEW OPTIONS 1–5 · overnight sandbox",
    ready: false,
    fabianSend: false,
    tip: TIP,
    destLeaveOnly: DEST,
    ecc,
    version,
    size: n,
    dark,
    option1: {
      file: opt1Path,
      decoded: opt1Hit?.data || null,
      match: opt1Hit?.data === TIP,
      notDest: opt1Hit?.data !== DEST,
      how: opt1Hit?.how || null,
      look,
    },
    option2: {
      door: opt2Door,
      standardQr: opt2Qr,
      doorDecoded: opt2DoorHit?.data || null,
      qrDecoded: opt2QrHit?.data || null,
      doorMatch: opt2DoorHit?.data === TIP,
      qrMatch: opt2QrHit?.data === TIP,
      notDest: (opt2QrHit?.data || opt2DoorHit?.data) !== DEST,
      note: "Rings are TAS lookalike chrome. Decode path is the STANDARD QR. rs/appclipcode is mock-only and was not used as a payload.",
    },
    option3: {
      file: platePath,
      decoded: plateHit?.data || null,
      match: plateHit?.data === TIP,
      note: "Hybrid plate. Phone may prefer scanning the isolated OPTION 1 / OPTION 2 files.",
    },
    option4: {
      mockDecodes: !!mockHit,
      mockDecoded: mockHit?.data || null,
      note: "NOT LIVE. Mock must not decode as a commercial send. Camera App Clip card is not claimed.",
    },
    living10Untouched: {
      sendFile: "fabian-showtime-qr.png not overwritten",
      tipQuery: "?v=living10&showtime=1",
    },
  };
  await writeFile(join(OUT, "OPTION_PREVIEW_decode.json"), JSON.stringify(proof, null, 2));
  return proof;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  makePreviewOptions()
    .then((proof) => {
      console.log(JSON.stringify(proof, null, 2));
      const fail = !proof.option1.match
        || !proof.option1.notDest
        || proof.option1.look.sticker
        || !proof.option2.qrMatch
        || proof.option2.qrDecoded === DEST
        || proof.option1.decoded === DEST;
      process.exit(fail ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
