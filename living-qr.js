/**
 * Living2 PORTABOOM QR — ICQR Magic Tree *pattern* only.
 *
 * Dark modules are 3D brand sculptures standing on an XZ plaza (not an
 * orthographic stack of black faces). Depth is +Y. A perspective camera
 * reads the dark caps as a QR while the sides show powder-orange cabinet,
 * boom chevrons, stainless, and KINDCOL LEDs.
 *
 * No cherry tree. No ICQR shop packs. Not a textured qr.png quad.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";

export const CELL = 0.068;
export const MODULE_FILL = 0.98;

function makeStripeTex(THREE) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 16;
  const ctx = c.getContext("2d");
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 ? "#c01421" : "#f0f1f3";
    ctx.fillRect(i * 8, 0, 8, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
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
  if (vocab === "finder") return 0.28;
  if (vocab === "head") return 0.22;
  if (vocab === "cabinet") return 0.18;
  if (vocab === "boom") return 0.2;
  if (vocab === "led") return 0.16;
  if (vocab === "timing") return 0.1;
  return 0.16;
}

/**
 * Modules live on the XZ plaza. Row 0 is at −Z (far / top of a +Z camera).
 * Dark scan caps sit on +Y so a high perspective camera can decode DEST.
 * @param {typeof import("three")} THREE
 */
export function buildLivingQr(THREE, spec) {
  const matrix = spec.matrix;
  const n = matrix.length;
  const cell = spec.cell ?? CELL;
  const livery = spec.livery;
  const kindcol = spec.kindcol;
  const dest = spec.dest;

  const group = new THREE.Group();
  group.name = "LivingQrTree";

  const capMat = new THREE.MeshBasicMaterial({
    color: 0x111318,
    toneMapped: false,
  });
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf7f4ee,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.18,
  });
  const cabMat = powder(THREE, livery.Y);
  const darkMat = new THREE.MeshStandardMaterial({
    color: livery.K,
    metalness: 0.14,
    roughness: 0.52,
    envMapIntensity: 0.7,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: livery.S,
    metalness: 0.9,
    roughness: 0.28,
    envMapIntensity: 1.15,
  });
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x1b2a4a,
    metalness: 0.12,
    roughness: 0.44,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    map: makeStripeTex(THREE),
    roughness: 0.32,
    metalness: 0.12,
    toneMapped: false,
  });
  const ledFaceMat = new THREE.MeshStandardMaterial({
    color: 0x062c10,
    emissive: kindcol.green,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.04,
    toneMapped: false,
  });
  const ledRedMat = new THREE.MeshStandardMaterial({
    color: 0x3a0000,
    emissive: kindcol.red,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.04,
    toneMapped: false,
  });

  const fill = cell * MODULE_FILL;
  const capGeo = new THREE.BoxGeometry(fill, cell * 0.07, fill);
  const bodyGeo = new THREE.BoxGeometry(fill * 0.9, 1, fill * 0.9);
  const bandGeo = new THREE.BoxGeometry(fill * 0.92, fill * 0.16, fill * 0.92);
  const rimGeo = new THREE.BoxGeometry(fill * 0.98, cell * 0.04, fill * 0.98);
  const lensGeo = new THREE.CircleGeometry(cell * 0.16, 20);
  const mastGeo = new THREE.CylinderGeometry(cell * 0.045, cell * 0.05, 1, 10);

  const origin = (n - 1) / 2;
  const mods = [];
  const kinds = { finder: 0, timing: 0, alignment: 0, data: 0 };
  const vocabs = { finder: 0, timing: 0, cabinet: 0, boom: 0, head: 0, led: 0 };
  const ledMats = [];

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c]) continue;
      const kind = classifyModule(n, r, c);
      const vocab = vocabFor(n, r, c);
      kinds[kind] += 1;
      vocabs[vocab] += 1;

      const g = new THREE.Group();
      g.name = `QrMod_${r}_${c}`;
      const x = (c - origin) * cell;
      const z = (r - origin) * cell;
      const bodyH = heightFor(vocab);

      const body = new THREE.Mesh(bodyGeo, pickBodyMat(vocab, {
        cabMat, darkMat, navyMat, stripeMat,
      }));
      body.scale.y = bodyH;
      body.position.y = bodyH * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      if (vocab === "cabinet" || vocab === "finder") {
        const band = new THREE.Mesh(bandGeo, navyMat);
        band.position.y = bodyH * 0.62;
        g.add(band);
      }
      if (vocab === "finder") {
        const rim = new THREE.Mesh(rimGeo, steelMat);
        rim.position.y = bodyH + cell * 0.01;
        g.add(rim);
        const mast = new THREE.Mesh(mastGeo, steelMat);
        mast.scale.y = bodyH * 0.55;
        mast.position.set(fill * 0.28, bodyH * 0.28, fill * 0.28);
        g.add(mast);
      }

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = "QrModTop";
      cap.position.y = bodyH + cell * 0.03;
      g.add(cap);

      if (vocab === "finder" || vocab === "led" || vocab === "head") {
        const ledMat = vocab === "head" ? ledFaceMat : ((r + c) % 5 === 0 ? ledRedMat : ledFaceMat);
        const lens = new THREE.Mesh(lensGeo, ledMat);
        lens.position.set(0, bodyH * 0.55, fill * 0.46);
        g.add(lens);
        if (vocab === "finder" || vocab === "led") ledMats.push(ledMat);
      }

      g.position.set(x, 0, z);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseY: 0,
        bodyH,
        phase: ((r * 17 + c * 13) % 1000) / 1000 * Math.PI * 2,
      };
      group.add(g);
      mods.push(g);
    }
  }

  const padSize = (n + QUIET * 2) * cell;
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(padSize, cell * 0.04, padSize),
    paperMat
  );
  pad.name = "LivingQrPad";
  pad.position.y = -cell * 0.02;
  pad.receiveShadow = true;
  group.add(pad);

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
    product: "living2-brand-world",
    plane: "xz",
    cameraHint: "perspective",
  };

  return {
    group,
    mods,
    pad,
    paperMat,
    topMat: capMat,
    ledMats,
    n,
    cell,
    padSize,
    kinds,
    vocabs,
    darkCount: mods.length,
  };
}

function pickBodyMat(vocab, mats) {
  if (vocab === "boom" || vocab === "timing") return mats.stripeMat;
  if (vocab === "head") return mats.darkMat;
  if (vocab === "led") return mats.navyMat;
  return mats.cabMat;
}

export function livingExtent(living) {
  return living.padSize;
}
