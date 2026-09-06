# GATE — scale proof + STOP 180° + stripe pass 2

Phone-width (390×844). Named GLB. `app.js?v=twin-tidy5`.
SoT: hero studio photos (TAS `pb4000.jpg`, WZS `Porta_Boom_Large_LP.png`) + PB4000 manual metres (cabinet 1153×415 mm, boom 4 m class, STOP Ø 400 mm).
**Not** living ICQR. **Not** WordPress. Do not merge.

## Scale proof — Ø 400 mm on the planted twin — GREEN

`plantTwin` scales the hero box (cabinet + head) to **1.28** world units. The GLB is not 1 unit = 1 m.

`rigBoomMaster` then `scene.attach` / `root.attach(BoomPivot)`. Three.js `attach()` preserves world size, so **BoomPivot.scale ≈ 1 / plantScale ≈ 1.99**. Boom *meshes* keep plant world scale (~0.50). A **new** STOP child of the pivot sits at **pivot world scale ≈ 1**.

A raw `SIGN_RADIUS=0.20` or `localR = worldD / (2 × plantScale)` draws an **~800 mm** face (2×). The ruler is cabinet height, not a boom-as-4 m guess (CAD `tipY` is already the 4 m-class arm after pivot attach).

| Quantity | How derived | Planted `__iqr.snap` |
| --- | --- | --- |
| Real cabinet H | PB4000 manual | **1.153 m** |
| Real STOP | Fabian | **Ø 0.40 m** |
| `doorHeightWorld` | AABB of `115-DOOR` | **0.442** |
| `metresPerWorld` | `1.153 / doorH` | **2.608** |
| `scaleFactor` | `plantTwin` `1.28 / heroH` | **0.5024** |
| `pivotWorldScale` | `BoomPivot.getWorldScale` after attach | **1.000** |
| `meshWorldScale` | stripe mesh world scale (plant) | **0.5024** |
| `signDiameterWorld` | `0.40 / metresPerWorld` | **0.1534** |
| `signRadiusLocal` | `worldD / (2 × pivotWorldScale)` | **0.0767** |
| `signWorldDiameter` | `2 × localR × face world scale` | **0.1534** |
| `signImpliedM` | `signWorldDiameter × metresPerWorld` | **0.40** |
| `stopOverDoor` | `0.1534 / 0.442` | **0.347** = `0.40 / 1.153` |
| `boomLengthCad` | `boomRig.tipY` (pivot-local) | **1.589** |
| `boomLengthWorld` | `tipY × pivotWorldScale` | **1.589** |
| `impliedBoomM` | `boomWorld × metresPerWorld` | **4.14** (4 m class) |

Proof lives on `__iqr.snap` (`signDiameterM`, `signDiameterWorld`, `signWorldDiameter`, `signImpliedM`, `boomLengthM`, `boomLengthWorld`, `boomLengthCad`, `scaleFactor`, `pivotWorldScale`, `meshWorldScale`, `metresPerWorld`, `doorHeightWorld`, `impliedBoomM`, `signDerived`, `plantedProof`).

## STOP legend 180° — GREEN

Texture: `translate(cx,cy); rotate(π); fillText("STOP")` — Fabian “wording to 180°”.
`tickSignUpright` sets `inner.z = −pivot.z` (full cancel). Holding only the drop-delta left the face at `rest ≈ π`, which + canvas `flipY` kept the legend inverted in the default boom-up view.

Browser: boom-up — STOP reads upright (not `dOLS`). Mid-drop — legend stays world-horizontal and readable. Boom-down same.

## Stripe pass 2 (pixel-sampled) — GREEN

tidy4 used local period **0.22** / duty **0.33** (too tight, red too thin). Pass 1 guessed period **0.36 m** / duty 0.33.

Sampled TAS + WZS studio heroes (cabinet height → mm/px):

| Sample | period | red | gap | duty | repeats on 4 m |
| --- | --- | --- | --- | --- | --- |
| TAS `pb4000.jpg` | **345 mm** | 157 mm | 188 mm | **0.46** | 11.6 |
| WZS `Porta_Boom_Large_LP` | **328 mm** | 158 mm | 170 mm | **0.48** | 12.2 |

Shipped: `periodM=0.34`, `duty=0.48`, slant **+** (lean-forward `/` — top of each red further toward the tip), red `#c01421` on silver, `toneMapped: false`.
`periodLocal = 0.34 / metresPerWorld / meshWorldScale` ≈ **0.259** (meshes keep plant scale).

ASCII of the hero boom band: new red bars enter from the cabinet side as you scan downward → lean-forward `/`.

## SMOKE — GREEN

| Check | Result |
| --- | --- |
| Loads named GLB | GREEN — `usingGlb`, status boom live |
| Ø400 mm on planted scale | GREEN — `signImpliedM=0.40`, `stopOverDoor=0.347` |
| STOP legend | GREEN — 180° draw + full pivot cancel; upright boom-up; holds through drop |
| Stripes | GREEN — duty 0.48 / 0.34 m / lean-forward vs tidy4 0.22/0.33 |

## STRESS / PRESSURE — GREEN

| Check | Result |
| --- | --- |
| STOP in/out + slider | GREEN — `signAlong` moves; size stays 400 mm |
| Round / Octagon | GREEN — rebuilds; round `signImpliedM=0.40` |
| Boom drop | GREEN — legend stays world-upright |
| Flatten / restore | GREEN — flatten shrinks the plant (measured Ø dips); restore returns `signImpliedM=0.40` |

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
