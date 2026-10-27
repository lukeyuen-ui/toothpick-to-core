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

0.7.2: Embedded-browser input fallback, smooth arrow yaw, immediate short-click digging, one-time controls prompt and dig-first coaching. No authority or economy changes.

0.7.3: Belay remembers entry side and faces its own shaft; Return to base routing preserved. Hub purchase/proposal/chip-all confirmation with live affordability and keyboard handling. Prices, balance and pacing unchanged.

0.8.0: Dead-planet cold-core story; 16-cell busier claim with visible signs and thin shafts; multi-cell oil fields and veins; active machine shares and solo pooling; round merged pit presentation; held/dial field dowsing. Four deterministic normal pacing runs cover two players and solo. No queued Build 1/2 features are included.

0.9.0 Build 1: occupied-cell indirect-hit safety; ring search/emergency depot escape; separately owned excavators with safe footprints, hopper and owner belt receipts; astronaut suits/helmet view; nine held tool models, equip moments and sound profiles. Build 2 is recorded below.


1.0.0 Build 2 complete: remembered guided goals and markers, core meter, Full/20x Quick mode, four pod tiers, personal owned conveyors with first-line discount and source ownership, automatic hoist overflow, belt receipts/income, live hub header and Owned/Next inventory. 154 checks, integration and eight pacing routes pass. Full 22:14.5 to 28:10.8, Quick 10:49.5 to 11:17.8. All queued builds are delivered separately; render.yaml unchanged. Remaining hazards/supports/survey/permanent bonuses stay excluded. GPU visual acceptance remains with the designer.


1.1.0 Build 3: direct shaft-hoist output with digger credit and untouched holds, oil-purpose guidance/flows/status, per-seat matching detector signs, authoritative/shared depth lighting and machine exemption. Mandatory light prices retuned; other Build 2 numbers unchanged. 163 tests, integration and eight pacing runs. Build 4 polish is queued separately.


1.1.1 Build 4: compact always-visible phone CORE row with immediate snapshot paint, touch-specific instructions, walk wording, bounded explorer fill/material lift and compact shaped tool gloves. No rules, economy or pacing changes. 167 tests, integration, eight pacing runs. Responsive CSS browser check at 375 px passes; GPU acceptance remains manual.
