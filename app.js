import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xfce3cc;
const STEEL = 0xc5cad3;
const INK = 0x202020;
const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";

/** Twin-core lights.ts updateLeds SoT. Face rounds + boom strip. Red+green only. */
const FACE_GREEN = 0x3fe868;
const FACE_GREEN_BASE = 0x062c10;
const FACE_RED = 0xff1c10;
const FACE_RED_BASE = 0x3a0000;
const STRIP_GREEN = 0x2dff5a;
const STRIP_RED = 0xff0008;

function makeFaceLedMat(ready) {
  return new THREE.MeshStandardMaterial({
    color: ready ? FACE_GREEN_BASE : FACE_RED_BASE,
    emissive: ready ? FACE_GREEN : FACE_RED,
    emissiveIntensity: ready ? 9 : 3,
    roughness: 0.15,
    metalness: 0.04,
    toneMapped: false,
  });
}

function makeGlowTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const canvas = document.getElementById("stage");
const hintEl = document.getElementById("hint"); // optional; slim HUD may omit
const statusEl = document.getElementById("status");
const failEl = document.getElementById("fail");

const N = 25;
const CELL = 0.086;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "default",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: true,
  });
} catch (err) {
  failEl.classList.add("show");
  throw err;
}
if (!renderer.getContext()) {
  failEl.classList.add("show");
  throw new Error("WebGL unavailable");
}

renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0xF4F6F9, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF4F6F9);
scene.fog = new THREE.Fog(0xE9EEF5, 14, 32);

// Showtime-lock hero camera. No OrbitControls. No auto-rotate.
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
camera.position.set(0, 0.85, 2.1);
camera.lookAt(0, 0.62, 0);

scene.add(new THREE.HemisphereLight(0xfff6ea, 0x1b2a4a, 1.12));
const key = new THREE.DirectionalLight(0xfff4e8, 1.7);
key.position.set(2.6, 5.8, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdce7ff, 0.38);
fill.position.set(-2.2, 3.2, 2.4);
scene.add(fill);
const rim = new THREE.DirectionalLight(ORANGE, 0.55);
rim.position.set(-3.2, 2.4, -3.4);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(5.2, 48),
  new THREE.MeshStandardMaterial({ color: 0xE9EEF5, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function hash(i, j) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) % 1000) / 1000;
}

const grid = new THREE.Group();
grid.name = "QrModuleGrid";
scene.add(grid);

const moduleMat = new THREE.MeshStandardMaterial({
  color: NAVY, roughness: 0.42, metalness: 0.1,
});
const paperMat = new THREE.MeshStandardMaterial({
  color: PAPER, roughness: 0.88, metalness: 0.02,
});
const accentMat = new THREE.MeshStandardMaterial({
  color: ORANGE, roughness: 0.34, metalness: 0.18, emissive: ORANGE, emissiveIntensity: 0.1,
});

const mods = [];
for (let i = 0; i < N; i += 1) {
  for (let j = 0; j < N; j += 1) {
    const finder = (i < 7 && j < 7) || (i < 7 && j > N - 8) || (i > N - 8 && j < 7);
    let on = false;
    if (finder) {
      on = i === 0 || i === 6 || j === 0 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5);
      if (i > N - 8 && j < 7) {
        const ii = i - (N - 7);
        on = ii === 0 || ii === 6 || j === 0 || j === 6 || (ii > 1 && ii < 5 && j > 1 && j < 5);
      }
      if (i < 7 && j > N - 8) {
        const jj = j - (N - 7);
        on = i === 0 || i === 6 || jj === 0 || jj === 6 || (i > 1 && i < 5 && jj > 1 && jj < 5);
      }
    } else {
      on = hash(i, j) > 0.48;
    }
    if (!on) continue;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(CELL * 0.86, CELL * 0.38, CELL * 0.86),
      moduleMat
    );
    mesh.castShadow = true;
    mesh.position.set((i - N / 2) * CELL, CELL * 0.22, (j - N / 2) * CELL);
    mesh.userData = { baseY: mesh.position.y, phase: hash(i, j) * Math.PI * 2 };
    grid.add(mesh);
    mods.push(mesh);
  }
}

const pad = new THREE.Mesh(
  new THREE.PlaneGeometry(N * CELL + 0.38, N * CELL + 0.38),
  paperMat
);
pad.rotation.x = -Math.PI / 2;
pad.position.y = 0.012;
pad.receiveShadow = true;
grid.add(pad);

const frame = new THREE.Mesh(
  new THREE.BoxGeometry(N * CELL + 0.24, 0.035, N * CELL + 0.24),
  accentMat
);
frame.position.y = 0.018;
grid.add(frame);

const qrTex = new THREE.TextureLoader().load("./qr.png");
qrTex.colorSpace = THREE.SRGBColorSpace;
qrTex.anisotropy = 8;
const scanPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(N * CELL, N * CELL),
  new THREE.MeshBasicMaterial({ map: qrTex, transparent: true, opacity: 0 })
);
scanPlane.rotation.x = -Math.PI / 2;
scanPlane.position.y = 0.055;
scanPlane.visible = false;
grid.add(scanPlane);

function makeHeroBoom() {
  const g = new THREE.Group();
  g.name = "portaboom-hero-standin";
  const matCab = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.46, metalness: 0.08 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.42, metalness: 0.14 });
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.36, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.08,
  });
  const matSteel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.3, metalness: 0.55 });
  const matBlack = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.62, metalness: 0.18 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.7), matCab);
  cab.name = "HeroCabinet";
  cab.position.set(-0.85, 0.35, 0);
  cab.castShadow = true;
  g.add(cab);
  const cabBand = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.71), matNavy);
  cabBand.position.set(-0.85, 0.48, 0);
  g.add(cabBand);
  for (const z of [-0.22, 0.22]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20), matBlack);
    w.rotation.z = Math.PI / 2;
    w.position.set(-0.85, 0.11, z);
    g.add(w);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 16), matSteel);
  mast.position.set(-0.55, 0.55, 0);
  g.add(mast);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), matSteel);
  pivot.position.set(-0.55, 0.82, 0);
  g.add(pivot);
  const arm = new THREE.Group();
  arm.name = "HeroBoomArm";
  arm.position.set(-0.55, 0.82, 0);
  const armLen = 2.05;
  const armMain = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.09, 0.12), matOrange);
  armMain.position.x = armLen / 2;
  armMain.castShadow = true;
  arm.add(armMain);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(armLen * 0.92, 0.025, 0.125), makeFaceLedMat(true));
  stripe.name = "PortaboomBoomStrip";
  stripe.position.set(armLen / 2, 0.02, 0);
  arm.add(stripe);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), matOrange);
  tip.position.set(armLen - 0.02, 0, 0);
  arm.add(tip);
  g.add(arm);
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), matNavy);
  solar.position.set(-0.85, 0.58, 0);
  solar.rotation.x = -0.25;
  g.add(solar);
  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xe8eef4, roughness: 0.16, metalness: 0.88,
  });
  const chromePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.13), matChrome);
  chromePlate.position.set(-0.85, 0.36, 0.356);
  chromePlate.name = "PortaboomChromePlate";
  g.add(chromePlate);
  const faceMat = makeFaceLedMat(false);
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x101814, roughness: 0.8, metalness: 0.12 });
  for (const dx of [-0.09, 0.09]) {
    const bezel = new THREE.Mesh(new THREE.CircleGeometry(0.055, 36), bezelMat);
    bezel.position.set(-0.85 + dx, 0.28, 0.354);
    g.add(bezel);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 48), faceMat);
    lens.position.set(-0.85 + dx, 0.28, 0.357);
    lens.name = "PortaboomFaceLed";
    g.add(lens);
  }
  g.userData.heroArm = arm;
  g.userData.heroFaceMat = faceMat;
  g.position.y = 0.02;
  return g;
}

let boom = makeHeroBoom();
boom.userData.plantedYaw = yawFaceCamera(false);
boom.rotation.y = boom.userData.plantedYaw;
scene.add(boom);
lockHeroCamera(boom);
if (canvas) canvas.dataset.iqrReady = "1";
let usingGlb = false;
let baseScale = 1;
let flat = false;
let flatT = 0;
let boomRig = null;

function setStatus(text) {
  statusEl.textContent = text;
}


function worldBox(obj) {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

function ancestorBlob(o) {
  const parts = [];
  let p = o;
  while (p) {
    parts.push(p.name || "");
    p = p.parent;
  }
  return parts.join("|");
}

function isTrafficNode(o) {
  return /traffic[_\s-]*light|信号灯|信号/i.test(ancestorBlob(o));
}

/** Door + signal lenses are authored on local −Z. Yaw so that face looks at the camera. */
function yawFaceCamera(negZIsFace = true) {
  const yawToCam = Math.atan2(camera.position.x || 0.0001, camera.position.z || 1);
  return negZIsFace ? yawToCam + Math.PI : yawToCam;
}

function gatherHeroBox(root) {
  const box = new THREE.Box3();
  let any = false;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = ancestorBlob(o);
    if (!/115-DOOR|AK-XLH-D115C-01-01|Traffic[_\s-]*Light|HeroCabinet|PortaboomChromePlate|PortaboomFaceLed/i.test(n)) return;
    if (/PART_|GB_T|螺钉|垫|自攻/.test(n)) return;
    box.union(new THREE.Box3().setFromObject(o));
    any = true;
  });
  return any ? box : worldBox(root);
}

/** Frontal lock on cabinet + traffic head. Product fills frame. No orbit. */
function lockHeroCamera(root) {
  const box = gatherHeroBox(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const yaw = root.rotation.y;
  const faceDir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  camera.fov = 32;
  camera.updateProjectionMatrix();
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(0.55, camera.aspect || 1);
  const distH = (size.y * 1.06) / (2 * Math.tan(fov / 2));
  const distW = (Math.max(size.x, size.z) * 1.28) / (2 * Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW, 1.05);
  camera.position.set(
    center.x + faceDir.x * dist,
    center.y + size.y * 0.04,
    center.z + faceDir.z * dist
  );
  camera.lookAt(center.x, center.y + size.y * 0.02, center.z);
  camera.updateProjectionMatrix();
}

/** Twin plant: wheels on ground, face camera, then hero-lock on cabinet + signal. */
function plantTwin(obj) {
  obj.rotation.set(0, 0, 0);
  obj.scale.setScalar(1);
  obj.position.set(0, 0, 0);
  let box = worldBox(obj);
  let center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  camera.position.set(0, 0.9, 2.2);
  obj.rotation.y = yawFaceCamera(true);
  const hero0 = gatherHeroBox(obj);
  const heroH = Math.max(0.4, hero0.getSize(new THREE.Vector3()).y);
  const s = 1.28 / heroH;
  obj.scale.setScalar(s);
  box = worldBox(obj);
  center = box.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= box.min.y;
  obj.position.y += 0.02;
  obj.rotation.y = yawFaceCamera(true);
  obj.userData.plantedYaw = obj.rotation.y;
  lockHeroCamera(obj);
  return s;
}

function isDescendantOf(o, ancestor) {
  let p = o;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

/** Port of twin-core rigBoomMaster — rotates 主杆 up/down about shaft hinge. */
function rigBoomMaster(root) {
  const boomMeshes = [];
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    box.setFromObject(o);
    const tall = box.max.y > 2.2;
    const slim = box.max.x - box.min.x < 0.35 && box.max.z - box.min.z < 0.35;
    if (tall && slim) boomMeshes.push(o);
    else if (/主杆|105|灯条/.test(o.name || "")) boomMeshes.push(o);
  });
  if (!boomMeshes.length) {
    root.traverse((o) => {
      if (o.isMesh && /主杆|105/.test(o.name || "")) boomMeshes.push(o);
    });
  }
  if (!boomMeshes.length) return null;

  const hinge = new THREE.Vector3(0, 1.3, 0);
  let shaft = null;
  root.traverse((o) => {
    if (o.isMesh && /AK-D115-02-03-2/.test(o.name || "")) shaft = o;
  });
  if (shaft) {
    const sb = new THREE.Box3().setFromObject(shaft);
    sb.getCenter(hinge);
    hinge.y = sb.max.y;
  } else {
    let cx = 0, cz = 0;
    boomMeshes.forEach((o) => {
      box.setFromObject(o);
      cx += (box.min.x + box.max.x) / 2;
      cz += (box.min.z + box.max.z) / 2;
    });
    hinge.x = cx / boomMeshes.length;
    hinge.z = cz / boomMeshes.length;
  }

  const boomPivot = new THREE.Group();
  boomPivot.name = "BoomPivot";
  boomPivot.position.copy(hinge);
  // attach via scene then reparent under root (same as twin)
  scene.attach(boomPivot);
  boomMeshes.forEach((o) => {
    if (!isDescendantOf(o, boomPivot)) boomPivot.attach(o);
  });
  root.attach(boomPivot);

  let poleA0, poleA1;
  {
    boomPivot.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(boomPivot.matrixWorld).invert();
    const v = new THREE.Vector3();
    const polePts = [];
    boomPivot.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!/主杆|105|灯条/.test(o.name || "")) return;
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 200));
      for (let k = 0; k < pos.count; k += step) {
        v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        polePts.push([v.x, v.y]);
      }
    });
    if (polePts.length < 4) {
      boomPivot.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        const pos = o.geometry.attributes.position;
        for (let k = 0; k < pos.count; k += Math.max(1, pos.count >> 6)) {
          v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          polePts.push([v.x, v.y]);
        }
      });
    }
    let far = -1;
    for (let a2 = 0; a2 < polePts.length; a2 += 3) {
      for (let b2 = a2 + 3; b2 < polePts.length; b2 += 3) {
        const dx = polePts[a2][0] - polePts[b2][0];
        const dy = polePts[a2][1] - polePts[b2][1];
        const d = dx * dx + dy * dy;
        if (d > far) {
          far = d;
          poleA0 = polePts[a2];
          poleA1 = polePts[b2];
        }
      }
    }
  }
  if (!poleA0 || !poleA1) return null;
  const d0 = poleA0[0] ** 2 + poleA0[1] ** 2;
  const d1 = poleA1[0] ** 2 + poleA1[1] ** 2;
  const base = d0 <= d1 ? poleA0 : poleA1;
  const tip = d0 <= d1 ? poleA1 : poleA0;
  const poleAngle = Math.atan2(tip[1] - base[1], tip[0] - base[0]);
  let boomRest = Math.PI / 2 - poleAngle;
  while (boomRest > Math.PI) boomRest -= 2 * Math.PI;
  while (boomRest < -Math.PI) boomRest += 2 * Math.PI;
  const probe = new THREE.Vector3();
  boomPivot.rotation.z = boomRest;
  boomPivot.updateMatrixWorld(true);
  probe.set(tip[0], tip[1], 0).applyMatrix4(boomPivot.matrixWorld);
  if (probe.y < hinge.y) boomRest += Math.PI;
  let boomDrop = -poleAngle;
  boomPivot.rotation.z = boomDrop;
  boomPivot.updateMatrixWorld(true);
  probe.set(tip[0], tip[1], 0).applyMatrix4(boomPivot.matrixWorld);
  if (probe.x < hinge.x) boomDrop = Math.PI - poleAngle;
  while (boomDrop - boomRest > Math.PI) boomDrop -= 2 * Math.PI;
  while (boomDrop - boomRest < -Math.PI) boomDrop += 2 * Math.PI;
  boomPivot.rotation.z = boomRest; // start UP
  return { pivot: boomPivot, rest: boomRest, drop: boomDrop, shownPct: 100, targetPct: 100 };
}

/** Hero stand-in arm — raise/lower works before (and if) the CAD rig mounts. */
function rigHeroArm(hero) {
  const arm = hero?.userData?.heroArm || hero?.getObjectByName?.("HeroBoomArm");
  if (!arm) return null;
  const drop = 0.06;
  const rest = 1.12;
  arm.rotation.z = rest;
  return { pivot: arm, rest, drop, shownPct: 100, targetPct: 100 };
}

function setBoomPct(pct) {
  if (!boomRig) return;
  boomRig.targetPct = Math.max(0, Math.min(100, pct));
}

function tickBoom(dt) {
  if (!boomRig || !boomRig.pivot) return;
  const d = boomRig.targetPct - boomRig.shownPct;
  const rate = boomRig.speed || 56;
  const step = Math.min(Math.abs(d), rate * dt);
  if (step > 0.01) boomRig.shownPct += Math.sign(d) * step;
  else boomRig.shownPct = boomRig.targetPct;
  const p = boomRig.shownPct / 100;
  boomRig.pivot.rotation.z = boomRig.drop + (boomRig.rest - boomRig.drop) * p;
}

function addLogoDecal(root) {
  const loader = new THREE.TextureLoader();
  loader.load("./portaboom_logo_reversed.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    let door = null;
    let cab = null;
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (/AK-XLH-D115C-01-02-1/.test(o.name || "")) door = o;
      if (/AK-XLH-D115C-01-01-1/.test(o.name || "")) cab = o;
    });
    const host = door || cab;
    if (!host) return;
    if (!host.geometry.boundingBox) host.geometry.computeBoundingBox();
    const lb = host.geometry.boundingBox;
    const ls = lb.getSize(new THREE.Vector3());
    const lc = lb.getCenter(new THREE.Vector3());
    const faceW = Math.max(ls.x, ls.y * 0.42);
    const logoW = faceW * 0.88;
    const imgW = tex.image?.width || 4;
    const imgH = tex.image?.height || 1;
    const logoH = logoW * (imgH / imgW);
    const chrome = new THREE.Mesh(
      new THREE.PlaneGeometry(logoW * 1.06, logoH * 1.28),
      new THREE.MeshStandardMaterial({ color: 0xf4f7fb, metalness: 0.86, roughness: 0.18 })
    );
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(logoW, logoH),
      new THREE.MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false,
        side: THREE.DoubleSide, metalness: 0.2, roughness: 0.35, color: 0xffffff,
      })
    );
    plate.name = "PortaboomLogoDecal";
    const zOut = lb.min.z - 0.006;
    const y = lc.y + ls.y * 0.06;
    chrome.position.set(lc.x, y, zOut);
    plate.position.set(lc.x, y, zOut - 0.0015);
    chrome.rotation.y = Math.PI;
    plate.rotation.y = Math.PI;
    host.add(chrome);
    host.add(plate);
    root.userData.logoWorldW = logoW * (root.scale?.x || 1);
  });
}

function paintGlb(root) {
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.38, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.04,
  });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.5, metalness: 0.05 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.44, metalness: 0.12 });
  const matSteel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.3, metalness: 0.5 });
  const skip = /垫|螺钉|螺柱|开口销|PART_244|PART_609|PART_602|GB_T|自攻|十字槽|环芯/i;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = `${o.name || ""}|${o.parent?.name || ""}`;
    const traffic = isTrafficNode(o);
    if (skip.test(name) && !traffic) {
      o.visible = false;
      return;
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere?.radius || 0;
    if (r > 0 && r < 0.015 && !traffic) {
      o.visible = false;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
    if (traffic) {
      // TL head 3-aspect is Chief's lane — do not invent or overwrite here.
      return;
    }
    if (/主杆|灯条|胶条|杆|橙|orange|105/i.test(name)) o.material = matOrange;
    else if (/车轮|wheel/i.test(name)) o.material = matSteel;
    else if (/太阳能|solar/i.test(name)) o.material = matNavy;
    else if (/箱|柜|门|compound/i.test(name)) o.material = matWhite;
    else o.material = r > 0.2 ? matOrange : matWhite;
  });
}

/** Twin-core lights.ts updateLeds — the only LED SoT. */
let ledRig = {
  faceMat: null,
  faceGlows: [],
  stripMat: null,
  lastShownPct: 100,
  movingHoldUntil: 0,
};
let showMode = "up";
let showClock = 0;

function findDoorLedHosts(root) {
  const hits = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = `${o.name || ""}|${o.parent?.name || ""}`;
    if (/转接板/.test(n) && /DOOR|门/i.test(n)) hits.push(o);
  });
  if (hits.length >= 2) return hits.slice(0, 2);
  const box = new THREE.Box3();
  const c = new THREE.Vector3();
  const sz = new THREE.Vector3();
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || isTrafficNode(o)) return;
    box.setFromObject(o);
    box.getSize(sz);
    c.copy(box.getCenter(new THREE.Vector3())).applyMatrix4(inv);
    const thin = Math.min(sz.x, sz.y, sz.z);
    const wide = Math.max(sz.x, sz.y, sz.z);
    if (thin < 0.02 && wide > 0.04 && wide < 0.12) hits.push(o);
  });
  return hits.slice(0, 2);
}

function rigTwinLeds(root) {
  const faceMat = makeFaceLedMat(true);
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x101814, roughness: 0.82, metalness: 0.1 });
  const glowTex = makeGlowTex();
  const glows = [];
  const hosts = findDoorLedHosts(root);
  hosts.forEach((host) => {
    host.visible = false;
    const box = worldBox(host);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const r = Math.max(0.028, Math.min(sz.x, sz.y) * 0.48);
    const toCam = new THREE.Vector3(camera.position.x - c.x, 0, camera.position.z - c.z).normalize();
    const bezel = new THREE.Mesh(new THREE.CircleGeometry(r + 0.004, 40), bezelMat);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(r, 48), faceMat);
    lens.name = "PortaboomFaceLed";
    const pos = c.clone().addScaledVector(toCam, Math.max(0.006, Math.min(sz.x, sz.z) * 0.5 + 0.004));
    bezel.position.copy(pos);
    lens.position.copy(pos).addScaledVector(toCam, 0.002);
    bezel.lookAt(pos.x + toCam.x, pos.y, pos.z + toCam.z);
    lens.lookAt(pos.x + toCam.x, pos.y, pos.z + toCam.z);
    scene.add(bezel);
    scene.add(lens);
    root.attach(bezel);
    root.attach(lens);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex, color: 0x77fcf9, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, opacity: 0.9,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(r * 5.2, r * 5.2, 1);
    glow.position.copy(pos).addScaledVector(toCam, 0.012);
    scene.add(glow);
    root.attach(glow);
    glows.push(glowMat);
  });
  let stripMat = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!/灯条/.test(`${o.name || ""}|${o.parent?.name || ""}`)) return;
    stripMat = new THREE.MeshStandardMaterial({
      color: FACE_GREEN_BASE, emissive: STRIP_GREEN, emissiveIntensity: 6,
      roughness: 0.28, metalness: 0.08, toneMapped: false,
    });
    o.material = stripMat;
  });
  ledRig = {
    faceMat,
    faceGlows: glows,
    stripMat,
    lastShownPct: boomRig?.shownPct ?? 100,
    movingHoldUntil: 0,
  };
}

/** Port of twin-core lights.ts updateLeds. No amber. */
function updateLeds() {
  if (!ledRig.faceMat && !ledRig.stripMat) return;
  const now = performance.now();
  const shown = boomRig ? boomRig.shownPct : 100;
  const target = boomRig ? boomRig.targetPct : 100;
  if (Math.abs(shown - ledRig.lastShownPct) > 0.03) ledRig.movingHoldUntil = now + 700;
  ledRig.lastShownPct = shown;
  const moving = now < ledRig.movingHoldUntil || Math.abs(shown - target) > 4;
  const down = target === 0;
  const advisory = moving || down;
  const flashOn = now % 640 < 340;
  const face = ledRig.faceMat;
  if (face) {
    if (advisory) {
      face.color.setHex(FACE_RED_BASE);
      face.emissive.setHex(FACE_RED);
      face.emissiveIntensity = flashOn ? 16 : 3;
    } else {
      face.color.setHex(FACE_GREEN_BASE);
      face.emissive.setHex(FACE_GREEN);
      face.emissiveIntensity = 9;
    }
  }
  for (const g of ledRig.faceGlows) {
    if (advisory) {
      g.color.setHex(0xff3722);
      g.opacity = flashOn ? 1 : 0.25;
    } else {
      g.color.setHex(0x77fcf9);
      g.opacity = 0.9;
    }
  }
  const strip = ledRig.stripMat;
  if (strip) {
    if (advisory) {
      strip.color.setHex(0x300000);
      strip.emissive.setHex(STRIP_RED);
      strip.emissiveIntensity = flashOn ? 26 : 1.2;
    } else {
      strip.color.setHex(FACE_GREEN_BASE);
      strip.emissive.setHex(STRIP_GREEN);
      strip.emissiveIntensity = 12;
    }
  }
}

function beginCloseSequence() {
  if (!boomRig) return;
  showMode = "closing";
  showClock = 0;
  setBoomPct(0);
  setStatus("Boom lowering…");
}

function beginRaiseSequence() {
  if (!boomRig) return;
  showMode = "raising";
  showClock = 0;
  setBoomPct(100);
  setStatus("Boom raising…");
}

/** Boom motion beat only. LEDs are driven solely by updateLeds. */
function tickShow(dt) {
  if (!boomRig || flat) return;
  showClock += dt;
  if (showMode === "up") {
    setBoomPct(100);
    if (!reduced && showClock > 0.55) beginCloseSequence();
  } else if (showMode === "closing") {
    if (boomRig.shownPct <= 1.5) {
      showMode = "down";
      showClock = 0;
    }
  } else if (showMode === "down") {
    if (showClock > 0.4) beginRaiseSequence();
  } else if (showMode === "raising") {
    if (boomRig.shownPct >= 99) {
      showMode = "up";
      showClock = 0;
      setStatus("Idle. Boom up.");
    }
  }
}

function removeHero() {
  if (boom && boom.parent) boom.parent.remove(boom);
}

setStatus("Idle. PORTABOOM hero on QR grid. Loading named twin.");
boomRig = rigHeroArm(boom);
ledRig.faceMat = boom.userData.heroFaceMat || null;
ledRig.stripMat = boom.getObjectByName("PortaboomBoomStrip")?.material || null;
{
  const plate = boom.getObjectByName("PortaboomChromePlate");
  if (plate) {
    new THREE.TextureLoader().load("./portaboom_logo_reversed.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      plate.material = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        metalness: 0.84,
        roughness: 0.16,
        color: 0xffffff,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    });
  }
}

const loader = new GLTFLoader();

function mountCad(gltf, label) {
  try {
    const cad = gltf.scene;
    cad.name = "Pb4000Twin";
    const probe = new THREE.Box3().setFromObject(cad);
    const probeSize = probe.getSize(new THREE.Vector3());
    if (Math.max(probeSize.x, probeSize.y, probeSize.z) < 0.05) {
      setStatus("Placeholder GLB. Hero stand-in stays.");
      return;
    }
    paintGlb(cad);
    const s = plantTwin(cad);
    removeHero();
    boom = cad;
    baseScale = s || 1;
    boom.userData.restY = boom.position.y;
    scene.add(boom);
    usingGlb = true;
    boomRig = rigBoomMaster(boom);
    if (boomRig) boomRig.speed = 38;
    rigTwinLeds(boom);
    addLogoDecal(boom);
    showMode = "up";
    showClock = 0;
    if (boomRig) setStatus(label + " · boom live");
    else setStatus(label);
  } catch (err) {
    console.error(err);
    setStatus("CAD parse error. Hero stand-in still live.");
  }
}

const NAMED = new URL("./pb4000_named.glb", import.meta.url).href;

function loadNamed(reason) {
  console.warn(reason);
  setStatus("Loading named twin…");
  loader.load(
    NAMED,
    (gltf) => mountCad(gltf, "Idle. PB4000 twin on QR grid. Tap to flatten."),
    (e) => {
      if (e.total && !usingGlb) {
        setStatus(`Loading named twin ${Math.round((100 * e.loaded) / e.total)}%.`);
      }
    },
    (err2) => {
      console.error(err2);
      setStatus("CAD blocked. Hero stand-in still live. Tap to flatten.");
    }
  );
}

async function bootTwin() {
  // Named twin first, no Meshopt. Static MeshoptDecoder import blanked phones.
  // Golden compressed.glb skipped for this preview (EXT_meshopt_compression).
  try {
    const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/");
    loader.setDRACOLoader(draco);
  } catch (e) {
    console.warn("Draco setup failed; hero stand-in stays if named needs it", e);
  }
  loadNamed("named-first");
}
requestAnimationFrame(() => {
  requestAnimationFrame(bootTwin);
});

function setFlat(next) {
  flat = next;
  flatT = 0;
  if (flat) {
    setStatus("Flattened. Scan-proof QR error H. PB4000 product.");
    if (hintEl) hintEl.innerHTML = "QR ready. Scan with Camera, or open the product page.";
  } else {
    setStatus(usingGlb
      ? "Idle. PB4000 twin on QR grid. Tap to flatten."
      : "Idle. PORTABOOM hero on QR grid. Tap to flatten.");
    if (hintEl) hintEl.textContent = "Tap the boom. Navy modules flatten to a scan-H plane.";
  }
}

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let down = null;
canvas.addEventListener("pointerdown", (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  const dt = performance.now() - down.t;
  down = null;
  if (Math.hypot(dx, dy) > 14 || dt > 480) return;
  const rect = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  setFlat(!flat);
});

function resize() {
  const w = Math.max(1, canvas.clientWidth || innerWidth);
  const h = Math.max(1, canvas.clientHeight || innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (boom) lockHeroCamera(boom);
}
addEventListener("resize", resize);
if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  flatT = Math.min(1, flatT + 0.045);
  const k = flat ? flatT : 1 - flatT;
  for (const m of mods) {
    const breathe = reduced ? 0 : Math.sin(t * 2.2 + m.userData.phase) * 0.025;
    const jump = reduced ? 0 : Math.max(0, Math.sin(t * 3.1 + m.userData.phase)) * 0.04;
    m.position.y = THREE.MathUtils.lerp(m.userData.baseY + breathe + jump, 0.03, k);
    m.scale.y = THREE.MathUtils.lerp(1, 0.15, k);
    m.visible = k < 0.95;
  }
  scanPlane.visible = k > 0.45;
  scanPlane.material.opacity = THREE.MathUtils.smoothstep(k, 0.5, 0.95);
  if (boom) {
    boom.visible = k < 0.92;
    if (boom.userData.restY == null) boom.userData.restY = boom.position.y;
    const breatheY = reduced ? 0 : Math.sin(t * 1.5) * 0.03;
    boom.position.y = THREE.MathUtils.lerp(boom.userData.restY + breatheY, 0.08, k);
    const planted = boom.userData.plantedYaw ?? 0;
    boom.rotation.y = planted;
    const sc = usingGlb ? baseScale : 1;
    boom.scale.setScalar(sc * THREE.MathUtils.lerp(1, 0.05, k));
  }
  const dt = Math.min(0.05, clock.getDelta());
  tickBoom(dt);
  tickShow(dt);
  updateLeds();
  renderer.render(scene, camera);
}
tick();

const flattenBtn = document.getElementById("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", () => setFlat(!flat));


const boomBtn = document.getElementById("boomBtn");
if (boomBtn) {
  boomBtn.addEventListener("click", () => {
    if (!boomRig) return;
    if (showMode === "up" || boomRig.shownPct >= 50) beginCloseSequence();
    else beginRaiseSequence();
  });
}

window.__iqr = {
  get snap() {
    const logo = boom?.getObjectByName?.("PortaboomLogoDecal");
    const faces = [];
    boom?.traverse?.((o) => { if (o.name === "PortaboomFaceLed") faces.push(o.name); });
    return {
      usingGlb,
      showMode,
      plantedYaw: boom?.userData?.plantedYaw ?? null,
      rotY: boom?.rotation?.y ?? null,
      boomPct: boomRig?.shownPct ?? null,
      boomTarget: boomRig?.targetPct ?? null,
      faceLeds: faces.length,
      hasStrip: !!ledRig.stripMat,
      hasFace: !!ledRig.faceMat,
      faceHex: ledRig.faceMat ? ledRig.faceMat.emissive.getHexString() : null,
      faceIntensity: ledRig.faceMat?.emissiveIntensity ?? null,
      stripHex: ledRig.stripMat ? ledRig.stripMat.emissive.getHexString() : null,
      logo: logo ? {
        world: logo.getWorldPosition(new THREE.Vector3()).toArray(),
        parent: logo.parent?.name || null,
      } : null,
    };
  },
};
