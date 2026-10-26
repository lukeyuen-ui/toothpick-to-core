# Toothpick to the Core: first-person and shaft acceptance

Run npm ci, npm test, and npm run test:integration on Node 20 or newer. This delivery passes 104 tests and the real two-client integration on Node 24. The integration harness changes only the drill price and leave grace duration; production uses its normal catalog and ninety-second grace. Every gameplay/timing/capacity/light tuning value is in config.js.

WebGL is disabled in this build environment. Scene-graph and shader-substitution smoke checks do not certify rendered pixels, GPU compilation or frame rate. Browser checks exercised the 2D fallback, compact field strip, entering the hub, its Supply/Command structure, lighting item and Escape closing. The 3D checks below need a real GPU browser and phones.

## Two-device setup and core regression

1. Run npm start. Open the server from two separate devices or two browser profiles. Create with ?fast=1&debug=1, share the room code from inside the habitat, and join the second seat. Both should show FAST, the same map, and about 10 authority updates/sec. A joiner cannot change the room multiplier.
2. Confirm wrong/short code errors. Refresh a seat: its name, color, upgrades, wallet, hold, rover and shaft/depth persist. A fifth distinct seat is refused. No horizontal page scrolling on a 375 by 812 phone viewport.
3. At the surface, share damage on a shallow neighboring block: one Toothpick hit then the other player's stronger hit should allocate actual damage shares, not overkill. Cargo floats and cracks sync. Money remains unchanged until delivery. Tools and mobility buy one tier at a time and update immediately on both views.
4. Fill one hold using several shallow cells (surface reaching stops after row 3). Its next share becomes a pile. The other player enters that shaft, reaches its floor and collects the oldest units that fit. Return both home and compare exact delivered wallets. No FAST double multiplication on pickup or delivery.
5. Detectors: buy at the hub, sweep with one rover, and confirm the other seat sees shared amber heat, exact diamond pings and confirmed oil hints. Adjacent dowsing crosses without exposing hidden pocket coordinates. Break a find at its floor and verify proportional bonus cargo, shared announcement and hint removal. A found oil site stays marked. Refresh restores purchased detectors and shared hints.
6. At the hub, propose a site and a team goal, vote with both seats, chip in and observe auto-buy. Test failed vote cooldown, changed ballots and replacing a saving goal. An away player can vote. Active electorate and team multiplier freeze at opening; solo passes immediately with its explanatory toast.
7. Expose oil by digging its actual pocket row. Buy the pump from Command and verify excess production pays the fund. Place and board the drill from the rim. Click/tap the rig in the field to board or leave without returning to the hub. Crew speed/burn and oil limitation match the prior table; personal tools park while boarded. Coolant opens outer-core digging. World Breaker takes exactly 60 seconds from different starting depths, both clients win, see the green ending and same awards. Dig again resets the planet while retaining names/colors/tokens.
8. Idle messages retain sparse patches. No complete hint map in every diff. The server log stays clean.

## First-person controls and field HUD

- [ ] Default mode is a 75-degree cab view at eyeHeight 0.9. Hood, team stripe, drill boom and small crosshair occupy the lower view without hiding the targeted floor.
- [ ] Click captures desktop mouse. Look changes yaw/pitch, Esc releases, recapture works. Surface pitch reaches straight down and slightly above the horizon; shafts additionally allow looking overhead.
- [ ] WASD/arrows follow view yaw: turn 90 degrees and W follows the new heading, A/D strafe and S reverses. Diagonals do not increase speed; arbitrary analog vectors preserve magnitude. Rover body faces its motion. Release, blur and hidden tab stop input.
- [ ] Space/captured click digs the crosshair target. Looking down digs the occupied surface cell, replacing the old move-off rule. Looking up at the sky does not dig the floor accidentally. Clicking/tapping the rope initiates belay.
- [ ] V toggles Chase and first person. Chase is 3 back / 1.8 up. M toggles Overview and restores the previous mode. Overview retains pan, zoom 5 to 16 and Recenter. The camera button cycles all three.
- [ ] Field contains HOLD, WALLET, DEPTH, TEAM FUND and FAST; applicable Return/Belay buttons, minimap, vote banner, toasts, announcements and coach remain. Shop and Command do not occupy the field footer. Room sharing is in the hub.
- [ ] DEPTH shows your server row converted to Earth depth while underground and team deepest on the surface. Cargo feedback remains visible inside the well. Full hold says "Hold full. Belay up."
- [ ] Minimap remains north-up with view cone, dark shafts, brighter lit shafts, depot, belts, rovers and piles.

## Entering, digging and belaying

1. Dig a neighboring surface cell through row 3 to row 4. Further surface taps must say "Too deep to reach. Walk in and dig down." without damage. Splash/automatic tools respect the same depth gate.
2. Drive into the opening. shaft becomes that cell, depth advances at 12 rows/sec. Move has no effect. Tap during descent: "Rappelling. Wait for the floor" and no damage. At the floor, dig only the occupied shaft. Both clients see the descent and floor progression.
3. Put both seats in one shaft. Damage and bonus shares remain proportional; when a block breaks, everyone already at the floor descends with it. A player still rappelling cannot hit early or collect its floor pile.
4. Belay from rows 60 and 180: durations should be about 6.8 and 16.4 seconds. No tap or move cancels the trip. On arrival, choose an undug neighboring cell nearest the habitat; if all eight neighbors are dug, stand on the rim. Face the habitat. The connected rims still permit Return to base when the surroundings are entirely dug.
5. Return to base underground must belay first, then drive and deliver once. It never enters the depot cells. Repeat Return with an empty hold from the field and from underground; both must reach the hub. Starting Return during an existing belay schedules the return without restarting/cancelling the ascent.
6. Refresh/disconnect at a floor and mid-rappel; retain the shaft, cargo and upgrades. Refresh during an initiated belay honors its deadline. Dig again clears shaft/depth/belay, lighting and shared lamps; everyone respawns on the surface outside the depot.
7. Inspect first person around row 100: four close strata walls, dark floor, visible rope from rover to rim, a bright square of sky above, and hit chips below. In Overview/Chase other explorers appear down their shaft rather than hovering at surface level.

## Hub and lighting

1. Enter the depot selling radius on the surface. Desktop shows E: open the hub; phone shows Hub. E or tapping the habitat opens the overlay, releases mouse capture, and shows Supply and Command. Close by E, Esc, Close, or driving outside the radius.
2. Supply contains the next tool, grey next-after tool, mobility, all three detectors and the next lighting upgrade. Buttons remain stable while tapped and at least 44 px. Completed lines show MAX. Command retains chip-ins, goals/ETAs, item requirements, source/site picks, crew/oil/boarding and conveyor list.
3. Outside the hub, send buy, chip, propose, proposeSite and proposeConveyor actions: exact toast "Trade at the hub", no balance/effect changes. Voting still works anywhere. Return and Belay remain field actions.
4. Pick site/source from Command: overlay closes into Overview without moving the rover. Next map tap proposes the chosen cell and restores the previous camera. No accidental dig. Funded source on a shaft gets a hoist frame, cable and bucket; floor piles reach the belt/fund with the original transport rules.
5. Daylight fades with row and is nearly black at row 25. Without lamps, faint discovered ore/sparkles remain visible. Headlamp costs $2,000 and switches on underground: narrow beam aimed with view. Floodlamp costs $100,000 and replaces it with a brighter/wider/longer beam.
6. Shaft lights cost $5,000,000. Dig a shaft and verify a wall light at every ten-row level through the current floor, visible to both players and in the minimap/Overview. Continue deeper: new levels install. Refresh retains lighting; Dig again clears it. No new economic items beyond these three.
7. First coach directs the new player to the habitat and E; after buying a tool it gives way. After a shaft exceeds row 3, the enter-your-hole coach appears and dismisses when followed.

## Phone and visual/performance checklist

- [ ] Test Safari on iPhone and Chrome on Android, portrait around 375 px wide. Left-half touch movement and the 120 px thumb pad work with an analog dead zone; right-half drag looks. Simultaneous move/look works. A right-half tap digs without a drag becoming a dig. Release/cancel/rotation leaves no stuck motion.
- [ ] Phone Hub and camera buttons remain reachable; overlay scrolls without horizontal overflow; Close works. Voting can be done outside the hub. In Overview pinch zoom and site/conveyor selection work.
- [ ] Near-camera dust grain/pebbles, instanced rocks, segmented tread marks, drifting motes in beams, rover roof/team beacons and headlights read clearly. Habitat windows glow and the ramp is visible.
- [ ] Surface dunes, boundary beacons/line, sky/moon, warm shadows, white rounded habitat, shaft strata, rims, floor cracks, finds, pumps, conveyors and drill/crew lights remain intact.
- [ ] First person, Chase and Overview do not produce invalid clipping/camera transforms during rappel, floor breaks, belay, reset and finale. Chase uses the requested offset without a new collision engine; inspect narrow-shaft framing carefully.
- [ ] On a physical mid-range phone, verify the 60 fps target, DPR cap, shadow sizing and particles. Debug reports the frame window. Sustained below 45 fps should disable shadows and halve particles with a console message. Background tabs pause rendering and movement.
- [ ] Reduced motion suppresses particles and ambient machinery/camera shake. Movement, three views, descent, belay, hub and all rules still work.
- [ ] Force ?view=2d or disable WebGL: automatic canvas fallback loads, camera control reads 2D overview, shaft/trading rules and hub remain functional. It intentionally has no first-person view.

## Packaging/hosting

render.yaml remains byte-identical to the previous free-plan Blueprint: Node, npm ci, npm start, /health, one instance. The public source mirror lists every ZIP file as raw text (with the established dotfile/HTML aliases), plus the original binary ZIP and hashes. It is not the multiplayer authority. Render account connection/pinger remain owner-managed.

## Lunar visual pass
- [ ] No cell grid/paint lines on undug ground in first person or Overview. Regolith remains continuous across former rim/floor joins, with raking normal-map bumps and small craters. Dug shafts stay square and sharp.
- [ ] Only the aimed/hovered cell gets a soft team-color outline; it dims beyond reach. Reachable cells have faint short corner ticks, never long dashed lines.
- [ ] Dust is tiny, soft and round with alpha no more than 0.18. No floating gray quads. Underground dust stays near the rover inside the headlight beam. Rock chips remain chunky; steam remains soft.
- [ ] Black space, dense small stars, a large blue/white planet low over the dunes with a lit/shadowed hemisphere, and a bright sun disk with soft glow. White lighting, crisp near-black shadows; dunes and survey beacons remain.
- [ ] Habitat clearly reads as two round horizontal modules with a connecting tube, warm circular portholes, blue bands, airlock/ramp, blinking red mast, turning dish, side solar array, four landing legs, permanent pad spotlight and HUB sign.
- [ ] Thin cockpit pillars frame the edges on desktop and phone; dashboard sits at the bottom. Its lit hold readout tracks cargo/capacity without repainting every frame. Hood is team-colored with a white stripe. Jointed arm and spinning bit animate while digging, and stop afterward.
- [ ] Headlamp visibly illuminates dark ground/walls. Strata cracks and ten-row bands read clearly; mineral flecks sparkle only under the beam. Rope and bright square opening remain visible overhead.
- [ ] Test E/R/V/M as physical keys and as KeyboardEvent key or code-only events dispatched separately on window and document. E opens/closes Hub when eligible without pointer lock; R belays; V/M switch views. A single propagated event must not toggle twice. Typing into nickname/text inputs is unaffected.
- [ ] Repeat the phone FPS, reduced-motion and 2D fallback checks above. No authority, prices, capacities, gates, timings or hosting settings changed in this pass.

Automated scene tests check the new surface normal map and named scene assemblies, plus keyboard dispatch and deduplication. These do not render GPU pixels. The screenshot from the tester is the pre-pass baseline; this environment cannot certify the new look or 60 fps target.

Browser check for this pass: physical E opened and closed the hub without pointer lock in the 2D fallback. Synthetic window/document keyboard dispatch is covered by the input tests; GPU appearance remains unverified.

## Powder, shaft light and crew visibility (0.6.2)

- [ ] New room and Dig again: all seats start two cells from the pad edge, heading away from the hub. The first-person opening view is the plain and beacons rather than the habitat wall. Turn toward the low planet; the minimap shows the hub behind you. Refresh keeps your existing position and heading.
- [ ] Rake the sun over the ground in cab, chase and overview: soft powder bumps, no checker/moire or long white scratches. Inspect near and distant ground on desktop and a 375 px phone. Normal/albedo mipmaps and renderer-maximum anisotropy are enabled; the tile period is two cells.
- [ ] Rocks vary from small gray pebbles to occasional boulders, with half-burial, shaded undersides and soft contact shadows. Large shallow craters have raised rims inside and outside the claim; digging any cell under an inside crater removes that cosmetic feature rather than floating it over a shaft.
- [ ] At the rim of a deep shaft, sunlight lights the upper one or two rows on the sunward wall while the opposite wall stays shadowed; strata fade into darkness with depth. Thin rim remains bright. Magma glows faintly at the floor; shared shaft lamps remain points of light from the surface.
- [ ] Drive and park: small vertical cab sway only while driving, none with reduced motion. Other seat: team body panels, slow pulsing beacon, visible headlights, readable callsign at ten cells and faint soft dust behind it. No new dust quads or long streaks.

## Procedural sound checklist

- [ ] Fresh storage: sound defaults on but nothing autoplays before the first gesture. Click Start or press a key; one context unlocks. A phone's first tap unlocks it as well. No audio files or CDN calls.
- [ ] HUD Sound on/off and N both toggle. Test N without pointer lock, with pointer lock, on window/document key/code events; one propagated event toggles once. Refresh remembers mute. Typing N into nickname does not toggle.
- [ ] Drive, accelerate with each mobility tier and stop: low hum rises with actual speed and stops when parked. No runaway hum on disconnect or hidden tab.
- [ ] Dig dust/clay/granite/basalt/magma: short filtered noise thumps and descending pitch become deeper. Each hit sounds once; each block adds a short crunch. Nearby other-player hits are quieter; walk away and they fade further.
- [ ] Silver, gold and diamond give successively brighter rising chimes. Rapid splash breaks remain bounded and do not create new nodes. At most twelve voice slots including both continuous engines.
- [ ] Rappel and belay: winch whir during travel, off at arrival. Deliver cargo: cash-register blip. Open a vote: soft radio click. World Breaker starts with a deep four-second tail. Restoration plays a rising chord.
- [ ] Refresh while a vote/World Breaker already runs: no old event replay. Dig again stops old voices. Background tab and mute silence ongoing loops and tails. Restore tab/unmute and verify the next action sounds correctly.
- [ ] Check headphones, phone speaker, Safari and Chromium for clipping, harshness and moderate mix level. Run the existing phone FPS checklist while several players dig.

Automated evidence: 92 unit checks include bounded/reused audio nodes, mute persistence, travel and delta triggers, no full-snapshot replay, distance attenuation, material bands, spawn placement, mipmaps/max anisotropy and finite scene transforms. Both-client integration includes the audio module HTTP route and retains the complete shaft/hauling/team flow. Native browser N toggled sound and mute survived refresh without pointer lock; there were no audio runtime errors. GPU rendering and audible balance are not certified in this environment (WebGL is disabled).

## Ship pass (0.7.0)

Run npm test (103 checks), npm run test:integration, and npm run test:pacing. PACING.md records both deterministic normal-mode runs, every changed numeric tuning value and all new config controls. The pacing bots never inject money, find positions or player positions. Seed 5 reaches core at 32:17.2; seed 42 at 32:33.8 without a find bonus. The separate integration process reduces the drill price and leave grace to one second; production values are unchanged by that harness. Earlier checklist capacities/counts describe their historical delivery; current capacities are 8, 12, 16, 24.

Visual acceptance:

- [ ] In cab, chase and overview, inspect the whole plain at 375 px phone width and desktop: soft powder with very weak irregular bumps, no golf-ball/dimple lattice, no long parallel white lines. Maximum anisotropy and mipmaps remain on. Global track overlay is disabled; shadow bias is -0.001 and normal bias 0.12.
- [ ] Move the planet from center to corners of the view; rotate between portrait and landscape. Its silhouette remains round. The test checks projected right/up radii using the actual scene geometry and camera, but cannot certify GPU pixels here.
- [ ] Disconnect the other seat: its rover becomes gray and counts down in both 3D and 2D. Refresh before 90 seconds restores its color and stops the countdown. Past the deadline the rover/rope disappear; old records must not draw over a new occupant.

Presence and resilience, two devices in normal or fast mode:

1. Carry ore and keep some wallet money. Note both values, tool/mobility/light tiers and shaft/floor state. Close that device's tab. On the other device watch the gray rover countdown. Reopen with the room link before ninety seconds; all values and the same seat must return, with no donation or cargo drop.
2. Repeat and leave it disconnected for the full ninety seconds. Wallet moves into the fund once, with the callsign/dollar toast. Its whole hold becomes a FIFO pile at its cell or shaft floor. A conveyor may collect that pile on its next tick. Voter lists remove the expired explorer. Reconnect later: same upgrades, zero wallet and empty hold. New loot from old damage shares must fall on the ground instead of refilling a departed player's ghost hold.
3. Occupy four seats, counting an explorer in grace. A fifth device must show "This expedition is full (4 of 4)" in the lobby. After grace, a new explorer can take the vacant seat. A late old token must not evict a connected seat. After Dig again, connected explorers have distinct spawn positions even if departed records remain.
4. Stop the authority while a browser is in a room: Reconnecting stays visible in the HUD during exponential backoff. Restart it with empty memory: the old link reports "That expedition has ended. Start a new one.", clears that room's stored token and returns to the lobby. Start a new room there; no old rovers, targets, ending or selection may remain. Reloading the ended link must show its lobby preview rather than repeatedly autojoining with an obsolete token.
5. Test callsigns with surrounding spaces, tabs/control/format characters, an overlong name and empty input. They are cleaned/capped, with Digger for empty. No HTML in a callsign can alter the lobby, previews or toasts.
6. The integration sends garbage JSON, primitives, arrays, app-oversized payloads, a frame exceeding the wire cap and a burst of twenty trade controls. The room must keep ticking; the ordinary socket survives dropped app messages, the wire-oversized socket closes cleanly, and no more than four limited actions per second are accepted. Other room/seat state stays usable. Pure tests cover the ninety-second boundary, single donation, FIFO floor drop, expiry during a join and reconnect, action windows and floating-point grid-corner traversal.
7. GET /health reports room and connected player counts. GET /room/CODE returns only code, crew and depth. Wrong/expired room gives 404. Confirm that tokens, finds and find rows never appear in either route. Locked supports/survey never appear in the Command catalog.

First impression and sharing:

- [ ] Lobby shows title, premise, the single controls line, callsign, Start, room code and the How to play disclosure. No equipment or command panels before joining.
- [ ] Open a valid room link on another device: "Joining Luke's expedition: n crew, ... deep" uses live metadata. An ended link says "That room has ended". Returning-seat autojoin still works. Changing the code manually uses the ordinary Join action.
- [ ] Alone for sixty seconds alone: one friendly toast and a Share button appear. Clicking Share uses the native sheet where supported or copies the room link; Close dismisses the reminder. Joining a friend hides it. It does not repeat every tick or reopen after dismissal during the same planet.
- [ ] Inspect initial HTML over the public HTTPS URL: Open Graph and Twitter title/description/image tags, 1200 by 630 dimensions, absolute host-derived og:url, and rover favicon. Host callsign is escaped HTML; /room/CODE still exposes only its three metadata fields.
- [ ] Capture /cover.html at a 1200 by 630 viewport in a WebGL-enabled browser. Check the actual habitat, two rovers, lit shaft and round planet, then save as public/cover.png and redeploy. Verify /cover.png returns image/png and social cards load it. There is intentionally no fake cover PNG in this ZIP because the current cloud browser disables WebGL.
- [ ] Run the earlier sound, phone FPS, reduced-motion and fallback checks. Test the actual HTTP /room link preview on a phone rather than the raw-source mirror, which serves code only.

Browser evidence for this delivery: simplified lobby and valid/ended-room context render; actual authority stop showed Reconnecting in the HUD, and restart returned to the ended-expedition lobby. WebGL remains disabled, and /cover.html displays its explicit capture instructions in that environment. Phone frame rate and GPU look require the checklist above. Render deployment/pinger have not been connected or run from this environment.

## Final visual polish (0.7.1)

- [ ] Fresh claim: undug cells have no bright edge dashes anywhere. The scene smoke subtest asserts zero ground-rim, wall and lit-rim instances, full-width undug floor tiles, exactly four of each shaft surface after one real cell is dug, and zero again after reset. Shafts retain their rim/wall detail.
- [ ] Rocks are regolith gray with lit tops, visible darker undersides and soft contact shadows; occasional boulders are lighter, never pure-black dots.
- [ ] /cover.html remains a fixed 1200 by 630 frame even in a taller/wider browser window. Title stays upper left; tagline stays within the bottom edge. Habitat is closer and lit; both rovers, a lit shaft, ore pile and larger round planet at upper right are in the scene. Recapture public/cover.png.
- [ ] Before joining, the lobby card sits over a slow dusk orbit of the same claim scene. No room is created and no WebSocket is opened. Joining removes/disposes the backdrop. Returning to the lobby can recreate it. WebGL-disabled or reduced-motion devices show the plain background; changing reduced-motion preference while in the lobby stops the orbit.
- [ ] At the hub: coach says "Press E to open the hub". Outside the hub radius: it directs you to the habitat as before. Purchases, shaft rules and all economy timings remain unchanged.

Both full suites and both normal-mode pacing runs are required again. GPU appearance and the cover composition still require the tester's WebGL-enabled browser.

Browser check: the cover frame measured exactly 1200 by 630 and the tagline bounds stayed inside it. The WebGL-disabled lobby used its plain fallback, joining still worked, and Return to base changed the coach to "Press E to open the hub". The local backdrop's GPU appearance and the improved cover composition remain for the tester's WebGL browser.
