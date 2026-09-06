# Archive Pages doors — DEST list

DEST (all doors, unchanged):
https://www.trafficaccess.com.au/portaboom-product/portaboom-pb4000-series/

## Reachable archive URLs (GitHub Pages)

- https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/
- https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/overnight1/
- https://tas-fdnxt.github.io/portaboom-incredible-qr/archive/twin-tidy5/

Living root (unchanged this PR):
- https://tas-fdnxt.github.io/portaboom-incredible-qr/

## Snapshots

| Door | Source commit | Notes |
| --- | --- | --- |
| overnight1 | 03e35a2 (PR #9) | twin show + Flatten to QR · cache `app.js?v=archive-overnight1` |
| twin-tidy5 | a93ced6 (PR #13) | planted STOP/stripes · cache `app.js?v=archive-twin-tidy5` |

## File list (runtime-needed)

### archive/overnight1/
- index.html (script → ./app.js?v=archive-overnight1)
- app.js
- qr.png, door_decal.png, portaboom_logo.png, portaboom_logo_reversed.png
- portaboom-pb4000-master.png, portaboom-pb4000-master-print.png
- pb4000_named.glb, pb4000_master.compressed.glb
- twin-only/ (historical sidecar; not the phone door)

### archive/twin-tidy5/
- same shape as overnight1; app.js bake differs (STOP/stripes)

WordPress untouched. No living QR redesign in this PR.
