import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;

const canvas = document.getElementById("c");
const modeEl = document.getElementById("mode");
const hintEl = document.getElementById("hint");
const statusEl = document.getElementById("status");
const flattenBtn = document.getElementById("flattenBtn");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(NAVY, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 250);
camera.position.set(3.4, 2.0, 4.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 1.4;
controls.maxDistance = 12;
controls.target.set(0, 0.7, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x1b2a4a, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(5, 10, 4);
key.castShadow = true;
scene.add(key);
const rim = new THREE.DirectionalLight(ORANGE, 0.65);
rim.position.set(-4, 3, -5);
scene.add(rim);

// Living QR module grid (ICQR pattern — voxels that are the code)
const gridGroup = new THREE.Group();
scene.add(gridGroup);
const moduleMat = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.5, metalness: 0.1 });
const paperMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.88 });
const accentMat = new THREE.MeshStandardMaterial({
  color: ORANGE, roughness: 0.32, metalness: 0.18, emissive: ORANGE, emissiveIntensity: 0.14,
});
function hash(i, j) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x >>> 0) % 1000) / 1000;
}
const N = 29, CELL = 0.085, mods = [];
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
    } else on = hash(i, j) > 0.47;
    if (!on) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.9, CELL * 0.42, CELL * 0.9), moduleMat);
    m.position.set((i - N / 2) * CELL, CELL * 0.22, (j - N / 2) * CELL);
    m.castShadow = true;
    m.userData = { baseY: m.position.y, phase: hash(i, j) * Math.PI * 2 };
    gridGroup.add(m);
    mods.push(m);
  }
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(N * CELL + 0.4, N * CELL + 0.4), paperMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.005;
floor.receiveShadow = true;
gridGroup.add(floor);
const frame = new THREE.Mesh(new THREE.BoxGeometry(N * CELL + 0.28, 0.045, N * CELL + 0.28), accentMat);
frame.position.y = 0.02;
gridGroup.add(frame);

let boom = null;
let baseScale = 1;
let flat = false;
let flatT = 0;

function fitProduct(obj) {
  // Product-style framing: boom arm reads left→right
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);

  // Rotate so longest horizontal axis is X
  if (size.z >= size.x && size.z >= size.y) obj.rotation.y = Math.PI / 2;
  if (size.y > size.x * 1.15 && size.y > size.z * 1.15) obj.rotation.z = Math.PI / 2;

  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);

  const target = 2.35;
  const longest = Math.max(size.x, size.y, size.z) || 1;
  const s = target / longest;
  obj.scale.setScalar(s);
  obj.updateMatrixWorld(true);
  box.setFromObject(obj);
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);
  // Sit just above QR grid
  const min = box.min.clone().sub(center).multiplyScalar(s);
  // recompute after scale
  box.setFromObject(obj);
  obj.position.y -= box.min.y;
  obj.position.y += 0.12;
  boom.userData.restY = obj.position.y;

  controls.target.set(0, Math.max(0.55, size.y * 0.35), 0);
  camera.position.set(2.8, 1.55 + size.y * 0.25, 3.5);
  controls.update();
  return s;
}

function polishTwin(root) {
  const skip = /垫|螺钉|螺柱|开口销|PART_244|PART_609|PART_602|GB_T|自攻|十字槽|环芯|washer|bolt|nut|screw/i;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = `${o.name}|${o.parent?.name || ""}`;
    if (skip.test(name)) {
      o.visible = false;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.geometry && !o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry?.boundingSphere?.radius || 0;
    if (r > 0 && r < 0.012) o.visible = false;
    // Keep original materials when possible (golden twin is painted); boost metalness slightly
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.isMeshStandardMaterial) {
          m.envMapIntensity = 1.1;
          m.needsUpdate = true;
        }
      }
    }
  });
}

const MODEL = "./pb4000_master.compressed.glb";
statusEl.textContent = "Fetching golden PB4000 twin…";
new GLTFLoader().load(
  MODEL,
  (gltf) => {
    boom = gltf.scene;
    polishTwin(boom);
    baseScale = fitProduct(boom);
    scene.add(boom);
    modeEl.textContent = "Idle · real PB4000 twin on the QR grid · tap to flatten";
    statusEl.textContent = "Golden twin loaded · PORTABOOM® PB4000";
  },
  (e) => {
    if (e.total) statusEl.textContent = `Loading twin… ${Math.round((100 * e.loaded) / e.total)}%`;
  },
  (err) => {
    console.error(err);
    modeEl.textContent = "Twin failed to load";
    statusEl.textContent = String(err?.message || err);
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
  flattenBtn.textContent = flat ? "Raise boom" : "Flatten to QR";
  if (flat) {
    modeEl.textContent = "Flattened · scan-proof QR (H) · PB4000 product";
    hintEl.innerHTML = "QR ready. <strong>Scan</strong> with Camera, or open the product page.";
    if (!gridGroup.userData.qrPlane) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(N * CELL, N * CELL),
        new THREE.MeshBasicMaterial({ map: qrTex })
      );
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.07;
      gridGroup.add(plane);
      gridGroup.userData.qrPlane = plane;
    }
  } else {
    modeEl.textContent = "Idle · real PB4000 twin on the QR grid · tap to flatten";
    hintEl.innerHTML =
      "Real PB4000 twin on a living QR grid. <strong>Tap</strong> to flatten into a scan-proof code.";
  }
}
flattenBtn.addEventListener("click", () => setFlat(!flat));

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
  flatT = Math.min(1, flatT + 0.04);
  const k = flat ? flatT : 1 - flatT;
  for (const m of mods) {
    const breathe = Math.sin(t * 2.1 + m.userData.phase) * 0.022;
    const jump = Math.max(0, Math.sin(t * 2.8 + m.userData.phase)) * 0.035;
    m.position.y = THREE.MathUtils.lerp(m.userData.baseY + breathe + jump, 0.03, k);
    m.scale.y = THREE.MathUtils.lerp(1, 0.12, k);
    m.visible = k < 0.96;
  }
  if (gridGroup.userData.qrPlane) gridGroup.userData.qrPlane.visible = k > 0.5;
  if (boom) {
    boom.visible = k < 0.9;
    const rest = boom.userData.restY ?? 0.5;
    boom.position.y = THREE.MathUtils.lerp(rest + Math.sin(t * 1.35) * 0.025, 0.06, k);
    boom.rotation.y = t * 0.12 * (1 - k);
    boom.scale.setScalar(baseScale * THREE.MathUtils.lerp(1, 0.04, k));
  }
  controls.enabled = !flat;
  controls.update();
  renderer.render(scene, camera);
}
tick();
