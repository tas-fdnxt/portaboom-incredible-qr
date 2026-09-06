/**
 * Living QR field — a heap of miniature PORTABOOM cabinets.
 *
 * Dark modules are scaled-down twins of the planted cabinet (powder orange,
 * door_decal wordmark, wheels, face LEDs). Tiny ones do NOT grow traffic
 * lights or boom arms — those belong only to the planted unit.
 * Finder / timing / alignment keep a dark scan cap so tap-to-scan still
 * reads as a QR. Not a cherry tree. Not stripe towers. Not orange boxes
 * with a navy band and canvas junk.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";

export const CELL = 0.068;
export const MODULE_FILL = 0.86;

/** Manual PB4000 cabinet — used until the planted twin can be measured. */
const CAB_W = 0.415;
const CAB_H = 1.153;
const CAB_D = 0.72;

const SKIP_TWIN =
  /Traffic[_\s-]*Light|信号灯|HeroSignal|HeroLens|HeroBoom|BoomPivot|主杆|105-|105_|灯条|FENGKONG|^006$|太阳能|solar|柱子|PED_|TL2_|PortaboomBoom|HeroBoomArm|快速夹具|^夹具$|PortaboomStop|STOP|灯罩|灯壳/i;

function powder(THREE, hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    metalness: 0.04,
    roughness: 0.4,
    envMapIntensity: 1.05,
  });
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
    if (lum < 32) {
      id.data[i + 3] = 0;
    }
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

/**
 * Measure the planted cabinet only (no boom, no traffic head).
 * Returns world-space size / wheel layout so minis match the hero unit.
 */
export function measureTwinCabinet(THREE, root) {
  if (!root) return null;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let any = false;
  const wheels = [];
  let doorBox = null;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!isVisibleInTree(o)) return;
    const blob = ancestorBlob(o);
    const name = o.name || "";
    if (SKIP_TWIN.test(blob) || SKIP_TWIN.test(name)) return;
    if (o.userData?.tag === "B" || o.material?.userData?.stripe) return;
    const mb = new THREE.Box3().setFromObject(o);
    if (mb.isEmpty()) return;
    const isCab =
      /115-DOOR|HeroCabinet|小门|箱|柜|AK-XLH-D115C-01-01|AK-XLH-D115C-01-02|DAO-ZHA|d115c|车轮|wheel|PortaboomLogo|PortaboomFaceLed|PortaboomLedBezel/i.test(blob)
      || o.userData?.tag === "Y"
      || o.userData?.tag === "K";
    if (!isCab) return;
    box.union(mb);
    any = true;
    if (/115-DOOR|HeroCabinet/i.test(name) || /115-DOOR|HeroCabinet/i.test(blob)) {
      doorBox = doorBox ? doorBox.union(mb) : mb.clone();
    }
    if (/车轮|wheel/i.test(name) || /车轮|wheel/i.test(blob)) {
      const sz = mb.getSize(new THREE.Vector3());
      wheels.push({
        x: mb.getCenter(new THREE.Vector3()).x,
        z: mb.getCenter(new THREE.Vector3()).z,
        y: mb.getCenter(new THREE.Vector3()).y,
        r: Math.max(sz.y, Math.min(sz.x, sz.z)) * 0.5,
        t: Math.min(sz.x, sz.z, sz.y),
      });
    }
  });
  if (!any || box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!(size.y > 0.12) || !(size.x > 0.05)) return null;
  return {
    width: size.x,
    height: size.y,
    depth: size.z,
    center,
    minY: box.min.y,
    wheels: wheels.map((w) => ({
      x: w.x - center.x,
      z: w.z - center.z,
      r: w.r,
      t: w.t,
    })),
    doorWidth: doorBox && !doorBox.isEmpty() ? doorBox.getSize(new THREE.Vector3()).x : size.x * 0.86,
    source: "twin-cabinet",
  };
}

/**
 * Low-poly PORTABOOM cabinet that matches the hero silhouette:
 * tall powder-orange box, branded door, wheels, face LED bezels.
 * No traffic lantern. No boom. No navy stripe band.
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
    new THREE.BoxGeometry(width * 0.98, bodyH, depth * 0.94),
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
  door.position.set(0, bodyY, depth * 0.49);
  g.add(door);

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.02, chassisH, depth * 0.98),
    darkMat
  );
  chassis.name = "MiniChassis";
  chassis.position.y = wheelR * 1.05 + chassisH * 0.35;
  g.add(chassis);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, height * 0.025, depth * 0.88),
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
  lock.position.set(width * 0.28, bodyY + bodyH * 0.08, depth * 0.51);
  g.add(lock);

  const logoW = width * 0.58;
  const logoH = logoW * 0.698;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);
  logo.name = "MiniLogo";
  logo.position.set(0, bodyY - bodyH * 0.12, depth * 0.52);
  g.add(logo);
  const logoBack = new THREE.Mesh(
    new THREE.PlaneGeometry(logoW, logoH),
    logoMat.clone()
  );
  logoBack.name = "MiniLogoBack";
  logoBack.position.set(0, bodyY - bodyH * 0.12, -depth * 0.48);
  logoBack.rotation.y = Math.PI;
  g.add(logoBack);

  const ledY = bodyY + bodyH * 0.32;
  const ledZ = depth * 0.52;
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
      { x: -width * 0.32, z: -depth * 0.28, r: wheelR, t: wheelT },
      { x: width * 0.32, z: -depth * 0.28, r: wheelR, t: wheelT },
      { x: -width * 0.32, z: depth * 0.28, r: wheelR, t: wheelT },
      { x: width * 0.32, z: depth * 0.28, r: wheelR, t: wheelT },
    ];
  for (const w of wheelSlots) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.name = "MiniWheel";
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(w.x, w.r, w.z);
    g.add(wheel);
  }

  g.userData.bodyH = height;
  g.userData.cabW = width;
  g.userData.cabD = depth;
  g.userData.hasTrafficLight = false;
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
      const mod = living.mods[i];
      dummy.position.copy(mod.position);
      dummy.rotation.set(0, mod.userData.yaw || 0.42, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dummy.matrix.multiply(local);
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
  living.group.userData.miniHasTrafficLight = false;
  living.group.userData.stripeModules = 0;
  living.group.userData.miniCabinetSource = source;
  living.group.userData.product = "living8-mini-portabooms";

  const bodyH = prototype.userData.bodyH || CAB_H;
  for (const mod of living.mods) {
    mod.userData.bodyH = bodyH;
    mod.userData.miniCabinet = true;
    mod.userData.hasTrafficLight = false;
    const cap = mod.getObjectByName("QrModTop");
    if (cap) cap.position.y = bodyH + living.cell * 0.06;
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
      dummy.position.copy(living.mods[i].position);
      dummy.rotation.set(0, living.mods[i].userData.yaw || 0.42, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dummy.matrix.multiply(inst.local);
      inst.mesh.setMatrixAt(i, dummy.matrix);
    }
    inst.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function setMiniFieldVisible(living, visible) {
  if (living.miniField) living.miniField.visible = visible;
}

function scalePrototypeToCell(proto, cell) {
  const w = proto.userData.cabW || CAB_W;
  // Fit the cabinet face in the cell with a gap so they read as units, not a wall.
  const targetW = cell * MODULE_FILL * 0.78;
  const s = targetW / w;
  proto.scale.setScalar(s);
  proto.updateMatrixWorld(true);
  proto.userData.bodyH = (proto.userData.bodyH || CAB_H) * s;
  proto.userData.cabW = w * s;
  proto.userData.cabD = (proto.userData.cabD || CAB_D) * s;
  return proto;
}

export function dressLookalikeCabinets(THREE, living, livery, logoMap) {
  const proto = buildCabinetPrototype(THREE, {
    width: CAB_W,
    height: CAB_H,
    depth: CAB_D,
    livery,
    logoMap,
  });
  scalePrototypeToCell(proto, living.cell);
  instanceCabinetField(THREE, living, proto, "lookalike");
  living.ledMats = [];
}

export function dressMiniCabinetsFromTwin(THREE, living, twin, livery, logoMap) {
  const measured = measureTwinCabinet(THREE, twin);
  const aspect = measured ? measured.height / Math.max(measured.width, 1e-6) : 0;
  const sane = measured && aspect >= 1.8 && aspect <= 4.2 && measured.height > 0.3;
  const spec = sane
    ? {
      width: measured.width,
      height: measured.height,
      depth: Math.min(measured.depth, measured.width * 2.2),
      wheels: measured.wheels?.length >= 2 && measured.wheels.length <= 6
        ? measured.wheels
        : undefined,
      livery,
      logoMap,
    }
    : {
      width: CAB_W,
      height: CAB_H,
      depth: CAB_D,
      livery,
      logoMap,
    };
  const proto = buildCabinetPrototype(THREE, spec);
  scalePrototypeToCell(proto, living.cell);
  instanceCabinetField(
    THREE,
    living,
    proto,
    sane ? "twin-cabinet" : "lookalike"
  );
  living.ledMats = [];
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

  const guessH = (cell * MODULE_FILL * 0.9) * (CAB_H / CAB_W);

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
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = "QrModTop";
      cap.position.y = guessH + cell * 0.06;
      g.add(cap);

      g.position.set(x, 0, z);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseY: 0,
        bodyH: guessH,
        miniCabinet: true,
        hasTrafficLight: false,
        yaw: 0.42,
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
    product: "living8-mini-portabooms",
    plane: "xz",
    cameraHint: "perspective-world / ortho-scan",
    miniHasTrafficLight: false,
    stripeModules: 0,
    miniCabinetSource: "lookalike",
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
