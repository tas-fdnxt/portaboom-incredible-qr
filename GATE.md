# GATE — living2 Incredible QR (ICQR Magic Tree pattern)

Phone-width (390×844). `app.js?v=living2`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
ECC **H**, version **8**, **49×49**, **1258** dark modules (`qrcode@1.5.4`, packed in `qr-encode.js`).
SoT: twin-tidy5 PORTABOOM **in the default frame** (not a Unit-dock escape hatch). Pattern from https://tree.icqr.com/ (a 3D brand world that is itself scannable). No ICQR shop packs. No cherry tree. **Not** WordPress.

Proof runner: `node scripts/gate-living2.mjs` (Playwright + jsQR on `canvas.toDataURL`, not `qr.png`). Artifact: `gate-artifacts/living2-default.png`.

**Do not claim READY.** Decode is green. The default still reads as a scan-H mural with the PB4000 under it — not ICQR's single living world. Perspective of this H-matrix never locked jsQR in this harness.

## SMOKE

| Check | Result |
| --- | --- |
| Real H-matrix for DEST | GREEN — `size=49`, `ecc=H`, `version=8`, `dark=1258` |
| Live WebGL decodes DEST | GREEN — `canvas.toDataURL` → DEST (native or bbox-nearest). Not `qr.png` |
| Phone viewport (HUD on) | GREEN — 390×844 screenshot also decodes DEST |
| Default shows PORTABOOM, not only a flat B&W QR | **YELLOW / SHORT** — twin-tidy5 is **in the default frame** (cabinet, boom stripes, STOP, KINDCOL green). The mural still reads as a QR card because jsQR only locks the ortho scan-H peek (`≤ 0.24, 0.15`). A stranger can still say "that's a QR with a machine under it." |
| Twin-tidy5 quality in the living scene | GREEN — `usingGlb=true`, planted in default (not Unit dock). Ø400 mm / stripe period live on the twin (`signImpliedM` scales with living grow) |
| HUD minimal | GREEN — Life + More only. No dock wall. Flatten gone |
| Print PNG demoted | GREEN — `printClaimReady=false`. Print lives under More |

## STRESS

| Step | Result |
| --- | --- |
| Slight camera / orbit nudge | GREEN — `nudgeScan` stays inside the ortho peek envelope and still decodes DEST |
| +18% luminance | GREEN — still decodes DEST |
| Life ON still decodes | GREEN — side LED pulse + tiny −Z breathe; still decodes DEST |
| Failure envelope | **Honest:** perspective cameras on this 49×49 H-matrix **never** decoded (full pose sweep, twin hidden, NoToneMapping). Large orbit off the scan-H peek also fails. Default + small nudge + brightness + life are in envelope. Phone cameras that binarize like the framed mural should hit DEST. |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| It's just `qr.png` / one textured quad | `scanPlanePresent=false`. `moduleMeshGroups=1258 === darkCount`. Each dark cell is a `QrMod_r_c` group (cabinet / boom / head / LED body + dark cap). `product=living2-brand-world` |
| It's ortho black faces with no 3D | Bodies have real depth (`depthFor` 0.20–0.55) and brand materials. Peek `(0.24, 0.15)` shows sides. **Still:** the required scan pose is an ortho peek, so the mural can look card-like. Not fully refuted. |
| Twin only behind a button | **Partially refuted.** Unit dock is gone. Twin is in the default frame under the mural. **Not** the ICQR "machine IS the world" hero. |
| Print/Flatten is the product | Flatten button **gone**. `printClaimReady=false`. Status never READY on static art |

## What was tried and rejected for this bake

- Ground-plane ICQR plaza + perspective: **0/32** poses decoded
- XY mural + perspective (even on-axis fov 26–36, twin hidden): **0 hits**
- Only **ortho** + peek `≤ (0.24, 0.15)` + mural centered/high decoded
- Split viewport (QR band + twin band) broke framing and decode

## How to scan

Point a phone camera at the **white mural** in the default live pose. Do not flatten. The PB4000 sits under the mural in the same frame. Print PNG is paper-only.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
No Fabian Pages review link until Chief merges after GATE.
