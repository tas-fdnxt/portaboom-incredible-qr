# GATE — living5 ICQR door (close twin), then showtime, then DEST

Phone-width (390×844). `app.js?v=living5`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living5&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: **ICQR-first door** — pixelated QR field with PORTABOOM **large in the matrix** (not a speck in cream). Then amber→red boom-down. Then DEST. **Not** a twin-site 3/4 plaza. **Not** WordPress.

Proof runner: `node scripts/gate-living4-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — first paint is the QR door (unit large enough)

| Check | Result |
| --- | --- |
| `?showtime=1` first paint is ICQR QR field | GREEN — `viewMode=door`, `showtimePhase=door`, cream QR paper, pixel modules, **not** living2 `lockWorldCamera` 3/4 plaza |
| PORTABOOM in the field, readable | GREEN — cabinet `heightFrac=0.367`, hero `1.00` (boom cropped), largest orange blob `heightFrac=0.421` / `areaFrac=0.235`. Living4 width-fit of the whole pad is rejected (Fabian: too far / can’t see it) |
| Not another website | GREEN — studio / apron / HUD / brand chip hidden. `looksLikeWebsiteTwin=false`. No Life / Tap to scan / PB4000 chrome |
| Not a flat B&W QR card | GREEN — `looksLikeFlatBWQR=false`. Colored living modules + unit volume |

## SMOKE — transform → DEST (living4 regression)

| Check | Result |
| --- | --- |
| Tap (or 2.6s door beat) starts transform | GREEN — stays on the QR door. Does **not** jump to a twin microsite |
| Auto choreography longer than living2 teaser (~3.6s) | GREEN — teaser SoT is Fabian’s saved GIF (43 frames @ ~12fps ≈ 3.58–3.6s). Showtime budget **7.1s** (1.5s amber + 5.2s ease-in-out lower + 0.4s hold), target **6–8s**. Amber held ≥ 1.2s. `boomPct` 100 → 0. Then **0.4s** beat and `location.assign(leaveDest)` |
| During lower = red / moving LEDs | GREEN — `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | GREEN — omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL (`leaveDestSource=default`) |
| After down = leave configured DEST (override) | GREEN — `?dest=` URL-encoded test site → leave that URL (`leaveDestSource=query`), not the default |
| Zero website chrome on the door | GREEN — `#hud` `display:none` for the whole showtime path |
| Stationary send QR | GREEN — jsQR decodes living showtime URL `?v=living5&showtime=1` from `fabian-showtime-qr.png` (not DEST) |
| Tap to scan → baked product matrix | GREEN — default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living5&showtime=1` | ICQR door (close twin) → transform → default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap on the door | Starts transform (honest click → boom). Auto-beat if nobody taps |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Opens looking like another website / twin hub | `showtime-door.png` is the QR matrix + unit. Studio cyclorama off. HUD/brand gone. `product=living5-icqr-door` |
| living2/3d world-default is the showtime first paint | Showtime never calls `applyWorldPose` / `lockWorldCamera`. `viewMode=door` |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Door + animation run first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0 + hold, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle plaza |
| Unit still a speck in cream | Door ortho cover-fits `0.22 × pad` on the tall axis (living4 width-fit the whole pad). Cabinet-first: boom may be cropped. `doorCabinetFrame` + largest orange blob prove size |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR **door** — PORTABOOM should be clearly visible in the QR picture, not a distant speck.
3. Tap (or wait one beat). Watch amber → red and the boom come down (~7s) **on that QR world**.
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
