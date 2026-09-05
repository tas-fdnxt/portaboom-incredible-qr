# GATE — FINAL twin tidy

Phone-width (390×844) against local Pages root. Named GLB. `app.js?v=twin-tidy3`.
SoT: hero photo of real PB4000 + live twin `dist-bice-chi-12` + twin-core `sign.ts` / `lights.ts KINDCOL` / livery `S=0xcdd0d5`.
This is a first-format Pages bake tidy. **Not** living ICQR. **Not** WordPress. Do not merge — Chief reviews GATE then merges.

Four FINAL visual errors vs hero / live twin (review shots 1–4): green+yellow disc · black TL pole · black LED bezels + washed face LEDs · missing STOP + orange/coral boom chevrons.

## SMOKE — pending browser verify

| Check | Result |
| --- | --- |
| Loads on phone-width | Pending |
| Green+yellow disc gone | Tag `G` CAD lime glow hidden + `killStrayGlowDiscs`. No doorGlow sprites. Disc-shaped `灯条` hidden |
| TL pole stainless | Mast/pole meshes `LCOL.S = 0xcdd0d5`, metalness 0.9. Housing paint skips poles; re-paint after `rigTrafficLamps` |
| Door LED bezels | Aluminum `0xcdd0d5`, not black `0x101814` |
| Face LEDs | KINDCOL green `0x2aff55` / red `0xff2a1a` — same family as 3-aspect head. Not cyan/white |
| Boom chevrons | Stripe shader red `vec3(0.753,0.078,0.129)` = `#c01421` on white `0.96,0.97,0.98` |
| STOP mounted | Default **round**. Dock Round / Octagon rebuilds via `setSignType` + `buildSign`. Clamp visible only with STOP face |
| Boom / toggles / orbit / flatten | Kept from prior bake |

## STRESS — pending browser verify

| Step | Result |
| --- | --- |
| Disc after orbit / flatten / restore | `livery.gVis === 0`, `strayGlow === 0` |
| Lights off then on | Pole stays stainless when traffic ON |
| Round → Octagon → Round | Face rebuilds; clamp stays visible; `__iqr.snap.signType` matches |
| Door LEDs rest / advisory | Rest both `2aff55`. Moving or down: `ff2a1a` alternate L/R ~640 ms |
| Reload defaults | `signType=round`, STOP mounted, solar off, traffic on, spin off, boom 100 |

## PRESSURE — pending (refutals)

| Claim | Refute |
| --- | --- |
| Green+yellow disc still behind boom | Previous bake painted tag `G` as twin glow (`#bdf7c8` / `#39e562` intensity 4). Now hidden + removed |
| Pole still black | `rigTrafficLamps` housing loop no longer paints poles `0x070707`; `paintTrafficPolesStainless` after lamps |
| LED rings black | `alumMat()` / `stainlessMat()` `0xcdd0d5` on `PortaboomLedBezel` |
| Face LEDs cyan/white | `FACE_GREEN`/`FACE_RED` are KINDCOL `0x2aff55` / `0xff2a1a`. Glow sprites removed |
| Chevrons orange/coral | Stripe red tightened from `0.686,0.192,0.165` to `#c01421` family |
| No STOP | `setSignType('round')` after CAD mount. Dock Round/Octagon |

## Ask set (this tidy)

1. Remove round green-and-yellow disc/glow behind boom / cabinet top
2. Traffic-light pole stainless `0xcdd0d5`, high metalness, when traffic on
3. Door LED bezels aluminum; face green/red match KINDCOL head lenses
4. Boom true red/white chevrons; STOP mounted with round + octagon dock toggle

Clean core + orbit + flatten-to-QR beat **kept** (not living ICQR).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
