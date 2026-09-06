# PORTABOOM Incredible QR

Living7 Incredible QR for PORTABOOM PB4000 (ICQR *pattern*: the door **looks like a QR**, with the unit living inside a heap of miniature PORTABOOMs).

- **`?showtime=1`** (and `?v=living7&showtime=1`) first paint = QR-matrix aesthetic + PORTABOOM (cabinet + traffic light + one boom) **straight-on** so the lenses read. Field modules are mini cabinets — no traffic lights on the little ones. Big PORTABOOM logo in the back. Not a twin-site plaza. Tap (or a 2.6s beat) plays **~4s**: green 1s → amber 1s → red 1s → boom down 1s. After the boom is down, the page goes to DEST.
- **DEST is configurable.** Default = Traffic Access PB4000 product page. Override with `?dest=<URL-encoded http(s) URL>` on the living door. Config: `dest-config.mjs`.
- **Default (no showtime)** = living 3D PORTABOOM world for tap-to-scan of the baked product matrix.
- Print PNG is a demoted export under the scan dock — never the READY claim
- DEST default: https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/

Cache-bust: `app.js?v=living7`

Pages: https://tas-fdnxt.github.io/portaboom-incredible-qr/

Send QR (after Chief merge): `fabian-showtime-qr.png` → `https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living7&showtime=1`

## How to scan

1. Phone camera on the stationary send QR opens this living **QR door** (cabinet + signal + one boom, straight-on, brand in the back).
2. Tap / wait one beat. Green → amber → red → boom down (~4s). After the boom drop, the page automatically opens DEST (default product page, or `?dest=` if set).
3. On the default living page (no `showtime=`), tap the scene or **Tap to scan**, then point a phone at the field (baked product matrix).
4. Drag to orbit in the world. Print PNG is a paper export only.

Not WordPress. Not Command Hub. NEVER SEND until Chief merges after GATE.

## Archive doors (historical Pages)

- https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/overnight1/ — Flatten to QR
- https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/twin-tidy5/ — planted STOP/stripes
- https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living1 — living1 ortho matrix (rejected)
- https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living2 — living2 world (no auto showtime)
- https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living3d&showtime=1 — living3d plaza-hero showtime (rejected: looked like another website)
- https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living5&showtime=1 — living5 closer door (rejected: cabinet-only, traffic light + boom clipped)
- https://tas-fdnxt.github.io/portaboom-incredible-qr/?v=living6&showtime=1 — living6 (rejected: steep tilt, ghost boom, stripe/black field, no back logo)

Listing: https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/
