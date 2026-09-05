# PORTABOOM Incredible QR

Phone door for PORTABOOM PB4000 Incredible QR (Output C / golden).

- `pb4000_master.compressed.glb` — golden 3D subject (Meshopt first on phones)
- `pb4000_named.glb` — fallback twin if Meshopt/golden fails
- `qr.png` — QR art
- Pages: https://tas-fdnxt.github.io/portaboom-incredible-qr/

## HARD LOCK (clean core bake)

1. Front of unit. No OrbitControls. No auto-rotate.
2. Twin-core face LEDs + boom strip: green raised-at-rest / red flash moving-or-down. **No** invented amber `ProductLed` flanks.
3. Traffic 3-aspect red / amber / green on the one head.
4. Twin-core yaw from merged PR #7: `model.rotation.y = Math.PI`; Traffic Light yaws in place so lenses face the cabinet front.
5. Twin livery: `door_decal.png` PORTABOOM on front + opposite face (`115-DOOR`).
6. SHOW CONFIG = clean core: cabinet + boom + **one** traffic head. Hide `太阳能板` and any 2nd head / pedestrian (`PED_` / `TL2_`).
7. Phone-safe named GLB (no Meshopt). Showtime-lock camera.
8. Cache-bust: `app.js?v=core1`.

DEST stays https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/

Not sunset-island. Not Command Hub. Vercel held. NEVER SEND.
