# GATE — living3d showtime then configurable DEST

Phone-width (390×844). `app.js?v=living3d`.
DEST **default**: `https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/`
DEST **override**: living door `?dest=<URL-encoded http(s) URL>` (any website). Config: `dest-config.mjs`.
Living door (stationary QR payload): `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living3d&showtime=1`
ECC **H** send QR. World still uses the baked default-product H-matrix (version **8**, **49×49**, **1258** dark modules).
SoT: living2 brand world + existing twin boom / KINDCOL 3-aspect. **Not** a second twin. **Not** WordPress.

Proof runner: `node scripts/gate-living3-showtime.mjs` (Playwright + jsQR).
Send file: `fabian-showtime-qr.png` (also `gate-artifacts/` + `/opt/cursor/artifacts/`).
Living2 regression: `node scripts/gate-living2.mjs` (no `showtime=` → boom up / green, Life + Tap to scan).

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.

## SMOKE — showtime → DEST

| Check | Result |
| --- | --- |
| `?showtime=1` opens world with twin | GREEN — `viewMode=world`, `usingGlb=true`, `defaultShowsTwin=true` |
| Auto choreography longer than living2 teaser (~3.6s) | GREEN — teaser SoT is Fabian’s saved GIF (43 frames @ ~12fps ≈ 3.58–3.6s). Showtime budget **7.1s** (1.5s amber + 5.2s ease-in-out lower + 0.4s hold), target **6–8s**. Then **0.4s** beat and `location.assign(leaveDest)`. `boomPct` 100 → 0 |
| During lower = red / moving LEDs | GREEN — `showMode=closing` uses existing `setSignalAspect("red")` + `updateLeds` flash |
| After down = leave configured DEST (default) | GREEN — omit `?dest=` → `__iqrOnLeaveToDest` / `location.assign` default Traffic Access URL (`leaveDestSource=default`) |
| After down = leave configured DEST (override) | GREEN — `?dest=` URL-encoded test site → leave that URL (`leaveDestSource=query`), not the default |
| Minimal HUD during showtime | GREEN — `#liveDock` hidden while `playing` / `pending` / until leave |
| Stationary send QR | GREEN — jsQR decodes living showtime URL from `fabian-showtime-qr.png` (not DEST) |
| Tap to scan → baked product matrix | GREEN — default living page `captureScan()` native jsQR → default product URL |

## STRESS

| Step | Result |
| --- | --- |
| living2 default (no showtime) | Unchanged world rest: boom up, green, dock visible. No auto DEST |
| `?v=living3d&showtime=1` | Showtime then default DEST. Query `showtime=1` is the switch |
| `?showtime=1&dest=` | Any http(s) website. Invalid / non-http falls back to default |
| Canvas tap during showtime | Ignored until leave |

## PRESSURE (must refute)

| Claim | Refute |
| --- | --- |
| Second invented twin | One `pb4000_named.glb`. `beginCloseSequence` / `setSignalAspect` / `setBoomPct` only |
| QR opens DEST only | Send PNG encodes the living Pages URL with `showtime=1`. Animation runs first |
| DEST is a single hard-coded dead end | `dest-config.mjs` default + `?dest=` override. GATE proves both |
| Showtime page is the destination | After boom 100→0 + hold, `location.assign(leaveDest)` |
| Flatten / print is the product | Flatten gone. Print still demoted. `printClaimReady=false` |
| Default living2 broken | No query → `showtimePhase=off`, existing idle |

## How to scan (Fabian send)

1. Point a phone at **`fabian-showtime-qr.png`** (stationary).
2. Camera opens the living Incredible QR page with showtime.
3. Watch amber → red and the boom come down (~7s).
4. After the boom is fully down, the page goes to DEST (default product link, or `?dest=` if the living URL includes one).

Do not merge. Chief delivers the PNG after merge.
