#!/usr/bin/env node
// Walks each generated level along the route its recipe declares and reports
// every place the walker fell, got stuck or was blocked. Enemies are switched
// off: this checks that the course can be crossed, not how hard it is.
//
//   npm start                         (serves the game on :8000)
//   node tools/walk-levels.js         all generated levels
//   node tools/walk-levels.js w1_2    just one
//
// Needs Playwright (not a dependency of the game).
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { routes } = require(path.join(ROOT, 'tools', 'build-levels.js'));
const ORDER = ['level1', 'w1_2', 'w1_3', 'w1_4', 'level2', 'w2_2', 'w2_3', 'w2_4', 'level3', 'w3_2', 'w3_3', 'w3_4', 'level4', 'w4_2', 'w4_3', 'level5', 'level6', 'level8', 'w5_3', 'w5_4', 'level7', 'level9', 'w6_3', 'level10'];

function bot(route) {
  return new Promise(done => {
    const scene = game.scene.scenes[0];
    lives = 9999;
    enemies.children.entries.forEach(e => e.disableBody(true, true));
    enemyRects.forEach(r => r && r.setVisible(false));
    bossTriggered = true;       // no boss: this is a test of the course
    let idx = 0, t0 = iaTime, last = iaTime, jumpHold = 0, lastLives = lives;
    let safe = { x: player.x, y: player.y };   // last place stood, for reports
    const fails = [];
    const trace = [];
    const solids = () => {
      const out = [];
      platforms.children.entries.forEach(p => { if (p.body && p.body.enable) out.push(p.body); });
      movingPlatforms.forEach(m => out.push(m.sprite.body));
      iaSwitchBlocks.forEach(b => { if (b.solid) out.push(b.body.body); });
      iaBlocks.forEach(b => { if (!b.hidden) out.push(b.body.body); });
      breakableBlocks.children.entries.forEach(c => { if (c.active) out.push(c.body); });
      return out;
    };
    const supported = (x, y) => solids().some(b => x >= b.x && x <= b.right && y >= b.y - 2 && y <= b.bottom);
    const target = () => {
      const T = route[idx];
      if (T.kind.startsWith('mover:')) {
        const m = movingPlatforms[+T.kind.split(':')[1]];
        return { x: m.sprite.x, y: m.sprite.body.y, w: T.w, kind: 'mover' };
      }
      return T;
    };
    const skip = (why) => {
      fails.push({ at: idx, why: why, x: Math.round(safe.x), y: Math.round(safe.y), wp: route[idx] });
      idx++;
      if (idx < route.length) { const T = target(); player.body.reset(T.x, T.y - 17); }
      last = iaTime;
    };
    const iv = setInterval(() => {
      if (idx >= route.length || levelComplete) { clearInterval(iv); touchLeft = touchRight = touchJump = false; done({ fails: fails, ms: Math.round(iaTime - t0), trace: trace }); return; }
      const body = player.body;
      if (lives < lastLives) { lastLives = lives; skip('fell'); return; }
      if (iaTime - last > 9000) { skip('stuck'); return; }
      if (iaInCannon) {
        touchLeft = touchRight = touchJump = false;
        if (route[idx].kind === 'cannon') { idx++; last = iaTime; }
        return;
      }
      const T = target();
      if (iaOnRope) {
        const r = iaOnRope;
        touchRight = true; touchLeft = false;
        touchJump = r.theta > r.swing * 0.45 && r.thetaV > 0;
        if (touchJump && route[idx].kind.startsWith('rope')) { idx++; last = iaTime; }
        return;
      }
      const onG = body.enable && (body.blocked.down || body.touching.down);
      const feet = body.bottom, px = player.x;
      if (onG) safe = { x: px, y: player.y };
      if (onG) {
        // Reached this waypoint, or one a little further on?
        for (let k = idx; k < Math.min(idx + 3, route.length); k++) {
          const saveIdx = idx; idx = k; const W = target(); idx = saveIdx;
          if (W.kind === 'rope' || route[k].kind.startsWith('rope')) { if (k > idx) break; continue; }
          if (Math.abs(feet - W.y) < 8 && Math.abs(px - W.x) <= W.w / 2 - 4) { idx = k + 1; last = iaTime; return; }
        }
      }
      const dx = T.x - px;
      if (window.__trace && px > window.__trace[0] && px < window.__trace[1] && trace.length < 400 && (!trace.length || iaTime - trace[trace.length - 1][0] > 120)) trace.push([Math.round(iaTime), idx, Math.round(px), Math.round(player.y), onG ? 'G' : 'A', Math.round(dx)]);
      let dir = Math.abs(dx) < 6 ? 0 : Math.sign(dx);
      let jump = false;
      if (onG) {
        const higher = T.y < feet - 8;
        const edge = dir !== 0 && !supported(px + dir * 20, feet + 4);
        const nearEdge = Math.abs(dx) - T.w / 2;        // gap to the target's near edge
        const isRope = route[idx].kind.startsWith('rope');
        if (isRope && Math.abs(feet - T.y) < 8 && Math.abs(dx) < T.w / 2) {
          // On the launch ledge: wait for the rope to swing within reach
          const r = iaRopes[+route[idx].kind.split(':')[1]];
          dir = px < T.x + 38 ? 1 : 0;
          if (r.tipX - px < 75 && r.tipX - px > 10 && r.thetaV <= 0.3) { jump = true; dir = 1; }
        } else if (T.kind === 'mover' && edge && nearEdge > 70) {
          dir = 0;                                        // wait for the platform
        } else if (edge) {
          jump = true;
        } else if (higher && nearEdge < 40 && nearEdge > -T.w / 2 + 4) {
          dir = -dir;                                     // too close to clear the lip: back off
        } else if (higher && nearEdge < 100) {
          jump = true;
        } else if (dir > 0 ? body.blocked.right : (dir < 0 ? body.blocked.left : false)) {
          jump = true;
        } else if (dir !== 0 && obstacles.children.entries.some(o => Math.abs(o.y - feet) < 30 && (o.x - px) * dir > 0 && (o.x - px) * dir < 110)) {
          jump = true;
        }
      } else if (T.kind === 'mover' || Math.abs(dx) < T.w / 2 - 12) {
        // In the air over the target: stop drifting
        if (Math.abs(dx) < T.w / 2 - 12) dir = 0;
      }
      // Hold for the full jump (timed off the physics, not the wall clock)
      touchJump = jump || (!onG && body.velocity.y < 0);
      touchRight = dir > 0; touchLeft = dir < 0;
    }, 8);
  });
}

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(routes);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1086, height: 620 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(() => {
    localStorage.setItem('jqCampaign', '2');
    const c = {}, s = {}; for (let i = 0; i < 24; i++) { c['level' + i] = true; s['level' + i] = 1; }
    localStorage.setItem('jqCompleted', JSON.stringify(c)); localStorage.setItem('jqStoryShown', JSON.stringify(s));
    localStorage.setItem('jqMovesSeen', JSON.stringify({ dash: 1, pound: 1, flow: 1 }));
  });
  await p.goto('http://localhost:8000/index.html');
  await p.waitForTimeout(2000);
  let bad = 0;
  for (const id of only) {
    const lv = ORDER.indexOf(id);
    await p.evaluate((lv) => { clearMenuObjects(); showingMenu = false; showingLevelSelect = false; currentLevelIndex = lv; game.scene.scenes[0].scene.restart(); }, lv);
    await p.waitForFunction(() => typeof player !== 'undefined' && player && player.body && player.x < 120 && !levelComplete && !gameOver, null, { timeout: 30000 });
    await p.waitForTimeout(1200);
    if (process.env.TRACE) await p.evaluate((t) => { window.__trace = t; }, process.env.TRACE.split(',').map(Number));
    await p.evaluate(() => { tutorialShown = new Proxy({}, { get: () => true, set: () => true }); });
    const res = await p.evaluate(`(${bot.toString()})(${JSON.stringify(routes[id])})`);
    bad += res.fails.length;
    console.log(id, res.fails.length ? 'FAILS ' + res.fails.length : 'ok', `(${Math.round(res.ms / 1000)}s game time, ${routes[id].length} waypoints)`);
    if (res.trace.length) console.log(res.trace.map(t => t.join(' ')).join('\n'));
    res.fails.forEach(f => console.log('   ', f.why, 'heading for #' + f.at, JSON.stringify(f.wp), 'from', f.x, f.y));
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
