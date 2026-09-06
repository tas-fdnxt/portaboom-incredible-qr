# GATE — living2 Incredible QR (ICQR Magic Tree pattern)

Phone-width (390×844). `app.js?v=living2`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
ECC **H**, version **8**, **49×49**, **1258** dark modules (`qrcode@1.5.4`, packed in `qr-encode.js`).
SoT: twin-tidy5 PORTABOOM **in the default frame**, standing on a branded scannable plaza. Pattern from https://tree.icqr.com/ (a 3D brand world; tap reveals a clearer scan pose). No ICQR shop packs. No cherry tree. **Not** WordPress.

Proof runner: `node scripts/gate-living2.mjs` (Playwright + jsQR). Artifact: `gate-artifacts/living2-default.png` is the **shareable world** (must fail “looks like a normal QR”). Scan DEST is proven from the tap-to-scan pose, not from the default screenshot.

**Do not claim READY until the default 390×844 fails the normal-QR test and a stranger would not say “that’s just a QR.”**

## SMOKE

| Check | Result |
| --- | --- |
| Real H-matrix for DEST | pending this bake |
| Default 390×844 fails “looks like a normal QR” | **required before READY** |
| Default shows twin-tidy5 PB4000 on the plaza | required (not Unit dock) |
| Default camera is perspective world | required |
| Tap-to-scan WebGL decodes DEST | required — `captureScan()` canvas.toDataURL, not `qr.png` |
| HUD minimal | Life + Tap to scan. Flatten gone. Print under scan dock |

## STRESS

Tap-to-scan pose: small ortho peek, +18% luminance, Life ON. Default world is **not** required to decode.

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Default is a flat B&W QR (living1) | `looksLikeNormalQR === false` and `looksLikeFlatBWQR === false` on `living2-default.png` |
| Twin only behind Unit dock | Twin is the default hero. No Unit dock |
| It's just `qr.png` | 1258 module mesh groups. Dark caps are the scan matrix |
| Print/Flatten is the product | Flatten gone. `printClaimReady=false` |

## How to scan

Open the living 3D world. Tap the scene or **Tap to scan**. Point a phone at the scan pose. Print PNG is paper-only.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
No Fabian Pages review link until Chief merges after GATE.
