# GATE — living Incredible QR (ICQR Magic Tree pattern)

Phone-width (390×844). `app.js?v=living1`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
ECC **H**, version **8**, **49×49**, **1258** dark modules (`qrcode@1.5.4`, packed in `qr-encode.js`).
SoT: twin-tidy5 livery as **module language** + Unit dock. Pattern from https://tree.icqr.com/ (3D that doubles as a scannable QR). No ICQR shop packs. No cherry tree. **Not** WordPress.

Default camera = orthographic phone-scan pose of the living matrix (tiny peek so cabinet/boom sides read). Flatten-to-`qr.png` is gone. Print PNG is a secondary export and **must not** claim READY.

Proof runner: `node scripts/gate-living-scan.mjs` (Playwright + jsQR on `canvas.toDataURL`, not `qr.png`).

## SMOKE — live 3D scan — GREEN

| Check | Result |
| --- | --- |
| Real H-matrix for DEST | GREEN — `size=49`, `ecc=H`, `version=8`, `dark=1258` |
| Dark modules are 3D PORTABOOM vocab | GREEN — finder 99 · timing 28 · alignment 102 · data 1029. Vocab: cabinet 255 / boom 268 / head 351 / led 257 / finder stainless |
| Default pose scannable | GREEN — jsQR **native** decode of `canvas.toDataURL` default live WebGL → DEST. Not `qr.png` |
| Finder + timing readable | GREEN — three finders + timing classify; decode succeeds |
| Phone viewport (HUD on) | GREEN — full 390×844 screenshot also decodes DEST native |
| Twin-tidy5 not lost | GREEN — Unit dock `usingGlb=true`, `signImpliedM=0.40`, `stripePeriodM=0.34` |
| Print PNG demoted | GREEN — buttons say Print PNG; `printClaimReady=false`; status never READY on static art |
| Restore live after dock | GREEN — back to living pose still decodes DEST |

## STRESS — tilt / brightness — GREEN

| Step | Result |
| --- | --- |
| Slight camera nudge `(0.28, 0.18, 8)` | GREEN — still decodes DEST (native) |
| +18% luminance on the live frame | GREEN — still decodes DEST (native) |
| Life ON (side LED pulse + tiny −Z breathe) | GREEN — default pose decoded with Life ON |
| Failure envelope | Honest: large orbit off the scan axis (Unit dock / free look) is **not** a scan pose. Default + slight nudge + brightness are in envelope. jsQR at some raw high-res letterbox sizes can miss until the matrix is framed; native hit on this bake. Phone cameras binarize like the framed matrix. |

## PRESSURE — not a textured quad — GREEN

| Claim | Refute |
| --- | --- |
| It's just `qr.png` on a plane | `scanPlanePresent=false`. No flatten-to-texture product. Print PNG is generated from the same H-matrix, secondary only |
| One textured quad | `moduleMeshGroups=1258 === darkCount`. Each dark cell is a `QrMod_r_c` group (body + dark face + optional band/rim/LED). `product=modular-geometry` |
| READY from print PNG | `printClaimReady=false`. Status: “Print export saved — not the live scan.” |

## How to scan

Point a phone camera at the **white 3D module field** (default live pose). Do not flatten. Unit dock is the planted twin. Print PNG is paper-only.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
No Fabian Pages review link until Chief merges after GATE.
