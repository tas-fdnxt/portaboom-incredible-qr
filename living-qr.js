/**
 * Living QR field — a heap of miniature PORTABOOM cabinets.
 *
 * Dark modules are tiny cabinets (powder orange, navy band, wordmark).
 * Tiny ones do NOT grow traffic lights or boom arms — those belong only
 * to the planted twin. Finder / timing / alignment keep a dark scan cap
 * so tap-to-scan still reads as a QR. Not a cherry tree. Not stripe towers.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";

export const CELL = 0.068;
export const MODULE_FILL = 0.86;

function makeMiniLogoTex(THREE) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 180);
  ctx.fillStyle = "#1b1e24";
  ctx.font = "900 54px Arial Black, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PORTA", 128, 50);
  ctx.fillText("BOOM", 128, 104);
  ctx.fillStyle = "#c01421";
  for (let i = 0; i < 4; i += 1) {
    const x = 78 + i * 28;
    ctx.beginPath();
    ctx.moveTo(x, 138);
    ctx.lineTo(x + 14, 138);
    ctx.lineTo(x + 6, 162);
    ctx.lineTo(x - 8, 162);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function powder(THREE, hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.05,
    sheen: 0.22,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
  });
}

function heightFor(vocab) {
  if (vocab === "finder") return 0.22;
  if (vocab === "cabinet") return 0.18;
  if (vocab === "head") return 0.16;
  if (vocab === "led") return 0.15;
  if (vocab === "timing") return 0.13;
  return 0.16;
}

/**
 * Modules live on the XZ plaza. Row 0 is at −Z (far / top of a +Y camera).
 * Dark scan caps sit on +Y for the tap-to-scan top-down pose.
 * @param {typeof import("three")} THREE
 */
export function buildLivingQr(THREE, spec) {
  const matrix = spec.matrix;
  const n = matrix.length;
  const cell = spec.cell ?? CELL;
  const livery = spec.livery;
  const dest = spec.dest;

  const group = new THREE.Group();
  group.name = "LivingQrTree";

  const capMat = new THREE.MeshBasicMaterial({
    color: 0x111318,
    toneMapped: false,
  });
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe6,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.2,
  });
  const scanPaperMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  });
  const cabMat = powder(THREE, livery.Y);
  const cabDeepMat = powder(THREE, 0xc45a10);
  const cabFinderMat = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    metalness: 0.16,
    roughness: 0.48,
    envMapIntensity: 0.7,
  });
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x1b2a4a,
    metalness: 0.12,
    roughness: 0.44,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: livery.K,
    metalness: 0.18,
    roughness: 0.62,
  });
  const logoMat = new THREE.MeshBasicMaterial({
    map: makeMiniLogoTex(THREE),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const logoFinderMat = new THREE.MeshBasicMaterial({
    map: logoMat.map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    color: 0xd8dde6,
  });

  const fill = cell * MODULE_FILL;
  const capGeo = new THREE.BoxGeometry(cell * 0.98, cell * 0.08, cell * 0.98);
  const bodyGeo = new THREE.BoxGeometry(fill * 0.92, 1, fill * 0.72);
  const bandGeo = new THREE.BoxGeometry(fill * 0.94, fill * 0.07, fill * 0.74);
  const wheelGeo = new THREE.CylinderGeometry(fill * 0.10, fill * 0.10, fill * 0.07, 10);
  const logoGeo = new THREE.PlaneGeometry(fill * 0.7, fill * 0.48);
  const lightGeo = new THREE.BoxGeometry(fill, cell * 0.02, fill);

  const origin = (n - 1) / 2;
  const mods = [];
  const kinds = { finder: 0, timing: 0, alignment: 0, data: 0 };
  const vocabs = { finder: 0, timing: 0, cabinet: 0, boom: 0, head: 0, led: 0 };
  const ledMats = [];

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const x = (c - origin) * cell;
      const z = (r - origin) * cell;
      if (!matrix[r][c]) {
        const tile = new THREE.Mesh(lightGeo, paperMat);
        tile.position.set(x, cell * 0.01, z);
        tile.name = `QrLight_${r}_${c}`;
        group.add(tile);
        continue;
      }
      const kind = classifyModule(n, r, c);
      const vocab = vocabFor(n, r, c);
      kinds[kind] += 1;
      vocabs[vocab] += 1;

      const g = new THREE.Group();
      g.name = `QrMod_${r}_${c}`;
      const bodyH = heightFor(vocab);
      const finderish = kind === "finder" || kind === "alignment";
      const bodyMat = finderish
        ? cabFinderMat
        : ((r + c) % 3 === 0 ? cabDeepMat : cabMat);

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.name = "MiniCabinet";
      body.scale.y = bodyH;
      body.position.y = bodyH * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const band = new THREE.Mesh(bandGeo, navyMat);
      band.name = "MiniBand";
      band.position.y = bodyH * 0.62;
      g.add(band);

      for (const wz of [-fill * 0.22, fill * 0.22]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.name = "MiniWheel";
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, fill * 0.11, wz);
        g.add(wheel);
      }

      const logo = new THREE.Mesh(logoGeo, finderish ? logoFinderMat : logoMat);
      logo.name = "MiniLogo";
      logo.position.set(0, bodyH * 0.42, fill * 0.33);
      g.add(logo);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = "QrModTop";
      cap.position.y = bodyH + fill * 0.08;
      g.add(cap);

      g.position.set(x, 0, z);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseY: 0,
        bodyH,
        miniCabinet: true,
        hasTrafficLight: false,
        phase: ((r * 17 + c * 13) % 1000) / 1000 * Math.PI * 2,
      };
      group.add(g);
      mods.push(g);
    }
  }

  const padSize = (n + QUIET * 2) * cell;
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(padSize * 2.35, cell * 0.035, padSize * 2.35),
    powder(THREE, livery.Y)
  );
  apron.name = "LivingQrApron";
  apron.position.y = -cell * 0.09;
  apron.receiveShadow = true;
  group.add(apron);

  const ring = new THREE.Mesh(
    new THREE.BoxGeometry(padSize * 1.18, cell * 0.05, padSize * 1.18),
    navyMat
  );
  ring.name = "LivingQrRing";
  ring.position.y = -cell * 0.05;
  ring.receiveShadow = true;
  group.add(ring);

  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(padSize, cell * 0.04, padSize),
    paperMat
  );
  pad.name = "LivingQrPad";
  pad.position.y = -cell * 0.02;
  pad.receiveShadow = true;
  group.add(pad);

  const scanPad = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize, padSize),
    scanPaperMat
  );
  scanPad.name = "LivingQrScanPad";
  scanPad.rotation.x = -Math.PI / 2;
  scanPad.position.y = -cell * 0.01;
  scanPad.visible = false;
  group.add(scanPad);

  group.userData = {
    n,
    cell,
    dest,
    ecc: "H",
    padSize,
    darkCount: mods.length,
    kinds,
    vocabs,
    texturedQuad: false,
    product: "living7-mini-cabinets",
    plane: "xz",
    cameraHint: "perspective-world / ortho-scan",
    miniHasTrafficLight: false,
    stripeModules: 0,
  };

  return {
    group,
    mods,
    pad,
    apron,
    ring,
    scanPad,
    paperMat,
    scanPaperMat,
    topMat: capMat,
    ledMats,
    n,
    cell,
    padSize,
    kinds,
    vocabs,
    darkCount: mods.length,
    miniHasTrafficLight: false,
    stripeModules: 0,
  };
}

export function livingExtent(living) {
  return living.padSize;
}
