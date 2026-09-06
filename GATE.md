# GATE — living3 showtime (amber → red, boom down)

Phone-width (390×844). `app.js?v=living3b`.
DEST (unchanged): `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living3&showtime=1`
ECC **H** send QR. World still uses DEST H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: living2 brand world + existing twin boom / KINDCOL 3-aspect. **Not** a second twin. **Not** WordPress.

Proof runner: `node scripts/gate-living3-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — showtime

| Check | Result |
| --- | --- |
| `?showtime=1` opens world with twin | GREEN — `viewMode=world`, `usingGlb=true`, `defaultShowsTwin=true` |
| Auto choreography longer than living2 teaser (~3.6s) | GREEN — teaser SoT is Fabian’s saved GIF (43 frames @ ~12fps ≈ 3.58–3.6s). Showtime budget **7.1s** (1.5s amber + 5.2s ease-in-out lower + 0.4s hold), target **6–8s**. Measured settle **7.13s** (> 3.6, in 6–8.5). Amber held **1.82s** before first red. `boomPct` 100 → 0 |
| During lower = red / moving LEDs | GREEN — `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = red held | GREEN — `showtimePhase=settled`, `signalAspect=red`, `boomPct=0`. No auto-raise |
| Minimal HUD during showtime | GREEN — `#liveDock` hidden while `playing` / `pending` |
| After showtime, living controls | GREEN — Life ON + Tap to scan restored |
| Tap to scan → DEST | GREEN — `captureScan()` native jsQR → DEST |
| Stationary send QR | GREEN — jsQR decodes living URL from `fabian-showtime-qr.png` |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible |
| `?v=living2&showtime=1` | Same as `?v=living3&showtime=1` — query `showtime=1` is the switch |
| Canvas tap during showtime | Ignored until settle |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR page with showtime.
3. Watch amber → red and the boom come down (~3 seconds).
4. Then Life / Tap to scan as today. Tap to scan still goes to the DEST product page.

Do not merge. Chief delivers the PNG after merge.
