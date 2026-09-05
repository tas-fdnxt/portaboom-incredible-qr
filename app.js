import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xfce3cc;
const STEEL = 0xc5cad3;
const INK = 0x202020;
const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";

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
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF4F6F9);
scene.fog = new THREE.Fog(0xE9EEF5, 12, 28);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
camera.position.set(2.55, 1.72, 3.55);
camera.lookAt(0.05, 0.72, 0);

scene.add(new THREE.HemisphereLight(0xfff6ea, 0x1b2a4a, 1.05));
const key = new THREE.DirectionalLight(0xfff4e8, 1.55);
key.position.set(3.2, 6.4, 3.1);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.DirectionalLight(ORANGE, 0.42);
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
  arm.position.set(-0.55, 0.82, 0);
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
  solar.position.set(-0.85, 0.58, 0);
  solar.rotation.x = -0.25;
  g.add(solar);
  g.position.y = 0.02;
  return g;
}

let boom = makeHeroBoom();
scene.add(boom);
let usingGlb = false;
let baseScale = 1;
let flat = false;
let flatT = 0;

function setStatus(text) {
  statusEl.textContent = text;
}


function worldBox(obj) {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

/** Twin plant (from pb4000-viewer-rebuild): center, face fix, wheels on ground. */
function plantTwin(obj, targetLen = 2.55) {
  obj.rotation.set(0, 0, 0);
  obj.scale.setScalar(1);
  obj.position.set(0, 0, 0);
  let box = worldBox(obj);
  let size = box.getSize(new THREE.Vector3());
  let center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  // GLB authored facing away — twin applies half-turn
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
  // wheels / bbox bottom on QR paper
  obj.position.y -= box.min.y;
  obj.position.y += 0.02;
  box = worldBox(obj);
  size = box.getSize(new THREE.Vector3());
  camera.position.set(2.8, Math.max(1.45, size.y * 0.75), 3.4);
  camera.lookAt(0, size.y * 0.38, 0);
  return targetLen / longest;
}

let boomRig = null; // { pivot, rest, drop, shownPct, targetPct }

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

function setBoomPct(pct) {
  if (!boomRig) return;
  boomRig.targetPct = Math.max(0, Math.min(100, pct));
}

function tickBoom(dt) {
  if (!boomRig || !boomRig.pivot) return;
  const d = boomRig.targetPct - boomRig.shownPct;
  const step = Math.min(Math.abs(d), 55 * dt);
  if (step > 0.01) boomRig.shownPct += Math.sign(d) * step;
  else boomRig.shownPct = boomRig.targetPct;
  const p = boomRig.shownPct / 100;
  boomRig.pivot.rotation.z = boomRig.drop + (boomRig.rest - boomRig.drop) * p;
}

function addLogoDecal(root) {
  const loader = new THREE.TextureLoader();
  loader.load("./portaboom_logo_reversed.png", (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.2), mat);
    // Place on side of cabinet approx — attach to root after plant
    const box = worldBox(root);
    const size = box.getSize(new THREE.Vector3());
    plate.position.set(box.min.x + size.x * 0.18, box.min.y + size.y * 0.42, box.max.z + 0.01);
    plate.name = "PortaboomLogoDecal";
    root.add(plate);
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
    if (skip.test(name)) {
      o.visible = false;
      return;
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere?.radius || 0;
    if (r > 0 && r < 0.015) {
      o.visible = false;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
    if (/主杆|灯条|胶条|杆|橙|orange|105/i.test(name)) o.material = matOrange;
    else if (/车轮|wheel/i.test(name)) o.material = matSteel;
    else if (/太阳能|solar/i.test(name)) o.material = matNavy;
    else if (/箱|柜|门|compound|traffic/i.test(name)) o.material = matWhite;
    else o.material = r > 0.2 ? matOrange : matWhite;
  });
}

function removeHero() {
  if (boom && boom.parent) boom.parent.remove(boom);
}

setStatus("Preview only. Loading PB4000 twin.");

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
    addLogoDecal(boom);
    if (boomRig) setStatus(label + " · boom live");
    else setStatus(label);
  } catch (err) {
    console.error(err);
    setStatus("CAD parse error. Hero stand-in still live.");
  }
}

const GOLDEN = new URL("./pb4000_master.compressed.glb", import.meta.url).href;
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
  // Named twin first: same PB4000 topology, no Meshopt — paints fast on phone.
  // Golden compressed upgrades in place when Meshopt is ready.
  loadNamed("named-first");
  try {
    if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);
  } catch (e) {
    console.warn("Meshopt ready failed; keeping named twin", e);
    return;
  }
  loader.load(
    GOLDEN,
    (gltf) => {
      if (flat) return;
      mountCad(gltf, "Idle. Golden PB4000 twin on QR grid. Tap to flatten.");
    },
    (e) => {
      if (e.total && usingGlb) {
        /* named already live — quiet upgrade */
      } else if (e.total) {
        setStatus(`Upgrading golden twin ${Math.round((100 * e.loaded) / e.total)}%.`);
      }
    },
    (err) => console.warn("golden upgrade skipped", err)
  );
}
bootTwin();

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
    boom.rotation.y = t * 0.16 * (1 - k);
    const sc = usingGlb ? baseScale : 1;
    boom.scale.setScalar(sc * THREE.MathUtils.lerp(1, 0.05, k));
  }
  tickBoom(0.016);
  renderer.render(scene, camera);
}
tick();

const flattenBtn = document.getElementById("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", () => setFlat(!flat));


const boomBtn = document.getElementById("boomBtn");
if (boomBtn) {
  boomBtn.addEventListener("click", () => {
    if (!boomRig) return;
    setBoomPct(boomRig.targetPct >= 50 ? 0 : 100);
    setStatus(boomRig.targetPct >= 50 ? "Boom raising…" : "Boom lowering…");
  });
}
// Living QR: gentle auto open/close every ~4s once twin ready
setInterval(() => {
  if (!boomRig || flat) return;
  setBoomPct(boomRig.targetPct >= 50 ? 8 : 100);
}, 4200);
