# GATE — living7 ICQR door (straight-on, one boom, mini field, brand back)

Phone-width (390×844). `app.js?v=living7`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living7&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: **ICQR-first door** — pixelated QR field of miniature PORTABOOM cabinets, planted unit (cabinet + traffic light + **one** boom) **straight-on** so lenses read, big PORTABOOM logo in the back. Then green 1s → amber 1s → red 1s → boom down 1s (~4s). Then DEST. **Not** a twin-site 3/4 plaza. **Not** WordPress.

Proof runner: `node scripts/gate-living4-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — first paint is the QR door (straight-on)

| Check | Result |
| --- | --- |
| `?showtime=1` first paint is ICQR QR field | GREEN — `viewMode=door`, `showtimePhase=door`, cream QR paper, mini-cabinet modules, **not** living2 `lockWorldCamera` 3/4 plaza |
| Straight-on lenses | GREEN — `doorCamFrontFacing=true`, elevation **0°**. Lantern `heightFrac=0.208` `fullyIn`. Not living6 steep roof-tilt |
| Cabinet + traffic light + boom in the field | GREEN — cabinet `heightFrac=0.232`. Signal `fullyIn`. Boom in frame (`doorBoomHidden=false`). Living5 cabinet-only hide rejected |
| One boom only | GREEN — `singleBoom=true`, `ghostBoomCount=0` on first paint and through lower |
| Mini field is PORTABOOMs, no TL heads | GREEN — `miniHasTrafficLight=false`, `stripeModules=0`. No mini lanterns |
| Brand in the back | GREEN — `backLogoVisible=true`, `backLogoInFrame=true` |
| Not another website | studio / apron / HUD / brand chip hidden. `looksLikeWebsiteTwin=false` |
| Not a flat B&W QR card | `looksLikeFlatBWQR=false`. Colored living minis + unit volume |

## SMOKE — transform → DEST

| Check | Result |
| --- | --- |
| Tap (or 2.6s door beat) starts transform | Stays on the QR door. Does **not** jump to a twin microsite |
| Timing ~1+1+1+1 | GREEN — measured green **1.075s** → amber **1.003s** → red hold **1.132s** → boom down; settle **4.049s**. Then **0.4s** beat and `location.assign(leaveDest)` |
| Single boom during lower | GREEN — `ghostMax=0`, `singleBoomDuringLower=true`, `boomPct` 100 → 0 |
| During lower = red / moving LEDs | `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL |
| After down = leave configured DEST (override) | `?dest=` URL-encoded test site → leave that URL, not the default |
| Zero website chrome on the door | `#hud` `display:none` for the whole showtime path |
| Stationary send QR | jsQR decodes living showtime URL `?v=living7&showtime=1` from `fabian-showtime-qr.png` (not DEST) |
| Tap to scan → baked product matrix | default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living7&showtime=1` | ICQR door → 4s transform → default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap on the door | Starts transform (honest click → boom). Auto-beat if nobody taps |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Opens looking like another website / twin hub | `showtime-door.png` is the QR matrix + unit. Studio cyclorama off. HUD/brand gone. `product=living7-icqr-door` |
| living2/3d world-default is the showtime first paint | Showtime never calls `applyWorldPose` / `lockWorldCamera`. `viewMode=door` |
| Steep top-down tilt / unreadable lenses | `doorCamFrontFacing`, elevation > −18° |
| Ghost / duplicate upright boom | `killGhostBooms` attaches leftover stripe/主杆 meshes to `BoomPivot`. `singleBoom` during lower |
| Field is black blocks + stripe towers + mini TLs | `living-qr.js` builds mini cabinets only. No lens geos. `miniHasTrafficLight=false` |
| White empty back | `PortaboomBackLogo` wordmark behind the door |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Door + animation run first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle plaza |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR **door** — straight-on cabinet, traffic light lenses readable, one boom, mini PORTABOOMs, brand in the back.
3. Tap (or wait one beat). Watch green → amber → red → boom down (~4s) **on that QR world**.
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
