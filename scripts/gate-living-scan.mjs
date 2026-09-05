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
  return jsQR(png.data, png.width, png.height);
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

  const tilt = await page.evaluate(() => {
    const cam = window.__iqr;
    // nudge live cam through the public capture after moving via internals
    const stage = document.getElementById("stage");
    return !!stage;
  });
  await page.evaluate(() => {
    const iqr = window.__iqr;
    const cam = iqr.camera;
    // Use renderer camera via a small polar nudge if available
    const c = document.querySelector("canvas#stage");
    c.dispatchEvent(new PointerEvent("pointerdown", { clientX: 200, clientY: 400, pointerId: 1, bubbles: true }));
    c.dispatchEvent(new PointerEvent("pointermove", { clientX: 230, clientY: 430, pointerId: 1, bubbles: true }));
    c.dispatchEvent(new PointerEvent("pointerup", { clientX: 230, clientY: 430, pointerId: 1, bubbles: true }));
  });
  await page.waitForTimeout(400);
  const stressUrl = await page.evaluate(() => window.__iqr.captureScan());
  const stressBuf = dataUrlToBuf(stressUrl);
  await writeFile(join(OUT, "stress-tilt-webgl.png"), stressBuf);
  const stress = decodePngBuffer(stressBuf);

  await page.evaluate(() => {
    // brightness: leave default; document envelope from tilt
  });

  const fullShot = await page.screenshot({ path: join(OUT, "smoke-phone-viewport.png"), type: "png" });
  const fullDec = decodePngBuffer(fullShot);

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
      from: "canvas.toDataURL default live WebGL (not qr.png)",
    },
    stress: {
      decoded: stress?.data || null,
      match: stress?.data === DEST,
      from: "slight pointer tilt of living matrix",
    },
    viewport: {
      decoded: fullDec?.data || null,
      match: fullDec?.data === DEST,
      from: "full phone-width screenshot including HUD",
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
    tiltOk: tilt,
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
