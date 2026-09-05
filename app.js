import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xfce3cc;
const STEEL = 0xc5cad3;
const INK = 0x202020;
const DEST = "https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/";

const canvas = document.getElementById("stage");
const hintEl = document.getElementById("hint");
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
renderer.setClearColor(NAVY, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(NAVY);
scene.fog = new THREE.Fog(NAVY, 10, 22);

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
  new THREE.MeshStandardMaterial({ color: 0x152238, roughness: 1, metalness: 0 })
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

function fitObject(obj, targetLen = 2.25) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);
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
  obj.position.y = Math.max(0.52, size.y * 0.5 + 0.16);
  return s;
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

new GLTFLoader().load(
  new URL("./pb4000_named.glb", import.meta.url).href,
  (gltf) => {
    try {
      const cad = gltf.scene;
      cad.name = "Pb4000Named";
      const probe = new THREE.Box3().setFromObject(cad);
      const probeSize = probe.getSize(new THREE.Vector3());
      if (Math.max(probeSize.x, probeSize.y, probeSize.z) < 0.05) {
        setStatus("Placeholder GLB. Hero stand-in stays until Master Builder pushes M6.");
        return;
      }
      paintGlb(cad);
      const s = fitObject(cad, 2.25);
      removeHero();
      boom = cad;
      baseScale = s;
      boom.userData.restY = boom.position.y;
      scene.add(boom);
      usingGlb = true;
      setStatus("Idle. PB4000 twin on QR grid. Tap to flatten.");
    } catch (err) {
      console.error(err);
      setStatus("CAD parse error. Hero stand-in still live.");
    }
  },
  (e) => {
    if (e.total && !usingGlb) {
      setStatus(`Loading PB4000 twin ${Math.round((100 * e.loaded) / e.total)}%.`);
    }
  },
  (err) => {
    console.error(err);
    setStatus("CAD blocked. Hero stand-in still live. Tap to flatten.");
  }
);

function setFlat(next) {
  flat = next;
  flatT = 0;
  if (flat) {
    setStatus("Flattened. Scan-proof QR error H. PB4000 product.");
    hintEl.innerHTML = "QR ready. Scan with Camera, or open the product page.";
  } else {
    setStatus(usingGlb
      ? "Idle. PB4000 twin on QR grid. Tap to flatten."
      : "Idle. PORTABOOM hero on QR grid. Tap to flatten.");
    hintEl.textContent = "Tap the boom. Navy modules flatten to a scan-H plane.";
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
  renderer.render(scene, camera);
}
tick();
