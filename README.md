# Toothpick to the Core (0.7.1)

Toothpick to the Core is a cooperative first-person mining expedition for one to four friends on their own devices. Start with a toothpick on a licensed claim in a dead world, rappel into the shafts you dig, and haul valuable ore home before buying better equipment. Share detector hints, fund machines by vote, power a crewed plasma drill with oil, and unleash the World Breaker to reach the core. The last act turns the dusty claim green. Join by a four-letter code or a room link, with no accounts or installation.

Contest taglines:

- Dig a dead world back to life. Together.
- Four rovers. One toothpick-sized beginning.
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

104 unit/rule/scene/input/audio checks pass, including two deterministic pacing simulations; the real two-client integration passes too. The isolated integration server changes only the drill price and leave grace duration (one second rather than 90) to make wire-level expiry practical to test. Production npm start never imports that harness. See TESTING.md and PACING.md for evidence, exact timelines and every numeric tuning change.

## Controls

WASD or arrow keys drive relative to the camera. Click the view to capture the mouse; Esc releases it. Mouse look and Space/click dig the targeted cell. E opens the hub when home; R belays up; V toggles chase; M toggles overview; N toggles remembered sound. On phones, the left joystick drives, dragging on the right looks, and tapping digs. Hub and camera buttons replace keyboard shortcuts. Site/conveyor picking switches temporarily to overview.

Only the server owns money, cells, damage, movement and timers. The pure rules modules run at ten ticks per second; renderers draw merged snapshots/diffs. No physics engine, database, accounts, bundler, image downloads or audio files are needed. Three.js 0.186.1 is vendored with its license. Sounds are procedural WebAudio, started by the first gesture, with a fixed twelve-voice pool and remembered mute.

## A round

New rovers face away from the habitat, two cells from the pad edge. Nearby surface blocks can be hit through row three. Walk into a deeper opening to rappel to its floor; then dig beneath your rover. Movement is disabled underground. A broken floor lowers everyone standing there. Share a shaft and its cargo in proportion to damage. Granite needs the pickaxe; outer-core magma needs coolant; the inner core needs team machinery.

The hold carries one unit per broken-block share and a separate unit for a find-bonus share. Wheels, Treads, Hover and Jump jets hold 8, 12, 16 and 24 units. Full holds spill shared FIFO piles. Collect ground piles by crossing their cell; shaft piles require reaching the floor. Belay takes two seconds plus 0.08 seconds per shaft row. Return to base belays first if necessary, drives to the depot edge and sells the whole hold once. Personal money, lifetime earnings and income increase on delivery. Tools, mobility, detectors and lighting are bought at the hub. Chip-ins and proposals also require the hub; voting works anywhere.

Silver, gold and diamond bonuses are 60, 120 and 180 times their block's payout and share its damage split. Oil pockets become confirmed pump sites. Detectors write shared hints, without revealing the hidden find table. Fund conveyors to carry loose ore to the depot. Pumps sell excess oil; team machines pay the fund directly. Team prices use the square root of distinct explorers who have ever joined, frozen when a vote opens. Active voters are frozen at open; majority passes immediately, otherwise yes must beat no after ten seconds. Failed proposals lock for fifteen seconds. Solo passes instantly. Saving goals auto-buy once funded.

After voting a drill site, buy coolant, the plasma drill and eventually the World Breaker. Board from anywhere on the surface; your rover drives to the rig and your personal tool parks. Crew and oil determine drill speed. The World Breaker completes the remaining depth in exactly sixty seconds. The green ripple leads to time-to-core and awards, including Top hauler. Dig again resets the planet and economy while keeping names, colors and reconnect tokens. Supports and orbital survey stay locked in config and are hidden from the catalog.

## Leave, rejoin and resilience

A refresh uses the token in localStorage to restore the same seat. A lost connection reserves that seat for ninety seconds; its rover is gray with a countdown. Reconnect in time to keep cargo, wallet, tools and position. At the deadline the hold drops as a pile at the rover/shaft cell, the wallet joins the fund once, and the player leaves any frozen voter list. That seat becomes available; a later return keeps upgrades but has an empty hold and zero wallet, and cannot evict a connected explorer. Distinct-player history still determines team prices.

Four occupied seats, including grace reservations, produce "This expedition is full (4 of 4)" for another joiner. Callsigns are trimmed, capped and stripped of control/format characters; empty becomes Digger. Missing/expired rooms show "That expedition has ended. Start a new one." and clear their stored token. Reconnect uses exponential backoff from 1.5 to fifteen seconds, keeping Reconnecting in the field strip until a snapshot arrives. Garbage/binary/oversized messages are discarded; buy, chip, proposal, vote and belay controls share a four-per-second limit. The server also bounds ingress and queued commands. A floating-point grid-corner traversal fix prevents unbounded cargo-path loops.

GET /health returns ok, room count and connected player count. GET /room/CODE returns only code, connected crew count and deepest depth in meters (404 when ended). The host callsign for the link preview is escaped into the initial lobby HTML, so this endpoint exposes no names, player state, tokens or finds. Rooms are in memory and expire after thirty idle minutes. Restarting the server loses them.

## Deploy on Render

1. Put the contents of this project's folder in a Git repository, with render.yaml, package.json, package-lock.json and server.js at the repository root. Include public/vendor and all rules files. Push the repository to your Git provider.
2. Create/sign into Render and connect that Git provider. In the dashboard choose New, then Blueprint, connect the repository, select its branch, and leave the Blueprint path as render.yaml.
3. Review the single web service: Node, plan free, one instance, build npm ci, start npm start, health path /health. Click Deploy Blueprint. The supplied render.yaml is unchanged from the previous delivery.
4. Open the service's public onrender.com URL after the health check passes. Test a normal room from two separate devices, then test an ended-room reconnect after a restart. Use HTTPS so clipboard/share and mouse capture are available where supported.
5. Configure your chosen external uptime monitor to GET the public /health URL every five minutes while judging. It needs no token, request body or special headers. This pinger is owner-managed and is not installed by this project.

Render's free service sleeps after fifteen idle minutes and can restart independently. Incoming HTTP/WebSocket activity avoids idle spin-down, but a pinger cannot preserve in-memory rooms across restarts or exhausted free hours. The monitor does not count as game activity, so it does not stop thirty-minute room expiry. Keep the app to one instance because rooms are in memory. See [Render Blueprints](https://render.com/docs/infrastructure-as-code) and [free service behavior](https://render.com/docs/free). No Render account or repository connection was changed by this delivery; the published Sites URL remains a raw-source mirror, not the multiplayer authority.

## Share image and favicon

The lobby includes Open Graph and Twitter large-card metadata, an absolute og:url/image URL derived from the HTTP request host, and a rover SVG favicon. The screenshot image is the one remaining manual step because this environment cannot create a WebGL context.

Run the app and open /cover.html in your WebGL-enabled browser at a 1200 by 630 viewport, 100 percent zoom. It renders the actual shared 3D renderer, with the habitat, two rovers, a lit shaft and planet, plus the title/tagline. Wait for it to draw and capture the page as public/cover.png. Keep that exact filename, commit it, and redeploy. The /cover.png route and card tags are already wired for it. Until it is captured, that image route returns 404; there is no fabricated or placeholder scene image. Cover config is isolated to the cover page and never connects to a live game room.

## Design notes

A dead world. One licensed claim, 24 by 24. Dig to the core and bring it back to life. The beacons bound our claim on a larger lunar wasteland, with dunes beyond it, a black star field and a round blue planet. The hub is the expedition's warm, white landmark. Shafts compress rendered depth to less than six world units while the HUD and authority retain the Earth-depth rules.

Carrying ore home gives every player a reason to move, puts something at stake when a diamond is in the hold, makes the mobility line matter beyond reach, and gives the team a second thing to build together before the drill. Smaller holds in this pass prevent long waits underground with upgrade money trapped as cargo. Late tool and team prices now fit the tested round shape. Terrain uses weak, irregular multi-octave bumps, a second rotated noise sample, broad albedo variation and adjusted shadow bias. The global track overlay is disabled to remove a possible source of regular streaks. The sky planet is a screen-aligned shaded globe disc, so its silhouette stays circular at every aspect ratio. GPU appearance and phone FPS still need the visual checklist on real hardware.

## Final visual polish (0.7.1)

Undug cells now draw full-width dust tiles, with no rim, wall or lit-edge instances. The short bright dashes came from lit-rim transforms that zeroed width but left their other horizontal extent visible. Shaft surfaces are now compact instance lists containing only dug cells, covered by the scene smoke test. Rock materials use a white base with single gray instance tinting and a subtle gray light floor to keep shaded faces visible; tops still take sunlight and contact shadows remain.

The lobby reuses the scene renderer with local visual set dressing and a slow dusk orbit. It creates no room, socket, fetch loop or audio. Joining disposes that backdrop before starting the game renderer. WebGL failure or reduced-motion preference leaves a plain background. The cover uses the same local scene, a fixed positioned 1200 by 630 frame, lower/closer camera, brighter/larger habitat, two rovers, lit shaft, ore pile and larger upper-right planet. Recapture public/cover.png from /cover.html to use the new composition. The coach says "Press E to open the hub" when the authority says you are already home. Rules, pacing, hosting settings and vendored dependencies are unchanged.
