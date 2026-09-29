# Level layout fixes (platform spacing pass)

Goal: remove platform clutter (ledges almost touching at the same height,
ledges hanging too low over others, moving platforms driving through fixed
ones) without changing each level's difficulty or route.

Rules the fixes follow, and that `tools/check-levels.js` now enforces:

- Two ledges at nearly the same height (tops within 24px) are at least 70px
  apart. Closer than that, they are merged into one ledge.
- A ledge over another leaves at least 64px of room (two player heights).
- A moving platform never drives into a fixed ledge at its own height; its
  path ends 10px or more short of it.
- Anything that sat on a changed ledge (coins, enemies, power-ups,
  checkpoints, breakable blocks) moves with it. Spikes stay under the gaps.
- No coins were removed, so coin totals and the coin star are unchanged.

Positions are the platform centers from the level files, as (x, y).

## Level 1 - Green Meadows
No changes. The only close pair is a moving platform handing off to a ledge.

## Level 2 - Coin Canyon
| Change | Why |
|---|---|
| Ledges (1350, 480) and (1550, 480) merged into one, 1260-1650 | 10px apart; read as one broken ledge |
| Ledges (1850, 470) and (2050, 490) merged at y 470, 1750-2120; speed power-up up 20px to (2080, 440) | 30px apart, 20px step |
| Lift at (2400, 450): now starts at y 390 with moveY 60; its coin stays at (2450, 420) | moveY was -60, which the game treats as "don't move", so the lift never moved. It now rises and falls over the same 60px |
| Moving platform at (2230, 470): moveX 120 to 60 | It drove into the lift beside it |
| Ledges (2500, 480) and (2750, 490) merged at y 490, 2430-2900; breakable block down 10px | 30px apart, 10px step |
| Kept on purpose: the merged ledge over the fake wall at (1300, 560) | Secret coin alcove; listed as allowed in the checker |

## Level 3 - Crystal Caves
| Change | Why |
|---|---|
| Ledge (380, 460) raised to y 440 (walker and coin move with it) | 50px from the next ledge at nearly the same height; now clearly a step |
| Ledges (620, 250) and (750, 250) merged, 580-810 | 30px apart |
| Moving platform (1000, 330) removed; its two coins stay over the ledge beside it | It slid back and forth on top of that ledge. The jump it served is 60px and easy without it |
| Crumbling ledge (1150, 430) lowered to y 470 | Hung 60px under the ledge above; now 100px of room |
| Crumbling ledge (2750, 420) moved to (2830, 360), with its breakable block | Overlapped the shield ledge at nearly the same height |
| Ledges (2900, 480) and (3050, 500) merged at y 490 and trimmed to 2850-3070 | 20px apart, and the right end ran under the ledge above |
| Moving platform (3150, 200) removed | It slid through the flag ledge. Both jumps it served are easy without it |

## Level 4 - Sunset Fortress
| Change | Why |
|---|---|
| Moving platform (550, 440) moved to x 580 | Ran 40px under the ledge above |
| Floor ledges (1050, 480) and (1300, 480) merged, 950-1400 | 50px apart |
| Four shelves at y 470 (x 1650, 1850, 2050, 2250) narrowed 160 to 110 | 40px apart. Gaps are now 90px with the spikes still under them |
| Lift (2600, 500) removed | It sank into the ground and overlapped the ledges beside it. The tower is climbable without it |
| Hidden step (2500, 160) raised to y 130, with its secret coin | Sat 40px over the ledge below |
| Floor shelves (3300, 480), (3600, 480), (3850, 480) shortened to 210/210/120 wide and re-centered at 3280/3600/3865; spike moved to x 3755 | 50px apart. Gaps are now about 100px; the flag stays on the last shelf |

## Level 5 - The Final Trial
| Change | Why |
|---|---|
| Small step (880, 460) removed | Sat 20px over the next ledge; the drop it served is easy without it |
| Ledge (1150, 220) moved right to x 1190, with its breakable block | Hung 50px over the ledge below |
| Ledge (1480, 220) moved to (1450, 240) | Sat 40px under the checkpoint ledge |
| Top path: 7 tiny ledges become 5 (at x 1888, 2056, 2219, 2382, 2550), about 100px apart. The two coins from removed ledges now hang over gaps | Were 50-65px apart. Still the hard path: tiny ledges and longer jumps, fewer of them |
| Middle path: 5 ledges become 4 (at x 1850, 2050, 2250, 2450), 100px wide and 100px apart. The coin from the removed ledge hangs over a gap | Were 55-60px apart |
| Bottom path: 4 shelves narrowed 160 to 140 and re-centered at 1840/2057/2273/2490. Gaps are about 77px; spike moved to x 2165 | Were 50px apart. Still the easy path |
| Moving platform (2800, 400): x 2830, width 80, moveX 60 | Ran under the checkpoint ledge and into the next ledge; now shuttles between them |
| Moving platform (3100, 380): (3115, 410), width 90, moveX 70 | Drove into ledges on both sides and passed 40px under the power-up ledge. Now shuttles between them with 70px of room |
| Ledge (4350, 480) moved right to x 4390, with its enemies | Sat 60px under the shield ledge |

## Level 6 - Bouncy Clouds
| Change | Why |
|---|---|
| Lift (500, 320): moveY 80 to 60 | Came down to 60px over the ledge below |

## Level 7 - The Machine
| Change | Why |
|---|---|
| Moving platform (780, 420): moveX 100 to 70 | Drove 20px into the next ledge |
| Crumbling ledge (1500, 420) lowered to y 470 | Hung 20px under the ledge above, with no room to stand. Now a low side step with 70px of room |
| Moving platform (2620, 380) removed | Moved diagonally through both ledges beside it. The crumbling step still carries the route |
| Ledge (2720, 430) moved right to x 2740 | Keeps a real jump after the crumbling step |
| Moving platform (3380, 400) removed | Swept 20px over the ledge below, through anyone standing on it. The ledge route was already the main one |

## Level 8 - Emerald Jungle
| Change | Why |
|---|---|
| Ledge (460, 500) moved left to x 430; spike moved to x 515 | 40px from the next ledge |
| Ledges (980, 500) and (1120, 500) merged, 920-1200 | Touching at the same height |

## Level 9 - Speed Run Alley
| Change | Why |
|---|---|
| Start run (80, 500) shortened to 220 wide at x 65 | 55px from the next run; gap now 85px |
| Run (1670, 480) shortened to 190 wide at x 1655 | Gap now 80px |
| Runs (3170, 460) and (3440, 480) trimmed to 180 and 260 wide (x 3160, 3460) | 20px apart; gap now 80px |

## Level 10 - The Gauntlet Supreme
| Change | Why |
|---|---|
| Spike row: ledges at x 290-910 narrowed 10-20px each and re-centered (280, 440, 600, 760, 890) | 45-65px apart; gaps now about 75px, spikes still under the gaps |
| Ledge (1080, 500) lowered to y 510, with its jumper and power-up | Sat 60px under the first shaft ledge |
| Ledge (1750, 500) narrowed to 90 wide at x 1745 | 55px from the checkpoint ledge, and makes room for the mover |
| Moving platform (1900, 460): x 1840, moveX 60 | Drove 90px into the shooter ledge |
| Moving platform (2130, 400): x 2100, moveX 50 | Drove 50px into the next shooter ledge |
| Ledge (2850, 500) narrowed to 130 wide at x 2860 | 60px from the checkpoint ledge |
| Ledge (3560, 500) narrowed to 110 wide at x 3550 | 60px from the checkpoint ledge |
| Moving platform (4580, 430) removed | Jammed into a 75px gap, overlapping both ledges |
| Boss arena: shuttle (5550, 380) lowered to y 405 | Passed 40px under the left high ledge. Now clears both high ledges by 65px and still reaches them (90px jump) |
| Boss arena: lift (5680, 350) removed | Sat 10px under the right high ledge and dipped into the ledge below. The shuttle now serves both high ledges |

## Saved records
The layout changed, so old times on levels 2-10 no longer compare fairly.
`records.js` runs once per browser (key `jqLayoutVersion` = 2) and, for
levels 2-10 only, clears:

- best times
- ghost replays
- speedrun PBs
- best death counts
- leaderboard times

It keeps high scores, leaderboard scores, stars, completions, unlocks and
coins. Level 1 records are untouched.

## Checking
- `node tools/check-levels.js`: 0 crowded and 0 stacked on every level (plus the
  one allowed alcove). It exits non-zero if a rule is broken.
- Reachability, compared by position, is identical before and after. The few
  "unreachable" entries on levels 3, 4, 5 and 9 were there before; they come
  from limits of the simple jump model (no wall jumps or double jumps).
- All 10 levels load, play and finish in the headless smoke test. The moving
  platforms were sampled at runtime and travel exactly the planned ranges.
