/**
 * Snap smoke for ?v=motion2 — not phone GATE, not READY.
 * Proves left hero-lock + auto showtime → flatten ≥500ms → DEST,
 * and that living10 + motion1 product strings stay unchanged.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "preview-motion");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
};

function serve() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      let file = url.pathname === "/" ? "/index.html" : url.pathname;
      const path = resolve(ROOT, `.${file}`);
      if (!path.startsWith(ROOT)) {
        res.writeHead(403); res.end(); return;
      }
      try {
        const buf = await readFile(path);
        res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
        res.end(buf);
      } catch {
        res.writeHead(404); res.end("missing");
      }
    });
    server.listen(0, "127.0.0.1", () => ok(server));
  });
}

async function main() {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const report = { product: "motion2-smoke", ready: false, living10: {}, motion1: {}, motion2: {} };
  async function waitSnap(page, test, ms = 22000) {
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < ms) {
      last = await page.evaluate(() => window.__iqr?.snap ?? { iqr: !!window.__iqr });
      if (test(last)) return last;
      await page.waitForTimeout(150);
    }
    throw new Error(`snap wait failed: ${JSON.stringify(last)}`);
  }
  try {
    const living = await browser.newPage({ viewport: { width: 390, height: 844 } });
    living.on("pageerror", (e) => console.warn("living10", e.message));
    await living.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await living.goto(`http://127.0.0.1:${port}/?v=living10&showtime=1`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitSnap(living, (s) => s.product === "living10-icqr-door");
    const liveSnap = await living.evaluate(() => window.__iqr.snap);
    await living.screenshot({ path: join(OUT, "smoke-motion2-living10-door.png"), type: "png" });
    await living.close();
    report.living10 = {
      product: liveSnap.product,
      viewMode: liveSnap.viewMode,
      motion1: liveSnap.motion1,
      motion2: liveSnap.motion2,
      fieldMotionOn: liveSnap.fieldMotionOn,
      showtimeDoorS: liveSnap.showtimeDoorS,
      icqrDoor: liveSnap.icqrDoor,
      ok: liveSnap.product === "living10-icqr-door"
        && liveSnap.viewMode === "door"
        && liveSnap.motion1 !== true
        && liveSnap.motion2 !== true
        && liveSnap.fieldMotionOn !== true
        && liveSnap.showtimeDoorS === 2.6,
    };

    const m1 = await browser.newPage({ viewport: { width: 390, height: 844 } });
    m1.on("pageerror", (e) => console.warn("motion1", e.message));
    await m1.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await m1.goto(`http://127.0.0.1:${port}/?v=motion1`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitSnap(m1, (s) => s.motion1 === true && s.viewMode === "door");
    await m1.waitForTimeout(350);
    const m1Idle = await m1.evaluate(() => window.__iqr.snap);
    await m1.close();
    report.motion1 = {
      product: m1Idle.product,
      fieldMotionOn: m1Idle.fieldMotionOn,
      motion2: m1Idle.motion2,
      showtimeDoorS: m1Idle.showtimeDoorS,
      doorBoomFrame: m1Idle.doorBoomFrame,
      ok: m1Idle.product === "motion1-icqr-door"
        && m1Idle.fieldMotionOn === true
        && m1Idle.motion2 !== true,
    };

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", (e) => console.warn("motion2", e.message));
    await page.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await page.goto(`http://127.0.0.1:${port}/?v=motion2`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitSnap(page, (s) => s.motion2 === true && s.viewMode === "motion2");
    await page.waitForTimeout(280);
    const idle = await page.evaluate(() => window.__iqr.snap);
    await page.screenshot({ path: join(OUT, "smoke-motion2-hero.png"), type: "png" });

    await waitSnap(page, (s) => s.showtimePhase === "playing" || s.showtimePhase === "settled" || s.magicPhase === "hold", 8000);
    const playing = await page.evaluate(() => window.__iqr.snap);

    await waitSnap(page, (s) => s.magicPhase === "hold" && s.scanOpen === true, 12000);
    await page.waitForTimeout(520);
    const hold = await page.evaluate(() => window.__iqr.snap);
    await page.screenshot({ path: join(OUT, "smoke-motion2-flatten.png"), type: "png" });

    await waitSnap(page, (s) => s.destLeft === true, 4000);
    const left = await page.evaluate(() => ({ snap: window.__iqr.snap, left: window.__left }));

    const m1Boom = report.motion1.doorBoomFrame;
    const m2Boom = idle.motion2BoomFrame;
    const m1BoomSpan = m1Boom ? (m1Boom.widthFrac || 0) + (m1Boom.heightFrac || 0) : 0;
    const m2BoomSpan = m2Boom ? (m2Boom.widthFrac || 0) + (m2Boom.heightFrac || 0) : 0;

    report.motion2 = {
      idleProduct: idle.product,
      viewMode: idle.viewMode,
      cameraIsPerspective: idle.cameraIsPerspective,
      motion2FramedLeft: idle.motion2FramedLeft,
      motion2BoomInFrame: idle.motion2BoomInFrame,
      motion2HeroLeft: idle.motion2HeroLeft,
      showtimeDoorS: idle.showtimeDoorS,
      fieldMotionOn: idle.fieldMotionOn,
      plantedYaw: idle.plantedYaw,
      autoStarted: playing.showtimePhase === "playing" || playing.showtimePhase === "settled" || playing.magicPhase === "hold",
      holdPhase: hold.magicPhase,
      modulesStable: hold.modulesStable,
      magicHoldMs: hold.magicHoldMs,
      scanOpen: hold.scanOpen,
      destLeft: left.snap.destLeft,
      destLeaveReason: left.snap.destLeaveReason,
      destLeaveUrl: left.snap.destLeaveUrl || left.left?.dest,
      boomSpanVsMotion1: { m1BoomSpan, m2BoomSpan, moreBoom: m2BoomSpan >= m1BoomSpan },
      ok: idle.product === "motion2-hero-lock"
        && idle.viewMode === "motion2"
        && idle.cameraIsPerspective === true
        && idle.motion1 !== true
        && idle.fieldMotionOn !== true
        && idle.showtimeDoorS === 0.35
        && hold.magicPhase === "hold"
        && hold.modulesStable === true
        && hold.magicHoldMs >= 500
        && hold.scanOpen === true
        && left.snap.destLeft === true
        && (left.snap.destLeaveReason === "motion2-flatten-hold")
        && String(left.snap.destLeaveUrl || left.left?.dest || "").includes("portaboom-pb4000-series"),
    };
    report.ok = report.living10.ok && report.motion1.ok && report.motion2.ok;
    await mkdir(OUT, { recursive: true });
    await writeFile(join(OUT, "SMOKE_SNAP_MOTION2.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
