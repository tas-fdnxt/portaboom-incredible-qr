/**
 * Living QR field — a dense crowd of miniature PORTABOOM cabinets.
 *
 * Each dark module is a scaled-down hero cabinet (powder orange, door
 * wordmark, wheels, face LEDs). Tiny ones do NOT grow traffic lights or
 * boom arms — those belong only to the planted unit.
 *
 * living8 lookalike BoxGeometry pixels are rejected: clone the planted
 * cabinet meshes (strip TL + boom), instance them, restore crowd height.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const CELL = 0.068;
export const MODULE_FILL = 0.94;

/** Manual PB4000 cabinet — used until the planted twin can be cloned. */
const CAB_W = 0.415;
const CAB_H = 1.153;
const CAB_D = 0.72;

const SKIP_TWIN =
  /Traffic[_\s-]*Light|信号灯|HeroSignal|HeroLens|HeroBoom|BoomPivot|主杆|105-|105_|灯条|FENGKONG|^006$|太阳能|solar|柱子|PED_|TL2_|PortaboomBoom|HeroBoomArm|快速夹具|^夹具$|PortaboomStop|STOP|灯罩|灯壳/i;

const KEEP_CAB =
  /AK-XLH-D115C-01-01|115-DOOR|HeroCabinet|车轮|PortaboomLogo|PortaboomFaceLed|PortaboomLedBezel/i;

function powder(THREE, hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0.04,
    roughness: 0.36,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.1,
    sheen: 0.18,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xffffff),
  });
}

/** Crowd heights — restore the last-good-door 3D minion field (not living8 stubs). */
function heightFor(vocab) {
  if (vocab === "finder") return 0.28;
  if (vocab === "boom") return 0.24;
  if (vocab === "cabinet") return 0.22;
  if (vocab === "head") return 0.20;
  if (vocab === "led") return 0.18;
  if (vocab === "timing") return 0.16;
  return 0.20;
}

/**
 * Wordmark as it reads on the hero cabinet: dark PORTA / BOOM on orange,
 * not a black plate (door_decal's opaque ground).
 */
function makeCabinetWordmark(THREE) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 360;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 360);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 96px Arial Black, Arial, sans-serif";
  ctx.fillStyle = "#1a1d22";
  ctx.fillText("PORTA", 256, 86);
  ctx.fillText("BOOM", 256, 176);
  ctx.fillStyle = "#c01421";
  for (let i = 0; i < 4; i += 1) {
    const x = 150 + i * 54;
    ctx.beginPath();
    ctx.moveTo(x, 232);
    ctx.lineTo(x + 34, 232);
    ctx.lineTo(x + 18, 288);
    ctx.lineTo(x - 16, 288);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillStyle = "#1a1d22";
  ctx.fillText("portaboom.com.au", 256, 328);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function knockoutBlack(THREE, tex) {
  const img = tex.image;
  if (!img) return tex;
  const c = document.createElement("canvas");
  c.width = img.width || 512;
  c.height = img.height || 360;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < id.data.length; i += 4) {
    const r = id.data[i];
    const g = id.data[i + 1];
    const b = id.data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 32) id.data[i + 3] = 0;
  }
  ctx.putImageData(id, 0, 0);
  const out = new THREE.CanvasTexture(c);
  out.colorSpace = THREE.SRGBColorSpace;
  out.anisotropy = 8;
  return out;
}

function loadDoorDecal(THREE, onReady) {
  const mark = makeCabinetWordmark(THREE);
  const loader = new THREE.TextureLoader();
  loader.load(
    "./door_decal.png",
    (tex) => {
      const cut = knockoutBlack(THREE, tex);
      const img = cut.image;
      if (img) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < id.data.length; i += 4) {
          if (id.data[i + 3] < 16) continue;
          id.data[i] = 26;
          id.data[i + 1] = 29;
          id.data[i + 2] = 34;
        }
        ctx.putImageData(id, 0, 0);
        const out = new THREE.CanvasTexture(c);
        out.colorSpace = THREE.SRGBColorSpace;
        out.anisotropy = 8;
        onReady(out);
        return;
      }
      onReady(mark);
    },
    undefined,
    () => onReady(mark)
  );
  return mark;
}

function isVisibleInTree(o) {
  let p = o;
  while (p) {
    if (p.visible === false) return false;
    p = p.parent;
  }
  return true;
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

function tryMergeGeos(THREE, geos) {
  if (!geos.length) return null;
  if (geos.length === 1) return geos[0];
  try {
    const merged = mergeGeometries(geos, false);
    if (merged) return merged;
  } catch { /* retry slim */ }
  try {
    const slim = geos.map((g) => {
      const c = new THREE.BufferGeometry();
      c.setAttribute("position", g.getAttribute("position"));
      if (g.getAttribute("normal")) c.setAttribute("normal", g.getAttribute("normal"));
      else c.computeVertexNormals();
      if (g.index) c.setIndex(g.index);
      return c;
    });
    return mergeGeometries(slim, false);
  } catch {
    return geos[0];
  }
}

function stampProtoBounds(THREE, proto) {
  proto.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(proto);
  const size = box.getSize(new THREE.Vector3());
  proto.userData.bodyH = size.y;
  proto.userData.cabW = size.x;
  proto.userData.cabD = size.z;
  proto.userData.hasTrafficLight = false;
  return size;
}

function bakeMeshGeo(THREE, mesh, origin) {
  const geo = mesh.geometry.clone();
  mesh.updateMatrixWorld(true);
  const bake = new THREE.Matrix4()
    .makeTranslation(-origin.x, -origin.y, -origin.z)
    .multiply(mesh.matrixWorld);
  geo.applyMatrix4(bake);
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  return geo;
}

function isCabinetKeeper(o) {
  if (!o.isMesh || !o.geometry) return false;
  if (!isVisibleInTree(o)) return false;
  const blob = ancestorBlob(o);
  const name = o.name || "";
  if (SKIP_TWIN.test(blob) || SKIP_TWIN.test(name)) return false;
  if (o.userData?.tag === "B" || o.material?.userData?.stripe) return false;
  if (KEEP_CAB.test(blob) || KEEP_CAB.test(name)) return true;
  if (o.userData?.tag === "Y" && /AK-XLH-D115C-01-01|115-DOOR|HeroCabinet/i.test(blob)) return true;
  return false;
}

/** Add wordmark + face LEDs if the cloned CAD door has not grown them yet. */
function ensureCabinetFace(THREE, proto, livery, logoMap) {
  const w = proto.userData.cabW || CAB_W;
  const h = proto.userData.bodyH || CAB_H;
  const d = proto.userData.cabD || CAB_D;
  const faceZ = d * 0.52;
  if (!proto.getObjectByName("MiniLogo") && logoMap) {
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoMap,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const logoW = w * 0.58;
    const logoH = logoW * 0.698;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);
    logo.name = "MiniLogo";
    logo.position.set(0, h * 0.42, faceZ);
    proto.add(logo);
  }
  if (!proto.getObjectByName("MiniFaceLed")) {
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xb8bec6,
      metalness: 0.72,
      roughness: 0.32,
    });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x062c10,
      emissive: 0x2aff55,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.04,
      toneMapped: false,
    });
    const ledY = h * 0.72;
    for (const dx of [-w * 0.16, w * 0.16]) {
      const bezel = new THREE.Mesh(new THREE.CircleGeometry(w * 0.07, 18), bezelMat);
      bezel.name = "MiniLedBezel";
      bezel.position.set(dx, ledY, faceZ);
      proto.add(bezel);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(w * 0.052, 18), ledMat);
      lens.name = "MiniFaceLed";
      lens.position.set(dx, ledY, faceZ + 0.002);
      proto.add(lens);
    }
  }
  stampProtoBounds(THREE, proto);
}

/**
 * Clone the planted hero cabinet only (no boom, no traffic head).
 * Merge body / door / wheels so the field is a few InstancedMeshes,
 * not 1258 CAD trees (that froze living8).
 */
export function extractCabinetPrototype(THREE, twin, livery, logoMap) {
  if (!twin) return null;
  const cad = !!twin.getObjectByName("115-DOOR")
    || /Pb4000Twin|d115c/i.test(twin.name || "");
  if (!cad) return null;

  twin.updateMatrixWorld(true);
  const picked = [];
  twin.traverse((o) => {
    if (isCabinetKeeper(o)) picked.push(o);
  });
  if (picked.length < 3) return null;

  const box = new THREE.Box3();
  for (const o of picked) box.union(new THREE.Box3().setFromObject(o));
  if (box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const aspect = size.y / Math.max(size.x, 1e-6);
  if (!(size.y > 0.22) || aspect < 1.5 || aspect > 5.2) return null;

  const origin = new THREE.Vector3(
    (box.min.x + box.max.x) * 0.5,
    box.min.y,
    (box.min.z + box.max.z) * 0.5
  );

  const orangeGeos = [];
  const darkGeos = [];
  const logoGeos = [];
  const bezelGeos = [];
  const ledGeos = [];
  let logoMat = null;
  let bezelMat = null;
  let ledMat = null;

  for (const o of picked) {
    const name = o.name || "";
    const blob = ancestorBlob(o);
    let geo;
    try {
      geo = bakeMeshGeo(THREE, o, origin);
    } catch {
      continue;
    }
    if (/PortaboomLogo/i.test(name) || /PortaboomLogo/i.test(blob)) {
      logoGeos.push(geo);
      if (!logoMat && o.material) logoMat = o.material;
      continue;
    }
    if (/PortaboomFaceLed/i.test(name)) {
      ledGeos.push(geo);
      if (!ledMat && o.material) ledMat = o.material;
      continue;
    }
    if (/PortaboomLedBezel/i.test(name)) {
      bezelGeos.push(geo);
      if (!bezelMat && o.material) bezelMat = o.material;
      continue;
    }
    if (/车轮|wheel/i.test(name) || /车轮|wheel/i.test(blob) || o.userData?.tag === "K") {
      darkGeos.push(geo);
      continue;
    }
    orangeGeos.push(geo);
  }

  if (!orangeGeos.length) return null;

  const proto = new THREE.Group();
  proto.name = "MiniPortaboomFromTwin";

  const bodyGeo = tryMergeGeos(THREE, orangeGeos);
  if (!bodyGeo) return null;
  const body = new THREE.Mesh(bodyGeo, powder(THREE, livery.Y));
  body.name = "MiniCabinet";
  proto.add(body);

  if (darkGeos.length) {
    const wheelGeo = tryMergeGeos(THREE, darkGeos);
    if (wheelGeo) {
      const wheels = new THREE.Mesh(
        wheelGeo,
        new THREE.MeshStandardMaterial({
          color: livery.K,
          metalness: 0.18,
          roughness: 0.58,
        })
      );
      wheels.name = "MiniWheel";
      proto.add(wheels);
    }
  }

  if (logoGeos.length) {
    const g = tryMergeGeos(THREE, logoGeos);
    const mat = logoMat?.clone ? logoMat.clone() : new THREE.MeshBasicMaterial({
      map: logoMap,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    if (logoMap && mat && !mat.map) mat.map = logoMap;
    const logo = new THREE.Mesh(g || logoGeos[0], mat);
    logo.name = "MiniLogo";
    proto.add(logo);
  }

  if (bezelGeos.length) {
    const g = tryMergeGeos(THREE, bezelGeos);
    const mat = bezelMat?.clone ? bezelMat.clone() : new THREE.MeshStandardMaterial({
      color: 0xb8bec6,
      metalness: 0.72,
      roughness: 0.32,
    });
    const bezel = new THREE.Mesh(g || bezelGeos[0], mat);
    bezel.name = "MiniLedBezel";
    proto.add(bezel);
  }

  if (ledGeos.length) {
    const g = tryMergeGeos(THREE, ledGeos);
    const mat = ledMat?.clone ? ledMat.clone() : new THREE.MeshStandardMaterial({
      color: 0x062c10,
      emissive: 0x2aff55,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.04,
      toneMapped: false,
    });
    const lens = new THREE.Mesh(g || ledGeos[0], mat);
    lens.name = "MiniFaceLed";
    proto.add(lens);
  }

  stampProtoBounds(THREE, proto);
  ensureCabinetFace(THREE, proto, livery, logoMap);

  const verts = [];
  proto.traverse((o) => {
    if (o.isMesh) verts.push(o.geometry.getAttribute("position")?.count || 0);
  });
  const vertCount = verts.reduce((a, b) => a + b, 0);
  if (vertCount < 24 || vertCount > 180000) return null;

  proto.userData.clonedFromTwin = true;
  proto.userData.vertCount = vertCount;
  proto.userData.partCount = proto.children.length;
  return proto;
}

/**
 * Low-poly PORTABOOM cabinet that matches the hero silhouette:
 * tall powder-orange box, branded door, wheels, face LED bezels.
 * No traffic lantern. No boom. No navy stripe band. Fallback only.
 */
function buildCabinetPrototype(THREE, spec) {
  const width = spec.width || CAB_W;
  const height = spec.height || CAB_H;
  const depth = spec.depth || CAB_D;
  const livery = spec.livery;
  const logoMap = spec.logoMap;

  const g = new THREE.Group();
  g.name = "MiniPortaboomCabinet";

  const cabMat = powder(THREE, livery.Y);
  const cabDeep = powder(THREE, 0xe46810);
  const darkMat = new THREE.MeshStandardMaterial({
    color: livery.K,
    metalness: 0.18,
    roughness: 0.58,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: livery.S,
    metalness: 0.88,
    roughness: 0.3,
    envMapIntensity: 1.1,
  });
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0xb8bec6,
    metalness: 0.72,
    roughness: 0.32,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x062c10,
    emissive: 0x2aff55,
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.04,
    toneMapped: false,
  });
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoMap,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const wheelR = spec.wheels?.[0]?.r || height * 0.055;
  const wheelT = spec.wheels?.[0]?.t || width * 0.11;
  const chassisH = height * 0.055;
  const bodyH = height - wheelR * 1.35;
  const bodyY = wheelR * 1.15 + bodyH * 0.5;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.98, bodyH, depth * 0.78),
    cabMat
  );
  body.name = "MiniCabinet";
  body.position.y = bodyY;
  g.add(body);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.88, bodyH * 0.9, depth * 0.04),
    cabDeep
  );
  door.name = "MiniDoor";
  door.position.set(0, bodyY, depth * 0.41);
  g.add(door);

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.02, chassisH, depth * 0.82),
    darkMat
  );
  chassis.name = "MiniChassis";
  chassis.position.y = wheelR * 1.05 + chassisH * 0.35;
  g.add(chassis);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, height * 0.025, depth * 0.72),
    cabDeep
  );
  lid.name = "MiniLid";
  lid.position.y = bodyY + bodyH * 0.5 + height * 0.008;
  g.add(lid);

  const lock = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.035, width * 0.035, depth * 0.06, 10),
    steelMat
  );
  lock.name = "MiniLock";
  lock.rotation.x = Math.PI / 2;
  lock.position.set(width * 0.28, bodyY + bodyH * 0.08, depth * 0.43);
  g.add(lock);

  const logoW = width * 0.62;
  const logoH = logoW * 0.698;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);
  logo.name = "MiniLogo";
  logo.position.set(0, bodyY - bodyH * 0.06, depth * 0.44);
  g.add(logo);
  const logoBack = new THREE.Mesh(
    new THREE.PlaneGeometry(logoW, logoH),
    logoMat.clone()
  );
  logoBack.name = "MiniLogoBack";
  logoBack.position.set(0, bodyY - bodyH * 0.06, -depth * 0.40);
  logoBack.rotation.y = Math.PI;
  g.add(logoBack);

  const ledY = bodyY + bodyH * 0.34;
  const ledZ = depth * 0.44;
  for (const dx of [-width * 0.16, width * 0.16]) {
    const bezel = new THREE.Mesh(new THREE.CircleGeometry(width * 0.075, 20), bezelMat);
    bezel.name = "MiniLedBezel";
    bezel.position.set(dx, ledY, ledZ);
    g.add(bezel);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(width * 0.058, 20), ledMat);
    lens.name = "MiniFaceLed";
    lens.position.set(dx, ledY, ledZ + 0.002);
    g.add(lens);
  }

  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelT, 12);
  const wheelSlots = spec.wheels?.length >= 2
    ? spec.wheels
    : [
      { x: -width * 0.32, z: -depth * 0.24, r: wheelR, t: wheelT },
      { x: width * 0.32, z: -depth * 0.24, r: wheelR, t: wheelT },
      { x: -width * 0.32, z: depth * 0.24, r: wheelR, t: wheelT },
      { x: width * 0.32, z: depth * 0.24, r: wheelR, t: wheelT },
    ];
  for (const w of wheelSlots) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.name = "MiniWheel";
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(w.x, w.r, w.z);
    g.add(wheel);
  }

  stampProtoBounds(THREE, g);
  g.userData.clonedFromTwin = false;
  return g;
}

function clearMiniField(living) {
  if (living.miniField && living.miniField.parent) {
    living.miniField.parent.remove(living.miniField);
  }
  living.miniField = null;
  living.miniInstances = [];
  living.logoMats = living.logoMats || [];
}

function placeDummy(dummy, mod, local) {
  dummy.position.set(
    mod.position.x + (mod.userData.jx || 0),
    mod.position.y,
    mod.position.z + (mod.userData.jz || 0)
  );
  dummy.rotation.set(0, mod.userData.yaw || 0, 0);
  const s = mod.userData.crowdScale || 1;
  dummy.scale.set(s, s, s);
  dummy.updateMatrix();
  dummy.matrix.multiply(local);
}

/**
 * Instance a cabinet prototype once per dark module.
 * One draw call per prototype mesh — not 1258 CAD clones.
 */
export function instanceCabinetField(THREE, living, prototype, source) {
  clearMiniField(living);
  const field = new THREE.Group();
  field.name = "MiniPortaboomField";
  const protoMeshes = [];
  prototype.updateMatrixWorld(true);
  const protoH = prototype.userData.bodyH || CAB_H;
  prototype.traverse((o) => {
    if (o.isMesh && o.visible !== false) protoMeshes.push(o);
  });
  const count = living.mods.length;
  const instances = [];
  const dummy = new THREE.Object3D();
  for (const src of protoMeshes) {
    const geo = src.geometry;
    const mat = src.material.clone ? src.material.clone() : src.material;
    if (src.material?.map && mat) mat.map = src.material.map;
    if (/MiniLogo/.test(src.name || "") && mat) living.logoMats.push(mat);
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.name = src.name || "MiniCabinetInst";
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    inst.userData.miniCabinet = true;
    inst.userData.hasTrafficLight = false;
    const local = src.matrixWorld.clone();
    for (let i = 0; i < count; i += 1) {
      placeDummy(dummy, living.mods[i], local);
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    field.add(inst);
    instances.push({ mesh: inst, local });
  }
  living.group.add(field);
  living.miniField = field;
  living.miniInstances = instances;
  living.miniCabinetSource = source;
  living.miniClonedFromTwin = source === "twin-cabinet";
  living.miniHasTrafficLight = false;
  living.stripeModules = 0;
  living.miniFieldKind = "hero-cabinet-instances";
  living.group.userData.miniHasTrafficLight = false;
  living.group.userData.stripeModules = 0;
  living.group.userData.miniCabinetSource = source;
  living.group.userData.miniClonedFromTwin = source === "twin-cabinet";
  living.group.userData.product = "living9-mini-portabooms";
  living.group.userData.miniFieldKind = "hero-cabinet-instances";
  living.group.userData.modulePalette = "hero-orange";

  for (const mod of living.mods) {
    const crowdH = mod.userData.crowdH || heightFor(mod.userData.vocab);
    mod.userData.crowdScale = crowdH / Math.max(protoH, 1e-6);
    mod.userData.bodyH = crowdH;
    mod.userData.miniCabinet = true;
    mod.userData.hasTrafficLight = false;
    const cap = mod.getObjectByName("QrModTop");
    if (cap) cap.position.y = crowdH + living.cell * 0.06;
  }
  return field;
}

/**
 * Apply module bob (life) to instanced cabinets.
 * @param {typeof import("three")} THREE
 */
export function syncMiniFieldWith(THREE, living) {
  const insts = living.miniInstances;
  if (!insts?.length) return;
  if (!living._miniDummy) living._miniDummy = new THREE.Object3D();
  const dummy = living._miniDummy;
  const n = living.mods.length;
  for (const inst of insts) {
    for (let i = 0; i < n; i += 1) {
      placeDummy(dummy, living.mods[i], inst.local);
      inst.mesh.setMatrixAt(i, dummy.matrix);
    }
    inst.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function setMiniFieldVisible(living, visible) {
  if (living.miniField) living.miniField.visible = visible;
}

export function dressLookalikeCabinets(THREE, living, livery, logoMap) {
  const proto = buildCabinetPrototype(THREE, {
    width: CAB_W,
    height: CAB_H,
    depth: CAB_D,
    livery,
    logoMap,
  });
  instanceCabinetField(THREE, living, proto, "lookalike");
  living.ledMats = [];
}

export function dressMiniCabinetsFromTwin(THREE, living, twin, livery, logoMap) {
  const cloned = extractCabinetPrototype(THREE, twin, livery, logoMap);
  if (cloned) {
    instanceCabinetField(THREE, living, cloned, "twin-cabinet");
    living.ledMats = [];
    return living.miniCabinetSource;
  }
  dressLookalikeCabinets(THREE, living, livery, logoMap);
  return living.miniCabinetSource;
}

/**
 * Modules live on the XZ plaza. Row 0 is at −Z (far / top of a +Y camera).
 * Dark scan caps sit on +Y for the tap-to-scan top-down pose.
 * @param {typeof import("three")} THREE
 */
export function buildLivingQr(THREE, spec) {
  const matrix = spec.matrix;
  const n = matrix.length;
  const cell = spec.cell ?? CELL;
  const livery = spec.livery;
  const dest = spec.dest;

  const group = new THREE.Group();
  group.name = "LivingQrTree";

  const capMat = new THREE.MeshBasicMaterial({
    color: 0x111318,
    toneMapped: false,
  });
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe6,
    roughness: 0.86,
    metalness: 0.02,
    envMapIntensity: 0.2,
  });
  const scanPaperMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  });
  const lightGeo = new THREE.BoxGeometry(cell * MODULE_FILL, cell * 0.02, cell * MODULE_FILL);
  const capGeo = new THREE.BoxGeometry(cell * 0.98, cell * 0.08, cell * 0.98);

  const origin = (n - 1) / 2;
  const mods = [];
  const kinds = { finder: 0, timing: 0, alignment: 0, data: 0 };
  const vocabs = { finder: 0, timing: 0, cabinet: 0, boom: 0, head: 0, led: 0 };
  const ledMats = [];
  const logoMats = [];

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const x = (c - origin) * cell;
      const z = (r - origin) * cell;
      if (!matrix[r][c]) {
        const tile = new THREE.Mesh(lightGeo, paperMat);
        tile.position.set(x, cell * 0.01, z);
        tile.name = `QrLight_${r}_${c}`;
        group.add(tile);
        continue;
      }
      const kind = classifyModule(n, r, c);
      const vocab = vocabFor(n, r, c);
      kinds[kind] += 1;
      vocabs[vocab] += 1;

      const g = new THREE.Group();
      g.name = `QrMod_${r}_${c}`;
      const crowdH = heightFor(vocab);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = "QrModTop";
      cap.position.y = crowdH + cell * 0.06;
      g.add(cap);

      g.position.set(x, 0, z);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseY: 0,
        bodyH: crowdH,
        crowdH,
        crowdScale: 1,
        miniCabinet: true,
        hasTrafficLight: false,
        yaw: ((r * 17 + c * 13) % 9 - 4) * 0.045,
        jx: ((r * 13 + c * 7) % 7 - 3) * cell * 0.035,
        jz: ((r * 5 + c * 11) % 7 - 3) * cell * 0.035,
        phase: ((r * 17 + c * 13) % 1000) / 1000 * Math.PI * 2,
      };
      group.add(g);
      mods.push(g);
    }
  }

  const padSize = (n + QUIET * 2) * cell;
  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(padSize * 2.35, cell * 0.035, padSize * 2.35),
    powder(THREE, livery.Y)
  );
  apron.name = "LivingQrApron";
  apron.position.y = -cell * 0.09;
  apron.receiveShadow = true;
  group.add(apron);

  const ring = new THREE.Mesh(
    new THREE.BoxGeometry(padSize * 1.18, cell * 0.05, padSize * 1.18),
    new THREE.MeshStandardMaterial({
      color: 0x1b2a4a,
      metalness: 0.12,
      roughness: 0.44,
    })
  );
  ring.name = "LivingQrRing";
  ring.position.y = -cell * 0.05;
  ring.receiveShadow = true;
  group.add(ring);

  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(padSize, cell * 0.04, padSize),
    paperMat
  );
  pad.name = "LivingQrPad";
  pad.position.y = -cell * 0.02;
  pad.receiveShadow = true;
  group.add(pad);

  const scanPad = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize, padSize),
    scanPaperMat
  );
  scanPad.name = "LivingQrScanPad";
  scanPad.rotation.x = -Math.PI / 2;
  scanPad.position.y = -cell * 0.01;
  scanPad.visible = false;
  group.add(scanPad);

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
    product: "living9-mini-portabooms",
    plane: "xz",
    cameraHint: "perspective-world / ortho-scan",
    miniHasTrafficLight: false,
    stripeModules: 0,
    miniCabinetSource: "lookalike",
    miniClonedFromTwin: false,
    miniFieldKind: "hero-cabinet-instances",
    modulePalette: "hero-orange",
  };

  const living = {
    group,
    mods,
    pad,
    apron,
    ring,
    scanPad,
    paperMat,
    scanPaperMat,
    topMat: capMat,
    ledMats,
    logoMats,
    n,
    cell,
    padSize,
    kinds,
    vocabs,
    darkCount: mods.length,
    miniHasTrafficLight: false,
    stripeModules: 0,
    miniCabinetSource: "lookalike",
    miniClonedFromTwin: false,
    miniFieldKind: "hero-cabinet-instances",
    miniField: null,
    miniInstances: [],
  };

  const logoMap = loadDoorDecal(THREE, (tex) => {
    for (const mat of living.logoMats) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
  });
  dressLookalikeCabinets(THREE, living, livery, logoMap);
  living.logoMap = logoMap;

  return living;
}

export function livingExtent(living) {
  return living.padSize;
}
