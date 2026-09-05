/**
 * Living PORTABOOM QR — ICQR Magic Tree *pattern* only.
 * Dark modules are 3D branded sculptures. Default pose looks at the
 * dark faces (XY plane, depth −Z) so the scene itself is scannable.
 * Not a textured qr.png quad. No cherry tree. No ICQR shop packs.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";

export const CELL = 0.07;
export const MODULE_FILL = 1;

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

/**
 * Modules live in the XY plane (row 0 at +Y). Depth goes −Z.
 * Dark scan faces sit on z≈0 toward the camera.
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

  const faceMat = new THREE.MeshBasicMaterial({
    color: 0x111318,
    toneMapped: false,
  });
  const paperMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
    side: THREE.DoubleSide,
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
  const faceGeo = new THREE.BoxGeometry(fill, fill, cell * 0.06);
  const bodyGeo = new THREE.BoxGeometry(fill * 0.88, fill * 0.88, 1);
  const bandGeo = new THREE.BoxGeometry(fill * 0.9, fill * 0.18, cell * 0.04);
  const rimGeo = new THREE.BoxGeometry(fill * 0.96, fill * 0.96, cell * 0.03);
  const lensGeo = new THREE.CircleGeometry(cell * 0.15, 20);

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
      const y = (origin - r) * cell;
      const deeper = vocab === "finder" || vocab === "head";
      const bodyD = cell * (deeper ? 0.46 : vocab === "timing" ? 0.22 : 0.34);

      const body = new THREE.Mesh(bodyGeo, pickBodyMat(vocab, {
        cabMat, darkMat, navyMat, stripeMat,
      }));
      body.scale.z = bodyD;
      body.position.z = -bodyD * 0.5;
      g.add(body);

      if (vocab === "cabinet" || vocab === "finder") {
        const band = new THREE.Mesh(bandGeo, navyMat);
        band.position.set(0, fill * 0.22, -bodyD * 0.35);
        g.add(band);
      }
      if (vocab === "finder") {
        const rim = new THREE.Mesh(rimGeo, steelMat);
        rim.position.z = -cell * 0.04;
        g.add(rim);
      }

      const face = new THREE.Mesh(faceGeo, faceMat);
      face.name = "QrModTop";
      face.position.z = cell * 0.02;
      g.add(face);

      if (vocab === "finder" || vocab === "led" || vocab === "head") {
        const ledMat = vocab === "head" ? ledFaceMat : (r + c) % 5 === 0 ? ledRedMat : ledFaceMat;
        const lens = new THREE.Mesh(lensGeo, ledMat);
        lens.rotation.y = Math.PI / 2;
        lens.position.set(fill * 0.45, 0, -bodyD * 0.45);
        g.add(lens);
        if (vocab === "finder" || vocab === "led") ledMats.push(ledMat);
      }

      g.position.set(x, y, 0);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseZ: 0,
        phase: ((r * 17 + c * 13) % 1000) / 1000 * Math.PI * 2,
      };
      group.add(g);
      mods.push(g);
    }
  }

  const padSize = (n + QUIET * 2) * cell;
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize, padSize),
    paperMat
  );
  pad.name = "LivingQrPad";
  pad.position.z = -0.002;
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
    product: "modular-geometry",
  };

  return {
    group,
    mods,
    pad,
    paperMat,
    topMat: faceMat,
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
