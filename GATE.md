# GATE — scale proof + STOP 180° + stripe pass 2

Phone-width (390×844). Named GLB. `app.js?v=twin-tidy5`.
SoT: hero photo (tape + STOP legend) + PB4000 manual metres (cabinet 1153×415 mm, boom 4 m class, STOP Ø 400 mm).
**Not** living ICQR. **Not** WordPress. Do not merge.

## Scale proof (do not trust a bare 0.20)

`plantTwin` scales the hero box (cabinet + head) to **1.28** world units. The GLB is not 1 unit = 1 m after plant. STOP is a child of that scaled root.

| Quantity | Source |
| --- | --- |
| Real boom | 4.00 m (PB4000 2.2 m + 1.8 m extension) |
| Real cabinet | H 1.153 m × W 0.415 m (manual) |
| Real STOP | Ø 0.40 m (Fabian) |
| `scaleFactor` | `boom.scale.x` after plant |
| `boomLengthCad` | `boomRig.tipY` (pivot-local metres in the file) |
| `boomLengthWorld` | `tipY × scaleFactor` |
| `metresPerWorld` | `4.0 / boomLengthWorld` |
| `signDiameterWorld` | `0.40 / metresPerWorld` = `0.40 × boomWorld / 4.0` |
| `signRadiusLocal` | `signDiameterWorld / (2 × scaleFactor)` |

If CAD boom is ~1.6 not 4.0, a raw `SIGN_RADIUS=0.20` is a **1 m** sign on a 4 m arm. Pass 2 sizes STOP to **10 % of the planted boom** (400 mm / 4 m).

Stripe pitch uses the same ratio: `periodLocal = boomCad × (0.36 / 4.0)` → ~11 red bars on a 4 m-class arm (hero), not a fixed 0.22 local.

Proof numbers are on `__iqr.snap` (`signDiameterM`, `signDiameterWorld`, `boomLengthM`, `boomLengthWorld`, `boomLengthCad`, `scaleFactor`, `metresPerWorld`, `signDerived`, `plantedProof`).

## SMOKE — pending browser verify

| Check | Result |
| --- | --- |
| Loads | Pending |
| Ø400 mm to scale | Pending snap proof |
| STOP legend | Texture drawn at **180°**. Upright tick is `−(pivot − rest)` so boom-up is not extra-flipped |
| Stripes | Period from boom ratio; duty 0.33 (1:2); slant **+** (lean-forward vs tidy4 minus); `#c01421` / silver |

## STRESS / PRESSURE — pending

Nudge / Round-Octagon / boom drop / flatten keep scaled 400 mm + 180° legend + boom-relative pitch.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
