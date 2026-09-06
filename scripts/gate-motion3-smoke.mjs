/**
 * P113 receipt smoke for ?v=motion3 — not phone GATE, not READY.
 * Proof: field → cycle in field → flatten in place → DEST.
 * living10 + motion1 held. motion2 REJECTED / not sendable.
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
  const report = { product: "motion3-smoke", ready: false, living10: {}, motion1: {}, motion3: {} };
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
    await living.screenshot({ path: join(OUT, "smoke-motion3-living10-door.png"), type: "png" });
    await living.close();
    report.living10 = {
      product: liveSnap.product,
      viewMode: liveSnap.viewMode,
      motion1: liveSnap.motion1,
      motion2: liveSnap.motion2,
      motion3: liveSnap.motion3,
      fieldMotionOn: liveSnap.fieldMotionOn,
      showtimeDoorS: liveSnap.showtimeDoorS,
      icqrDoor: liveSnap.icqrDoor,
      ok: liveSnap.product === "living10-icqr-door"
        && liveSnap.viewMode === "door"
        && liveSnap.motion1 !== true
        && liveSnap.motion2 !== true
        && liveSnap.motion3 !== true
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
    await m1.screenshot({ path: join(OUT, "smoke-motion3-motion1-idle.png"), type: "png" });
    await m1.close();
    report.motion1 = {
      product: m1Idle.product,
      fieldMotionOn: m1Idle.fieldMotionOn,
      motion2: m1Idle.motion2,
      motion3: m1Idle.motion3,
      showtimeDoorS: m1Idle.showtimeDoorS,
      ok: m1Idle.product === "motion1-icqr-door"
        && m1Idle.fieldMotionOn === true
        && m1Idle.motion2 !== true
        && m1Idle.motion3 !== true
        && m1Idle.showtimeDoorS === 6,
    };

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", (e) => console.warn("motion3", e.message));
    await page.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await page.goto(`http://127.0.0.1:${port}/?v=motion3`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitSnap(page, (s) => s.motion3 === true && s.viewMode === "door" && s.product === "motion3-icqr-door");
    await page.waitForTimeout(400);
    const idle = await page.evaluate(() => window.__iqr.snap);
    await page.screenshot({ path: join(OUT, "smoke-motion3-field.png"), type: "png" });

    await waitSnap(page, (s) => s.showtimePhase === "playing", 8000);
    await waitSnap(page, (s) => s.showtimePhase === "playing" && s.boomPct != null && s.boomPct < 80 && s.boomPct > 8, 8000);
    const playing = await page.evaluate(() => window.__iqr.snap);
    await page.screenshot({ path: join(OUT, "smoke-motion3-cycle.png"), type: "png" });

    await waitSnap(page, (s) => s.magicPhase === "hold" && s.scanOpen === false && s.viewMode === "door", 12000);
    await page.waitForTimeout(520);
    const hold = await page.evaluate(() => window.__iqr.snap);
    await page.screenshot({ path: join(OUT, "smoke-motion3-morph.png"), type: "png" });

    await waitSnap(page, (s) => s.destLeft === true, 4000);
    const left = await page.evaluate(() => ({ snap: window.__iqr.snap, left: window.__left }));

    report.motion3 = {
      idleProduct: idle.product,
      viewMode: idle.viewMode,
      icqrDoor: idle.icqrDoor,
      cameraIsOrtho: idle.cameraIsOrtho,
      studioVisible: idle.studioVisible,
      fieldMotionOn: idle.fieldMotionOn,
      fieldMotionAmpCell: idle.fieldMotionAmpCell,
      showtimeDoorS: idle.showtimeDoorS,
      motion3UnitLeft: idle.motion3UnitLeft,
      motion3HeroMidX: idle.motion3HeroMidX,
      motion1: idle.motion1,
      motion2: idle.motion2,
      cycleInField: playing.viewMode === "door"
        && playing.scanOpen === false
        && playing.twinInQrField === true
        && playing.cutawayScan !== true,
      cycleBoomPct: playing.boomPct,
      holdPhase: hold.magicPhase,
      morphInPlace: hold.morphInPlace,
      cutawayScan: hold.cutawayScan,
      modulesStable: hold.modulesStable,
      magicHoldMs: hold.magicHoldMs,
      scanOpen: hold.scanOpen,
      holdViewMode: hold.viewMode,
      holdBoomVisible: hold.doorBoomVisible,
      destLeft: left.snap.destLeft,
      destLeaveReason: left.snap.destLeaveReason,
      destLeaveUrl: left.snap.destLeaveUrl || left.left?.dest,
      ok: idle.product === "motion3-icqr-door"
        && idle.viewMode === "door"
        && idle.icqrDoor === true
        && idle.cameraIsOrtho === true
        && idle.studioVisible === false
        && idle.fieldMotionOn === true
        && idle.fieldMotionAmpCell === 0.72
        && idle.showtimeDoorS === 2.5
        && idle.motion1 !== true
        && idle.motion2 !== true
        && idle.motion3UnitLeft === true
        && playing.viewMode === "door"
        && playing.scanOpen === false
        && playing.twinInQrField === true
        && hold.magicPhase === "hold"
        && hold.morphInPlace === true
        && hold.cutawayScan !== true
        && hold.scanOpen === false
        && hold.viewMode === "door"
        && hold.modulesStable === true
        && hold.magicHoldMs >= 500
        && left.snap.destLeft === true
        && left.snap.destLeaveReason === "motion3-morph-hold"
        && String(left.snap.destLeaveUrl || left.left?.dest || "").includes("portaboom-pb4000-series"),
    };

    const destPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    destPage.on("pageerror", (e) => console.warn("motion3 dest", e.message));
    await destPage.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    const override = "https://example.com/motion3-dest-override";
    await destPage.goto(`http://127.0.0.1:${port}/?v=motion3&dest=${encodeURIComponent(override)}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await waitSnap(destPage, (s) => s.motion3 === true && s.leaveDest === override);
    const destSnap = await destPage.evaluate(() => window.__iqr.snap);
    await destPage.close();
    report.motion3.destOverride = destSnap.leaveDest;
    report.motion3.destOverrideOk = destSnap.leaveDest === override;
    report.motion3.ok = report.motion3.ok && destSnap.leaveDest === override;

    const fieldOk = idle.product === "motion3-icqr-door"
      && idle.viewMode === "door"
      && idle.fieldMotionOn === true
      && idle.studioVisible === false
      && idle.motion3UnitLeft === true
      && idle.sameField === true
      && idle.blackStudioVoid !== true;
    const cycleOk = playing.viewMode === "door"
      && playing.scanOpen === false
      && playing.twinInQrField === true
      && playing.cutawayScan !== true
      && playing.heroThenDifferentQrScreen !== true;
    const flattenOk = hold.morphInPlace === true
      && hold.scanOpen === false
      && hold.viewMode === "door"
      && hold.cutawayScan !== true
      && hold.heroThenDifferentQrScreen !== true
      && hold.modulesStable === true
      && hold.magicHoldMs >= 500
      && hold.doorBoomVisible === true;
    const destOk = left.snap.destLeft === true
      && left.snap.destLeaveReason === "motion3-morph-hold"
      && String(left.snap.destLeaveUrl || left.left?.dest || "").includes("portaboom-pb4000-series");

    report.receipt = {
      brief: "P113",
      job: "one living Incredible tip, Magic Tree class",
      morph: "same living field flattens in place → hold ≥500ms → DEST",
      flow: "field moves ≤3s → cycle boom/LED still in field → morph in place → DEST",
      twinSot: "https://dist-bice-chi-12.vercel.app/?source=mock&cloud=off",
      query: "?v=motion3",
      motion2: "REJECTED / not sendable",
      ready: false,
      holds: {
        living10: report.living10.ok === true,
        motion1: report.motion1.ok === true,
      },
      proof: {
        field: {
          ok: fieldOk,
          snap: "smoke-motion3-field.png",
          product: idle.product,
          viewMode: idle.viewMode,
          fieldMotionOn: idle.fieldMotionOn,
          unitLeft: idle.motion3UnitLeft,
          midX: idle.motion3HeroMidX,
          studioVisible: idle.studioVisible,
        },
        cycleInField: {
          ok: cycleOk,
          snap: "smoke-motion3-cycle.png",
          viewMode: playing.viewMode,
          scanOpen: playing.scanOpen,
          twinInQrField: playing.twinInQrField,
          boomPct: playing.boomPct,
        },
        flattenInPlace: {
          ok: flattenOk,
          snap: "smoke-motion3-morph.png",
          morphInPlace: hold.morphInPlace,
          scanOpen: hold.scanOpen,
          viewMode: hold.viewMode,
          cutawayScan: hold.cutawayScan,
          modulesStable: hold.modulesStable,
          magicHoldMs: hold.magicHoldMs,
        },
        dest: {
          ok: destOk,
          reason: left.snap.destLeaveReason,
          url: left.snap.destLeaveUrl || left.left?.dest,
        },
      },
      failSetAvoided: [
        "separate-frame QR after showtime",
        "black-studio center",
        "static PNG DONE",
        "unit still centered when left asked",
        "applyScanPose full-screen commodity QR",
        "hero-then-different-QR-screen",
        "black studio void replacing field",
      ],
      ok: fieldOk && cycleOk && flattenOk && destOk
        && report.living10.ok && report.motion1.ok,
    };
    report.ok = report.receipt.ok && report.motion3.ok;
    await mkdir(OUT, { recursive: true });
    await writeFile(join(OUT, "SMOKE_SNAP_MOTION3.json"), JSON.stringify(report, null, 2));
    await writeFile(join(OUT, "RECEIPT_MOTION3.json"), JSON.stringify(report.receipt, null, 2));
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
