/**
 * Stationary send QR for Fabian.
 * Encodes the living Incredible QR page (showtime=1 / living10).
 * Phone cameras open the ICQR door (QR field + PORTABOOM), then transform, then DEST.
 * Do not encode DEST directly.
 */
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { LIVING_SHOWTIME_URL } from "./showtime-url.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const ART = "/opt/cursor/artifacts";
const require = createRequire(import.meta.url);

function loadQrcode() {
  try {
    return require("qrcode");
  } catch {
    return null;
  }
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

function inFinder(n, r, c) {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

function isTiming(r, c) {
  return r === 6 || c === 6;
}

/** Living-vocab color on data modules; finders stay near-black for scan. */
function paintLivingMatrix(matrix, modulePx = 14, quiet = 4) {
  const n = matrix.length;
  const dim = (n + quiet * 2) * modulePx;
  const png = new PNG({ width: dim, height: dim });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 244;
    png.data[i + 1] = 239;
    png.data[i + 2] = 230;
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
      let rgb = [17, 19, 24];
      if (inFinder(n, r, c)) rgb = [17, 19, 24];
      else if (isTiming(r, c)) rgb = r % 2 ? [192, 20, 33] : [240, 241, 243];
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

function decodePng(png) {
  const { width, height, data } = png;
  const img = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  return jsQR(img, width, height, { inversionAttempts: "attemptBoth" });
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
  const living = paintLivingMatrix(matrix);
  const cleanPath = join(OUT, "fabian-showtime-qr.png");
  const livingPath = join(OUT, "fabian-showtime-qr-living-matrix.png");
  const rootPath = join(ROOT, "fabian-showtime-qr.png");
  await writeFile(cleanPath, PNG.sync.write(clean));
  await writeFile(livingPath, PNG.sync.write(living));
  await writeFile(rootPath, PNG.sync.write(clean));

  const cleanHit = decodePng(clean);
  const livingHit = decodePng(living);
  const proof = {
    url,
    ecc: "H",
    version: qr.version,
    size: n,
    dark,
    clean: {
      file: cleanPath,
      decoded: cleanHit?.data || null,
      match: cleanHit?.data === url,
    },
    livingMatrix: {
      file: livingPath,
      decoded: livingHit?.data || null,
      match: livingHit?.data === url,
    },
  };
  await writeFile(join(OUT, "fabian-showtime-qr.json"), JSON.stringify(proof, null, 2));
  try {
    if (existsSync(ART) || existsSync(dirname(ART))) {
      await mkdir(ART, { recursive: true });
      await copyFile(cleanPath, join(ART, "fabian-showtime-qr.png"));
      await copyFile(livingPath, join(ART, "fabian-showtime-qr-living-matrix.png"));
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
      if (!proof.clean.match) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
