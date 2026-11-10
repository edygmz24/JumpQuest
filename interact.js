// ========================
// Interactables — a world you can touch
// ========================
// Everything here is data-driven from the level files and follows the same
// split as the rest of the game: an invisible Arcade body plus a visual that
// follows it.
//
//   bumpBlocks   [{x, y, contains, count, hidden, leaves}]
//                Star blocks. Hit from below (or pound from above) to shake
//                out what is inside: 'coin', 'coins' (several), a power-up
//                type, or 'sprout' (grows a leaf ladder). `hidden` blocks
//                are invisible until hit.
//   enemies      type 'roller' — stomp it and it tucks into a shell. Walk
//                into the shell to kick it, or hold DOWN to pick it up and
//                press DOWN (or dash) to throw it. A sliding shell clears
//                enemies, breaks crates and hits star blocks.
//   doors        [{id, x, y}] in pairs. Press DOWN in front of one to come
//                out of its twin. With `rooms` [{x, width}] and `mainWidth`
//                the twin can sit in a walled-off bonus room past the goal.
//   switches     [{x, y}] and switchBlocks [{x, y}]. Stomping a switch turns
//                the blue ghost coins into solid blocks for a few seconds.
//   cannons      [{x, y, angle, power}] Hop in, get fired. Jump fires early.
//   ropes        [{x, y, length, swing}] Swinging ropes. Grab the end in
//                mid-air, jump to let go with the swing's momentum.

const BLOCK_SIZE = 40;
const SHELL_SPEED = 380;
const SHELL_MAX_BOUNCES = 5;
const SWITCH_TIME = 8000;
const CANNON_FUSE = 520;
const CANNON_POWER = 760;
const ROPE_GRAVITY = 900;

let controlLocked = false;      // player input is owned by a cannon, rope or door
let iaScene = null;
let iaBumpGroup = null;
let iaBlocks = [];
let iaShellGroup = null;
let iaShells = [];
let iaCarried = null;           // the shell held overhead, if any
let iaCarryTime = 0;
let iaDoors = [];
let iaDoorBusy = false;
let iaRooms = [];
let iaSwitches = [];
let iaSwitchGroup = null;
let iaSwitchBlocks = [];
let iaSwitchTimer = 0;
let iaSwitchBar = null;
let iaCannons = [];
let iaInCannon = null;
let iaCannonCooldown = 0;
let iaRopes = [];
let iaOnRope = null;
let iaRopeCooldown = 0;
let iaPrevJump = false;
let iaPrevDown = false;
let iaTime = 0;

function resetInteractState() {
    controlLocked = false;
    iaScene = null;
    iaBumpGroup = null;
    iaBlocks = [];
    iaShellGroup = null;
    iaShells = [];
    iaCarried = null;
    iaCarryTime = 0;
    iaDoors = [];
    iaDoorBusy = false;
    iaRooms = [];
    iaSwitches = [];
    iaSwitchGroup = null;
    iaSwitchBlocks = [];
    iaSwitchTimer = 0;
    iaSwitchBar = null;
    iaCannons = [];
    iaInCannon = null;
    iaCannonCooldown = 0;
    iaRopes = [];
    iaOnRope = null;
    iaRopeCooldown = 0;
    iaPrevJump = false;
    iaPrevDown = false;
    iaTime = 0;
}

function playerCarrying() { return !!iaCarried; }
function playerOnRope() { return !!iaOnRope; }

// One-time hint the first time the player comes near a new kind of object
function iaHint(scene, key, text) {
    if (typeof tutorialShown === 'undefined' || typeof showTutorialHint !== 'function') return;
    if (tutorialShown['ia_' + key]) return;
    if (typeof activeTutorialHint !== 'undefined' && activeTutorialHint) return;
    tutorialShown['ia_' + key] = true;
    localStorage.setItem('jqTutorialShown', JSON.stringify(tutorialShown));
    showTutorialHint(scene, text);
}

function iaNear(x, y, range) {
    return Math.abs(player.x - x) < range && Math.abs(player.y - y) < range;
}

// ========================
// Art
// ========================

function iaRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function iaStar(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
}

function iaBlockArt(ctx, top, mid, low, edge, emblem) {
    const g = ctx.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, low);
    iaRoundRect(ctx, 1, 1, 38, 38, 6);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();
    // Bevel
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(5, 34); ctx.lineTo(5, 7); ctx.quadraticCurveTo(5, 5, 7, 5); ctx.lineTo(34, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.moveTo(35, 7); ctx.lineTo(35, 35); ctx.lineTo(7, 35); ctx.stroke();
    // Rivets
    ctx.fillStyle = edge;
    [[8, 8], [32, 8], [8, 32], [32, 32]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); });
    if (emblem) emblem(ctx);
}

function interactTextures(scene) {
    if (scene.textures.exists('ia_block')) return;
    const tex = (key, w, h, draw) => hdTexture(scene, key, w, h, draw);

    tex('ia_block', 40, 40, ctx => iaBlockArt(ctx, '#ffe680', '#ffbf2e', '#e08a12', '#7a4306', c => {
        iaStar(c, 20, 21, 10.5, 4.6);
        c.fillStyle = '#fffdf2'; c.fill();
        c.strokeStyle = '#8a4d08'; c.lineWidth = 1.4; c.stroke();
    }));
    tex('ia_block_used', 40, 40, ctx => iaBlockArt(ctx, '#b9a48a', '#96826a', '#6e5d4a', '#3f3327', null));
    tex('ia_swblock', 32, 32, ctx => {
        ctx.scale(0.8, 0.8);
        iaBlockArt(ctx, '#9fd4ff', '#4b9cf0', '#235fc0', '#12357a', c => {
            c.fillStyle = 'rgba(255,255,255,0.75)';
            c.beginPath(); c.arc(20, 20, 6, 0, Math.PI * 2); c.fill();
        });
    });
    tex('ia_swcoin', 24, 24, ctx => {
        ctx.strokeStyle = 'rgba(150,210,255,1)'; ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(120,190,255,0.6)';
        ctx.beginPath(); ctx.arc(12, 12, 6, 0, Math.PI * 2); ctx.fill();
    });
    tex('ia_switch', 40, 22, ctx => {
        const g = ctx.createLinearGradient(0, 0, 0, 16);
        g.addColorStop(0, '#9fd4ff'); g.addColorStop(1, '#2a6fd6');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(6, 16); ctx.quadraticCurveTo(6, 1, 20, 1); ctx.quadraticCurveTo(34, 1, 34, 16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#12357a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(15, 6, 5, 2, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a5568'; iaRoundRect(ctx, 1, 15, 38, 7, 2); ctx.fill();
        ctx.strokeStyle = '#1f2733'; ctx.lineWidth = 1; ctx.stroke();
    });
    tex('ia_switch_down', 40, 22, ctx => {
        ctx.fillStyle = '#2a6fd6'; iaRoundRect(ctx, 6, 11, 28, 5, 2); ctx.fill();
        ctx.strokeStyle = '#12357a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#4a5568'; iaRoundRect(ctx, 1, 15, 38, 7, 2); ctx.fill();
        ctx.strokeStyle = '#1f2733'; ctx.lineWidth = 1; ctx.stroke();
    });
    tex('ia_door', 48, 68, ctx => {
        // Stone arch
        ctx.fillStyle = '#6b6f7c';
        ctx.beginPath(); ctx.moveTo(1, 68); ctx.lineTo(1, 24); ctx.quadraticCurveTo(1, 1, 24, 1); ctx.quadraticCurveTo(47, 1, 47, 24); ctx.lineTo(47, 68); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2c2f38'; ctx.lineWidth = 2; ctx.stroke();
        // Door leaf
        const g = ctx.createLinearGradient(0, 0, 48, 0);
        g.addColorStop(0, '#8a5326'); g.addColorStop(0.5, '#b0713a'); g.addColorStop(1, '#7a471f');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(7, 68); ctx.lineTo(7, 25); ctx.quadraticCurveTo(7, 7, 24, 7); ctx.quadraticCurveTo(41, 7, 41, 25); ctx.lineTo(41, 68); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3d2410'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(61,36,16,0.6)'; ctx.lineWidth = 1;
        [16, 24, 32].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 68); ctx.stroke(); });
        // Star window and handle
        iaStar(ctx, 24, 26, 7, 3); ctx.fillStyle = '#ffe680'; ctx.fill();
        ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(35, 44, 2.4, 0, Math.PI * 2); ctx.fill();
    });
    tex('ia_cannon', 64, 44, ctx => {
        // Barrel pointing right; rotates about its centre
        const g = ctx.createLinearGradient(0, 4, 0, 40);
        g.addColorStop(0, '#7b8496'); g.addColorStop(0.45, '#3d4452'); g.addColorStop(1, '#161a22');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(6, 8); ctx.quadraticCurveTo(0, 22, 6, 36);
        ctx.lineTo(54, 40); ctx.lineTo(54, 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0b0d12'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#c9952e'; iaRoundRect(ctx, 52, 1, 10, 42, 3); ctx.fill();
        ctx.strokeStyle = '#5c3d0a'; ctx.stroke();
        ctx.fillStyle = '#c9952e'; ctx.fillRect(20, 6, 5, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(8, 9, 44, 3);
    });
    tex('ia_cannon_base', 52, 30, ctx => {
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath(); ctx.moveTo(4, 30); ctx.lineTo(16, 4); ctx.lineTo(36, 4); ctx.lineTo(48, 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2e1d0c'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#c9952e'; ctx.beginPath(); ctx.arc(26, 9, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5c3d0a'; ctx.stroke();
    });
    tex('ia_arrow', 20, 14, ctx => {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(10, 5); ctx.lineTo(10, 0); ctx.lineTo(20, 7); ctx.lineTo(10, 14); ctx.lineTo(10, 9); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    });
    tex('ia_rope', 6, 16, ctx => {
        ctx.fillStyle = '#b08a4e'; ctx.fillRect(1, 0, 4, 16);
        ctx.strokeStyle = '#6e5126'; ctx.lineWidth = 1;
        [0, 8].forEach(y => { ctx.beginPath(); ctx.moveTo(1, y + 6); ctx.lineTo(5, y); ctx.stroke(); });
    });
    tex('ia_grip', 20, 20, ctx => {
        ctx.strokeStyle = '#d9b36a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(10, 10, 6.5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#6e5126'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(10, 10, 8.6, 0, Math.PI * 2); ctx.stroke();
    });
    tex('ia_hook', 18, 12, ctx => {
        ctx.fillStyle = '#4a5568'; iaRoundRect(ctx, 0, 0, 18, 8, 3); ctx.fill();
        ctx.strokeStyle = '#1f2733'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#c9952e'; ctx.beginPath(); ctx.arc(9, 8, 3, 0, Math.PI * 2); ctx.fill();
    });
    tex('ia_leaf', 60, 22, ctx => {
        const g = ctx.createLinearGradient(0, 0, 0, 18);
        g.addColorStop(0, '#8be04e'); g.addColorStop(1, '#2f8f2a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(2, 9); ctx.quadraticCurveTo(30, -6, 58, 9); ctx.quadraticCurveTo(30, 24, 2, 9); ctx.fill();
        ctx.strokeStyle = '#1c5a1a'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 9); ctx.lineTo(54, 9); ctx.stroke();
    });
    tex('ia_stalk', 10, 32, ctx => {
        ctx.strokeStyle = '#2f8f2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(5, 32); ctx.bezierCurveTo(-1, 24, 11, 8, 5, 0); ctx.stroke();
        ctx.strokeStyle = '#8be04e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(6, 32); ctx.bezierCurveTo(0, 24, 12, 8, 6, 0); ctx.stroke();
    });
    tex('ia_shell', 32, 26, ctx => {
        const g = ctx.createRadialGradient(20, 7, 1, 16, 14, 17);
        g.addColorStop(0, '#c8ff9a'); g.addColorStop(0.5, '#39b54a'); g.addColorStop(1, '#0f5a22');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(2, 21); ctx.quadraticCurveTo(2, 2, 16, 2); ctx.quadraticCurveTo(30, 2, 30, 21); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#073816'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(7,56,22,0.7)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(16, 14, 7, 0.3, Math.PI * 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(16.5, 14, 3.2, 1.2, Math.PI * 2.4); ctx.stroke();
        ctx.fillStyle = '#f4e3b0'; iaRoundRect(ctx, 1, 19, 30, 6, 3); ctx.fill();
        ctx.strokeStyle = '#7a5a1c'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(21, 7, 4, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    });
    // Roller: a green snail-beetle with a spiral shell. The same art serves
    // both looks; four walk frames.
    for (let f = 0; f < 4; f++) {
        const draw = (ctx) => {
            const bob = hdWalkCycleFeet(ctx, f, 12, 22, 29, '#7a5a1c', '#5a4010');
            const by = 3 + bob;
            hdShell(ctx, 2, by + 1, 30, 25, ['#c8ff9a', '#39b54a', '#0f5a22'], 'rgba(7,56,22,0.85)');
            ctx.strokeStyle = 'rgba(7,56,22,0.6)'; ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.arc(11, by + 12, 6, 0.3, Math.PI * 1.9); ctx.stroke();
            ctx.beginPath(); ctx.arc(11.5, by + 12, 2.6, 1.2, Math.PI * 2.4); ctx.stroke();
            hdEyes(ctx, [[19, by + 14, 3.2], [26, by + 14, 3.2]], '#073816', [1.2, 0.6], null);
        };
        tex('hd_tex_enemy_roller' + (f ? '_' + f : ''), 34, 32, draw);
        if (f === 0) tex('tex_enemy_roller', 34, 32, draw);
    }
}

// ========================
// Build
// ========================

function buildInteractables(scene) {
    iaScene = scene;
    // Endless mode borrows level 1 as a blank canvas and generates its own
    // course, so none of that level's set pieces belong in it.
    const lvl = (typeof endlessMode !== 'undefined' && endlessMode) ? {} : currentLevel;

    // --- Star blocks ---
    iaBumpGroup = scene.physics.add.staticGroup();
    (lvl.bumpBlocks || []).forEach(d => {
        const body = iaBumpGroup.create(d.x, d.y, null).setDisplaySize(BLOCK_SIZE, BLOCK_SIZE).setVisible(false).refreshBody();
        const img = scene.add.image(d.x, d.y, 'ia_block').setDepth(2);
        const contains = d.contains || 'coin';
        const b = {
            body: body, img: img, x: d.x, y: d.y, contains: contains,
            left: contains === 'coins' ? (d.count || 5) : 1,
            hidden: !!d.hidden, used: false, lastHit: 0, leaves: d.leaves || 4
        };
        if (b.hidden) {
            img.setVisible(false);
            body.body.checkCollision.up = false;
            body.body.checkCollision.left = false;
            body.body.checkCollision.right = false;
        }
        if (contains === 'coin' || contains === 'coins') totalLevelCoins += b.left;
        body.iaBlock = b;
        iaBlocks.push(b);
    });
    scene.physics.add.collider(player, iaBumpGroup, iaPlayerHitsBlock, iaBlockProcess, scene);
    scene.physics.add.collider(enemies, iaBumpGroup);

    // --- Switch blocks ---
    iaSwitchGroup = scene.physics.add.staticGroup();
    (lvl.switchBlocks || []).forEach(d => {
        const body = iaSwitchGroup.create(d.x, d.y, null).setDisplaySize(32, 32).setVisible(false).refreshBody();
        body.body.enable = false;
        const img = scene.add.image(d.x, d.y, 'ia_swcoin').setDepth(2);
        iaSwitchBlocks.push({ body: body, img: img, x: d.x, y: d.y, solid: false });
    });
    scene.physics.add.collider(player, iaSwitchGroup);
    scene.physics.add.collider(enemies, iaSwitchGroup);

    (lvl.switches || []).forEach(d => {
        const img = scene.add.image(d.x, d.y, 'ia_switch').setDepth(2);
        iaSwitches.push({ x: d.x, y: d.y, img: img });
    });

    // --- Shells ---
    iaShellGroup = scene.physics.add.group();
    scene.physics.add.collider(iaShellGroup, platforms);
    scene.physics.add.collider(iaShellGroup, iaSwitchGroup);
    // Phaser does not promise the argument order for group pairs, so each
    // callback works out which of the two is the shell.
    const pair = (a, b) => (a.iaShell ? [a, b] : [b, a]);
    scene.physics.add.collider(iaShellGroup, iaBumpGroup, (a, b) => {
        const [shell, block] = pair(a, b);
        if (shell.iaShell.state === 'slide' && block.iaBlock) iaBumpBlock(scene, block.iaBlock, 'side');
    });
    scene.physics.add.collider(iaShellGroup, breakableBlocks, (a, b) => {
        const [shell, block] = pair(a, b);
        if (shell.iaShell.state === 'slide' && block.active) {
            breakBlock.call(scene, block);
            shell.iaShell.pierce = shell.iaShell.dir;
        }
    });
    scene.physics.add.overlap(iaShellGroup, enemies, (a, b) => {
        const [shell, enemy] = pair(a, b);
        if (shell.iaShell.state !== 'slide' || !enemy.active) return;
        enemy.noShell = true;
        stompEnemy.call(scene, enemy);
    });
    scene.physics.add.overlap(player, iaShellGroup, iaPlayerTouchesShell, null, scene);

    // --- Bonus rooms: walled-off stretches past the goal, reached by door ---
    iaRooms = (lvl.rooms || []).map(r => ({ x: r.x, width: r.width }));
    if (iaRooms.length) {
        const wall = (x) => {
            platforms.create(x, currentLevel.worldHeight / 2, null).setDisplaySize(40, currentLevel.worldHeight).setVisible(false).refreshBody();
        };
        wall((lvl.mainWidth || lvl.worldWidth) + 20);
        iaRooms.forEach(r => {
            wall(r.x + r.width + 20);
            // A dark backdrop turns the stretch into an underground chamber
            scene.add.rectangle(r.x - 40, 0, r.width + 80, lvl.worldHeight, 0x0b0f1a, 0.86)
                .setOrigin(0, 0).setDepth(-3);
        });
        iaApplyCameraBounds(scene);
    }

    // --- Doors ---
    (lvl.doors || []).forEach(d => {
        const img = scene.add.image(d.x, d.y, 'ia_door').setDepth(1);
        const prompt = scene.add.text(d.x, d.y - 50, '▼', {
            fontSize: '16px', fill: '#ffe680', fontStyle: 'bold', stroke: '#3d2410', strokeThickness: 3
        }).setOrigin(0.5).setDepth(12).setAlpha(0);
        iaDoors.push({ id: d.id, x: d.x, y: d.y, img: img, prompt: prompt });
    });

    // --- Cannons ---
    (lvl.cannons || []).forEach(d => {
        const angle = Phaser.Math.DegToRad(d.angle === undefined ? -45 : d.angle);
        const base = scene.add.image(d.x, d.y + 18, 'ia_cannon_base').setDepth(3);
        const barrel = scene.add.image(d.x, d.y, 'ia_cannon').setDepth(11).setRotation(angle);
        const arrow = scene.add.image(d.x + Math.cos(angle) * 58, d.y + Math.sin(angle) * 58, 'ia_arrow')
            .setDepth(11).setRotation(angle).setAlpha(0.7);
        scene.tweens.add({
            targets: arrow, alpha: 0.2, duration: 500, yoyo: true, repeat: -1,
            x: d.x + Math.cos(angle) * 70, y: d.y + Math.sin(angle) * 70
        });
        iaCannons.push({ x: d.x, y: d.y, angle: angle, power: d.power || CANNON_POWER, barrel: barrel, base: base, fuse: 0 });
    });

    // --- Ropes ---
    (lvl.ropes || []).forEach((d, i) => {
        const length = d.length || 140;
        const swing = Phaser.Math.DegToRad(d.swing || 50);
        scene.add.image(d.x, d.y, 'ia_hook').setDepth(4).setOrigin(0.5, 0.3);
        const rope = scene.add.tileSprite(d.x, d.y, 6, length, 'ia_rope').setOrigin(0.5, 0).setDepth(4);
        const grip = scene.add.image(d.x, d.y + length, 'ia_grip').setDepth(11);
        iaRopes.push({
            x: d.x, y: d.y, length: length, swing: swing,
            omega: Math.sqrt(ROPE_GRAVITY / length), phase: i * 1.3,
            rope: rope, grip: grip, theta: 0, thetaV: 0, tipX: d.x, tipY: d.y + length
        });
    });
}

// The camera is boxed into whichever stretch the player is in: the level
// proper, or one bonus room.
function iaApplyCameraBounds(scene) {
    if (!iaRooms.length) return;
    const lvl = currentLevel;
    const room = iaRooms.find(r => player.x >= r.x && player.x <= r.x + r.width);
    const cam = scene.cameras.main;
    if (room) cam.setBounds(room.x, 0, Math.max(room.width, VIEW_W), lvl.worldHeight);
    else cam.setBounds(0, 0, lvl.mainWidth || lvl.worldWidth, lvl.worldHeight);
}

// ========================
// Star blocks
// ========================

// Hidden blocks only exist for a player rising into them from underneath
function iaBlockProcess(playerObj, block) {
    const b = block.iaBlock;
    if (!b || !b.hidden) return true;
    return player.body.velocity.y < 0 && player.body.prev.y >= block.body.bottom - 8;
}

function iaPlayerHitsBlock(playerObj, block) {
    const b = block.iaBlock;
    if (!b) return;
    const fromBelow = player.body.touching.up && player.body.y >= block.body.bottom - 6;
    const pounded = isPounding && player.body.touching.down && player.body.bottom <= block.body.y + 6;
    if (fromBelow) iaBumpBlock(this, b, 'below');
    else if (pounded) iaBumpBlock(this, b, 'above');
}

function iaBumpBlock(scene, b, from) {
    if (iaTime - b.lastHit < 180) return;
    b.lastHit = iaTime;

    if (b.hidden) {
        b.hidden = false;
        b.img.setVisible(true);
        b.body.body.checkCollision.up = true;
        b.body.body.checkCollision.left = true;
        b.body.body.checkCollision.right = true;
        if (typeof flowAddSecret === 'function') flowAddSecret();
        showScorePopup(scene, b.x, b.y - 34, 'SECRET!', '#ffe680');
    }

    // The block jolts away from the hit
    const dy = from === 'above' ? 6 : (from === 'side' ? 0 : -10);
    b.img.y = b.y;
    scene.tweens.add({
        targets: b.img, y: b.y + dy, x: b.x + (from === 'side' ? 4 : 0),
        duration: 70, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => b.img.setPosition(b.x, b.y)
    });

    if (b.used) {
        playSound('wallSlide');
        return;
    }

    // Anything standing on the block is knocked off it
    if (from !== 'above') {
        enemies.children.entries.slice().forEach(e => {
            if (!e.active || !e.body) return;
            if (Math.abs(e.x - b.x) < 34 && Math.abs(e.body.bottom - (b.y - 20)) < 8) {
                e.noShell = true;
                stompEnemy.call(scene, e);
            }
        });
    }

    const topY = b.y - BLOCK_SIZE / 2;
    if (b.contains === 'coin' || b.contains === 'coins') {
        iaPopCoin(scene, b.x, topY);
    } else if (b.contains === 'sprout') {
        iaGrowSprout(scene, b);
    } else if (typeof SUIT_TYPES !== 'undefined' && SUIT_TYPES[b.contains]) {
        spawnSuitPickup(scene, b.x, topY - 18, b.contains, true);
        playSound('powerup');
    } else if (POWERUP_TYPES[b.contains]) {
        const pu = powerUps.create(b.x, topY - 16, null).setDisplaySize(25, 25).setVisible(false).refreshBody();
        pu.powerUpType = b.contains;
        const rect = scene.add.image(b.x, b.y, artKey('tex_gem')).setTint(POWERUP_TYPES[b.contains].color);
        powerUpRects.push({ rect: rect, body: pu });
        scene.tweens.add({ targets: rect, y: topY - 16, duration: 260, ease: 'Back.easeOut' });
        playSound('powerup');
    }
    spawnParticles(scene, b.x, topY, 0xffe680, 6, 45);

    b.left--;
    if (b.left <= 0) {
        b.used = true;
        b.img.setTexture('ia_block_used');
    }
}

// A coin that jumps out of a block and is banked on the spot
function iaPopCoin(scene, x, topY) {
    const coin = coins.create(x, topY - 24, null).setDisplaySize(20, 20).setVisible(false).refreshBody();
    const rect = scene.add.image(x, topY - 24, artKey('tex_coin')).setVisible(false);
    coinRects.push({ rect: rect, body: coin });
    collectCoin.call(scene, player, coin);

    const fly = scene.add.image(x, topY - 6, artKey('tex_coin')).setDepth(12);
    scene.tweens.add({
        targets: fly, y: topY - 62, duration: 260, ease: 'Quad.easeOut',
        onComplete: () => scene.tweens.add({
            targets: fly, y: topY - 44, alpha: 0, duration: 160,
            onComplete: () => fly.destroy()
        })
    });
    scene.tweens.add({ targets: fly, scaleX: 0.15, duration: 90, yoyo: true, repeat: 2 });
}

// A beanstalk: leaves unfurl one after another, alternating sides, and each
// is a small platform.
function iaGrowSprout(scene, b) {
    const topY = b.y - BLOCK_SIZE / 2;
    const step = 62;
    const height = b.leaves * step + 10;
    const stalk = scene.add.tileSprite(b.x, topY, 10, height, 'ia_stalk').setOrigin(0.5, 1).setDepth(1);
    stalk.scaleY = 0.02;
    scene.tweens.add({ targets: stalk, scaleY: 1, duration: 220 * b.leaves, ease: 'Sine.easeOut' });
    playSound('powerup');
    for (let i = 0; i < b.leaves; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const lx = b.x + side * 34;
        const ly = topY - step * (i + 1);
        scene.time.delayedCall(220 * (i + 1), () => {
            if (!platforms || !platforms.scene) return;
            platforms.create(lx, ly, null).setDisplaySize(48, 12).setVisible(false).refreshBody();
            const leaf = scene.add.image(lx, ly + 2, 'ia_leaf').setDepth(2).setScale(0.1).setFlipX(side < 0);
            scene.tweens.add({ targets: leaf, scale: 1, duration: 200, ease: 'Back.easeOut' });
            spawnParticles(scene, lx, ly, 0x8be04e, 4, 30);
        });
    }
}

// ========================
// Shells
// ========================

// Called from stompEnemy for rollers: the enemy is swapped for a shell.
function shellFromEnemy(scene, enemy) {
    const ex = enemy.x, ey = enemy.y;
    const visual = enemy.visual;
    enemy.disableBody(true, true);
    if (visual) {
        if (visual.cbIndicator) visual.cbIndicator.destroy();
        const vi = enemyRects.indexOf(visual);
        if (vi !== -1) enemyRects[vi] = null;
        visual.destroy();
        enemy.visual = null;
    }

    score += 100;
    scoreText.setText(formatScoreHUD(score, highScores['level' + currentLevelIndex] || 0));
    showScorePopup(scene, ex, ey - 20, '+100', '#8be04e');
    spawnParticles(scene, ex, ey, 0x39b54a, 6, 40);
    shakeCamera(scene, 15, 80);
    playSound('stomp');
    if (typeof flowAddStomp === 'function') flowAddStomp();

    iaSpawnShell(scene, ex, ey + 4);
    iaHint(scene, 'shell', 'Walk into a shell to kick it. Hold ↓ to pick it up, ↓ again to throw!');
}

function iaSpawnShell(scene, x, y) {
    const body = iaShellGroup.create(x, y, null).setDisplaySize(28, 22).setVisible(false);
    body.setBounce(0);
    body.setCollideWorldBounds(true);
    const img = scene.add.image(x, y, 'ia_shell').setDepth(9);
    const s = { body: body, img: img, state: 'rest', dir: 1, grace: 350, bounces: 0, spin: 0, safe: 0, pierce: 0 };
    body.iaShell = s;
    iaShells.push(s);
    return s;
}

function iaKickShell(scene, s, dir) {
    s.state = 'slide';
    s.dir = dir;
    s.grace = 350;
    s.bounces = 0;
    // A shell can't hurt whoever launched it until it has come back off a
    // wall (or a moment has passed), so chasing your own throw is safe.
    s.safe = 900;
    s.body.setVelocityX(dir * SHELL_SPEED);
    spawnParticles(scene, s.body.x, s.body.y, 0xffffff, 5, 40);
    playSound('stomp');
}

function iaRemoveShell(scene, s) {
    spawnParticles(scene, s.body.x, s.body.y, 0x8be04e, 8, 50);
    if (iaCarried === s) iaCarried = null;
    s.body.destroy();
    s.img.destroy();
    iaShells.splice(iaShells.indexOf(s), 1);
}

function iaPlayerTouchesShell(playerObj, shellBody) {
    const s = shellBody.iaShell;
    if (!s || s.state === 'carried' || gameOver || s.grace > 0) return;
    const downHeld = cursors.down.isDown || touchDown;

    if (s.state === 'rest') {
        if (downHeld && !iaCarried && !isPounding) {
            s.state = 'carried';
            s.body.body.enable = false;
            iaCarried = s;
            iaCarryTime = 0;
            playSound('jump');
            return;
        }
        const dir = Math.abs(player.x - shellBody.x) < 4 ? lastFacingDir : (player.x < shellBody.x ? 1 : -1);
        iaKickShell(this, s, dir);
        return;
    }

    // A moving shell: land on it to stop it, otherwise it hurts
    const above = player.body.velocity.y > 0 && player.body.bottom < shellBody.y + 4;
    if (above) {
        s.state = 'rest';
        s.grace = 250;
        s.body.setVelocityX(0);
        const jumpNow = cursors.up.isDown || cursors.space.isDown || touchJump;
        player.setVelocityY(jumpNow ? -400 : -260);
        playSound('stomp');
    } else if (isDashing || activePowerUps.invincibility) {
        iaKickShell(this, s, player.x < shellBody.x ? 1 : -1);
    } else if (s.safe > 0 && s.bounces === 0) {
        return;
    } else {
        iaRemoveShell(this, s);
        hitEnemy.call(this);
    }
}

function iaThrowShell(scene) {
    const s = iaCarried;
    if (!s) return;
    iaCarried = null;
    s.body.body.enable = true;
    s.body.body.reset(player.x + lastFacingDir * 16, player.y - 4);
    iaKickShell(scene, s, lastFacingDir);
}

function iaDropShell() {
    const s = iaCarried;
    if (!s) return;
    iaCarried = null;
    s.body.body.enable = true;
    s.body.body.reset(player.x, player.y - 20);
    s.state = 'rest';
    s.grace = 600;
}

function iaUpdateShells(scene, dt, downJust) {
    if (iaCarried) {
        iaCarryTime += dt;
        const s = iaCarried;
        s.img.setPosition(player.x, player.y - 30).setRotation(0);
        const dashAsked = dashBufferTimer > 0 || touchDashPressed;
        if (iaCarryTime > 180 && (downJust || dashAsked)) {
            dashBufferTimer = 0;
            touchDashPressed = false;
            iaThrowShell(scene);
        }
    }
    for (let i = iaShells.length - 1; i >= 0; i--) {
        const s = iaShells[i];
        if (s.state === 'carried') continue;
        if (s.grace > 0) s.grace -= dt;
        if (s.safe > 0) s.safe -= dt;
        const body = s.body.body;
        if (s.state === 'slide') {
            if (s.pierce) {
                // It just smashed a crate: carry on through instead of bouncing.
                // (Only `blocked` counts as a wall: `touching` is also set by
                // harmless overlaps with the player and enemies.)
                s.dir = s.pierce;
                s.pierce = 0;
            } else if (body.blocked.left) { s.dir = 1; s.bounces++; }
            else if (body.blocked.right) { s.dir = -1; s.bounces++; }
            s.body.setVelocityX(s.dir * SHELL_SPEED);
            s.spin += dt * 0.02 * s.dir;
            if (Math.random() < 0.3) spawnParticles(scene, s.body.x - s.dir * 12, s.body.y + 9, 0xdddddd, 1, 14);
            // Spent, or long gone off-screen
            if (s.bounces > SHELL_MAX_BOUNCES || Math.abs(s.body.x - player.x) > 1100) {
                iaRemoveShell(scene, s);
                continue;
            }
        } else {
            s.body.setVelocityX(0);
        }
        s.img.setPosition(s.body.x, s.body.y);
        // A sliding shell rocks from side to side so its speed reads
        s.img.setRotation(s.state === 'slide' ? Math.sin(s.spin * 6) * 0.25 : 0);
    }
}

// ========================
// Doors
// ========================

function iaUpdateDoors(scene, downJust, onGround) {
    let nearDoor = null;
    iaDoors.forEach(d => {
        const near = Math.abs(player.x - d.x) < 24 && Math.abs(player.y - d.y) < 44;
        d.prompt.setAlpha(near ? 1 : 0);
        d.prompt.y = d.y - 50 + Math.sin(iaTime * 0.008) * 3;
        if (near) nearDoor = d;
    });
    if (nearDoor) iaHint(scene, 'door', 'Press ↓ in front of a door to go through');
    if (!nearDoor || !downJust || !onGround || iaDoorBusy || controlLocked) return;
    const twin = iaDoors.find(d => d !== nearDoor && d.id === nearDoor.id);
    if (!twin) return;

    iaDoorBusy = true;
    controlLocked = true;
    player.setVelocity(0, 0);
    player.body.enable = false;
    playSound('checkpoint');
    const cam = scene.cameras.main;
    cam.fadeOut(170, 0, 0, 0);
    scene.time.delayedCall(190, () => {
        if (!player || !player.body) return;
        player.body.enable = true;
        player.body.reset(twin.x, twin.y + 2);
        playerRect.setPosition(twin.x, twin.y + 2);
        iaApplyCameraBounds(scene);
        cam.centerOn(twin.x, twin.y - 30);
        cam.fadeIn(220, 0, 0, 0);
        controlLocked = false;
        scene.time.delayedCall(300, () => { iaDoorBusy = false; });
    });
}

// ========================
// Switches
// ========================

function iaUpdateSwitches(scene, dt) {
    if (!iaSwitches.length) return;
    const body = player.body;
    iaSwitches.forEach(sw => {
        if (iaNear(sw.x, sw.y, 220)) iaHint(scene, 'switch', 'Stomp the blue switch — ghost coins turn solid for a while!');
        if (iaSwitchTimer > 0) return;
        const onTop = Math.abs(player.x - sw.x) < 26 && body.velocity.y >= 0 &&
            body.bottom > sw.y - 12 && body.bottom < sw.y + 12;
        if (!onTop) return;
        iaSwitchTimer = SWITCH_TIME;
        iaSwitches.forEach(o => o.img.setTexture('ia_switch_down'));
        if (!isPounding) player.setVelocityY(-260);
        playSound('checkpoint');
        shakeCamera(scene, 12, 80);
        spawnParticles(scene, sw.x, sw.y, 0x9fd4ff, 10, 60);
        if (!iaSwitchBar) {
            iaSwitchBar = wideUI(scene.add.rectangle(VIEW_W / 2, 36, 160, 6, 0x4b9cf0));
            iaSwitchBar.setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0x0a1220);
        }
        iaSwitchBar.setVisible(true);
    });

    if (iaSwitchTimer <= 0) return;
    const before = iaSwitchTimer;
    iaSwitchTimer -= dt;
    if (Math.floor(before / 1000) !== Math.floor(iaSwitchTimer / 1000)) playSound('wallSlide');
    const ending = iaSwitchTimer < 2000;
    iaSwitchBar.setScale(Math.max(0, iaSwitchTimer / SWITCH_TIME), 1);

    iaSwitchBlocks.forEach(blk => {
        if (iaSwitchTimer > 0) {
            if (!blk.solid) {
                // Wait until the player is clear, so nobody is sealed inside one
                const clear = Math.abs(player.x - blk.x) > 33 || Math.abs(player.y - blk.y) > 33;
                if (clear) {
                    blk.solid = true;
                    blk.body.body.enable = true;
                    blk.img.setTexture('ia_swblock');
                    spawnParticles(scene, blk.x, blk.y, 0x9fd4ff, 3, 25);
                }
            }
            blk.img.setAlpha(ending && blk.solid ? (Math.floor(iaSwitchTimer / 110) % 2 ? 0.45 : 1) : 1);
        } else {
            blk.solid = false;
            blk.body.body.enable = false;
            blk.img.setTexture('ia_swcoin').setAlpha(1);
        }
    });
    if (iaSwitchTimer <= 0) {
        iaSwitchTimer = 0;
        iaSwitches.forEach(o => o.img.setTexture('ia_switch'));
        iaSwitchBar.setVisible(false);
    }
}

// ========================
// Cannons
// ========================

function iaSetPlayerHidden(hidden) {
    playerRect.setAlpha(hidden ? 0 : 1);
    if (typeof playerHatObjects !== 'undefined') {
        playerHatObjects.forEach(o => o && o.setVisible && o.setVisible(!hidden));
    }
}

function iaUpdateCannons(scene, dt, jumpJust) {
    if (iaCannonCooldown > 0) iaCannonCooldown -= dt;

    if (iaInCannon) {
        const c = iaInCannon;
        c.fuse -= dt;
        player.setPosition(c.x, c.y);
        c.barrel.setScale(1 + Math.sin(iaTime * 0.04) * 0.05, 1 - Math.sin(iaTime * 0.04) * 0.05);
        if (c.fuse <= 0 || jumpJust) iaFireCannon(scene, c);
        return;
    }
    if (controlLocked || iaCannonCooldown > 0) return;
    for (const c of iaCannons) {
        if (iaNear(c.x, c.y, 240)) iaHint(scene, 'cannon', 'Hop into a cannon to be launched! Jump fires it early');
        if (Math.abs(player.x - c.x) < 24 && Math.abs(player.y - c.y) < 26) {
            iaInCannon = c;
            c.fuse = CANNON_FUSE;
            controlLocked = true;
            iaDropShell();
            if (isPounding) { isPounding = false; poundPauseTimer = 0; player.body.setAllowGravity(true); }
            isDashing = false;
            player.body.setAllowGravity(true);
            player.setVelocity(0, 0);
            player.body.enable = false;
            iaSetPlayerHidden(true);
            playSound('jump');
            spawnParticles(scene, c.x, c.y, 0xffffff, 6, 40);
            break;
        }
    }
}

function iaFireCannon(scene, c) {
    iaInCannon = null;
    controlLocked = false;
    iaCannonCooldown = 450;
    const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
    player.body.enable = true;
    player.body.reset(c.x + cos * 26, c.y + sin * 26);
    player.setVelocity(cos * c.power, sin * c.power);
    iaSetPlayerHidden(false);
    // Ride the launch: no jump-cut, speed above the run cap bleeds off slowly
    springLaunch = true;
    isOverspeed = true;
    canAirDash = true;
    hasDoubleJumped = false;
    coyoteTimer = 0;
    if (Math.abs(cos) > 0.2) lastFacingDir = cos > 0 ? 1 : -1;

    c.barrel.setScale(1.35, 0.8);
    scene.tweens.add({ targets: c.barrel, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
    spawnParticles(scene, c.x + cos * 36, c.y + sin * 36, 0xffffff, 12, 90);
    spawnParticles(scene, c.x + cos * 36, c.y + sin * 36, 0xffc04d, 8, 60);
    shakeCamera(scene, 30, 140);
    playSound('dash');
    playSound('stomp');
    if (typeof flowAdd === 'function') flowAdd(10);
}

// ========================
// Ropes
// ========================

function iaUpdateRopes(scene, dt, jumpJust, downJust, onGround) {
    if (iaRopeCooldown > 0) iaRopeCooldown -= dt;
    const t = iaTime / 1000;
    iaRopes.forEach(r => {
        const a = r.omega * t + r.phase;
        r.theta = r.swing * Math.sin(a);
        r.thetaV = r.swing * r.omega * Math.cos(a);
        r.tipX = r.x + Math.sin(r.theta) * r.length;
        r.tipY = r.y + Math.cos(r.theta) * r.length;
        r.rope.setRotation(-r.theta);
        r.grip.setPosition(r.tipX, r.tipY);
    });

    if (iaOnRope) {
        const r = iaOnRope;
        // Hang just below the grip, along the line of the rope
        player.setPosition(r.tipX + Math.sin(r.theta) * 18, r.tipY + Math.cos(r.theta) * 18);
        if (Math.abs(r.thetaV) > 0.15) lastFacingDir = r.thetaV > 0 ? 1 : -1;
        playerRect.rotation = -r.theta * 0.6;
        if (jumpJust || downJust) {
            let vx = r.length * r.thetaV * Math.cos(r.theta);
            let vy = -r.length * r.thetaV * Math.sin(r.theta);
            iaOnRope = null;
            controlLocked = false;
            iaRopeCooldown = 450;
            player.body.enable = true;
            player.body.reset(player.x, player.y);
            playerRect.rotation = 0;
            if (jumpJust) {
                vx = vx * 1.25 + Math.sign(vx || lastFacingDir) * 40;
                vy = Math.min(vy, 0) - 340;
                springLaunch = true;
                playSound('jump');
            }
            player.setVelocity(vx, vy);
            isOverspeed = Math.abs(vx) > MAX_SPEED;
            canAirDash = true;
            hasDoubleJumped = false;
            if (typeof flowAdd === 'function') flowAdd(6);
        }
        return;
    }
    if (controlLocked || iaRopeCooldown > 0 || onGround) return;
    for (const r of iaRopes) {
        if (iaNear(r.x, r.y + r.length, 260)) iaHint(scene, 'rope', 'Jump onto a rope to swing. Jump again to let go!');
        if (Math.abs(player.x - r.tipX) < 24 && Math.abs(player.y - (r.tipY + 10)) < 30) {
            iaOnRope = r;
            controlLocked = true;
            iaDropShell();
            if (isPounding) { isPounding = false; poundPauseTimer = 0; }
            isDashing = false;
            player.body.setAllowGravity(true);
            player.setVelocity(0, 0);
            player.body.enable = false;
            player.body.blocked.down = false; player.body.touching.down = false;
            player.body.blocked.left = false; player.body.blocked.right = false;
            playSound('wallSlide');
            break;
        }
    }
}

// ========================
// Per-frame
// ========================

function updateInteractables(scene, delta) {
    if (!iaScene || !player || !player.body) return;
    iaTime += delta;
    const jumpNow = cursors.up.isDown || cursors.space.isDown || touchJump;
    const downNow = cursors.down.isDown || touchDown;
    const jumpJust = jumpNow && !iaPrevJump;
    const downJust = downNow && !iaPrevDown;
    iaPrevJump = jumpNow;
    iaPrevDown = downNow;
    const onGround = player.body.enable && (player.body.touching.down || player.body.blocked.down);

    if (iaBlocks.length && tutorialShown && !tutorialShown.ia_block) {
        const b = iaBlocks.find(o => !o.hidden && iaNear(o.x, o.y + 60, 160));
        if (b) iaHint(scene, 'block', 'Jump into a star block from below to shake out what is inside!');
    }

    iaUpdateShells(scene, delta, downJust);
    iaUpdateDoors(scene, downJust, onGround);
    iaUpdateSwitches(scene, delta);
    iaUpdateCannons(scene, delta, jumpJust);
    iaUpdateRopes(scene, delta, jumpJust, downJust, onGround);
}

// Taking a hit knocks whatever is being carried out of the player's hands
function interactOnPlayerHit() {
    iaDropShell();
}
