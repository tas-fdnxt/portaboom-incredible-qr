# GATE — scale proof + STOP 180° + stripe pass 2

Phone-width (390×844). Named GLB. `app.js?v=twin-tidy5`.
SoT: hero studio photos (TAS `pb4000.jpg`, WZS `Porta_Boom_Large_LP.png`) + PB4000 manual metres (cabinet 1153×415 mm, boom 4 m class, STOP Ø 400 mm).
**Not** living ICQR. **Not** WordPress. Do not merge.

## Scale proof — Ø 400 mm on the planted twin

`plantTwin` scales the hero box (cabinet + head) to **1.28** world units. The GLB is not 1 unit = 1 m.

`rigBoomMaster` then `scene.attach` / `root.attach(BoomPivot)`. Three.js `attach()` preserves world size, so **BoomPivot.scale ≈ 1 / plantScale ≈ 1.99**. Boom *meshes* keep plant world scale (~0.50). A **new** STOP child of the pivot sits at **pivot world scale ≈ 1**.

A raw `SIGN_RADIUS=0.20` or `localR = worldD / (2 × plantScale)` draws an **~800 mm** face (2×). The ruler is cabinet height, not a boom-as-4 m guess (CAD `tipY` is already the 4 m-class arm after pivot attach).

| Quantity | How derived | Planted value |
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
| `signWorldDiameter` | face AABB × face world scale | **0.153** |
| `signImpliedM` | `signWorldDiameter × metresPerWorld` | **0.40** |
| `boomLengthCad` | `boomRig.tipY` (pivot-local) | **1.589** |
| `boomLengthWorld` | `tipY × pivotWorldScale` | **1.589** |
| `impliedBoomM` | `boomWorld × metresPerWorld` | **~4.14** (4 m class) |

Proof lives on `__iqr.snap` (`signDiameterM`, `signDiameterWorld`, `signWorldDiameter`, `signImpliedM`, `boomLengthM`, `boomLengthWorld`, `boomLengthCad`, `scaleFactor`, `pivotWorldScale`, `meshWorldScale`, `metresPerWorld`, `doorHeightWorld`, `impliedBoomM`, `signDerived`, `plantedProof`).

## STOP legend 180°

Texture: `translate(cx,cy); rotate(π); fillText("STOP")` — Fabian “wording to 180°”.
`tickSignUpright` sets `inner.z = −pivot.z` (full cancel). Holding only the drop-delta left the face at `rest ≈ π`, which + canvas `flipY` kept the legend inverted in the default boom-up view. Full cancel + 180° draw reads upright and stays readable as the arm drops.

## Stripe pass 2 (pixel-sampled)

tidy4 used local period **0.22** / duty **0.33** (too tight, red too thin). Pass 1 guessed period **0.36 m** / duty 0.33.

Sampled TAS + WZS studio heroes (cabinet height → mm/px):

| Sample | period | red | gap | duty | repeats on 4 m |
| --- | --- | --- | --- | --- | --- |
| TAS `pb4000.jpg` | **345 mm** | 157 mm | 188 mm | **0.46** | 11.6 |
| WZS `Porta_Boom_Large_LP` | **328 mm** | 158 mm | 170 mm | **0.48** | 12.2 |

Shipped: `periodM=0.34`, `duty=0.48`, slant **+** (lean-forward `/` — top of each red further toward the tip), red `#c01421` on silver, `toneMapped: false`.
`periodLocal = 0.34 / metresPerWorld / meshWorldScale` (meshes keep plant scale).

## SMOKE

| Check | Result |
| --- | --- |
| Loads named GLB | Pending browser |
| Ø400 mm on planted scale | Pending `signImpliedM ≈ 0.40` |
| STOP legend | 180° draw; not upside-down in boom-up |
| Stripes | duty 0.48 / 0.34 m / lean-forward vs tidy4 |

## STRESS / PRESSURE

Pending: STOP in/out, slider, Round/Octagon, boom drop, flatten/restore — size + legend + pitch hold.

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
