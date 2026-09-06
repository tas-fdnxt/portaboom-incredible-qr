/**
 * GATE living2 proof.
 * Default = ICQR-style 3D brand world (PB4000 on a living plaza).
 * That default MUST fail the "looks like a normal QR" test.
 * Scan DEST is proven from the tap-to-scan pose (canvas.toDataURL), not qr.png.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";
const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const ART = "/opt/cursor/artifacts";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
};

function decodePngBuffer(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  const tryDecode = (img, w, h, how) => {
    try {
      const a = jsQR(img, w, h, { inversionAttempts: "attemptBoth" });
      if (a) return { ...a, how };
    } catch { /* continue */ }
    try {
      const b = jsQR(img, w, h, { inversionAttempts: "dontInvert" });
      if (b) return { ...b, how: `${how}-ni` };
    } catch { /* continue */ }
    return null;
  };
  const contrast = (src) => {
    const out = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      const lum = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
      const v = lum < 110 ? 0 : 255;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    }
    return out;
  };
  const hit = tryDecode(data, W, H, "native");
  if (hit) return hit;
  const hitC = tryDecode(contrast(data), W, H, "native-contrast");
  if (hitC) return hitC;

  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < 48) {
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
  for (const dim of [256, 296, 320, 360, 384, 420]) {
    const scaled = nearest(crop, bw, bh, dim);
    const r = tryDecode(scaled, dim, dim);
    if (r) return { ...r, how: `bbox-nearest-${dim}` };
  }
  return null;
}

function brandVision(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  let orange = 0;
  let greenLed = 0;
  let chroma = 0;
  let dark = 0;
  let light = 0;
  const n = W * H;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min > 28) chroma += 1;
    if (r > 160 && g > 55 && g < 170 && b < 90 && r > g + 30) orange += 1;
    if (g > 140 && r < 120 && b < 140 && g > r + 20) greenLed += 1;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 40) dark += 1;
    if (lum > 220) light += 1;
  }
  const orangeRatio = orange / n;
  const chromaRatio = chroma / n;
  const bwish = (dark + light) / n;
  return {
    width: W,
    height: H,
    orange,
    greenLed,
    orangeRatio: +orangeRatio.toFixed(4),
    chromaRatio: +chromaRatio.toFixed(4),
    bwish: +bwish.toFixed(4),
    looksLikeFlatBWQR: orangeRatio < 0.012 && chromaRatio < 0.05,
    looksLikeNormalQR: looksLikeNormalQRCard(data, W, H),
    portaboomVisible: orange > 8000,
  };
}

function looksLikeNormalQRCard(data, W, H) {
  const x0 = Math.round(W * 0.12);
  const x1 = Math.round(W * 0.88);
  const y0 = Math.round(H * 0.16);
  const y1 = Math.round(H * 0.7);
  let white = 0;
  let dark = 0;
  let orange = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * W + x) * 4;
      n += 1;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > 220 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) white += 1;
      if (lum < 45) dark += 1;
      if (r > 160 && g > 55 && g < 170 && b < 90 && r > g + 30) orange += 1;
    }
  }
  if (!n) return false;
  return (white / n) > 0.28 && (dark / n) > 0.12 && (orange / n) < 0.02;
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
  if (existsSync(ART)) await mkdir(ART, { recursive: true });
  const port = 8766;
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
  await page.goto(`http://127.0.0.1:${port}/?v=living2`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });
  await page.waitForFunction(() => window.__iqr?.snap?.usingGlb === true, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(900);

  await page.evaluate(() => window.__iqr.exitScan());
  await page.waitForTimeout(500);

  const snap0 = await page.evaluate(() => window.__iqr?.snap);
  const living = await page.evaluate(() => window.__iqr?.living);
  const defaultShot = await page.screenshot({ path: join(OUT, "living2-default.png"), type: "png" });
  const vision = brandVision(defaultShot);
  const viewportDec = decodePngBuffer(defaultShot);

  await page.evaluate(() => window.__iqr.enterScan());
  await page.waitForTimeout(350);
  const smokeUrl = await page.evaluate(() => window.__iqr.captureScan());
  const smokeBuf = dataUrlToBuf(smokeUrl);
  await writeFile(join(OUT, "smoke-live-webgl.png"), smokeBuf);
  const smoke = decodePngBuffer(smokeBuf);
  await page.screenshot({ path: join(OUT, "living2-scan.png"), type: "png" });

  await page.evaluate(() => window.__iqr.nudgeScan(0.28, 0.18));
  await page.waitForTimeout(200);
  const stressUrl = await page.evaluate(() => window.__iqr.captureScan());
  const stressBuf = dataUrlToBuf(stressUrl);
  await writeFile(join(OUT, "stress-tilt-webgl.png"), stressBuf);
  const stress = decodePngBuffer(stressBuf);

  await page.evaluate(() => window.__iqr.resetScan());
  const brightUrl = await page.evaluate(() => window.__iqr.captureScan());
  const brightBuf = dataUrlToBuf(brightUrl);
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
  const lifeOn = await page.evaluate(() => {
    const btn = document.getElementById("lifeBtn");
    if (btn && /OFF/i.test(btn.textContent || "")) btn.click();
    return window.__iqr.snap.lifeOn;
  });
  await page.waitForTimeout(400);
  const lifeUrl = await page.evaluate(() => window.__iqr.captureScan());
  const life = decodePngBuffer(dataUrlToBuf(lifeUrl));
  await writeFile(join(OUT, "stress-life-webgl.png"), dataUrlToBuf(lifeUrl));

  const hud = {
    primaryControls: snap0?.primaryControls ?? null,
    flattenBtnPresent: snap0?.flattenBtnPresent === true,
    unitDockPresent: snap0?.unitDockPresent === true,
    moreOpenDefault: snap0?.moreOpen === true,
    visiblePrimaryOk: (snap0?.primaryControls || 99) <= 2 && snap0?.moreOpen !== true,
  };

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
    cameraIsPerspective: snap0?.cameraIsPerspective === true,
    cameraIsOrtho: snap0?.cameraIsOrtho === true,
    defaultShowsTwin: snap0?.defaultShowsTwin === true,
    flattenGone: snap0?.flattenBtnPresent === false,
    notFlatBW: vision.looksLikeFlatBWQR === false,
    notANormalQR: vision.looksLikeNormalQR === false,
    portaboomVisible: vision.portaboomVisible === true,
    defaultIsWorld: snap0?.viewMode === "world" && snap0?.cameraIsPerspective === true,
  };

  const report = {
    dest: DEST,
    errors,
    smoke: {
      decoded: smoke?.data || null,
      match: smoke?.data === DEST,
      how: smoke?.how || null,
      from: "tap-to-scan ortho canvas.toDataURL (not qr.png, not the default world)",
    },
    viewport: {
      decoded: viewportDec?.data || null,
      match: viewportDec?.data === DEST,
      how: viewportDec?.how || null,
      from: "default 390×844 world screenshot including HUD — must fail looksLikeNormalQR",
    },
    vision,
    stress: {
      decoded: stress?.data || null,
      match: stress?.data === DEST,
      how: stress?.how || null,
      from: "slight camera nudge of living world",
    },
    brightness: {
      decoded: bright?.data || null,
      match: bright?.data === DEST,
      how: bright?.how || null,
      from: "+18% luminance on live WebGL frame",
    },
    life: {
      on: lifeOn,
      decoded: life?.data || null,
      match: life?.data === DEST,
      how: life?.how || null,
    },
    hud,
    pressure,
    living,
    snap: {
      viewMode: snap0?.viewMode,
      living: snap0?.living,
      ecc: snap0?.ecc,
      matrixN: snap0?.matrixN,
      darkCount: snap0?.darkCount,
      product: snap0?.product,
      usingGlb: snap0?.usingGlb,
      defaultShowsTwin: snap0?.defaultShowsTwin,
      cameraIsPerspective: snap0?.cameraIsPerspective,
      dest: snap0?.dest,
      signImpliedM: snap0?.signImpliedM,
      stripePeriodM: snap0?.stripePeriodM,
    },
  };

  await writeFile(join(OUT, "gate-living2.json"), JSON.stringify(report, null, 2));
  try {
    await copyFile(join(OUT, "living2-default.png"), join(ART, "living2-default.png"));
    await copyFile(join(OUT, "smoke-live-webgl.png"), join(ART, "living2-smoke-webgl.png"));
    if (existsSync(join(OUT, "living2-scan.png"))) {
      await copyFile(join(OUT, "living2-scan.png"), join(ART, "living2-scan.png"));
    }
    await writeFile(join(ART, "gate-living2.json"), JSON.stringify(report, null, 2));
  } catch (err) {
    console.warn("artifact copy skipped", err.message);
  }
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.close();

  const ok = report.smoke.match
    && pressure.notASingleQuad
    && pressure.texturedQuad
    && pressure.defaultIsWorld
    && pressure.defaultShowsTwin
    && pressure.flattenGone
    && pressure.printClaimReady === false
    && pressure.notFlatBW
    && pressure.notANormalQR
    && pressure.portaboomVisible
    && hud.visiblePrimaryOk;
  process.exit(ok ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
