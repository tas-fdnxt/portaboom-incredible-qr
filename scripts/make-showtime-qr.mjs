/**
 * Stationary send QR for Fabian.
 * Encodes the living Incredible QR page (showtime=1 / living11).
 * Phone cameras open the ICQR door (QR field + PORTABOOM), then transform, then DEST.
 * Do not encode DEST directly.
 *
 * living10 paintClean (plain B&W) is REJECT look.
 * living10 paintLivingMatrix (flat mixed-vocab squares) failed jsQR — do not ship.
 * This cut renders the H-matrix as the living PORTABOOM field (ortho/elevated
 * cuboid minis, dark finders, all-orange cabinets) and fail-closes if jsQR
 * cannot read the living11 showtime URL.
 */
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { extname, dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { LIVING_SHOWTIME_URL } from "./showtime-url.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const ART = "/opt/cursor/artifacts";
const require = createRequire(import.meta.url);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

function loadQrcode() {
  try {
    return require("qrcode");
  } catch {
    return null;
  }
}

function decodePng(png) {
  const { width, height, data } = png;
  const img = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  return tryDecode(img, width, height);
}

function tryDecode(img, width, height) {
  try {
    const a = jsQR(img, width, height, { inversionAttempts: "attemptBoth" });
    if (a) return a;
  } catch { /* continue */ }
  try {
    const b = jsQR(img, width, height, { inversionAttempts: "dontInvert" });
    if (b) return b;
  } catch { /* continue */ }
  return null;
}

function decodeBuf(buf) {
  const png = PNG.sync.read(buf);
  const hit = decodePng(png);
  if (hit) return { hit, png };
  return { hit: null, png };
}

function livingLook(png) {
  const { width: W, height: H, data } = png;
  const n = W * H;
  let orange = 0;
  let dark = 0;
  let cream = 0;
  let chroma = 0;
  let nearBlack = 0;
  let nearWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (max - min > 28) chroma += 1;
    if (r > 185 && g > 85 && g < 225 && b < 185 && r > g + 12 && r > b + 18) orange += 1;
    if (lum < 80) dark += 1;
    if (r > 200 && g > 185 && b > 165 && lum > 190) cream += 1;
    if (lum < 28) nearBlack += 1;
    if (lum > 240 && max - min < 12) nearWhite += 1;
  }
  const orangeRatio = orange / n;
  const darkRatio = dark / n;
  const creamRatio = cream / n;
  const chromaRatio = chroma / n;
  const bwRatio = (nearBlack + nearWhite) / n;
  const looksPlainBW = orangeRatio < 0.01 && chromaRatio < 0.08 && bwRatio > 0.72;
  const looksLivingField = orangeRatio >= 0.04 && chromaRatio >= 0.08 && !looksPlainBW;
  return {
    width: W,
    height: H,
    orange,
    dark,
    cream,
    orangeRatio: +orangeRatio.toFixed(4),
    darkRatio: +darkRatio.toFixed(4),
    creamRatio: +creamRatio.toFixed(4),
    chromaRatio: +chromaRatio.toFixed(4),
    bwRatio: +bwRatio.toFixed(4),
    looksPlainBW,
    looksLivingField,
  };
}

function serve(port) {
  const server = createServer(async (req, res) => {
    const path = (req.url || "/").split("?")[0];
    const file = path === "/" ? "/send-still.html" : path;
    const abs = join(ROOT, file);
    if (!abs.startsWith(ROOT) || !existsSync(abs)) {
      res.writeHead(404); res.end("no"); return;
    }
    const { readFile } = await import("node:fs/promises");
    const body = await readFile(abs);
    res.writeHead(200, { "content-type": MIME[extname(abs)] || "application/octet-stream" });
    res.end(body);
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

async function renderLivingStill(matrix, url) {
  const { chromium } = await import("playwright");
  const port = 8771;
  const server = await serve(port);
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1400 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(({ matrix: m, url: u }) => {
    window.__SEND_MATRIX = m;
    window.__SEND_URL = u;
  }, { matrix, url });
  await page.goto(`http://127.0.0.1:${port}/send-still.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__sendStill?.ready === true, { timeout: 30000 });

  const order = ["elevated", "mid", "steep", "top"];
  const attempts = [];
  let chosen = null;
  for (const name of order) {
    const pose = await page.evaluate((n) => window.__sendStill.applyPose(n), name);
    const dataUrl = await page.evaluate(() => window.__sendStill.capture());
    const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
    const { hit, png } = decodeBuf(buf);
    const look = livingLook(png);
    const row = {
      pose: pose?.pose || name,
      elev: pose?.elev ?? null,
      decoded: hit?.data || null,
      match: hit?.data === url,
      look,
    };
    attempts.push(row);
    if (row.match && look.looksLivingField && !look.looksPlainBW) {
      chosen = { name, buf, png, pose, look, decoded: hit.data };
      break;
    }
    if (!chosen && row.match) {
      chosen = { name, buf, png, pose, look, decoded: hit.data };
    }
  }

  await browser.close();
  server.close();
  if (!chosen) {
    return { ok: false, attempts };
  }
  return {
    ok: chosen.decoded === url && chosen.look.looksLivingField && !chosen.look.looksPlainBW,
    chosen: chosen.name,
    pose: chosen.pose,
    look: chosen.look,
    decoded: chosen.decoded,
    buf: chosen.buf,
    attempts,
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

  const render = await renderLivingStill(matrix, url);
  if (!render.ok || !render.buf) {
    const proof = {
      url,
      ecc: "H",
      version: qr.version,
      size: n,
      dark,
      rejected: "living-scene still failed decode or looked plain B&W",
      render,
    };
    await writeFile(join(OUT, "fabian-showtime-qr.json"), JSON.stringify(proof, null, 2));
    throw new Error("send PNG fail-closed: living still did not decode living11 URL");
  }

  const rootPath = join(ROOT, "fabian-showtime-qr.png");
  const outPath = join(OUT, "fabian-showtime-qr.png");
  await writeFile(outPath, render.buf);
  await writeFile(rootPath, render.buf);

  const proof = {
    url,
    ecc: "H",
    version: qr.version,
    size: n,
    dark,
    livingScene: {
      file: outPath,
      root: rootPath,
      pose: render.chosen,
      elev: render.pose?.elev ?? null,
      decoded: render.decoded,
      match: render.decoded === url,
      look: render.look,
      attempts: render.attempts,
    },
    clean: {
      file: outPath,
      decoded: render.decoded,
      match: render.decoded === url,
      note: "root send file is the living-scene still (paintClean rejected)",
    },
  };
  await writeFile(join(OUT, "fabian-showtime-qr.json"), JSON.stringify(proof, null, 2));
  try {
    if (existsSync(ART) || existsSync(dirname(ART))) {
      await mkdir(ART, { recursive: true });
      await copyFile(outPath, join(ART, "fabian-showtime-qr.png"));
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
      if (!proof.clean.match || !proof.livingScene?.look?.looksLivingField) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
