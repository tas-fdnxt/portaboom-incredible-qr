# GATE — FINAL twin tidy

Phone-width (390×844) against local Pages root. Named GLB. `app.js?v=twin-tidy3`.
SoT: hero photo of real PB4000 + live twin `dist-bice-chi-12` + twin-core `sign.ts` / `lights.ts KINDCOL` / livery `S=0xcdd0d5`.
This is a first-format Pages bake tidy. **Not** living ICQR. **Not** WordPress. Do not merge — Chief reviews GATE then merges.

Four FINAL visual errors vs hero / live twin (review shots 1–4): green+yellow disc · black TL pole · black LED bezels + washed face LEDs · missing STOP + orange/coral boom chevrons.

## SMOKE — GREEN

| Check | Result |
| --- | --- |
| Loads on phone-width | Yes. WebGL, named twin, no JS error. Status `Idle. PB4000 clean core… · boom live` |
| Green+yellow disc gone | Tag `G` hidden (`gVis=0`). Misplaced `SignalHalo_*` CircleGeometries were sitting at CAD lens **origins** (cabinet top y≈0.56) — now pinned to each lens bbox center (red 1.167 / amber 1.029 / green 0.891). `strayGlow=0` |
| TL pole stainless | `poleStainless=3` when traffic ON. `LCOL.S=0xcdd0d5`, metalness 0.9. Housing loop skips poles; re-paint after `rigTrafficLamps` |
| Door LED bezels | `bezelHex=cdd0d5` aluminum, not black `101814` |
| Face LEDs | Rest both `2aff55` intensity 5.5. Advisory both `ff2a1a`, intensities opposite (`8` vs `1.6`) on 640 ms. KINDCOL family, not cyan |
| Boom chevrons | `livery.stripe=14`. Shader red `vec3(0.753,0.078,0.129)` = `#c01421` on white `0.96,0.97,0.98` |
| STOP mounted | Default **round**. Dock Round → Octagon → Round rebuilds (`signMounted=true`, `clampVis=4`). Clamp only with STOP face |
| Boom / toggles / orbit / flatten | Kept. Traffic OFF → aspect OFF, ON → GREEN + 3 stainless poles. Flatten then restore keeps bezels / STOP / no disc |

## STRESS — GREEN

| Step | Result |
| --- | --- |
| Disc after orbit / flatten / restore | `livery.gVis=0`, `strayGlow=0`. Halos stay on lanterns, not cabinet top |
| Lights off then on | Off: aspect OFF. On: `poleStainless=3`, HUD GREEN |
| Round → Octagon → Round | `signType` matches. Clamp stays visible (`clampVis=4`) |
| Door LEDs rest / advisory | Rest `2aff55`. Closing: `ff2a1a` L/R alternate (`8` / `1.6`) |
| Reload defaults | `signType=round`, STOP mounted, `solarOn=false`, `trafficOn=true`, `spin=false`, boom starts 100, face green |

## PRESSURE — GREEN (refutals)

| Claim | Refute |
| --- | --- |
| Green+yellow disc still behind boom | Two causes killed: (1) tag `G` twin glow `#bdf7c8`/`#39e562` hidden; (2) additive `SignalHalo_green` + `SignalHalo_amber` were parented at mesh origin on the cabinet lid. Halos now use geometry bbox center on each aspect |
| Pole still black | `rigTrafficLamps` housing no longer paints poles `0x070707`. `paintTrafficPolesStainless` after lamps. Snap `poleStainless=3` |
| LED rings black | `alumMat()` / `stainlessMat()` `0xcdd0d5` on `PortaboomLedBezel`. Snap `bezelHex=cdd0d5` |
| Face LEDs cyan/white | `FACE_GREEN`/`FACE_RED` are KINDCOL `0x2aff55` / `0xff2a1a`. DoorGlow sprites removed |
| Chevrons orange/coral | Stripe red tightened from `0.686,0.192,0.165` to `#c01421` family |
| No STOP | `setSignType('round')` after CAD mount. Dock Round/Octagon. `signMounted=true`, clamp shown |

## Ask set (this tidy)

1. Remove round green-and-yellow disc/glow behind boom / cabinet top
2. Traffic-light pole stainless `0xcdd0d5`, high metalness, when traffic on
3. Door LED bezels aluminum; face green/red match KINDCOL head lenses
4. Boom true red/white chevrons; STOP mounted with round + octagon dock toggle

Clean core + orbit + flatten-to-QR beat **kept** (not living ICQR).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
