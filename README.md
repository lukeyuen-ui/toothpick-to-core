# Toothpick to the Core (1.1.1)

Toothpick to the Core is a cooperative first-person astronaut mining expedition for one to four friends on their own devices. Start with a toothpick on a licensed claim in a dead world, rappel into the shafts you dig, and haul valuable ore home before buying better equipment. Share detector hints, fund machines by vote, power a crewed plasma drill with oil, and unleash the World Breaker to reach the core. The last act turns the dusty claim green. Join by a four-letter code or a room link, with no accounts or installation.

Contest taglines:

- Dig a dead world back to life. Together.
- Four explorers. One toothpick-sized beginning.
- Bring the ore home. Bring the planet back.

## Run and test

Use Node 20 or newer; this release was checked on Node 24.

```sh
npm ci
npm start
npm test
npm run test:integration
npm run test:pacing
```

Open http://localhost:3000. Phones on the same network can use the computer's LAN address. The server listens on 0.0.0.0 and PORT, default 3000. The creator's ?fast=1 multiplies mining and oil income by 100 for the whole room. ?debug=1 shows timing/state details. ?view=2d selects the canvas fallback. Test normal pacing without fast mode.

npm test runs 317 checks across the rules, scene, input, audio, graphics quality and save code modules: 313 pass, and the four hardcore pacing simulations are skipped unless PACING_FULL=1 is set, since they simulate about two weeks of play. The deterministic Full and Quick pacing simulations with one and two players run every time, and the real two-client integration passes too. The isolated integration server changes only the drill price and leave grace duration (one second rather than 90) to make wire-level expiry practical to test. Production npm start never imports that harness. See TESTING.md and PACING.md for evidence, exact timelines and every numeric tuning change.

## The lobby: expeditions, crewmates and graphics

The lobby's EXPEDITION menu picks the shape of the run. Showcase is the whole game in about three minutes, carried by a bot crew (see Showcase below), and is selected by default. Quick runs about ten minutes with ore worth 60 times as much. Full is the normal round at about thirty minutes. Hardcore is the long haul: every block takes 200 times the hits and ore, finds and oil pay a thirtieth as much, so each explorer lands with $1,000 to gear up and the pacing bots need about two weeks of nonstop digging to reach the core. Hardcore rooms issue the save codes described under Deploy on Render. COMPUTER CREWMATES fills the empty seats with bots at Easy or Hard, or turns them off for people only.

GRAPHICS chooses a preset for the 3D view (public/quality.js). High renders at up to twice the CSS resolution with soft shadows (a 2048 map on desktops, 1024 on phones), bloom, a baked-sky reflection on metal, glass and visors, film grain, falling ash and the full dust, debris, gravel and finale flora budgets. Balanced renders at 1.5 times with harder shadows from a half-size map, no grain, and about two thirds of the debris, gravel, ash and flora. Low renders at native resolution with no shadows, bloom, reflections, ash, gravel or camera kick, half the dust and a fifth of the debris, so it is the cheapest 3D view. Auto, the default, starts at High and drops one level whenever the median frame rate over a five-second window falls below 45; it never steps back up during the visit, and frame gaps longer than a quarter second (a compile, a backgrounded tab) are left out of the measurement so a one-off stall never costs a level. The choice is saved in the browser, and ?gfx=high, ?gfx=balanced or ?gfx=low overrides it for one visit.

During play the room code sits as a small ROOM ABCD caption under the minimap. Tapping it opens the share sheet where the browser has one, otherwise it copies the room link. The hub panel carries a Room ABCD Share button too, and the address bar holds ?room=CODE, but full-screen phones hide the address bar, so the caption is the one place the code is always visible.

## Controls

WASD walk relative to the camera. Left/Right arrows turn; Up/Down walk. Click in the 3D view to capture the mouse: moving it looks around, a click digs, and Esc frees the cursor for the HUD buttons. Dragging with either mouse button still looks when the cursor is free, and Space digs. E opens the hub when home; R belays up; H returns to base when that button is showing; V toggles chase; M toggles overview; N toggles remembered sound. On phones, the left joystick walks, dragging on the right looks, and tapping digs. Hub and camera buttons replace keyboard shortcuts. Site/conveyor picking switches temporarily to overview.

Only the server owns money, cells, damage, movement and timers. The pure rules modules run at ten ticks per second; renderers draw merged snapshots/diffs. No physics engine, database, accounts, bundler, image downloads or audio files are needed. Three.js 0.186.1 is vendored with its license. Sounds are procedural WebAudio, started by the first gesture, with a fixed twelve-voice pool and remembered mute.

## Showcase: the whole game in three minutes

Showcase (showcase-rules.js) is the expedition to show someone first. A bot crew carries the arc, and every beat also moves on by itself, so a visitor who never touches anything still reaches the core. You land at the hub with the toothpick; after three taps (or a short wait) the nearest crewmate throws you the mining mech, and the 3 by 3 hole it carves drops you into your own shaft toward the magma. As soon as you are digging, the crew lays a free conveyor from your shaft to the hub, so the ore your hits break rides the hoist and the belt home and pays your wallet on arrival (the floats say via belt) instead of filling a hold. A crewmate then proposes your shaft as the drill site, the vote banner passes it, the plasma drill drops in, the bots climb aboard and you take a console seat with its own gauge mini-game while the bore fills the fund. The crew votes the World Breaker and the overdrive opens the core. Coolant is already paid for and two oil pumps already run; ore pays base rates with no Quick multiplier, so the wallet stays small next to the World Breaker the drill has to earn; and the lights reach the core, so no shaft goes dark.

## A round

New explorers face away from the habitat, two cells from the pad edge. Nearby surface blocks can be hit through row three. Holes stop you at their edge; stand beside one and press R (or tap Belay down) to rappel to its floor, then dig beneath your explorer. R belays back up. Movement is disabled underground. A broken floor lowers everyone standing there. Share a shaft and its cargo in proportion to damage. Granite needs the pickaxe; outer-core magma needs coolant; the inner core needs team machinery.

The hold carries one unit per broken-block share and a separate unit for a find-bonus share. Boots, Sprint servos, Hover pack and Jump jets hold 8, 12, 16 and 24 units. Full holds spill shared FIFO piles. Collect ground piles by crossing their cell; shaft piles require reaching the floor. Belay takes two seconds plus 0.08 seconds per shaft row. Return to base belays first if necessary, drives to the depot edge and sells the whole hold once. Ore delivery increases personal money, lifetime earnings and income. Machine income credits those balances directly. Tools, mobility, detectors and lighting are bought at the hub. Chip-ins and proposals also require the hub; voting works anywhere.

Silver, gold and diamond bonuses are 60, 120 and 180 times their block's payout and share its damage split. Oil pockets become confirmed pump sites. Detectors write shared hints, without revealing the hidden find table. Buy personal conveyors in Supply to carry loose ore directly to your wallet. Pumps sell excess oil. Half of oil-sale and drill output goes to the fund; half goes straight to active players' wallets, without hauling. Team prices use the square root of distinct explorers who have ever joined, frozen when a vote opens. Active voters are frozen at open; majority passes immediately, otherwise yes must beat no after ten seconds. Failed proposals lock for fifteen seconds. Solo passes instantly. Saving goals auto-buy once funded.

After voting a drill site, buy coolant, the plasma drill and eventually the World Breaker. Board from anywhere on the surface; your explorer drives to the rig and your personal tool parks. Crew and oil determine drill speed. The World Breaker completes the remaining depth in exactly sixty seconds. The green ripple leads to time-to-core and awards, including Top hauler. Dig again resets the planet and economy while keeping names, colors and reconnect tokens. Supports and orbital survey stay locked in config and are hidden from the catalog.

## Leave, rejoin and resilience

A refresh uses the token in localStorage to restore the same seat. A lost connection reserves that seat for ninety seconds; its explorer is gray with a countdown. Reconnect in time to keep cargo, wallet, tools and position. At the deadline the hold drops as a pile at the explorer/shaft cell, the wallet joins the fund once, and the player leaves any frozen voter list. That seat becomes available; a later return keeps upgrades but has an empty hold and zero wallet, and cannot evict a connected explorer. Distinct-player history still determines team prices.

Four occupied seats, including grace reservations, produce "This expedition is full (4 of 4)" for another joiner. Callsigns are trimmed, capped and stripped of control/format characters; empty becomes Digger. Missing/expired rooms show "That expedition has ended. Start a new one." and clear their stored token. Reconnect uses exponential backoff from 1.5 to fifteen seconds, keeping Reconnecting in the field strip until a snapshot arrives. Garbage/binary/oversized messages are discarded; buy, chip, proposal, vote and belay controls share a four-per-second limit. The server also bounds ingress and queued commands. A floating-point grid-corner traversal fix prevents unbounded cargo-path loops.

GET /health returns ok, the room count, the connected player count and humans, the connected people with the bot crews left out, so a deploy can wait for people only. GET /room/CODE returns only code, connected crew count, bot count and deepest depth in meters (404 when ended). The host callsign for the link preview is escaped into the initial lobby HTML, so this endpoint exposes no names, player state, tokens or finds. Rooms are in memory and expire after thirty idle minutes. Restarting the server loses them.

## Deploy on Render

1. Put the contents of this project's folder in a Git repository, with render.yaml, package.json, package-lock.json and server.js at the repository root. Include public/vendor and all rules files. Push the repository to your Git provider.
2. Create/sign into Render and connect that Git provider. In the dashboard choose New, then Blueprint, connect the repository, select its branch, and leave the Blueprint path as render.yaml.
3. Review the single web service: Node, plan free, one instance, build npm ci, start npm start, health path /health. Click Deploy Blueprint. The supplied render.yaml is unchanged from the previous delivery.
4. Open the service's public onrender.com URL after the health check passes. Test a normal room from two separate devices, then test an ended-room reconnect after a restart. Use HTTPS so clipboard/share and mouse capture are available where supported.
5. The free instance sleeps after 15 idle minutes, and the next visitor waits up to a minute while it boots. While the repository is on GitHub, .github/workflows/keep-warm.yml fetches the public /health URL from GitHub Actions every ten minutes so the link opens at once; it needs no token or secret and never fails a run, so an outage does not mail you every ten minutes (the run log shows the status). Turn it off from the repository's Actions tab (Keep warm, Disable workflow) or delete the file. GitHub pauses scheduled workflows after 60 days without a commit; a push to main starts them again. The server also pings itself: while awake it fetches its own public /health every ten minutes (keep-warm.js, only when Render sets RENDER_EXTERNAL_URL), so a woken instance stays up without outside help; the workflow remains the one thing that can wake a sleeping one.

Hardcore expeditions outlive the server through save codes (save-rules.js). Every minute, and soon after a purchase, a vote result, the drill or the World Breaker, each person in a hardcore room receives a signed code; the lobby keeps the latest and offers Resume, and a crewmate can paste the same code to join that expedition. Set SAVE_SECRET in the service's Environment settings to a long random string so codes cannot be forged. Without it the server logs a warning at startup and signs codes with a built-in default key, which still survives deploys. Codes signed under one key stop working when the key changes, so set it before long expeditions begin.

Render's free service sleeps after fifteen idle minutes and can restart independently. Incoming HTTP/WebSocket activity avoids idle spin-down, but a pinger cannot preserve in-memory rooms across restarts or exhausted free hours. The monitor does not count as game activity, so it does not stop thirty-minute room expiry. Keep the app to one instance because rooms are in memory. See [Render Blueprints](https://render.com/docs/infrastructure-as-code) and [free service behavior](https://render.com/docs/free). No Render account or repository connection was changed by this delivery; the published Sites URL remains a raw-source mirror, not the multiplayer authority.

## Share image and favicon

The lobby includes Open Graph and Twitter large-card metadata, an absolute og:url/image URL derived from the HTTP request host, and an explorer SVG favicon. public/cover.png, the 1200 by 630 image behind the link card, is the contest cover art (the plasma drill opening the core), the same picture as the submission, so a pasted link and the entry look alike.

To use a scene capture instead, run the app and open /cover.html in a WebGL-enabled browser at a 1200 by 630 viewport, 100 percent zoom. It renders the shared 3D renderer, with the hub, two explorers and a lit shaft under the ash sky, plus the title and tagline. Wait for it to draw, capture the page as public/cover.png, keep that exact filename, commit it and redeploy; the /cover.png route and card tags are already wired for it. Cover config is isolated to the cover page and never connects to a live game room.

## Design notes

A dead planet. One licensed claim. Dig to the cold core, restart it, and bring the world back to life. The planet is Earth after a nuclear war. Beacons bound a 16 by 16 claim, with ash dunes beyond (dead trees, broken concrete, fallen pylons, rusted barrels and radiation signs) under an ash overcast, the Moon low in the sky. The hub is the expedition's warm, white landmark. Rendered pits compress depth to less than six world units while the authority retains the full planetary depth.

Carrying ore home gives every player a reason to move, puts something at stake when a diamond is in the hold, makes the mobility line matter beyond reach, and gives the team a second thing to build together before the drill. Smaller holds in this pass prevent long waits underground with upgrade money trapped as cargo. Late tool and team prices now fit the tested round shape. Terrain uses weak, irregular multi-octave bumps, a second rotated noise sample, broad albedo variation and adjusted shadow bias. The global track overlay is disabled to remove a possible source of regular streaks. The Moon is a screen-aligned shaded disc with painted maria, lit from the sun's side, so its silhouette stays circular at every aspect ratio. GPU appearance and phone FPS still need the visual checklist on real hardware.

## Final visual polish (0.9.0)

Undug cells now draw full-width dust tiles, with no rim, wall or lit-edge instances. The short bright dashes came from lit-rim transforms that zeroed width but left their other horizontal extent visible. Shaft surfaces are now compact instance lists containing only dug cells, covered by the scene smoke test. Rock materials use a white base with single gray instance tinting and a subtle gray light floor to keep shaded faces visible; tops still take sunlight and contact shadows remain.

The lobby reuses the scene renderer with local visual set dressing and a slow dusk orbit. It creates no room, socket, fetch loop or audio. Joining disposes that backdrop before starting the game renderer. WebGL failure or reduced-motion preference leaves a plain background. The cover uses the same local scene, a fixed positioned 1200 by 630 frame, lower/closer camera, brighter/larger habitat, two explorers, lit shaft, ore pile and larger upper-right planet. Recapture public/cover.png from /cover.html to use the new composition. The coach says "Press E to open the hub" when the authority says you are already home. Hosting settings and vendored dependencies remain unchanged.

### Embedded browser controls

A click in the 3D view captures the mouse, so moving it looks around and a click digs; Esc frees the cursor for HUD buttons such as Belay up (R key), and the overview releases it on its own. Dragging with either mouse button still looks while the cursor is free. Left and Right arrows turn at 90 degrees per second; Up and Down drive, and WASD keep camera-relative driving and strafing. Space digs the outlined cell. A one-time controls card and a pulsing reachable target explain the first dig before the hub coach. Phone look gestures are unchanged.

### Belay and purchase confirmation

Belay up returns you to your own shaft on the side you entered, facing the hole. If that neighbor was dug while you were below, the closest undug neighbor is used; if all neighbors are dug, you arrive on the rim. Return to base keeps its belay-then-drive-home route. The renderer adds a brief lip hop and dust puff, disabled under reduced motion.

Supply buttons select an item for review, including unaffordable items. Confirm or Enter buys; Cancel or Esc dismisses without closing the hub. The panel shows the item, effect, price, wallet afterward and any shortfall. Team proposals (including picked sites) and Chip in all also require confirmation. Chip in 10% and half remain immediate. The server validates the action when Confirm is pressed.

## A cold core, a sleeping world

A dead planet. One licensed claim. Dig to the cold core, restart it, and bring the world back to life. The planet is our Earth after the bombs: ash ground, a smoky overcast with a few stars showing through, and the Moon in the sky; the expedition is working on the dead planet beneath its wheels. The final green ripple is this planet waking up as its core restarts.

## The busier claim (0.9.0)

The claim is 16 by 16 with a centered 2 by 2 depot. Roughly half of the seeded finds have a faint surface vein/glint or bubbling oil seep; deep finds still need detectors. Gold and diamond veins contain 2 or 3 adjacent cells at one row. Oil fields are 2 by 2 or 3 by 3: the first strike reveals the lateral field footprint, and each cell needs its own strike and pump purchase. Each well adds one barrel per second. No find rows or unexposed find table are sent to a client.

A shaft is rich for 25 rows from its first successful hit. After that its material payout is 40 percent and the row tag says thin. Find jackpots retain their original bonus value. Opening another shaft restores its rich band. Depth progress and the core finish stay the same. Round, irregular pit walls, soft lips, loose rubble and visual connections between neighboring deep pits replace square holes. Their appearance does not change the cell-based rules.

Machine income is split 50 percent to the fund and 50 percent equally to connected explorers who tapped, dug or drove within 45 seconds. Working drill crew count as digging. If nobody is active, the unallocated share stays in the fund. Direct shares show oil share or drill share floats. Fund and personal income use the same ten-second EMA.

When exactly one explorer is connected, FUNDS shows wallet plus fund. Personal purchases at the hub spend wallet first, then fund. A solo saving goal can use the combined balance while the explorer is at the hub (fund first). A second connection separates the display immediately without moving any money. Confirmation panels preview the pooled balance. Belay/Return behavior is retained; an automatic homeward route that enters a shaft now belays and resumes.

Dowsing is available in the field: two held rods and a caption in helmet/cab view, a compact north-up dial in chase/overview and the 2D fallback. Heat and diamond hints remain shared on the ground and minimap. The hub still sells detector upgrades. See PACING.md for all final price changes and the new solo/two-player timelines.

## Build 1: safe suits and placed machinery (0.9.0)

Automatic, area and splash damage cannot hit any cell occupied by an explorer, including a teammate. A deliberate tap/click can dig the explorer's own floor. Belay searches outward ring by ring through the whole claim for undug, non-depot ground, preferring the remembered entry direction within each ring. If the entire claim is dug, it exits at the depot pad edge. Return to base always continues to home. Drill crew are parked at the rim, and the World Breaker clears its site before the finale so indirect damage never drops an explorer through a floor.

The handheld ladder is now Toothpick, Spoon, Trowel, Shovel, Pickaxe, Jackhammer, Blasting kit, Tunnel borer, Mining mech. Excavator is a separate $4.8M Machines purchase at Supply. Buy one kit per explorer, pick a center cell in overview and confirm the nine-cell footprint. The machine drives out at 4 cells/sec and sets up; its footprint cannot overlap the depot, the protected hub approach, a drill site or another machine. The one-cell hub approach stays clear to guarantee emergency egress. Placement and activation require an empty footprint.

The excavator digs its shallowest footprint rows together, with depth-scaled damage giving 12 seconds per block. It lowers itself into the pit. A running footprint is solid and refuses digging. The owner can switch it from the hub, or press E beside it. Off means ordinary shafts open to explorers; on requires everyone clear. The 120-unit hopper stops mining when full. A conveyor source in or adjacent to the footprint drains up to 10 units/sec and sells that cargo to the owner of its entry belt cell directly; it is never put in someone else's hold on the belt. Explorers beside the hopper can take ore by hand into their own holds. It persists through disconnects, disappears on Dig again, and still obeys the coolant gate. A departed owner's later belt receipts go to the fund.

Players are white-suited explorers with gold visors, colored shoulder stripes/lights, life-support packs, chunky boots, walk cycles and light bounce. Mobility names are Boots, Sprint servos, Hover pack and Jump jets, with the same reach, speed and capacity numbers. Helmet glass and gloved tool hands replace the cab pillars/dashboard; held rods remain in the field. The mech adds an exoskeleton and drill/claw arms. Every tool has a distinct model and swing/jab/grind, material impact pitch, chips or sparks; blasts add an expanding smoke ring. Buying a tool stows the old one, raises the new one and announces its per-hit damage. Reduced motion removes shaking and animation. WebGL appearance and performance need the visual checklist; the geometry and state machines are smoke tested here.

The Build 1 safety and machine behavior remains in this release. See the Build 2 section below for the newer economy and interface. render.yaml remains byte-identical.


## Build 2: guided expeditions and personal logistics (1.0.0)

Choose Full expedition (about 30 minutes) or Quick expedition in the lobby. Quick multiplies material, find and oil-sale values by 60; every price stays the same. QUICK is shown to every joining player and preserved by Dig again. The hidden FAST test flag composes once with Quick. Bot runs finish Full expeditions in about 30 to 34 minutes and Quick in about 5.5 minutes; people take longer, so Quick aims at roughly 10 minutes of real play. PACING.md gives every timeline and numeric change.

A skippable first-session guide advances through digging three blocks, delivery, Spoon, digging a shaft floor, belaying, a visible glint and a chip-in. Checks and a chime mark completion; hub/ore markers help where useful. Partial progress and Skip are remembered locally. It replaces the coach while active. The core meter combines deepest progress (70 percent) and total dug rows (30 percent), stays below full before the finale, then fills during the World Breaker's sixty seconds. It is a progress display, not an additional authority rule.

Cargo pods add capacity to the suit: Pod I adds 12 units for $300, II adds 36 for $12K, III adds 100 for $600K and IV adds 300 for $60M. These are replacement pod bonuses, not cumulative bonuses. Buy tiers in order. Larger backpacks and a filled ore sled at the top two tiers show the upgrade. Pods persist across disconnects and reset on Dig again.

Supply sells personal conveyors without a vote or team multiplier. Lay conveyor selects a source and previews the path, new cells and price; Confirm pays the wallet (wallet first, then fund when solo). Each of the first six new cells of the first line costs one quarter of $25K. Reused cells are free and retain their owner, including a new source that reuses an existing route entirely. Ore belongs to the owner of the belt cell where it enters, keeps that credit across reused cells, and cannot enter anybody's hold while riding the belt. Sales produce a belt float at the hub and personal belt income. Full-hold overflow in a shaft with your own hoist rides automatically. Machines feed only a belt source within or next to their footprint; that entry belt's owner receives its ore. Off-belt piles remain shared and collectible. Conveyors are absent from Team and rejected by the vote API.

Both hub tabs show a live balance strip (FUNDS when solo), fund, hold and belt income. Your explorer lists every owned tool, suit, pod, detector, light and machine. Equipment cards remain mounted during updates: owned and superseded cards are disabled and marked Owned; only the next tier is marked Next and selectable, even if unaffordable so its confirmation can explain the shortfall.

Build 2 balance changes from Build 1: Blasting kit manual damage 300 to 400, World Breaker $4.4B to $5.5B. Other existing prices and capacities are unchanged. Cargo pod prices/capacities are exactly the requested values. No hazards, supports, survey or permanent bonuses were added. GPU rendering and phone frame rate still need the designer's visual test; the available browser verifies the 2D fallback and DOM interfaces.


## Build 3: visible progress, hoists and light (1.1.0)

A conveyor source over a shaft has a hoist. Digging while at that shaft's floor sends block and find shares directly to the belt, leaving holds unchanged even when empty or full. Each digger keeps credit for their own output, including on another explorer's hoist; ordinary loose ore entering belts still follows entry-cell ownership. Cargo rides to the hub before payment. A via belt float identifies each block. Buckets and ore animate on the hoist and belt. Without an actual source/hoist, the normal hold and overflow rules remain.

Oil powers the plasma drill. Oil the drill does not burn sells every second: half to the team fund, half to active crew. Strike announcements and pump confirmations say this explicitly. Team shows produced, burned and sold barrels per second; the drill catalog explains its fuel. Surface pipes carry oil from pumps to the habitat and a shared trunk to the placed drill. Animation is presentation only.

Surface signs now require a matching detector: Metal for silver/gold, Diamond for diamond, Rods for oil. This applies to the map, minimap and guide markers. The server filters signs per seat, including unchanged cells when a detector is bought. Shared detector hints and already-confirmed oil fields remain visible to the crew. The hidden find table and find depths stay server-side.

Daylight permits digging through row 10, Headlamp through 35, Floodlamp through 90. Deeper attempts refuse without damage: Too dark to dig. A better light at the hub reaches deeper. A connected explorer at the same floor shares their deeper light. Shaft lights permanently install shared lighting in shafts you dig, extending to the core even after their owner leaves. Excavators, the plasma drill and World Breaker carry their own lights. The HUD and Your explorer list reach in rows; an unlit floor beyond reach is black. Buying light does not change tool/rock/coolant gates.

Mandatory light progression needed accessible early prices: Headlamp $2K to $150, Floodlamp $100K to $350, Shaft lights $5M to $100K. No other gameplay tuning changed from Build 2. Full simulations finish in 29:37.4 to 30:33.6; Quick in 9:05.4 to 9:05.9. Eight real-rule runs pass, including solo. See PACING.md for every milestone. New belt/excavator actions now reach the authority through the server's allowed-action dispatch; integration explicitly checks these messages and recipient-only signs.

Build 4 phone/core-bar, touch wording, suit fill, glove and walk-text polish is intentionally excluded from this archive and queued separately. Render Blueprint unchanged. GPU appearance and physical-phone frame rate remain manual acceptance items.


## Build 4: phone readability and astronaut polish (1.1.1)

CORE sits in a nonshrinking full-width row under the field HUD on phones, with percent and the next milestone on one line. It paints immediately on each authority packet, even before the next animation frame. Opening the hub keeps it pinned above the overlay. Lobby and field instructions now say walk; touch devices get joystick, tap and Hub wording, including the guide and first-input card. Desktop keeps its mouse/Space/key instructions.

Every explorer has a bounded, shadow-free suit fill and a subtle white/team-color material lift, so chase shadows do not erase the astronaut. First-person gloves are smaller shaped grips with cuffs, curled fingers and thumbs around the tool handle. These are presentation changes only. Build 3's rules, prices and all eight pacing timelines are unchanged. 167 tests and the two-client integration pass. The cover page and Render Blueprint remain unchanged.

Responsive browser check: the actual stylesheet and game markup in a 375 by 812 CSS frame give CORE a 375 by 36 box, directly below the HUD at y=94. The live game also paints CORE on its first snapshot. Touch copy and glove/fill construction have automated checks. WebGL is unavailable here, so rendered suit/glove quality and phone FPS still require Luke's device.
