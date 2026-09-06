/**
 * GATE living11 showtime — living10 dense 3D ICQR door + twin-tidy5 REAL.
 * STOP Ø400 (signImpliedM≈0.40, stopOverDoor≈0.347), boom 4 m class,
 * cancel-to-down STOP readable for oncoming traffic, all-orange minis,
 * living-scene send PNG (not paintClean / not paintLivingMatrix).
 * Reject living8/9 flatten. Timing unchanged: 0.5+1+0.5+boom then DEST.
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

function isCabinetOrange(r, g, b) {
  return r > 185 && g > 85 && g < 225 && b < 185 && r > g + 12 && r > b + 18;
}

/** Largest 4-connected orange blob — the cabinet, not scattered QR towers. */
function largestOrangeBlob(data, W, H) {
  const step = 2;
  const gw = Math.ceil(W / step);
  const gh = Math.ceil(H / step);
  const seen = new Uint8Array(gw * gh);
  const mark = (x, y) => {
    const gx = (x / step) | 0;
    const gy = (y / step) | 0;
    seen[gy * gw + gx] = 1;
  };
  const visited = (x, y) => seen[((y / step) | 0) * gw + ((x / step) | 0)];
  let best = { pixels: 0, minX: 0, minY: 0, maxX: 0, maxY: 0, widthFrac: 0, heightFrac: 0, areaFrac: 0 };
  const stack = [];
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (visited(x, y)) continue;
      const i = (y * W + x) * 4;
      if (!isCabinetOrange(data[i], data[i + 1], data[i + 2])) {
        mark(x, y);
        continue;
      }
      stack.length = 0;
      stack.push(x, y);
      mark(x, y);
      let pixels = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      while (stack.length) {
        const cy = stack.pop();
        const cx = stack.pop();
        pixels += step * step;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        const nbs = [cx - step, cy, cx + step, cy, cx, cy - step, cx, cy + step];
        for (let k = 0; k < nbs.length; k += 2) {
          const nx = nbs[k];
          const ny = nbs[k + 1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || visited(nx, ny)) continue;
          const ni = (ny * W + nx) * 4;
          if (isCabinetOrange(data[ni], data[ni + 1], data[ni + 2])) {
            mark(nx, ny);
            stack.push(nx, ny);
          } else {
            mark(nx, ny);
          }
        }
      }
      if (pixels > best.pixels) {
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        best = {
          pixels,
          minX,
          minY,
          maxX,
          maxY,
          widthFrac: +(bw / W).toFixed(4),
          heightFrac: +(bh / H).toFixed(4),
          areaFrac: +((bw * bh) / (W * H)).toFixed(4),
        };
      }
    }
  }
  return best;
}

function doorVision(buf) {
  const png = PNG.sync.read(buf);
  const { width: W, height: H, data } = png;
  const n = W * H;
  let cream = 0;
  let studioBlack = 0;
  let dark = 0;
  let orange = 0;
  let chroma = 0;
  let navy = 0;
  let orangeMinX = W;
  let orangeMinY = H;
  let orangeMaxX = 0;
  let orangeMaxY = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (max - min > 28) chroma += 1;
    if (r > 200 && g > 185 && b > 165 && lum > 190) cream += 1;
    const x = (i / 4) % W;
    const y = ((i / 4) / W) | 0;
    const edge = x < W * 0.08 || x > W * 0.92 || y < H * 0.08 || y > H * 0.92;
    if (edge && lum < 22 && max < 30) studioBlack += 1;
    if (lum < 80) dark += 1;
    if (r > 185 && g > 85 && g < 225 && b < 185 && r > g + 12 && r > b + 18) {
      orange += 1;
      if (x < orangeMinX) orangeMinX = x;
      if (x > orangeMaxX) orangeMaxX = x;
      if (y < orangeMinY) orangeMinY = y;
      if (y > orangeMaxY) orangeMaxY = y;
    }
    if (b > r + 20 && b > g && r < 90 && b > 70 && lum < 90) navy += 1;
  }
  const creamRatio = cream / n;
  const studioRatio = studioBlack / n;
  const darkRatio = dark / n;
  const orangeRatio = orange / n;
  const chromaRatio = chroma / n;
  const orangeBBoxW = orangeMaxX > orangeMinX ? (orangeMaxX - orangeMinX + 1) : 0;
  const orangeBBoxH = orangeMaxY > orangeMinY ? (orangeMaxY - orangeMinY + 1) : 0;
  const orangeBBoxFrac = (orangeBBoxW * orangeBBoxH) / n;
  // Field modules are also powder-orange — use the largest blob, not the union bbox.
  const blob = largestOrangeBlob(data, W, H);
  const orangeTopFrac = orangeMinY < Infinity ? orangeMinY / H : 1;
  const orangeHeightSpan = orangeBBoxH / H;
  const looksLikeQrField = (
      (darkRatio > 0.04 && darkRatio < 0.72)
      || (orangeRatio > 0.08 && darkRatio > 0.015 && darkRatio < 0.72)
    )
    && chromaRatio > 0.06
    && orangeHeightSpan > 0.32;
  const portaboomInField = orange > 6000 && blob.pixels > 3000;
  // living11: data modules are all orange, so the largest blob is the field.
  // Hero size is proven by doorCabinetFrame in snap, not this blob.
  const portaboomLargeEnough = blob.heightFrac >= 0.18
    && blob.areaFrac >= 0.04
    && blob.pixels > 8000;
  const cabinetNotDominating = blob.heightFrac < 0.88;
  const looksLikeWebsiteTwin = studioRatio > 0.18 && creamRatio < 0.10;
  const looksLikeFlatBWQR = orangeRatio < 0.008 && chromaRatio < 0.06;
  const looksLikeFlattenedPoster = creamRatio > 0.42 && orangeHeightSpan < 0.38 && orangeTopFrac > 0.28;
  return {
    width: W,
    height: H,
    cream,
    studioBlack,
    dark,
    orange,
    navy,
    creamRatio: +creamRatio.toFixed(4),
    studioRatio: +studioRatio.toFixed(4),
    darkRatio: +darkRatio.toFixed(4),
    orangeRatio: +orangeRatio.toFixed(4),
    chromaRatio: +chromaRatio.toFixed(4),
    orangeBBoxW,
    orangeBBoxH,
    orangeBBoxFrac: +orangeBBoxFrac.toFixed(4),
    orangeHeightFrac: +(orangeBBoxH / H).toFixed(4),
    orangeBlob: blob,
    looksLikeQrField,
    portaboomInField,
    portaboomLargeEnough,
    cabinetNotDominating,
    looksLikeWebsiteTwin,
    looksLikeFlatBWQR,
    looksLikeFlattenedPoster,
    orangeTopFrac: +orangeTopFrac.toFixed(4),
    orangeHeightSpan: +orangeHeightSpan.toFixed(4),
    looksLikeNormalQR: looksLikeQrField && looksLikeFlatBWQR,
  };
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
  const playing = samples.filter((s) => s.showtimePhase === "playing");
  const sawGreen = playing.some((s) => s.signalAspect === "green");
  const sawAmber = playing.some((s) => s.signalAspect === "amber");
  const sawRed = samples.some((s) => s.signalAspect === "red");
  const greenLampOn = playing.some((s) =>
    s.signalAspect === "green"
    && (s.lampIntensity?.green || 0) > 4
    && (s.lampIntensity?.green || 0) > (s.lampIntensity?.amber || 0)
  );
  const amberLampOn = playing.some((s) =>
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
  const hudHiddenWhilePlaying = playing
    .every((s) => s.showtimeHudHidden === true && s.liveDockHidden === true);
  const stayedOnDoor = samples.every((s) => s.viewMode === "door");
  const noStudio = samples.every((s) => s.studioVisible === false);
  const duration = playing.length
    ? (playing[playing.length - 1].t - playing[0].t)
    : 0;
  const firstAmber = playing.find((s) => s.signalAspect === "amber");
  const firstRed = playing.find((s) => s.signalAspect === "red");
  const firstLower = playing.find((s) => s.signalAspect === "red" && (s.boomPct ?? 100) < 92);
  const lastPlay = [...playing].reverse().find(Boolean);
  const settled = [...samples].reverse().find((s) => s.showtimePhase === "settled");
  const greenHeldS = firstAmber?.showtimeElapsed ?? 0;
  const amberHeldS = firstRed && firstAmber
    ? firstRed.showtimeElapsed - firstAmber.showtimeElapsed
    : 0;
  const redHoldS = firstLower && firstRed
    ? firstLower.showtimeElapsed - firstRed.showtimeElapsed
    : 0;
  const elapsedAtEnd = settled?.showtimeElapsed
    ?? lastPlay?.showtimeElapsed
    ?? samples[samples.length - 1]?.showtimeElapsed
    ?? 0;
  const lowerS = firstLower ? elapsedAtEnd - firstLower.showtimeElapsed : 0;
  const ghosts = samples.map((s) => s.ghostBoomCount ?? 0);
  const ghostMax = ghosts.length ? Math.max(...ghosts) : 99;
  const singleBoomDuringLower = playing
    .filter((s) => (s.boomPct ?? 100) < 85)
    .every((s) => (s.ghostBoomCount ?? 0) === 0 && s.singleBoom !== false);
  const shortBeat = (v) => v >= 0.32 && v <= 0.82;
  const amberBeat = (v) => v >= 0.75 && v <= 1.35;
  return {
    aspects,
    phases,
    boomStart,
    boomEnd,
    boomMin,
    boomMax,
    sawGreen,
    sawAmber,
    sawRed,
    greenLampOn,
    amberLampOn,
    redLampOn,
    lowered,
    hudHiddenWhilePlaying,
    stayedOnDoor,
    noStudio,
    playDurationS: +duration.toFixed(3),
    greenHeldS: +greenHeldS.toFixed(3),
    amberHeldS: +amberHeldS.toFixed(3),
    redHoldS: +redHoldS.toFixed(3),
    lowerS: +lowerS.toFixed(3),
    elapsedAtEnd: +elapsedAtEnd.toFixed(3),
    longerThanTeaser: elapsedAtEnd > 4.2,
    naturalPace: sawGreen && sawAmber && sawRed && lowered
      && elapsedAtEnd >= 2.4 && elapsedAtEnd <= 4.2,
    timingBeat: "0.5+1+0.5+boom",
    ghostMax,
    singleBoomDuringLower,
    sampleCount: samples.length,
  };
}

async function run() {
  await mkdir(OUT, { recursive: true });
  if (existsSync(ART) || existsSync(resolve(ART, ".."))) await mkdir(ART, { recursive: true });

  const qrProof = await makeShowtimeQr();

  const port = 8768;
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
  await page.goto(`http://127.0.0.1:${port}/?v=living11&showtime=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });
  await page.waitForFunction(() => window.__iqr?.snap?.usingGlb === true, { timeout: 25000 }).catch(() => {});
  await page.waitForFunction(() => (
    window.__iqr?.snap?.usingGlb === true
    && window.__iqr?.snap?.viewMode === "door"
    && window.__iqr?.snap?.miniHasTrafficLight === false
    && (window.__iqr?.snap?.miniCabinetCount ?? 0) > 80
    && window.__iqr?.snap?.signImpliedM != null
  ), { timeout: 25000 });

  const doorSnap = await page.evaluate(() => window.__iqr?.snap);
  const doorChrome = await page.evaluate(() => {
    const hud = document.getElementById("hud");
    const badge = document.getElementById("modeBadge");
    const brand = document.querySelector("#hud .brand");
    const dock = document.getElementById("liveDock");
    const cs = (el) => (el ? getComputedStyle(el).display : "missing");
    return {
      bodyShowtime: document.body.classList.contains("showtime"),
      hudDisplay: cs(hud),
      badgeDisplay: cs(badge),
      brandDisplay: cs(brand),
      dockHidden: dock?.hidden === true || dock?.offsetParent === null,
      theme: document.querySelector('meta[name="theme-color"]')?.getAttribute("content") || null,
    };
  });
  const doorDataUrl = await page.evaluate(() => window.__iqr.captureDoor());
  await page.evaluate(() => window.__iqr.frameMiniCloseup());
  const miniDataUrl = await page.evaluate(() => document.getElementById("stage").toDataURL("image/png"));
  await writeFile(join(OUT, "showtime-mini-close.png"), dataUrlToBuf(miniDataUrl));
  await page.evaluate(() => window.__iqr.captureDoor());
  const started = await page.evaluate(() => window.__iqr.startShowtime());
  if (!started) {
    throw new Error(`startShowtime failed (phase=${(await page.evaluate(() => window.__iqr?.snap?.showtimePhase))})`);
  }
  const doorShot = dataUrlToBuf(doorDataUrl);
  await writeFile(join(OUT, "showtime-door.png"), doorShot);
  await writeFile(join(OUT, "showtime-door-webgl.png"), doorShot);
  const vision = doorVision(doorShot);
  const firstPaintPhaseOk = doorSnap?.showtimePhase === "door"
    || (doorSnap?.showtimePhase === "playing"
      && doorSnap?.signalAspect === "green"
      && (doorSnap?.showtimeElapsed ?? 99) < 0.85);
  const firstPaintOk = firstPaintPhaseOk
    && doorSnap?.viewMode === "door"
    && doorSnap?.twinInQrField === true
    && doorSnap?.studioVisible === false
    && doorSnap?.apronVisible === false
    && doorSnap?.websiteChrome === false
    && doorSnap?.cameraIsOrtho === true
    && doorSnap?.product === "living11-icqr-door"
    && doorSnap?.miniHasTrafficLight === false
    && doorSnap?.miniCabinetSource === "cuboid-field"
    && doorSnap?.miniFieldKind === "dense-cuboid-qr"
    && /data-orange-portaboom/.test(doorSnap?.modulePalette || "")
    && (doorSnap?.stripeModules ?? 99) === 0
    && (doorSnap?.miniCabinetCount ?? 0) > 80
    && doorChrome.bodyShowtime === true
    && doorChrome.hudDisplay === "none"
    && vision.looksLikeQrField === true
    && vision.portaboomInField === true
    && vision.portaboomLargeEnough === true
    && vision.cabinetNotDominating === true
    && vision.looksLikeFlattenedPoster === false
    && (doorSnap?.doorCabinetFrame?.heightFrac ?? doorSnap?.doorHeroFrame?.heightFrac ?? 0) >= 0.09
    && (doorSnap?.doorCabinetFrame?.heightFrac ?? 1) < 0.55
    && vision.orangeBlob.heightFrac >= 0.09
    && vision.orangeBlob.heightFrac < 0.88
    && doorSnap?.doorBoomHidden === false
    && doorSnap?.doorBoomVisible === true
    && doorSnap?.doorSignalInFrame === true
    && doorSnap?.doorBoomInFrame === true
    && (doorSnap?.doorSignalFrame?.heightFrac ?? 0) >= 0.05
    && (doorSnap?.doorBoomFrame?.heightFrac ?? 0) >= 0.10
    && doorSnap?.doorCamElevatedField === true
    && (doorSnap?.doorCamElevationDeg ?? 0) <= -12
    && (doorSnap?.doorCamElevationDeg ?? -90) >= -38
    && doorSnap?.singleBoom === true
    && (doorSnap?.ghostBoomCount ?? 99) === 0
    && doorSnap?.miniHasTrafficLight === false
    && (doorSnap?.miniTrafficLights ?? 99) === 0
    && doorSnap?.backLogoVisible === false
    && vision.looksLikeWebsiteTwin === false
    && vision.looksLikeFlatBWQR === false;

  page.screenshot({ path: join(OUT, "showtime-door-webgl.png"), type: "png" }).catch(() => {});
  await page.waitForFunction(() => window.__iqr?.snap?.showtimePhase === "playing", { timeout: 8000 });

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const snap = await page.evaluate(() => window.__iqr?.snap);
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
      twinInQrField: snap?.twinInQrField ?? null,
      studioVisible: snap?.studioVisible ?? null,
      showtimeHudHidden: snap?.showtimeHudHidden ?? null,
      liveDockHidden: snap?.liveDockHidden ?? null,
      cameraIsPerspective: snap?.cameraIsPerspective ?? null,
      cameraIsOrtho: snap?.cameraIsOrtho ?? null,
      destLeft: snap?.destLeft ?? null,
      destLeaveUrl: snap?.destLeaveUrl ?? null,
      destLeaveReason: snap?.destLeaveReason ?? null,
      leaveDest: snap?.leaveDest ?? null,
      leaveDestSource: snap?.leaveDestSource ?? null,
      ghostBoomCount: snap?.ghostBoomCount ?? null,
      singleBoom: snap?.singleBoom ?? null,
      signalAspectSnap: snap?.signalAspect ?? null,
    };
    samples.push(row);
    if (row.showtimePhase === "settled" && row.usingGlb && row.boomPct <= 5) break;
    await page.waitForTimeout(40);
  }

  await page.waitForFunction(() => window.__iqr?.snap?.showtimePhase === "settled", { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => window.__iqr?.snap?.destLeft === true, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(80);
  const snapEnd = await page.evaluate(() => window.__iqr?.snap);
  const destLeaves = await page.evaluate(() => window.__iqrDestLeaves || []);
  const stopDownUrl = await page.evaluate(() => window.__iqr.captureStopDown());
  if (stopDownUrl) {
    await writeFile(join(OUT, "showtime-stop-down.png"), dataUrlToBuf(stopDownUrl));
  }
  const stopDownSnap = await page.evaluate(() => window.__iqr?.snap);
  await page.evaluate(() => window.__iqr.captureDoor());
  await page.screenshot({ path: join(OUT, "showtime-down.png"), type: "png" });
  await page.screenshot({ path: join(OUT, "showtime-settled.png"), type: "png" });

  const dockAfter = await page.evaluate(() => {
    const dock = document.getElementById("liveDock");
    const hud = document.getElementById("hud");
    return {
      hidden: dock?.hidden === true || dock?.offsetParent === null,
      hudDisplay: hud ? getComputedStyle(hud).display : "missing",
      bodyShowtime: document.body.classList.contains("showtime"),
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

  await browser.close();

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

  const browser2 = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist"],
  });
  const overridePage = await browser2.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  overridePage.on("pageerror", (e) => errors.push(String(e)));
  await overridePage.addInitScript(destHook);
  const overrideQuery = `dest=${encodeURIComponent(GATE_TEST_DEST)}`;
  await overridePage.goto(
    `http://127.0.0.1:${port}/?v=living11&showtime=1&${overrideQuery}`,
    { waitUntil: "domcontentloaded" },
  );
  await overridePage.waitForFunction(() => document.getElementById("stage")?.dataset?.iqrReady === "1", { timeout: 25000 });
  await overridePage.waitForFunction(() => typeof window.__iqr?.settleShowtime === "function", { timeout: 15000 });
  const overrideCfg = await overridePage.evaluate(() => ({
    leaveDest: window.__iqr.snap.leaveDest,
    leaveDestSource: window.__iqr.snap.leaveDestSource,
    leaveDestDefault: window.__iqr.snap.leaveDestDefault,
    viewMode: window.__iqr.snap.viewMode,
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

  const scanPage = await browser2.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  scanPage.on("pageerror", (e) => errors.push(String(e)));
  await scanPage.goto(`http://127.0.0.1:${port}/?v=living11`, { waitUntil: "domcontentloaded" });
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
    && snapEnd?.viewMode === "door"
    && settleElapsed >= 2.4
    && settleElapsed <= 4.2;
  const stayedOnLiving = !navigations.some((u) => /trafficaccess\.com\.au/.test(u));
  const scaleProof = {
    signImpliedM: doorSnap?.signImpliedM ?? null,
    stopOverDoor: doorSnap?.stopOverDoor ?? null,
    impliedBoomM: doorSnap?.impliedBoomM ?? null,
    stripePeriodM: doorSnap?.stripePeriodM ?? null,
    stripeRedDuty: doorSnap?.stripeRedDuty ?? null,
    signAlong: doorSnap?.signAlong ?? null,
    signCancelMode: doorSnap?.signCancelMode ?? null,
    metresPerWorld: doorSnap?.metresPerWorld ?? null,
    doorHeightWorld: doorSnap?.doorHeightWorld ?? null,
    signDiameterWorld: doorSnap?.signDiameterWorld ?? null,
    signWorldDiameter: doorSnap?.signWorldDiameter ?? null,
    boomLengthWorld: doorSnap?.boomLengthWorld ?? null,
    derived: doorSnap?.signDerived ?? null,
  };
  const scaleOk = scaleProof.signImpliedM != null
    && Math.abs(scaleProof.signImpliedM - 0.40) <= 0.012
    && scaleProof.stopOverDoor != null
    && Math.abs(scaleProof.stopOverDoor - 0.347) <= 0.015
    && scaleProof.impliedBoomM != null
    && scaleProof.impliedBoomM >= 4.0
    && scaleProof.impliedBoomM <= 4.2
    && scaleProof.stripePeriodM === 0.34
    && scaleProof.stripeRedDuty === 0.48
    && Math.abs((scaleProof.signAlong ?? 0) - 0.72) < 0.001
    && scaleProof.signCancelMode === "cancel-to-down";
  const stopDownOk = stopDownSnap?.signCancelMode === "cancel-to-down"
    && stopDownSnap?.stopReadableForTraffic === true
    && (stopDownSnap?.boomPct ?? 99) <= 8
    && stopDownSnap?.signWorldRotZ != null
    && Math.abs(stopDownSnap.signWorldRotZ) < 0.28
    && !!stopDownUrl;
  const qrIsLiving = qrProof.clean.match === true
    && qrProof.clean.decoded === LIVING_SHOWTIME_URL
    && qrProof.clean.decoded !== DEST
    && /v=living11/.test(qrProof.clean.decoded || "")
    && qrProof.livingScene?.match === true
    && qrProof.livingScene?.look?.looksLivingField === true
    && qrProof.livingScene?.look?.looksPlainBW === false;

  const report = {
    dest: DEST,
    destDefault: SHOWTIME_DEST_DEFAULT,
    destConfigurable: true,
    livingUrl: LIVING_SHOWTIME_URL,
    errors,
    firstPaint: {
      snap: {
        viewMode: doorSnap?.viewMode ?? null,
        showtimePhase: doorSnap?.showtimePhase ?? null,
        product: doorSnap?.product ?? null,
        icqrFirstPaint: doorSnap?.icqrFirstPaint ?? null,
        twinInQrField: doorSnap?.twinInQrField ?? null,
        studioVisible: doorSnap?.studioVisible ?? null,
        apronVisible: doorSnap?.apronVisible ?? null,
        websiteChrome: doorSnap?.websiteChrome ?? null,
        cameraIsOrtho: doorSnap?.cameraIsOrtho ?? null,
        usingGlb: doorSnap?.usingGlb ?? null,
        doorOrthoWorldW: doorSnap?.doorOrthoWorldW ?? null,
        doorOrthoWorldH: doorSnap?.doorOrthoWorldH ?? null,
        doorHeroFrame: doorSnap?.doorHeroFrame ?? null,
        doorCabinetFrame: doorSnap?.doorCabinetFrame ?? null,
        doorSignalFrame: doorSnap?.doorSignalFrame ?? null,
        doorBoomFrame: doorSnap?.doorBoomFrame ?? null,
        doorSubjectFrame: doorSnap?.doorSubjectFrame ?? null,
        doorBoomHidden: doorSnap?.doorBoomHidden ?? null,
        doorBoomVisible: doorSnap?.doorBoomVisible ?? null,
        doorSignalInFrame: doorSnap?.doorSignalInFrame ?? null,
        doorBoomInFrame: doorSnap?.doorBoomInFrame ?? null,
        doorCamElevationDeg: doorSnap?.doorCamElevationDeg ?? null,
        doorCamElevatedField: doorSnap?.doorCamElevatedField ?? null,
        doorCamFrontFacing: doorSnap?.doorCamFrontFacing ?? null,
        singleBoom: doorSnap?.singleBoom ?? null,
        ghostBoomCount: doorSnap?.ghostBoomCount ?? null,
        stripeModules: doorSnap?.stripeModules ?? null,
        miniCabinetCount: doorSnap?.miniCabinetCount ?? null,
        orangeModules: doorSnap?.orangeModules ?? null,
        finderModules: doorSnap?.finderModules ?? null,
        signImpliedM: doorSnap?.signImpliedM ?? null,
        stopOverDoor: doorSnap?.stopOverDoor ?? null,
        impliedBoomM: doorSnap?.impliedBoomM ?? null,
        signCancelMode: doorSnap?.signCancelMode ?? null,
        miniHasTrafficLight: doorSnap?.miniHasTrafficLight ?? null,
        miniCabinetSource: doorSnap?.miniCabinetSource ?? null,
        miniClonedFromTwin: doorSnap?.miniClonedFromTwin ?? null,
        miniFieldKind: doorSnap?.miniFieldKind ?? null,
        modulePalette: doorSnap?.modulePalette ?? null,
        backLogoVisible: doorSnap?.backLogoVisible ?? null,
        backLogoInFrame: doorSnap?.backLogoInFrame ?? null,
      },
      chrome: doorChrome,
      vision,
      ok: firstPaintOk,
    },
    parseProof,
    parseOk,
    destOverride: {
      dest: GATE_TEST_DEST,
      config: overrideCfg,
      leave: overrideLeave || null,
      ok: overrideOk,
    },
    scaleProof,
    scaleOk,
    stopDown: {
      boomPct: stopDownSnap?.boomPct ?? null,
      signWorldRotZ: stopDownSnap?.signWorldRotZ ?? null,
      signCancelMode: stopDownSnap?.signCancelMode ?? null,
      stopReadableForTraffic: stopDownSnap?.stopReadableForTraffic ?? null,
      signImpliedM: stopDownSnap?.signImpliedM ?? null,
      stopOverDoor: stopDownSnap?.stopOverDoor ?? null,
      captured: !!stopDownUrl,
      ok: stopDownOk,
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
      leftHidden: dockAfter.bodyShowtime === true && dockAfter.hudDisplay === "none",
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
      twinInQrField: snapEnd?.twinInQrField,
      product: snapEnd?.product,
      showtimeBudget: snapEnd?.showtimeBudget,
      showtimeTeaserS: snapEnd?.showtimeTeaserS,
      showtimeLeaveS: snapEnd?.showtimeLeaveS,
      showtimeDoorS: snapEnd?.showtimeDoorS,
      longerThanTeaser: snapEnd?.longerThanTeaser,
    },
  };

  await writeFile(join(OUT, "gate-living4-showtime.json"), JSON.stringify(report, null, 2));
  try {
    await mkdir(ART, { recursive: true });
    for (const name of [
      "showtime-door.png",
      "showtime-door-webgl.png",
      "showtime-mini-close.png",
      "showtime-green.png",
      "showtime-amber.png",
      "showtime-amber-webgl.png",
      "showtime-lowering.png",
      "showtime-down.png",
      "showtime-settled.png",
      "showtime-scan.png",
      "showtime-scan-webgl.png",
      "showtime-stop-down.png",
      "gate-living4-showtime.json",
      "fabian-showtime-qr.png",
    ]) {
      const src = join(OUT, name);
      if (existsSync(src)) await copyFile(src, join(ART, name));
    }
  } catch (err) {
    console.warn("artifact copy skipped", err.message);
  }

  console.log(JSON.stringify(report, null, 2));
  await browser2.close();
  server.close();

  const ok = firstPaintOk
    && qrIsLiving
    && scaleOk
    && stopDownOk
    && destLeaveOk
    && parseOk
    && overrideOk
    && timeline.sawGreen
    && timeline.sawAmber
    && timeline.sawRed
    && timeline.greenLampOn
    && timeline.amberLampOn
    && timeline.redLampOn
    && timeline.lowered
    && timeline.naturalPace
    && timeline.singleBoomDuringLower
    && timeline.ghostMax === 0
    && timeline.stayedOnDoor
    && timeline.noStudio
    && snapEnd?.timingBeat === "0.5+1+0.5+boom"
    && (snapEnd?.showtimeGreenS ?? 0) === 0.5
    && (snapEnd?.showtimeAmberS ?? 0) === 1
    && (snapEnd?.showtimeRedHoldS ?? 0) === 0.5
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
