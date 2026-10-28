# Toothpick to the Core: first-person and shaft acceptance

Run npm ci, npm test, and npm run test:integration on Node 20 or newer. This delivery passes 167 tests and the real two-client integration on Node 24. The integration harness changes only the drill price and leave grace duration; production uses its normal catalog and ninety-second grace. Every gameplay/timing/capacity/light tuning value is in config.js.

WebGL is disabled in this build environment. Scene-graph and shader-substitution smoke checks do not certify rendered pixels, GPU compilation or frame rate. Browser checks exercised the 2D fallback, compact field strip, entering the hub, its Supply/Command structure, lighting item and Escape closing. The 3D checks below need a real GPU browser and phones.

## Two-device setup and core regression

1. Run npm start. Open the server from two separate devices or two browser profiles. Create with ?fast=1&debug=1, share the room code from inside the habitat, and join the second seat. Both should show FAST, the same map, and about 10 authority updates/sec. A joiner cannot change the room multiplier.
2. Confirm wrong/short code errors. Refresh a seat: its name, color, upgrades, wallet, hold, explorer and shaft/depth persist. A fifth distinct seat is refused. No horizontal page scrolling on a 375 by 812 phone viewport.
3. At the surface, share damage on a shallow neighboring block: one Toothpick hit then the other player's stronger hit should allocate actual damage shares, not overkill. Cargo floats and cracks sync. Money remains unchanged until delivery. Tools and mobility buy one tier at a time and update immediately on both views.
4. Fill one hold using several shallow cells (surface reaching stops after row 3). Its next share becomes a pile. The other player enters that shaft, reaches its floor and collects the oldest units that fit. Return both home and compare exact delivered wallets. No FAST double multiplication on pickup or delivery.
5. Detectors: buy at the hub, sweep with one explorer, and confirm the other seat sees shared amber heat, exact diamond pings and confirmed oil hints. Adjacent dowsing crosses without exposing hidden pocket coordinates. Break a find at its floor and verify proportional bonus cargo, shared announcement and hint removal. A found oil site stays marked. Refresh restores purchased detectors and shared hints.
6. At the hub, propose a site and a team goal, vote with both seats, chip in and observe auto-buy. Test failed vote cooldown, changed ballots and replacing a saving goal. An away player can vote. Active electorate and team multiplier freeze at opening; solo passes immediately with its explanatory toast.
7. Expose oil by digging its actual pocket row. Buy the pump from Command and verify excess production pays the fund. Place and board the drill from the rim. Click/tap the rig in the field to board or leave without returning to the hub. Crew speed/burn and oil limitation match the prior table; personal tools park while boarded. Coolant opens outer-core digging. World Breaker takes exactly 60 seconds from different starting depths, both clients win, see the green ending and same awards. Dig again resets the planet while retaining names/colors/tokens.
8. Idle messages retain sparse patches. No complete hint map in every diff. The server log stays clean.

## First-person controls and field HUD

- [ ] Default mode is a 75-degree cab view at eyeHeight 0.9. Hood, team stripe, drill boom and small crosshair occupy the lower view without hiding the targeted floor.
- [ ] Click captures desktop mouse. Look changes yaw/pitch, Esc releases, recapture works. Surface pitch reaches straight down and slightly above the horizon; shafts additionally allow looking overhead.
- [ ] WASD/arrows follow view yaw: turn 90 degrees and W follows the new heading, A/D strafe and S reverses. Diagonals do not increase speed; arbitrary analog vectors preserve magnitude. Explorer body faces its motion. Release, blur and hidden tab stop input.
- [ ] Space/captured click digs the crosshair target. Looking down digs the occupied surface cell, replacing the old move-off rule. Looking up at the sky does not dig the floor accidentally. Clicking/tapping the rope initiates belay.
- [ ] V toggles Chase and first person. Chase is 3 back / 1.8 up. M toggles Overview and restores the previous mode. Overview retains pan, zoom 5 to 16 and Recenter. The camera button cycles all three.
- [ ] Field contains HOLD, WALLET, DEPTH, TEAM FUND and FAST; applicable Return/Belay buttons, minimap, vote banner, toasts, announcements and coach remain. Shop and Command do not occupy the field footer. Room sharing is in the hub.
- [ ] DEPTH shows your server row converted to Earth depth while underground and team deepest on the surface. Cargo feedback remains visible inside the well. Full hold says "Hold full. Belay up."
- [ ] Minimap remains north-up with view cone, dark shafts, brighter lit shafts, depot, belts, explorers and piles.

## Entering, digging and belaying

1. Dig a neighboring surface cell through row 3 to row 4. Further surface taps must say "Too deep to reach. Belay down into it to dig deeper." without damage. Splash/automatic tools respect the same depth gate.
2. Drive into the opening. shaft becomes that cell, depth advances at 12 rows/sec. Move has no effect. Tap during descent: "Rappelling. Wait for the floor" and no damage. At the floor, dig only the occupied shaft. Both clients see the descent and floor progression.
3. Put both seats in one shaft. Damage and bonus shares remain proportional; when a block breaks, everyone already at the floor descends with it. A player still rappelling cannot hit early or collect its floor pile.
4. Belay from rows 60 and 180: durations should be about 6.8 and 16.4 seconds. No tap or move cancels the trip. On arrival, search outward ring by ring across the claim for undug, non-depot ground, preferring the entry side within the nearest ring. Face the shaft. If no undug ground exists, arrive safely at the depot edge. Return to base must work even when the whole claim is dug.
5. Return to base underground must belay first, then drive and deliver once. It never enters the depot cells. Repeat Return with an empty hold from the field and from underground; both must reach the hub. Starting Return during an existing belay schedules the return without restarting/cancelling the ascent.
6. Refresh/disconnect at a floor and mid-rappel; retain the shaft, cargo and upgrades. Refresh during an initiated belay honors its deadline. Dig again clears shaft/depth/belay, lighting and shared lamps; everyone respawns on the surface outside the depot.
7. Inspect first person around row 100: four close strata walls, dark floor, visible rope from explorer to rim, a bright square of sky above, and hit chips below. In Overview/Chase other explorers appear down their shaft rather than hovering at surface level.

## Hub and lighting

1. Enter the depot selling radius on the surface. Desktop shows E: open the hub; phone shows Hub. E or tapping the habitat opens the overlay, releases mouse capture, and shows Supply and Command. Close by E, Esc, Close, or driving outside the radius.
2. Supply contains all equipment cards with disabled Owned/superseded tiers, selectable Next tiers, cargo pods, personal conveyors and machines. Buttons stay mounted and at least 44 px. Command contains team goals/votes, site picks, crew and oil status; no conveyors.
3. Outside the hub, send buy, chip, propose, proposeSite and proposeConveyor actions: exact toast "Trade at the hub", no balance/effect changes. Voting still works anywhere. Return and Belay remain field actions.
4. Pick site/source from Command: overlay closes into Overview without moving the explorer. Next map tap proposes the chosen cell and restores the previous camera. No accidental dig. Funded source on a shaft gets a hoist frame, cable and bucket; floor piles reach the belt/fund with the original transport rules.
5. Daylight fades with row and is nearly black at row 25. Without lamps, faint discovered ore/sparkles remain visible. Headlamp costs $2,000 and switches on underground: narrow beam aimed with view. Floodlamp costs $100,000 and replaces it with a brighter/wider/longer beam.
6. Shaft lights cost $5,000,000. Dig a shaft and verify a wall light at every ten-row level through the current floor, visible to both players and in the minimap/Overview. Continue deeper: new levels install. Refresh retains lighting; Dig again clears it. No new economic items beyond these three.
7. First coach directs the new player to the habitat and E; after buying a tool it gives way. After a shaft exceeds row 3, the enter-your-hole coach appears and dismisses when followed.

## Phone and visual/performance checklist

- [ ] Test Safari on iPhone and Chrome on Android, portrait around 375 px wide. Left-half touch movement and the 120 px thumb pad work with an analog dead zone; right-half drag looks. Simultaneous move/look works. A right-half tap digs without a drag becoming a dig. Release/cancel/rotation leaves no stuck motion.
- [ ] Phone Hub and camera buttons remain reachable; overlay scrolls without horizontal overflow; Close works. Voting can be done outside the hub. In Overview pinch zoom and site/conveyor selection work.
- [ ] Near-camera dust grain/pebbles, instanced rocks, segmented tread marks, drifting motes in beams, explorer roof/team beacons and headlights read clearly. Habitat windows glow and the ramp is visible.
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
- [ ] Dust is tiny, soft and round with alpha no more than 0.18. No floating gray quads. Underground dust stays near the explorer inside the headlight beam. Rock chips remain chunky; steam remains soft.
- [ ] An ash overcast over the claim: a dark grey-brown dome, darkest overhead, with billows of lit cloud, an amber fire glow low on the horizon, the sun glowing through the dust, and one lane where the overcast thins to dark sky with a few faint stars (none on Low). Our Moon sits upper right with painted maria, lit from the sun's side, with a soft halo; there is no planet, ring or second moon. Survey beacons remain on the boundary, with dead trees, concrete slabs and wall stubs, two pylons, barrels, rubble and radiation signs in the ring beyond them, all outside the claim (half as many on Low, where they cast no shadows).
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
- [ ] Move the Moon from center to corners of the view; rotate between portrait and landscape. Its silhouette remains round. The test checks projected right/up radii using the actual scene geometry and camera, but cannot certify GPU pixels here.
- [ ] Disconnect the other seat: its explorer becomes gray and counts down in both 3D and 2D. Refresh before 90 seconds restores its color and stops the countdown. Past the deadline the explorer/rope disappear; old records must not draw over a new occupant.

Presence and resilience, two devices in normal or fast mode:

1. Carry ore and keep some wallet money. Note both values, tool/mobility/light tiers and shaft/floor state. Close that device's tab. On the other device watch the gray explorer countdown. Reopen with the room link before ninety seconds; all values and the same seat must return, with no donation or cargo drop.
2. Repeat and leave it disconnected for the full ninety seconds. Wallet moves into the fund once, with the callsign/dollar toast. Its whole hold becomes a FIFO pile at its cell or shaft floor. A conveyor may collect that pile on its next tick. Voter lists remove the expired explorer. Reconnect later: same upgrades, zero wallet and empty hold. New loot from old damage shares must fall on the ground instead of refilling a departed player's ghost hold.
3. Occupy four seats, counting an explorer in grace. A fifth device must show "This expedition is full (4 of 4)" in the lobby. After grace, a new explorer can take the vacant seat. A late old token must not evict a connected seat. After Dig again, connected explorers have distinct spawn positions even if departed records remain.
4. Stop the authority while a browser is in a room: Reconnecting stays visible in the HUD during exponential backoff. Restart it with empty memory: the old link reports "That expedition has ended. Start a new one.", clears that room's stored token and returns to the lobby. Start a new room there; no old explorers, targets, ending or selection may remain. Reloading the ended link must show its lobby preview rather than repeatedly autojoining with an obsolete token.
5. Test callsigns with surrounding spaces, tabs/control/format characters, an overlong name and empty input. They are cleaned/capped, with Digger for empty. No HTML in a callsign can alter the lobby, previews or toasts.
6. The integration sends garbage JSON, primitives, arrays, app-oversized payloads, a frame exceeding the wire cap and a burst of twenty trade controls. The room must keep ticking; the ordinary socket survives dropped app messages, the wire-oversized socket closes cleanly, and no more than four limited actions per second are accepted. Other room/seat state stays usable. Pure tests cover the ninety-second boundary, single donation, FIFO floor drop, expiry during a join and reconnect, action windows and floating-point grid-corner traversal.
7. GET /health reports room and connected player counts. GET /room/CODE returns only code, crew and depth. Wrong/expired room gives 404. Confirm that tokens, finds and find rows never appear in either route. Locked supports/survey never appear in the Command catalog.

First impression and sharing:

- [ ] Lobby shows title, premise, the single controls line, callsign, Start, room code and the How to play disclosure. No equipment or command panels before joining.
- [ ] Open a valid room link on another device: "Joining Luke's expedition: n crew, ... deep" uses live metadata. An ended link says "That room has ended". Returning-seat autojoin still works. Changing the code manually uses the ordinary Join action.
- [ ] Alone for sixty seconds alone: one friendly toast and a Share button appear. Clicking Share uses the native sheet where supported or copies the room link; Close dismisses the reminder. Joining a friend hides it. It does not repeat every tick or reopen after dismissal during the same planet.
- [ ] Inspect initial HTML over the public HTTPS URL: Open Graph and Twitter title/description/image tags, 1200 by 630 dimensions, absolute host-derived og:url, and explorer favicon. Host callsign is escaped HTML; /room/CODE still exposes only its three metadata fields.
- [ ] Capture /cover.html at a 1200 by 630 viewport in a WebGL-enabled browser. Check the actual habitat, two explorers, lit shaft and the Moon under the ash overcast, then save as public/cover.png and redeploy. Verify /cover.png returns image/png and social cards load it. There is intentionally no fake cover PNG in this ZIP because the current cloud browser disables WebGL.
- [ ] Run the earlier sound, phone FPS, reduced-motion and fallback checks. Test the actual HTTP /room link preview on a phone rather than the raw-source mirror, which serves code only.

Browser evidence for this delivery: simplified lobby and valid/ended-room context render; actual authority stop showed Reconnecting in the HUD, and restart returned to the ended-expedition lobby. WebGL remains disabled, and /cover.html displays its explicit capture instructions in that environment. Phone frame rate and GPU look require the checklist above. Render deployment/pinger have not been connected or run from this environment.

## Final visual polish (0.7.1)

- [ ] Fresh claim: undug cells have no bright edge dashes anywhere. The scene smoke subtest asserts zero ground-rim, wall and lit-rim instances, full-width undug floor tiles, exactly four of each shaft surface after one real cell is dug, and zero again after reset. Shafts retain their rim/wall detail.
- [ ] Rocks are regolith gray with lit tops, visible darker undersides and soft contact shadows; occasional boulders are lighter, never pure-black dots.
- [ ] /cover.html remains a fixed 1200 by 630 frame even in a taller/wider browser window. Title stays upper left; tagline stays within the bottom edge. Habitat is closer and lit; both explorers, a lit shaft, ore pile and the Moon at upper right are in the scene. Recapture public/cover.png.
- [ ] Before joining, the lobby card sits over a slow dusk orbit of the same claim scene. No room is created and no WebSocket is opened. Joining removes/disposes the backdrop. Returning to the lobby can recreate it. WebGL-disabled or reduced-motion devices show the plain background; changing reduced-motion preference while in the lobby stops the orbit.
- [ ] At the hub: coach says "Press E to open the hub". Outside the hub radius: it directs you to the habitat as before. Purchases, shaft rules and all economy timings remain unchanged.

Both full suites and both normal-mode pacing runs are required again. GPU appearance and the cover composition still require the tester's WebGL-enabled browser.

Browser check: the cover frame measured exactly 1200 by 630 and the tagline bounds stayed inside it. The WebGL-disabled lobby used its plain fallback, joining still worked, and Return to base changed the coach to "Press E to open the hub". The local backdrop's GPU appearance and the improved cover composition remain for the tester's WebGL browser.

### Embedded browser control rescue (0.7.2)

- In a browser without pointer lock, left-drag and right-drag turn and pitch. Releasing after a drag never digs. A short click digs immediately, with no mouse-capture error toast. Repeat with capture allowed; locked mouse look still works.
- Hold Left or Right for a second: turn about 90 degrees. Up/Down drive along the view; A/D still strafe. Space digs the outlined cell.
- Clear the toothpick-controls-seen storage key. Join: the centered controls card appears, disappears on a key, drag or dig, and stays dismissed after refresh. Storage restrictions must not block play.
- Before the first successful hit, coach says Click or press Space to dig the outlined cell. Merely tapping a distant cell to drive keeps that coach. After a hit, the hub coach follows. Reachable target pulses gently, with no pulse under reduced motion.
- On a phone, left joystick movement and right-half drag look remain unchanged.

Automated input coverage exercises missing, throwing, rejected and successful capture APIs, both mouse buttons, click/drag separation, arrow turning versus driving, look sensitivity and pitch clamps. GPU appearance and real embedded-browser permission behavior require the manual checks above.

### Belay entry side and confirmation (0.7.3)

- Enter one shaft from each side, rappel, then Belay up. You emerge on your entry side, face the hole, and stay there. With two players, enter the same shaft from opposite sides and verify each returns to their own side. Refresh underground and repeat.
- Have the second player dig the remembered entry cell while you are down. Belay chooses the closest undug neighbor to that cell. If all neighboring cells are dug, you arrive on the same shaft rim.
- In 3D check the short hop over the lip and dust puff for both explorers, with no turn toward the habitat. Reduced motion removes hop/dust. Return to base must still belay, drive home, and sell cargo.
- In Supply select each next tool, mobility, detector and lighting upgrade. Wallet and gear stay unchanged until Confirm or Enter. Check effect, price, wallet after and correct icons. Cancel and Esc dismiss only the panel; hub stays open.
- Select an unaffordable item: it remains selectable, Confirm is disabled, and Need $X more is shown. Funds changing while open update the shortfall. An upgraded or stale item closes rather than buying the following tier accidentally.
- Command Propose previews the team goal price without charging a personal wallet; Confirm opens the vote. Pick a drill site and confirm before a vote opens. Conveyor source confirmation buys a personal belt without a vote. Chip in all previews the entire wallet, Cancel preserves it, and Confirm donates it. 10% and half are still one click.
- Close the hub, move out of range, reset the planet or lose the room while reviewing: no stray confirmation remains. Disconnect disables Confirm until the next snapshot.

Automated coverage includes entry tracking across movement ticks and reconnect, independent shared-shaft exits, blocked entry fallback/facing, confirmation keyboard handling and duplicate prevention, shortfall refresh, stale selections, proposals and chip-all. The GPU hop/dust require the visual checks above.

Browser QA completed in the 2D fallback: unowned Spoon selected with $0 wallet shows Need $15 more and disabled Confirm; Esc cancels without closing the hub; Command Propose previews coolant, Enter confirms, and the saving goal appears. GPU hop/dust remain a manual visual check.

## Cold-core claim and economy (0.8.0)

Run npm test (128 checks), npm run test:integration and npm run test:pacing (four normal-mode runs). Tests cover 16-cell generation, centered depot/spawns, clustered field/vein rows, surface-sign privacy, thin payouts, per-cell well purchases, vein announcements, 50/50 machine income, active eligibility, FAST exactly once, live machine events, solo pooling, reconnect separation and round reset. Pit smoke checks exercise quarter-cylinder walls, round lips, shared rough/merge shader masks, round targets, cab rods, every existing scene and the absence of any undug rim/wall instances.

Two-phone checklist:

- The lobby premise describes a dead planet and restarting its cold core. Survey beacons surround the smaller 16 by 16 claim. In 3D, the Moon sits upper right under an ash overcast; there is no planet, ring or second moon. Recapture cover.html; the fixed title and tagline remain inside 1200 by 630.
- Find faint ore signs and wet, bubbling oil seeps without buying a detector. Some cells with finds have no signs. Buy detectors and verify deeper hints still work and are shared.
- Dig 25 blocks in a shaft. The next material pays 40 percent and the row label says thin. Find bonuses still pay their full configured multiplier. Open a fresh shaft and confirm full material payout there.
- Strike oil on one cell: both minimaps reveal that field's footprint, without depth. Another cell in the field only permits a pump after its own oil block breaks. Pump two wells and check production doubles. Strike a second cell of a gold/diamond vein and check the vein announcement and independent bonus.
- With two active explorers, surplus oil sales and drill payouts send half to the fund and a quarter directly to each wallet. Shares do not enter holds, and floats say oil share or drill share. Wait more than 45 seconds without any work to stop a player's share, then drive/dig to resume it.
- Alone, chip all cargo proceeds into the fund, then buy a personal tool from the pooled balance: FUNDS falls by its price. Join from a second device: WALLET and TEAM FUND separate, with no money moving. Disconnect it: pooling returns for the remaining explorer, independent of the grace seat.
- Pits have rough round mouths, strata walls, soft dusty lips and rubble. Adjacent deep pits connect visually. No square outline/corner grid remains; the target is a soft circle. Inspect a merged pit from above and inside, including different floor depths and magma/lamp glow.
- Buy rods, close the hub, and hunt. First-person rods swing relative to look direction and cross on a pocket. Chase/overview show a compact lower-left dial and caption; phone controls must not cover it. Metal and diamond hints stay visible outside the hub.
- Confirm all previous controls, purchase confirmation, belay entry-side return, autopilot home, reconnect, votes, finale and green awakening still work.

Browser QA here verified the new premise, 2D fallback, the FUNDS strip, cargo delivery, chip-all confirmation and a Spoon bought with $0 wallet using $100 in the solo fund (FUNDS became $85), plus the detector widget's placement inside the map. WebGL remains unavailable here: gas giant appearance, pit shader pixels/merging, held rods, cover capture and phone FPS require the visual checklist on a WebGL device. Scene-graph/shader-construction smoke tests do not certify GPU rendering.

## Build 1: P0 escape, excavator, suits and tools

Automated: 139 tests plus the real two-client integration and four pacing runs. Occupied cells reject indirect hits while a deliberate own-cell tap works. A five by five dug area exits to undug ground; a fully dug claim exits at the depot edge. Boarding on a drill site parks beside it. Excavator tests cover kit limits, fitting/overlap/site/depot placement, travel and setup, solid active footprints and tap refusal, switching/occupancy, full hopper stop, conveyor drain/owner receipts, hand collection, reconnect and reset. Tool/suit/model tests cover every held model, tool pitch profile, suit/exoskeleton geometry, machine parts, finite transforms and reduced allocations in the sound pool.

Two-device visual/play checklist:

- Buy Jackhammer/Blasting kit and stand beside a teammate. Auto/splash must leave both occupied cells intact. A manual tap beneath yourself still works. Dig a five by five field, enter its center and belay: land on undug ground outside it. With every non-depot cell dug, belay/Return must reach the pad edge and never leave a suit marooned on a pit rim.
- Supply has Machines separately from tools. Excavator confirmation shows price/hopper; after buying, Place arms overview. Confirm previews a 3 by 3 footprint. Reject depot/hub approach, drill site, overlapping machines, out-of-claim and occupied footprints. Watch it drive and set up on both clients.
- A running machine is big and visible, with tracked base/cab, swinging boom/bucket, dust, lights and engine. It lowers into its nine-cell pit. Try to walk/dig through: blocked. Switch off with E nearby or from Supply, then walk into an ordinary shaft. Switch on while someone is inside: refused. Clear it and restart.
- Let the hopper fill: status says Hopper full. Lay a conveyor. Add a conveyor source inside or adjacent to the footprint: hopper empties, cargo rides, entry belt owner wallet/income increase on sale. Check another explorer cannot intercept machine-owned belt cargo. Pull ore by hand into a partially filled hold. Disconnect the owner; machine remains. Dig again removes it.
- Inspect teammates as white astronauts: gold visor, colored stripes/light, backpack and boots, walking limbs, slight bounce, each suit upgrade and mech exoskeleton. Chase follows the astronaut. Helmet view has rounded soft visor edges, faint reflection, hold/status glass readout, gloves and held tool; cab pillars/hood are gone.
- Buy every tool in turn. Check stow/raise and Equipped toast, stick jab/grains, spoon scoop, red trowel chop, shovel push/lift, pickaxe swing/chips/sparks, vibrating jackhammer/dust/shake, planted charge/smoke ring, spinning borer/grind/sparks, mech drill/claw/heavy steps. Test reduced motion and remembered mute.

Browser QA verified the live Machines section, Sprint servos rename and Excavator confirmation with a disabled unaffordable purchase. GPU suit/tool/machine appearance, visor composition, animation and phone FPS remain unverified in this WebGL-disabled browser.


## Build 2 acceptance: goals, Quick, pods and personal belts

Automated: 154 checks, real two-client integration and eight pacing simulations. Two Full two-player, two Full solo, two Quick two-player and two Quick solo routes use real 10 Hz actions, no injected money or positions. Full must finish in 20 to 35 minutes; Quick in 8 to 12. Every World Breaker still takes exactly sixty seconds. See PACING.md.

- [ ] Start a fresh-browser Full expedition. Complete Dig 3 blocks, delivery, Spoon, belay down and actually dig below surface reach, Belay, strike a signed find, then chip in. Each check animates/chimes once, then the next appears. The guide hides the old coach and marks the hub or nearest glint when appropriate. Refresh midway preserves partial progress. Skip stays skipped after refresh; another device has its own first session.
- [ ] Core meter stays visible at top center in the field and hub. Digging depth and more total rows raises it from blue toward orange; next text follows coolant, drill and World Breaker. Finale fills it and the ending starts at full.
- [ ] Create Quick with no FAST flag. Both seats show QUICK; joining cannot change the mode. Compare material/find/oil values with Full: exactly 20 times, never doubled on pickup, delivery or belts. Prices are identical. Dig again keeps the mode. Full has no QUICK badge.
- [ ] Buy each pod with Confirm. Hold equals suit capacity plus the current pod's 12/36/100/300 bonus. Disconnect/reconnect keeps it; Dig again clears it. Inspect larger backpacks, and Pod III/IV's trailing sled filling with ore in Chase/Overview. No collision physics is added.
- [ ] Supply Lay conveyor switches to Overview, selects a path and confirms price/after-balance. First line discounts up to six new cells by 75 percent; later new cells cost $25K. Reused cells are free and keep their original owner. Cancel changes no money or map. Solo spends wallet first then fund.
- [ ] Player A lays a belt; B extends/reuses it. Ore entering B's cell pays B even after traveling A's cells; ore entering A's cell pays A. A new source that entirely reuses A's route costs zero and still credits A. Neither explorer can collect ore while it rides. Wallet, belt income and hub belt floats agree on both clients.
- [ ] Fill your hold while digging at your own shaft hoist: overflow rides the belt and pays its entry owner. Off-belt overflow remains a shared FIFO pile. Connect an excavator with a source inside/adjacent to its footprint; receipts follow belt entry ownership. Hand collection still works before ore enters a belt.
- [ ] Command contains no conveyor picker/catalog/list; vote API refuses old conveyor proposals. Personal belts do not open a vote or replace a saving goal.
- [ ] Both hub tabs retain a live money/hold header. Your explorer lists tool damage, suit reach/speed/base hold, pod/total hold, each detector level/range, light and machines. Owned/superseded cards are disabled; the next tier reads Next. Purchase updates balance, ownership, capacity and confirmation shortfall immediately without replacing buttons mid-tap.

Browser evidence in this environment: Quick room created with QUICK, combined FUNDS, guide and core meter. Three blocks/delivery advanced the checklist to Spoon. Its confirmation showed $67 to $52; Confirm changed the live header and Your explorer, disabled Spoon as Owned, enabled Trowel as Next, and checked the goal. Supply showed pods and personal belts. WebGL remains unavailable here: astronaut packs/sled, 3D goal markers, GPU performance and listening quality require the checklist on a real device. The existing scene/model smoke tests validate construction, not rendered pixels.


## Build 3 acceptance

Automated: 163 tests, two-client integration and all eight pacing runs. New checks cover direct hoist shares, empty/full holds unchanged, foreign-belt digger credit, find bonus routing, no-hoist cargo, detector matching/private snapshots/upgrade patches/shared hints, daylight and each light limit, refusal without damage, same-floor light sharing, installed lamps persisting/resetting, machine exemption, explicit pump text and pipe routes.

- [ ] Lay a personal conveyor whose source is your shaft. Walk/rappel in and dig: hold units/value do not change. Each break shows a via belt float; ore rises in the hoist, rides the belt and pays only on hub arrival. Repeat with a full hold and with two diggers splitting a block. On another explorer's hoist each digger still gets their own mining share. Ordinary loose piles retain the belt entry-owner rule.
- [ ] Merely passing a belt through a shaft does not make it a source/hoist. No source means holds still work. No direct-deposit unit or find bonus gets multiplied twice in FAST or Quick.
- [ ] Strike oil: read the drill fuel / split sale announcement. Pump confirmation repeats it. Build two wells: pipes reach the hub, flow beads animate, and a pipe trunk reaches the drill after placement. Command's produced minus burned equals sold barrels/sec; the drill row says Runs on oil from your pumps.
- [ ] Join two fresh seats without detectors: neither sees surface signs. Buy Metal on one: silver/gold signs appear on its map/minimap, never on the other seat. Diamond and Rods reveal only their matching signs. Shared hints discovered by the equipped player still show for the unequipped player. Refresh preserves visibility by owned tier.
- [ ] Dig to row 11 with daylight: the floor is black and further digging refuses with the exact darkness toast. Headlamp permits row 35, refuses row 36; Floodlamp permits row 90, refuses row 91. Row reach appears in the HUD and Your explorer. A better-equipped explorer at the same floor lights it for both; leaving/disconnecting removes portable shared light.
- [ ] A Shaft lights owner digs in a shaft: permanent wall lamps appear and anybody may continue to the core subject to coolant/tool gates. Lamps extend as the shaft deepens, survive owner disconnect and disappear on Dig again. Excavator and drill output continue beyond personal light limits.
- [ ] Recheck Return/belay, machine keep-out zones, personal conveyor confirmation and all three camera modes. Inspect black floors, pipe flow, hoist ore and lamp rendering on a real GPU. The environment's browser only verifies the 2D fallback and DOM; it cannot certify these pixels or phone performance.

Build 3 browser check: field LIGHT 10 rows appears in a real fresh room; startup and 2D fallback load. Build 4 mobile/core-bar and astronaut presentation fixes remain excluded until its separate release.


## Build 4 phone and astronaut acceptance

167 tests, integration and eight unchanged pacing routes pass. An actual browser CSS frame at width 375 measured CORE at width 375, height 36, top 94 exactly equal to the HUD bottom. The live game shows it synchronously from the first snapshot; a regression test does not require requestAnimationFrame to unhide it. The temporary layout fixture was removed and cover.html restored byte for byte.

- [ ] At 375 by 812 on a phone, CORE is a compact full-width bar directly under the field HUD, never a zero-size hidden element. Percent and next milestone fit one short line. Rotate, join by link, reconnect, reset and open/close the hub; the goal remains visible. The hub pins it above its overlay.
- [ ] On touch: start card and first dig goal say Tap to dig, walking uses the joystick, looking uses a right-hand drag, and the Spoon goal says Tap Hub. No Space, click or E instructions appear in touch hints. Desktop preserves mouse/Space/E/R. Lobby, map description, coach and boarding say walk/Walking.
- [ ] Chase with the sun behind the astronaut: suit stays recognizably white, team shoulder/helmet colors readable. Fill has no shadow map and is local to each explorer. Underground, pitch-black floor gating still works; suit fill does not reveal an unreachable floor.
- [ ] First person: two small glove-shaped grips hold the current tool handle, with cuffs, curled fingers and thumbs; no large white spheres obscure the ground. Check every tool, equip and dig swing, portrait and reduced motion.
- [ ] Recheck Build 3's direct hoist receipts, detector visibility and shared light gates. All economy/config values are unchanged. GPU pixels and device FPS remain manual checks.
