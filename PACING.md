# Ship-pass pacing and numeric changes

Normal mode, no fast flag. Both bots call the real room step at ten ticks per simulated second, with no sleeps, money injection, find injection or position teleporting. They tap at the next eligible tick (150 ms request interval becomes five manual taps per second at 10 Hz), choose the nearest ungated non-depot work cell outside automatic depot sales, enter deep shafts, wait for the floor, and belay/return when full or blocked. Quarter-cell pathfinding uses public terrain to steer around old shafts and the habitat. It makes movement commands, not authority position edits.

At the hub they buy the cheapest eligible next tool/mobility/Headlamp with twenty percent spare. They chip in half once per delivery/goal, propose the site after both have mechs, then coolant, the drill, available pumps and the World Breaker, and vote yes. They board the new rig; while the unfunded goal still needs hauling income they return to mining rather than waiting forever in an oil-starved rig. Once the finale is funded they board again. Neither bot uses the hidden find table. Seed 5 exercises a real find; seed 42 validates progress without a lucky find. The test asserts twenty to thirty-five minutes, drill before sixty percent of the round, boarding before the finale, and a sixty-second World Breaker.

## Timeline

Times are simulated minutes:seconds.

| Event | Seed 5 | Seed 42 |
| --- | --- | --- |
| first upgrade | 0:25.1 | 0:25.1 |
| first find | 12:23.4 | No find in this run |
| first delivery over $1K | 1:41.7 | 1:41.7 |
| first mech | 12:39.1 | 13:29.5 |
| both mechs | 13:29.5 | 13:31.9 |
| coolant | 13:31.0 | 13:33.4 |
| drill | 16:22.1 | 16:41.5 |
| first boarding | 16:22.2 | 16:41.6 |
| World Breaker | 31:17.2 | 31:33.8 |
| core | 32:17.2 | 32:33.8 |

## Personal upgrades (first bot to achieve each)

| Tool | Time, seed 5 |
| --- | --- |
| Spoon | 0:25.1 |
| Trowel | 0:56.6 |
| Shovel | 1:41.8 |
| Pickaxe | 3:15.6 |
| Jackhammer | 4:47.5 |
| Blasting kit | 7:10.3 |
| Excavator | 9:31.4 |
| Tunnel borer | 11:12.4 |
| Mining mech | 12:39.1 |

## All changed pre-existing numeric config values

| Config | Previous | Shipped |
| --- | ---: | ---: |
| tools[8].cost (Tunnel borer) | 150,000,000 | 40,000,000 |
| tools[9].cost (Mining mech) | 400,000,000 | 100,000,000 |
| mobility[1].hold (Treads) | 20 | 12 |
| mobility[2].hold (Hover) | 50 | 16 |
| mobility[3].hold (Jump jets) | 120 | 24 |
| teamItems.plasma.price | 5,000,000,000 | 600,000,000 |
| teamItems.worldBreaker.price | 50,000,000,000 | 16,000,000,000 |
| three.shadowBias | -0.0003 | -0.001 |
| three.shadowNormalBias | 0.04 | 0.12 |
| visual.normalStrength | 0.22 | 0.073 |

Payout growth (1.12), other tool costs, Wheels capacity (8), all mobility costs/speeds, find bonuses, coolant/pump pricing, drillSecondsPerBlock (30), crew/oil factors, belay timing (2 plus 0.08 per row), rappel speed (12 rows/sec), and the sixty-second finale are unchanged. Normal bias increased; the depth bias became more negative to move the receiver comparison away from acne.

## New config values

These add features/test controls; they do not change an existing tuning number. Exact arrays and units are listed here so every numeric addition is reviewable.

### C.cover

```json
{
  "pixelRatio": 1,
  "width": 1200,
  "height": 630,
  "seed": 9,
  "eyeFov": 60,
  "chaseBack": 8,
  "chaseUp": 4,
  "pitch": -0.12,
  "rovers": [
    [
      15.5,
      17.5
    ],
    [
      13.5,
      15.5
    ]
  ],
  "shaft": [
    14,
    14
  ],
  "shaftRow": 30
}
```

### C.resilience

```json
{
  "leaveGraceSeconds": 90,
  "actionLimit": 4,
  "actionWindowMs": 1000,
  "wireLimit": 65536,
  "messageLimit": 80,
  "queueLimit": 128,
  "reconnectMaxMs": 15000,
  "reconnectFactor": 2,
  "soloNudgeSeconds": 60
}
```

### C.pacing

```json
{
  "seed": 5,
  "navStep": 0.25,
  "minimumSeconds": 1200,
  "maximumSeconds": 2100,
  "spare": 1.2,
  "tapEveryMs": 150,
  "tradeEveryMs": 300,
  "largeDelivery": 1000
}
```

The isolated integration harness adds testing.leaveGraceSeconds = 1; production resilience.leaveGraceSeconds is 90. No game test uses the shortened value except the dedicated integration process.

New terrain settings: bumpGradient = 32; bumpOctaves = [{count:18, radius:110, amplitude:0.5}, {count:65, radius:43, amplitude:0.18}, {count:180, radius:15, amplitude:0.045}]; normalSecondScale = 0.617; normalRotation = 0.73 radians; albedoFrequency = 0.12; albedoVariation = 0.055. tracksEnabled is false. Blob radii are texture pixels, not game dimensions. All come from config.js.

No changes were made to render.yaml or the pinned Three.js files. The version is 0.7.0. This deterministic test is a balance regression, not a claim that every human crew or random seed takes exactly this long.
