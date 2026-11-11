#!/usr/bin/env node
// Opens every menu and popup in the game, saves a screenshot of each and
// records the clickable controls on each screen. Run it before and after a
// menu change and compare the two folders.
//
//   npm start                                          (serves the game on :8000)
//   node tools/shoot-menus.js <outDir>                  every screen, both profiles
//   node tools/shoot-menus.js <outDir> --only pause,results
//   node tools/shoot-menus.js <outDir> --url http://localhost:8000
//
// Output, per save profile ("fresh" = empty save, "progressed" = half the
// campaign done):
//   <outDir>/<profile>/<screen>.png     the canvas, 1066x600
//   <outDir>/<profile>/inventory.json   screen -> sorted list of control labels
//                                       (merged into an existing file, so
//                                       --only runs update just their screens)
//
// Screens are reached through the game's own functions and globals, never
// by clicking at pixel positions, so the script keeps working when menus are
// redesigned. Every screen starts from a freshly loaded page with the
// profile's save, so one screen cannot leak state into the next.
//
// Exits 1 if a screen failed to open or the page logged an error.
// Needs Playwright (not a dependency of the game).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ---------- command line ----------

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args.splice(i, 2)[1]; };
const BASE = (flag('--url') || 'http://localhost:8000').replace(/\/$/, '');
const ONLY = (flag('--only') || '').split(',').filter(Boolean);
const OUT = args[0];
if (!OUT) {
  console.log('usage: node tools/shoot-menus.js <outDir> [--only name1,name2] [--url http://localhost:8000]');
  process.exit(2);
}

// ---------- save profiles ----------

// Runs in the page before any game script, on every load
function seedProfile(profile) {
  localStorage.clear();
  window.__jqScene = () => game.scene.scenes[0];
  if (profile !== 'progressed') return;

  const day = (offset) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const set = (k, v) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  const DONE = 12;                       // levels 1-1 to 3-4 beaten, of 24
  const completed = {}, stars = {}, times = {}, scores = {}, deaths = {}, all = {};
  for (let i = 0; i < 24; i++) all['level' + i] = true;
  for (let i = 0; i < DONE; i++) {
    const k = 'level' + i;
    completed[k] = true;
    stars[k] = { completion: true, coins: i % 2 === 0, time: i % 3 === 0 };
    times[k] = 38000 + i * 2650;
    scores[k] = 4200 + i * 730;
    deaths[k] = i % 4;
  }
  set('jqCampaign', '2');                // skip the ten-level save migration
  set('jqLayoutVersion', '2');           // skip the record reset migration
  set('jqCompleted', completed);
  set('jqStars', stars);
  set('jqBestTimes', times);
  set('jqHighScores', scores);
  set('jqBestDeaths', deaths);
  set('jqGems', { level0: [true, true, true], level1: [true, false, true], level4: [false, true, false] });
  set('jqSecrets', { level1: true });    // the 1-2 -> 1-4 shortcut
  set('jqBonus', { level1: true, level5: true, level9: true });
  set('jqWallet', '1840');
  set('jqLastLoginBonus', day(0));       // today's login bonus already claimed
  set('jqCosmetics', {
    equipped: { color: 'orange', trail: 'bubble', hat: 'cap' },
    owned: ['colors:orange', 'trails:bubble', 'hats:cap']
  });
  // Everything the stats below already earn, so finishing a level in the
  // script does not pop an unlock toast over the results
  set('jqAchievements', ['first_steps', 'halfway_there', 'champion', 'star_collector', 'combo_starter',
    'coin_collector', 'speed_demon', 'ground_control', 'wave_rider', 'flawless', 'untouchable',
    'in_the_zone', 'ascetic']);
  set('jqStats', {
    totalCoins: 412, totalStomps: 37, totalDashes: 31, totalWallJumps: 18, totalDeaths: 23,
    totalPlayTime: 1260, maxCombo: 7, totalWavedashes: 3, totalGroundPounds: 9, highestFlowTier: 1,
    levelsCompleted: Object.keys(completed).map(k => +k.slice(5)), wallJumpsThisLevel: 0, deathsThisLevel: 0
  });
  set('jqDailyStreak', '5');
  set('jqDailyLastDate', day(-1));
  set('jqDailyCompleted', { [day(-1)]: true, [day(-2)]: true });
  set('jqSpeedrunRecords', {
    level0: { time: 31250, splits: [], date: 1 },
    level4: { time: 54400, splits: [], date: 1 }
  });
  set('jqEndlessBest', '412');
  set('jqLeaderboard', { level12: { scores: [{ score: 9100, date: 1 }], times: [{ time: 61000, date: 1 }] } });
  // Seen every story card, move card and hint, so none pops up uninvited
  set('jqStoryShown', all);
  set('jqMovesSeen', { dash: true, pound: true, flow: true });
  const hints = [[0, 200], [0, 800], [0, 1600], [1, 300], [1, 1500], [2, 500], [4, 1500], [8, 500],
    [8, 1800], [12, 600], [16, 400], [21, 300]];
  set('jqTutorialShown', Object.fromEntries(hints.map(h => [h[0] + '_' + h[1], true])));
}

// ---------- control inventory ----------

// Runs in the page. Lists the interactive objects currently on screen and
// labels each one. Generic on purpose: it walks the whole display list,
// containers included, so it works however a menu is built.
function collectControls() {
  const scene = game.scene.scenes[0];
  const LABEL_DEPTH_WINDOW = 10;
  const W = typeof UI_W !== 'undefined' ? UI_W : 800, H = typeof VIEW_H !== 'undefined' ? VIEW_H : 600;
  const all = [];
  const walk = list => list.forEach(o => { all.push(o); if (o.type === 'Container' && o.list) walk(o.list); });
  walk(scene.children.list);

  const root = o => { while (o.parentContainer) o = o.parentContainer; return o; };
  const shown = o => {
    for (let p = o; p; p = p.parentContainer) if (!p.active || !p.visible || p.alpha <= 0) return false;
    return true;
  };
  // Bounds in screen pixels, allowing for the 800px menu camera (view.js)
  const box = o => {
    if (typeof o.getBounds !== 'function') return null;
    let b;
    try { b = o.getBounds(); } catch (e) { return null; }
    const r = root(o);
    const cam = (r._viewUi && typeof uiCamera !== 'undefined' && uiCamera) ? uiCamera : scene.cameras.main;
    const sx = r.scrollFactorX === undefined ? 1 : r.scrollFactorX, sy = r.scrollFactorY === undefined ? 1 : r.scrollFactorY;
    return { x: b.x - cam.scrollX * sx + cam.x, y: b.y - cam.scrollY * sy + cam.y, w: b.width, h: b.height };
  };
  const clean = t => String(t).replace(/\s+/g, ' ').trim();
  const isText = o => o.type === 'Text' || o.type === 'BitmapText';
  const firstText = c => {
    for (const ch of c.list || []) {
      if (isText(ch) && clean(ch.text)) return clean(ch.text);
      if (ch.type === 'Container') { const t = firstText(ch); if (t) return t; }
    }
    return null;
  };
  // An object only counts as a control if something listens to it. Objects
  // made interactive just to swallow clicks (backdrops, panels) have no
  // listeners. If the scene routes clicks through scene-level gameobject
  // events instead, every interactive object counts.
  const pointerEvent = n => /^(pointer|drag|gameobject)/.test(String(n));
  const sceneRouted = scene.input.eventNames().some(n => /^gameobject/.test(String(n)));
  const texts = all.filter(o => isText(o) && shown(o) && clean(o.text)).map(o => ({ o: o, b: box(o) })).filter(t => t.b);

  const out = [];
  all.forEach(o => {
    if (!o.input || !o.input.enabled || !shown(o)) return;
    if (!sceneRouted && !o.eventNames().some(pointerEvent)) return;
    const b = box(o);
    if (b && b.w >= W * 0.9 && b.h >= H * 0.9) return;            // full-screen click blocker
    let label = o.uiLabel ? clean(o.uiLabel) : null;       // menu kit controls name themselves
    if (!label && isText(o)) label = clean(o.text) || null;
    else if (!label && o.type === 'Container') label = firstText(o);
    if (!label && b) {
      // A text overlapping this object and drawn just above it (a button's
      // own caption, not a popup or menu layer that happens to cover it),
      // the closest one in depth and then to its centre
      const depth = root(o).depth, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      let best = null, bestScore = Infinity;
      texts.forEach(t => {
        if (t.o === o) return;
        const tb = t.b, dd = root(t.o).depth - depth;
        if (dd < 0 || dd > LABEL_DEPTH_WINDOW) return;
        if (tb.x > b.x + b.w || tb.x + tb.w < b.x || tb.y > b.y + b.h || tb.y + tb.h < b.y) return;
        const score = dd * 10000 + Math.hypot(tb.x + tb.w / 2 - cx, tb.y + tb.h / 2 - cy);
        if (score < bestScore) { bestScore = score; best = t; }
      });
      if (best) label = clean(best.o.text);
    }
    if (!label) {
      const x = b ? b.x + b.w / 2 : o.x, y = b ? b.y + b.h / 2 : o.y;
      label = `${o.type}@${Math.round(x)},${Math.round(y)}`;
    }
    out.push(label);
  });
  return out.sort();
}

// ---------- helpers ----------

const scene = '__jqScene()';
const run = (page, src) => page.evaluate(src);
const waitFor = (page, src, timeout = 20000) => page.waitForFunction(src, null, { timeout: timeout });

// Fresh page with the profile's save; waits for the main menu (or, with a
// query such as ?uikit=1, whatever screen create() shows instead)
async function boot(page, query = '') {
  await page.goto(BASE + '/index.html' + query);
  await waitFor(page, `typeof game !== 'undefined' && game.scene.scenes[0] && game.scene.scenes[0].sys.isActive()
    && typeof menuObjects !== 'undefined' && menuObjects.length > 0`, 30000);
  await page.waitForTimeout(600);
}

// Leaves the menu and starts level `index` the way the game does, after
// running `prep` (page code that sets modes or clears "seen" flags).
async function startLevel(page, index, prep = '') {
  await run(page, `(() => {
    if (typeof player !== 'undefined' && player) player.__old = true;
    ${prep};
    clearMenuObjects();
    showingMenu = false; showingLevelSelect = false;
    currentLevelIndex = ${index};
    ${scene}.scene.restart();
  })()`);
  await waitFor(page, `typeof player !== 'undefined' && player && !player.__old && player.body &&
    ${scene}.sys.isActive()`);
  await page.waitForTimeout(500);   // the camera fades in
}

// Finishes the current level the way touching the goal does (the goal pole
// slide plays first, then the results)
async function finishLevel(page, timeMs) {
  await run(page, `levelTimer = ${timeMs}; score = Math.max(score, 3150); reachEnd.call(${scene})`);
  await waitFor(page, 'levelComplete === true');
}

// Waits until the game has drawn `n` more frames. The page can run far
// slower than real time here, so kit checks count frames, not milliseconds.
async function frames(page, n) {
  const f0 = await run(page, 'game.loop.frame');
  await waitFor(page, `game.loop.frame >= ${f0 + n}`, 60000);
}

// Waits until the top menu kit screen is open and idle (no enter animation,
// no button bounce in progress), then a few frames more
async function kitIdle(page, n = 3) {
  await waitFor(page, `(() => { const s = UI.top(); return !s || (s.state === 'open' && !s._busy); })()`, 60000);
  await frames(page, n);
}

// ---------- menu kit checks ----------

// Keyboard, pointer and restart checks for the menu kit's style sheet
// (?uikit=1). Runs on the booted style sheet; throws on the first failure.
async function checkUiKit(page, controls) {
  const fail = (m) => { throw new Error('uikit: ' + m); };
  const q = JSON.stringify;
  const top = (expr) => run(page, `(() => { const s = UI.top(); return ${expr}; })()`);
  const focused = () => top('s && s.focused ? s.focused.label : null');
  const rec = (label) => `UI.top().focusables.find(f => f.label === ${q(label)})`;
  const setFocus = (label) => run(page, `UI.top().setFocus(${rec(label)})`);
  // the game reads keys on its next frame
  const press = async (key) => { await page.keyboard.press(key); await frames(page, 2); };
  const count = (label, name) => run(page, `(() => { const r = ${rec(label)}; const f = r.onActivate;
    window[${q(name)}] = 0; r.onActivate = () => { window[${q(name)}]++; if (f) f(); }; })()`);

  // The inventory names the kit's controls by their labels
  const labels = await top(`s.focusables.filter(f => f.visible && !f.list &&
    ['button', 'iconButton', 'toggle', 'card'].includes(f.kind)).map(f => f.label)`);
  const missing = labels.filter(l => !controls.includes(l));
  if (missing.length) fail('inventory is missing ' + missing.join(', '));

  // Arrows move focus
  const start = await focused();
  await press('ArrowDown');
  if (await focused() === start) fail('ArrowDown did not move focus from ' + start);

  // Every focusable can be reached with arrows. The focus graph comes from
  // the kit's own key handler (instant); then one walk that visits every
  // item is typed with real key presses in a single batch (the game handles
  // all queued keys on its next frame) and its trace must cover them all.
  const all = await top('s.focusables.filter(f => f.visible).map(f => f.label)');
  if (new Set(all).size !== all.length) fail('focusable labels are not unique');
  const DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const graph = await run(page, `(() => {
    const s = UI.top(), g = {};
    const byLabel = l => s.focusables.find(f => f.label === l);
    for (const from of ${q(all)}) {
      g[from] = {};
      for (const key of ${q(DIRS)}) {
        s.lists.forEach(l => l._scrollTo(0, false));    // which row is entered depends on the scroll
        s.setFocus(byLabel(from), { silent: true });
        s._handleKey({ key: key, timeStamp: performance.now(), preventDefault() {} });
        g[from][key] = s.focused ? s.focused.label : null;
      }
    }
    return g;
  })()`);
  // shortest key path between two items in the graph
  const pathBetween = (a, goal) => {
    const prev = { [a]: null }, todo = [a];
    while (todo.length) {
      const n = todo.shift();
      if (n === goal) break;
      for (const k of DIRS) {
        const m = graph[n][k];
        if (m && !(m in prev)) { prev[m] = [n, k]; todo.push(m); }
      }
    }
    if (!(goal in prev)) return null;
    const keys = [];
    for (let n = goal; prev[n]; n = prev[n][0]) keys.unshift(prev[n][1]);
    return keys;
  };
  const unreached = all.filter(l => l !== start && !pathBetween(start, l));
  if (unreached.length) fail('not reachable with arrows: ' + unreached.join(', '));
  // a walk from the first focus through every item, nearest unvisited next
  const walk = [];
  let cur = start;
  const todo = new Set(all.filter(l => l !== start));
  while (todo.size) {
    let best = null;
    todo.forEach(l => { const pth = pathBetween(cur, l); if (pth && (!best || pth.length < best.length)) best = pth; });
    for (const kk of best) { walk.push(kk); cur = graph[cur][kk]; todo.delete(cur); }
  }
  const resetLists = `UI.top().lists.forEach(l => l._scrollTo(0, false)); UI.top().setFocus(${rec(start)}, { silent: true })`;
  await run(page, resetLists);
  await run(page, `window.__kitTrace = []; ${scene}.input.keyboard.on('keydown', window.__kitTraceFn = () =>
    window.__kitTrace.push(UI.top() && UI.top().focused ? UI.top().focused.label : null))`);
  for (const kk of walk) await page.keyboard.press(kk);
  await waitFor(page, `window.__kitTrace.length >= ${walk.length}`);
  const trace = await run(page, `(() => { ${scene}.input.keyboard.off('keydown', window.__kitTraceFn); return window.__kitTrace; })()`);
  const missed = all.filter(l => l !== start && !trace.includes(l));
  if (missed.length) fail(`the typed walk (${walk.length} keys) never reached: ` + missed.join(', '));
  // the same keys through the kit's handler from the same state give the same trace
  const replay = await run(page, `(() => {
    ${resetLists};
    const s = UI.top();
    return ${q(walk)}.map(key => { s._handleKey({ key: key, timeStamp: performance.now(), preventDefault() {} });
      return s.focused ? s.focused.label : null; });
  })()`);
  if (trace.join('|') !== replay.join('|')) fail('real key presses and the kit handler disagree at step ' +
    trace.findIndex((l, i) => l !== replay[i]));

  // Replay the shortest arrow path from the first focus to the popup button
  await setFocus(start);
  for (const kk of pathBetween(start, 'Popup')) await page.keyboard.press(kk);
  await frames(page, 2);
  if (await focused() !== 'Popup') fail('arrow path to Popup ended on ' + await focused());

  // Enter opens the stacked popup; Esc closes it and focus returns
  await press('Enter');
  await waitFor(page, `UI.stack().length === 2 && UI.top().state === 'open'`);
  await kitIdle(page);
  await press('Escape');
  await waitFor(page, `UI.stack().length === 1`);
  await kitIdle(page);
  if (await focused() !== 'Popup') fail('focus after closing the popup is ' + await focused());

  // Slider: Left / Right change the value in 5% steps
  await setFocus('Music');
  const v0 = await top('s.focused.obj.value');
  await press('ArrowRight');
  const v1 = await top('s.focused.obj.value');
  await press('ArrowLeft');
  const v2 = await top('s.focused.obj.value');
  if (Math.abs(v1 - v0 - 0.05) > 0.001 || Math.abs(v2 - v0) > 0.001) fail(`slider values ${v0} -> ${v1} -> ${v2}`);
  if (await focused() !== 'Music') fail('Left / Right moved focus off the slider');

  // Toggle: Space flips it
  await setFocus('Mute All');
  const t0 = await top('s.focused.obj.value');
  await press('Space');
  await kitIdle(page);
  if (await top('s.focused.obj.value') === t0) fail('Space did not flip the toggle');

  // A disabled button takes focus but does nothing
  await count('Locked', '__lockedRuns');
  await setFocus('Locked');
  await press('Enter');
  await kitIdle(page);
  if (await run(page, '__lockedRuns') !== 0) fail('the disabled button ran its action');

  // Restart while the style sheet is open: no stale key listener survives
  const listeners = await run(page, `${scene}.input.keyboard.listenerCount('keydown')`);
  const expectDown = graph[start].ArrowDown;
  await run(page, `${scene}.scene.restart()`);
  await waitFor(page, `UI.top() && UI.top().id === 'uikit' && UI.top().state === 'open'`, 60000);
  await kitIdle(page);
  if (await run(page, `${scene}.input.keyboard.listenerCount('keydown')`) !== listeners) fail('keydown listeners grew after a restart');
  await setFocus(start);
  await press('ArrowDown');
  if (await focused() !== expectDown) fail(`after a restart ArrowDown went to ${await focused()}, expected ${expectDown}`);

  // Esc on the style sheet closes it and shows the main menu
  await press('Escape');
  await waitFor(page, `!UI.isOpen() && UI.top() === null && showingMenu && menuObjects.length > 0`);

  // ---- pointer, with animations on and the camera scrolled into the level
  await boot(page, '?uikit=1');
  await kitIdle(page);
  const scroll = await run(page, `(() => { const c = ${scene}.cameras.main; c.stopFollow();
    c.setScroll(1500, c.scrollY); return c.scrollX; })()`);
  if (scroll < 1000) fail('could not scroll the camera for the pointer check (scrollX ' + scroll + ')');
  const box = await page.locator('canvas').boundingBox();
  const k = box.width / 1066;
  const at = async (label) => {
    const p = await run(page, `(() => { const r = ${rec(label)}; return { x: r.x, y: r.y }; })()`);
    return { x: box.x + p.x * k, y: box.y + p.y * k };
  };
  const click = async (label) => { const p = await at(label); await page.mouse.click(p.x, p.y); await frames(page, 2); await kitIdle(page); };

  let p = await at('Map');
  await page.mouse.move(p.x, p.y);
  await frames(page, 2);
  if (await focused() !== 'Map') fail('hovering Map did not focus it (focus: ' + await focused() + ')');
  await count('Map', '__mapRuns');
  await click('Map');
  if (await run(page, '__mapRuns') !== 1) fail('one click on Map ran its action ' + await run(page, '__mapRuns') + ' times');
  await count('Level 1-2', '__rowRuns');           // a row inside the scroll list (nested containers)
  await click('Level 1-2');
  if (await run(page, '__rowRuns') !== 1) fail('one click on a list row ran its action ' + await run(page, '__rowRuns') + ' times');

  // While the popup is open, the screen below ignores clicks
  await count('Play', '__playRuns');
  const playAt = await at('Play');
  await click('Popup');
  await waitFor(page, `UI.stack().length === 2`);
  await kitIdle(page);
  await page.mouse.click(playAt.x, playAt.y);
  await frames(page, 4);
  await kitIdle(page);
  if (await run(page, '__playRuns') !== 0) fail('a click reached the screen under the popup');
  if (await run(page, 'UI.stack().length') !== 2) fail('a click outside the popup closed it');
  await click('No');
  await waitFor(page, `UI.stack().length === 1`);
}

// ---------- screens ----------
// name:     file name and inventory key
// profiles: which save profiles shoot it
// query:    URL query for boot (default none: the main menu)
// open:     gets from a freshly booted main menu to the screen
// ready:    optional, waits until the screen is ready to shoot
// settleMs: wait after open for animations to finish
// check:    optional, runs after the shot; throws to fail the screen

const BOTH = ['fresh', 'progressed'];
const PROG = ['progressed'];

const SCREENS = [
  { name: 'main-menu', profiles: BOTH, settleMs: 800, open: async () => {} },
  // The menu kit's style sheet (ui.js), reduced motion so the shot is stable
  { name: 'uikit', profiles: ['fresh'], query: '?uikit=1&nomotion=1', settleMs: 300, open: async () => {},
    ready: (p) => kitIdle(p, 5), check: (p, controls) => checkUiKit(p, controls) },
  { name: 'uikit-popup', profiles: ['fresh'], query: '?uikit=1&nomotion=1', settleMs: 300,
    open: async (p) => {
      await kitIdle(p);
      await run(p, `UI.top().focusables.find(f => f.label === 'Popup').onActivate()`);
      await waitFor(p, `UI.top().id === 'uikit-popup'`);
    },
    ready: (p) => kitIdle(p, 5) },
  { name: 'world-map', profiles: BOTH, settleMs: 800, open: (p) => run(p, `showLevelSelect(${scene})`) },
  { name: 'speedrun-select', profiles: BOTH, settleMs: 800, open: (p) => run(p, `showSpeedrunLevelSelect(${scene})`) },
  { name: 'daily', profiles: BOTH, settleMs: 800, open: (p) => run(p, `showDailyChallengeScreen(${scene})`) },
  { name: 'shop-colors', profiles: BOTH, settleMs: 600, open: (p) => run(p, `showCosmeticScreen(${scene})`) },
  { name: 'shop-trails', profiles: BOTH, settleMs: 600,
    open: (p) => run(p, `showCosmeticScreen(${scene}); _cosmeticActiveTab = 'trails'; _renderCosmeticScreen(${scene})`) },
  { name: 'shop-hats', profiles: BOTH, settleMs: 600,
    open: (p) => run(p, `showCosmeticScreen(${scene}); _cosmeticActiveTab = 'hats'; _renderCosmeticScreen(${scene})`) },
  { name: 'achievements', profiles: BOTH, settleMs: 600, open: (p) => run(p, `showAchievementGallery(${scene})`) },
  { name: 'achievement-toast', profiles: PROG, settleMs: 1000,
    open: (p) => run(p, `showAchievementNotification(${scene}, ACHIEVEMENTS.find(a => a.id === 'combo_king'))`) },
  { name: 'modifiers', profiles: BOTH, settleMs: 600, open: (p) => run(p, `setModifierMode('normal'); showModifierScreen(${scene})`) },
  { name: 'modifiers-assist', profiles: PROG, settleMs: 600, open: (p) => run(p, `setModifierMode('assist'); showModifierScreen(${scene})`) },
  { name: 'modifiers-hardcore', profiles: PROG, settleMs: 600, open: (p) => run(p, `setModifierMode('hardcore'); showModifierScreen(${scene})`) },
  { name: 'controls-popup-menu', profiles: BOTH, settleMs: 400, open: (p) => run(p, `toggleControlsPopup(${scene})`) },
  { name: 'pause', profiles: PROG, settleMs: 500, open: async (p) => {
    await startLevel(p, 0);
    await run(p, `togglePause.call(${scene})`);
  } },
  { name: 'pause-settings', profiles: PROG, settleMs: 500, open: async (p) => {
    await startLevel(p, 0);
    await run(p, `togglePause.call(${scene}); showPauseSettings(${scene})`);
  } },
  { name: 'controls-popup-pause', profiles: PROG, settleMs: 500, open: async (p) => {
    await startLevel(p, 0);
    await run(p, `togglePause.call(${scene}); showPauseSettings(${scene}); toggleControlsPopup(${scene})`);
  } },
  { name: 'game-over', profiles: PROG, settleMs: 1000, open: async (p) => {
    await startLevel(p, 0);
    await run(p, `lives = 1; hitEnemy.call(${scene})`);
    await waitFor(p, 'gameOver === true');
  } },
  { name: 'results', profiles: PROG, settleMs: 4500, open: async (p) => {
    await startLevel(p, 12);                // 4-1: first unbeaten level, unlocks 4-2
    await finishLevel(p, 64300);
  } },
  { name: 'results-speedrun', profiles: PROG, settleMs: 4500, open: async (p) => {
    await startLevel(p, 4, 'speedrunMode = true');   // 2-1 has a PB to compare with
    await finishLevel(p, 51800);
  } },
  { name: 'credits', profiles: PROG, settleMs: 5500, open: async (p) => {
    await startLevel(p, 23);                // the last level
    await finishLevel(p, 142000);
  } },
  { name: 'endless-results', profiles: PROG, settleMs: 1000, open: async (p) => {
    await startLevel(p, 0, 'endlessMode = true');
    await run(p, `endlessDistance = 345; endEndlessMode(${scene})`);
  } },
  { name: 'bonus-results', profiles: PROG, settleMs: 2800, open: async (p) => {
    await startLevel(p, 1, 'bonusRound = { next: 2 }');   // the round after 1-2
    await waitFor(p, 'bonusState && !bonusState.over');
    await run(p, 'bonusState.caught = 37; bonusState.time = 1');
    await waitFor(p, 'bonusState.over === true');
  } },
  { name: 'story-card', profiles: PROG, settleMs: 2000,
    open: (p) => startLevel(p, 4, 'delete storyShown.level4') },
  { name: 'move-card', profiles: PROG, settleMs: 1800,     // also shows the controls reminder chips
    open: (p) => startLevel(p, 1, 'delete movesSeen.dash') },
  { name: 'tutorial-hint', profiles: PROG, settleMs: 700, open: async (p) => {
    await startLevel(p, 0);
    await run(p, `showTutorialHint(${scene}, TUTORIAL_HINTS[0].text)`);
  } }
];

// ---------- main ----------

// Network noise that is not a game error: a resource the browser could not
// fetch (e.g. the Phaser CDN when offline; index.html falls back to the local
// copy) and the favicon.
const IGNORE = [/^Failed to load resource/, /favicon/i];

(async () => {
  const browser = await chromium.launch();
  let failed = 0, errored = 0;
  const ignored = new Set();

  for (const profile of BOTH) {
    const screens = SCREENS.filter(s => s.profiles.includes(profile) && (!ONLY.length || ONLY.includes(s.name)));
    if (!screens.length) continue;
    const dir = path.join(OUT, profile);
    fs.mkdirSync(dir, { recursive: true });
    const invFile = path.join(dir, 'inventory.json');
    let inventory = {};
    try { inventory = JSON.parse(fs.readFileSync(invFile, 'utf8')); } catch (e) { /* first run */ }

    const context = await browser.newContext({ viewport: { width: 1066, height: 600 }, deviceScaleFactor: 1 });
    await context.addInitScript(seedProfile, profile);
    const page = await context.newPage();
    let errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      if (IGNORE.some(re => re.test(m.text()))) { ignored.add(m.text()); return; }
      errors.push('console: ' + m.text());
    });

    console.log(`== ${profile}`);
    for (const s of screens) {
      errors = [];
      let status = 'ok', controls = [];
      try {
        await boot(page, s.query);
        await s.open(page);
        if (s.ready) await s.ready(page);
        await page.waitForTimeout(s.settleMs);
        await page.locator('canvas').screenshot({ path: path.join(dir, s.name + '.png') });
        controls = await page.evaluate(collectControls);
        inventory[s.name] = controls;
        if (s.check) await s.check(page, controls);
      } catch (e) {
        status = 'FAILED: ' + e.message.split('\n')[0];
        failed++;
      }
      if (errors.length) errored++;
      console.log(`${s.name.padEnd(22)} ${status}${status === 'ok' ? ` (${controls.length} controls)` : ''}` +
        (errors.length ? `  ${errors.length} ERROR(S)` : ''));
      errors.forEach(e => console.log('    ' + e));
    }
    fs.writeFileSync(invFile, JSON.stringify(inventory, null, 2) + '\n');
    await context.close();
  }

  await browser.close();
  if (ignored.size) console.log(`ignored ${ignored.size} network message(s):\n  ` + [...ignored].join('\n  '));
  console.log(failed || errored ? `${failed} screen(s) failed, ${errored} with errors` : 'all screens ok');
  process.exit(failed || errored ? 1 : 0);
})();
