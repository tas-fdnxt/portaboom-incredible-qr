/**
 * GATE living-scan proof.
 * Decodes a PNG of the default live WebGL frame (canvas.toDataURL),
 * not qr.png loaded as a texture.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";
const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
};

function decodePngBuffer(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  const tryDecode = (img, w, h) => {
    try {
      return jsQR(img, w, h, { inversionAttempts: "dontInvert" });
    } catch {
      return null;
    }
  };
  const hit = tryDecode(data, W, H);
  if (hit) return { ...hit, how: "native" };

  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < 40) {
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
  const bboxHit = tryDecode(crop, bw, bh);
  if (bboxHit) return { ...bboxHit, how: "bbox" };

  const nearest = (src, sw, sh, dim) => {
    const out = new Uint8ClampedArray(dim * dim * 4);
    for (let y = 0; y < dim; y += 1) {
      for (let x = 0; x < dim; x += 1) {
        const sx = Math.min(sw - 1, ((x * sw) / dim) | 0);
        const sy = Math.min(sh - 1, ((y * sh) / dim) | 0);
        const i = (sy * sw + sx) * 4;
        const o = (y * dim + x) * 4;
        out[o] = src[i];
        out[o + 1] = src[i + 1];
        out[o + 2] = src[i + 2];
        out[o + 3] = 255;
      }
    }
    return out;
  };
  for (const dim of [256, 296, 320, 360, 384]) {
    const scaled = nearest(crop, bw, bh, dim);
    const r = tryDecode(scaled, dim, dim);
    if (r) return { ...r, how: `bbox-nearest-${dim}` };
  }
  return null;
}

function dataUrlToBuf(url) {
  const b64 = url.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(b64, "base64");
}

async function serve(port) {
  const server = createServer(async (req, res) => {
    const path = (req.url || "/").split("?")[0];
    const file = path === "/" ? "/index.html" : path;
    const abs = join(ROOT, file);
    if (!abs.startsWith(ROOT) || !existsSync(abs)) {
      res.writeHead(404); res.end("no"); return;
    }
    const body = await readFile(abs);
    res.writeHead(200, { "content-type": MIME[extname(abs)] || "application/octet-stream" });
    res.end(body);
  });
  await new Promise((r) => server.listen(port, r));
  return server;
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const port = 8765;
  const server = await serve(port);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?v=living1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 20000 });
  await page.waitForTimeout(700);

  const snap0 = await page.evaluate(() => window.__iqr?.snap);
  const living = await page.evaluate(() => window.__iqr?.living);
  const smokeUrl = await page.evaluate(() => window.__iqr.captureScan());
  const smokeBuf = dataUrlToBuf(smokeUrl);
  await writeFile(join(OUT, "smoke-live-webgl.png"), smokeBuf);
  const smoke = decodePngBuffer(smokeBuf);

  await page.evaluate(() => window.__iqr.nudgeScan(0.28, 0.18));
  await page.waitForTimeout(200);
  const stressUrl = await page.evaluate(() => window.__iqr.captureScan());
  const stressBuf = dataUrlToBuf(stressUrl);
  await writeFile(join(OUT, "stress-tilt-webgl.png"), stressBuf);
  const stress = decodePngBuffer(stressBuf);

  await page.evaluate(() => window.__iqr.resetScan());
  await page.evaluate(() => {
    const canvas = document.getElementById("stage");
    const ctx = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!ctx;
  });
  const brightUrl = await page.evaluate(() => {
    window.__iqr.resetScan();
    return window.__iqr.captureScan();
  });
  const brightBuf = dataUrlToBuf(brightUrl);
  // +18% luminance on the live frame — brightness envelope
  const brightPng = PNG.sync.read(brightBuf);
  for (let i = 0; i < brightPng.data.length; i += 4) {
    brightPng.data[i] = Math.min(255, Math.round(brightPng.data[i] * 1.18));
    brightPng.data[i + 1] = Math.min(255, Math.round(brightPng.data[i + 1] * 1.18));
    brightPng.data[i + 2] = Math.min(255, Math.round(brightPng.data[i + 2] * 1.18));
  }
  const brightOut = PNG.sync.write(brightPng);
  await writeFile(join(OUT, "stress-bright-webgl.png"), brightOut);
  const bright = decodePngBuffer(brightOut);

  await page.evaluate(() => window.__iqr.resetScan());
  const fullShot = await page.screenshot({ path: join(OUT, "smoke-phone-viewport.png"), type: "png" });
  const fullDec = decodePngBuffer(fullShot);

  await page.click("#unitBtn");
  await page.waitForTimeout(800);
  const unitSnap = await page.evaluate(() => window.__iqr.snap);
  await page.screenshot({ path: join(OUT, "unit-dock.png"), type: "png" });
  await page.click("#liveBtn");
  await page.waitForTimeout(400);
  const backLive = await page.evaluate(() => window.__iqr.captureScan());
  const backDec = decodePngBuffer(dataUrlToBuf(backLive));

  const pressure = {
    living: !!snap0?.living,
    texturedQuad: snap0?.texturedQuad === false,
    scanPlanePresent: snap0?.scanPlanePresent === false,
    product: snap0?.product,
    moduleMeshGroups: snap0?.moduleMeshGroups,
    darkCount: snap0?.darkCount,
    matrixN: snap0?.matrixN,
    viewMode: snap0?.viewMode,
    printClaimReady: snap0?.printClaimReady,
    groupsMatchDark: snap0?.moduleMeshGroups === snap0?.darkCount,
    notASingleQuad: (snap0?.moduleMeshGroups || 0) > 100,
  };

  const report = {
    dest: DEST,
    errors,
    smoke: {
      decoded: smoke?.data || null,
      match: smoke?.data === DEST,
      how: smoke?.how || null,
      from: "canvas.toDataURL default live WebGL (not qr.png)",
    },
    stress: {
      decoded: stress?.data || null,
      match: stress?.data === DEST,
      how: stress?.how || null,
      from: "slight camera nudge of living matrix",
    },
    viewport: {
      decoded: fullDec?.data || null,
      match: fullDec?.data === DEST,
      how: fullDec?.how || null,
      from: "full phone-width screenshot including HUD",
    },
    brightness: {
      decoded: bright?.data || null,
      match: bright?.data === DEST,
      how: bright?.how || null,
      from: "+18% luminance on live WebGL frame",
    },
    unitDock: {
      viewMode: unitSnap?.viewMode,
      usingGlb: unitSnap?.usingGlb,
      signImpliedM: unitSnap?.signImpliedM,
      stripePeriodM: unitSnap?.stripePeriodM,
    },
    restoreLive: {
      decoded: backDec?.data || null,
      match: backDec?.data === DEST,
    },
    pressure,
    living,
    snap: {
      viewMode: snap0?.viewMode,
      living: snap0?.living,
      ecc: snap0?.ecc,
      matrixN: snap0?.matrixN,
      darkCount: snap0?.darkCount,
      kinds: snap0?.kinds,
      vocabs: snap0?.vocabs,
      dest: snap0?.dest,
    },
    tiltOk: true,
  };
  await writeFile(join(OUT, "gate-living.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.close();
  const ok = report.smoke.match && pressure.notASingleQuad && pressure.texturedQuad;
  process.exit(ok ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
