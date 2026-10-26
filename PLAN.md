# Toothpick to the Core

- [x] Milestone 1: authoritative rooms, tools, mobility, shared map, sync, reconnect and phone UI
- [x] Milestone 2: seeded finds, rewards, detectors, shared hints and terrain/payout polish
- [x] Milestone 3: incremental snapshots, adjacent dowsing, team fund, votes, saving goals, pumps, drill, coolant, World Breaker, ending, stats and reset
- [ ] Milestone 4 (conveyors completed; remaining work pending): hazards, supports, conveyor, survey, departure economics, late-join grants and polish
- [ ] Milestone 5: angled terrain, configurable planets, permanent bonuses, more finds and sharpening

Delivery: Node ZIP fallback. Render Blueprint included at project root. Public deployment remains pending the account owner's connection. All milestone 4 and 5 gameplay is excluded; their catalog entries remain locked. Phone end-to-end play testing remains with the designer.

Hauling update complete: depot, cargo capacities, FIFO piles, directed voted conveyors, delivery income, Top hauler and six polish fixes. Supports, survey, hazards and departure economics remain unimplemented. Blueprint plan changed to free; pinger remains owner supplied.

3D client/direct movement update: implemented and packaged. WebGL visual acceptance and physical-phone FPS remain unverified because the available cloud browser disables WebGL. Other milestone 4/5 gameplay stays pending. Three.js is vendored; free-plan Blueprint unchanged.

First-person / shafts / hub update (0.6.0): camera modes, relative analog movement, authoritative descent and belay, surface-depth reach gate, hub-only trading, lighting line and shared lamps, compact field HUD, hoists and cab detail implemented. Physical GPU/phone visual acceptance remains pending; no new hazards, economy tiers beyond lighting or pacing changes included.

Lunar visual pass (0.6.1): continuous normal-mapped regolith, crater decals, target/corner feedback, round dust, space sky/planet/sun, round habitat landmark and cockpit detail. Window/document hotkeys covered by new tests; 88 tests and integration pass. Authority and hosting unchanged. GPU visual acceptance remains with the tester.

## 0.6.2: powder and procedural sound
Completed the requested regolith, rocks/craters, shaft mouth light, outward spawn, subtle bob and crew visibility pass. Added lazy procedural WebAudio, remembered N/HUD mute, reusable bounded voices and state-delta cues. No new gameplay/economy rules; spawn presentation only changes initial authority coordinates/facing. Blueprint unchanged. See TESTING.md for the GPU and listening acceptance checklist.

## 0.7.0 ship pass

Completed terrain/planet fixes, two real-rule normal-mode pacing runs, leave grace with cargo drop and wallet donation, seat reuse, bounded malformed-message handling and rate limits, restart/expiry recovery, metadata/health routes, first-impression lobby and solo sharing nudge, social metadata and rover favicon. The real-scene /cover.html capture page is supplied because WebGL is unavailable here; public/cover.png must be captured on the tester's browser before social previews have an image. README includes Render Blueprint/pinger steps and contest copy. PACING.md lists the timelines and every numeric change. Blueprint unchanged; no hazards, supports, survey or other stretch features were implemented.

## 0.7.1 final visual polish
Removed undug shaft geometry, corrected rock material tinting/visibility, fixed the cover frame and composition, added a no-room local lobby orbit with reduced-motion/WebGL fallback, and contextualized the hub coach. No rule or pacing changes.
