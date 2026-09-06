# GATE — living10 ICQR door (elevated 3D QR field, one boom, cuboid minis)

Phone-width (390×844). `app.js?v=living10`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living10&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: **ICQR-first door** — dense 3D QR field of cuboid minions around the hero PORTABOOM (yellow cabinet + traffic light + **one** boom). Elevated look into the field. Finder-pattern clusters stay dark. Cabinet-vocab modules get a light mini-PORTABOOM dress (orange + LEDs/wordmark). **No** traffic lights / **no** booms on minis. Then green **0.5s** → amber **1s** → red **0.5s** → boom down. Then DEST. **Not** a twin-site 3/4 plaza. **Not** WordPress. **Not** a flat brand poster.

**living8 + living9 are REJECTED** (Fabian HARD): camera/crop + all-orange instanced strip flattened the door into a 2D poster (big PORTA BOOM logo, TL, boom, orange cabinet footer). living10 restores the last GOOD 3D field (living5 composition / living7 structure) and only then lightly dresses cabinet modules.

Proof runner: `node scripts/gate-living4-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — first paint is the 3D QR field (elevated)

| Check | Result |
| --- | --- |
| `?showtime=1` first paint is ICQR QR field | GREEN — `viewMode=door`, `showtimePhase=door`, cream QR paper, dense cuboid modules, **not** living2 `lockWorldCamera` 3/4 plaza |
| Elevated 3D field, not dead-on poster | GREEN — `doorCamElevatedField=true`, elevation about **−12° to −38°**. Not living7/8/9 0° flatten. Not living6 roof-tilt |
| Cabinet + traffic light + boom in the field | GREEN — cabinet in frame. Signal in frame. Boom in frame (`doorBoomHidden=false`). Living5 cabinet-only hide rejected |
| One boom only | GREEN — `singleBoom=true`, `ghostBoomCount=0` on first paint and through lower |
| Mini field has no TL heads | GREEN — `miniHasTrafficLight=false`. Hero-only lantern. Cabinet minis may have face LEDs/wordmark |
| QR structure kept | GREEN — `stripeModules` may be > 0 (timing/boom vocab). Finders stay dark clusters. Field is **not** a single orange footer band |
| No brand poster header | GREEN — `backLogoVisible=false`. Brand lives on the hero cabinet and mini wordmarks |
| Not another website | studio / apron / HUD / brand chip hidden. `looksLikeWebsiteTwin=false` |
| Not a flat B&W QR card | `looksLikeFlatBWQR=false`. Colored living minis + unit volume |
| Not living9 flatten | `looksLikeFlattenedPoster=false`. Field fills the ground around the hero |

## SMOKE — transform → DEST

| Check | Result |
| --- | --- |
| Tap (or 2.6s door beat) starts transform | Stays on the QR door. Does **not** jump to a twin microsite |
| Timing 0.5+1+0.5+boom | GREEN — lock green **0.5s** → amber **1.0s** → red **0.5s** → boom down. Measured green **0.616s** → amber **0.913s** → red hold **0.739s**; settle **3.1s**. Then **0.4s** beat and `location.assign(leaveDest)` |
| Single boom during lower | GREEN — `ghostMax=0`, `singleBoomDuringLower=true`, `boomPct` 100 → 0 |
| During lower = red / moving LEDs | `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL |
| After down = leave configured DEST (override) | `?dest=` URL-encoded test site → leave that URL, not the default |
| Zero website chrome on the door | `#hud` `display:none` for the whole showtime path |
| Stationary send QR | jsQR decodes living showtime URL `?v=living10&showtime=1` from `fabian-showtime-qr.png` (not DEST) |
| Tap to scan → baked product matrix | default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living10&showtime=1` | ICQR door → 0.5+1+0.5+boom transform → default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap on the door | Starts transform (honest click → boom). Auto-beat if nobody taps |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Opens looking like another website / twin hub | `showtime-door.png` is the QR matrix + unit. Studio cyclorama off. HUD/brand gone. `product=living10-icqr-door` |
| living2/3d world-default is the showtime first paint | Showtime never calls `applyWorldPose` / `lockWorldCamera`. `viewMode=door` |
| Dead-on flatten / logo header / footer strip | Elevated camera. No `PortaboomBackLogo`. Dense cuboid field fills the ground |
| Ghost / duplicate upright boom | `killGhostBooms` attaches leftover stripe/主杆 meshes to `BoomPivot`. `singleBoom` during lower |
| Mini TLs / mini booms | `miniHasTrafficLight=false`. Face LEDs only on cabinet-vocab modules |
| Field wiped to one orange strip | Finder/timing/alignment keep dark + stripe structure. `stripeModules` may exist |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Door + animation run first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle plaza |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR **door** — elevated 3D field of cuboid minions around the hero (cabinet + traffic light + one boom).
3. Tap (or wait one beat). Watch green 0.5s → amber 1s → red 0.5s → boom down **on that QR world**.
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
