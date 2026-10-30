# Build 3 light-gated pacing (1.1.0)

The real rules run at 10 Hz with seeds 5 and 42, one or two bots, Full and Quick. No injected money, positions or finds. Bots now leave a shaft when its light limit is reached, choose another diggable shallow cell and buy the next light at the hub with 20 percent spare, alongside tools, suits and pods. They do not bypass darkness or require optional belts/excavators. All eight routes pass their original windows and exact sixty-second finale check. Full drill placement remains before 60 percent of completion.

## Full: 20 to 35 minutes

| Event | Two seed 5 | Two seed 42 | Solo seed 5 | Solo seed 42 |
| --- | --- | --- | --- | --- |
| first upgrade | 0:17.9 | 0:17.9 | 0:17.9 | 0:17.9 |
| first find | 1:27.6 | 0:53.2 | 3:21.3 | 1:21.3 |
| first delivery over $1K | 4:42.3 | 3:57.8 | 5:40.7 | 4:25.9 |
| first mech | 15:13.8 | 14:33.7 | 16:00.2 | 15:01.8 |
| both mechs | 16:30.8 | 16:09.1 | 16:00.2 | 15:01.8 |
| coolant | 16:32.4 | 16:18.2 | 16:40.2 | 15:42.0 |
| drill | 17:41.9 | 17:27.6 | 17:49.4 | 16:51.4 |
| first boarding | 17:42.5 | 17:27.7 | 17:49.5 | 16:51.5 |
| World Breaker | 29:13.3 | 29:14.4 | 29:33.6 | 28:37.4 |
| core | 30:13.3 | 30:14.4 | 30:33.6 | 29:37.4 |

## Quick: 8 to 12 minutes, 20x values

| Event | Two seed 5 | Two seed 42 | Solo seed 5 | Solo seed 42 |
| --- | --- | --- | --- | --- |
| first upgrade | 0:09.5 | 0:09.5 | 0:09.5 | 0:09.5 |
| first find | 3:09.7 | none before core | none before core | none before core |
| first delivery over $1K | 0:37.4 | 0:37.4 | 0:37.4 | 0:37.4 |
| first mech | 6:54.6 | 6:54.6 | 6:54.6 | 6:54.6 |
| both mechs | 6:54.6 | 6:54.6 | 6:54.6 | 6:54.6 |
| coolant | 6:55.8 | 6:55.8 | 6:55.5 | 6:55.5 |
| drill | 6:56.2 | 6:56.2 | 6:55.8 | 6:55.8 |
| first boarding | 6:56.3 | 6:56.3 | 6:55.9 | 6:55.9 |
| World Breaker | 8:05.9 | 8:05.9 | 8:05.4 | 8:05.4 |
| core | 9:05.9 | 9:05.9 | 9:05.4 | 9:05.4 |

## Every balance change from Build 2

| Setting | Build 2 | Build 3 |
| --- | ---: | ---: |
| Headlamp cost | $2,000 | $150 |
| Floodlamp cost | $100,000 | $350 |
| Shaft lights cost | $5,000,000 | $100,000 |
| Daylight digging reach | no gate | 10 rows |
| Headlamp digging reach | no gate | 35 rows |
| Floodlamp digging reach | no gate | 90 rows |
| Installed Shaft lights | visual lamps | all rows, shared |

All tool costs/damage, holds/pods, payout curve, rich/dry factors, oil values, team prices (including $5.5B World Breaker), drill seconds per block, belay timing and Quick 20x remain unchanged from Build 2. New presentation config: pipe height 0.17, radius 0.035, four flow beads per route at 1.5 units/sec, bead radius 0.055, hoisted ore size 0.08. Protocol 9 adds permanent shaft-light state, per-seat sign filtering and via-belt break feedback. These visual settings do not affect money or timing.


## Build 4 (1.1.1)
Presentation-only changes. All eight runs were rerun and produce these same timelines; no gameplay or balance number changed.

Depleting wells: a struck pocket holds 90 barrels (18,000 in hardcore) and its pump runs dry after 90 seconds; bots on a starved rig get off and dig the rest of a known field (a mech from the shaft beside a field cell ringed by shafts). All eight runs stay inside their windows: core at 966, 1166, 1017 and 948 s Full, 280, 234, 426 and 311 s Quick. Only solo seed 5 runs its well dry mid-bore, eight rows above the magma: the bot strikes five more cells of the field and is aboard again twelve seconds later, and reaches the core seven seconds sooner than with one endless pump. The four full hardcore runs stall in the early game, before any drill, on ec6712d as well; started from a drill placed at the lower mantle, hardcore crews with depleting wells reach the core, forced mid-bore refuels included.
