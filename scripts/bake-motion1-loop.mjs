/**
 * Bake an honest animated companion of ?v=motion1 idle motion.
 * Not the product. Decode is expected to fail while modules bob.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "preview-motion");
const FRAMES = resolve(OUT, ".loop-frames");
const TIP = "https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=motion1";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
};

function serve() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const file = url.pathname === "/" ? "/index.html" : url.pathname;
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

function run(cmd, args) {
  return new Promise((resolveP, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => (code === 0 ? resolveP() : reject(new Error(`${cmd} ${code}`))));
  });
}

function decodePng(buf) {
  const png = PNG.sync.read(buf);
  try {
    const hit = jsQR(png.data, png.width, png.height, { inversionAttempts: "attemptBoth" });
    return hit?.data || null;
  } catch {
    return null;
  }
}

async function main() {
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const n = 36;
  const fps = 12;
  const decode = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { window.__iqrOnLeaveToDest = (d) => { window.__left = d; }; });
    await page.goto(`http://127.0.0.1:${port}/?v=motion1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__iqr?.snap?.fieldMotionOn === true, { timeout: 20000 });
    await page.waitForTimeout(350);
    for (let i = 0; i < n; i += 1) {
      const name = `f${String(i).padStart(3, "0")}.png`;
      const buf = await page.screenshot({ type: "png" });
      await writeFile(join(FRAMES, name), buf);
      if (i % 6 === 0) {
        decode.push({ frame: name, text: decodePng(buf) });
      }
      await page.waitForTimeout(Math.round(1000 / fps));
    }
    await browser.close();
    server.close();

    await run("ffmpeg", [
      "-y", "-framerate", String(fps), "-i", join(FRAMES, "f%03d.png"),
      "-vf", "scale=390:-2:flags=lanczos",
      "-loop", "0",
      join(OUT, "living-field.webp"),
    ]);
    await run("ffmpeg", [
      "-y", "-framerate", String(fps), "-i", join(FRAMES, "f%03d.png"),
      "-vf", "scale=390:-2:flags=lanczos",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
      join(OUT, "living-field.mp4"),
    ]);
    await run("ffmpeg", [
      "-y", "-framerate", String(fps), "-i", join(FRAMES, "f%03d.png"),
      "-vf", "scale=390:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
      "-loop", "0",
      join(OUT, "living-field.gif"),
    ]);

    const anyDecode = decode.some((d) => d.text);
    const report = {
      product: "motion1-animated-companion",
      ready: false,
      role: "companion — not the sendable",
      tipUrl: TIP,
      frames: n,
      fps,
      decodeAttempted: decode,
      anyFrameDecoded: anyDecode,
      honest: anyDecode
        ? "At least one captured frame jsQR-decoded. Still pair the tip URL — Camera on a looping encode is not GATE."
        : "No captured idle frame decoded as QR (modules moving). Pair the living tip URL. Do not pretend this loop is a scan door.",
    };
    await writeFile(join(OUT, "DECODE.json"), JSON.stringify(report, null, 2));
    await rm(FRAMES, { recursive: true, force: true });
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    await browser.close().catch(() => {});
    server.close();
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
