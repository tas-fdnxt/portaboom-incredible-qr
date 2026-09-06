# GATE — living2 Incredible QR (ICQR Magic Tree pattern)

Phone-width (390×844). `app.js?v=living2`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
ECC **H**, version **8**, **49×49**, **1258** dark modules (`qrcode@1.5.4`, packed in `qr-encode.js`).
SoT: twin-tidy5 PORTABOOM **in the default frame**, standing on a branded scannable plaza. Pattern from https://tree.icqr.com/ (a 3D brand world; tap reveals a clearer scan pose). No ICQR shop packs. No cherry tree. **Not** WordPress.

Proof runner: `node scripts/gate-living2.mjs` (Playwright + jsQR). Artifact: `gate-artifacts/living2-default.png` is the **shareable world**. Scan DEST is proven from the tap-to-scan pose (`captureScan()`), not from the default screenshot, not `qr.png`.

Automated GATE **exits 0**. Chief still decides merge. Do not send WordPress. No Fabian Pages review link until Chief merges.

## SMOKE

| Check | Result |
| --- | --- |
| Real H-matrix for DEST | GREEN — `size=49`, `ecc=H`, `version=8`, `dark=1258` |
| Default 390×844 fails “looks like a normal QR” | GREEN — `looksLikeNormalQR=false`, `looksLikeFlatBWQR=false`. Orange ratio 0.072, chroma 0.21. Twin in frame (`portaboomVisible`, 95k orange px, KINDCOL green). Camera is perspective. Viewport of the **world** does **not** decode (correct — it is not a QR card). |
| Default shows twin-tidy5 PB4000 on the plaza | GREEN — `usingGlb=true`, `defaultShowsTwin=true`, `signImpliedM=0.40`, stripe period 0.34. Cabinet / boom / head / LEDs are the hero. No Unit dock. |
| Tap-to-scan WebGL decodes DEST | GREEN — `canvas.toDataURL` native jsQR → DEST |
| HUD minimal | GREEN — Life + Tap to scan. Flatten gone. Print only after scan. `printClaimReady=false` |

## STRESS

| Step | Result |
| --- | --- |
| Small scan-camera nudge | GREEN — DEST via bbox-nearest-256 |
| +18% luminance | GREEN — DEST native |
| Life ON | GREEN — DEST native |

Failure envelope: the **default world** is not a scan card. Phone cameras must use **Tap to scan** (or a tap on the canvas) to get the ortho +Y caps. Orbit of the world will not decode.

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Default is living1’s flat B&W QR | `living2-default.png` fails `looksLikeNormalQR`. Perspective 3/4 of the PB4000 on a powder-orange / stripe plaza. |
| Twin only behind Unit dock | Twin is the default hero. `unitDockPresent=false`. |
| It’s just `qr.png` | `moduleMeshGroups=1258 === darkCount`. Dark caps are the scan matrix. |
| Print/Flatten is the product | Flatten gone. `printClaimReady=false`. |

## How to scan

Open the living 3D world. Tap the scene or **Tap to scan**. Point a phone at the scan pose. Print PNG is paper-only.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
