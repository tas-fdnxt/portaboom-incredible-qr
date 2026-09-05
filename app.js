import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const STEEL = 0xc5cad3;

const canvas = document.getElementById("c");
const modeEl = document.getElementById("mode");
const hintEl = document.getElementById("hint");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(NAVY, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
camera.position.set(2.8, 1.7, 3.6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0.65, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(4, 8, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(ORANGE, 0.6);
rim.position.set(-3, 3, -4);
scene.add(rim);

// --- QR module grid ---
const gridGroup = new THREE.Group();
scene.add(gridGroup);
const moduleMat = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.55, metalness: 0.08 });
const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.9 });
const accentMat = new THREE.MeshStandardMaterial({
  color: ORANGE, roughness: 0.35, metalness: 0.2, emissive: ORANGE, emissiveIntensity: 0.12,
});
function hash(i, j) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) % 1000) / 1000;
}
const N = 25, CELL = 0.09, mods = [];
for (let i = 0; i < N; i++) {
  for (let j = 0; j < N; j++) {
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
    } else on = hash(i, j) > 0.48;
    if (!on) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.88, CELL * 0.35, CELL * 0.88), moduleMat);
    m.position.set((i - N / 2) * CELL, CELL * 0.2, (j - N / 2) * CELL);
    m.userData = { baseY: m.position.y, phase: hash(i, j) * Math.PI * 2 };
    gridGroup.add(m);
    mods.push(m);
  }
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL + 0.35, N * CELL + 0.35), paperMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.01;
gridGroup.add(floor);
const frame = new THREE.Mesh(new THREE.BoxGeometry(N * CELL + 0.22, 0.04, N * CELL + 0.22), accentMat);
frame.position.y = 0.02;
gridGroup.add(frame);

// --- Recognisable PORTABOOM hero (cabinet + orange arm) — always visible ---
// Real CAD twin layers on top when GLB loads.
function makeHeroBoom() {
  const g = new THREE.Group();
  g.name = "portaboom-hero";
  const matCab = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.45, metalness: 0.08 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.45, metalness: 0.12 });
  const matOrange = new THREE.MeshStandardMaterial({
    color: ORANGE, roughness: 0.38, metalness: 0.1, emissive: ORANGE, emissiveIntensity: 0.08,
  });
  const matSteel = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.3, metalness: 0.55 });
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.2 });

  // Base cabinet (trailer-style)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.7), matCab);
  cab.position.set(-0.85, 0.35, 0);
  g.add(cab);
  const cabBand = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.71), matNavy);
  cabBand.position.set(-0.85, 0.48, 0);
  g.add(cabBand);
  // Wheels
  for (const z of [-0.22, 0.22]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20), matBlack);
    w.rotation.z = Math.PI / 2;
    w.position.set(-0.85, 0.11, z);
    g.add(w);
  }
  // Mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.55, 16), matSteel);
  mast.position.set(-0.55, 0.55, 0);
  g.add(mast);
  // Pivot
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), matSteel);
  pivot.position.set(-0.55, 0.82, 0);
  g.add(pivot);
  // Boom arm — long orange with white stripe (classic PORTABOOM read)
  const arm = new THREE.Group();
  arm.position.set(-0.55, 0.82, 0);
  const armLen = 2.05;
  const armMain = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.09, 0.12), matOrange);
  armMain.position.x = armLen / 2;
  arm.add(armMain);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(armLen * 0.92, 0.025, 0.125), matCab);
  stripe.position.set(armLen / 2, 0.02, 0);
  arm.add(stripe);
  // Tip light
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), matOrange);
  tip.position.set(armLen - 0.02, 0, 0);
  arm.add(tip);
  g.add(arm);
  // Solar panel hint on cabinet
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.28), matNavy);
  solar.position.set(-0.85, 0.58, 0);
  solar.rotation.x = -0.25;
  g.add(solar);

  g.position.y = 0.02;
  return g;
}

let boom = makeHeroBoom();
scene.add(boom);
let baseScale = 1;
let flat = false;
let flatT = 0;
let usingGlb = false;

modeEl.textContent = "PORTABOOM hero · loading CAD twin…";

function fitObject(obj, targetLen = 2.2) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);
  // Lay longest axis along X
  if (size.y >= size.x && size.y >= size.z) obj.rotation.z += Math.PI / 2;
  else if (size.z >= size.x && size.z >= size.y) obj.rotation.y += Math.PI / 2;
  const box2 = new THREE.Box3().setFromObject(obj);
  box2.getSize(size);
  box2.getCenter(center);
  obj.position.sub(center);
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const s = targetLen / longest;
  obj.scale.setScalar(s);
  const box3 = new THREE.Box3().setFromObject(obj);
  box3.getSize(size);
  box3.getCenter(center);
  obj.position.sub(center);
  obj.position.y = Math.max(0.5, size.y * 0.5 + 0.15);
  return s;
}

function paintGlb(root) {
  const matOrange = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.4, metalness: 0.1 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.5, metalness: 0.05 });
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.45, metalness: 0.12 });
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
    if (/主杆|灯条|胶条|杆|橙|orange|105/i.test(name)) o.material = matOrange;
    else if (/车轮|wheel/i.test(name)) o.material = matSteel;
    else if (/太阳能|solar/i.test(name)) o.material = matNavy;
    else if (/箱|柜|门|compound|traffic/i.test(name)) o.material = matWhite;
    else o.material = r > 0.2 ? matOrange : matWhite;
  });
}

new GLTFLoader().load(
  new URL("./pb4000_named.glb", import.meta.url).href,
  (gltf) => {
    try {
      const cad = gltf.scene;
      paintGlb(cad);
      const s = fitObject(cad, 2.25);
      // Replace hero with real twin
      scene.remove(boom);
      boom = cad;
      baseScale = s;
      boom.userData.restY = boom.position.y;
      scene.add(boom);
      usingGlb = true;
      modeEl.textContent = "Idle · PB4000 CAD twin on QR grid · tap to flatten";
    } catch (err) {
      console.error(err);
      modeEl.textContent = "CAD twin parse error · showing PORTABOOM hero";
    }
  },
  (e) => {
    if (e.total) {
      const pct = Math.round((100 * e.loaded) / e.total);
      if (!usingGlb) modeEl.textContent = `Loading PB4000 twin… ${pct}%`;
    }
  },
  (err) => {
    console.error(err);
    modeEl.textContent = "CAD twin blocked · PORTABOOM hero still live · tap to flatten";
  }
);

function resize() {
  const w = canvas.clientWidth || innerWidth;
  const h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

const qrTex = new THREE.TextureLoader().load("./qr.png");
qrTex.colorSpace = THREE.SRGBColorSpace;

function setFlat(v) {
  flat = v;
  flatT = 0;
  if (flat) {
    modeEl.textContent = "Flattened · scan-proof QR (H) · PB4000 product";
    hintEl.innerHTML = "QR ready. <strong>Scan</strong> with Camera, or open the product page.";
    if (!gridGroup.userData.qrPlane) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(N * CELL, N * CELL),
        new THREE.MeshBasicMaterial({ map: qrTex })
      );
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.06;
      gridGroup.add(plane);
      gridGroup.userData.qrPlane = plane;
    }
  } else {
    modeEl.textContent = usingGlb
      ? "Idle · PB4000 CAD twin on QR grid · tap to flatten"
      : "Idle · PORTABOOM hero on QR grid · tap to flatten";
    hintEl.innerHTML = "Tap the boom to <strong>flatten</strong> into a scan-proof QR (error H).";
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
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  const dt = performance.now() - down.t;
  down = null;
  if (Math.hypot(dx, dy) > 12 || dt > 450) return;
  setFlat(!flat);
});

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const t = clock.getElapsedTime();
  flatT = Math.min(1, flatT + 0.045);
  const k = flat ? flatT : 1 - flatT;
  for (const m of mods) {
    const breathe = Math.sin(t * 2.2 + m.userData.phase) * 0.025;
    const jump = Math.max(0, Math.sin(t * 3.1 + m.userData.phase)) * 0.04;
    m.position.y = THREE.MathUtils.lerp(m.userData.baseY + breathe + jump, 0.03, k);
    m.scale.y = THREE.MathUtils.lerp(1, 0.15, k);
    m.visible = k < 0.95;
  }
  if (gridGroup.userData.qrPlane) gridGroup.userData.qrPlane.visible = k > 0.55;
  if (boom) {
    boom.visible = k < 0.92;
    if (boom.userData.restY == null) boom.userData.restY = boom.position.y;
    boom.position.y = THREE.MathUtils.lerp(
      boom.userData.restY + Math.sin(t * 1.5) * 0.03,
      0.08,
      k
    );
    boom.rotation.y = (usingGlb ? 0 : 0) + t * 0.18 * (1 - k);
    const sc = usingGlb ? baseScale : 1;
    boom.scale.setScalar(sc * THREE.MathUtils.lerp(1, 0.05, k));
  }
  controls.enabled = !flat;
  controls.update();
  renderer.render(scene, camera);
}
tick();
