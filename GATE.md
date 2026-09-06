# GATE — living2 Incredible QR (ICQR Magic Tree pattern)

Phone-width (390×844). `app.js?v=living2`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
ECC **H**, version **8**, **49×49**, **1258** dark modules (`qrcode@1.5.4`, packed in `qr-encode.js`).
SoT: twin-tidy5 PORTABOOM **in the default living world** (not a Unit-dock escape hatch). Pattern from https://tree.icqr.com/ (a 3D brand world that is itself scannable). No ICQR shop packs. No cherry tree. **Not** WordPress.

Default camera = **perspective** look at the PB4000 + 3D module plaza. Flatten-to-QR is **gone**. Print PNG is a demoted export under More and **must not** claim READY.

Proof runner: `node scripts/gate-living2.mjs` (Playwright + jsQR on `canvas.toDataURL`, not `qr.png`). Artifact: `gate-artifacts/living2-default.png`.

## SMOKE

| Check | Result |
| --- | --- |
| Real H-matrix for DEST | PENDING — runner fills |
| Default 390×844 shows PORTABOOM (not flat B&W QR) | PENDING — `living2-default.png` + brand vision |
| Live WebGL decodes DEST | PENDING — `canvas.toDataURL` |
| Twin-tidy5 quality in the living scene | PENDING — `defaultShowsTwin`, GLB, Ø400 mm, stripes |
| HUD minimal | PENDING — ≤2 primary controls; no dock wall; no Flatten |
| Print PNG demoted | PENDING — `printClaimReady=false` |

## STRESS

| Step | Result |
| --- | --- |
| Slight camera / orbit nudge | PENDING |
| +18% luminance | PENDING |
| Life ON still decodes | PENDING |
| Failure envelope | Document honestly if a large orbit leaves the scan pose |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| It's just a flat QR / textured quad / ortho black faces | Perspective camera + moduleMeshGroups + brand sides + default screenshot fails the "looks flat" test |
| Twin only behind a button | Default view shows the PB4000 (`defaultShowsTwin=true`). No Unit dock. |
| Print/Flatten is the product | Flatten button gone. `printClaimReady=false`. |

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
No Fabian Pages review link until Chief merges after GATE.
