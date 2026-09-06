import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DEST, ECC, encodeDestMatrix, downloadPrintPng } from "./qr-encode.js";
import { buildLivingQr } from "./living-qr.js";

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const CREAM = 0xfce3cc;
const STEEL = 0xc5cad3;
const INK = 0x202020;

/** twin-core livery.ts palette. Do not invent hex. */
const LIVERY = Object.freeze({
  Y: 0xf47514, // powder orange cabinet
  S: 0xcdd0d5, // stainless
  K: 0x222426, // wheels / dark
  R: 0xc41a1a,
  A: 0xe07b12,
});
/** CAD RGB → tag. Same table as twin-core `ut`. */
const LIVERY_RGB = Object.freeze({
  "255,55,0": "Y", "255,255,226": "Y", "255,255,90": "Y", "13,79,90": "Y",
  "0,255,0": "Y", "1,104,10": "Y", "61,104,255": "Y",
  "183,202,222": "S", "87,111,133": "S", "123,147,179": "S", "208,20,255": "S",
  "8,9,11": "K", "255,255,255": "K", "34,34,0": "K", "17,20,22": "K",
  "18,21,25": "K", "13,15,17": "K", "63,37,133": "K", "18,18,17": "K",
  "34,4,0": "K", "114,1,17": "K", "13,73,255": "K", "11,74,101": "K",
  "8,2,4": "K", "56,0,0": "K", "78,72,67": "K", "24,10,39": "K",
  "0,88,166": "K", "3,75,145": "K", "19,12,55": "K", "46,27,150": "K",
  "114,10,0": "K", "32,3,5": "K",
  "66,131,184": "B", "169,109,246": "B",
  "255,0,0": "R", "183,14,1": "R", "117,191,23": "R", "191,101,0": "R", "10,60,4": "R",
  "133,35,5": "A",
  "222,255,24": "G",
});
/** twin-core sign.ts — STOP face default round. Clamp visible while mounted. */
let signType = "round";
let signGroup = null;
/** PB4000 manual + Fabian: cabinet 1153×415 mm, boom 4 m class, STOP Ø 400 mm. */
const REAL = Object.freeze({
  boomM: 4.0,
  cabinetHM: 1.153,
  cabinetWM: 0.415,
  signDM: 0.40,
  /**
   * Hero studio tape (TAS pb4000.jpg / WZS Porta_Boom_Large_LP):
   * period ≈ 330–345 mm (~12 repeats on a 4 m arm); red≈gap (duty ≈ 0.48);
   * lean-forward chevrons. tidy4 0.22 local / duty 0.33 was too tight + too thin.
   */
  stripePeriodM: 0.34,
  stripeRedDuty: 0.48,
});
/** Fraction of boom tip length. Hero: not at tip — ~1/6 of arm past the face. */
const SIGN_ALONG_DEFAULT = 0.72;
const SIGN_ALONG_MIN = 0.32;
const SIGN_ALONG_MAX = 0.90;
const SIGN_NUDGE = 0.04;
let signAlong = SIGN_ALONG_DEFAULT;
let signRadiusLocal = REAL.signDM / 2;
let stripePeriodLocal = 0.22;
let plantedProof = null;

/** Hero SoT boom tape — retuned pass 2 vs photo (not tidy4 0.22/0.33 local). */
const STRIPE = {
  get period() { return stripePeriodLocal; },
  redDuty: REAL.stripeRedDuty,
  slant: 1.0,
  red: [0.753, 0.078, 0.129],
  white: [0.94, 0.945, 0.95],
};

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
const HOME = {
  pos: new THREE.Vector3(0, 1.5, 5.4),
  tgt: new THREE.Vector3(0, 1.1, 0),
  fov: 32,
};
let camGlide = null;
let lampMats = { red: null, amber: null, green: null };
let lampHalos = { red: null, amber: null, green: null };
let lampLights = { red: null, amber: null, green: null };
let signalAspect = "green";

/** twin-core lights.ts KINDCOL — face LEDs match the 3-aspect head family. */
const KINDCOL = Object.freeze({ red: 0xff2a1a, amber: 0xffa51e, green: 0x2aff55 });
const FACE_GREEN = KINDCOL.green;
const FACE_GREEN_BASE = 0x062c10;
const FACE_RED = KINDCOL.red;
const FACE_RED_BASE = 0x3a0000;
const STRIP_GREEN = KINDCOL.green;
const STRIP_RED = KINDCOL.red;

/** 3-aspect signal head — same KINDCOL as door faces. */
const LAMP_COL = { red: KINDCOL.red, amber: KINDCOL.amber, green: KINDCOL.green };

function makeFaceLedMat(ready) {
  return new THREE.MeshStandardMaterial({
    color: ready ? FACE_GREEN_BASE : FACE_RED_BASE,
    emissive: ready ? FACE_GREEN : FACE_RED,
    emissiveIntensity: ready ? 5.5 : 2.4,
    roughness: 0.15,
    metalness: 0.04,
    toneMapped: false,
  });
}

function stainlessMat() {
  return new THREE.MeshStandardMaterial({
    color: LIVERY.S, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2,
  });
}

/** twin-core sign.ts Be() — AS STOP red #c01421, white legend, round or octagon. */
function makeStopTex(type) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.lineJoin = "round";
  const red = "#c01421";
  const white = "#ffffff";
  const cx = size / 2;
  const cy = size / 2;
  if (type === "octagon") {
    const oct = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + i * Math.PI / 4;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    ctx.fillStyle = white;
    oct(size / 2);
    ctx.fill();
    ctx.fillStyle = red;
    oct(size * 0.44);
    ctx.fill();
  } else {
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
  }
  const hl = ctx.createRadialGradient(size * 0.78, size * 0.74, size * 0.04, cx, cy, size * 0.5);
  hl.addColorStop(0, "rgba(255,255,255,0.18)");
  hl.addColorStop(0.4, "rgba(255,255,255,0.04)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.fillStyle = white;
  ctx.font = `900 ${Math.round(size * 0.27)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI);
  ctx.fillText("STOP", 0, -size * 0.015);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** twin-core sign.ts Ve() — mount STOP on boom pivot. */
function buildSign() {
  if (signGroup) {
    signGroup.parent && signGroup.parent.remove(signGroup);
    signGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        if (o.material.emissiveMap) o.material.emissiveMap.dispose();
        o.material.dispose();
      }
    });
    signGroup = null;
  }
  if (!boomRig?.pivot) return;
  const type = signType === "octagon" ? "octagon" : "round";
  const radius = signRadiusLocal;
  const tex = makeStopTex(type);
  const wrap = new THREE.Group();
  wrap.name = "PortaboomStopSign";
  const faceMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.26,
    metalness: 0.05,
    envMapIntensity: 2,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: tex,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x8a7b65,
    metalness: 0.7,
    roughness: 0.4,
  });
  let faceGeo;
  let backGeo;
  if (type === "octagon") {
    const shape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i) shape.lineTo(x, y);
      else shape.moveTo(x, y);
    }
    shape.closePath();
    faceGeo = new THREE.ShapeGeometry(shape);
    const pos = faceGeo.attributes.position;
    const uv = faceGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + radius) / (2 * radius), (pos.getY(i) + radius) / (2 * radius));
    }
    uv.needsUpdate = true;
    backGeo = new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.012, 8);
  } else {
    faceGeo = new THREE.CircleGeometry(radius, 72);
    backGeo = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.012, 72);
  }
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.name = "PortaboomStopFace";
  face.castShadow = true;
  const back = new THREE.Mesh(backGeo, backMat);
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.015;
  const inner = new THREE.Group();
  inner.name = "PortaboomStopInner";
  inner.add(back);
  inner.add(face);
  wrap.add(inner);
  boomRig.pivot.add(wrap);
  signGroup = wrap;
  placeSign();
  tickSignUpright();
  if (boom) classifyGroups(boom);
}

function placeSign() {
  if (!signGroup || !boomRig) return;
  const tipY = boomRig.tipY != null ? boomRig.tipY : 1.6;
  const along = tipY * signAlong;
  if (boomRig.tipAxis === "x") signGroup.position.set(along, 0, 0.1);
  else signGroup.position.set(0, along, 0.1);
}

function setSignAlong(t) {
  signAlong = Math.max(SIGN_ALONG_MIN, Math.min(SIGN_ALONG_MAX, Number(t)));
  placeSign();
  syncDock();
}

function nudgeSign(dir) {
  setSignAlong(signAlong + dir * SIGN_NUDGE);
}

/**
 * 180° canvas legend + full pivot cancel. Boom-up rest is ≈π; holding
 * that rest (only cancelling the drop delta) left STOP inverted against
 * CanvasTexture flipY. Counter the whole pivot.z so wording stays
 * world-upright in the default boom-up view and as the arm lowers.
 */
function tickSignUpright() {
  if (!signGroup || !boomRig?.pivot) return;
  const inner = signGroup.getObjectByName("PortaboomStopInner") || signGroup.children[0];
  if (!inner) return;
  inner.rotation.z = -boomRig.pivot.rotation.z;
}

function setSignType(type) {
  signType = type === "octagon" ? "octagon" : "round";
  buildSign();
  syncDock();
}

function worldSizeOf(o) {
  if (!o) return new THREE.Vector3();
  return worldBox(o).getSize(new THREE.Vector3());
}

/** Uniform-ish world scale of an object (column length of matrixWorld). */
function worldScaleAbs(o) {
  if (!o) return 1;
  o.updateWorldMatrix(true, false);
  const sc = new THREE.Vector3();
  o.getWorldScale(sc);
  return Math.max(Math.abs(sc.x), 1e-6);
}

/**
 * Measured STOP face diameter in planted world units.
 * Do not use root.scale alone: BoomPivot.attach() compensates plant scale
 * so new children of the pivot sit at world scale ≈ 1, not plant 0.50.
 */
function measureSignWorldDiameter() {
  const face = signGroup?.getObjectByName("PortaboomStopFace");
  if (!face) return plantedProof?.signDiameterWorld ?? null;
  // Vertex/circle diameter: 2 × localR × face world scale (not AABB —
  // an octagon AABB is flat-to-flat, ~8% short of Ø400 mm).
  return +(2 * signRadiusLocal * worldScaleAbs(face)).toFixed(4);
}

/**
 * Prove Ø400 mm on the planted twin. GLB is not 1 unit = 1 m after
 * plantTwin (hero box → 1.28). Ruler is cabinet height (manual 1.153 m).
 * STOP is parented to BoomPivot; stripe meshes keep plant world scale.
 */
function measurePlantedScale(root) {
  const scaleFactor = root?.scale?.x || 1;
  const tipY = boomRig?.tipY != null ? Math.abs(boomRig.tipY) : 0;
  const boomLengthCad = tipY;
  const pivot = boomRig?.pivot;
  const pivotWorldScale = pivot ? worldScaleAbs(pivot) : scaleFactor;
  let meshWorldScale = scaleFactor;
  root?.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData?.tag !== "B" && !o.material?.userData?.stripe) return;
    meshWorldScale = worldScaleAbs(o);
  });
  const boomLengthWorld = tipY * pivotWorldScale;
  let door = null;
  root?.traverse((o) => {
    if (!door && /^115-DOOR$|^115_DOOR$|HeroCabinet/i.test(o.name || "")) door = o;
  });
  const doorSz = door ? worldSizeOf(door) : new THREE.Vector3();
  const doorHeightWorld = doorSz.y || 0;
  const doorWidthWorld = Math.max(doorSz.x || 0, doorSz.z || 0);
  const doorHeightCad = scaleFactor ? doorHeightWorld / scaleFactor : 0;
  const doorWidthCad = scaleFactor ? doorWidthWorld / scaleFactor : 0;

  const doorOk = doorHeightWorld > 0.15;
  const metresPerWorld = doorOk
    ? REAL.cabinetHM / doorHeightWorld
    : (boomLengthWorld > 0.05 ? REAL.boomM / boomLengthWorld : 1 / Math.max(pivotWorldScale, 1e-6));

  const signDiameterWorld = REAL.signDM / metresPerWorld;
  signRadiusLocal = signDiameterWorld / (2 * pivotWorldScale);
  stripePeriodLocal = metresPerWorld > 0 && meshWorldScale > 1e-6
    ? REAL.stripePeriodM / metresPerWorld / meshWorldScale
    : REAL.stripePeriodM;

  const how = doorOk
    ? `Ø400mm world=${signDiameterWorld.toFixed(4)}=0.40/(1.153/doorH ${doorHeightWorld.toFixed(3)}); localR=${signRadiusLocal.toFixed(4)}=worldD/(2×pivotWorldScale ${pivotWorldScale.toFixed(4)}); plant ${scaleFactor.toFixed(4)} · m/world ${metresPerWorld.toFixed(3)} · meshScale ${meshWorldScale.toFixed(4)}`
    : `Ø400mm world = 0.40 × boomWorld / 4.0 (door fallback)`;

  plantedProof = {
    scaleFactor,
    pivotWorldScale,
    meshWorldScale,
    boomLengthWorld,
    boomLengthCad,
    boomLengthM: REAL.boomM,
    impliedBoomM: boomLengthWorld * metresPerWorld,
    doorHeightWorld,
    doorWidthWorld,
    doorHeightCad,
    doorWidthCad,
    metresPerWorld,
    signDiameterM: REAL.signDM,
    signDiameterWorld,
    signRadiusLocal,
    stripePeriodLocal,
    stripePeriodM: REAL.stripePeriodM,
    stripeRedDuty: REAL.stripeRedDuty,
    derived: how,
  };
  if (root?.userData) root.userData.plantedProof = plantedProof;
  return plantedProof;
}

function repaintBoomStripes(root) {
  if (!root) return 0;
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData?.tag !== "B" && !o.material?.userData?.stripe) return;
    o.material = stripeMaterial(o.geometry);
    n += 1;
  });
  return n;
}

function isDiscLikeMesh(o) {
  if (!o?.isMesh || !o.geometry) return false;
  if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
  const sz = o.geometry.boundingBox.getSize(new THREE.Vector3());
  const sorted = [sz.x, sz.y, sz.z].sort((a, b) => a - b);
  return sorted[0] < 0.08 && Math.abs(sorted[1] - sorted[2]) < 0.16 && sorted[1] > 0.06;
}

/** Kill leftover CAD lime/yellow glow discs (tag G / 灯条 orbs / sprites). */
function killStrayGlowDiscs(root) {
  if (!root) return [];
  const killed = [];
  const keep = /PortaboomFaceLed|PortaboomLedBezel|PortaboomStopSign|SignalLens_|SignalHalo_|HeroLens_|HeroSignal/;
  const kill = [];
  root.traverse((o) => {
    if (keep.test(o.name || "") || keep.test(o.parent?.name || "")) return;
    if (o.isSprite) {
      kill.push(o);
      return;
    }
    if (!o.isMesh) return;
    const n = `${o.name || ""}|${o.parent?.name || ""}`;
    if (o.userData?.tag === "G" || o.userData?.liveryTag === "G") {
      kill.push(o);
      return;
    }
    if (/灯条/.test(n) && isDiscLikeMesh(o)) {
      kill.push(o);
      return;
    }
    const mat = firstMat(o);
    const em = mat?.emissive ? mat.emissive.getHex() : 0;
    const col = mat?.color ? mat.color.getHex() : 0;
    const bright = (mat?.emissiveIntensity || 0) > 0.4;
    const lime = em === 0x39e562 || em === 0xbdf7c8 || col === 0xbdf7c8 || col === 0xdeff18;
    if (isDiscLikeMesh(o) && bright && lime) kill.push(o);
  });
  kill.forEach((o) => {
    o.visible = false;
    killed.push(o.name || o.type);
    if (o.parent) o.parent.remove(o);
  });
  if (root.userData) root.userData.strayGlowKilled = killed;
  return killed;
}

function classifyLiveryRgb(r, g, b) {
  const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  let tag = null;
  let best = 1e9;
  for (const key of Object.keys(LIVERY_RGB)) {
    const t = key.split(",").map(Number);
    const d = (rgb[0] - t[0]) ** 2 + (rgb[1] - t[1]) ** 2 + (rgb[2] - t[2]) ** 2;
    if (d < best) {
      best = d;
      tag = LIVERY_RGB[key];
    }
  }
  return best <= 900 ? tag : null;
}

/** twin-core `ft()` — powder-coat Physical. */
function alumMat() {
  return new THREE.MeshStandardMaterial({
    color: LIVERY.S, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2,
  });
}

function powderMat(hex = LIVERY.Y) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.15,
    sheen: 0.25,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
  });
}

/**
 * Hero SoT boom tape (real PB4000 photo):
 * silver/white arm, 45° chevrons leaning away from cabinet,
 * white gaps ~2× red width, deep #c01421 — not 50/50 coral bands.
 */
function stripeMaterial(geometry) {
  if (geometry && !geometry.boundingBox) geometry.computeBoundingBox();
  const t = new THREE.Vector3();
  if (geometry?.boundingBox) geometry.boundingBox.getSize(t);
  else t.set(1, 0.1, 0.1);
  const axis = t.x >= t.y && t.x >= t.z ? "x" : t.y >= t.z ? "y" : "z";
  const cross = axis === "x" ? "y" : "x";
  const period = STRIPE.period;
  const redDuty = STRIPE.redDuty;
  const slant = STRIPE.slant;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xe8eaee,
    metalness: 0.22,
    roughness: 0.28,
    clearcoat: 0.55,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.4,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
    toneMapped: false,
  });
  mat.userData.stripe = true;
  mat.userData.stripePeriod = period;
  mat.userData.stripeRedDuty = redDuty;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vOPos;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\nvOPos = position;`
    );
    shader.fragmentShader = `varying vec3 vOPos;\n${shader.fragmentShader}`
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
       float u = fract((vOPos.${axis} + vOPos.${cross} * ${slant.toFixed(2)}) / ${period.toFixed(3)});
       float band = step(u, ${redDuty.toFixed(3)});
       vec3 white = vec3(${STRIPE.white[0]},${STRIPE.white[1]},${STRIPE.white[2]});
       vec3 red   = vec3(${STRIPE.red[0]},${STRIPE.red[1]},${STRIPE.red[2]});
       diffuseColor.rgb = mix(white, red, band);`
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
       roughnessFactor *= mix(0.42, 0.62, band);`
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
       metalnessFactor *= mix(0.28, 0.04, band);`
      );
  };
  return mat;
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

const destQr = encodeDestMatrix();
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let viewMode = "world"; // world = ICQR default 3D · scan = tap-to-scan pose
let scanOpen = false;
let lifeOn = !reduced;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
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
renderer.toneMappingExposure = 1.05;
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

const unitCam = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
unitCam.position.set(0, 1.5, 5.4);
unitCam.lookAt(0, 1.1, 0);
const scanCam = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.05, 80);
/** Dead-on +Y ortho of the XZ caps. OrbitControls must not own this camera. */
const SCAN_POSE = {
  pos: new THREE.Vector3(0, 8, 0.0001),
  tgt: new THREE.Vector3(0, 0, 0),
};
scanCam.position.copy(SCAN_POSE.pos);
scanCam.up.set(0, 0, -1);
scanCam.lookAt(SCAN_POSE.tgt);
let camera = unitCam;

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
  ctx.fillStyle = "#2a2d33";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3200; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const n = 40 + Math.random() * 50;
    ctx.fillStyle = `rgba(${n},${n + 2},${n + 6},${0.14 + Math.random() * 0.18})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
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
    color: 0xb4b8be,
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
  g.addColorStop(0, "rgba(255,214,170,0.42)");
  g.addColorStop(0.45, "rgba(255,190,130,0.16)");
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
  cove.position.set(0, 3.4, -4.8);
  studioGroup.add(cove);
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 6),
    new THREE.MeshBasicMaterial({
      color: 0x1a2433,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  haze.position.set(0, 1.6, -4.6);
  studioGroup.add(haze);
}
studioGroup.visible = true;
scene.add(studioGroup);

const living = buildLivingQr(THREE, {
  matrix: destQr.matrix,
  dest: DEST,
  livery: LIVERY,
  kindcol: KINDCOL,
});
const grid = living.group;
grid.name = "QrModuleGrid";
grid.visible = true;
scene.add(grid);
const mods = living.mods;
const paperMat = living.paperMat;
const scanPlane = null;

function makeHeroBoom() {
  const g = new THREE.Group();
  g.name = "portaboom-hero-standin";
  const matCab = powderMat(LIVERY.Y);
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.42, metalness: 0.14 });
  const matSteel = new THREE.MeshStandardMaterial({ color: LIVERY.S, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.2 });
  const matBlack = new THREE.MeshStandardMaterial({ color: LIVERY.K, roughness: 0.62, metalness: 0.18 });

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
  const armGeom = new THREE.BoxGeometry(armLen, 0.09, 0.12);
  const armMain = new THREE.Mesh(armGeom, stripeMaterial(armGeom));
  armMain.position.x = armLen / 2;
  armMain.castShadow = true;
  arm.add(armMain);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(armLen * 0.92, 0.025, 0.125), makeFaceLedMat(true));
  stripe.name = "PortaboomBoomStrip";
  stripe.position.set(armLen / 2, 0.02, 0);
  arm.add(stripe);
  const tipGeom = new THREE.BoxGeometry(0.12, 0.12, 0.14);
  const tip = new THREE.Mesh(tipGeom, stripeMaterial(tipGeom));
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
  const bezelMat = alumMat();
  const heroFaceMats = [];
  for (const dx of [-0.09, 0.09]) {
    const faceMat = makeFaceLedMat(true);
    heroFaceMats.push(faceMat);
    const bezel = new THREE.Mesh(new THREE.CircleGeometry(0.055, 36), bezelMat);
    bezel.name = "PortaboomLedBezel";
    bezel.position.set(-0.85 + dx, 0.28, 0.354);
    g.add(bezel);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 48), faceMat);
    lens.position.set(-0.85 + dx, 0.28, 0.357);
    lens.name = "PortaboomFaceLed";
    g.add(lens);
  }
  g.userData.heroArm = arm;
  g.userData.heroFaceMat = heroFaceMats[0];
  g.userData.heroFaceMats = heroFaceMats;
  g.position.y = 0.02;
  return g;
}

let boom = makeHeroBoom();
boom.userData.plantedYaw = Math.PI;
boom.rotation.y = boom.userData.plantedYaw;
boom.visible = true;
scene.add(boom);
bindGroups(boom);
applyCoreShowConfig(boom);
placeTwinInLivingWorld();
initOrbit(boom);
applyWorldPose();
if (canvas) canvas.dataset.iqrReady = "1";
let usingGlb = false;
let baseScale = 1;
let flat = false;
let flatT = 0;
let boomRig = null;
let unitHomeCaptured = false;

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
  const distH = (size.y * 1.38) / (2 * Math.tan(fov / 2));
  const distW = (Math.max(size.x, size.z) * 1.72) / (2 * Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW, 1.7);
  camera.position.set(
    center.x + faceDir.x * dist,
    center.y + size.y * 0.16,
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
    if (/太阳能板|太阳能板支架|固定板|管套|调节螺柱|^太阳能|solar|^柱子/i.test(n)) solarHits.push(o);
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
  classifyGroups(root);
  return groups;
}

/**
 * twin-core classifyGroups extras for this first-format bake:
 * hide unused 2nd-head mast AK-XLH-D115C-03 + its spare socket;
 * hide CAD stop clamp (快速夹具) unless a STOP face is mounted.
 */
function classifyGroups(root) {
  const hidden = { mast: [], spareSocket: [], stopClamp: [] };
  if (!root) return hidden;
  const sockets = [];
  const stopMounted = signType === "round" || signType === "octagon" || signType === "STOP";
  root.traverse((o) => {
    const n = o.name || "";
    if (/AK-XLH-D115C-03|^柱子/i.test(n)) {
      o.visible = false;
      hidden.mast.push(n);
      return;
    }
    if (/AK-XLH-D115C-01-01-11/i.test(n) && o.isMesh) sockets.push(o);
    if (/快速夹具|^夹具$/i.test(n)) {
      o.visible = !!stopMounted;
      if (!stopMounted) hidden.stopClamp.push(n);
    }
  });
  const keep = groups.traffic[0] || null;
  if (sockets.length >= 2 && keep) {
    const hc = worldBox(keep).getCenter(new THREE.Vector3());
    sockets.sort((a, b) => {
      const da = worldBox(a).getCenter(new THREE.Vector3()).distanceToSquared(hc);
      const db = worldBox(b).getCenter(new THREE.Vector3()).distanceToSquared(hc);
      return da - db;
    });
    const spare = sockets[sockets.length - 1];
    spare.visible = false;
    hidden.spareSocket.push(spare.name || "AK-XLH-D115C-01-01-11");
  } else if (sockets.length && !keep) {
    sockets.forEach((s) => {
      s.visible = false;
      hidden.spareSocket.push(s.name || "AK-XLH-D115C-01-01-11");
    });
  }
  root.userData.classifyHidden = hidden;
  return hidden;
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
  else if (boom) paintTrafficPolesStainless(boom);
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
  controls.maxPolarAngle = Math.PI * 0.72;
  controls.minPolarAngle = 0.55;
  controls.minDistance = 3.2;
  controls.maxDistance = 16;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.target.set(0, 0.7, 0);
  controls.update();
  framed = true;
  return controls;
}

function fitScanOrtho() {
  const w = Math.max(1, canvas.clientWidth || innerWidth);
  const h = Math.max(1, canvas.clientHeight || innerHeight);
  const aspect = w / h;
  const padSize = living.padSize;
  const fracW = 0.82;
  const worldW = padSize / fracW;
  const worldH = worldW / aspect;
  scanCam.left = -worldW / 2;
  scanCam.right = worldW / 2;
  scanCam.top = worldH / 2;
  scanCam.bottom = -worldH / 2;
  scanCam.near = 0.05;
  scanCam.far = 80;
  scanCam.updateProjectionMatrix();
}

function placeTwinInLivingWorld() {
  if (!boom) return;
  // Center of the branded field. Wheels on the plaza; boom reaches over the towers.
  boom.position.x = 0;
  boom.position.z = 0.12;
  boom.visible = !scanOpen;
  boom.userData.livingPlanted = true;
}

/** Default share pose: 3/4 product hero on the plaza — not an aerial of the QR field. */
function lockWorldCamera() {
  if (!boom) return;
  camera = unitCam;
  const hero = gatherHeroBox(boom);
  const full = worldBox(boom);
  const size = hero.getSize(new THREE.Vector3());
  const fullSize = full.getSize(new THREE.Vector3());
  const center = hero.getCenter(new THREE.Vector3());
  const yaw = boom.rotation.y || Math.PI;
  const face = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const side = new THREE.Vector3(face.z, 0, -face.x);
  unitCam.fov = 32;
  unitCam.near = 0.05;
  unitCam.far = 80;
  unitCam.updateProjectionMatrix();
  const fov = THREE.MathUtils.degToRad(unitCam.fov);
  const aspect = Math.max(0.42, unitCam.aspect || 0.46);
  const distH = (size.y * 1.62) / (2 * Math.tan(fov / 2));
  const distW = (Math.max(size.x, size.z) * 1.85) / (2 * Math.tan(fov / 2) * aspect);
  const dist = Math.max(distH, distW, 2.15);
  unitCam.position.set(
    center.x + face.x * dist * 0.82 + side.x * dist * 0.48 + fullSize.x * 0.06,
    center.y + size.y * 0.14,
    center.z + face.z * dist * 0.82 + side.z * dist * 0.48
  );
  const look = new THREE.Vector3(
    center.x + fullSize.x * 0.16,
    center.y - size.y * 0.02,
    center.z
  );
  unitCam.lookAt(look);
  unitCam.updateProjectionMatrix();
  unitCam.userData.worldLook = look;
}

function applyWorldPose() {
  scanOpen = false;
  viewMode = "world";
  camera = unitCam;
  if (boom) boom.visible = true;
  studioGroup.visible = true;
  grid.visible = true;
  if (living.scanPad) living.scanPad.visible = false;
  if (living.apron) living.apron.visible = true;
  if (living.ring) living.ring.visible = true;
  if (paperMat?.color) paperMat.color.setHex(0xf4efe6);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background.setHex(0x0d0d12);
  renderer.setClearColor(0x0d0d12, 1);
  if (controls) {
    controls.object = unitCam;
    controls.enabled = true;
  }
  unitCam.near = 0.05;
  unitCam.far = 80;
  placeTwinInLivingWorld();
  if (boom) {
    lockWorldCamera();
    const look = unitCam.userData.worldLook || new THREE.Vector3(0, 0.7, 0);
    if (controls) {
      const offset = unitCam.position.clone().sub(look);
      const polar = Math.atan2(Math.hypot(offset.x, offset.z), Math.max(0.05, offset.y));
      controls.target.copy(look);
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.minPolarAngle = Math.max(0.55, polar - 0.28);
      controls.maxPolarAngle = Math.min(Math.PI * 0.49, polar + 0.22);
      controls.minDistance = 2.4;
      controls.maxDistance = 14;
      controls.update();
    }
    captureHome();
  } else if (HOME.pos.lengthSq() > 0.01) {
    unitCam.position.copy(HOME.pos);
    unitCam.fov = HOME.fov || 34;
    unitCam.updateProjectionMatrix();
    unitCam.lookAt(HOME.tgt);
  }
  setStatus("Living QR · tap to scan the field");
  syncModeHud();
}

function applyScanPose() {
  scanOpen = true;
  viewMode = "scan";
  if (boom) boom.visible = false;
  studioGroup.visible = false;
  grid.visible = true;
  if (living.scanPad) living.scanPad.visible = true;
  if (living.apron) living.apron.visible = false;
  if (living.ring) living.ring.visible = false;
  if (paperMat?.color) paperMat.color.setHex(0xffffff);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.12;
  scene.background.setHex(0xffffff);
  renderer.setClearColor(0xffffff, 1);
  camera = scanCam;
  if (controls) {
    controls.enabled = false;
    controls.autoRotate = false;
  }
  fitScanOrtho();
  scanCam.up.set(0, 0, -1);
  scanCam.position.copy(SCAN_POSE.pos);
  scanCam.lookAt(SCAN_POSE.tgt);
  scanCam.updateProjectionMatrix();
  setStatus("Scan pose · point a phone at the field");
  syncModeHud();
}

function toggleScan() {
  if (scanOpen) applyWorldPose();
  else applyScanPose();
}

function applyUnitPose() {
  camera = unitCam;
  if (controls) controls.object = unitCam;
  unitCam.near = 0.05;
  unitCam.far = 80;
  if (HOME.pos.lengthSq() > 0.01) {
    unitCam.position.copy(HOME.pos);
    unitCam.fov = HOME.fov || 32;
  }
  unitCam.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(HOME.tgt);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 0.85;
    controls.maxDistance = 12;
    controls.update();
  } else {
    unitCam.lookAt(HOME.tgt);
  }
}

function captureHome() {
  HOME.pos.copy(unitCam.position);
  HOME.fov = unitCam.fov;
  if (controls) HOME.tgt.copy(controls.target);
  else HOME.tgt.set(0, 0.7, 0);
}

function qrPose() {
  return {
    pos: new THREE.Vector3(0, 8, 0.0001),
    tgt: new THREE.Vector3(0, 0, 0),
    fov: 12,
  };
}

function startCamGlide(to, dur = 0.62) {
  camGlide = {
    fromPos: camera.position.clone(),
    fromTgt: (controls ? controls.target.clone() : HOME.tgt.clone()),
    fromFov: camera.fov,
    toPos: to.pos.clone(),
    toTgt: to.tgt.clone(),
    toFov: to.fov ?? camera.fov,
    t: 0,
    dur,
  };
}

function tickCamGlide(dt) {
  if (!camGlide) return;
  camGlide.t += dt;
  const u = Math.min(1, camGlide.t / camGlide.dur);
  const e = u * u * (3 - 2 * u);
  camera.position.lerpVectors(camGlide.fromPos, camGlide.toPos, e);
  camera.fov = THREE.MathUtils.lerp(camGlide.fromFov, camGlide.toFov, e);
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.lerpVectors(camGlide.fromTgt, camGlide.toTgt, e);
    controls.update();
  } else {
    camera.lookAt(camGlide.toTgt);
  }
  if (u >= 1) camGlide = null;
}

function syncDock() {
  const solarBtn = document.getElementById("solarBtn");
  const lightsBtn = document.getElementById("lightsBtn");
  const spinBtn = document.getElementById("spinBtn");
  const roundBtn = document.getElementById("signRoundBtn");
  const octBtn = document.getElementById("signOctagonBtn");
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
  const roundOn = signType !== "octagon";
  if (roundBtn) {
    roundBtn.classList.toggle("on", roundOn);
    roundBtn.classList.toggle("off", !roundOn);
    roundBtn.setAttribute("aria-pressed", roundOn ? "true" : "false");
  }
  if (octBtn) {
    octBtn.classList.toggle("on", !roundOn);
    octBtn.classList.toggle("off", roundOn);
    octBtn.setAttribute("aria-pressed", !roundOn ? "true" : "false");
  }
  const along = document.getElementById("signAlong");
  const alongLbl = document.getElementById("signAlongLbl");
  if (along) along.value = String(Math.round(signAlong * 100));
  if (alongLbl) alongLbl.textContent = `STOP ${Math.round(signAlong * 100)}%`;
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
  return { pivot: boomPivot, rest: boomRest, drop: boomDrop, shownPct: 100, targetPct: 100, tipY: tip[1], tipAxis: "y" };
}

/** Hero stand-in arm — raise/lower works before (and if) the CAD rig mounts. */
function rigHeroArm(hero) {
  const arm = hero?.userData?.heroArm || hero?.getObjectByName?.("HeroBoomArm");
  if (!arm) return null;
  const drop = 0.06;
  const rest = 1.12;
  arm.rotation.z = rest;
  return { pivot: arm, rest, drop, shownPct: 100, targetPct: 100, tipY: 2.05, tipAxis: "x" };
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
    const logoW = 0.26; // twin addDecals — FIXED local width, not faceSpan*0.72
    if (door) {
      const dc = worldBox(door).getCenter(new THREE.Vector3());
      root.worldToLocal(dc);
      yBand = dc.y;
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
        if (Math.abs(v.x) > 0.22 || Math.abs(v.y - yBand) > 0.13) continue;
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
    root.userData.logoLocalW = logoW;
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
  const matNavy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.44, metalness: 0.12 });
  const matSteel = new THREE.MeshStandardMaterial({
    color: LIVERY.S, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.2,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: LIVERY.K, metalness: 0.12, roughness: 0.5, envMapIntensity: 0.85,
  });
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
      const r0 = firstMatRgb(o);
      if (r0 === "red" || r0 === "amber" || r0 === "green") return;
      if (isTrafficPoleMesh(o)) {
        o.material = matSteel;
        o.userData.tag = "S";
        return;
      }
      o.material = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.48, metalness: 0.14 });
      return;
    }
    if (/灯条/.test(name)) {
      if (isDiscLikeMesh(o)) o.visible = false;
      return;
    }
    const src = firstMat(o)?.color;
    let tag = src ? classifyLiveryRgb(src.r, src.g, src.b) : null;
    if (/车轮|wheel/i.test(name)) tag = "K";
    else if (/主杆|胶条|105-|105_|105$|PRT000|FENGKONG|^006$|^0001$/i.test(name)) tag = "B";
    else if (!tag) {
      if (/AK-XLH|115-DOOR|小门|箱|柜|门|compound|DAO-ZHA|d115c|电池/i.test(name)) tag = "Y";
      else if (/LOCK-NEW|不锈钢|stainless/i.test(name)) tag = "S";
    }
    o.userData.tag = tag;
    if (tag === "Y") o.material = powderMat(LIVERY.Y);
    else if (tag === "S") o.material = matSteel;
    else if (tag === "B") o.material = stripeMaterial(o.geometry);
    else if (tag === "G") {
      // leftover CAD lime glow discs — hide, do not keep a green/yellow orb
      o.visible = false;
    } else if (tag === "A") {
      o.material = new THREE.MeshStandardMaterial({
        color: LIVERY.A, emissive: LIVERY.A, emissiveIntensity: 0.5, roughness: 0.2,
      });
    } else if (tag === "R") {
      o.material = new THREE.MeshStandardMaterial({
        color: LIVERY.R, metalness: 0.12, roughness: 0.5, envMapIntensity: 0.85,
      });
    } else if (tag === "K") o.material = matDark;
    else if (/太阳能|solar/i.test(name)) o.material = matNavy;
    else o.material = r > 0.55 ? powderMat(LIVERY.Y) : matDark;
  });
}

function isTrafficPoleMesh(o) {
  if (!o?.isMesh || !o.geometry) return false;
  const n = `${o.name || ""}|${o.parent?.name || ""}`;
  if (/AK-XLH-D115C-03/i.test(n)) return false;
  if (/柱子|灯杆|立柱|立杆|pole|mast/i.test(n) && isTrafficNode(o)) return true;
  if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
  const local = o.geometry.boundingBox.getSize(new THREE.Vector3());
  const locSorted = [local.x, local.y, local.z].sort((a, b) => a - b);
  const slimLocal = locSorted[2] > 0.15 && locSorted[0] < 0.09 && locSorted[1] < 0.09;
  const box = new THREE.Box3().setFromObject(o);
  const wsz = box.getSize(new THREE.Vector3());
  const poleWorld = wsz.y > 0.22 && Math.max(wsz.x, wsz.z) < 0.18;
  return slimLocal || poleWorld;
}

function paintTrafficPolesStainless(root) {
  if (!root) return 0;
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!isTrafficNode(o) && !/柱子|灯杆|立柱|立杆|pole|mast/i.test(o.name || "")) return;
    if (!isTrafficPoleMesh(o)) return;
    o.material = stainlessMat();
    o.userData.tag = "S";
    o.visible = true;
    n += 1;
  });
  return n;
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
  const bb = mesh.geometry.boundingBox;
  const sz = bb.getSize(new THREE.Vector3());
  const mid = bb.getCenter(new THREE.Vector3());
  const scale = Math.max(sz.x, sz.y, sz.z) * 1.15 || 0.22;
  halo.scale.setScalar(scale / 0.24);
  const axis = sz.x <= sz.y && sz.x <= sz.z
    ? "x"
    : sz.y <= sz.z
      ? "y"
      : "z";
  if (axis === "x") halo.rotation.y = Math.PI / 2;
  else if (axis === "y") halo.rotation.x = Math.PI / 2;
  halo.position.copy(mid);
  if (axis === "z") halo.position.z += 0.004;
  else if (axis === "x") halo.position.x += 0.004;
  else halo.position.y += 0.004;
  mesh.add(halo);
  const light = new THREE.PointLight(LAMP_COL[kind], 0.2, 2.4, 2);
  light.name = `SignalLight_${kind}`;
  light.position.copy(mid);
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
    if (isTrafficPoleMesh(o)) {
      o.material = stainlessMat();
      o.userData.tag = "S";
      return;
    }
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

/** Twin-core lights.ts updateLeds — the only LED SoT. Per-lens mats for L/R alternate. */
let ledRig = {
  faceMat: null,
  faceMats: [],
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
  const bezelMat = alumMat();
  const faceMats = [];
  const hosts = findDoorLedHosts(root).slice().sort((a, b) => {
    return worldBox(a).getCenter(new THREE.Vector3()).x - worldBox(b).getCenter(new THREE.Vector3()).x;
  });
  hosts.forEach((host) => {
    host.visible = false;
    const faceMat = makeFaceLedMat(true);
    faceMats.push(faceMat);
    const box = worldBox(host);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const r = Math.max(0.028, Math.min(sz.x, sz.y) * 0.48);
    const camPos = unitCam.position;
    const toCam = new THREE.Vector3(camPos.x - c.x, 0, camPos.z - c.z);
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1);
    else toCam.normalize();
    const bezel = new THREE.Mesh(new THREE.CircleGeometry(r + 0.006, 40), bezelMat);
    bezel.name = "PortaboomLedBezel";
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
  });
  let stripMat = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!/灯条/.test(`${o.name || ""}|${o.parent?.name || ""}`)) return;
    const sz = worldBox(o).getSize(new THREE.Vector3());
    const sorted = [sz.x, sz.y, sz.z].sort((a, b) => a - b);
    const disc = sorted[0] < 0.05 && Math.abs(sorted[1] - sorted[2]) < 0.1;
    if (disc) {
      o.visible = false;
      return;
    }
    stripMat = new THREE.MeshStandardMaterial({
      color: FACE_GREEN_BASE, emissive: STRIP_GREEN, emissiveIntensity: 4,
      roughness: 0.28, metalness: 0.08, toneMapped: false,
    });
    o.material = stripMat;
  });
  ledRig = {
    faceMat: faceMats[0] || null,
    faceMats,
    faceGlows: [],
    stripMat,
    lastShownPct: boomRig?.shownPct ?? 100,
    movingHoldUntil: 0,
  };
}

/** Port of twin-core lights.ts updateLeds. Face LEDs alternate L/R when advisory. */
function updateLeds() {
  const faces = ledRig.faceMats?.length ? ledRig.faceMats : (ledRig.faceMat ? [ledRig.faceMat] : []);
  if (!faces.length && !ledRig.stripMat) return;
  const now = performance.now();
  const shown = boomRig ? boomRig.shownPct : 100;
  const target = boomRig ? boomRig.targetPct : 100;
  if (Math.abs(shown - ledRig.lastShownPct) > 0.03) ledRig.movingHoldUntil = now + 700;
  ledRig.lastShownPct = shown;
  const moving = now < ledRig.movingHoldUntil || Math.abs(shown - target) > 4;
  const down = target === 0;
  const advisory = moving || down;
  const flashOn = now % 640 < 340;
  faces.forEach((face, i) => {
    if (advisory) {
      face.color.setHex(FACE_RED_BASE);
      face.emissive.setHex(FACE_RED);
      const on = faces.length > 1 ? (i === 0 ? flashOn : !flashOn) : flashOn;
      face.emissiveIntensity = on ? 8 : 1.6;
    } else {
      face.color.setHex(FACE_GREEN_BASE);
      face.emissive.setHex(FACE_GREEN);
      face.emissiveIntensity = 5.5;
    }
  });
  const strip = ledRig.stripMat;
  if (strip) {
    if (advisory) {
      strip.color.setHex(0x300000);
      strip.emissive.setHex(STRIP_RED);
      strip.emissiveIntensity = flashOn ? 10 : 1.2;
    } else {
      strip.color.setHex(FACE_GREEN_BASE);
      strip.emissive.setHex(STRIP_GREEN);
      strip.emissiveIntensity = 5;
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

setStatus("Living QR · tap to scan the field");
boomRig = rigHeroArm(boom);
ledRig.faceMats = boom.userData.heroFaceMats || [];
ledRig.faceMat = ledRig.faceMats[0] || boom.userData.heroFaceMat || null;
ledRig.stripMat = boom.getObjectByName("PortaboomBoomStrip")?.material || null;
rigTrafficLamps(boom);
setSignType("round");
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
    measurePlantedScale(boom);
    repaintBoomStripes(boom);
    rigTwinLeds(boom);
    rigTrafficLamps(boom);
    paintTrafficPolesStainless(boom);
    killStrayGlowDiscs(boom);
    setSignType(signType || "round");
    addLogoDecal(boom);
    applyCoreShowConfig(boom);
    showMode = "up";
    showClock = 0;
    setSignalAspect("green");
    boom.visible = true;
    placeTwinInLivingWorld();
    applyWorldPose();
    if (boomRig) setStatus("Living QR · tap to scan the field");
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
      setStatus("CAD blocked. Hero stand-in still live.");
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
  // Flatten-to-QR is gone from the product path. Print PNG is a demoted export.
  if (next) exportPrintPng();
}

function exportPrintPng() {
  const result = downloadPrintPng(destQr.matrix);
  setStatus("Print export saved — not the live scan. Point a phone at the 3D scene.");
  if (hintEl) hintEl.textContent = "Print PNG is a secondary export. Scan the living 3D QR.";
  return result;
}

function syncModeHud() {
  document.body.classList.toggle("scan-open", scanOpen);
  document.body.classList.remove("unit-dock");
  const badge = document.getElementById("modeBadge");
  if (badge) badge.textContent = scanOpen ? "Scan" : "Living QR";
  const moreDock = document.getElementById("moreDock");
  if (moreDock) moreDock.hidden = !scanOpen;
  const scanBtn = document.getElementById("scanBtn");
  if (scanBtn) {
    scanBtn.textContent = scanOpen ? "World" : "Tap to scan";
    scanBtn.classList.toggle("primary", !scanOpen);
    scanBtn.classList.toggle("ghost", scanOpen);
  }
  const lifeBtn = document.getElementById("lifeBtn");
  if (lifeBtn) {
    lifeBtn.textContent = lifeOn ? "Life ON" : "Life OFF";
    lifeBtn.classList.toggle("on", lifeOn);
    lifeBtn.classList.toggle("off", !lifeOn);
    lifeBtn.setAttribute("aria-pressed", lifeOn ? "true" : "false");
  }
}

function setViewMode(next) {
  if (next === "scan") applyScanPose();
  else applyWorldPose();
}

function resize() {
  const w = Math.max(1, canvas.clientWidth || innerWidth);
  const h = Math.max(1, canvas.clientHeight || innerHeight);
  renderer.setSize(w, h, false);
  unitCam.aspect = w / h;
  unitCam.updateProjectionMatrix();
  if (scanOpen) fitScanOrtho();
  else camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  tickCamGlide(dt);
  grid.visible = true;
  studioGroup.visible = !scanOpen;
  if (boom) boom.visible = !scanOpen;
  if (lifeOn && !reduced && !scanOpen) {
    const amp = living.cell * 0.01;
    for (const m of mods) {
      m.position.y = (m.userData.baseY || 0) + Math.sin(t * 1.05 + m.userData.phase) * amp;
    }
    living.ledMats.forEach((mat, i) => {
      mat.emissiveIntensity = 0.85 + Math.sin(t * 1.6 + i * 0.4) * 0.35;
    });
  } else {
    for (const m of mods) m.position.y = m.userData.baseY || 0;
  }
  if (!scanOpen) {
    tickBoom(dt);
    tickSignUpright();
    tickShow(dt);
    updateLeds();
  }
  if (controls && !scanOpen) {
    if (!spin) controls.autoRotate = false;
    controls.update();
  }
  renderer.autoClear = true;
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
}
tick();

const scanBtn = document.getElementById("scanBtn");
if (scanBtn) scanBtn.addEventListener("click", () => toggleScan());
if (canvas) {
  canvas.addEventListener("click", (ev) => {
    if (ev.target !== canvas) return;
  });
  let tapStart = 0;
  let tapX = 0;
  let tapY = 0;
  canvas.addEventListener("pointerdown", (ev) => {
    tapStart = performance.now();
    tapX = ev.clientX;
    tapY = ev.clientY;
  });
  canvas.addEventListener("pointerup", (ev) => {
    if (performance.now() - tapStart > 280) return;
    if (Math.hypot(ev.clientX - tapX, ev.clientY - tapY) > 10) return;
    toggleScan();
  });
}
const printBtn = document.getElementById("printBtn");
if (printBtn) printBtn.addEventListener("click", () => exportPrintPng());
const lifeBtn = document.getElementById("lifeBtn");
if (lifeBtn) {
  lifeBtn.addEventListener("click", () => {
    lifeOn = !lifeOn;
    syncModeHud();
  });
}

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

const signRoundBtn = document.getElementById("signRoundBtn");
if (signRoundBtn) signRoundBtn.addEventListener("click", () => setSignType("round"));
const signOctagonBtn = document.getElementById("signOctagonBtn");
if (signOctagonBtn) signOctagonBtn.addEventListener("click", () => setSignType("octagon"));
const signInBtn = document.getElementById("signInBtn");
if (signInBtn) signInBtn.addEventListener("click", () => nudgeSign(-1));
const signOutBtn = document.getElementById("signOutBtn");
if (signOutBtn) signOutBtn.addEventListener("click", () => nudgeSign(1));
const signAlongEl = document.getElementById("signAlong");
if (signAlongEl) {
  signAlongEl.addEventListener("input", (e) => setSignAlong(Number(e.target.value) / 100));
}

syncDock();
syncModeHud();

window.__iqr = {
  get boom() { return boom; },
  get camera() {
    return {
      pos: camera.position.toArray(),
      target: controls ? controls.target.toArray() : null,
      autoRotate: !!(controls && controls.autoRotate),
      damping: !!(controls && controls.enableDamping),
    };
  },
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
      viewMode,
      scanOpen,
      living: true,
      dest: DEST,
      ecc: ECC,
      matrixN: destQr.size,
      qrVersion: destQr.version,
      darkCount: living.darkCount,
      moduleMeshGroups: mods.length,
      texturedQuad: false,
      scanPlanePresent: false,
      product: "living2-brand-world",
      cameraIsPerspective: camera.isPerspectiveCamera === true,
      cameraIsOrtho: camera.isOrthographicCamera === true,
      scanEnvelope: "tap-to-scan ortho top-down of XZ plaza",
      defaultShowsTwin: !!(boom && !scanOpen),
      flattenBtnPresent: !!document.getElementById("flattenBtn"),
      unitDockPresent: !!document.getElementById("unitDock"),
      primaryControls: document.querySelectorAll("#liveDock .btn").length,
      moreOpen: false,
      printClaimReady: false,
      lifeOn,
      kinds: living.kinds,
      vocabs: living.vocabs,
      flat,
      scanOpacity: 0,
      gridVisible: !!grid.visible,
      solarOn: optsVisible.solar,
      trafficOn: optsVisible.traffic,
      spin,
      autoRotate: !!(controls && controls.autoRotate),
      damping: !!(controls && controls.enableDamping),
      cam: camera.position.toArray(),
      target: controls ? controls.target.toArray() : null,
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
      faceHexes: (ledRig.faceMats || []).map((m) => m.emissive.getHexString()),
      faceIntensities: (ledRig.faceMats || []).map((m) => m.emissiveIntensity),
      faceGlowHex: ledRig.faceGlows[0] ? ledRig.faceGlows[0].color.getHexString() : null,
      stripHex: ledRig.stripMat ? ledRig.stripMat.emissive.getHexString() : null,
      logoLocalW: boom?.userData?.logoLocalW ?? null,
      classifyHidden: boom?.userData?.classifyHidden || null,
      signType,
      signMounted: !!(signGroup && signGroup.parent),
      signRadius: signRadiusLocal,
      signDiameterM: plantedProof?.signDiameterM ?? REAL.signDM,
      signDiameterWorld: plantedProof?.signDiameterWorld ?? null,
      boomLengthM: plantedProof?.boomLengthM ?? REAL.boomM,
      boomLengthWorld: plantedProof?.boomLengthWorld ?? null,
      boomLengthCad: plantedProof?.boomLengthCad ?? null,
      scaleFactor: plantedProof?.scaleFactor ?? (boom?.scale?.x ?? null),
      metresPerWorld: plantedProof?.metresPerWorld ?? null,
      doorHeightWorld: plantedProof?.doorHeightWorld ?? null,
      doorWidthWorld: plantedProof?.doorWidthWorld ?? null,
      signDerived: plantedProof?.derived ?? null,
      signWorldDiameter: measureSignWorldDiameter(),
      signImpliedM: (() => {
        const d = measureSignWorldDiameter();
        const m = plantedProof?.metresPerWorld;
        return d != null && m ? +(d * m).toFixed(4) : null;
      })(),
      pivotWorldScale: plantedProof?.pivotWorldScale ?? null,
      meshWorldScale: plantedProof?.meshWorldScale ?? null,
      impliedBoomM: plantedProof?.impliedBoomM ?? null,
      plantedProof,
      signAlong,
      stripePeriod: stripePeriodLocal,
      stripePeriodM: REAL.stripePeriodM,
      stripeRedDuty: STRIPE.redDuty,
      strayGlow: (() => {
        let n = 0;
        boom?.traverse?.((o) => {
          if (!isVisibleInTree(o)) return;
          if (o.userData?.tag === "G" || o.isSprite) n += 1;
        });
        return n;
      })(),
      strayGlowKilled: boom?.userData?.strayGlowKilled || [],
      bezelHex: (() => {
        let hex = null;
        boom?.traverse?.((o) => {
          if (o.name === "PortaboomLedBezel" && firstMat(o)?.color) {
            hex = firstMat(o).color.getHexString();
          }
        });
        return hex;
      })(),
      poleStainless: (() => {
        let n = 0;
        boom?.traverse?.((o) => {
          if (!o.isMesh || !isTrafficPoleMesh(o) || !isVisibleInTree(o)) return;
          const c = firstMat(o)?.color?.getHex?.();
          if (c === LIVERY.S) n += 1;
        });
        return n;
      })(),
      livery: (() => {
        let y = 0, k = 0, b = 0, stripe = 0, gVis = 0;
        let mastVis = 0, clampVis = 0, socketVis = 0;
        boom?.traverse?.((o) => {
          const n = o.name || "";
          if (o.userData?.tag === "Y") y += 1;
          if (o.userData?.tag === "K") k += 1;
          if (o.userData?.tag === "B") b += 1;
          if (o.userData?.tag === "G" && isVisibleInTree(o)) gVis += 1;
          if (o.material?.userData?.stripe) stripe += 1;
          if (/AK-XLH-D115C-03/i.test(n) && isVisibleInTree(o)) mastVis += 1;
          if (/快速夹具|^夹具$/i.test(n) && isVisibleInTree(o)) clampVis += 1;
          if (/AK-XLH-D115C-01-01-11/i.test(n) && o.isMesh && isVisibleInTree(o)) socketVis += 1;
        });
        return { y, k, b, stripe, gVis, mastVis, clampVis, socketVis };
      })(),
      logo: logo ? {
        name: logo.name,
        world: logo.getWorldPosition(new THREE.Vector3()).toArray(),
        parent: logo.parent?.name || null,
        worldW: boom?.userData?.logoWorldW ?? null,
        localW: boom?.userData?.logoLocalW ?? null,
      } : null,
      logoOpposite: logoOpp ? {
        name: logoOpp.name,
        world: logoOpp.getWorldPosition(new THREE.Vector3()).toArray(),
      } : null,
    };
  },
  captureWorld() {
    if (scanOpen) applyWorldPose();
    renderer.render(scene, unitCam);
    return canvas.toDataURL("image/png");
  },
  captureScan() {
    if (!scanOpen) applyScanPose();
    renderer.render(scene, scanCam);
    return canvas.toDataURL("image/png");
  },
  enterScan() {
    applyScanPose();
    renderer.render(scene, scanCam);
    return true;
  },
  exitScan() {
    applyWorldPose();
    renderer.render(scene, unitCam);
    return true;
  },
  get living() {
    return {
      dest: DEST,
      ecc: ECC,
      size: destQr.size,
      dark: living.darkCount,
      kinds: living.kinds,
      vocabs: living.vocabs,
      texturedQuad: false,
      viewMode,
      scanOpen,
    };
  },
  nudgeScan(x = 0, y = 0) {
    if (!scanOpen) applyScanPose();
    scanCam.position.set(SCAN_POSE.pos.x + x * 0.12, SCAN_POSE.pos.y, SCAN_POSE.pos.z + y * 0.12);
    scanCam.lookAt(SCAN_POSE.tgt);
    scanCam.updateProjectionMatrix();
    renderer.render(scene, scanCam);
    return true;
  },
  resetScan() {
    applyScanPose();
    renderer.render(scene, scanCam);
  },
};
