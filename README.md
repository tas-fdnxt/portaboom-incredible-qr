# PORTABOOM Incredible QR

Phone door for PORTABOOM PB4000 Incredible QR (Output C / golden).

Pages: https://tas-fdnxt.github.io/portaboom-incredible-qr/

## Twin used (M6 executive GOLDEN)

| File | Bytes | SHA-256 | Role |
| --- | ---: | --- | --- |
| `pb4000_master_NAMED-51parts_GOLDEN.glb` | 19,800,532 | `bfbe7c444d831d4346ff8df84c1b69a286f7c810764b1afabd6327f38199841d` | Full executive twin (Drive md5 `173416d4ef987f94b1d218fc7c89e576`). 303 nodes / 263 meshes / 624,192 verts. |
| `pb4000_master.compressed.glb` | 3,972,912 | `995af84c6f0317cd40baf5af7ee7f3162e495a1f8964d58304ed882869a80478` | **Phone primary.** Meshopt+quant of that exact GOLDEN (`gltf-transform meshopt` 19.8 MB → 3.97 MB). Same 303/263 tree, Traffic Light + 主杆 + 灯条 intact. |
| `pb4000_named.glb` | 2,138,420 | `db292e7416c647403e464ed00eb60b9cbfe94951ab314871d71ec834d066e210` | Last-resort fallback only. |

The previous 4.84 MB `pb4000_master.compressed.glb` was **not** a hash-match of this GOLDEN (607k quantized verts, older glTF-Transform). Replaced.

Load order: Meshopt GOLDEN → full 19.8 MB GOLDEN → named.

## Meshes rigged

- **Boom / orange:** `主杆`, `105-5`, `105_1`, `105-0`, `灯条`, `胶条` / `FENGKONGGAI*`, `PRT00033`, `PRT0001`, `006` — TAS `#EE7202`.
- **Cabinet / cream:** `AK-XLH-D115C-01-01*`, `01-02`, `01-03`, `01-04`, `小门`, `115-DOOR`.
- **Navy:** `太阳能板`, `01-01-4`, `01-01-5`, `01-01-8`.
- **Signal:** `Traffic Light 20260330(1).STEP` — black housing; discs by world Y = red / amber / green, emissive + halo.
- **Twin LEDs:** CAD `XT` parts are fasteners. Invented `ProductLed_A` / `ProductLed_B` amber/orange emissive discs on the signal-head flanks.
- **Logos:** `PortaboomLogoFace` (`portaboom_logo_reversed.png`), `PortaboomLogoSide` (`portaboom_logo.png`), `PortaboomLogoHero` (`portaboom-pb4000-master.png`).
- **Camera:** locked three-quarter. No continuous spin.

DEST stays https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/

Not sunset-island. NEVER SEND.
