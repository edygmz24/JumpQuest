// ========================
// Suits and the Hopper — power-ups you wear
// ========================
// A suit changes how the hero looks and adds one ability. It stays on until
// the hero is hit: the hit knocks the suit off instead of costing a heart,
// so a suit is both a new move and a spare hit point. Suits carry over from
// one level to the next.
//
//   cape   Hold jump while falling to glide.
//   claw   Cling to walls without sliding, and wall-jump higher.
//   rang   Press X (or the star button) to throw a boomerang that defeats
//          enemies, smashes crates and brings coins back.
//
// The Hopper is a critter you ride by landing on it. It adds a double jump
// and takes one hit for you before bolting.
//
// Level data:  suits  [{x, y, type}]      mounts [{x, y}]
// Star blocks can also hold a suit: contains: 'cape' | 'claw' | 'rang'.

const SUIT_TYPES = {
    cape: { name: 'Glide Cape', color: 0x9b5cf0, hint: 'Glide Cape! Hold jump while falling to float' },
    claw: { name: 'Claw Suit', color: 0xff8a2a, hint: 'Claw Suit! Cling to walls and wall-jump higher' },
    rang: { name: 'Boomerang', color: 0x22c7b8, hint: 'Boomerang! Press X to throw it' }
};
const SUIT_INVULN = 1500;       // ms of safety after a suit or the Hopper takes a hit
const GLIDE_FALL_SPEED = 70;
const RANG_SPEED = 560;
const RANG_OUT_TIME = 420;      // ms flying out before it turns back
const MOUNT_LIFT = 20;          // how far the rider sits above the ground

let playerSuit = null;          // carries across levels
let suitInvuln = 0;
let suitForceHit = false;       // set by hazards no suit can absorb (pits)
let suitPickups = [];
let suitMounts = [];
let suitRide = null;            // the Hopper being ridden
let suitRang = null;            // boomerang in flight
let suitExtras = null;          // rig add-ons for the current level
let suitActionKey = null;
let touchActionPressed = false;

function resetSuitLevelState() {
    suitInvuln = 0;
    suitForceHit = false;
    suitPickups = [];
    suitMounts = [];
    suitRide = null;
    suitRang = null;
    suitExtras = null;
    suitActionKey = null;
    touchActionPressed = false;
    // Speedruns start level: no carried-over suit
    if (typeof speedrunMode !== 'undefined' && speedrunMode) playerSuit = null;
}

function suitRiding() { return !!suitRide; }
function suitRigLift() { return suitRide ? MOUNT_LIFT : 0; }
function suitBandColor() { return playerSuit ? SUIT_TYPES[playerSuit].color : 0xf0483c; }
function suitClinging() { return playerSuit === 'claw'; }

// True while the cape is holding the fall back. Called from the fall code.
function suitGliding(jumpPressed) {
    return playerSuit === 'cape' && jumpPressed && !suitRide && !isWallSliding &&
        player.body.velocity.y > 0;
}

// ========================
// Art
// ========================

function suitTextures(scene) {
    if (scene.textures.exists('suit_orb_cape')) return;
    const tex = (key, w, h, draw) => hdTexture(scene, key, w, h, draw);
    const orb = (key, color, glyph) => tex(key, 32, 32, ctx => {
        const g = ctx.createRadialGradient(12, 10, 2, 16, 16, 15);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, hdHex(hdMix(color, 0xffffff, 0.35)));
        g.addColorStop(1, hdHex(hdMix(color, 0x000000, 0.35)));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hdHex(hdMix(color, 0x000000, 0.6)); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(20,24,40,0.7)'; ctx.lineWidth = 1.2;
        glyph(ctx);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.ellipse(11, 8, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
    });
    orb('suit_orb_cape', SUIT_TYPES.cape.color, ctx => {
        ctx.beginPath(); ctx.moveTo(11, 9); ctx.lineTo(21, 9); ctx.quadraticCurveTo(25, 18, 23, 24);
        ctx.lineTo(19, 21); ctx.lineTo(16, 24); ctx.lineTo(13, 21); ctx.lineTo(9, 24);
        ctx.quadraticCurveTo(7, 18, 11, 9); ctx.fill(); ctx.stroke();
    });
    orb('suit_orb_claw', SUIT_TYPES.claw.color, ctx => {
        [10, 16, 22].forEach(x => {
            ctx.beginPath(); ctx.moveTo(x - 2.5, 24); ctx.quadraticCurveTo(x - 3, 13, x + 1.5, 7);
            ctx.quadraticCurveTo(x + 2, 16, x + 2.5, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
    });
    const rangPath = (ctx, s) => {
        ctx.beginPath();
        ctx.moveTo(-9 * s, 6 * s); ctx.quadraticCurveTo(-2 * s, -9 * s, 9 * s, -7 * s);
        ctx.quadraticCurveTo(2 * s, -3 * s, -5 * s, 8 * s); ctx.closePath();
    };
    orb('suit_orb_rang', SUIT_TYPES.rang.color, ctx => {
        ctx.translate(16, 17); rangPath(ctx, 1); ctx.fill(); ctx.stroke();
    });
    tex('suit_rang', 26, 26, ctx => {
        ctx.translate(13, 13);
        rangPath(ctx, 1.25);
        const g = ctx.createLinearGradient(-10, -10, 10, 10);
        g.addColorStop(0, '#b8fff4'); g.addColorStop(1, '#0f9488');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#06443f'; ctx.lineWidth = 1.4; ctx.stroke();
    });
    tex('suit_cape', 26, 30, ctx => {
        const g = ctx.createLinearGradient(0, 0, 0, 30);
        g.addColorStop(0, '#c9a2ff'); g.addColorStop(1, '#5a2bb0');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(18, 1); ctx.quadraticCurveTo(26, 16, 24, 29);
        ctx.lineTo(18, 25); ctx.lineTo(13, 29); ctx.lineTo(8, 25); ctx.lineTo(2, 29);
        ctx.quadraticCurveTo(0, 16, 8, 1); ctx.fill();
        ctx.strokeStyle = '#33146e'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(11, 4); ctx.quadraticCurveTo(8, 16, 9, 24); ctx.stroke();
    });
    tex('suit_claw', 14, 12, ctx => {
        const g = ctx.createRadialGradient(6, 5, 1, 6, 6, 6);
        g.addColorStop(0, '#ffd9a8'); g.addColorStop(1, '#e06a10');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(6, 6, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6e2c00'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#f4f6fb';
        [2.5, 6, 9.5].forEach(y => { ctx.beginPath(); ctx.moveTo(9, y - 1.4); ctx.lineTo(14, y); ctx.lineTo(9, y + 1.4); ctx.fill(); });
    });
    // The Hopper: a round, long-legged critter. Two frames: standing and tucked.
    [0, 1].forEach(f => tex('suit_mount' + f, 44, 38, ctx => {
        const legY = f ? 30 : 33;
        ctx.strokeStyle = '#c9762a'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        [[15, -3], [27, 3]].forEach(([lx, kick]) => {
            ctx.beginPath(); ctx.moveTo(lx, 24); ctx.lineTo(lx + (f ? kick : 0), legY); ctx.lineTo(lx + 6 + (f ? kick : 0), legY + 2); ctx.stroke();
        });
        const g = ctx.createRadialGradient(26, 9, 2, 21, 16, 17);
        g.addColorStop(0, '#fff6b8'); g.addColorStop(0.5, '#ffcf3d'); g.addColorStop(1, '#d98a12');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(21, 15 + f, 16, 13 - f, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7a4a06'; ctx.lineWidth = 1.4; ctx.stroke();
        // Saddle
        ctx.fillStyle = '#d6453a'; iaRoundRect(ctx, 11, 1 + f, 18, 6, 3); ctx.fill();
        ctx.strokeStyle = '#6e1a14'; ctx.lineWidth = 1; ctx.stroke();
        // Face
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(31, 13 + f, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1205';
        ctx.beginPath(); ctx.ellipse(32.4, 13.6 + f, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f08a1c';
        ctx.beginPath(); ctx.moveTo(35, 17 + f); ctx.lineTo(43, 19 + f); ctx.lineTo(35, 22 + f); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#7a4a06'; ctx.stroke();
    }));
}

// ========================
// Build
// ========================

function buildSuits(scene) {
    suitTextures(scene);
    const endless = typeof endlessMode !== 'undefined' && endlessMode;
    const lvl = endless ? {} : currentLevel;
    (lvl.suits || []).forEach(d => spawnSuitPickup(scene, d.x, d.y, d.type, false));
    (lvl.mounts || []).forEach(d => {
        const img = scene.add.image(d.x, d.y, 'suit_mount0').setDepth(9);
        suitMounts.push({ x: d.x, y: d.y, img: img, state: 'idle', vx: 0, phase: Math.random() * 6 });
    });
    suitActionKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    suitRefreshTouch();
}

function spawnSuitPickup(scene, x, y, type, pop) {
    if (!SUIT_TYPES[type]) return;
    const img = scene.add.image(x, pop ? y + 24 : y, 'suit_orb_' + type).setDepth(8);
    const hasGlow = scene.textures.exists('hd_glow');
    const glow = scene.add.image(x, y, hasGlow ? 'hd_glow' : 'suit_orb_' + type).setDepth(7).setVisible(hasGlow);
    if (hasGlow) glow.setTint(SUIT_TYPES[type].color).setAlpha(0.55).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
    if (pop) scene.tweens.add({ targets: img, y: y, duration: 260, ease: 'Back.easeOut' });
    suitPickups.push({ x: x, y: y, type: type, img: img, glow: glow, live: pop ? 300 : 0 });
}

function suitRefreshTouch() {
    const btn = document.getElementById('btn-action');
    if (btn) btn.style.visibility = playerSuit === 'rang' ? 'visible' : 'hidden';
}

function setPlayerSuit(scene, type) {
    playerSuit = type;
    suitRefreshTouch();
    if (!type) return;
    const s = SUIT_TYPES[type];
    spawnParticles(scene, player.x, player.y, s.color, 14, 70);
    showScorePopup(scene, player.x, player.y - 34, s.name.toUpperCase() + '!', hdHex(s.color));
    playSound('powerup');
    if (typeof iaHint === 'function') iaHint(scene, 'suit_' + type, s.hint);
}

// ========================
// Taking a hit
// ========================

// Called first thing in hitEnemy. Returns true when the hit has been dealt
// with here (shrugged off, or soaked up by the Hopper or the suit).
function suitAbsorbHit(scene) {
    if (suitForceHit) {
        suitForceHit = false;
        suitLoseRide(scene, false);
        return false;
    }
    if (suitInvuln > 0) return true;
    if (!suitRide && !playerSuit) return false;

    suitInvuln = SUIT_INVULN;
    if (suitRide) {
        suitLoseRide(scene, true);
        showScorePopup(scene, player.x, player.y - 34, 'HOPPER BOLTED!', '#ffcf3d');
    } else {
        const color = SUIT_TYPES[playerSuit].color;
        // The suit pops off as a tumbling orb
        const lost = scene.add.image(player.x, player.y - 10, 'suit_orb_' + playerSuit).setDepth(12);
        scene.tweens.add({
            targets: lost, y: player.y - 90, x: player.x - lastFacingDir * 60, alpha: 0, angle: 360,
            duration: 700, ease: 'Quad.easeOut', onComplete: () => lost.destroy()
        });
        spawnParticles(scene, player.x, player.y, color, 12, 70);
        playerSuit = null;
        suitRefreshTouch();
        showScorePopup(scene, player.x, player.y - 34, 'SUIT LOST!', '#ffffff');
    }
    player.setVelocityY(-260);
    shakeCamera(scene, 30, 140);
    playSound('death');
    if (typeof flowBreak === 'function') flowBreak();
    if (isPounding) {
        isPounding = false;
        poundPauseTimer = 0;
        player.body.setAllowGravity(true);
    }
    return true;
}

function suitLoseRide(scene, bolt) {
    const m = suitRide;
    if (!m) return;
    suitRide = null;
    if (bolt) {
        m.state = 'bolt';
        m.x = player.x; m.y = player.y + 2;
        m.vx = -lastFacingDir * 260;
        m.vy = -260;
    } else {
        m.img.destroy();
        suitMounts.splice(suitMounts.indexOf(m), 1);
    }
}

// ========================
// Boomerang
// ========================

function suitThrowRang(scene) {
    const img = scene.add.image(player.x + lastFacingDir * 14, player.y - 4, 'suit_rang').setDepth(11);
    suitRang = { img: img, x: img.x, y: img.y, dir: lastFacingDir, t: 0, back: false, hit: new Set() };
    playSound('dash');
}

function suitUpdateRang(scene, dt) {
    const r = suitRang;
    if (!r) return;
    r.t += dt;
    const s = dt / 1000;
    if (!r.back) {
        // Eases to a stop at the end of its reach
        const k = Math.max(0.15, 1 - r.t / RANG_OUT_TIME);
        r.x += r.dir * RANG_SPEED * k * s;
        if (r.t >= RANG_OUT_TIME) r.back = true;
    } else {
        const dx = player.x - r.x, dy = player.y - r.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const sp = RANG_SPEED * Math.min(1, 0.35 + (r.t - RANG_OUT_TIME) / 300);
        r.x += dx / d * sp * s;
        r.y += dy / d * sp * s;
        if (d < 22 || r.t > 3000) {
            r.img.destroy();
            suitRang = null;
            return;
        }
    }
    r.img.setPosition(r.x, r.y);
    r.img.rotation += dt * 0.03;
    if (Math.random() < 0.4) spawnParticles(scene, r.x, r.y, 0x7ff5e8, 1, 14);

    enemies.children.entries.slice().forEach(e => {
        if (!e.active || r.hit.has(e)) return;
        if (Math.abs(e.x - r.x) < 26 && Math.abs(e.y - r.y) < 26) {
            r.hit.add(e);
            e.noShell = true;
            stompEnemy.call(scene, e);
        }
    });
    breakableBlockRects.slice().forEach(b => {
        if (b.body && b.body.active && Math.abs(b.body.x - r.x) < 30 && Math.abs(b.body.y - r.y) < 30) {
            breakBlock.call(scene, b.body);
        }
    });
    coinRects.slice().forEach(c => {
        const body = c.body;
        if (body && body.active && body.body && body.body.enable &&
            Math.abs(body.x - r.x) < 22 && Math.abs(body.y - r.y) < 22) {
            collectCoin.call(scene, player, body);
        }
    });
}

// ========================
// The Hopper
// ========================

function suitUpdateMounts(scene, dt) {
    const s = dt / 1000;
    for (let i = suitMounts.length - 1; i >= 0; i--) {
        const m = suitMounts[i];
        if (m === suitRide) {
            const moving = Math.abs(player.body.velocity.x) > 30;
            const onGround = player.body.touching.down || player.body.blocked.down;
            m.phase += dt * (moving ? 0.02 : 0.004);
            m.img.setPosition(player.x + lastFacingDir * 3, player.y + 3).setScale(1.15);
            m.img.setFlipX(lastFacingDir < 0);
            m.img.setTexture(!onGround || (moving && Math.sin(m.phase) > 0) ? 'suit_mount1' : 'suit_mount0');
            m.img.setAlpha(playerRect.alpha);
            continue;
        }
        if (m.state === 'bolt') {
            // Spooked: bounds away and fades out
            m.vy += 900 * s;
            m.x += m.vx * s; m.y += m.vy * s;
            if (m.y > 544 && m.vy > 0) { m.y = 544; m.vy = -300; }
            m.img.setPosition(m.x, m.y).setFlipX(m.vx < 0).setTexture('suit_mount1');
            m.img.alpha -= s * 0.8;
            if (m.img.alpha <= 0) { m.img.destroy(); suitMounts.splice(i, 1); }
            continue;
        }
        // Idle: a little hop on the spot to catch the eye
        m.phase += dt * 0.006;
        const hop = Math.max(0, Math.sin(m.phase)) * 6;
        m.img.setPosition(m.x, m.y - hop).setTexture(hop > 2 ? 'suit_mount1' : 'suit_mount0');
        if (!controlLocked && !suitRide && Math.abs(player.x - m.x) < 30 && Math.abs(player.y - m.y) < 34) {
            if (typeof iaHint === 'function') iaHint(scene, 'mount', 'A Hopper! Riding it gives you a double jump, and it takes a hit for you');
            if (player.body.velocity.y > 40 || Math.abs(player.x - m.x) < 16) {
                suitRide = m;
                m.state = 'ridden';
                hasDoubleJumped = false;
                player.setVelocityY(-220);
                spawnParticles(scene, m.x, m.y, 0xffcf3d, 12, 60);
                playSound('powerup');
            }
        }
    }
}

// ========================
// Rig add-ons
// ========================

function suitUpdateLook(scene, dt) {
    if (typeof hdRig === 'undefined' || !hdRig || !hdRig.container) return;
    const r = hdRig;
    if (!suitExtras || suitExtras.rig !== r) {
        const cape = scene.add.image(0, 0, 'suit_cape').setOrigin(0.5, 0.04);
        const rang = scene.add.image(0, 0, 'suit_rang').setScale(0.8);
        r.container.addAt(cape, 0);
        r.container.addAt(rang, 1);
        suitExtras = { rig: r, cape: cape, rang: rang, angle: 0.5 };
    }
    const x = suitExtras;
    const vx = Math.abs(player.body.velocity.x), vy = player.body.velocity.y;
    const onGround = player.body.touching.down || player.body.blocked.down;

    x.cape.setVisible(playerSuit === 'cape');
    if (playerSuit === 'cape') {
        // Hangs at rest, streams back with speed, spreads wide in a glide
        const gliding = !onGround && vy > 0 && vy <= GLIDE_FALL_SPEED + 5;
        const target = gliding ? 1.45 : Math.min(1.25, 0.25 + vx / 260) + (onGround ? 0 : Phaser.Math.Clamp(vy / 600, -0.3, 0.6));
        x.angle = hdApproach(x.angle, target + Math.sin(scene.time.now * 0.012) * 0.08, 10, dt / 1000);
        x.cape.setPosition(-7, -5 + r.pose.bodyY).setRotation(x.angle).setScale(gliding ? 1.25 : 1, 1);
    }
    x.rang.setVisible(playerSuit === 'rang' && !suitRang);
    x.rang.setPosition(-13, 3 + r.pose.bodyY).setRotation(-0.6);

    const hand = playerSuit === 'claw' ? 'suit_claw' : 'hd_hand';
    if (r.handFront.texture.key !== hand) { r.handFront.setTexture(hand); r.handBack.setTexture(hand); }
}

// ========================
// Per-frame
// ========================

function updateSuits(scene, delta) {
    if (!player || !player.body) return;
    if (suitInvuln > 0) {
        suitInvuln -= delta;
        playerRect.setAlpha(suitInvuln > 0 && Math.floor(suitInvuln / 90) % 2 ? 0.35 : 1);
    }

    for (let i = suitPickups.length - 1; i >= 0; i--) {
        const p = suitPickups[i];
        if (p.live > 0) { p.live -= delta; }
        const bob = Math.sin(scene.time.now * 0.004 + p.x) * 3;
        if (p.live <= 0) p.img.y = p.y + bob;
        p.glow.setPosition(p.x, p.img.y);
        if (p.live <= 0 && !controlLocked && Math.abs(player.x - p.x) < 28 && Math.abs(player.y - p.y) < 30) {
            p.img.destroy(); p.glow.destroy();
            suitPickups.splice(i, 1);
            setPlayerSuit(scene, p.type);
        }
    }

    const action = (suitActionKey && Phaser.Input.Keyboard.JustDown(suitActionKey)) || touchActionPressed;
    touchActionPressed = false;
    if (action && playerSuit === 'rang' && !suitRang && !controlLocked) suitThrowRang(scene);
    suitUpdateRang(scene, delta);
    suitUpdateMounts(scene, delta);
    suitUpdateLook(scene, delta);

    // The rider's hat sits up with the rider
    if (suitRide && typeof playerHatObjects !== 'undefined') {
        playerHatObjects.forEach(o => { if (o && o.y !== undefined) o.y -= MOUNT_LIFT; });
    }
}
