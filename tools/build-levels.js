#!/usr/bin/env node
// Builds the fourteen campaign levels that were added to the original ten.
//
//   node tools/build-levels.js        writes levels/w<world>_<n>.js
//
// Each level is a recipe: a list of set pieces ("chunks") laid end to end.
// A chunk knows the jump metrics of the game, so anything it builds can be
// crossed: rises of at most 75px, gaps of at most 130px, and so on. Edit a
// recipe below and re-run to change a level; do not edit the output files.
//
// Metrics the chunks rely on (see game.js): ground top y=560, jump height
// about 110px, level jump length about 200px, spring launch about 260px.

const fs = require('fs');
const path = require('path');

const G = 560;                 // ground top
const STAND = G - 16;          // y of something 32px tall standing on the ground

const THEMES = {
    meadow: { biome: 'meadow', propStyle: 'mountains', weather: 'leaves', skyColor: 0x87CEEB, groundColor: 0x228B22, platformColor: 0x8B4513, bgColor1: 0x4a8505, bgColor2: 0x2d5a1e },
    canyon: { biome: 'canyon', propStyle: 'mountains', skyColor: 0xE8A87C, groundColor: 0xCD853F, platformColor: 0x8B6914, bgColor1: 0xC19552, bgColor2: 0x8B7355 },
    canyonNight: { biome: 'canyon', propStyle: 'mountains', skyColor: 0x0a0a0a, groundColor: 0x1a1a1a, platformColor: 0x333333, bgColor1: 0x001a00, bgColor2: 0x002200 },
    cave: { biome: 'cave', propStyle: 'spires', skyColor: 0x1a1a2e, groundColor: 0x2d2d2d, platformColor: 0x555555, bgColor1: 0x0d1b2a, bgColor2: 0x1b2838 },
    fortress: { biome: 'castle', propStyle: 'towers', weather: 'embers', skyColor: 0xE85D04, groundColor: 0x4a2800, platformColor: 0x5C3317, bgColor1: 0xBB3E00, bgColor2: 0x6B2D00 },
    castleNight: { biome: 'castle', propStyle: 'towers', skyColor: 0x0d0221, groundColor: 0x1a0533, platformColor: 0x3d1f6d, bgColor1: 0x150440, bgColor2: 0x260759 },
    sky: { biome: 'sky', propStyle: 'mountains', weather: 'snow', skyColor: 0xADD8E6, groundColor: 0xCCCCCC, platformColor: 0xE8E8E8, bgColor1: 0xB0D4E8, bgColor2: 0x87CEEB },
    machine: { biome: 'machine', propStyle: 'towers', weather: 'embers', skyColor: 0x2C3E50, groundColor: 0x555555, platformColor: 0x7F8C8D, bgColor1: 0x34495E, bgColor2: 0x2C3E50 },
    jungle: { biome: 'jungle', propStyle: 'trees', weather: 'leaves', skyColor: 0x2D5F2D, groundColor: 0x1B4D1B, platformColor: 0x4A7A3D, bgColor1: 0x1A3A1A, bgColor2: 0x2B4F2B }
};

class Level {
    constructor(id, name, theme) {
        this.id = id;
        this.name = name;
        this.theme = THEMES[theme];
        this.x = 0;
        this.top = 0;
        this.d = {
            platforms: [], movingPlatforms: [], crumblingPlatforms: [], obstacles: [], enemies: [], coins: [],
            checkpoints: [], powerUps: [], breakableBlocks: [], springs: [], pits: [], gems: [],
            bumpBlocks: [], switches: [], switchBlocks: [], doors: [], cannons: [], ropes: [], suits: [], mounts: []
        };
        this.room = null;
        this.extra = {};
        // The intended way through, as surfaces to stand on in order. Not part
        // of the level: tools/walk-levels.js follows it to prove the level
        // can be crossed.
        this.route = [];
        this.ground(260);      // a clear start
    }

    // --- primitives ---
    ground(w) { this.x += w; return this; }
    wp(x, y, w, kind) { this.route.push({ x: Math.round(x), y: Math.round(y), w: w, kind: kind || '' }); }
    // Marks the end of a chunk: stand on the ground just before the cursor
    land() { this.wp(this.x - 40, G, 60); return this; }
    plat(x, y, w) { this.d.platforms.push({ x: Math.round(x), y: Math.round(y), width: w, height: 20 }); }
    coin(x, y) { this.d.coins.push({ x: Math.round(x), y: Math.round(y) }); }
    coinLine(x, n, y, step) { for (let i = 0; i < n; i++) this.coin(x + i * (step || 40), y); }
    coinArc(x0, x1, base, peak, n) {
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0.5 : i / (n - 1);
            this.coin(x0 + (x1 - x0) * t, base - (base - peak) * 4 * t * (1 - t));
        }
    }
    foe(x, type, y) {
        const air = { flyer: 420, diver: 300 };
        this.d.enemies.push({ x: Math.round(x), y: Math.round(y !== undefined ? y : (air[type] || STAND)), type: type });
    }
    gem(x, y) { this.d.gems.push({ x: Math.round(x), y: Math.round(y) }); }

    // --- chunks ---

    // Flat ground with a coin trail and enemies spread along it
    run(w, o) {
        o = o || {};
        const x = this.x;
        if (o.coins) this.coinLine(x + 60, o.coins, 540);
        (o.foes || []).forEach((t, i, a) => this.foe(x + w * (0.45 + 0.5 * (i + 0.5) / a.length), t));
        return this.ground(w).land();
    }

    // A row of star blocks over the ground
    blocks(list, o) {
        o = o || {};
        const x = this.x + 90;
        list.forEach((c, i) => {
            const b = { x: x + i * 40, y: 440, contains: typeof c === 'string' ? c : c[0] };
            if (b.contains === 'coins') b.count = 5;
            if (typeof c !== 'string' && c[1] === 'hidden') b.hidden = true;
            this.d.bumpBlocks.push(b);
        });
        (o.foes || []).forEach((t, i) => this.foe(x + list.length * 40 + 90 + i * 70, t));
        return this.ground(Math.max(280, list.length * 40 + 180 + (o.foes || []).length * 70)).land();
    }

    // A simple gap in the ground with a coin arc over it
    pit(w) {
        w = w || 110;
        this.ground(90);
        this.d.pits.push({ x: this.x + w / 2, width: w });
        this.coinArc(this.x - 10, this.x + w + 10, 500, 430, 3);
        this.ground(w);
        return this.ground(90).land();
    }

    // A wide gap crossed on small islands
    islands(n, o) {
        o = o || {};
        const w = 110, gap = o.gap || 115;
        this.ground(80);
        const start = this.x;
        const total = gap + n * (w + gap);
        this.d.pits.push({ x: start + total / 2, width: total });
        for (let i = 0; i < n; i++) {
            const cx = start + gap + w / 2 + i * (w + gap);
            const cy = 510 - (i % 2) * (o.wave || 0);
            this.plat(cx, cy, w);
            this.wp(cx, cy - 10, w);
            this.coin(cx, cy - 40);
            if (o.foe && i % 2 === 1) this.foe(cx, o.foe, o.foe === 'flyer' ? cy - 110 : cy - 26);
        }
        if (o.gem !== undefined) this.gem(start + gap + w / 2 + o.gem * (w + gap), 510 - 150);
        this.ground(total);
        return this.ground(80).land();
    }

    // A gap ridden across on moving platforms
    movers(n) {
        this.ground(80);
        const start = this.x;
        const span = 230;
        const total = 50 + n * span;
        this.d.pits.push({ x: start + total / 2, width: total });
        for (let i = 0; i < n; i++) {
            const px = start + 50 + 50 + i * span;
            this.wp(px, 500, 100, 'mover:' + this.d.movingPlatforms.length);
            this.d.movingPlatforms.push({ x: px, y: 510, width: 100, height: 20, moveX: 110, moveY: 0, speed: 55 + (i % 2) * 15 });
            this.coin(px + 55, 460);
        }
        this.ground(total);
        return this.ground(80).land();
    }

    // A gap crossed on ledges that fall away underfoot
    crumble(n) {
        this.ground(80);
        const start = this.x;
        const step = 135;
        const total = 45 + n * step;
        this.d.pits.push({ x: start + total / 2, width: total });
        for (let i = 0; i < n; i++) {
            const cx = start + 45 + 45 + i * step;
            this.d.crumblingPlatforms.push({ x: cx, y: 520, width: 90, height: 20 });
            this.wp(cx, 510, 90);
            this.coin(cx, 480);
        }
        this.ground(total);
        return this.ground(80).land();
    }

    // Two steps up to a launch ledge, then a rope swing over a wide gap
    ropePit() {
        const x = this.x;
        this.plat(x + 70, 500, 120);
        this.plat(x + 210, 440, 120);
        this.wp(x + 70, 490, 120);
        this.wp(x + 210, 430, 120, 'rope:' + this.d.ropes.length);
        const edge = x + 270;
        const ax = edge + 165;
        this.d.ropes.push({ x: ax, y: 215, length: 200 });
        this.d.pits.push({ x: (x + 250 + ax + 150) / 2, width: ax + 150 - (x + 250) });
        this.coinLine(ax + 200, 4, 500, 45);
        return this.ground(ax + 150 - x + 420).land();
    }

    // A cannon that fires across a gap too wide to jump
    cannonPit() {
        const x = this.x + 80;
        this.d.cannons.push({ x: x, y: 532, angle: -45 });
        this.wp(x, G, 40, 'cannon');
        this.d.pits.push({ x: x + 70 + 175, width: 350 });
        [[138, 412], [215, 365], [330, 338], [423, 393]].forEach(([dx, y]) => this.coin(x + dx, y));
        return this.ground(80 + 420 + 300).land();
    }

    // A switch that builds a bridge of blocks over a gap for a few seconds
    switchBridge(n) {
        n = n || 8;
        const x = this.x;
        this.d.switches.push({ x: x + 80, y: 552 });
        const start = x + 170;
        this.d.pits.push({ x: start + n * 16, width: n * 32 });
        for (let i = 0; i < n; i++) this.d.switchBlocks.push({ x: start + 16 + i * 32, y: 576 });
        this.coinLine(start + 32, Math.floor(n / 2), 520, 64);
        return this.ground(170 + n * 32 + 110).land();
    }

    // A staircase of ledges
    steps(n, o) {
        o = o || {};
        const x = this.x;
        for (let i = 0; i < n; i++) {
            this.plat(x + 90 + i * 150, 500 - i * 60, 130);
            this.wp(x + 90 + i * 150, 490 - i * 60, 130);
            this.coin(x + 90 + i * 150, 460 - i * 60);
        }
        if (o.foe) this.foe(x + 90 + (n - 1) * 150, o.foe, 500 - (n - 1) * 60 - 26);
        return this.ground(n * 150 + 70).land();
    }

    // Stairs up to a road of high ledges, with a busier road on the ground
    highLow(len, o) {
        o = o || {};
        const x = this.x;
        for (let i = 0; i < 4; i++) this.plat(x + 90 + i * 150, 500 - i * 60, 130);
        const count = Math.max(1, Math.floor((len - 720) / 250));
        for (let j = 0; j < count; j++) {
            const cx = x + 760 + j * 250;
            this.plat(cx, 320, 160);
            this.coinLine(cx - 40, 3, 280, 40);
            if (o.highFoe && j % 2 === 1) this.foe(cx, o.highFoe, 320 - 26);
        }
        if (o.gem) this.gem(x + 760 + (count - 1) * 250, 255);
        (o.foes || []).forEach((t, i, a) => this.foe(x + 420 + (len - 520) * (i + 0.5) / a.length, t));
        for (let s = 0; s < (o.spikes || 0); s++) this.d.obstacles.push({ x: Math.round(x + 700 + s * 260), y: 555 });
        return this.ground(len).land();
    }

    // A spring up to a ledge
    springUp(o) {
        o = o || {};
        const x = this.x;
        this.d.springs.push({ x: x + 90, y: 550 });
        this.coinLine(x + 90, 3, 430, 0);
        this.d.coins.slice(-3).forEach((c, i) => { c.y = 430 - i * 60; });
        this.plat(x + 220, 330, 140);
        if (o.gem) this.gem(x + 220, 285); else this.coinLine(x + 190, 3, 290, 30);
        if (o.suit) this.d.suits.push({ x: x + 220, y: 295, type: o.suit });
        return this.ground(360).land();
    }

    // A star block that grows a beanstalk
    beanstalk(o) {
        o = o || {};
        const x = this.x + 110;
        this.d.bumpBlocks.push({ x: x, y: 440, contains: 'sprout', leaves: 4 });
        [[34, 330], [-34, 268], [34, 206], [-34, 144]].forEach(([dx, y]) => this.coin(x + dx, y));
        if (o.gem) this.gem(x, 96); else this.coinLine(x - 40, 3, 96, 40);
        if (o.door) {
            // A ledge off the top of the stalk with the door on it
            this.plat(x + 150, 180, 130);
            this.d.doors.push({ id: 'a', x: x + 150, y: 136 });
            this.room = o.door;
        }
        return this.ground(300).land();
    }

    // A roller in front of a row of walkers, with crates at the end
    bowling(n) {
        const x = this.x;
        this.foe(x + 130, 'roller');
        for (let i = 0; i < n; i++) this.foe(x + 330 + i * 60, 'walker');
        const cx = x + 330 + n * 60 + 80;
        this.d.breakableBlocks.push({ x: cx, y: 540, width: 40, height: 40, contains: 'coin' });
        this.d.breakableBlocks.push({ x: cx, y: 500, width: 40, height: 40, contains: null });
        return this.ground(cx - x + 120).land();
    }

    // Crates stacked on the ground: jump them, or pound through
    crates(cols) {
        const x = this.x + 100;
        cols.forEach((h, i) => {
            for (let k = 0; k < h; k++) {
                this.d.breakableBlocks.push({ x: x + i * 40, y: 540 - k * 40, width: 40, height: 40, contains: k === 0 && i % 2 === 0 ? 'coin' : null });
            }
        });
        return this.ground(100 + cols.length * 40 + 100).land();
    }

    // Ground spikes with a coin arc over each
    spikes(n, o) {
        o = o || {};
        const x = this.x;
        const step = o.step || 210;
        for (let i = 0; i < n; i++) {
            const sx = x + 140 + i * step;
            for (let k = 0; k < (o.wide || 1); k++) this.d.obstacles.push({ x: sx + k * 30, y: 555 });
            this.coinArc(sx - 40, sx + 40 + ((o.wide || 1) - 1) * 30, 500, 450, 3);
        }
        if (o.foe) this.foe(x + 140 + step * (n - 0.5), o.foe);
        return this.ground(140 + n * step + 40).land();
    }

    // A zigzag climb to a row of high ledges over a wide gap
    skyClimb(k, m, o) {
        o = o || {};
        const x = this.x;
        let topY = 500;
        for (let i = 0; i < k; i++) {
            topY = 500 - 70 * i;
            this.plat(x + 120 + (i % 2) * 150, topY, 110);
            this.wp(x + 120 + (i % 2) * 150, topY - 10, 110);
            this.coin(x + 120 + (i % 2) * 150, topY - 40);
        }
        const lastX = x + 120 + ((k - 1) % 2) * 150;
        const first = lastX + 240;
        for (let j = 0; j < m; j++) {
            const cx = first + j * 230;
            this.plat(cx, topY, 140);
            this.wp(cx, topY - 10, 140);
            this.coinLine(cx - 30, 2, topY - 40, 60);
            if (o.foe && j % 2 === 1) this.foe(cx, o.foe, o.foe === 'flyer' ? topY - 120 : topY - 26);
        }
        if (o.gem) {
            // A perch one more jump up, over the middle ledge of the crossing
            // (over the ledge, not the gap: there it would block the jump)
            const gx = first + Math.floor(m / 2) * 230;
            this.plat(gx, topY - 75, 60);
            this.gem(gx, topY - 120);
        }
        const pitL = lastX + 100, pitR = first + (m - 1) * 230 + 110;
        this.d.pits.push({ x: (pitL + pitR) / 2, width: pitR - pitL });
        this.top = Math.min(this.top, topY - 340);
        return this.ground(pitR - x + 260).land();
    }

    // The Hopper, waiting on open ground
    hopper() {
        this.d.mounts.push({ x: this.x + 120, y: STAND });
        return this.ground(260).land();
    }

    checkpoint() {
        this.d.checkpoints.push({ x: this.x + 40, y: 545 });
        return this.ground(120).land();
    }

    // A door on the ground to the bonus room
    door(room) {
        this.d.doors.push({ id: 'a', x: this.x + 70, y: 526 });
        this.room = room;
        return this.ground(160).land();
    }

    // The closing arena. The goal stays hidden until the boss falls.
    boss(cfg) {
        this.checkpoint();
        this.ground(200);
        this.extra.bossArena = { x: this.x, width: 480 };
        this.extra.boss = cfg;
        this.ground(560);
        return this.land();
    }

    // --- output ---
    finish() {
        const d = this.d;
        this.ground(180);
        const main = this.x;
        const flagX = main - 110;
        let world = main;
        const out = {
            name: this.name, worldWidth: main, worldHeight: 600
        };
        if (this.top < 0) out.worldTop = Math.round(this.top / 20) * 20;
        out.theme = this.theme;

        if (this.room) {
            // The bonus room sits past the goal behind a wall (see interact.js)
            const rx = main + 40, rw = 1100;
            world = rx + rw + 40;
            out.worldWidth = world;
            out.mainWidth = main;
            out.rooms = [{ x: rx, width: rw }];
            d.doors.push({ id: 'a', x: rx + 70, y: 526 });
            ['coins', 'coin', 'coins'].forEach((c, i) => {
                const b = { x: rx + 260 + i * 40, y: 440, contains: c };
                if (c === 'coins') b.count = 5;
                d.bumpBlocks.push(b);
            });
            this.plat(rx + 560, 470, 160);
            this.plat(rx + 790, 400, 160);
            this.coinLine(rx + 520, 3, 430, 40);
            this.coinLine(rx + 750, 3, 360, 40);
            this.coinLine(rx + 420, 3, 540, 40);
            if (this.room.gem) this.gem(rx + 790, 340);
            if (this.room.suit) d.suits.push({ x: rx + 180, y: 530, type: this.room.suit });
            if (this.room.secret) out.secretExit = { x: rx + 1010, y: 560 };
            else this.coinLine(rx + 920, 4, 540, 40);
        }

        if (d.gems.length !== 3) throw new Error(`${this.id}: ${d.gems.length} gems, need 3`);
        Object.keys(d).forEach(k => { if (d[k].length || ['platforms', 'movingPlatforms', 'obstacles', 'enemies', 'coins', 'checkpoints', 'powerUps', 'breakableBlocks'].includes(k)) out[k] = d[k]; });
        Object.assign(out, this.extra);
        // Roughly: the run at full speed, plus time for the platforming
        out.targetTime = Math.round(main / 220 * 1.9) * 1000;
        out.playerStart = { x: 60, y: 540 };
        out.flagPosition = { x: flagX, y: 555 };
        return out;
    }
}

// ========================
// Recipes
// ========================
// Each level leans on one idea: it is shown somewhere safe, then with a
// catch, then mixed with what came before. Three gems per level.

const RECIPES = {
    // ---- World 1: Green Meadows ----
    w1_2: ['Clover Hills', 'meadow', L => L
        .run(420, { coins: 6 })
        .blocks(['coin', 'coins', 'coin'])
        .run(360, { foes: ['walker'] })
        .pit(100)
        .steps(3)
        .run(380, { foes: ['walker', 'walker'], coins: 4 })
        .pit(120)
        .checkpoint()
        .springUp({ gem: true })
        .islands(3)
        .bowling(3)
        .beanstalk({ door: { gem: true, secret: true } })
        .checkpoint()
        .pit(130)
        .blocks(['coin', 'cape', 'coin'], { foes: ['jumper'] })
        .highLow(1240, { gem: true, foes: ['walker', 'jumper', 'walker'] })
        .islands(2)
        .run(420, { coins: 6 })],

    w1_3: ['Windmill Fields', 'meadow', L => L
        .run(380, { coins: 5 })
        .crates([1, 2, 1])
        .run(320, { foes: ['walker'] })
        .crates([2, 3, 3, 2])
        .hopper()
        .islands(3, { gap: 125, gem: 1 })
        .checkpoint()
        .run(420, { foes: ['jumper', 'walker'] })
        .movers(2)
        .blocks(['coins', ['coin', 'hidden'], 'rang'])
        .bowling(4)
        .checkpoint()
        .cannonPit()
        .spikes(3)
        .door({ gem: true })
        .highLow(990, { gem: true, foes: ['roller', 'walker', 'walker'], spikes: 1 })
        .pit(130)
        .run(420, { coins: 6 })],

    w1_4: ['Bramble Keep', 'meadow', L => L
        .run(380, { coins: 5 })
        .spikes(3, { foe: 'walker' })
        .blocks(['coin', 'claw'])
        .crumble(3)
        .checkpoint()
        .run(360, { foes: ['jumper', 'jumper'] })
        .switchBridge(8)
        .springUp({ gem: true })
        .islands(4, { foe: 'flyer', gem: 2 })
        .checkpoint()
        .bowling(3)
        .ropePit()
        .beanstalk({ gem: true })
        .run(300, { foes: ['shield'] })
        .boss({ name: 'KING BRAMBLE', hp: 3, phases: 1, color: 0x2f6b2a, strokeColor: 0x8be04e, coreColor: 0xfff07a, score: 600 })],

    // ---- World 2: Coin Canyon ----
    w2_2: ['Mesa Run', 'canyon', L => L
        .run(400, { coins: 6 })
        .steps(3, { foe: 'jumper' })
        .pit(130)
        .bowling(4)
        .blocks(['coins', 'coin', 'cape'])
        .islands(4, { wave: 40 })
        .checkpoint()
        .cannonPit()
        .run(380, { foes: ['walker', 'jumper'] })
        .springUp({ gem: true })
        .spikes(3, { wide: 2 })
        .door({ gem: true, secret: true })
        .checkpoint()
        .movers(3)
        .highLow(1240, { gem: true, foes: ['walker', 'shooter', 'walker'], highFoe: 'walker' })
        .crumble(3)
        .run(420, { coins: 6 })],

    w2_3: ['Moonlit Gulch', 'canyonNight', L => L
        .run(380, { coins: 5 })
        .ropePit()
        .run(340, { foes: ['walker', 'walker'] })
        .blocks(['coin', 'rang', 'coin'])
        .ropePit()
        .checkpoint()
        .islands(4, { foe: 'flyer', gem: 1 })
        .bowling(3)
        .switchBridge(9)
        .hopper()
        .spikes(4, { wide: 2 })
        .checkpoint()
        .skyClimb(6, 3, { gem: true, foe: 'flyer' })
        .run(360, { foes: ['charger'] })
        .beanstalk({ gem: true })
        .crumble(4)
        .run(420, { coins: 6 })],

    w2_4: ['Rattlesnake Ridge', 'canyon', L => L
        .run(380, { coins: 5 })
        .spikes(3, { wide: 2, foe: 'jumper' })
        .movers(3)
        .blocks(['coin', 'claw', 'coins'])
        .checkpoint()
        .highLow(1240, { gem: true, foes: ['charger', 'walker', 'shooter'], spikes: 2 })
        .cannonPit()
        .islands(4, { wave: 50, foe: 'flyer', gem: 3 })
        .checkpoint()
        .bowling(4)
        .ropePit()
        .springUp({ gem: true })
        .run(300, { foes: ['shield'] })
        .boss({ name: 'DUST DEVIL', hp: 4, phases: 1, color: 0xb86a2a, strokeColor: 0xffc27a, coreColor: 0xfff2c0, score: 800 })],

    // ---- World 3: Crystal Caves ----
    w3_2: ['Glowworm Grotto', 'cave', L => L
        .run(380, { coins: 5 })
        .crumble(3)
        .run(340, { foes: ['walker', 'jumper'] })
        .blocks(['coins', 'claw', 'coin'])
        .skyClimb(6, 3, { gem: true })
        .checkpoint()
        .crates([2, 3, 2])
        .switchBridge(9)
        .bowling(3)
        .islands(4, { gap: 125, foe: 'flyer' })
        .checkpoint()
        .springUp({ gem: true })
        .spikes(4, { wide: 2, foe: 'shield' })
        .door({ gem: true })
        .movers(3)
        .highLow(990, { foes: ['shooter', 'walker'], highFoe: 'jumper' })
        .run(420, { coins: 6 })],

    w3_3: ['Echo Deep', 'cave', L => L
        .run(380, { coins: 5 })
        .cannonPit()
        .run(320, { foes: ['shooter'] })
        .crumble(4)
        .blocks(['coin', 'cape', 'coin'])
        .skyClimb(8, 4, { gem: true, foe: 'flyer' })
        .checkpoint()
        .hopper()
        .islands(5, { wave: 40, foe: 'flyer', gem: 2 })
        .bowling(4)
        .checkpoint()
        .ropePit()
        .spikes(3, { wide: 3 })
        .switchBridge(10)
        .beanstalk({ gem: true })
        .movers(3)
        .run(420, { coins: 6, foes: ['charger'] })],

    w3_4: ['The Geode', 'cave', L => L
        .run(380, { coins: 5 })
        .islands(4, { foe: 'flyer', gem: 1 })
        .blocks(['coin', 'rang', 'coins'])
        .crumble(4)
        .checkpoint()
        .highLow(1240, { gem: true, foes: ['shield', 'jumper', 'charger'], highFoe: 'shooter', spikes: 2 })
        .cannonPit()
        .ropePit()
        .checkpoint()
        .switchBridge(10)
        .springUp({ gem: true })
        .spikes(3, { wide: 2, foe: 'shield' })
        .boss({ name: 'CRYSTAL COLOSSUS', hp: 5, phases: 2, color: 0x2a6f8a, strokeColor: 0x6fe6ff, coreColor: 0xe0fbff, score: 1000 })],

    // ---- World 4: Sunset Fortress ----
    w4_2: ['Rampart Row', 'fortress', L => L
        .run(380, { coins: 5 })
        .spikes(4, { wide: 2, foe: 'shield' })
        .ropePit()
        .blocks(['coins', 'claw'])
        .run(380, { foes: ['shooter', 'jumper'] })
        .movers(3)
        .checkpoint()
        .skyClimb(8, 4, { gem: true, foe: 'flyer' })
        .bowling(4)
        .door({ gem: true, secret: true })
        .crumble(4)
        .checkpoint()
        .cannonPit()
        .highLow(1240, { gem: true, foes: ['charger', 'shield', 'shooter'], highFoe: 'jumper', spikes: 2 })
        .switchBridge(10)
        .islands(4, { wave: 50, foe: 'flyer' })
        .run(420, { coins: 6 })],

    w4_3: ['Midnight Battlements', 'castleNight', L => L
        .run(380, { coins: 5 })
        .crumble(4)
        .run(340, { foes: ['charger', 'shield'] })
        .blocks(['coin', 'cape', 'coins'])
        .islands(5, { wave: 50, foe: 'flyer', gem: 2 })
        .checkpoint()
        .ropePit()
        .ropePit()
        .hopper()
        .spikes(5, { wide: 2, step: 150 })
        .checkpoint()
        .switchBridge(11)
        .skyClimb(9, 4, { gem: true, foe: 'flyer' })
        .bowling(5)
        .springUp({ gem: true })
        .movers(4)
        .run(420, { coins: 6, foes: ['shooter'] })],

    // ---- World 5: Wild Heights ----
    w5_3: ['Canopy Road', 'jungle', L => L
        .run(380, { coins: 5 })
        .ropePit()
        .ropePit()
        .blocks(['coin', 'claw', 'coin'])
        .run(340, { foes: ['jumper', 'diver'] })
        .skyClimb(9, 5, { gem: true, foe: 'flyer' })
        .checkpoint()
        .crumble(5)
        .bowling(4)
        .door({ gem: true, secret: true, suit: 'cape' })
        .islands(5, { wave: 50, foe: 'flyer' })
        .checkpoint()
        .cannonPit()
        .spikes(4, { wide: 3, foe: 'charger' })
        .ropePit()
        .highLow(1240, { gem: true, foes: ['shield', 'charger', 'shooter'], highFoe: 'jumper', spikes: 2 })
        .run(420, { coins: 6 })],

    w5_4: ['Thunderhead', 'sky', L => L
        .run(380, { coins: 5 })
        .hopper()
        .islands(5, { wave: 50, foe: 'flyer', gem: 2 })
        .blocks(['coins', 'cape'])
        .cannonPit()
        .checkpoint()
        .skyClimb(10, 5, { gem: true, foe: 'flyer' })
        .movers(4)
        .run(340, { foes: ['diver', 'jumper'] })
        .checkpoint()
        .crumble(5)
        .springUp({ gem: true })
        .ropePit()
        .run(300, { foes: ['shield'] })
        .boss({ name: 'STORM WARDEN', hp: 6, phases: 2, color: 0x4a5a8a, strokeColor: 0xbcd4ff, coreColor: 0xfff7a8, score: 1200 })],

    // ---- World 6: The Tower ----
    w6_3: ['Clockwork Heart', 'machine', L => L
        .run(380, { coins: 5 })
        .movers(4)
        .spikes(5, { wide: 3, step: 160, foe: 'charger' })
        .blocks(['coin', 'rang', 'coins'])
        .crumble(5)
        .checkpoint()
        .cannonPit()
        .ropePit()
        .skyClimb(10, 5, { gem: true, foe: 'flyer' })
        .checkpoint()
        .switchBridge(12)
        .bowling(5)
        .islands(6, { wave: 50, foe: 'flyer', gem: 3 })
        .hopper()
        .checkpoint()
        .highLow(1490, { gem: true, foes: ['shield', 'charger', 'shooter', 'shield'], highFoe: 'shooter', spikes: 3 })
        .ropePit()
        .movers(4)
        .run(420, { coins: 6 })]
};

const outDir = path.join(__dirname, '..', 'levels');
const fmt = (v, ind) => {
    const pad = ' '.repeat(ind);
    if (Array.isArray(v)) {
        if (!v.length) return '[]';
        return '[\n' + v.map(e => pad + '    ' + flat(e)).join(',\n') + '\n' + pad + ']';
    }
    return flat(v);
};
const hex = n => '0x' + n.toString(16).padStart(6, '0');
function flat(v) {
    if (v === null) return 'null';
    if (typeof v === 'string') return `'${v}'`;
    if (typeof v !== 'object') return String(v);
    if (Array.isArray(v)) return '[' + v.map(flat).join(', ') + ']';
    return '{ ' + Object.keys(v).map(k => `${k}: ${/color/i.test(k) && typeof v[k] === 'number' ? hex(v[k]) : flat(v[k])}`).join(', ') + ' }';
}

const built = {};
const routes = {};
Object.keys(RECIPES).forEach(id => {
    const [name, theme, recipe] = RECIPES[id];
    const L = new Level(id, name, theme);
    recipe(L);
    const data = L.finish();
    built[id] = data;
    routes[id] = L.route;
    const body = Object.keys(data).map(k => `    ${k}: ${fmt(data[k], 4)}`).join(',\n\n');
    const src = `// Generated by tools/build-levels.js — edit the recipe there, not this file.\nconst level_${id} = {\n${body}\n};\n`;
    fs.writeFileSync(path.join(outDir, id + '.js'), src);
    if (require.main === module) console.log(id.padEnd(6), name.padEnd(22), 'width', String(data.mainWidth || data.worldWidth).padStart(6),
        'coins', String(data.coins.length).padStart(3), 'foes', String(data.enemies.length).padStart(3),
        'pits', (data.pits || []).length, data.worldTop ? 'top ' + data.worldTop : '');
});
module.exports = { built, routes };
