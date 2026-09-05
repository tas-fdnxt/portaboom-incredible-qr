import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xfce3cc;
const STEEL = 0xc5cad3;
const INK = 0x202020;
const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";

/**
 * Overnight SHOW CONFIG — clean core defaults (twin-core setGroup).
 * KEEP: cabinet + boom + ONE traffic head.
 * HIDE: solar group until user toggles ON. Hide 2nd head / ped if present.
 * OrbitControls on; autoRotate only via setSpin (default OFF).
 */
const SHOW_CONFIG = Object.freeze({
  solar: false,
  traffic: true,
  secondHead: false,
  productLedFlanks: false,
  spin: false,
});

let groups = { solar: [], traffic: [], traffic2: [] };
let optsVisible = { solar: SHOW_CONFIG.solar, traffic: SHOW_CONFIG.traffic };
let spin = false;
let controls = null;
let framed = false;
let lampMats = { red: null, amber: null, green: null };
let lampHalos = { red: null, amber: null, green: null };
let lampLights = { red: null, amber: null, green: null };
let signalAspect = "green";

/** Twin-core lights.ts updateLeds SoT. Face rounds + boom strip. Red+green only. */
const FACE_GREEN = 0x3fe868;
const FACE_GREEN_BASE = 0x062c10;
const FACE_RED = 0xff1c10;
const FACE_RED_BASE = 0x3a0000;
const STRIP_GREEN = 0x2dff5a;
const STRIP_RED = 0xff0008;

/** 3-aspect signal head (Traffic Light / HeroSignal). Not face-LED SoT. */
const LAMP_COL = { red: 0xff1d12, amber: 0xffb000, green: 0x18ff5a };

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

const canvas = document.getElementById("stage");
const hintEl = document.getElementById("hint"); // optional; slim HUD may omit
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
renderer.setClearColor(0x0d0d12, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// twin-core Ye() studio: background 0x0d0d12, RoomEnvironment, no fog
scene.background = new THREE.Color(0x0d0d12);
scene.backgroundBlurriness = 0;
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1;
} catch (err) {
  console.warn("RoomEnvironment skipped", err);
}

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
camera.position.set(0, 1.5, 5.4);
camera.lookAt(0, 1.1, 0);

scene.add(new THREE.HemisphereLight(0xc9d4e8, 0x1b2a4a, 0.42));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2.6, 5.8, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0003;
scene.add(key);
const fill = new THREE.DirectionalLight(0x9fbfff, 0.32);
fill.position.set(-2.2, 3.2, 2.4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe2c4, 0.38);
rim.position.set(-3.2, 2.4, -3.4);
scene.add(rim);

/** twin-core scenes.ts ct() — studio floor + warm contact + cyclorama horizon */
const studioGroup = new THREE.Group();
studioGroup.name = "TwinStudio";
function makeStudioGroundTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#16181c";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const n = 18 + Math.random() * 28;
    ctx.fillStyle = `rgba(${n},${n + 2},${n + 6},${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let g = 32; g < 512; g += 32) {
    ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(512, g); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 14);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 48),
  new THREE.MeshStandardMaterial({
    color: 0x8a8e94,
    map: makeStudioGroundTex(),
    roughness: 0.88,
    metalness: 0.08,
    envMapIntensity: 0.22,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
studioGroup.add(floor);
{
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
  g.addColorStop(0, "rgba(255,214,170,0.22)");
  g.addColorStop(0.55, "rgba(255,190,130,0.07)");
  g.addColorStop(1, "rgba(255,180,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.012;
  studioGroup.add(glow);
}
{
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#030508");
  g.addColorStop(0.55, "#0a0e14");
  g.addColorStop(1, "#0c1118");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const cycTex = new THREE.CanvasTexture(c);
  const cyc = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 18, 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: cycTex,
      side: THREE.BackSide,
      toneMapped: false,
    })
  );
  cyc.position.y = 7.2;
  studioGroup.add(cyc);
  const cove = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 10),
    new THREE.MeshBasicMaterial({ map: cycTex, toneMapped: false })
  );
  cove.position.set(0, 4.2, -7.5);
  studioGroup.add(cove);
}
scene.add(studioGroup);

function hash(i, j) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) % 1000) / 1000;
}

const grid = new THREE.Group();
grid.name = "QrModuleGrid";
scene.add(grid);

const moduleMat = new THREE.MeshStandardMaterial({
  color: 0x151c28, roughness: 0.55, metalness: 0.18, envMapIntensity: 0.25,
});
const paperMat = new THREE.MeshStandardMaterial({
  color: 0x0a0e14, roughness: 0.92, metalness: 0.04, envMapIntensity: 0.08,
});
const accentMat = new THREE.MeshStandardMaterial({
  color: ORANGE, roughness: 0.34, metalness: 0.18, emissive: ORANGE, emissiveIntensity: 0.06,
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
  solar.name = "太阳能板";
  solar.position.set(-0.85, 0.58, 0);
  solar.rotation.x = -0.25;
  solar.visible = SHOW_CONFIG.solar;
  g.add(solar);
  const head = new THREE.Group();
  head.name = "HeroSignalHead";
  head.position.set(-0.22, 1.22, 0.02);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.16), matBlack);
  head.add(housing);
  ["red", "amber", "green"].forEach((kind, i) => {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 28), makeLampMat(kind, kind === "green"));
    lens.position.set(0, 0.21 - i * 0.21, 0.086);
    lens.name = `HeroLens_${kind}`;
    head.add(lens);
  });
  g.add(head);
  g.userData.heroHead = head;
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
bindGroups(boom);
applyCoreShowConfig(boom);
lockHeroCamera(boom);
initOrbit(boom);
if (canvas) canvas.dataset.iqrReady = "1";
let usingGlb = false;
let baseScale = 1;
let flat = false;
let flatT = 0;
let boomRig = null;

function setStatus(text) {
  statusEl.textContent = text;
}


function isVisibleInTree(o) {
  let p = o;
  while (p) {
    if (p.visible === false) return false;
    p = p.parent;
  }
  return true;
}

function worldBox(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!isVisibleInTree(o)) return;
    box.expandByObject(o);
    any = true;
  });
  return any ? box : new THREE.Box3().setFromObject(obj);
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
    if (!isVisibleInTree(o)) return;
    if (!/115-DOOR|AK-XLH-D115C-01-01|Traffic[_\s-]*Light|HeroCabinet|PortaboomFaceLed/i.test(n)) return;
    if (/PART_|GB_T|螺钉|垫|自攻|太阳能|solar|PED_|TL2_/i.test(n)) return;
    box.union(new THREE.Box3().setFromObject(o));
    any = true;
  });
  return any ? box : worldBox(root);
}

/** Front framing on cabinet + traffic head. Orbit takes over after init. */
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
  const distH = (size.y * 1.22) / (2 * Math.tan(fov / 2));
  const distW = (Math.max(size.x, size.z) * 1.55) / (2 * Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW, 1.35);
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
  // twin-core instance.ts: model.rotation.y = Math.PI
  obj.rotation.y = Math.PI;
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
  obj.rotation.y = Math.PI;
  obj.userData.plantedYaw = Math.PI;
  // twin-core instance.ts: head.group.rotation.y = yaw (180° so lenses match cabinet front)
  faceSignalHead(obj);
  lockHeroCamera(obj);
  return s;
}

function findSignalHead(root) {
  let hit = null;
  root.traverse((o) => {
    if (hit) return;
    if (/Traffic[_\s-]*Light|HeroSignal|信号灯/i.test(o.name || "")) hit = o;
  });
  if (!hit) return null;
  while (
    hit.parent
    && hit.parent !== root
    && /Traffic[_\s-]*Light|HeroSignal|信号/i.test(hit.parent.name || "")
  ) {
    hit = hit.parent;
  }
  return hit;
}

/**
 * twin-core instance.ts: head.group.rotation.y at the mast socket.
 * A bbox-center spin swings the STEP off the pole — wrap at the cabinet
 * mount, then yaw so lanterns sit on the door / camera side and face it.
 */
function faceSignalHead(root) {
  const signal = findSignalHead(root);
  if (!signal || signal.userData.signalFaced) return signal;

  root.updateMatrixWorld(true);
  const doorFwd = new THREE.Vector3(-Math.sin(root.rotation.y), 0, -Math.cos(root.rotation.y));
  let door = null;
  root.traverse((o) => {
    if (!door && /^115-DOOR$|^115_DOOR$|HeroCabinet/i.test(o.name || "")) door = o;
  });
  const cabC = door
    ? worldBox(door).getCenter(new THREE.Vector3())
    : worldBox(root).getCenter(new THREE.Vector3());

  const headBox = worldBox(signal);
  const mount = new THREE.Vector3(
    THREE.MathUtils.clamp(cabC.x, headBox.min.x, headBox.max.x),
    headBox.min.y + Math.max(0.04, headBox.getSize(new THREE.Vector3()).y * 0.12),
    THREE.MathUtils.clamp(cabC.z, headBox.min.z, headBox.max.z)
  );

  const yawGroup = new THREE.Group();
  yawGroup.name = "TwinHeadYaw";
  const parent = signal.parent || root;
  parent.updateMatrixWorld(true);
  parent.add(yawGroup);
  parent.worldToLocal(mount);
  yawGroup.position.copy(mount);
  yawGroup.attach(signal);

  const lensC = new THREE.Vector3();
  let lensN = 0;
  const sample = (o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const sz = o.geometry.boundingBox.getSize(new THREE.Vector3());
    const sorted = [sz.x, sz.y, sz.z].sort((a, b) => a - b);
    const disc = sorted[0] < 0.05 && sorted[1] > 0.06;
    if (!disc) return;
    const c = worldBox(o).getCenter(new THREE.Vector3());
    lensC.add(c);
    lensN += 1;
  };
  signal.traverse(sample);
  if (lensN) lensC.multiplyScalar(1 / lensN);
  else headBox.getCenter(lensC);

  const pivotW = yawGroup.getWorldPosition(new THREE.Vector3());
  const toLens = lensC.clone().sub(pivotW);
  toLens.y = 0;
  if (toLens.lengthSq() > 1e-8 && toLens.dot(doorFwd) < 0) {
    yawGroup.rotation.y += Math.PI;
    yawGroup.updateMatrixWorld(true);
  }

  root.updateMatrixWorld(true);
  signal.userData.signalFaced = true;
  root.userData.signalPivot = yawGroup;
  return yawGroup;
}

function isDescendantOf(o, ancestor) {
  let p = o;
  while (p) {
    if (p === ancestor) return true;
    p = p.parent;
  }
  return false;
}

function collectTops(hits) {
  return hits.filter((o) => !hits.some((p) => p !== o && isDescendantOf(o, p)));
}

/**
 * twin-core De() + setGroup(solar/traffic).
 * Solar: 太阳能板 / 支架 / 固定板 / 管套 / 调节螺柱.
 * Traffic: port1 Traffic Light. Extra / ped / TL2 hidden for clean core.
 */
function bindGroups(root) {
  groups = { solar: [], traffic: [], traffic2: [] };
  if (!root) return groups;
  const solarHits = [];
  const trafficHits = [];
  const extraHits = [];
  root.traverse((o) => {
    const n = o.name || "";
    if (/ProductLed/i.test(n)) {
      o.visible = false;
      return;
    }
    if (/太阳能板|太阳能板支架|固定板|管套|调节螺柱|^太阳能|solar/i.test(n)) solarHits.push(o);
    if (/灯条/.test(n)) return;
    if (/PED_|TL2_|行人|人行|pedestrian|walk[_\s-]*light|walk[_\s-]*signal/i.test(n)) {
      extraHits.push(o);
      return;
    }
    if (/Traffic[_\s.-]*Light|HeroSignal|信号灯/i.test(n)) trafficHits.push(o);
  });
  groups.solar = solarHits;
  const trafficTops = collectTops(trafficHits);
  const keep = trafficTops.find((o) => /Traffic[_\s.-]*Light|HeroSignal/i.test(o.name || "") && !/PED_|TL2_/i.test(o.name || ""))
    || trafficTops[0]
    || null;
  groups.traffic = keep ? [keep] : [];
  groups.traffic2 = [
    ...collectTops(extraHits),
    ...trafficTops.filter((o) => o !== keep),
  ];
  root.userData.groups = {
    solar: groups.solar.map((o) => o.name),
    traffic: groups.traffic.map((o) => o.name),
    extra: groups.traffic2.map((o) => o.name),
  };
  return groups;
}

/** twin-core lights.ts setGroup — visibility only. */
function setGroup(name, on) {
  optsVisible[name] = !!on;
  const list = groups[name] || [];
  list.forEach((o) => { o.visible = !!on; });
  if (name === "traffic") {
    if (!on) {
      for (const k of ["red", "amber", "green"]) {
        if (lampLights[k]) lampLights[k].intensity = 0;
        if (lampHalos[k]) lampHalos[k].opacity = 0;
      }
      setAspectHud("off");
    } else {
      setSignalAspect(signalAspect || "green");
    }
  }
}

function setSolar(on) {
  setGroup("solar", on);
  syncDock();
}

function setTrafficLights(on) {
  setGroup("traffic", on);
  if (!on) groups.traffic2.forEach((o) => { o.visible = false; });
  syncDock();
}

/** twin-core setSpin. autoRotate stays false unless the user turns spin on. */
function setSpin(on) {
  spin = !!on;
  if (controls) {
    controls.autoRotate = spin;
    controls.autoRotateSpeed = 1;
  }
  syncDock();
}

function applyCoreShowConfig(root) {
  bindGroups(root);
  groups.traffic2.forEach((o) => { o.visible = false; });
  root.traverse((o) => {
    if (/ProductLed/i.test(o.name || "")) o.visible = false;
  });
  setGroup("solar", SHOW_CONFIG.solar);
  setGroup("traffic", SHOW_CONFIG.traffic);
  root.userData.coreShow = {
    solarOn: optsVisible.solar,
    trafficOn: optsVisible.traffic,
    keepName: groups.traffic[0]?.name || null,
    extraHidden: (root.userData.groups?.extra || []),
  };
}

function initOrbit(root) {
  if (controls) return controls;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 0.85;
  controls.maxDistance = 12;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  const box = gatherHeroBox(root);
  const center = box.getCenter(new THREE.Vector3());
  controls.target.set(center.x, center.y + box.getSize(new THREE.Vector3()).y * 0.02, center.z);
  controls.update();
  framed = true;
  return controls;
}

function syncDock() {
  const solarBtn = document.getElementById("solarBtn");
  const lightsBtn = document.getElementById("lightsBtn");
  const spinBtn = document.getElementById("spinBtn");
  if (solarBtn) {
    solarBtn.textContent = optsVisible.solar ? "Solar ON" : "Solar OFF";
    solarBtn.classList.toggle("on", optsVisible.solar);
    solarBtn.classList.toggle("off", !optsVisible.solar);
    solarBtn.setAttribute("aria-pressed", optsVisible.solar ? "true" : "false");
  }
  if (lightsBtn) {
    lightsBtn.textContent = optsVisible.traffic ? "Traffic lights ON" : "Traffic lights OFF";
    lightsBtn.classList.toggle("on", optsVisible.traffic);
    lightsBtn.classList.toggle("off", !optsVisible.traffic);
    lightsBtn.setAttribute("aria-pressed", optsVisible.traffic ? "true" : "false");
  }
  if (spinBtn) {
    spinBtn.textContent = spin ? "Spin ON" : "Spin OFF";
    spinBtn.classList.toggle("on", spin);
    spinBtn.classList.toggle("off", !spin);
    spinBtn.setAttribute("aria-pressed", spin ? "true" : "false");
  }
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

/**
 * Port of twin-core livery.ts — ONLY two PORTABOOM logos:
 * front approach (local −Z, yaw π) and opposite face (local +Z, yaw 0).
 * Texture: twin door_decal.png (stacked PORTA / BOOM). No side plate. No chrome plate.
 */
function addLogoDecal(root) {
  const stale = [];
  root.traverse((o) => {
    if (/PortaboomLogo/.test(o.name || "") || o.userData?.decal) stale.push(o);
  });
  stale.forEach((o) => o.parent && o.parent.remove(o));

  const loader = new THREE.TextureLoader();
  const src = "./door_decal.png";
  loader.load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const skip = /PED_|TL2_|Traffic[_\s-]*Light|HeroSignal|主杆|105|灯条|拉环|环6|FENGKONG|PRT|^006$|太阳能|固定板|管套|柱子|螺柱|调节/;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    let door = null;
    root.traverse((o) => {
      if (/^115-DOOR$/.test(o.name || "")) door = o;
      if (!door && /AK-XLH-D115C-01-02-1|HeroCabinet/.test(o.name || "")) door = o;
    });
    let yBand = -0.3;
    let logoW = 0.26;
    if (door) {
      const dc = worldBox(door).getCenter(new THREE.Vector3());
      const ds = worldBox(door).getSize(new THREE.Vector3());
      root.worldToLocal(dc);
      yBand = dc.y;
      const scale = Math.abs(root.scale?.x || 1) || 1;
      const faceSpan = Math.max(ds.x, ds.y);
      logoW = Math.max(0.26, faceSpan / scale * 0.72);
    }
    let zMin = Infinity;
    let zMax = -Infinity;
    const v = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || skip.test(o.name || "")) return;
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, pos.count >> 7);
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        if (Math.abs(v.x) > 0.22 || Math.abs(v.y - yBand) > 0.18) continue;
        if (v.z < zMin) zMin = v.z;
        if (v.z > zMax) zMax = v.z;
      }
    });
    if (door && (!Number.isFinite(zMin) || !Number.isFinite(zMax))) {
      const db = worldBox(door);
      const a = db.min.clone().applyMatrix4(inv);
      const b = db.max.clone().applyMatrix4(inv);
      zMin = Math.min(a.z, b.z);
      zMax = Math.max(a.z, b.z);
    }
    const backZ = Number.isFinite(zMax) ? zMax : 0.2525;
    const frontZ = Number.isFinite(zMin) ? zMin : -0.2525;
    const place = (name, x, y, z, yaw) => {
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(logoW, logoW * 0.698),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        })
      );
      plate.name = name;
      plate.position.set(x, y, z);
      plate.rotation.y = yaw;
      plate.userData.decal = true;
      root.add(plate);
    };
    // Front approach (cabinet door / viewer after instance.ts Math.PI plant)
    place("PortaboomLogoFace", 0, yBand, frontZ - 0.002, Math.PI);
    // Opposite face — the only other PORTABOOM mark (livery.ts)
    place("PortaboomLogoOpposite", 0, yBand, backZ + 0.002, 0);
    root.userData.logoWorldW = logoW * (root.scale?.x || 1);
  }, undefined, () => {
    loader.load("./portaboom_logo.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.26, 0.26 * 0.698),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      plate.name = "PortaboomLogoFace";
      plate.position.set(0, -0.3, -0.255);
      plate.rotation.y = Math.PI;
      root.add(plate);
    });
  });
}

function paintGlb(root) {
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.38, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.04,
  });
  const matWhite = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.48, metalness: 0.06 });
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
      // Housing only. Lenses are bound in rigTrafficLamps. No ProductLed flanks.
      const r0 = firstMatRgb(o);
      if (r0 === "red" || r0 === "amber" || r0 === "green") return;
      o.material = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.48, metalness: 0.14 });
      return;
    }
    if (/主杆|灯条|胶条|橙|orange|105-|105_|105$|PRT000|FENGKONG|^006$|^0001$/i.test(name)) o.material = matOrange;
    else if (/车轮|wheel/i.test(name)) o.material = matSteel;
    else if (/太阳能|solar/i.test(name)) o.material = matNavy;
    else if (/AK-XLH|115-DOOR|小门|箱|柜|门|compound|DAO-ZHA|d115c|LOCK-NEW|电池/i.test(name)) {
      o.material = matWhite;
    } else {
      o.material = r > 0.55 ? matOrange : matWhite;
    }
  });
}

function firstMat(o) {
  if (!o) return null;
  return Array.isArray(o.material) ? o.material[0] : o.material;
}

function firstMatRgb(o) {
  const c = firstMat(o)?.color;
  if (!c) return "other";
  const { r, g, b } = c;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 0.1) return "black";
  if (max - min < 0.1) return "grey";
  if (r > 0.5 && r > g * 1.55 && r > b * 1.55) return "red";
  if (g > 0.4 && g > r * 1.1 && g >= b * 0.9) return "green";
  if (r > 0.4 && g > 0.12 && g < 0.7 && b < 0.28) return "amber";
  return "other";
}

function setAspectHud(kind) {
  if (!aspectEl) return;
  aspectEl.dataset.aspect = kind;
  aspectEl.textContent = kind.toUpperCase();
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
    if (/Traffic[_\s.-]*Light|HeroLens|HeroSignal|信号灯/i.test(ancestorBlob(o))) signalMeshes.push(o);
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
    const kind = firstMatRgb(o);
    if ((kind === "red" || kind === "amber" || kind === "green") && (o.geometry.boundingSphere?.radius || 0) < 0.35) {
      byColor[kind].push(o);
    } else if (!disc) {
      byColor.housing.push(o);
    }
  });
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

function setSignalAspect(kind) {
  signalAspect = kind;
  if (!optsVisible.traffic) {
    setAspectHud("off");
    for (const k of ["red", "amber", "green"]) {
      const m = lampMats[k];
      if (m) m.emissiveIntensity = 0.02;
      const h = lampHalos[k];
      if (h) h.opacity = 0;
      const l = lampLights[k];
      if (l) l.intensity = 0;
    }
    return;
  }
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
    glow.scale.set(r * 2.4, r * 2.4, 1);
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

function beginAmberThenClose() {
  if (!boomRig) return;
  showMode = "amber";
  showClock = 0;
  setSignalAspect("amber");
  setStatus("Amber — boom holds, then drops red");
}

function beginCloseSequence() {
  if (!boomRig) return;
  showMode = "closing";
  showClock = 0;
  setBoomPct(0);
  setSignalAspect("red");
  setStatus("Boom lowering…");
}

function beginRaiseSequence() {
  if (!boomRig) return;
  showMode = "raising";
  showClock = 0;
  setBoomPct(100);
  setSignalAspect("red");
  setStatus("Boom raising…");
}

/** Boom motion beat. No auto-cycle — user dock drives raise/lower. */
function tickShow(dt) {
  if (!boomRig || flat) return;
  showClock += dt;
  if (showMode === "up") {
    setBoomPct(100);
    if (optsVisible.traffic) setSignalAspect("green");
  } else if (showMode === "amber") {
    setSignalAspect("amber");
    if (showClock > 0.75) beginCloseSequence();
  } else if (showMode === "closing") {
    setSignalAspect("red");
    if (boomRig.shownPct <= 1.5) {
      showMode = "down";
      showClock = 0;
    }
  } else if (showMode === "down") {
    setSignalAspect("red");
    if (showClock > 0.4) beginRaiseSequence();
  } else if (showMode === "raising") {
    setSignalAspect("red");
    if (boomRig.shownPct >= 99) {
      showMode = "up";
      showClock = 0;
      setSignalAspect("green");
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
rigTrafficLamps(boom);
addLogoDecal(boom);
setSignalAspect("green");

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
    applyCoreShowConfig(cad);
    const s = plantTwin(cad);
    removeHero();
    boom = cad;
    baseScale = s || 1;
    boom.userData.restY = boom.position.y;
    scene.add(boom);
    faceSignalHead(boom);
    usingGlb = true;
    boomRig = rigBoomMaster(boom);
    if (boomRig) boomRig.speed = 38;
    rigTwinLeds(boom);
    rigTrafficLamps(boom);
    addLogoDecal(boom);
    applyCoreShowConfig(boom);
    showMode = "up";
    showClock = 0;
    setSignalAspect("green");
    lockHeroCamera(boom);
    if (controls) {
      const box = gatherHeroBox(boom);
      const center = box.getCenter(new THREE.Vector3());
      controls.target.set(center.x, center.y + box.getSize(new THREE.Vector3()).y * 0.02, center.z);
      controls.update();
    } else {
      initOrbit(boom);
    }
    if (boomRig) setStatus(label + " · boom live · clean core");
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
    (gltf) => mountCad(gltf, "Idle. PB4000 clean core. Front. Orbit."),
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
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  flatT = Math.min(1, flatT + 0.045);
  const k = flat ? flatT : 1 - flatT;
  for (const m of mods) {
    const breathe = reduced ? 0 : Math.sin(t * 2.2 + m.userData.phase) * 0.012;
    m.position.y = THREE.MathUtils.lerp(m.userData.baseY + breathe, 0.03, k);
    m.scale.y = THREE.MathUtils.lerp(1, 0.15, k);
    m.visible = k < 0.95;
  }
  scanPlane.visible = k > 0.45;
  scanPlane.material.opacity = THREE.MathUtils.smoothstep(k, 0.5, 0.95);
  if (boom) {
    boom.visible = k < 0.92;
    if (boom.userData.restY == null) boom.userData.restY = boom.position.y;
    boom.position.y = THREE.MathUtils.lerp(boom.userData.restY, 0.08, k);
    const planted = boom.userData.plantedYaw ?? 0;
    boom.rotation.y = planted;
    const sc = usingGlb ? baseScale : 1;
    boom.scale.setScalar(sc * THREE.MathUtils.lerp(1, 0.05, k));
  }
  tickBoom(dt);
  tickShow(dt);
  updateLeds();
  if (controls) {
    if (!spin) controls.autoRotate = false;
    controls.update();
  }
  renderer.render(scene, camera);
}
tick();

const flattenBtn = document.getElementById("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", () => setFlat(!flat));

const solarBtn = document.getElementById("solarBtn");
if (solarBtn) solarBtn.addEventListener("click", () => setSolar(!optsVisible.solar));

const lightsBtn = document.getElementById("lightsBtn");
if (lightsBtn) lightsBtn.addEventListener("click", () => setTrafficLights(!optsVisible.traffic));

const spinBtn = document.getElementById("spinBtn");
if (spinBtn) spinBtn.addEventListener("click", () => setSpin(!spin));

const boomBtn = document.getElementById("boomBtn");
if (boomBtn) {
  boomBtn.addEventListener("click", () => {
    if (!boomRig) return;
    if (showMode === "up") beginAmberThenClose();
    else if (showMode === "amber" || boomRig.shownPct >= 50) beginCloseSequence();
    else beginRaiseSequence();
  });
}

syncDock();

window.__iqr = {
  get boom() { return boom; },
  get snap() {
    const logo = boom?.getObjectByName?.("PortaboomLogoFace")
      || boom?.getObjectByName?.("PortaboomLogoDecal");
    const logoOpp = boom?.getObjectByName?.("PortaboomLogoOpposite");
    const faces = [];
    boom?.traverse?.((o) => { if (o.name === "PortaboomFaceLed") faces.push(o.name); });
    const pivot = boom?.userData?.signalPivot;
    let solarVisible = 0;
    let extraHeads = 0;
    let productLeds = 0;
    let trafficHeads = 0;
    boom?.traverse?.((o) => {
      const n = o.name || "";
      if (/太阳能板|太阳能板支架|^太阳能|solar/i.test(n) && isVisibleInTree(o) && !/灯条/.test(n)) solarVisible += 1;
      if (/ProductLed/i.test(n) && o.visible) productLeds += 1;
      if (/灯条/.test(n)) return;
      if (/Traffic[_\s.-]*Light|HeroSignal/i.test(n) && isVisibleInTree(o) && !/Traffic[_\s.-]*Light|HeroSignal/i.test(o.parent?.name || "")) {
        trafficHeads += 1;
      }
      if (/PED_|TL2_|行人|人行|pedestrian/i.test(n) && isVisibleInTree(o)) extraHeads += 1;
    });
    return {
      usingGlb,
      showMode,
      signalAspect,
      showConfig: SHOW_CONFIG,
      solarOn: optsVisible.solar,
      trafficOn: optsVisible.traffic,
      spin,
      autoRotate: !!(controls && controls.autoRotate),
      damping: !!(controls && controls.enableDamping),
      solarVisible,
      trafficHeads,
      extraHeads,
      productLeds,
      plantedYaw: boom?.userData?.plantedYaw ?? null,
      rotY: boom?.rotation?.y ?? null,
      signalName: findSignalHead(boom)?.name ?? null,
      signalYaw: pivot?.rotation?.y ?? null,
      signalFaced: !!findSignalHead(boom)?.userData?.signalFaced,
      boomPct: boomRig?.shownPct ?? null,
      boomTarget: boomRig?.targetPct ?? null,
      faceLeds: faces.length,
      hasStrip: !!ledRig.stripMat,
      hasFace: !!ledRig.faceMat,
      faceHex: ledRig.faceMat ? ledRig.faceMat.emissive.getHexString() : null,
      faceIntensity: ledRig.faceMat?.emissiveIntensity ?? null,
      stripHex: ledRig.stripMat ? ledRig.stripMat.emissive.getHexString() : null,
      logo: logo ? {
        name: logo.name,
        world: logo.getWorldPosition(new THREE.Vector3()).toArray(),
        parent: logo.parent?.name || null,
        worldW: boom?.userData?.logoWorldW ?? null,
      } : null,
      logoOpposite: logoOpp ? {
        name: logoOpp.name,
        world: logoOpp.getWorldPosition(new THREE.Vector3()).toArray(),
      } : null,
    };
  },
};
