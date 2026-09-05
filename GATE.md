# GATE — first-format twin tidy

Phone-width (390×844) against local Pages root. Named GLB. `app.js?v=twin-tidy2`.
SoT: live twin `dist-bice-chi-12` + twin-core `livery.ts` / `addDecals` / `classifyGroups` / `lights.ts updateLeds`.
This is a first-format Pages bake tidy. **Not** living ICQR. **Not** WordPress. Do not merge — Chief reviews GATE then merges.

Six visual errors vs live PB4000 (screenshots 1–6): logo spill · white stop mount · orphan TL pole · cyan door LEDs · white cabinet / wrong wheels · solid orange boom.

## SMOKE — GREEN

| Check | Result |
| --- | --- |
| Loads on phone-width | Yes. WebGL, named twin, no JS error |
| Cabinet / wheels / boom | Powder orange cabinet `Y=0xf47514`. Wheels/dark `K=0x222426`. Boom `stripeMaterial` red/white chevrons, band 0.12 |
| Logos | `door_decal.png` FIXED local width **0.26** (twin `addDecals`). Flush to cabinet ±Z. No `faceSpan*0.72` spill |
| Groups | `classifyGroups` hides mast `AK-XLH-D115C-03*` + spare `AK-XLH-D115C-01-01-11`. CAD `快速夹具` / `夹具` hidden (no STOP face mounted) |
| Door LEDs at rest | Green emissive `#3fe868` / glow `#77ff99` when boom up + idle. **Not** cyan `#77fcf9` |
| Door LEDs advisory | Red `#ff1810` ~640 ms, **alternate L/R** when moving OR down |
| Boom works | Raise/lower dock drives amber→red drop, then raise. `shownPct` travels 100→0→100 |
| Toggles work | Solar OFF/ON. Traffic lights ON/OFF (1 ↔ 0 heads, HUD GREEN/OFF) |
| Orbit works | OrbitControls + damping. No auto-spin unless Spin ON |
| Flatten-to-QR beat | Flatten glides onto scan-H `qr.png`. Restore unit returns HOME front |

## STRESS — GREEN

| Step | Result |
| --- | --- |
| Logo vs cabinet | Front + opposite plates stay inside door faces after orbit / flatten / restore. `logoLocalW === 0.26` |
| Orphan mast / spare socket | `livery.mastVis=0`. Spare socket hidden; one used socket may remain under the kept head |
| Stop clamp | `livery.clampVis=0` at rest, during boom travel, after flatten restore |
| Solar off then on | Hidden → panel `太阳能板` at cabinet top → off again. Orphan mast stays hidden |
| Lights off then on | Head group hidden, aspect OFF → one head, 3-aspect restores |
| Boom up/down LEDs | Up at rest: both faces `#3fe868`, glow `#77ff99`. Moving or down: faces `#ff1810`, L/R intensities opposite (`flashOn` vs `!flashOn`) |
| Reload keeps defaults | `solarOn=false`, `trafficHeads=1`, `extraHeads=0`, `productLeds=0`, `spin=false`, boom 100, face green, logos 0.26 |
| Flatten then restore | QR fills phone; restore keeps powder cabinet, striped boom, hidden mast/clamp, green rest LEDs |

## PRESSURE — GREEN (refutals)

| Claim | Refute |
| --- | --- |
| Logo still spills | `addLogoDecal` no longer scales by `faceSpan*0.72`. Twin fixed width 0.26 local. Plates sit on door min/max Z |
| White cabinet / steel wheels | `paintGlb` ports twin `ht()` tags. Cabinet CAD orange → `Y=0xf47514`. Wheel cream+dark CAD → `K=0x222426` |
| Solid orange boom | CAD boom tag `B` gets `stripeMaterial` (shader band `/ 0.12`, white `0.96,0.97,0.98` / red `0.686,0.192,0.165`) |
| Orphan TL pole still up | `classifyGroups` forces `AK-XLH-D115C-03*` `visible=false` after every `bindGroups` |
| White stop mount on boom | `快速夹具` / `夹具` hidden unless `signType` is STOP/octagon. This bake never mounts a STOP face |
| Cyan rest glow | Rest glow hex is `#77ff99`. Cyan `#77fcf9` is gone from `updateLeds` / `rigTwinLeds` |
| Both door LEDs flash together | Advisory uses per-lens mats. Left `flashOn`, right `!flashOn` on the same 640 ms period |
| Auto-spin | `setSpin` only. Tick forces `autoRotate=false` unless user Spin ON |

## Ask set (this tidy)

1. Cabinet powder orange `Y=0xf47514`; wheels/dark `K=0x222426`; stainless `S=0xcdd0d5`
2. Boom = `stripeMaterial` red/white chevrons, band ~0.12
3. Logos: `door_decal.png`, FIXED width 0.26, flush to cabinet faces
4. Hide mast `AK-XLH-D115C-03` + spare unused 2nd-head socket
5. Hide CAD stop clamp unless STOP face mounted (not mounted here)
6. Door LEDs: green `#3fe868` / glow `#77ff99` at rest; red `#ff1810` alternate L/R flash ~640 ms when moving or down
7. Clean core + dock + orbit + flatten-to-QR beat **kept** (not living ICQR)

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
