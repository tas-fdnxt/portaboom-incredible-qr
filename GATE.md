# GATE — living11 ICQR door (Ø400 STOP, 4 m boom, all-orange minis, living send still)

Phone-width (390×844). `app.js?v=living11`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living11&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: **ICQR-first door** — dense 3D QR field of cuboid minions around the hero PORTABOOM (yellow cabinet + traffic light + **one** boom). Elevated look into the field. Finder-pattern clusters stay dark. **Data modules are all-orange miniature PORTABOOM cabinets** (wordmark + face LEDs). **No** traffic lights / **no** booms on minis. Then green **0.5s** → amber **1s** → red **0.5s** → boom down. Then DEST. **Not** a twin-site 3/4 plaza. **Not** WordPress. **Not** a flat brand poster.

**living8 + living9 are REJECTED** (Fabian HARD): camera/crop + all-orange instanced strip flattened the door into a 2D poster. living11 keeps living10's dense 3D field and only changes STOP scale/orientation, boom tape, mini livery, and the send PNG.

Proof runner: `node scripts/gate-living4-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` — **living-scene still** of the H-matrix dressed as the PORTABOOM field (not paintClean B&W, not paintLivingMatrix).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## Receipts used (Fabian — do not invent mm)

From twin-tidy5 GATE + REAL (HIGH confidence):

| Constant | Receipt | Value |
| --- | --- | --- |
| `REAL.signDM` | PB4000 manual / Fabian STOP Ø400 | **0.40 m** |
| `REAL.cabinetHM` | PB4000 manual cabinet height | **1.153 m** |
| `REAL.cabinetWM` | PB4000 manual cabinet width | **0.415 m** |
| `REAL.boomM` | PB4000 4 m class | **4.0 m** |
| `REAL.stripePeriodM` | TAS/WZS studio tape (tidy5 pass 2) | **0.34 m** |
| `REAL.stripeRedDuty` | same | **0.48** |
| `SIGN_ALONG_DEFAULT` | tidy5 hero | **0.72** |
| `metresPerWorld` | `cabinetHM / doorHeightWorld` | planted |
| `signRadiusLocal` | `signDiameterWorld / (2 × pivotWorldScale)` | planted |
| `signImpliedM` | `signWorldDiameter × metresPerWorld` | **≈ 0.40** |
| `stopOverDoor` | `signWorldDiameter / doorHeightWorld` | **≈ 0.347** = `0.40 / 1.153` |
| `impliedBoomM` | `boomLengthWorld × metresPerWorld` | **~4.0–4.2** |
| STOP cancel | live-twin cancel-to-down (not tidy5 full cancel) | upright when boom **across / down** |
| STOP legend | tidy5 180° canvas `rotate(π)` | kept |

## SMOKE — first paint is the 3D QR field (elevated)

| Check | Result |
| --- | --- |
| `?showtime=1` first paint is ICQR QR field | GREEN — `viewMode=door`, `showtimePhase=door`, cream QR paper, dense cuboid modules, **not** living2 `lockWorldCamera` 3/4 plaza |
| Elevated 3D field, not dead-on poster | GREEN — `doorCamElevatedField=true`, elevation about **−12° to −38°**. Not living7/8/9 0° flatten. Not living6 roof-tilt |
| Cabinet + traffic light + boom in the field | GREEN — cabinet in frame. Signal in frame. Boom in frame (`doorBoomHidden=false`). Living5 cabinet-only hide rejected |
| One boom only | GREEN — `singleBoom=true`, `ghostBoomCount=0` on first paint and through lower |
| Mini field has no TL heads | GREEN — `miniHasTrafficLight=false`. Hero-only lantern. Cabinet minis may have face LEDs/wordmark |
| Field all-orange PORTABOOM minis | GREEN — `stripeModules=0`, `modulePalette=finder-dark / data-orange-portaboom`. Finders stay dark clusters for QR contrast |
| No brand poster header | GREEN — `backLogoVisible=false`. Brand lives on the hero cabinet and mini wordmarks |
| Not another website | studio / apron / HUD / brand chip hidden. `looksLikeWebsiteTwin=false` |
| Not a flat B&W QR card | `looksLikeFlatBWQR=false`. Colored living minis + unit volume |
| Not living9 flatten | `looksLikeFlattenedPoster=false`. Field fills the ground around the hero (less cream void than living10) |

## SMOKE — STOP Ø400 + boom 4 m + traffic-readable DOWN

| Check | Result |
| --- | --- |
| `signImpliedM≈0.40` | GREEN — planted `measurePlantedScale` ruler is cabinet height |
| `stopOverDoor≈0.347` | GREEN — `0.40 / 1.153` |
| `impliedBoomM` 4.0–4.2 | GREEN — 4 m class |
| Stripes | GREEN — `stripePeriodM=0.34`, `stripeRedDuty=0.48` |
| `signAlong=0.72` | GREEN — `SIGN_ALONG_DEFAULT` |
| Boom-down STOP for oncoming | GREEN — `signCancelMode=cancel-to-down`, `stopReadableForTraffic=true`, `showtime-stop-down.png` |

## SMOKE — transform → DEST

| Check | Result |
| --- | --- |
| Tap (or 2.6s door beat) starts transform | Stays on the QR door. Does **not** jump to a twin microsite |
| Timing 0.5+1+0.5+boom | GREEN — lock green **0.5s** → amber **1.0s** → red **0.5s** → boom down. Then **0.4s** beat and `location.assign(leaveDest)` |
| Single boom during lower | GREEN — `ghostMax=0`, `singleBoomDuringLower=true`, `boomPct` 100 → 0 |
| During lower = red / moving LEDs | `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL |
| After down = leave configured DEST (override) | `?dest=` URL-encoded test site → leave that URL, not the default |
| Zero website chrome on the door | `#hud` `display:none` for the whole showtime path |
| Stationary send QR | jsQR decodes living showtime URL `?v=living11&showtime=1` from `fabian-showtime-qr.png` (not DEST). Visual is living-scene field still (orange cuboids, not plain B&W) |
| Tap to scan → baked product matrix | default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living11&showtime=1` | ICQR door → 0.5+1+0.5+boom transform → default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap on the door | Starts transform (honest click → boom). Auto-beat if nobody taps |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Opens looking like another website / twin hub | `showtime-door.png` is the QR matrix + unit. Studio cyclorama off. HUD/brand gone. `product=living11-icqr-door` |
| living2/3d world-default is the showtime first paint | Showtime never calls `applyWorldPose` / `lockWorldCamera`. `viewMode=door` |
| Dead-on flatten / logo header / footer strip | Elevated camera. No `PortaboomBackLogo`. Dense cuboid field fills the ground |
| Ghost / duplicate upright boom | `killGhostBooms` attaches leftover stripe/主杆 meshes to `BoomPivot`. `singleBoom` during lower |
| Mini TLs / mini booms | `miniHasTrafficLight=false`. Face LEDs only on cabinet minis |
| Field wiped to one orange strip | Finder clusters stay dark. Data modules are **many** orange cabinets of varying height, not a living8/9 footer band |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Door + animation run first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle plaza |
| Send PNG is paintClean / wordmark modules | `livingScene.looksLivingField=true`, `looksPlainBW=false`, jsQR match living11 |
| STOP Ø invented | `measurePlantedScale` + snap `signImpliedM` / `stopOverDoor` from REAL metres |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary living-scene still).
2. Camera opens the living Incredible QR **door** — elevated 3D field of orange cuboid PORTABOOMs around the hero (cabinet + traffic light + one boom + Ø400 STOP).
3. Tap (or wait one beat). Watch green 0.5s → amber 1s → red 0.5s → boom down **on that QR world**. STOP reads for oncoming traffic when the boom is across.
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
