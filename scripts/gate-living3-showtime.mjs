/**
 * GATE living3 showtime proof.
 * ?showtime=1 starts the world, hides the dock, amber → red, boom lowers ~3.3s,
 * then Life / Tap to scan return. Scan DEST is still the product page.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { makeShowtimeQr } from "./make-showtime-qr.mjs";
import { DEST, LIVING_SHOWTIME_URL } from "./showtime-url.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "gate-artifacts");
const ART = "/opt/cursor/artifacts";
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
  const hit = tryDecode(data, W, H, "native");
  if (hit) return hit;

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
  const bboxHit = tryDecode(crop, bw, bh, "bbox");
  if (bboxHit) return bboxHit;
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

function summarizeTimeline(samples) {
  const aspects = [...new Set(samples.map((s) => s.signalAspect))];
  const phases = [...new Set(samples.map((s) => s.showtimePhase))];
  const boomStart = samples[0]?.boomPct ?? null;
  const boomEnd = samples[samples.length - 1]?.boomPct ?? null;
  const boomMin = Math.min(...samples.map((s) => s.boomPct ?? 100));
  const boomMax = Math.max(...samples.map((s) => s.boomPct ?? 0));
  const sawAmber = samples.some((s) => s.signalAspect === "amber");
  const sawRed = samples.some((s) => s.signalAspect === "red");
  const amberLampOn = samples.some((s) =>
    s.signalAspect === "amber"
    && (s.lampIntensity?.amber || 0) > 4
    && (s.lampIntensity?.amber || 0) > (s.lampIntensity?.red || 0)
  );
  const redLampOn = samples.some((s) =>
    s.signalAspect === "red"
    && (s.lampIntensity?.red || 0) > 4
    && (s.lampIntensity?.red || 0) > (s.lampIntensity?.amber || 0)
  );
  const lowered = boomStart != null && boomEnd != null && boomStart > 80 && boomEnd < 15;
  const hudHiddenWhilePlaying = samples
    .filter((s) => s.showtimePhase === "playing")
    .every((s) => s.showtimeHudHidden === true && s.liveDockHidden === true);
  const playing = samples.filter((s) => s.showtimePhase === "playing");
  const duration = playing.length
    ? (playing[playing.length - 1].t - playing[0].t)
    : 0;
  return {
    aspects,
    phases,
    boomStart,
    boomEnd,
    boomMin,
    boomMax,
    sawAmber,
    sawRed,
    amberLampOn,
    redLampOn,
    lowered,
    hudHiddenWhilePlaying,
    playDurationS: +duration.toFixed(3),
    sampleCount: samples.length,
  };
}

async function run() {
  await mkdir(OUT, { recursive: true });
  if (existsSync(ART) || existsSync(resolve(ART, ".."))) await mkdir(ART, { recursive: true });

  const qrProof = await makeShowtimeQr();

  const port = 8767;
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
  await page.goto(`http://127.0.0.1:${port}/?v=living3&showtime=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });

  const samples = [];
  const t0 = Date.now();
  let snappedAmber = false;
  let snappedLower = false;
  let snappedDown = false;
  while (Date.now() - t0 < 14000) {
    const pack = await page.evaluate(() => {
      const snap = window.__iqr?.snap;
      let world = null;
      if (snap?.showtimePhase === "playing" && snap?.signalAspect === "amber") {
        world = window.__iqr.captureWorld();
      }
      return { snap, world };
    });
    const snap = pack.snap;
    const t = (Date.now() - t0) / 1000;
    const row = {
      t: +t.toFixed(3),
      showtimePhase: snap?.showtimePhase ?? null,
      showtimeElapsed: snap?.showtimeElapsed ?? null,
      signalAspect: snap?.signalAspect ?? null,
      showMode: snap?.showMode ?? null,
      boomPct: snap?.boomPct ?? null,
      boomTarget: snap?.boomTarget ?? null,
      boomAngle: snap?.boomAngle ?? null,
      lampIntensity: snap?.lampIntensity ?? null,
      viewMode: snap?.viewMode ?? null,
      usingGlb: snap?.usingGlb ?? null,
      defaultShowsTwin: snap?.defaultShowsTwin ?? null,
      showtimeHudHidden: snap?.showtimeHudHidden ?? null,
      liveDockHidden: snap?.liveDockHidden ?? null,
      cameraIsPerspective: snap?.cameraIsPerspective ?? null,
    };
    samples.push(row);
    if (!snappedAmber && row.signalAspect === "amber" && row.showtimePhase === "playing") {
      if (pack.world) await writeFile(join(OUT, "showtime-amber-webgl.png"), dataUrlToBuf(pack.world));
      await page.screenshot({ path: join(OUT, "showtime-amber.png"), type: "png" });
      snappedAmber = true;
    }
    if (!snappedLower && row.signalAspect === "red" && row.boomPct != null && row.boomPct < 75 && row.boomPct > 15) {
      await page.screenshot({ path: join(OUT, "showtime-lowering.png"), type: "png" });
      snappedLower = true;
    }
    if (!snappedDown && row.boomPct != null && row.boomPct <= 5 && row.signalAspect === "red") {
      await page.screenshot({ path: join(OUT, "showtime-down.png"), type: "png" });
      snappedDown = true;
    }
    if (row.showtimePhase === "settled" && row.usingGlb && snappedAmber && row.boomPct <= 5) break;
    await page.waitForTimeout(120);
  }

  await page.waitForFunction(() => window.__iqr?.snap?.showtimePhase === "settled", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(250);
  const snapEnd = await page.evaluate(() => window.__iqr?.snap);
  if (!snappedDown) {
    await page.screenshot({ path: join(OUT, "showtime-down.png"), type: "png" });
  }
  await page.screenshot({ path: join(OUT, "showtime-settled.png"), type: "png" });

  const dockAfter = await page.evaluate(() => {
    const dock = document.getElementById("liveDock");
    const life = document.getElementById("lifeBtn");
    const scan = document.getElementById("scanBtn");
    return {
      hidden: dock?.hidden === true,
      bodyShowtime: document.body.classList.contains("showtime"),
      life: life?.textContent || null,
      scan: scan?.textContent || null,
    };
  });

  await page.locator("#scanBtn").click();
  await page.waitForTimeout(400);
  const smokeUrl = await page.evaluate(() => window.__iqr.captureScan());
  const smokeBuf = dataUrlToBuf(smokeUrl);
  await writeFile(join(OUT, "showtime-scan-webgl.png"), smokeBuf);
  const smoke = decodePngBuffer(smokeBuf);
  await page.screenshot({ path: join(OUT, "showtime-scan.png"), type: "png" });

  const timeline = summarizeTimeline(samples);
  const settleOk = snapEnd?.showtimePhase === "settled"
    && (snapEnd?.boomPct ?? 99) < 8
    && snapEnd?.signalAspect === "red"
    && snapEnd?.viewMode === "world";
  const hudRestored = dockAfter.hidden === false && dockAfter.scan === "Tap to scan";

  const report = {
    dest: DEST,
    livingUrl: LIVING_SHOWTIME_URL,
    errors,
    qr: qrProof,
    timeline,
    samples,
    settle: {
      phase: snapEnd?.showtimePhase,
      boomPct: snapEnd?.boomPct,
      signalAspect: snapEnd?.signalAspect,
      viewMode: snapEnd?.viewMode,
      usingGlb: snapEnd?.usingGlb,
      ok: settleOk,
    },
    hud: {
      duringPlayHidden: timeline.hudHiddenWhilePlaying,
      after: dockAfter,
      restored: hudRestored,
    },
    smoke: {
      decoded: smoke?.data || null,
      match: smoke?.data === DEST,
      how: smoke?.how || null,
      from: "Tap to scan after showtime settle",
    },
    snapEnd: {
      viewMode: snapEnd?.viewMode,
      showtimePhase: snapEnd?.showtimePhase,
      boomPct: snapEnd?.boomPct,
      signalAspect: snapEnd?.signalAspect,
      defaultShowsTwin: snapEnd?.defaultShowsTwin,
      product: snapEnd?.product,
    },
  };

  await writeFile(join(OUT, "gate-living3-showtime.json"), JSON.stringify(report, null, 2));
  try {
    await mkdir(ART, { recursive: true });
    for (const name of [
      "showtime-amber.png",
      "showtime-amber-webgl.png",
      "showtime-lowering.png",
      "showtime-down.png",
      "showtime-settled.png",
      "showtime-scan.png",
      "showtime-scan-webgl.png",
      "gate-living3-showtime.json",
      "fabian-showtime-qr.png",
    ]) {
      const src = join(OUT, name);
      if (existsSync(src)) await copyFile(src, join(ART, name));
    }
  } catch (err) {
    console.warn("artifact copy skipped", err.message);
  }

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  server.close();

  const ok = qrProof.clean.match
    && timeline.sawAmber
    && timeline.sawRed
    && timeline.amberLampOn
    && timeline.redLampOn
    && timeline.lowered
    && timeline.hudHiddenWhilePlaying
    && settleOk
    && hudRestored
    && report.smoke.match
    && !errors.length;
  process.exit(ok ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
