# GATE — living6 ICQR door (unit + signal + boom), then showtime, then DEST

Phone-width (390×844). `app.js?v=living6`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living6&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: **ICQR-first door** — pixelated QR field with PORTABOOM (cabinet + traffic light + boom span) in the matrix. Then amber→red boom-down. Then DEST. **Not** a twin-site 3/4 plaza. **Not** WordPress.

Proof runner: `node scripts/gate-living4-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — first paint is the QR door (unit + signal + boom)

| Check | Result |
| --- | --- |
| `?showtime=1` first paint is ICQR QR field | PENDING — `viewMode=door`, `showtimePhase=door`, cream QR paper, pixel modules, **not** living2 `lockWorldCamera` 3/4 plaza |
| Cabinet + traffic light + boom in the field | PENDING — cabinet not ~50%+ alone; `doorSignalInFrame` + `doorBoomInFrame`; `doorBoomHidden=false`. Living5 cabinet-only hide is rejected. Living4 full-pad speck is rejected |
| Not another website | PENDING — studio / apron / HUD / brand chip hidden. `looksLikeWebsiteTwin=false`. No Life / Tap to scan / PB4000 chrome |
| Not a flat B&W QR card | PENDING — `looksLikeFlatBWQR=false`. Colored living modules + unit volume |

## SMOKE — transform → DEST (living4/5 regression)

| Check | Result |
| --- | --- |
| Tap (or 2.6s door beat) starts transform | PENDING — stays on the QR door. Does **not** jump to a twin microsite |
| Auto choreography longer than living2 teaser (~3.6s) | PENDING — teaser SoT is Fabian’s saved GIF (43 frames @ ~12fps ≈ 3.58–3.6s). Showtime budget **7.1s** (1.5s amber + 5.2s ease-in-out lower + 0.4s hold), target **6–8s**. Amber held ≥ 1.2s. `boomPct` 100 → 0. Then **0.4s** beat and `location.assign(leaveDest)` |
| During lower = red / moving LEDs | PENDING — `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | PENDING — omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL (`leaveDestSource=default`) |
| After down = leave configured DEST (override) | PENDING — `?dest=` URL-encoded test site → leave that URL (`leaveDestSource=query`), not the default |
| Zero website chrome on the door | PENDING — `#hud` `display:none` for the whole showtime path |
| Stationary send QR | PENDING — jsQR decodes living showtime URL `?v=living6&showtime=1` from `fabian-showtime-qr.png` (not DEST) |
| Tap to scan → baked product matrix | PENDING — default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living6&showtime=1` | ICQR door (unit + signal + boom) → transform → default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap on the door | Starts transform (honest click → boom). Auto-beat if nobody taps |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Opens looking like another website / twin hub | `showtime-door.png` is the QR matrix + unit. Studio cyclorama off. HUD/brand gone. `product=living6-icqr-door` |
| living2/3d world-default is the showtime first paint | Showtime never calls `applyWorldPose` / `lockWorldCamera`. `viewMode=door` |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Door + animation run first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0 + hold, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle plaza |
| Unit still a speck in cream | Door camera frames cabinet + signal + boom-clip (`DOOR_SUBJECT_FILL=0.60`). Not living4 full-pad |
| Cabinet-only closeup / missing traffic light / hidden boom | Boom stays visible (`doorBoomHidden=false`). Signal + boom frames must read. Cabinet heightFrac < 0.45 |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR **door** — cabinet, traffic light, and boom should all be visible in the QR picture.
3. Tap (or wait one beat). Watch amber → red and the boom come down (~7s) **on that QR world**.
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
