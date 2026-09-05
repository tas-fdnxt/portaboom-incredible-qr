# PORTABOOM Incredible QR

Phone door for PORTABOOM PB4000 Incredible QR (Output C / golden).

- `pb4000_master.compressed.glb` — golden 3D subject (Meshopt first on phones)
- `pb4000_named.glb` — fallback twin if Meshopt/golden fails
- `qr.png` — QR art
- Pages: https://tas-fdnxt.github.io/portaboom-incredible-qr/

## Meshes rigged (this cut)

- **Boom / orange:** `主杆`, `105-5`, `105_1`, `105-0`, `灯条`, `胶条` / `FENGKONGGAI*`, `PRT00033`, `PRT0001`, `006` — TAS `#EE7202`.
- **Cabinet / cream:** `AK-XLH-D115C-01-01*` (body, doors), `01-02`, `01-03`, `01-04`, `小门`, `115-DOOR`.
- **Navy accents:** `太阳能板`, `01-01-4`, `01-01-5`, `01-01-8`.
- **Signal head:** `Traffic Light 20260330(1).STEP` — housing forced black; three thin discs stacked by world Y = red / amber / green, emissive + halo + point light.
- **Twin round LEDs:** product meshes were not two clear beacons (XT parts are 6×15 mm fasteners). **Invented** `ProductLed_A` / `ProductLed_B` — 100 mm amber/orange emissive discs + dome + halo, parented to the signal head flanks so they stay in the hero frame and pulse with boom motion.
- **Logos:** `PortaboomLogoFace` (`portaboom_logo_reversed.png`) on the camera-facing cabinet; `PortaboomLogoSide` (`portaboom_logo.png`) on the three-quarter side; `PortaboomLogoHero` (`portaboom-pb4000-master.png`) product plate. Large, readable.
- **Camera:** locked three-quarter hero. No continuous model spin.

DEST stays https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/

Not sunset-island. Not Command Hub. Vercel held. NEVER SEND.
