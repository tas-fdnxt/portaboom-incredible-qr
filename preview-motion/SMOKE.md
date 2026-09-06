# SMOKE · MOTION PREVIEW (not GATE-green / not READY)

Phone-width **390×844**. No pinch theatre. No Fabian-facing claim.

## motion1 tip — first paint ≤3s

Open `/?v=motion1` (or `preview-motion/tip.html`).

| Check | How |
| --- | --- |
| Pages is `text/html` | document content-type |
| First paint is living ICQR door | `__iqr.snap.viewMode === "door"` · `product === "motion1-icqr-door"` · cream field, cuboid minis, hero in crowd |
| Motion visible without pinch | `__iqr.snap.fieldMotionOn === true` · `fieldMotionAmpCell === 0.72` · modules bob on open |
| Boom up / LED rest | `__iqr.snap.boomPct` ~ 100 · `signalAspect === "green"` · face LEDs green (lights.ts rest) |
| Not a website twin | HUD hidden · `studioVisible === false` |
| living10 not used as this door | `motion1 === true` · living10 URL still separate |

## Tap flatten — modules hold for Camera

Tap the canvas once.

| Check | How |
| --- | --- |
| Flatten / contrast H-matrix | `__iqr.snap.scanOpen === true` · `magicPhase === "hold"` · white paper + dark caps |
| Hold ≥500ms | after 500ms `__iqr.snap.modulesStable === true` · `magicHoldMs >= 500` · `magicHoldRequiredMs === 500` |
| Modules frozen | Y back on `baseY`, no idle bob during hold |
| Payload honesty | `__iqr.snap.scanHoldPayload` is DEST product URL (baked H-matrix). Not a fake App Clip. |
| jsQR / Camera | `window.__iqr.captureScan()` then jsQR — Skills still run iPhone + Android Camera |

Second tap after hold starts **showtime on the same tip** (boom / LED SoT → DEST).

## Showtime on the same tip

`/?v=motion1&showtime=1` (idle 6s beat) **or** second tap after flatten.

| Check | How |
| --- | --- |
| Timing | green 0.5 → amber 1 → red 0.5 → boom down |
| LED SoT | green when raised-at-rest · red flash when moving-or-down · no invented amber face LEDs |
| Leave | `location.assign` default DEST (or `?dest=`) |

## motion3 tip — living field → cycle in field → flatten in place → DEST

Open `/?v=motion3` (or `preview-motion/tip-motion3.html`). No required first tap.

| Check | How |
| --- | --- |
| Pages is `text/html` | document content-type |
| First paint is living ICQR field | `__iqr.snap.viewMode === "door"` · `product === "motion3-icqr-door"` · cream field, cuboid minis · `studioVisible === false` · `icqrDoor === true` |
| Unit LEFT | `motion3UnitLeft === true` · `motion3HeroMidX < 0` |
| Field moves ≤3s | `fieldMotionOn === true` · `fieldMotionAmpCell === 0.72` · door beat **2.5s** |
| Cycle still in that field | `showtimePhase === "playing"` · `viewMode === "door"` · `scanOpen === false` · `twinInQrField === true` · boom moving · lights.ts green rest / red flash ~640ms |
| Morph in place (no cutaway) | `magicPhase === "hold"` · `morphInPlace === true` · `cutawayScan === false` · `scanOpen === false` · `viewMode === "door"` · boom still visible |
| Hold ≥500ms | `modulesStable === true` · `magicHoldMs >= 500` |
| Leave DEST | `destLeaveReason === "motion3-morph-hold"` · default PB4000 product URL · `?dest=` override uses existing dest-config parser |

**motion2 REJECTED — not this.** Do not assert `scanOpen === true` or `viewMode === "scan"` on the motion3 hold.

## motion2 tip — REJECTED cutaway (do not ship)

Open `/?v=motion2` (or `preview-motion/tip-motion2.html`). No required first tap.

| Check | How |
| --- | --- |
| Pages is `text/html` | document content-type |
| First paint is hero-lock, not ICQR door | `__iqr.snap.viewMode === "motion2"` · `product === "motion2-hero-lock"` · `cameraIsPerspective === true` |
| Left boom-down framed | `motion2FramedLeft === true` · `motion2HeroLeft === true` · `motion2BoomDownFrame` span **>** motion1 `doorBoomFrame` |
| Auto showtime | door beat **0.35s** then green 0.5 → amber 1 → red 0.5 → boom down. No tap required |
| LED SoT | green when raised-at-rest · red flash ~640ms when moving-or-down · no invented amber face LEDs |
| Flatten after boom | `magicPhase === "hold"` · `modulesStable === true` after ≥500ms · `scanOpen === true` |
| Leave DEST | `destLeaveReason === "motion2-flatten-hold"` · default PB4000 product URL · `?dest=` override uses existing dest-config parser |
| Motion ≤3s | boom lower starts at ~2.35s (0.35 + 0.5 + 1 + 0.5) |

## living10 regression (must stay)

| URL | Must |
| --- | --- |
| `/?v=living10&showtime=1` | `product === "living10-icqr-door"` · `viewMode === "door"` · field **not** idle-bobbing (`fieldMotionOn` false) · door beat **2.6s** · tap starts showtime (not motion1 flatten) · DEST after boom · `motion2 !== true` · `motion3 !== true` |
| `/?showtime=1` | same living10 door (no `v=motion1` / no `v=motion2` / no `v=motion3`) |
| `/?v=motion1` | still `motion1-icqr-door` · tap flatten · 6s showtime only with `?showtime=1` · `motion2 !== true` · `motion3 !== true` |
| `fabian-showtime-qr.png` | still encodes living10 showtime URL · file not overwritten |
| Default `/` (no query) | living2 world · Life + Tap to scan · no auto DEST |
| `/?v=preview5` | still hero-lock branch · living10 door untouched |

Runner notes (not executed as READY):

- living10: `node scripts/gate-living4-showtime.mjs`
- living2: `node scripts/gate-living2.mjs`
- motion1 helper: `node scripts/gate-motion1-smoke.mjs` (Playwright snap only — not phone GATE)
- motion2 helper: `node scripts/gate-motion2-smoke.mjs` (Playwright snap only — not phone GATE)
- motion3 helper: `node scripts/gate-motion3-smoke.mjs` (Playwright snap only — not phone GATE)

## Lane 2 animated companion (honest)

`preview-motion/DECODE.json` — 36 idle frames, 6 sampled, jsQR all null. Pair `/?v=motion1`. Not a scan door.

## SKIP / kill

- TEASER morph-GIF as product (modules not locked every idle frame)
- Static OPTION 1–4 as the new ask
- living11 · Meshopt · WebGPU rewrite · Apple-ring stickers
