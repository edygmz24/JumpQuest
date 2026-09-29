// ========================
// HD look — enemies, boss, hazards and pickups
// ========================
// Every texture keeps the classic art's size (visuals are created at native
// size, so this keeps what you see matched to the hitboxes) and faces right
// like the classic art, so the existing flip logic still applies. Extra
// animation frames are named hd_tex_<classic key>_<frame>; hdlook.js picks
// them from each enemy's movement and AI state.

function hdCreatureTextures(scene) {
    hdWalkerTextures(scene);
    hdShieldTextures(scene);
    hdChargerTextures(scene);
    hdJumperTextures(scene);
    hdFlyerTextures(scene);
    hdDiverTextures(scene);
    hdShooterTextures(scene);
    hdHazardTextures(scene);
}

// Glossy dome body shared by the ground walkers
function hdShell(ctx, x0, y0, w, h, colors, outline) {
    const g = ctx.createRadialGradient(x0 + w * 0.65, y0 + h * 0.2, 1, x0 + w * 0.5, y0 + h * 0.55, w * 0.58);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.45, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h * 0.92);
    ctx.quadraticCurveTo(x0 - 1, y0 + h * 0.05, x0 + w / 2, y0);
    ctx.quadraticCurveTo(x0 + w + 1, y0 + h * 0.05, x0 + w, y0 + h * 0.92);
    ctx.quadraticCurveTo(x0 + w / 2, y0 + h * 1.04, x0, y0 + h * 0.92);
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x0 + w / 2, y0 + h * 0.88, w * 0.42, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(x0 + w * 0.66, y0 + h * 0.2, w * 0.15, h * 0.08, -0.25, 0, Math.PI * 2); ctx.fill();
}

function hdEyes(ctx, eyes, pupil, look, brow) {
    eyes.forEach(([ex, ey, r]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(ex, ey, r, r * 1.15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pupil;
        ctx.beginPath(); ctx.ellipse(ex + look[0], ey + look[1], r * 0.52, r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(ex + look[0] + 0.3, ey + look[1] - r * 0.4, 1, 1);
    });
    if (brow) {
        ctx.strokeStyle = brow; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const [a, b] = eyes;
        ctx.beginPath(); ctx.moveTo(a[0] - a[2], a[1] - a[2] * 1.5); ctx.lineTo(a[0] + a[2] * 0.7, a[1] - a[2] * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b[0] - b[2] * 0.7, b[1] - b[2] * 0.9); ctx.lineTo(b[0] + b[2], b[1] - b[2] * 1.5); ctx.stroke();
    }
}

function hdWalkCycleFeet(ctx, f, left, right, y, color, back) {
    const p = f * Math.PI / 2;
    [[left, p + Math.PI, back], [right, p, color]].forEach(([fx, ph, c]) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(fx + Math.sin(ph) * 3.5, y - Math.max(0, Math.cos(ph)) * 2, 4.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    return Math.abs(Math.sin(p)) * 1.2;
}

// Walker: a glossy red beetle, four walk frames
function hdWalkerTextures(scene) {
    for (let f = 0; f < 4; f++) {
        hdTexture(scene, f === 0 ? 'hd_tex_enemy_walker' : 'hd_tex_enemy_walker_' + f, 34, 32, (ctx) => {
            const bob = hdWalkCycleFeet(ctx, f, 12, 22, 29, '#5c0d0d', '#3d0808');
            const by = 3 + bob;
            hdShell(ctx, 2, by + 1, 30, 25, ['#ff8a6a', '#e2311f', '#7a0c0c'], 'rgba(70,6,6,0.8)');
            hdEyes(ctx, [[14, by + 13, 3.6], [23, by + 13, 3.6]], '#1a0505', [1.4, 0.8], '#3a0404');
            ctx.fillStyle = '#fff6ea';
            ctx.beginPath(); ctx.moveTo(21, by + 19); ctx.lineTo(24, by + 19); ctx.lineTo(22.5, by + 22); ctx.fill();
        });
    }
}

// Shield: teal armoured beetle with a riveted visor band
function hdShieldTextures(scene) {
    for (let f = 0; f < 4; f++) {
        hdTexture(scene, f === 0 ? 'hd_tex_enemy_shield' : 'hd_tex_enemy_shield_' + f, 32, 32, (ctx) => {
            const bob = hdWalkCycleFeet(ctx, f, 11, 21, 29, '#0d3c3c', '#082828');
            const by = 3 + bob;
            hdShell(ctx, 1, by + 1, 30, 25, ['#8af0e8', '#12a0a0', '#064848'], 'rgba(2,40,40,0.9)');
            const band = ctx.createLinearGradient(0, by + 7, 0, by + 13);
            band.addColorStop(0, '#d8e4ea'); band.addColorStop(1, '#6a7a86');
            ctx.fillStyle = band;
            ctx.fillRect(2, by + 7, 28, 6);
            ctx.fillStyle = '#3a4650';
            [6, 16, 26].forEach(rx => { ctx.beginPath(); ctx.arc(rx, by + 10, 1.3, 0, Math.PI * 2); ctx.fill(); });
            hdEyes(ctx, [[12, by + 18, 3.2], [21, by + 18, 3.2]], '#022020', [1.2, 0.6], null);
        });
    }
}

// Charger: a stocky horned boar. Walk frames, a head-down windup and a
// stretched charge pose.
function hdChargerTextures(scene) {
    const draw = (ctx, f, pose) => {
        const p = f * Math.PI / 2;
        const lean = pose === 'windup' ? 3 : 0;
        const stretch = pose === 'charge' ? 2 : 0;
        // Legs
        [[8, p + Math.PI, '#4a1c06'], [14, p, '#6a2a0a'], [22, p + Math.PI, '#4a1c06'], [28, p, '#6a2a0a']].forEach(([lx, ph, c]) => {
            ctx.fillStyle = c;
            const swing = pose === 'windup' ? 0 : Math.sin(ph) * (3 + stretch);
            ctx.fillRect(lx + swing - 2, 22, 4, 7 - Math.max(0, Math.cos(ph)) * 2);
        });
        // Body
        const g = ctx.createRadialGradient(20, 8 + lean, 1, 17, 14 + lean, 18);
        g.addColorStop(0, '#f09a58'); g.addColorStop(0.5, '#c4501a'); g.addColorStop(1, '#6a2406');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(16, 15 + lean * 0.5, 15 + stretch, 10, lean * 0.04, 0, Math.PI * 2);
        ctx.fill();
        // Bristly back
        ctx.strokeStyle = '#4a1604'; ctx.lineWidth = 1.2;
        for (let x = 6; x < 24; x += 3) {
            ctx.beginPath(); ctx.moveTo(x, 7 + lean * 0.3); ctx.lineTo(x - 1.5, 3 + lean * 0.3); ctx.stroke();
        }
        // Head and snout
        const hx = 27 + stretch, hy = 15 + lean;
        ctx.fillStyle = '#b8481a';
        ctx.beginPath(); ctx.ellipse(hx, hy, 7, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8906a';
        ctx.beginPath(); ctx.ellipse(hx + 5, hy + 2, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a1a0a';
        ctx.fillRect(hx + 4.5, hy + 1.5, 1, 1); ctx.fillRect(hx + 6, hy + 1.5, 1, 1);
        // Horns
        ctx.fillStyle = '#f5e6c8';
        ctx.beginPath(); ctx.moveTo(hx - 1, hy - 4); ctx.quadraticCurveTo(hx + 6, hy - 9, hx + 7, hy - 14); ctx.lineTo(hx + 2, hy - 5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx - 5, hy - 4); ctx.quadraticCurveTo(hx - 6, hy - 10, hx - 2, hy - 13); ctx.lineTo(hx - 2, hy - 5); ctx.fill();
        // Eye: angrier during windup and charge
        ctx.fillStyle = pose ? '#ffd23a' : '#ffffff';
        ctx.beginPath(); ctx.ellipse(hx + 1, hy - 2, 2.2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#220000';
        ctx.beginPath(); ctx.arc(hx + 1.8, hy - 1.8, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a0800'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hx - 2, hy - 5); ctx.lineTo(hx + 3.5, hy - 3.5); ctx.stroke();
        if (pose === 'windup') {
            // Snorted steam
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(hx + 9, hy + 5, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(hx + 11, hy + 3, 1.4, 0, Math.PI * 2); ctx.fill();
        }
    };
    for (let f = 0; f < 4; f++) {
        hdTexture(scene, f === 0 ? 'hd_tex_enemy_charger' : 'hd_tex_enemy_charger_' + f, 34, 30, ctx => draw(ctx, f, null));
        hdTexture(scene, 'hd_tex_enemy_charger_run' + f, 34, 30, ctx => draw(ctx, f, 'charge'));
    }
    hdTexture(scene, 'hd_tex_enemy_charger_windup', 34, 30, ctx => draw(ctx, 0, 'windup'));
}

// Jumper: an orange frog-blob on a coiled spring. Crouched at rest, the
// coil stretched on the way up and bunched on the way down.
function hdJumperTextures(scene) {
    const draw = (ctx, pose) => {
        const baseY = 38;
        const bodyBottom = { rest: 29, rise: 24, fall: 27 }[pose];
        const top = bodyBottom - 26;
        // Foot plate
        const plate = ctx.createLinearGradient(0, baseY - 2, 0, baseY + 2);
        plate.addColorStop(0, '#8a5a2a'); plate.addColorStop(1, '#4a2a0a');
        ctx.fillStyle = plate;
        ctx.beginPath(); ctx.ellipse(16, baseY, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        // Coil: stacked rings between the plate and the body
        const turns = 4;
        const span = baseY - 1 - bodyBottom;
        for (let i = turns - 1; i >= 0; i--) {
            const y = bodyBottom + 1 + span * (i + 0.5) / turns;
            ctx.strokeStyle = '#7a4410'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(16, y, 7, 1.8, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,220,160,0.75)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.ellipse(16, y - 0.6, 7, 1.8, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        }
        // Body
        const g = ctx.createRadialGradient(20, top + 8, 1, 16, top + 14, 17);
        g.addColorStop(0, '#ffd08a'); g.addColorStop(0.45, '#ff8a1a'); g.addColorStop(1, '#a04406');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(16, top + 14, 15, pose === 'rest' ? 12 : 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(110,40,0,0.8)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(21, top + 6, 4.5, 2, -0.3, 0, Math.PI * 2); ctx.fill();
        hdEyes(ctx, [[12, top + 12, 3.4], [21, top + 12, 3.4]], '#301000', [1.2, pose === 'fall' ? 1.4 : (pose === 'rise' ? -0.8 : 0.2)], null);
        ctx.strokeStyle = '#3a1400'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        if (pose === 'rise') ctx.arc(17, top + 19, 3, 0, Math.PI);
        else ctx.arc(17, top + 21, 3, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
    };
    hdTexture(scene, 'hd_tex_enemy_jumper', 32, 40, ctx => draw(ctx, 'rest'));
    hdTexture(scene, 'hd_tex_enemy_jumper_rise', 32, 40, ctx => draw(ctx, 'rise'));
    hdTexture(scene, 'hd_tex_enemy_jumper_fall', 32, 40, ctx => draw(ctx, 'fall'));
}

// Flyer: a purple orb with membrane wings; three flap frames
function hdFlyerTextures(scene) {
    [0, 1, 2].forEach(f => {
        hdTexture(scene, f === 0 ? 'hd_tex_enemy_flyer' : 'hd_tex_enemy_flyer_' + f, 28, 28, (ctx) => {
            const lift = [-7, 0, 6][f];
            [[-1, 0], [1, 28]].forEach(([dir, edge]) => {
                const root = 14 + dir * 7;
                const g = ctx.createLinearGradient(root, 0, edge, 0);
                g.addColorStop(0, 'rgba(120,70,190,0.95)');
                g.addColorStop(1, 'rgba(210,190,255,0.75)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(root, 11);
                ctx.quadraticCurveTo(root + dir * 6, 8 + lift, edge - dir * 0.5, 11 + lift);
                ctx.quadraticCurveTo(root + dir * 5, 15 + lift * 0.4, root, 18);
                ctx.fill();
            });
            const body = ctx.createRadialGradient(17, 10, 1, 14, 14, 11);
            body.addColorStop(0, '#d8a8ff'); body.addColorStop(0.5, '#8a2ee0'); body.addColorStop(1, '#3a0870');
            ctx.fillStyle = body;
            ctx.beginPath(); ctx.arc(14, 14, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.beginPath(); ctx.ellipse(17, 9, 3.5, 1.8, -0.4, 0, Math.PI * 2); ctx.fill();
            hdEyes(ctx, [[10.5, 14, 3], [18, 14, 3]], '#1a0030', [1, 0.6], null);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(12.5, 19); ctx.lineTo(14, 21.5); ctx.lineTo(15.5, 19); ctx.fill();
        });
    });
}

// Diver: a pink swift. Flap frames, wings flared when it telegraphs, wings
// swept back while it dives.
function hdDiverTextures(scene) {
    const draw = (ctx, pose) => {
        const wing = { up: -6, down: 4, spread: -9, tuck: 8 }[pose];
        [-1, 1].forEach(dir => {
            ctx.fillStyle = dir < 0 ? '#c0307e' : '#ff7ac0';
            ctx.beginPath();
            ctx.moveTo(15, 9);
            ctx.quadraticCurveTo(15 + dir * 8, 4 + wing * 0.5, 15 + dir * (pose === 'tuck' ? 8 : 15), 5 + wing);
            ctx.quadraticCurveTo(15 + dir * 7, 11, 15, 13);
            ctx.fill();
        });
        const g = ctx.createLinearGradient(0, 4, 0, 25);
        g.addColorStop(0, '#ff9ad0'); g.addColorStop(0.5, '#dd44aa'); g.addColorStop(1, '#8a1860');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(8, 7);
        ctx.quadraticCurveTo(15, 3, 22, 7);
        ctx.quadraticCurveTo(21, 17, 15, 25);
        ctx.quadraticCurveTo(9, 17, 8, 7);
        ctx.fill();
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath(); ctx.moveTo(13.5, 16); ctx.lineTo(16.5, 16); ctx.lineTo(15, 20); ctx.fill();
        hdEyes(ctx, [[12, 10.5, 2.6], [18, 10.5, 2.6]], '#2a0018', [0.6, pose === 'spread' || pose === 'tuck' ? 1.2 : 0.4], '#5a0838');
    };
    hdTexture(scene, 'hd_tex_enemy_diver', 30, 26, ctx => draw(ctx, 'up'));
    hdTexture(scene, 'hd_tex_enemy_diver_down', 30, 26, ctx => draw(ctx, 'down'));
    hdTexture(scene, 'hd_tex_enemy_diver_spread', 30, 26, ctx => draw(ctx, 'spread'));
    hdTexture(scene, 'hd_tex_enemy_diver_tuck', 30, 26, ctx => draw(ctx, 'tuck'));
}

// Shooter: an armoured turret whose lens glows while it charges a shot
function hdShooterTextures(scene) {
    const draw = (ctx, charging) => {
        const base = ctx.createLinearGradient(0, 22, 0, 32);
        base.addColorStop(0, '#6a5a5a'); base.addColorStop(1, '#2a2222');
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.moveTo(1, 32); ctx.lineTo(4, 22); ctx.lineTo(28, 22); ctx.lineTo(31, 32); ctx.fill();
        ctx.fillStyle = '#1a1414';
        [6, 16, 26].forEach(x => { ctx.beginPath(); ctx.arc(x, 28, 1.3, 0, Math.PI * 2); ctx.fill(); });
        const dome = ctx.createRadialGradient(20, 9, 1, 16, 16, 15);
        dome.addColorStop(0, '#e06a6a'); dome.addColorStop(0.5, '#901818'); dome.addColorStop(1, '#3a0404');
        ctx.fillStyle = dome;
        ctx.beginPath();
        ctx.moveTo(4, 23); ctx.lineTo(4, 16);
        ctx.arc(16, 16, 12, Math.PI, 0);
        ctx.lineTo(28, 23); ctx.fill();
        ctx.strokeStyle = 'rgba(40,0,0,0.9)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(20, 8, 4, 1.8, -0.4, 0, Math.PI * 2); ctx.fill();
        // Barrel ring and lens
        ctx.fillStyle = '#2a2020';
        ctx.beginPath(); ctx.arc(16, 16, 6.5, 0, Math.PI * 2); ctx.fill();
        if (charging) hdSoftDot(ctx, 16, 16, 12, 0xffe060, 0.8);
        const lens = ctx.createRadialGradient(15, 15, 0.5, 16, 16, 5);
        lens.addColorStop(0, charging ? '#ffffff' : '#fff2a0');
        lens.addColorStop(0.5, charging ? '#ffe040' : '#ffcc00');
        lens.addColorStop(1, charging ? '#ff8a00' : '#a06a00');
        ctx.fillStyle = lens;
        ctx.beginPath(); ctx.arc(16, 16, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(16.5, 16.5, 1.8, 0, Math.PI * 2); ctx.fill();
    };
    hdTexture(scene, 'hd_tex_enemy_shooter', 32, 32, ctx => draw(ctx, false));
    hdTexture(scene, 'hd_tex_enemy_shooter_charge', 32, 32, ctx => draw(ctx, true));
}

// ========================
// Hazards and pickups
// ========================

function hdHazardTextures(scene) {
    // Spikes: forged steel on a bolted plate
    hdTexture(scene, 'hd_tex_spike', 30, 30, (ctx) => {
        const plate = ctx.createLinearGradient(0, 25, 0, 30);
        plate.addColorStop(0, '#6a6e78'); plate.addColorStop(1, '#2a2c32');
        ctx.fillStyle = plate;
        ctx.fillRect(0, 25, 30, 5);
        ctx.fillStyle = '#1a1b20';
        ctx.fillRect(3, 27, 2, 2); ctx.fillRect(25, 27, 2, 2);
        [[1, 8, 15], [15, 22, 29]].forEach(([l, tip, r]) => {
            const g = ctx.createLinearGradient(l, 0, r, 0);
            g.addColorStop(0, '#4a4e58'); g.addColorStop(0.5, '#e6eaf0'); g.addColorStop(1, '#6a6e78');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(l, 26); ctx.lineTo(tip, 1); ctx.lineTo(r, 26); ctx.fill();
            ctx.fillStyle = 'rgba(160,40,30,0.55)';
            ctx.beginPath(); ctx.moveTo(tip - 1.5, 6); ctx.lineTo(tip, 1); ctx.lineTo(tip + 1.5, 6); ctx.fill();
        });
    });

    // Crate: planked box with iron corners
    hdTexture(scene, 'hd_tex_crate', 40, 40, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 40);
        g.addColorStop(0, '#d2a468'); g.addColorStop(1, '#8a6034');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 40, 40);
        ctx.strokeStyle = 'rgba(70,40,14,0.7)'; ctx.lineWidth = 1;
        [10, 20, 30].forEach(y => { ctx.beginPath(); ctx.moveTo(3, y); ctx.lineTo(37, y); ctx.stroke(); });
        ctx.strokeStyle = '#6a4418'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(35, 35); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,160,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(5, 3); ctx.lineTo(37, 35); ctx.stroke();
        ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, 37, 37);
        ctx.fillStyle = '#4a4d55';
        [[0, 0], [33, 0], [0, 33], [33, 33]].forEach(([x, y]) => {
            ctx.fillRect(x, y, 7, 7);
            ctx.fillStyle = '#8d929c'; ctx.fillRect(x + 2.5, y + 2.5, 2, 2); ctx.fillStyle = '#4a4d55';
        });
    });

    // Gem: white faceted stone (tinted per power-up type) with a sparkle
    hdTexture(scene, 'hd_tex_gem', 26, 26, (ctx) => {
        hdSoftDot(ctx, 13, 13, 13, 0xffffff, 0.35);
        const pts = [[13, 1], [23, 9], [13, 25], [3, 9]];
        const faces = [
            [[13, 1], [23, 9], [13, 11], '#ffffff'],
            [[13, 1], [13, 11], [3, 9], '#e2e6ee'],
            [[3, 9], [13, 11], [13, 25], '#b8bec8'],
            [[23, 9], [13, 25], [13, 11], '#d4d9e2']
        ];
        faces.forEach(([a, b, c, col]) => {
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.fill();
        });
        ctx.strokeStyle = 'rgba(80,90,110,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(9, 3); ctx.lineTo(10, 6); ctx.lineTo(13, 7); ctx.lineTo(10, 8); ctx.lineTo(9, 11); ctx.lineTo(8, 8); ctx.lineTo(5, 7); ctx.fill();
    });

    // Key: polished brass
    hdTexture(scene, 'hd_tex_key', 22, 22, (ctx) => {
        const g = ctx.createLinearGradient(0, 2, 0, 16);
        g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#f0b828'); g.addColorStop(1, '#8a5a08');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(7, 8, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(11, 6.5, 10, 3.5);
        ctx.fillRect(16, 10, 2.5, 4); ctx.fillRect(19.5, 10, 2, 3);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(7, 8, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.ellipse(5, 4.5, 2, 1, -0.6, 0, Math.PI * 2); ctx.fill();
    });

    // Gate: an iron portcullis in a stone frame
    hdTexture(scene, 'hd_tex_gate', 30, 90, (ctx) => {
        ctx.fillStyle = '#1a1620';
        ctx.fillRect(0, 0, 30, 90);
        const bar = ctx.createLinearGradient(0, 0, 5, 0);
        bar.addColorStop(0, '#3a3e48'); bar.addColorStop(0.5, '#9aa0ac'); bar.addColorStop(1, '#3a3e48');
        ctx.fillStyle = bar;
        for (let x = 2; x < 28; x += 7) {
            ctx.save(); ctx.translate(x, 0); ctx.fillRect(0, 0, 4, 90); ctx.restore();
            ctx.fillStyle = '#c8ccd4';
            ctx.beginPath(); ctx.moveTo(x, 90); ctx.lineTo(x + 2, 86); ctx.lineTo(x + 4, 90); ctx.fill();
            ctx.fillStyle = bar;
        }
        ctx.fillStyle = '#5a5e68';
        for (let y = 10; y < 90; y += 20) ctx.fillRect(0, y, 30, 3);
        ctx.fillStyle = '#ffcc33';
        ctx.beginPath(); ctx.arc(15, 45, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a4010';
        ctx.fillRect(14, 44, 2, 4);
    });

    // Shield bubble drawn around shield enemies
    hdTexture(scene, 'hd_bubble', 48, 48, (ctx) => {
        const g = ctx.createRadialGradient(24, 24, 14, 24, 24, 23);
        g.addColorStop(0, 'rgba(120,255,255,0)');
        g.addColorStop(0.75, 'rgba(120,255,255,0.18)');
        g.addColorStop(1, 'rgba(180,255,255,0.75)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(24, 24, 23, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(24, 24, 19, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
    });

    // Wall torch: iron bracket, wrapped handle, flame
    hdTexture(scene, 'hd_torch', 16, 40, (ctx) => {
        ctx.fillStyle = '#1a1418';
        ctx.fillRect(6, 22, 4, 16);
        ctx.fillRect(2, 34, 12, 3);
        ctx.fillStyle = '#5a3a1c';
        ctx.fillRect(5.5, 14, 5, 10);
        const f = ctx.createRadialGradient(8, 10, 0.5, 8, 9, 8);
        f.addColorStop(0, '#fffbe0'); f.addColorStop(0.35, '#ffd24a'); f.addColorStop(0.7, '#ff7a1a'); f.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = f;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.quadraticCurveTo(14, 9, 11, 15); ctx.lineTo(5, 15); ctx.quadraticCurveTo(2, 9, 8, 0);
        ctx.fill();
    });
}

// Boss: an armoured stone warden, drawn in the level's boss colour. Eyes
// and core are separate images so the fight's phase colours still show.
function hdBossTexture(scene, color) {
    const key = 'hd_boss_' + color.toString(16);
    return hdTexture(scene, key, 84, 84, (ctx) => {
        const base = hdMix(color, 0x8a8a9a, 0.35);
        const lit = hdMix(base, 0xffffff, 0.35);
        const dark = hdMix(base, 0x000000, 0.55);
        const plate = (x, y, w, h, r) => {
            const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
            g.addColorStop(0, hdHex(lit)); g.addColorStop(0.5, hdHex(base)); g.addColorStop(1, hdHex(dark));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
        };
        // Legs, arms, torso, shoulders, head
        plate(20, 60, 16, 22, 4); plate(48, 60, 16, 22, 4);
        plate(2, 30, 16, 34, 6); plate(66, 30, 16, 34, 6);
        plate(14, 22, 56, 44, 10);
        plate(8, 20, 22, 14, 6); plate(54, 20, 22, 14, 6);
        plate(28, 4, 28, 22, 8);
        // Visor slit (eyes glow through it from the eye layer)
        ctx.fillStyle = '#050308';
        ctx.fillRect(31, 12, 22, 6);
        // Chest socket for the core
        ctx.fillStyle = '#050308';
        ctx.beginPath(); ctx.arc(42, 44, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = hdHex(lit); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(42, 44, 11, 0, Math.PI * 2); ctx.stroke();
        // Rivets and cracks
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        [[18, 27], [66, 27], [20, 58], [64, 58]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); });
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(22, 36); ctx.lineTo(27, 42); ctx.lineTo(25, 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(60, 30); ctx.lineTo(56, 38); ctx.stroke();
    });
}

function hdBossPartTextures(scene) {
    hdTexture(scene, 'hd_boss_eyes', 22, 6, (ctx) => {
        [[5, 3], [17, 3]].forEach(([x, y]) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        });
    });
    hdTexture(scene, 'hd_boss_core', 22, 22, (ctx) => {
        const g = ctx.createRadialGradient(9, 9, 1, 11, 11, 10);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f0f0f0'); g.addColorStop(1, '#8a8a8a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(11, 11, 9, 0, Math.PI * 2); ctx.fill();
    });
}
