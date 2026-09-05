import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xf7efe4;
const STEEL = 0xb7bec8;
const INK = 0x141414;
const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";

const LAMP_COL = { red: 0xff1d12, amber: 0xffb000, green: 0x18ff5a };
const LED_AMBER = 0xff8a12;

const canvas = document.getElementById("stage");
const hintEl = document.getElementById("hint");
const statusEl = document.getElementById("status");
const failEl = document.getElementById("fail");
const aspectEl = document.getElementById("aspect");

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
renderer.setClearColor(0x0b1424, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1424);
scene.fog = new THREE.Fog(0x0b1424, 16, 42);

const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 80);
camera.position.set(2.15, 1.55, 2.85);
camera.lookAt(0.15, 0.95, 0);
camera.userData.home = camera.position.clone();
camera.userData.look = new THREE.Vector3(0.15, 0.95, 0);

scene.add(new THREE.HemisphereLight(0xffe4c4, 0x081018, 0.72));
const key = new THREE.DirectionalLight(0xfff1dc, 1.85);
key.position.set(2.4, 5.8, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb4ff, 0.38);
fill.position.set(-3.4, 2.2, 1.6);
scene.add(fill);
const rim = new THREE.DirectionalLight(ORANGE, 0.85);
rim.position.set(-2.2, 3.2, -3.8);
scene.add(rim);
const bounce = new THREE.PointLight(ORANGE, 0.55, 8, 2);
bounce.position.set(0.2, 1.1, 1.4);
scene.add(bounce);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x121a28, roughness: 0.92, metalness: 0.08 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.55, 1.62, 64),
  new THREE.MeshBasicMaterial({
    color: ORANGE,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.014;
scene.add(ring);

function hash(i, j) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) % 1000) / 1000;
}

const grid = new THREE.Group();
grid.name = "QrModuleGrid";
scene.add(grid);

const moduleMat = new THREE.MeshStandardMaterial({
  color: NAVY, roughness: 0.38, metalness: 0.16, emissive: NAVY, emissiveIntensity: 0.18,
});
const paperMat = new THREE.MeshStandardMaterial({
  color: 0x1a2436, roughness: 0.86, metalness: 0.04,
});
const accentMat = new THREE.MeshStandardMaterial({
  color: ORANGE, roughness: 0.3, metalness: 0.22, emissive: ORANGE, emissiveIntensity: 0.28,
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

function lineage(o, depth = 6) {
  const parts = [];
  let p = o;
  for (let i = 0; i < depth && p; i += 1) {
    if (p.name) parts.push(p.name);
    p = p.parent;
  }
  return parts.join("|");
}

function firstMat(o) {
  if (!o) return null;
  return Array.isArray(o.material) ? o.material[0] : o.material;
}

function rgbOf(mat) {
  const c = mat?.color;
  if (!c) return { r: 0, g: 0, b: 0 };
  return { r: c.r, g: c.g, b: c.b };
}

function kindFromRgb({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 0.1) return "black";
  if (max - min < 0.1) return "grey";
  if (r > 0.5 && r > g * 1.55 && r > b * 1.55) return "red";
  if (g > 0.4 && g > r * 1.1 && g >= b * 0.9) return "green";
  if (r > 0.4 && g > 0.12 && g < 0.7 && b < 0.28) return "amber";
  return "other";
}

function makeLampMat(kind, on) {
  return new THREE.MeshStandardMaterial({
    color: on ? 0x22180c : 0x0c0a08,
    emissive: LAMP_COL[kind],
    emissiveIntensity: on ? 8.5 : 0.08,
    roughness: 0.22,
    metalness: 0.04,
    toneMapped: false,
  });
}

function makeLedCluster(name) {
  const g = new THREE.Group();
  g.name = name;
  const bezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.062, 0.018, 28),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.45, metalness: 0.28 })
  );
  bezel.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.05, 32),
    new THREE.MeshStandardMaterial({
      color: 0x2a1200,
      emissive: LED_AMBER,
      emissiveIntensity: 7.2,
      roughness: 0.18,
      metalness: 0.04,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
  );
  lens.position.z = 0.011;
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.086, 32),
    new THREE.MeshBasicMaterial({
      color: LED_AMBER,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  halo.position.z = 0.008;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 20, 14),
    new THREE.MeshStandardMaterial({
      color: LED_AMBER,
      emissive: LED_AMBER,
      emissiveIntensity: 5.4,
      roughness: 0.12,
      toneMapped: false,
    })
  );
  dome.position.z = 0.02;
  const lamp = new THREE.PointLight(LED_AMBER, 1.35, 1.8, 2);
  lamp.position.z = 0.06;
  g.add(bezel, halo, lens, dome, lamp);
  g.userData.ledMat = lens.material;
  g.userData.haloMat = halo.material;
  g.userData.domeMat = dome.material;
  g.userData.lamp = lamp;
  return g;
}

function makeHeroBoom() {
  const g = new THREE.Group();
  g.name = "portaboom-hero-standin";
  const matCab = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.42, metalness: 0.08 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.4, metalness: 0.16 });
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.32, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.16,
  });
  const matSteel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.28, metalness: 0.58 });
  const matBlack = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.55, metalness: 0.16 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.74), matCab);
  cab.name = "HeroCabinet";
  cab.position.set(-0.72, 0.38, 0);
  cab.castShadow = true;
  g.add(cab);
  const cabBand = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.09, 0.75), matNavy);
  cabBand.position.set(-0.72, 0.52, 0);
  g.add(cabBand);
  for (const z of [-0.24, 0.24]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20), matBlack);
    w.rotation.z = Math.PI / 2;
    w.position.set(-0.72, 0.11, z);
    g.add(w);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 16), matSteel);
  mast.position.set(-0.38, 0.58, 0);
  g.add(mast);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), matSteel);
  pivot.position.set(-0.38, 0.86, 0);
  g.add(pivot);
  const arm = new THREE.Group();
  arm.name = "HeroBoomArm";
  arm.position.set(-0.38, 0.86, 0);
  const armLen = 2.05;
  const armMain = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.09, 0.12), matOrange);
  armMain.position.x = armLen / 2;
  armMain.castShadow = true;
  arm.add(armMain);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(armLen * 0.92, 0.025, 0.125), matCab);
  stripe.position.set(armLen / 2, 0.02, 0);
  arm.add(stripe);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), matOrange);
  tip.position.set(armLen - 0.02, 0, 0);
  arm.add(tip);
  g.add(arm);
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), matNavy);
  solar.position.set(-0.72, 0.63, 0);
  solar.rotation.x = -0.25;
  g.add(solar);

  const head = new THREE.Group();
  head.name = "HeroSignalHead";
  head.position.set(-0.18, 1.28, 0.22);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.16), matBlack);
  head.add(housing);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.74, 0.03), matBlack);
  visor.position.z = 0.09;
  head.add(visor);
  const kinds = ["red", "amber", "green"];
  kinds.forEach((kind, i) => {
    const y = 0.22 - i * 0.22;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 28), makeLampMat(kind, kind === "green"));
    lens.position.set(0, y, 0.086);
    lens.name = `HeroLens_${kind}`;
    head.add(lens);
  });
  g.add(head);

  g.userData.heroArm = arm;
  g.userData.heroHead = head;
  g.position.y = 0.02;
  return g;
}

let boom = makeHeroBoom();
scene.add(boom);
if (canvas) canvas.dataset.iqrReady = "1";
let usingGlb = false;
let baseScale = 1;
let flat = false;
let flatT = 0;
let boomRig = null;
let lampMats = { red: null, amber: null, green: null };
let lampHalos = { red: null, amber: null, green: null };
let lampLights = { red: null, amber: null, green: null };
let ledClusters = [];
let signalAspect = "green";
const demo = { phase: "holdUp", t: 0, manual: false };

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setAspectHud(kind) {
  if (!aspectEl) return;
  aspectEl.dataset.aspect = kind;
  aspectEl.textContent = kind.toUpperCase();
}

function worldBox(obj) {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

function findNamed(root, re) {
  let hit = null;
  root.traverse((o) => {
    if (hit) return;
    if (re.test(o.name || "")) hit = o;
  });
  return hit;
}

/** Twin plant: center, face fix, wheels on ground. */
function plantTwin(obj, targetLen = 2.55) {
  obj.rotation.set(0, 0, 0);
  obj.scale.setScalar(1);
  obj.position.set(0, 0, 0);
  let box = worldBox(obj);
  let size = box.getSize(new THREE.Vector3());
  let center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  obj.rotation.y = Math.PI;
  box = worldBox(obj);
  size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;
  obj.scale.setScalar(targetLen / longest);
  box = worldBox(obj);
  size = box.getSize(new THREE.Vector3());
  center = box.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= box.min.y;
  obj.position.y += 0.02;
  return targetLen / longest;
}

function viewDirFromLenses(root) {
  const lenses = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = lineage(o);
    if (!/Traffic Light|HeroLens|HeroSignal/i.test(name)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    if (!bb) return;
    const sz = bb.getSize(new THREE.Vector3());
    const thin = Math.min(sz.x, sz.y, sz.z);
    const mid = [sz.x, sz.y, sz.z].sort((a, b) => a - b)[1];
    if (thin > 0.04 || mid < 0.08) return;
    lenses.push(o);
  });
  if (!lenses.length) return new THREE.Vector3(0.55, 0.12, 0.82).normalize();
  const mesh = lenses[0];
  mesh.updateMatrixWorld(true);
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const sz = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  const axis = sz.x <= sz.y && sz.x <= sz.z
    ? new THREE.Vector3(1, 0, 0)
    : sz.y <= sz.z
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
  axis.transformDirection(mesh.matrixWorld);
  const signal = findNamed(root, /Traffic Light|HeroSignalHead/i);
  const toward = new THREE.Vector3();
  if (signal) {
    const sc = worldBox(signal).getCenter(toward);
    toward.copy(camera.position).sub(sc);
  }
  if (axis.dot(new THREE.Vector3(0.4, 0.1, 0.7)) < 0) axis.negate();
  return axis.normalize();
}

/** Locked three-quarter hero: cabinet + orange boom + signal head in first frame. */
function frameHeroShot(root) {
  if (!root) return;
  root.updateMatrixWorld(true);
  const box = worldBox(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const signal = findNamed(root, /Traffic Light|HeroSignalHead/i);
  const look = center.clone();
  look.y = Math.max(center.y, size.y * 0.42);
  if (signal) {
    const sb = worldBox(signal);
    const sc = sb.getCenter(new THREE.Vector3());
    look.lerp(sc, 0.55);
    look.y = Math.max(look.y, sc.y * 0.72);
  }
  const face = viewDirFromLenses(root);
  const side = new THREE.Vector3().crossVectors(face, new THREE.Vector3(0, 1, 0));
  if (side.lengthSq() < 1e-5) side.set(1, 0, 0);
  side.normalize();
  const dist = Math.max(2.35, Math.max(size.x, size.y, size.z) * 1.28);
  camera.position.copy(look)
    .addScaledVector(face, dist * 0.7)
    .addScaledVector(side, dist * 0.42);
  camera.position.y = look.y + Math.max(0.38, size.y * 0.16);
  // Phone three-quarter fallback if the lens normal points us into the sky/floor.
  if (camera.position.y < 0.4 || camera.position.y > size.y * 2.4) {
    camera.position.set(look.x + 1.85, look.y + 0.62, look.z + 2.35);
  }
  camera.near = 0.05;
  camera.far = 80;
  camera.lookAt(look);
  camera.userData.home = camera.position.clone();
  camera.userData.look = look.clone();
  camera.updateProjectionMatrix();
}

function isDescendantOf(o, ancestor) {
  let p = o;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

function rigBoomMaster(root) {
  const boomMeshes = [];
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = lineage(o);
    box.setFromObject(o);
    const tall = box.max.y > 2.2;
    const slim = box.max.x - box.min.x < 0.35 && box.max.z - box.min.z < 0.35;
    if (/主杆|灯条|105-5|105_1|105-0|105-1/.test(name) || (tall && slim && /105/.test(name))) {
      boomMeshes.push(o);
    }
  });
  if (!boomMeshes.length) {
    root.traverse((o) => {
      if (o.isMesh && /主杆|105-5|105_1/.test(o.name || "")) boomMeshes.push(o);
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
    let cx = 0;
    let cz = 0;
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
  scene.attach(boomPivot);
  boomMeshes.forEach((o) => {
    if (!isDescendantOf(o, boomPivot)) boomPivot.attach(o);
  });
  root.attach(boomPivot);

  let poleA0;
  let poleA1;
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
  boomPivot.rotation.z = boomRest;
  return { pivot: boomPivot, rest: boomRest, drop: boomDrop, shownPct: 100, targetPct: 100 };
}

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
  const step = Math.min(Math.abs(d), 32 * dt);
  if (step > 0.01) boomRig.shownPct += Math.sign(d) * step;
  else boomRig.shownPct = boomRig.targetPct;
  const p = boomRig.shownPct / 100;
  boomRig.pivot.rotation.z = boomRig.drop + (boomRig.rest - boomRig.drop) * p;
}

function paintGlb(root) {
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.32, metalness: 0.12, emissive: ORANGE, emissiveIntensity: 0.22,
  });
  const matCream = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.44, metalness: 0.06 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.4, metalness: 0.18 });
  const matSteel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.28, metalness: 0.55 });
  const matRubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.78, metalness: 0.04 });
  const matSignalBlack = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.48, metalness: 0.14 });
  const matStrip = new THREE.MeshStandardMaterial({
    color: LED_AMBER, emissive: LED_AMBER, emissiveIntensity: 3.6, roughness: 0.2, toneMapped: false,
  });
  const skip = /垫|螺钉|螺柱|开口销|PART_244|PART_609|PART_602|GB_T|自攻|十字槽|环芯|CORS_NUT/i;

  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = lineage(o);
    if (skip.test(name)) {
      o.visible = false;
      return;
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere?.radius || 0;
    const isSignal = /Traffic Light|信号灯/i.test(name);
    if (!isSignal && r > 0 && r < 0.012) {
      o.visible = false;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;

    if (isSignal) {
      const kind = kindFromRgb(rgbOf(firstMat(o)));
      if (kind === "red" || kind === "amber" || kind === "green") return;
      o.material = matSignalBlack;
      return;
    }
    if (/灯条/.test(name)) {
      const kind = kindFromRgb(rgbOf(firstMat(o)));
      o.material = kind === "green" || kind === "amber" || r < 0.3 ? matStrip : matOrange;
      return;
    }
    if (/主杆|胶条|105-5|105_1|105-0|FENGKONGGAI|PRT00033|PRT0001|\b006\b/.test(name)) {
      o.material = matOrange;
      return;
    }
    if (/车轮|wheel/i.test(name)) {
      o.material = matRubber;
      return;
    }
    if (/太阳能|solar/i.test(name)) {
      o.material = matNavy;
      return;
    }
    if (/01-01-4|01-01-5|01-01-8/.test(name)) {
      o.material = matNavy;
      return;
    }
    if (/柱子/.test(name)) {
      o.material = matSteel;
      return;
    }
    if (/01-01|01-02|01-03|01-04|DOOR|小门|箱|柜|门|compound/i.test(name)) {
      o.material = matCream;
      return;
    }
    o.material = r > 0.55 ? matOrange : matCream;
  });
}

function addGlowHalo(mesh, kind) {
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 28),
    new THREE.MeshBasicMaterial({
      color: LAMP_COL[kind],
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  halo.name = `SignalHalo_${kind}`;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const sz = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
  const scale = Math.max(sz.x, sz.y, sz.z) * 1.15 || 0.22;
  halo.scale.setScalar(scale / 0.24);
  const axis = sz.x <= sz.y && sz.x <= sz.z
    ? "x"
    : sz.y <= sz.z
      ? "y"
      : "z";
  if (axis === "x") halo.rotation.y = Math.PI / 2;
  else if (axis === "y") halo.rotation.x = Math.PI / 2;
  halo.position.z = axis === "z" ? 0.004 : 0;
  mesh.add(halo);
  const light = new THREE.PointLight(LAMP_COL[kind], 0.2, 2.4, 2);
  light.name = `SignalLight_${kind}`;
  mesh.add(light);
  return { halo, light };
}

function rigTrafficLamps(root) {
  lampMats = { red: null, amber: null, green: null };
  lampHalos = { red: null, amber: null, green: null };
  lampLights = { red: null, amber: null, green: null };

  const signalMeshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (/Traffic Light|HeroLens|HeroSignal/i.test(lineage(o))) signalMeshes.push(o);
  });

  const byColor = { red: [], amber: [], green: [], housing: [] };
  const discs = [];
  signalMeshes.forEach((o) => {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const sz = o.geometry.boundingBox.getSize(new THREE.Vector3());
    const sorted = [sz.x, sz.y, sz.z].sort((a, b) => a - b);
    const disc = sorted[0] < 0.045 && Math.abs(sorted[1] - sorted[2]) < 0.1 && sorted[1] > 0.07;
    if (disc) discs.push(o);
    const kind = kindFromRgb(rgbOf(firstMat(o)));
    if ((kind === "red" || kind === "amber" || kind === "green") && (o.geometry.boundingSphere?.radius || 0) < 0.35) {
      byColor[kind].push(o);
    } else if (!disc) {
      byColor.housing.push(o);
    }
  });
  // Product lock: 3-aspect is always top=red, mid=amber, bottom=green.
  if (discs.length >= 3) {
    discs.sort((a, b) => worldBox(b).getCenter(new THREE.Vector3()).y - worldBox(a).getCenter(new THREE.Vector3()).y);
    byColor.red = [discs[0]];
    byColor.amber = [discs[1]];
    byColor.green = [discs[2]];
  }

  ["red", "amber", "green"].forEach((kind) => {
    const mesh = byColor[kind][0];
    if (!mesh) return;
    const mat = makeLampMat(kind, kind === "green");
    mesh.material = mat;
    mesh.name = mesh.name && /lens/i.test(mesh.name) ? mesh.name : `SignalLens_${kind}`;
    lampMats[kind] = mat;
    const glow = addGlowHalo(mesh, kind);
    lampHalos[kind] = glow.halo.material;
    lampLights[kind] = glow.light;
  });

  byColor.housing.forEach((o) => {
    if (Object.values(lampMats).includes(o.material)) return;
    o.material = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.48, metalness: 0.14 });
  });

  setSignalAspect("green");
}

function clearLedClusters(root) {
  ledClusters.forEach((c) => {
    if (c.parent) c.parent.remove(c);
  });
  ledClusters = [];
  if (root) {
    const stale = [];
    root.traverse((o) => {
      if (/ProductLed_/.test(o.name || "")) stale.push(o);
    });
    stale.forEach((o) => o.parent && o.parent.remove(o));
  }
}

function attachTwinLeds(root, pivot) {
  clearLedClusters(root);
  const a = makeLedCluster("ProductLed_A");
  const b = makeLedCluster("ProductLed_B");
  const head = findNamed(root, /Traffic Light|HeroSignalHead/i);
  const host = head || pivot || root;
  host.updateMatrixWorld(true);
  const box = worldBox(host);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const place = (cluster, world) => {
    host.attach(cluster);
    host.worldToLocal(world);
    cluster.position.copy(world);
    const face = viewDirFromLenses(root);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
    cluster.quaternion.copy(q);
    cluster.scale.setScalar(usingGlb ? 1 : 1);
    ledClusters.push(cluster);
  };

  if (head) {
    const up = new THREE.Vector3(0, 1, 0);
    const face = viewDirFromLenses(root);
    const side = new THREE.Vector3().crossVectors(face, up).normalize();
    place(a, center.clone().addScaledVector(side, size.x * 0.62 || 0.16).add(new THREE.Vector3(0, size.y * 0.18, 0)).addScaledVector(face, 0.09));
    place(b, center.clone().addScaledVector(side, -(size.x * 0.62 || 0.16)).add(new THREE.Vector3(0, size.y * 0.18, 0)).addScaledVector(face, 0.09));
  } else if (pivot) {
    a.position.set(0.42, 0.08, 0.1);
    b.position.set(1.15, 0.08, 0.1);
    pivot.add(a);
    pivot.add(b);
    ledClusters.push(a, b);
  } else {
    a.position.set(-0.18, 1.62, 0.34);
    b.position.set(0.02, 1.62, 0.34);
    root.add(a);
    root.add(b);
    ledClusters.push(a, b);
  }
}

function pulseLeds(t, moving) {
  const pulse = reduced ? 1 : 0.72 + Math.abs(Math.sin(t * (moving ? 9 : 3.2))) * 0.45;
  ledClusters.forEach((c) => {
    if (c.userData.ledMat) c.userData.ledMat.emissiveIntensity = 5.4 + pulse * 3.2;
    if (c.userData.domeMat) c.userData.domeMat.emissiveIntensity = 4.2 + pulse * 2.4;
    if (c.userData.haloMat) c.userData.haloMat.opacity = 0.28 + pulse * 0.28;
    if (c.userData.lamp) c.userData.lamp.intensity = 0.9 + pulse * 0.8;
  });
}

function addLogoDecals(root) {
  const stale = [];
  root.traverse((o) => {
    if (/PortaboomLogo/.test(o.name || "")) stale.push(o);
  });
  stale.forEach((o) => o.parent && o.parent.remove(o));

  const loader = new THREE.TextureLoader();
  const apply = (tex, name, w, h, pos, rot, parent) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    plate.name = name;
    plate.position.copy(pos);
    plate.rotation.set(rot.x, rot.y, rot.z);
    parent.add(plate);
  };

  const cab = findNamed(root, /HeroCabinet|AK-XLH-D115C-01-01-1/) || root;
  const host = root;
  const box = worldBox(cab === root ? root : cab);
  const size = box.getSize(new THREE.Vector3());
  const face = viewDirFromLenses(root);
  const side = new THREE.Vector3().crossVectors(face, new THREE.Vector3(0, 1, 0)).normalize();
  const mid = box.getCenter(new THREE.Vector3());
  mid.y = box.min.y + size.y * 0.46;

  loader.load("./portaboom_logo_reversed.png", (tex) => {
    const p1 = mid.clone().addScaledVector(face, size.z * 0.52 + 0.02);
    host.worldToLocal(p1);
    apply(tex, "PortaboomLogoFace", Math.min(0.92, size.x * 0.72), Math.min(0.32, size.y * 0.22), p1, { x: 0, y: 0, z: 0 }, host);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
    const facePlate = host.getObjectByName("PortaboomLogoFace");
    if (facePlate) facePlate.quaternion.copy(q);
  });
  loader.load("./portaboom_logo.png", (tex) => {
    const p2 = mid.clone().addScaledVector(side, size.x * 0.52 + 0.018);
    p2.y += size.y * 0.02;
    host.worldToLocal(p2);
    apply(tex, "PortaboomLogoSide", Math.min(0.88, size.z * 0.95 || 0.8), Math.min(0.3, size.y * 0.2), p2, { x: 0, y: 0, z: 0 }, host);
    const sidePlate = host.getObjectByName("PortaboomLogoSide");
    if (sidePlate) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), side);
      sidePlate.quaternion.copy(q);
    }
  });
  loader.load("./portaboom-pb4000-master.png", (tex) => {
    const p3 = mid.clone()
      .addScaledVector(face, size.z * 0.52 + 0.028)
      .add(new THREE.Vector3(0, -size.y * 0.16, 0));
    host.worldToLocal(p3);
    apply(
      tex,
      "PortaboomLogoHero",
      Math.min(0.7, size.x * 0.58),
      Math.min(0.7, size.x * 0.58),
      p3,
      { x: 0, y: 0, z: 0 },
      host
    );
    const heroPlate = host.getObjectByName("PortaboomLogoHero");
    if (heroPlate) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), face);
      heroPlate.quaternion.copy(q);
    }
  });
}

function setSignalAspect(kind) {
  signalAspect = kind;
  for (const k of ["red", "amber", "green"]) {
    const on = k === kind;
    const m = lampMats[k];
    if (m) m.emissiveIntensity = on ? 8.8 : 0.07;
    const h = lampHalos[k];
    if (h) h.opacity = on ? 0.55 : 0.04;
    const l = lampLights[k];
    if (l) l.intensity = on ? 2.1 : 0.05;
  }
  const hero = boom?.userData?.heroHead;
  if (hero) {
    ["red", "amber", "green"].forEach((k) => {
      const lens = hero.getObjectByName(`HeroLens_${k}`);
      if (lens?.material) lens.material.emissiveIntensity = k === kind ? 8.8 : 0.08;
    });
  }
  setAspectHud(kind);
}

function requestBoomLower() {
  if (!boomRig) return;
  demo.manual = true;
  demo.phase = "amber";
  demo.t = 0;
  setBoomPct(100);
  setSignalAspect("amber");
  setStatus("Amber — boom holds, then drops red");
}

function requestBoomRaise() {
  if (!boomRig) return;
  demo.manual = true;
  demo.phase = "raise";
  demo.t = 0;
  setSignalAspect("red");
  setBoomPct(100);
  setStatus("Raising — red until boom is up");
}

function tickDemo(dt) {
  if (!boomRig || flat) return;
  if (reduced && !demo.manual) {
    setBoomPct(100);
    setSignalAspect("green");
    return;
  }
  const moving = Math.abs(boomRig.shownPct - boomRig.targetPct) > 2.5;
  demo.t += dt;
  switch (demo.phase) {
    case "holdUp":
      setBoomPct(100);
      setSignalAspect("green");
      if (demo.t > 3.1) {
        demo.phase = "amber";
        demo.t = 0;
        setStatus("Amber — 2s warning");
      }
      break;
    case "amber":
      setBoomPct(100);
      setSignalAspect("amber");
      if (demo.t > 2.0) {
        demo.phase = "drop";
        demo.t = 0;
        setBoomPct(0);
        setSignalAspect("red");
        setStatus("Boom lowering — red");
      }
      break;
    case "drop":
      setSignalAspect("red");
      if (!moving && boomRig.shownPct <= 3 && demo.t > 0.35) {
        demo.phase = "holdDown";
        demo.t = 0;
        setStatus("Boom down — red");
      }
      break;
    case "holdDown":
      setSignalAspect("red");
      if (demo.t > 2.3) {
        demo.phase = "raise";
        demo.t = 0;
        setBoomPct(100);
        setStatus("Boom raising — red");
      }
      break;
    case "raise":
      setSignalAspect("red");
      if (!moving && boomRig.shownPct >= 97) {
        demo.phase = "holdUp";
        demo.t = 0;
        demo.manual = false;
        setSignalAspect("green");
        setStatus(usingGlb
          ? "Idle. PB4000 twin · green. Tap to flatten."
          : "Idle. PORTABOOM hero · green. Tap to flatten.");
      }
      break;
    default:
      demo.phase = "holdUp";
      demo.t = 0;
  }
}

function removeHero() {
  if (boom && boom.parent) boom.parent.remove(boom);
}

function dressUnit(root, pivot) {
  rigTrafficLamps(root);
  attachTwinLeds(root, pivot);
  addLogoDecals(root);
  frameHeroShot(root);
}

setStatus("Idle. PORTABOOM hero on QR grid. Loading golden twin.");
boomRig = rigHeroArm(boom);
dressUnit(boom, boomRig?.pivot);

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
    const s = plantTwin(cad, 2.55);
    removeHero();
    boom = cad;
    baseScale = s || 1;
    boom.userData.restY = boom.position.y;
    scene.add(boom);
    usingGlb = true;
    boomRig = rigBoomMaster(boom);
    dressUnit(boom, boomRig?.pivot);
    demo.phase = "holdUp";
    demo.t = 0;
    if (boomRig) setStatus(`${label} · boom live · signal live · LEDs live`);
    else setStatus(label);
  } catch (err) {
    console.error(err);
    setStatus("CAD parse error. Hero stand-in still live.");
  }
}

const NAMED = new URL("./pb4000_named.glb", import.meta.url).href;
const GOLDEN = new URL("./pb4000_master.compressed.glb", import.meta.url).href;

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
  try {
    const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/");
    loader.setDRACOLoader(draco);
  } catch (e) {
    console.warn("Draco setup failed", e);
  }
  let namedArmed = false;
  const fallbackNamed = (why) => {
    if (usingGlb || namedArmed) return;
    namedArmed = true;
    loadNamed(why);
  };
  const watchdog = setTimeout(() => fallbackNamed("golden-watchdog"), 9000);
  try {
    const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
    if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);
    setStatus("Loading golden PB4000 twin…");
    loader.load(
      GOLDEN,
      (gltf) => {
        clearTimeout(watchdog);
        if (flat) return;
        mountCad(gltf, "Idle. Golden PB4000 twin on QR grid. Tap to flatten.");
      },
      (e) => {
        if (e.total && !usingGlb) {
          setStatus(`Loading golden twin ${Math.round((100 * e.loaded) / e.total)}%.`);
        }
      },
      (err) => {
        console.warn("golden failed", err);
        clearTimeout(watchdog);
        fallbackNamed("golden-error");
      }
    );
  } catch (e) {
    console.warn("Meshopt/golden skipped; named twin", e);
    clearTimeout(watchdog);
    fallbackNamed("meshopt-failed");
  }
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
}
addEventListener("resize", resize);
if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, clock.getDelta());
  flatT = Math.min(1, flatT + 0.045);
  const k = flat ? flatT : 1 - flatT;
  for (const m of mods) {
    const breathe = reduced ? 0 : Math.sin(t * 2.2 + m.userData.phase) * 0.018;
    const jump = reduced ? 0 : Math.max(0, Math.sin(t * 3.1 + m.userData.phase)) * 0.03;
    m.position.y = THREE.MathUtils.lerp(m.userData.baseY + breathe + jump, 0.03, k);
    m.scale.y = THREE.MathUtils.lerp(1, 0.15, k);
    m.visible = k < 0.95;
  }
  scanPlane.visible = k > 0.45;
  scanPlane.material.opacity = THREE.MathUtils.smoothstep(k, 0.5, 0.95);
  ring.material.opacity = THREE.MathUtils.lerp(0.2, 0, k);
  if (boom) {
    boom.visible = k < 0.92;
    if (boom.userData.restY == null) boom.userData.restY = boom.position.y;
    boom.position.y = THREE.MathUtils.lerp(boom.userData.restY, 0.08, k);
    boom.rotation.y = 0;
    const sc = usingGlb ? baseScale : 1;
    boom.scale.setScalar(sc * THREE.MathUtils.lerp(1, 0.05, k));
  }
  if (camera.userData.home && k < 0.2) {
    camera.position.copy(camera.userData.home);
    camera.lookAt(camera.userData.look);
  }
  tickBoom(dt);
  tickDemo(dt);
  const moving = !!(boomRig && Math.abs(boomRig.shownPct - boomRig.targetPct) > 2.5);
  pulseLeds(t, moving);
  renderer.render(scene, camera);
}
tick();

const flattenBtn = document.getElementById("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", () => setFlat(!flat));

const boomBtn = document.getElementById("boomBtn");
if (boomBtn) {
  boomBtn.addEventListener("click", () => {
    if (!boomRig) return;
    if (boomRig.targetPct >= 50 && demo.phase !== "amber") requestBoomLower();
    else requestBoomRaise();
  });
}

void DEST;
