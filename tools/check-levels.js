#!/usr/bin/env node
// ========================
// Level layout checker
// ========================
// Reads levels/level*.js and reports layout problems:
//
//   crowded  two platforms at (nearly) the same height with a small gap,
//            which reads as one broken shelf rather than a jump
//   stacked  a platform hanging over another with too little room between
//   density  the most platforms in any one 800px screen
//
// It also models reachability: which surfaces, pickups and goals the player
// can get to from the start with a normal jump (plus springs and moving
// platforms), so an edit can be checked for anything it strands.
//
// Usage:
//   node tools/check-levels.js            report every level
//   node tools/check-levels.js 5 10       report only levels 5 and 10
//   node tools/check-levels.js --json     machine-readable output
//
// Exits with code 1 if any level breaks a layout rule (see ALLOWED for
// deliberate exceptions). The fix list is in docs/level-layout-fixes.md.
//
// Movement numbers mirror game.js (JUMP_VELOCITY, BASE_GRAVITY,
// FAST_FALL_MULTIPLIER, MAX_SPEED, SPRING_VELOCITY). The model is
// deliberately simple (no wall jumps, dashes or double jumps), so treat an
// "unreachable" result as "needs a look", and compare before/after rather
// than trusting it as absolute truth.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GROUND_TOP = 560;
const RUN = 220;
const JUMP_V = 420;
const GRAVITY = 800;
const FALL_GRAVITY = GRAVITY * 1.5;
const SPRING_V = 650;
const PLAYER_H = 32;

// Layout thresholds (see the level layout review)
const SAME_HEIGHT_DY = 24;    // tops closer than this count as "the same height"
const CROWDED_GAP = 70;       // same-height platforms closer than this are crowded
const STACK_OVERLAP = 20;     // horizontal overlap before a pair counts as stacked
const STACK_CLEARANCE = 64;   // room under the upper platform (2 player heights)

// Layouts that break a rule on purpose, matched by level and the two
// surfaces' positions. They are still listed, marked as allowed.
const ALLOWED = [
    { level: 2, a: [1455, 480], b: [1300, 560], why: 'secret alcove: the fake wall hides a coin nook under the ledge' }
];
const allowedFor = (n, i) => ALLOWED.find(x => x.level === n &&
    x.a[0] === i.at[0] && x.a[1] === i.at[1] && x.b[0] === i.at[2] && x.b[1] === i.at[3]);

function loadLevels(dir) {
    const ctx = {};
    vm.createContext(ctx);
    const files = fs.readdirSync(dir).filter(f => /^level\d+\.js$/.test(f))
        .sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    return files.map(f => {
        const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^const (level\d+)/m, 'this.$1');
        vm.runInContext(src, ctx);
        const n = parseInt(f.slice(5));
        return { n: n, file: f, data: ctx['level' + n] };
    });
}

// Every standable surface, with where it came from so reports can name it
function surfaces(L) {
    const out = [];
    const add = (list, kind) => (list || []).forEach((p, i) => {
        const w = p.width || 90, h = p.height || 20;
        out.push({
            ref: `${kind}[${i}]`, kind: kind, x: p.x, y: p.y, w: w, h: h,
            l: p.x - w / 2, r: p.x + w / 2, top: p.y - h / 2, bot: p.y + h / 2, mx: 0, my: 0
        });
    });
    add(L.platforms, 'platforms');
    add(L.crumblingPlatforms, 'crumblingPlatforms');
    add(L.secretPlatforms, 'secretPlatforms');
    add(L.fakeWalls, 'fakeWalls');
    add(L.invisiblePlatforms, 'invisiblePlatforms');
    (L.movingPlatforms || []).forEach((p, i) => {
        // Mirrors game.js: a platform travels from its start by moveX (right)
        // and moveY (down) and back; zero or negative values do not move it.
        const mx = Math.max(0, p.moveX || 0), my = Math.max(0, p.moveY || 0);
        out.push({
            ref: `movingPlatforms[${i}]`, kind: 'movingPlatforms', x: p.x, y: p.y, w: p.width, h: p.height,
            l: p.x - p.width / 2, r: p.x + p.width / 2 + mx,
            top: p.y - p.height / 2, bot: p.y + p.height / 2 + my,
            topLow: p.y - p.height / 2 + my, mx: mx, my: my
        });
    });
    return out;
}

const isLedge = s => s.h <= 40;

function layoutIssues(L) {
    const S = surfaces(L).filter(isLedge);
    const issues = [];
    for (let a = 0; a < S.length; a++) {
        for (let b = a + 1; b < S.length; b++) {
            const A = S[a], B = S[b];
            const gap = Math.max(A.l, B.l) - Math.min(A.r, B.r);
            const dy = Math.abs(A.top - B.top);
            const moving = (A.kind === 'movingPlatforms') + (B.kind === 'movingPlatforms');
            // A moving platform ending beside a fixed one is a hand-off, and
            // two moving platforms share space at different times; neither
            // is clutter. A moving platform passing low over a fixed one is.
            // (One that drives into a fixed platform at its own height is.)
            if (moving === 1 && dy <= SAME_HEIGHT_DY && gap < 0) {
                issues.push({ type: 'crowded', a: A.ref, b: B.ref, at: [A.x, A.y, B.x, B.y], gap: Math.round(gap), dy: Math.round(dy) });
                continue;
            }
            if (moving === 2 || (moving === 1 && dy <= SAME_HEIGHT_DY)) continue;
            if (dy <= SAME_HEIGHT_DY && gap < CROWDED_GAP) {
                issues.push({ type: 'crowded', a: A.ref, b: B.ref, at: [A.x, A.y, B.x, B.y], gap: Math.round(gap), dy: Math.round(dy) });
            } else if (-gap > STACK_OVERLAP) {
                const up = A.top < B.top ? A : B, lo = up === A ? B : A;
                const clear = lo.top - up.bot;
                if (clear < STACK_CLEARANCE) {
                    issues.push({ type: 'stacked', a: up.ref, b: lo.ref, at: [up.x, up.y, lo.x, lo.y], overlap: Math.round(-gap), clear: Math.round(clear) });
                }
            }
        }
    }
    return issues;
}

function density(L) {
    const S = surfaces(L).filter(isLedge);
    let max = 0, at = 0, sum = 0, n = 0;
    for (let x0 = 0; x0 <= L.worldWidth - 800; x0 += 100) {
        const c = S.filter(s => s.x >= x0 && s.x < x0 + 800).length;
        sum += c; n++;
        if (c > max) { max = c; at = x0; }
    }
    return { platforms: S.length, avg: +(sum / n).toFixed(1), max: max, at: at };
}

// ---- Reachability ----

// Horizontal distance the player can cover in a jump that lands dy above
// the take-off height (negative dy = landing lower), from standing speed.
function jumpReach(dy, v) {
    const up = v / GRAVITY;
    const apex = v * v / (2 * GRAVITY);
    if (dy > apex) return -1;
    const down = Math.sqrt(2 * (apex - dy) / FALL_GRAVITY);
    return RUN * (up + down);
}

function reachability(L) {
    const S = surfaces(L);
    S.push({ ref: 'ground', kind: 'ground', l: 0, r: L.worldWidth, top: GROUND_TOP, bot: 600, x: L.worldWidth / 2 });
    const springs = (L.springs || []);
    const standTops = s => s.topLow !== undefined ? [s.top, s.topLow] : [s.top];
    const canReach = (A, B) => {
        // Try every take-off height A offers against every landing height on B,
        // with a normal jump or, if a spring sits on A, a spring launch.
        const vs = [JUMP_V];
        if (springs.some(sp => sp.x >= A.l - 10 && sp.x <= A.r + 10 && Math.abs(sp.y + 10 - A.top) < 30)) vs.push(SPRING_V);
        for (const ta of standTops(A)) {
            for (const tb of standTops(B)) {
                const dy = ta - tb;
                const gap = Math.max(0, Math.max(A.l, B.l) - Math.min(A.r, B.r));
                for (const v of vs) {
                    const reach = jumpReach(dy, v);
                    // A little credit for the player's own width at each edge
                    if (reach >= 0 && gap <= reach + 16) return true;
                }
            }
        }
        return false;
    };
    const start = L.playerStart;
    const startSurf = S.filter(s => start.x >= s.l - 16 && start.x <= s.r + 16 && s.top >= start.y - 20)
        .sort((a, b) => a.top - b.top)[0] || S[S.length - 1];
    const seen = new Set([startSurf.ref]);
    const queue = [startSurf];
    while (queue.length) {
        const A = queue.shift();
        for (const B of S) {
            if (seen.has(B.ref) || !isLedge(B) && B.kind !== 'ground') continue;
            if (canReach(A, B)) { seen.add(B.ref); queue.push(B); }
        }
    }
    const reached = S.filter(s => seen.has(s.ref));
    // A point is reachable if some reached surface lets the player jump to
    // it: high enough, and close enough that the jump arc still passes it
    // (so a coin hung over a gap counts, as long as the arc gets there)
    const pointOk = (x, y) => reached.some(s => {
        const vmax = springs.some(sp => sp.x >= s.l - 10 && sp.x <= s.r + 10) ? SPRING_V : JUMP_V;
        const rise = Math.max(0, s.top - y - PLAYER_H / 2);
        const side = Math.max(40, jumpReach(rise, vmax) + 16);
        if (x < s.l - side || x > s.r + side) return false;
        return s.top - y <= vmax * vmax / (2 * GRAVITY) + PLAYER_H + 12 && y <= s.top + 40;
    });
    const items = [];
    const check = (list, kind) => (list || []).forEach((o, i) => {
        items.push({ ref: `${kind}[${i}]`, x: o.x, y: o.y, ok: pointOk(o.x, o.y) });
    });
    check(L.coins, 'coins');
    check(L.keys, 'keys');
    check(L.powerUps, 'powerUps');
    check(L.checkpoints, 'checkpoints');
    check(L.breakableBlocks, 'breakableBlocks');
    items.push({ ref: 'flag', x: L.flagPosition.x, y: L.flagPosition.y, ok: pointOk(L.flagPosition.x, L.flagPosition.y) });
    return {
        surfaces: S.filter(isLedge).map(s => ({ ref: s.ref, ok: seen.has(s.ref) })),
        items: items
    };
}

function report(levels, json) {
    const all = levels.map(({ n, data }) => {
        const issues = layoutIssues(data);
        issues.forEach(i => { const a = allowedFor(n, i); if (a) i.allowed = a.why; });
        return {
            level: n, name: data.name,
            density: density(data),
            issues: issues.filter(i => !i.allowed),
            allowed: issues.filter(i => i.allowed),
            reach: reachability(data)
        };
    });
    if (json) {
        console.log(JSON.stringify(all, null, 1));
        return all;
    }
    all.forEach(r => {
        const crowded = r.issues.filter(i => i.type === 'crowded');
        const stacked = r.issues.filter(i => i.type === 'stacked');
        const lostSurf = r.reach.surfaces.filter(s => !s.ok);
        const lostItems = r.reach.items.filter(s => !s.ok);
        console.log(`\n${r.name}`);
        console.log(`  platforms ${r.density.platforms}, per screen avg ${r.density.avg}, busiest ${r.density.max} at x ${r.density.at}-${r.density.at + 800}`);
        console.log(`  crowded ${crowded.length}, stacked ${stacked.length}, unreachable surfaces ${lostSurf.length}, unreachable items ${lostItems.length}`);
        crowded.forEach(i => console.log(`    crowded  ${i.a} (${i.at[0]},${i.at[1]}) ~ ${i.b} (${i.at[2]},${i.at[3]})  gap ${i.gap}, dy ${i.dy}`));
        stacked.forEach(i => console.log(`    stacked  ${i.a} (${i.at[0]},${i.at[1]}) over ${i.b} (${i.at[2]},${i.at[3]})  overlap ${i.overlap}, clearance ${i.clear}`));
        r.allowed.forEach(i => console.log(`    allowed  ${i.type} ${i.a} ~ ${i.b}: ${i.allowed}`));
        lostSurf.forEach(s => console.log(`    unreachable surface ${s.ref}`));
        lostItems.forEach(s => console.log(`    unreachable ${s.ref} (${s.x},${s.y})`));
    });
    return all;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const json = args.includes('--json');
    const only = args.filter(a => /^\d+$/.test(a)).map(Number);
    const levels = loadLevels(path.join(__dirname, '..', 'levels')).filter(l => !only.length || only.includes(l.n));
    const all = report(levels, json);
    // Non-zero exit when a layout rule is broken, so this can gate a change
    if (all.some(r => r.issues.length)) process.exitCode = 1;
}

module.exports = { loadLevels, surfaces, layoutIssues, density, reachability, ALLOWED };
