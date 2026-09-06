/**
 * GATE living3d showtime → configurable DEST proof.
 * ?showtime=1 starts the world, hides the dock, amber → red, boom lowers ~7s.
 * After settle/hold, the page leaves to configured DEST (default or ?dest=).
 * Stationary send QR encodes the living showtime URL, never DEST.
 * Tap-to-scan still decodes the baked default product matrix.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { makeShowtimeQr } from "./make-showtime-qr.mjs";
import { DEST, GATE_TEST_DEST, LIVING_SHOWTIME_URL } from "./showtime-url.mjs";
import { resolveLeaveDest, SHOWTIME_DEST_DEFAULT } from "../dest-config.mjs";

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
  const lowered = boomStart != null && boomEnd != null && boomStart > 80 && boomEnd < 8;
  const hudHiddenWhilePlaying = samples
    .filter((s) => s.showtimePhase === "playing")
    .every((s) => s.showtimeHudHidden === true && s.liveDockHidden === true);
  const playing = samples.filter((s) => s.showtimePhase === "playing");
  const duration = playing.length
    ? (playing[playing.length - 1].t - playing[0].t)
    : 0;
  const firstRed = samples.find((s) => s.signalAspect === "red" && s.showtimePhase === "playing");
  const lastPlay = [...playing].reverse().find(Boolean);
  const amberHeldS = firstRed?.showtimeElapsed ?? 0;
  const elapsedAtEnd = lastPlay?.showtimeElapsed
    ?? samples[samples.length - 1]?.showtimeElapsed
    ?? 0;
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
    amberHeldS: +amberHeldS.toFixed(3),
    elapsedAtEnd: +elapsedAtEnd.toFixed(3),
    longerThanTeaser: elapsedAtEnd > 3.6,
    naturalPace: amberHeldS >= 1.2 && elapsedAtEnd > 3.6,
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
  const navigations = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.addInitScript(() => {
    window.__iqrDestLeaves = [];
    window.__iqrOnLeaveToDest = (info) => {
      window.__iqrDestLeaves.push({
        dest: info?.dest || null,
        reason: info?.reason || null,
        at: info?.at || Date.now(),
      });
    };
  });
  await page.goto(`http://127.0.0.1:${port}/?v=living3d&showtime=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });

  const samples = [];
  const t0 = Date.now();
  let snappedAmber = false;
  let snappedLower = false;
  let snappedDown = false;
  while (Date.now() - t0 < 18000) {
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
      destLeft: snap?.destLeft ?? null,
      destLeaveUrl: snap?.destLeaveUrl ?? null,
      destLeaveReason: snap?.destLeaveReason ?? null,
      leaveDest: snap?.leaveDest ?? null,
      leaveDestSource: snap?.leaveDestSource ?? null,
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
  await page.waitForFunction(() => window.__iqr?.snap?.destLeft === true, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(80);
  const snapEnd = await page.evaluate(() => window.__iqr?.snap);
  const destLeaves = await page.evaluate(() => window.__iqrDestLeaves || []);
  if (!snappedDown) {
    await page.screenshot({ path: join(OUT, "showtime-down.png"), type: "png" });
  }
  await page.screenshot({ path: join(OUT, "showtime-settled.png"), type: "png" });

  const dockAfter = await page.evaluate(() => {
    const dock = document.getElementById("liveDock");
    const life = document.getElementById("lifeBtn");
    const scan = document.getElementById("scanBtn");
    return {
      hidden: dock?.hidden === true || dock?.offsetParent === null,
      bodyShowtime: document.body.classList.contains("showtime"),
      life: life?.textContent || null,
      scan: scan?.textContent || null,
    };
  });

  const destLeave = destLeaves[0] || (snapEnd?.destLeave ?? null);
  const destLeaveOk = !!destLeave
    && destLeave.dest === DEST
    && destLeave.dest === SHOWTIME_DEST_DEFAULT
    && destLeave.reason === "showtime-complete"
    && snapEnd?.leaveDest === DEST
    && snapEnd?.leaveDestSource === "default"
    && !navigations.some((u) => /trafficaccess\.com\.au/.test(u));

  const destHook = () => {
    window.__iqrDestLeaves = [];
    window.__iqrOnLeaveToDest = (info) => {
      window.__iqrDestLeaves.push({
        dest: info?.dest || null,
        reason: info?.reason || null,
        source: info?.source || null,
        at: info?.at || Date.now(),
      });
    };
  };

  const overridePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  overridePage.on("pageerror", (e) => errors.push(String(e)));
  await overridePage.addInitScript(destHook);
  const overrideQuery = `dest=${encodeURIComponent(GATE_TEST_DEST)}`;
  await overridePage.goto(
    `http://127.0.0.1:${port}/?v=living3d&showtime=1&${overrideQuery}`,
    { waitUntil: "networkidle" },
  );
  await overridePage.waitForFunction(() => typeof window.__iqr?.settleShowtime === "function", { timeout: 25000 });
  const overrideCfg = await overridePage.evaluate(() => ({
    leaveDest: window.__iqr.snap.leaveDest,
    leaveDestSource: window.__iqr.snap.leaveDestSource,
    leaveDestDefault: window.__iqr.snap.leaveDestDefault,
  }));
  await overridePage.evaluate(() => window.__iqr.settleShowtime());
  await overridePage.waitForFunction(() => window.__iqr?.snap?.destLeft === true, { timeout: 4000 }).catch(() => {});
  const overrideLeave = (await overridePage.evaluate(() => window.__iqrDestLeaves || []))[0]
    || (await overridePage.evaluate(() => window.__iqr?.snap?.destLeave));
  const overrideOk = overrideCfg.leaveDest === GATE_TEST_DEST
    && overrideCfg.leaveDestSource === "query"
    && overrideCfg.leaveDestDefault === SHOWTIME_DEST_DEFAULT
    && overrideLeave?.dest === GATE_TEST_DEST
    && overrideLeave?.dest !== DEST;
  await overridePage.close();

  const parseProof = {
    omitted: resolveLeaveDest(null) === SHOWTIME_DEST_DEFAULT,
    empty: resolveLeaveDest("") === SHOWTIME_DEST_DEFAULT,
    query: resolveLeaveDest(GATE_TEST_DEST) === GATE_TEST_DEST,
    encoded: resolveLeaveDest(decodeURIComponent(encodeURIComponent(GATE_TEST_DEST))) === GATE_TEST_DEST,
    rejectJs: resolveLeaveDest("javascript:alert(1)") === SHOWTIME_DEST_DEFAULT,
  };
  const parseOk = Object.values(parseProof).every(Boolean);

  const scanPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  scanPage.on("pageerror", (e) => errors.push(String(e)));
  await scanPage.goto(`http://127.0.0.1:${port}/?v=living3d`, { waitUntil: "networkidle" });
  await scanPage.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });
  await scanPage.locator("#scanBtn").click();
  await scanPage.waitForTimeout(400);
  const smokeUrl = await scanPage.evaluate(() => window.__iqr.captureScan());
  const smokeBuf = dataUrlToBuf(smokeUrl);
  await writeFile(join(OUT, "showtime-scan-webgl.png"), smokeBuf);
  const smoke = decodePngBuffer(smokeBuf);
  await scanPage.screenshot({ path: join(OUT, "showtime-scan.png"), type: "png" });
  await scanPage.close();

  const timeline = summarizeTimeline(samples);
  const settleElapsed = snapEnd?.showtimeElapsed ?? 0;
  const settleOk = snapEnd?.showtimePhase === "settled"
    && (snapEnd?.boomPct ?? 99) < 8
    && snapEnd?.signalAspect === "red"
    && snapEnd?.viewMode === "world"
    && settleElapsed > 3.6
    && settleElapsed >= 6
    && settleElapsed <= 8.5;
  const stayedOnLiving = !navigations.some((u) => /trafficaccess\.com\.au/.test(u));
  const qrIsLiving = qrProof.clean.match === true
    && qrProof.clean.decoded === LIVING_SHOWTIME_URL
    && qrProof.clean.decoded !== DEST;

  const report = {
    dest: DEST,
    destDefault: SHOWTIME_DEST_DEFAULT,
    destConfigurable: true,
    livingUrl: LIVING_SHOWTIME_URL,
    errors,
    parseProof,
    parseOk,
    destOverride: {
      dest: GATE_TEST_DEST,
      config: overrideCfg,
      leave: overrideLeave || null,
      ok: overrideOk,
    },
    qr: qrProof,
    timeline,
    samples,
    settle: {
      phase: snapEnd?.showtimePhase,
      boomPct: snapEnd?.boomPct,
      signalAspect: snapEnd?.signalAspect,
      viewMode: snapEnd?.viewMode,
      usingGlb: snapEnd?.usingGlb,
      elapsed: settleElapsed,
      budget: snapEnd?.showtimeBudget ?? null,
      ok: settleOk,
    },
    destLeave: {
      calls: destLeaves,
      dest: destLeave?.dest || null,
      reason: destLeave?.reason || null,
      ok: destLeaveOk,
      stayedOnLivingForProof: stayedOnLiving,
      navigations,
    },
    hud: {
      duringPlayHidden: timeline.hudHiddenWhilePlaying,
      after: dockAfter,
      restored: false,
      leftHidden: dockAfter.bodyShowtime === true,
    },
    smoke: {
      decoded: smoke?.data || null,
      match: smoke?.data === DEST,
      how: smoke?.how || null,
      from: "Tap to scan on default living page (no showtime)",
    },
    snapEnd: {
      viewMode: snapEnd?.viewMode,
      showtimePhase: snapEnd?.showtimePhase,
      boomPct: snapEnd?.boomPct,
      signalAspect: snapEnd?.signalAspect,
      destLeft: snapEnd?.destLeft ?? null,
      destLeaveUrl: snapEnd?.destLeaveUrl ?? null,
      destLeaveReason: snapEnd?.destLeaveReason ?? null,
      leaveDest: snapEnd?.leaveDest ?? null,
      leaveDestSource: snapEnd?.leaveDestSource ?? null,
      leaveDestDefault: snapEnd?.leaveDestDefault ?? null,
      defaultShowsTwin: snapEnd?.defaultShowsTwin,
      product: snapEnd?.product,
      showtimeBudget: snapEnd?.showtimeBudget,
      showtimeTeaserS: snapEnd?.showtimeTeaserS,
      showtimeLeaveS: snapEnd?.showtimeLeaveS,
      longerThanTeaser: snapEnd?.longerThanTeaser,
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

  const ok = qrIsLiving
    && destLeaveOk
    && parseOk
    && overrideOk
    && timeline.sawAmber
    && timeline.sawRed
    && timeline.amberLampOn
    && timeline.redLampOn
    && timeline.lowered
    && timeline.naturalPace
    && timeline.longerThanTeaser
    && timeline.amberHeldS >= 1.2
    && (snapEnd?.longerThanTeaser === true)
    && (snapEnd?.showtimeBudget || 0) > (snapEnd?.showtimeTeaserS || 3.6)
    && timeline.hudHiddenWhilePlaying
    && settleOk
    && report.hud.leftHidden
    && report.smoke.match
    && !errors.length;
  process.exit(ok ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
