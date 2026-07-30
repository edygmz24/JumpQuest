# JumpQuest "Next Level" — Addictiveness + 2.5D Visual Overhaul

## Context

JumpQuest is a polished Phaser 3 precision platformer (10 levels, boss, endless/daily modes, achievements, ghost racing, all-procedural art, no build step — 20 global-scope scripts loaded by index.html). The owner wants it taken to the next level on two axes: **(A) more addicting gameplay** and **(B) a visual leap**, with 2.5D-in-Phaser chosen over a full 3D rewrite (which would forfeit the tuned physics at game.js:83-93, all 10 levels, the boss FSM, and 8 side systems for months of rework).

**Core diagnosis:** the moment-to-moment feel is already excellent, but the game has a dead-end economy (coins = score only), orphaned systems (hats fully implemented in cosmetics.js:200-278 but never rendered; leaderboards saved in menu.js:302 but never displayed), and no system rewarding *sustained* skilled play. The plan closes the skill→reward loop (currency, shop, flow meter, new movement verbs) and transforms the look via extruded terrain, shadows, deep parallax, character animation, and Phaser 3.60+ built-in FX.

**User priorities (confirmed):** meta-progression & economy, deeper movement mastery, content variety. Competitive/speedrun hooks = lower priority (stretch). Visuals: 2.5D in Phaser.

## Architecture ground rules

- **No build step.** New files (`economy.js`, `flow.js`, `visuals.js`) are plain global-scope scripts added to index.html:139-160 in dependency order, *before* game.js — the established pattern.
- **Split body/visual quirk:** every entity is an invisible Arcade physics body + a separate synced visual sprite (playerRect, enemyRects[], etc.). All new entities must follow this; add a `syncVisual(body, rect)` helper in visuals.js.
- **Global-state reset seam:** `create()` (game.js:469-538) manually resets ~70 globals on every restart. Each new file exposes one reset helper (`resetFlowState()`, `resetEconomyLevelState()`, `resetVisualState()`) called from the seam — unreset globals leak across restarts.
- **Canvas fallback:** `Phaser.AUTO` (game.js:2) may pick Canvas; guard every `postFX`/`preFX` call (`obj.postFX && ...`). Baked shading/shadows/parallax degrade gracefully.

---

## Phase 1 — Free wins & foundations (effort S, ~1-2 days)

Ships: visible hats, coin wallet, quick-restart, bug fixes. Surfaces already-built systems.

| Change | Where |
|---|---|
| **Render equipped hats in gameplay** — call `drawPlayerHat(this, playerRect)` after player creation in `loadLevel` (~game.js:760) into new global `playerHatObjects`; call `updateHatPosition(...)` in `update` right after `playerRect.setPosition` (game.js:1224); follow flip/squash via playerRect scale; hat on ghost at alpha 0.25 (game.js:764-767). Reset global in create() seam. | game.js (cosmetics.js code already exists) |
| **Wallet foundation** — new `economy.js`: `walletCoins`, `loadWallet/saveWallet/addCoins/spendCoins`, localStorage key `jqWallet`. Credit +1/coin in `collectCoin` (game.js:1812); bank on `reachEnd` (game.js:2064); wallet counter in HUD (~game.js:1067). Add script tag to index.html. | new economy.js, game.js, index.html |
| **Quick-restart `R` key** → `restartWithTransition(this)` (game.js:3308), registered next to ESC (game.js:1160); skip when menus open. Instant "one more run." | game.js |
| **Vertical platform carry fix** — mirror the `moveX` rider logic (game.js:1774-1783) for `moveY` platforms so the player rides them down without floating. | game.js |
| **Wall-slide sound** — call `playSound('wallSlide')` (exists at audio.js:287, never called), throttled ~200ms, in the wall-slide block (game.js:1322-1330). | game.js |
| **Leaderboard/rank callout** — show "#N all-time!" in `reachEnd` using the already-returned ranks from `saveLeaderboardEntry` (game.js:2118-2121, currently discarded); small "Best Runs" panel on completion screen via `getLeaderboard` (menu.js:327). | game.js, menu.js |
| **MP3 loading toast** — "♪ loading…" indicator for the 3.7MB Top_Floor_Dash.mp3; lazy-fetch after first input. | audio.js, index.html |

## Phase 2 — Mastery verbs + Flow meter (effort M, ~3-4 days)

Ships: wavedash, ground pound, springs, flow (style) system. Raises the skill ceiling without changing baseline feel — new behavior only activates on new input combinations.

- **New constants** near game.js:81-93: `DASH_JUMP_WINDOW=120`, `DASH_JUMP_CARRY=0.9`, `POUND_SPEED=700`, `POUND_PAUSE=80`, `SPRING_VELOCITY=-650`. New state globals reset via `resetFlowState()` in the create() seam.
- **Wavedash (dash-jump momentum chaining):** in the jump block (game.js:1357-1390), if dashing or within 120ms of dash end, carry `vx = DASH_SPEED * 0.9` (360) past the 220 cap; in the movement block (game.js:1334-1354) replace the hard clamp with soft decay via `AIR_DECEL` back toward MAX_SPEED. Record `dashEndTime` where dash ends (game.js:1278-1280).
- **Ground pound:** airborne + Down+Jump → 80ms hang, plunge at 700px/s, spin visual. On landing (game.js:1436): AoE stomp (radius 60) reusing `stompEnemy` (game.js:1900), break crates via `breakBlock` (game.js:2672), shockwave particles + `shakeCamera`; bounce -400 if jump held. Treat pound as stomp in `handleEnemyCollision` (game.js:1865) regardless of overlap direction.
- **Springs:** new level-data array `springs:[{x,y}]`; parse in `loadLevel` (~game.js:735); `tex_spring` compressed/extended frames in `generateGameTextures` (game.js:261); launch -650, pound-onto-spring -850. Add to level-editor.html palette.
- **Flow meter** — new `flow.js`: 0-100 meter fed by sustained speed ≥80% max, stomps, near-misses (hook the existing "CLOSE!" detector at game.js:1594-1601 — currently awards nothing), dash-through-fake-wall, coin chains. Drains when slow/idle; empties on damage. Tiers Warm/Hot/**ON FIRE** at 40/75 → coin payout ×1/×1.5/×2, escalating trail + player glow (`postFX?.addGlow`, guarded). HUD bar under the dash bar (~game.js:1114). Layers on top of the existing combo system (game.js:184-192), doesn't replace it.
- **Skip audit:** playtest that wavedash can't skip stars/checkpoints in levels 2-3; raise walls if needed.

## Phase 3 — Economy + Shop (effort M, ~2-3 days)

Ships: spendable coins, purchasable cosmetics — completes the earn→spend→show-off loop.

- **Shop screen** modeled on `_renderCosmeticScreen` (cosmetics.js:304) with price tags + BUY buttons deducting via `spendCoins`; main-menu button (menu.js:158-186 extras row); "next unlock: 320/500 coins" teaser on completion screen (`reachEnd`).
- **New unlock type** `{type:'coins', price:N}` in `isCosmeticUnlocked` (cosmetics.js:74) + `_getUnlockText` (cosmetics.js:464); purchases stored in `cosmeticData.owned`.
- **New purchasables:** ~4 hats, 3 trails, 3 colors — procedural draws in `drawPlayerHat` style (all visible in-game thanks to Phase 1).
- **Earning balance:** coin=1 base; flow tiers ×1.5/×2; hardcore modifier ×1.5 (modifiers.js); first-clear-of-day ×2 + streak login bonus (+10·N, cap 50) surfaced near the streak badge (menu.js:150-156, daily.js). First hat ~150 coins (~2 sessions), top item ~2000.
- **Decide + test:** coins from a run that ends in game-over still bank (recommended: yes — losing progress AND currency feels punitive).

## Phase 4 — 2.5D visual overhaul (effort L, ~5-8 days)

The transformation. All additive around the body/visual split — physics untouched.

- **4a. Extruded terrain:** rewrite `drawTerrainBlock` (game.js:418-444) — bright top face (parallelogram skewed ~6px for depth), front face with vertical gradient + noise, right side face shaded -35%, rim highlight, overhanging grass fringe. Render once into a cached `generateTexture` key (`terrain_${w}x${h}_${color}`) and place a single image — *fewer* display objects than today's 3-4 rects/block. Fake walls (game.js:897) match automatically.
- **4b. Blob shadows:** pooled soft-ellipse shadows (≤24, alpha ~0.3) under player/enemies/crates/moving platforms, positioned on the surface below via a capped scan of `currentLevel.platforms`; shrink with height. Sells "3D" more than anything else and doubles as a landing-precision aid. Lives in new `visuals.js`.
- **4c. 7-layer parallax** (replaces 2-layer hills at game.js:687-697): sky gradient (0) → celestial (0.03) → far theme silhouette: mountains/castle/crystal spires (0.08) → mid hills + fog band (0.2) → near props: trees/rocks/columns, depth-scaled (0.5) → gameplay (1.0) → **foreground occluders**: grass strips/vines at frame edges (1.15) — the layer that creates the "camera inside the world" feel. Slight vertical scrollFactors for depth on jumps.
- **4d. Character animation:** extend `generateGameTextures` (game.js:261) to bake player frames — idle, run_0..3, jump, fall, pound, wallslide + eye-blink frame; swap texture by state in the facing/wobble block (game.js:1405-1417); existing squash/stretch tweens are scale-based, so they're untouched. Enemies get 2-frame walk/flap cycles.
- **4e. Post-processing** (WebGL only, all guarded): `camera.postFX.addVignette(0.5,0.5,0.85,0.35)` in loadLevel; per-object `addGlow` on coins/gems, player ON-FIRE, boss core; 80ms barrel pulse on dash. No full-screen bloom (mobile cost).
- **4f. Themes + weather:** extend each level's `theme` (levels/levelN.js) with `{biome, weather, propStyle}`; one pooled weather emitter (≤40 particles, camera-wrap like `ambientParticles` at game.js:1498-1507): leaves/rain/snow/embers.
- **Perf budget:** ≤700 display objects on level 10 (measure `scene.children.length`), particle cap stays 200, `lowFxMode` flag (auto when touch device or sustained FPS<45) disables postFX/weather, halves props.

## Phase 5 — Content variety (effort L, ~4-6 days)

- **Hazard pack**, data-driven from level files, each with loadLevel parse + update handler + texture + create()-seam reset + editor palette entry: keys + timed gates (6s countdown ring), wind zones (`{x,y,w,h,fx}` force + streak particles), crumbling platforms (shake 400ms → fall → respawn 3s).
- **Two new enemies:** `diver` (telegraphed swoop) and `charger` (winds up, rushes on shared Y-band) — `ENEMY_TYPES` (game.js:119), textures, behavior switch (game.js:1514), colorblind glyphs (game.js:797-832).
- **Mid-boss at level 5:** generalize `triggerBoss`/`updateBoss` (game.js:2710, 2878) to read `boss:{hp, phases, attacks}` from level data instead of hardcoding `currentLevelIndex === 9` (game.js:1788); level 5 gets a 3-HP single-phase "Crystal Guardian" — doubles the difficulty-curve peak and reuses the whole boss FSM.
- **Level retrofit:** levels 2-9 each get one signature mechanic + springs + a wavedash-rewarding shortcut line. All levels must stay completable *without* the new verbs.

## Phase 6 — Polish & stretch (implemented)

- Endless mode banks run coins and injects `diver` / `charger` enemies as difficulty ramps (`endless.js`).
- New achievements cover first and cumulative wavedashes / ground pounds plus both flow tiers (`achievements.js`).
- Mobile/perf tooling includes tuned adaptive `lowFxMode`, `?lowfx=1|0` overrides, a `?fps=1` renderer/FPS/object overlay, particle reduction, and a forced-Canvas `?renderer=canvas` smoke-test path.
- Dedicated speedrun mode provides per-level PBs, a hundredths timer, 0.45-alpha ghost, checkpoint splits against PB, one-hit auto quick-restart, and its own level picker (`speedrun.js`).
- Final performance measurements still require representative physical devices; the diagnostics above make that pass repeatable without changing the build.

---

## Risks

1. **Body/visual desync** for new entities → use `syncVisual()` helper consistently; never texture the physics sprites.
2. **Global reset seam leaks** → one reset helper per new file, called from create() seam (game.js:469-538).
3. **Mobile perf** in Phase 4 → cached-texture terrain actually reduces objects; `lowFxMode` + budget + real-device test before shipping.
4. **Wavedash level skips** → soft-cap decay + per-level playtest; skips that don't bypass stars/checkpoints are speedrun features.
5. **localStorage growth** → keep new keys under `jq` prefix; ghosts already capped (game.js:2096).

## Verification (per phase)

Run: `npm start` → http://localhost:8000 (http-server, package.json).

- **P1:** equip crown → visible in-game, follows jumps/flips; wallet HUD counts and persists across reload; `R` restarts with fully-reset state (score 0, timer 0, combo 0 — exercises the seam); ride a vertical moving platform without sinking/floating; wall-slide is audible; completion shows rank callout.
- **P2:** dash→jump visibly outruns a normal jump and decays back; pound breaks crates + AoE-stomps groups; pound-spring reaches a marked high platform; flow bar fills sprinting / empties on hit; death/restart resets all new state.
- **P3:** buy→equip→see hat in-game loop works; wallet math correct across deaths/game-over; levels 1-3 full-clear affords first hat.
- **P4:** A/B screenshots per level; ≥55fps desktop and ≥45fps throttled-mobile via `?fps=1`; temporary `config.type = Phaser.CANVAS` run → no crashes (guards complete); `scene.children.length` ≤700 on level 10.
- **P5:** retrofit levels completable without new verbs; mid-boss re-triggers correctly after death; 3-star times still achievable.
- **P6:** regression sweep — 25 achievements, daily, endless, hardcore, tutorial, editor test-mode (`?testLevel=true`).

## Critical files

- `game.js` — every phase: constants (83-93), `generateGameTextures` (261), `drawTerrainBlock` (418), create() seam (469-538), `loadLevel` (610), `update` (1165), `collectCoin` (1812), `reachEnd` (2064), boss FSM (2710-3141)
- `cosmetics.js` — unlock types (74), `drawPlayerHat`/`updateHatPosition` (200-278), shop UI base (304)
- `menu.js` — main menu (60), leaderboard data layer (300-330)
- `index.html` — script order (139-160) for new economy.js / flow.js / visuals.js
- `levels/level1.js`, `levels/level5.js`, `levels/level10.js` — schema template for springs/hazards/boss-config/theme extensions
- New files: `economy.js`, `flow.js`, `visuals.js`

Work happens on branch `claude/new-enhancement-kq6m6g` (already created and pushed).
