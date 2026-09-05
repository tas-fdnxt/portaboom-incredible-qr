# GATE — overnight full ask set

Phone-width (390×844) against local Pages root. Named GLB. `app.js?v=overnight1`.
SoT: live twin `dist-bice-chi-12` + twin-core `setGroup` / `livery.ts` / `instance.ts` / `setSpin` / studio `ct()`+`Ye()`.

## SMOKE — GREEN

| Check | Result |
| --- | --- |
| Loads on phone-width | Yes. WebGL, named twin, no JS error |
| Boom works | Raise/lower dock drives amber→red drop, then raise. `shownPct` travels 100→0→100 |
| Toggles work | Solar OFF/ON (0 ↔ 4 solar meshes). Traffic lights ON/OFF (1 ↔ 0 heads, HUD GREEN/OFF) |
| Orbit works | OrbitControls + damping. Finger/mouse drag moved camera **5.6 m** (`z 3.12 → −2.08`) |
| No auto-spin | `spin=false`, `controls.autoRotate=false` on load and after reload. Spin ON only if user taps Spin |

## STRESS — GREEN

| Step | Result |
| --- | --- |
| Solar off then on | Hidden (`solarVisible=0`) → panel `太阳能板` at cabinet top (`solarVisible=4`) → off again |
| Lights off then on | Head group hidden, aspect OFF → one head, 3-aspect restores |
| Boom up/down | Up at rest green / face `#3fe868`. Moving or down: face+strip red flash `#ff1c10` / `#ff0008`, traffic red |
| Orbit drag | Camera leaves front lock; autoRotate stays false |
| Reload keeps defaults | `solarOn=false`, `trafficHeads=1`, `extraHeads=0`, `productLeds=0`, `spin=false`, boom 100, face green, front cam `z≈3.12` |

## PRESSURE — GREEN (refutals)

| Claim | Refute |
| --- | --- |
| Back-facing head | After plant `rotation.y = π`, `TwinHeadYaw` at the cabinet mount. Lens discs at **z +0.064** with door logo at **z +0.045**. Same side. Bottom aspect green toward camera on load |
| Solar still on | Default `setGroup('solar', false)`. Parent `太阳能板` and every solar mesh tree-hidden. Reload `solarVisible=0` |
| Missing logos | `PortaboomLogoFace` + `PortaboomLogoOpposite` from twin `door_decal.png` (PORTA / BOOM / portaboom.com.au). Front plate readable on phone |
| Auto-spin | `setSpin` only. Tick forces `autoRotate=false` unless user Spin ON. Reload still off |

## Ask set (baked)

1. Front of unit on load (cabinet door to camera)
2. Traffic head same way as cabinet (mast-socket yaw, not a bbox swing)
3. Clean core: cabinet + boom + **one** traffic head. Solar OFF
4. Dock: Solar / Traffic lights / Raise-lower boom / Spin (default off)
5. Face LEDs green raised-at-rest / red flash moving-or-down. **No** ProductLed flanks
6. 3-aspect when lights ON
7. Twin door_decal logos, two faces only
8. OrbitControls, damping on, autoRotate off unless Spin
9. Cream cabinet, orange boom, black head, showtime framing
11. Twin **studio** environment (`ct`/`Ye`): asphalt ground, warm contact, cyclorama/horizon, RoomEnvironment. QR module grid stays hidden until Flatten. Not twin ROAD (no 2k HDR on this phone door)

Do not merge. Chief reads this gate, then merges. NEVER SEND WordPress.
