# OPTION 5 · PREVIEW · `?v=preview5`

Living tip polish on a **named query**. Not living11.

## SHIPPED (PREVIEW only)

| Item | Path |
| --- | --- |
| Query | `/?v=preview5` (also accepts `&showtime=1`) |
| GLB | `pb4000_named.glb` — already loaded first |
| Camera | `lockHeroCamera` (cabinet + one head, front) |
| LEDs | existing `updateLeds` twin SoT — green raised-at-rest; red flash ~640 ms moving-or-down |
| Showtime | ~3 s play (0.5 + 1 + 0.5 + boom). preview5 door beat 0.85 s |
| Leave | same DEST as living10 (`dest-config.mjs`) |

## NOT SHIPPED

- **MeshoptDecoder / gltfpack** — SKIP overnight. `app.js` already documents that a static MeshoptDecoder import blanked phones. Compressed golden GLB stays off the path.
- living11.
- Amber face LEDs (not in twin SoT).
- Fabian-facing READY / send.

## living10 lock

`?v=living10&showtime=1` and bare `?showtime=1` keep the elevated ICQR door (`lockDoorCamera` / `doorCam`). preview5 is a separate `v=` branch inside `app.js`. Do not merge anything that changes that living10 door.

## GATE holes

Phone decode is not this option’s still (use OPTION 1–3 stills). This option needs a **tip GATE**: preview5 showtime + living10 regression on iPhone and Android before anyone treats it as a send.
