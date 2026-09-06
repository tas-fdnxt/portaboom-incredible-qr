/**
 * Living QR field — a heap of miniature PORTABOOM cabinets.
 *
 * Dark modules are scaled clones of the real PB4000 cabinet mesh
 * (body + door from the planted GLB). Tiny ones do NOT grow traffic
 * lights or boom arms — those belong only to the planted twin.
 * Finder / timing / alignment keep a dark scan cap so tap-to-scan
 * still reads as a QR. Not stripe towers. Not abstract black boxes.
 */
import { classifyModule, vocabFor, QUIET } from "./qr-encode.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const CELL = 0.068;
export const MODULE_FILL = 0.86;

const CABINET_KEEP = /AK-XLH-D115C-01-01-1$|AK-XLH-D115C-01-02-1$|AK-XLH-D115C-01-01-9$|车轮|wheel|HeroCabinet|PortaboomLogoFace/i;
const CABINET_SKIP = /Traffic|信号|HeroSignal|HeroLens|灯条|105-|105_|主杆|太阳能|solar|PED_|TL2_|柱子|灯杆|PART_|GB_T|螺钉|垫|自攻|开口销|环芯|螺柱|调节座|配件|PCB|电池|01-05-9|LOCK-NEW|转接板|合页|DAO-ZHA|\bXT\b|快速夹具|吊环/i;

function makeMiniLogoTex(THREE) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 180;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 180);
  ctx.fillStyle = "#1b1e24";
  ctx.font = "900 54px Arial Black, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PORTA", 128, 50);
  ctx.fillText("BOOM", 128, 104);
  ctx.fillStyle = "#c01421";
  for (let i = 0; i < 4; i += 1) {
    const x = 78 + i * 28;
    ctx.beginPath();
    ctx.moveTo(x, 138);
    ctx.lineTo(x + 14, 138);
    ctx.lineTo(x + 6, 162);
    ctx.lineTo(x - 8, 162);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function powder(THREE, hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.05,
    sheen: 0.22,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
  });
}

function heightFor(vocab) {
  if (vocab === "finder") return 0.22;
  if (vocab === "cabinet") return 0.18;
  if (vocab === "head") return 0.16;
  if (vocab === "led") return 0.15;
  if (vocab === "timing") return 0.13;
  return 0.16;
}

function ancestorBlob(o) {
  const parts = [];
  let p = o;
  while (p) {
    if (p.name) parts.push(p.name);
    p = p.parent;
  }
  return parts.join("|");
}

function isCabinetKeepMesh(o) {
  if (!o?.isMesh || o.visible === false) return false;
  const name = o.name || "";
  const blob = ancestorBlob(o);
  if (CABINET_SKIP.test(name) || CABINET_SKIP.test(blob)) return false;
  if (/车轮|wheel/i.test(name)) return true;
  if (/PortaboomLogoFace|HeroCabinet/i.test(name)) return true;
  return CABINET_KEEP.test(name);
}

function hideAbstractChrome(mod) {
  mod.traverse((o) => {
    if (/MiniCabinet|MiniBand|MiniWheel|MiniLogo/.test(o.name || "")) o.visible = false;
  });
}

/**
 * Bake a recognisable PORTABOOM cabinet (no lantern, no boom) from the
 * planted GLB. Wheels on y=0, xz-centered, door facing +Z (camera).
 */
export function extractCabinetPrototype(THREE, root) {
  if (!root) return null;
  root.updateMatrixWorld(true);
  const proto = new THREE.Group();
  proto.name = "MiniCabinetProto";
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  let body = 0;
  let wheels = 0;
  let logos = 0;

  root.traverse((o) => {
    if (!isCabinetKeepMesh(o)) return;
    const mesh = new THREE.Mesh(o.geometry, o.material);
    const blob = ancestorBlob(o);
    if (/车轮|wheel/i.test(blob)) {
      if (wheels >= 2) return;
      mesh.name = "MiniCabinetWheel";
      wheels += 1;
    } else if (/PortaboomLogo/i.test(o.name || "")) {
      mesh.name = "MiniCabinetLogo";
      logos += 1;
    } else {
      mesh.name = "MiniCabinetBody";
      body += 1;
    }
    o.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
    proto.add(mesh);
    tmp.setFromObject(mesh);
    if (!tmp.isEmpty()) box.union(tmp);
  });

  if (body < 1 || box.isEmpty()) return null;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  for (const child of proto.children) {
    child.position.x -= center.x;
    child.position.y -= box.min.y;
    child.position.z -= center.z;
  }
  proto.userData = {
    body,
    wheels,
    logos,
    size: { x: size.x, y: size.y, z: size.z },
    fromGlb: true,
    hasTrafficLight: false,
  };
  proto.updateMatrixWorld(true);
  return proto;
}

function bakeWorldGeo(THREE, mesh) {
  const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", src.attributes.position.clone());
  if (src.attributes.normal) geo.setAttribute("normal", src.attributes.normal.clone());
  else geo.computeVertexNormals();
  mesh.updateMatrixWorld(true);
  geo.applyMatrix4(mesh.matrixWorld);
  geo.computeVertexNormals();
  if (src !== mesh.geometry) src.dispose();
  return geo;
}

function mergeNamed(THREE, proto, nameRe) {
  const geos = [];
  let mat = null;
  proto.traverse((o) => {
    if (!o.isMesh || !nameRe.test(o.name || "")) return;
    geos.push(bakeWorldGeo(THREE, o));
    if (!mat && o.material) mat = o.material;
  });
  if (!geos.length) return null;
  let merged = geos[0];
  if (geos.length > 1) {
    try {
      merged = mergeGeometries(geos, false) || geos[0];
    } catch {
      merged = geos[0];
    }
    geos.forEach((g) => { if (g !== merged) g.dispose(); });
  }
  return { geometry: merged, material: mat };
}

/**
 * Replace abstract box minis with instanced clones of the real cabinet.
 * One / two draw calls for the whole field. No traffic lights.
 */
export function dressMinisFromCabinet(THREE, living, proto, opts = {}) {
  if (!living?.mods?.length || !proto) return false;
  proto.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(proto);
  if (box.isEmpty()) return false;
  const size = box.getSize(new THREE.Vector3());
  if (size.y < 0.05) return false;

  const body = mergeNamed(THREE, proto, /MiniCabinetBody/);
  if (!body?.geometry) return false;
  const wheels = mergeNamed(THREE, proto, /MiniCabinetWheel/);
  const logos = mergeNamed(THREE, proto, /MiniCabinetLogo/);

  const liveryY = opts.livery?.Y ?? 0xf47514;
  const bodyMat = body.material || powder(THREE, liveryY);
  const wheelMat = wheels?.material || new THREE.MeshStandardMaterial({
    color: opts.livery?.K ?? 0x222426,
    metalness: 0.18,
    roughness: 0.62,
  });

  const fill = (living.cell ?? CELL) * MODULE_FILL;
  const count = living.mods.length;
  const dummy = new THREE.Object3D();
  const scales = new Float32Array(count);

  const makeField = (geometry, material, name) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.userData.miniCabinet = true;
    mesh.userData.hasTrafficLight = false;
    return mesh;
  };

  const bodyField = makeField(body.geometry, bodyMat, "MiniCabinetField");
  const wheelField = wheels?.geometry
    ? makeField(wheels.geometry, wheelMat, "MiniCabinetWheels")
    : null;

  let logoField = null;
  if (logos?.geometry) {
    logoField = makeField(logos.geometry, logos.material, "MiniCabinetLogos");
  } else {
    const logoH = size.y * 0.28;
    const logoW = Math.min(size.x, size.z) * 0.62;
    const logoGeo = new THREE.PlaneGeometry(logoW, logoH);
    const logoMat = new THREE.MeshBasicMaterial({
      map: makeMiniLogoTex(THREE),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoMesh.position.set(0, size.y * 0.52, size.z * 0.5 + 0.004);
    proto.add(logoMesh);
    logoMesh.updateMatrixWorld(true);
    const baked = bakeWorldGeo(THREE, logoMesh);
    logoField = makeField(baked, logoMat, "MiniCabinetLogos");
  }

  const fields = [bodyField, wheelField, logoField].filter(Boolean);

  const writeInstance = (i, x, y, z, s) => {
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(s);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    for (const field of fields) field.setMatrixAt(i, dummy.matrix);
  };

  living.mods.forEach((m, i) => {
    const targetH = heightFor(m.userData.vocab);
    const sH = targetH / size.y;
    const sW = fill / Math.max(size.x, size.z);
    const s = Math.min(sH, sW);
    scales[i] = s;
    writeInstance(i, m.position.x, 0, m.position.z, s);
    hideAbstractChrome(m);
    m.userData.fromGlb = true;
    m.userData.miniCabinet = true;
    m.userData.hasTrafficLight = false;
    m.userData.bodyH = size.y * s;
  });

  for (const field of fields) {
    field.instanceMatrix.needsUpdate = true;
    living.group.add(field);
  }

  living.cabinetField = bodyField;
  living.wheelField = wheelField;
  living.logoField = logoField;
  living.miniScales = scales;
  living.miniFromGlb = true;
  living.miniHasTrafficLight = false;
  living.stripeModules = 0;
  living.miniCabinetMeshCount = proto.userData?.body ?? 0;
  living.miniPrototypeName = proto.name;
  living.product = "living8-mini-cabinets";
  if (living.group.userData) {
    living.group.userData.product = "living8-mini-cabinets";
    living.group.userData.miniFromGlb = true;
    living.group.userData.miniHasTrafficLight = false;
    living.group.userData.stripeModules = 0;
  }

  living.syncMiniLife = (t, amp) => {
    living.mods.forEach((m, i) => {
      const y = (m.userData.baseY || 0) + Math.sin(t * 1.05 + m.userData.phase) * amp;
      m.position.y = y;
      writeInstance(i, m.position.x, y, m.position.z, scales[i]);
    });
    for (const field of fields) field.instanceMatrix.needsUpdate = true;
  };

  living.setMiniChromeVisible = (on) => {
    for (const field of fields) field.visible = on;
    for (const m of living.mods) {
      if (on) hideAbstractChrome(m);
    }
  };

  return true;
}

/**
 * Modules live on the XZ plaza. Row 0 is at −Z (far / top of a +Y camera).
 * Dark scan caps sit on +Y for the tap-to-scan top-down pose.
 * Abstract boxes are a pre-GLB fallback only — dressMinisFromCabinet
 * swaps them for real cabinet clones once the twin is planted.
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
  const cabMat = powder(THREE, livery.Y);
  const cabDeepMat = powder(THREE, 0xc45a10);
  const cabFinderMat = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    metalness: 0.16,
    roughness: 0.48,
    envMapIntensity: 0.7,
  });
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x1b2a4a,
    metalness: 0.12,
    roughness: 0.44,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: livery.K,
    metalness: 0.18,
    roughness: 0.62,
  });
  const logoMat = new THREE.MeshBasicMaterial({
    map: makeMiniLogoTex(THREE),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const logoFinderMat = new THREE.MeshBasicMaterial({
    map: logoMat.map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    color: 0xd8dde6,
  });

  const fill = cell * MODULE_FILL;
  const capGeo = new THREE.BoxGeometry(cell * 0.98, cell * 0.08, cell * 0.98);
  const bodyGeo = new THREE.BoxGeometry(fill * 0.92, 1, fill * 0.72);
  const bandGeo = new THREE.BoxGeometry(fill * 0.94, fill * 0.07, fill * 0.74);
  const wheelGeo = new THREE.CylinderGeometry(fill * 0.10, fill * 0.10, fill * 0.07, 10);
  const logoGeo = new THREE.PlaneGeometry(fill * 0.7, fill * 0.48);
  const lightGeo = new THREE.BoxGeometry(fill, cell * 0.02, fill);

  const origin = (n - 1) / 2;
  const mods = [];
  const kinds = { finder: 0, timing: 0, alignment: 0, data: 0 };
  const vocabs = { finder: 0, timing: 0, cabinet: 0, boom: 0, head: 0, led: 0 };
  const ledMats = [];

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
      const bodyH = heightFor(vocab);
      const finderish = kind === "finder" || kind === "alignment";
      const bodyMat = finderish
        ? cabFinderMat
        : ((r + c) % 3 === 0 ? cabDeepMat : cabMat);

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.name = "MiniCabinet";
      body.scale.y = bodyH;
      body.position.y = bodyH * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const band = new THREE.Mesh(bandGeo, navyMat);
      band.name = "MiniBand";
      band.position.y = bodyH * 0.62;
      g.add(band);

      for (const wz of [-fill * 0.22, fill * 0.22]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.name = "MiniWheel";
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, fill * 0.11, wz);
        g.add(wheel);
      }

      const logo = new THREE.Mesh(logoGeo, finderish ? logoFinderMat : logoMat);
      logo.name = "MiniLogo";
      logo.position.set(0, bodyH * 0.42, fill * 0.33);
      g.add(logo);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.name = "QrModTop";
      cap.position.y = bodyH + fill * 0.08;
      g.add(cap);

      g.position.set(x, 0, z);
      g.userData = {
        r,
        c,
        kind,
        vocab,
        baseY: 0,
        bodyH,
        miniCabinet: true,
        hasTrafficLight: false,
        fromGlb: false,
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
    navyMat
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
    product: "living8-mini-cabinets",
    plane: "xz",
    cameraHint: "perspective-world / ortho-scan",
    miniHasTrafficLight: false,
    stripeModules: 0,
    miniFromGlb: false,
  };

  return {
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
    n,
    cell,
    padSize,
    kinds,
    vocabs,
    darkCount: mods.length,
    miniHasTrafficLight: false,
    stripeModules: 0,
    miniFromGlb: false,
    cabinetField: null,
    wheelField: null,
    logoField: null,
    setMiniChromeVisible: null,
    syncMiniLife: null,
  };
}

export function livingExtent(living) {
  return living.padSize;
}
