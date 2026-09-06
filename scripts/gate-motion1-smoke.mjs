/**
 * Snap smoke for ?v=motion1 — not phone GATE, not READY.
 * Proves first-paint motion flags + flatten hold ≥500ms + living10 product string.
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
  const browser = await chromium.launch({ args: ["--use-gl=angle"] });
  const report = { product: "motion1-smoke", ready: false, living10: {}, motion1: {} };
  try {
    const living = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await living.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await living.goto(`http://127.0.0.1:${port}/?v=living10&showtime=1`, { waitUntil: "networkidle" });
    await living.waitForFunction(() => window.__iqr?.snap?.viewMode === "door", { timeout: 25000 });
    const liveSnap = await living.evaluate(() => window.__iqr.snap);
    report.living10 = {
      product: liveSnap.product,
      viewMode: liveSnap.viewMode,
      motion1: liveSnap.motion1,
      fieldMotionOn: liveSnap.fieldMotionOn,
      showtimeDoorS: liveSnap.showtimeDoorS,
      icqrDoor: liveSnap.icqrDoor,
      ok: liveSnap.product === "living10-icqr-door"
        && liveSnap.viewMode === "door"
        && liveSnap.motion1 !== true
        && liveSnap.fieldMotionOn !== true
        && liveSnap.showtimeDoorS === 2.6,
    };

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await page.goto(`http://127.0.0.1:${port}/?v=motion1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__iqr?.snap?.motion1 === true && window.__iqr?.snap?.viewMode === "door", { timeout: 25000 });
    await page.waitForTimeout(400);
    const idle = await page.evaluate(() => window.__iqr.snap);
    await page.evaluate(() => window.__iqr.beginMagicHold());
    await page.waitForTimeout(560);
    const hold = await page.evaluate(() => window.__iqr.snap);
    report.motion1 = {
      idleProduct: idle.product,
      fieldMotionOn: idle.fieldMotionOn,
      fieldMotionAmpCell: idle.fieldMotionAmpCell,
      holdPhase: hold.magicPhase,
      modulesStable: hold.modulesStable,
      magicHoldMs: hold.magicHoldMs,
      scanOpen: hold.scanOpen,
      payload: hold.scanHoldPayload,
      ok: idle.product === "motion1-icqr-door"
        && idle.fieldMotionOn === true
        && hold.magicPhase === "hold"
        && hold.modulesStable === true
        && hold.magicHoldMs >= 500
        && hold.scanOpen === true,
    };
    report.ok = report.living10.ok && report.motion1.ok;
    await mkdir(OUT, { recursive: true });
    await writeFile(join(OUT, "SMOKE_SNAP.json"), JSON.stringify(report, null, 2));
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
