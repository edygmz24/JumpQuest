# Menu revamp plan

Status: **waiting for the user's OK. Nothing is built yet.**

Goal: every menu looks and feels like one polished modern platformer. One
shared style built once, smooth motion, keyboard navigation everywhere, touch
still works. No menu changes what it does: same buttons, same results.

## What exists today (findings)

- Every screen builds its own look from raw `scene.add.text` /
  `scene.add.rectangle` calls with its own colours and sizes. Buttons are text
  with a flat background colour. `createMenuButton` (menu.js) is the only shared
  piece, and only some screens use it.
- Keyboard: only the world map (arrows / Space / Enter / Esc) and the bonus
  round result (Space / Enter) respond to keys. Everything else is mouse/touch
  only. Esc on a sub-screen (shop, achievements...) does nothing.
- Width: all menus except the world map sit on the 800px menu camera, so on
  the 1066px screen they show as a centred column with dimmed side strips.
- Icons are emoji and symbol characters (trophy, palette, lock, gear), which
  look different on every device.
- Text uses Phaser's default font (Courier).
- `showLevelSelect` in menu.js is dead code: worldmap.js replaces it.

## Decisions (please confirm or change)

1. **Menus move to the full widescreen width.** Everything built with the new
   kit is drawn on the main camera at 1066x600, like the world map and the
   gameplay HUD already are. Content stays in a centred column where that
   reads best, but backdrops, headers and footers use the whole width, so the
   boxed-in look goes away. Since every screen is being re-laid out with the
   kit anyway, this costs little extra. The 800px menu camera stays in
   view.js for the in-level mode HUDs that are not part of this work.
   - Known side effect: camera shake and fade affect main-camera objects. The
     FLAWLESS shake on the results screen would shake the panel too; the kit
     results screen will use its own pop animation instead of a camera shake.
2. **One font stack, no font files:** a bold rounded system sans
   (`"Trebuchet MS", "Segoe UI", system-ui, sans-serif`), with monospace kept
   only for timers. No download, so it cannot fail to load.
3. **Emoji icons are replaced by code-drawn icons** (star, coin, gem, lock,
   trophy, gear, brush, clock, infinity, sun, play, back arrow), so they look
   the same everywhere.
4. **"Controller-style" means keyboard:** arrows move focus, Space / Enter
   activate, Esc goes back. Real gamepad support is not in this work, but the
   focus system is built so it could be added later in one place.
5. **Screenshots are not committed.** The screenshot script is committed
   (`tools/shoot-menus.js`); the PNGs stay out of the repo and a few
   before/after pairs are shown to the user directly.

## Visual style: "storybook arcade"

Matches the HD code-drawn art: soft, chunky, readable.

- **Backdrop:** deep navy dim (not flat black) with a soft vignette. On the
  main menu and pause the level still shows through; full screens (shop,
  achievements...) use a nearly solid navy with a faint drifting pattern of
  dots/stars.
- **Panels:** rounded corners (14px), navy fill, a 3px darker outline, a thin
  lighter line along the top edge, and a soft drop shadow. Optional header
  strip in the panel's accent colour.
- **Buttons:** chunky rounded "keys" with a darker lip underneath. Hover or
  focus: lifts 2px, brightens, gets a gold outline that gently pulses. Press:
  sinks onto its lip. Release: small bounce, then the action runs.
  Disabled / locked: grey, lock icon, no lift.
- **Colour roles** (the same meaning on every screen):
  - green: go (Play, Next, Continue, Resume)
  - blue: navigate (Map, Level Select)
  - amber: special modes (Speedrun, Endless, Daily)
  - red: leave or lose (Quit, Game Over)
  - slate: neutral (Back, Close, Settings)
  - gold: titles, stars, coins, focus ring; pink: gems; cyan: times
- **Titles:** large gold text with a dark outline and drop shadow; screen
  titles sit on a ribbon-style header. Small caps labels in light blue-grey.
- **Motion:** backdrop fades in (150ms); panels slide up 24px and fade in
  (220ms, slight overshoot); buttons follow in a quick stagger. Leaving plays
  the reverse faster (120ms). Lists and tabs cross-fade instead of popping.
  A "reduced motion" path (also used by the screenshot script) skips tweens.
- **Sound:** existing `menuHover` on focus change, `menuClick` on activate.

## The shared kit: new file `ui.js`

Loaded after `audio.js`, before `menu.js`. Everything it creates is `wideUI`.

- `UI.theme`: colours, font stack, sizes, depths, timings. The only place
  these live.
- Builders: `UI.backdrop`, `UI.panel`, `UI.title`, `UI.label`, `UI.button`
  (role, size, icon, enabled), `UI.iconButton`, `UI.toggle`, `UI.slider`,
  `UI.tabs`, `UI.card` (list rows / grid tiles: selected, locked, owned),
  `UI.stat` (icon + value chip), `UI.icon(name)`, `UI.scrollList`,
  `UI.toast` (the in-level banners), `UI.hintBar` (key hints at the bottom).
- `UI.screen(scene, opts)`: owns one screen. Collects its objects, plays the
  enter / leave animation, destroys everything on close, and holds the
  **focus list**:
  - arrows move to the nearest focusable in that direction; Space / Enter
    activate; Esc runs the screen's `onBack`
  - hovering with the mouse moves the same focus, so there is one highlight
  - sliders use left / right while focused; tabs switch with left / right
  - touch: tap activates, no stuck hover state
  - screens stack: a popup (settings, controls) takes input until it closes,
    then focus returns to where it was
  - input is ignored during the enter animation so a held key cannot
    double-activate
- Compatibility: `createMenuButton` and `clearMenuObjects` keep working
  (re-pointed at the kit), so screens not yet converted still run while the
  work is in progress.
- `?uikit=1` opens a style sheet screen showing every component, used to
  review part 1 on its own.
- game.js hooks (done in part 1, small): the Esc / R / jump handlers ask the
  kit whether a screen is open instead of checking three separate flags, and
  a reset function is called from `create()` so no screen state leaks across
  restarts.

## Parts

Order: 0, then 1, then 2-5 (in parallel where files don't overlap), then 6.

| # | Part | Files | Runs |
|---|------|-------|------|
| 0 | Screenshot + smoke script, "before" shots of every menu | `tools/shoot-menus.js` (new) | first |
| 1 | Shared kit, style sheet screen, game.js hooks | `ui.js` (new), `index.html`, `menu.js` (`createMenuButton` / `clearMenuObjects` only), `game.js` (key handlers, `create()` reset) | after 0, alone |
| 2 | Main menu, world map | `menu.js`, `worldmap.js` | after 1 |
| 3a | Pause, settings, controls popup, game over | `game.js` | after 1 |
| 3b | Level results, credits | `game.js` | after 3a (same file) |
| 4a | Shop / cosmetics, achievements gallery + unlock toast | `cosmetics.js`, `achievements.js` | after 1, parallel with 2, 3, 4b, 5 |
| 4b | Modifiers, speedrun select, daily screen, endless results | `modifiers.js`, `speedrun.js`, `daily.js`, `endless.js` | after 1, parallel |
| 5 | Story cards, new-move cards, bonus round results, tutorial hint | `story.js`, `moves.js`, `goal.js`, `tutorial.js` | after 1, parallel |
| 6 | Consistency pass, "after" shots, side-by-sides, PR | whatever the review turns up | last |

Parts 2, 3a, 4a, 4b and 5 touch different files, so they can run at the same
time. 3b waits for 3a.

Notes per part:

- **0**: the script starts from a fresh save and from a "progressed" save
  (levels done, coins, a few unlocks), opens each screen through the game's
  own functions, and saves one PNG per screen at 1066x600. It also records
  every clickable control on each screen (the button inventory) and fails on
  any console error.
- **2**: world map keeps its own path walking (left / right / up / down) but
  registers through `UI.screen` so Esc / Space and the stack behave like
  everywhere else. Main menu keeps its three groups (play, modes, collection),
  the wallet, the daily login bonus pop and the streak badge.
- **3a**: pause keeps Resume, Restart, Level / Speedrun Select, Quit,
  Settings. Settings keeps both sliders (still draggable), Mute All,
  Colorblind, Controls, Back. Game over keeps Restart Level.
- **3b**: results keep every line and its timing order: stars, gems, secret
  exit, rank badges, best runs, coin bonuses, next-unlock teaser, score
  count-up, time, coins, combo, deaths, FLAWLESS, level unlocked, and the
  Next / Bonus Round / Restart / Select buttons, including the speedrun
  variants.
- **4a**: shop keeps tabs, buy / equip states, prices and wallet.
  Achievements keeps scrolling (buttons and mouse wheel) and gains up / down
  keys.
- **5**: the move card and tutorial hint stay non-blocking (the game keeps
  running); they only take the kit's toast look.

## How each part is checked

For every part:

1. `node --check` on each changed file.
2. `node tools/shoot-menus.js` (server running): no console errors, a shot of
   every screen.
3. Button inventory: each converted screen has the same controls as before,
   and the script activates each one and checks it does the same thing
   (state flags, screen opened, value changed).
4. Keyboard pass: the script reaches and activates every control on the
   screen using only arrows, Space / Enter and Esc.
5. Touch pass: the same screen driven by taps in a touch-emulated page.
6. The main session reads the diff and looks at the shots before committing.

At the end (part 6): `node tools/check-levels.js` and
`node tools/walk-levels.js` to confirm gameplay is untouched, then
before / after pairs for the user and one pull request.

## Working method

Per CLAUDE.md: the main session plans, writes the briefs and reviews; the
`implementer` subagent builds each part, including the kit, from a
self-contained brief. One commit per part after review. Two failed attempts
on a part and it moves to the main session's model or is done directly, and
the user is told.

## Tally (filled in as parts finish)

| # | Part | Attempts | Finished by |
|---|------|----------|-------------|
| 0 | Screenshot script + before shots | | |
| 1 | Shared kit | | |
| 2 | Main menu, world map | | |
| 3a | Pause, settings, controls, game over | | |
| 3b | Level results, credits | | |
| 4a | Shop, achievements | | |
| 4b | Modifiers, speedrun, daily, endless | | |
| 5 | Story, move cards, bonus results, tutorial hint | | |
| 6 | Consistency pass + PR | | |
