// ========================
// HD look — richer presentation for every level
// ========================
// A code-drawn art pass that sits entirely on the presentation side, like
// visuals.js. Physics bodies, level data and tuning are untouched: every
// object here either replaces a texture or follows an existing visual.
//
// Files: hdlook.js (assembly, player rig, per-frame animation),
// hdscenery.js (painters), hdbiomes.js (one recipe per world) and
// hdcreatures.js (enemies, boss, hazards). Everything is drawn with the
// Canvas 2D API and cached as textures, so it works in both renderers and
// needs no image files.
//
// Endless mode tours every world, switching every 400m.
//
// Add ?look=classic to the URL to compare against the original art.

let hdLookActive = false;
let hdBiome = null;        // the current world's recipe from hdbiomes.js
let hdBiomeName = null;

// Everything animated per frame, rebuilt on every level load
let hdRig = null;
let hdCoinGlows = [];
let hdParticles = [];      // screen-space ambient particles
let hdCritters = [];       // butterflies, birds and bats
let hdDrifters = [];       // layers that drift sideways (mist)
let hdOptional = [];       // decoration hidden when low-FX mode kicks in
let hdDarkness = null;
let hdGoal = null;
let hdBoss = null;
let hdBubbles = [];
let hdGlowFollowers = [];
let hdNextShootingStar = 0;

function shouldUseHdLook() {
    const params = new URLSearchParams(window.location.search);
    return params.get('look') !== 'classic';
}

// Swaps a classic texture key for its HD counterpart when one exists.
// Moving planks pass their size and get a texture drawn to fit it.
function hdTextureKey(key, w, h) {
    if (!hdLookActive) return key;
    if (key === 'tex_plank' && w && h) {
        return hdPlankTexture(game.scene.scenes[0], w, h, hdBiome.plank || 'wood');
    }
    return game.textures.exists('hd_' + key) ? 'hd_' + key : key;
}

// ========================
// Canvas helpers
// ========================

function hdRandom(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hdHex(c) {
    return '#' + c.toString(16).padStart(6, '0');
}

function hdMix(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) |
        (Math.round(ag + (bg - ag) * t) << 8) |
        Math.round(ab + (bb - ab) * t);
}

function hdRgba(c, a) {
    return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

// Draws into a cached canvas texture. `blur` softens the result by drawing at
// reduced resolution and scaling back up, which works on every browser
// (ctx.filter is not universal). Painters that write pixels directly must
// not use it: putImageData ignores the scale.
function hdTexture(scene, key, w, h, draw, blur) {
    if (scene.textures.exists(key)) return key;
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    if (blur && blur > 1) {
        const small = document.createElement('canvas');
        small.width = Math.ceil(w / blur);
        small.height = Math.ceil(h / blur);
        const sctx = small.getContext('2d');
        sctx.scale(1 / blur, 1 / blur);
        draw(sctx, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(small, 0, 0, w, h);
    } else {
        draw(ctx, w, h);
    }
    tex.refresh();
    return key;
}

// Draws a shape three times, offset by the tile width, so features that
// cross an edge wrap and the texture tiles without a seam.
function hdWrap(W, fn) {
    fn(-W); fn(0); fn(W);
}

// Periodic 1D noise: integer-frequency sines always repeat over W. The ridged
// form (1 - |sin|) gives sharp peaks for mountains.
function hdRidge(seed, W, ridged) {
    const rnd = hdRandom(seed);
    const terms = [];
    let norm = 0;
    [1, 2, 3, 5, 7, 11, 17, 26].forEach(k => {
        const a = (0.6 + rnd() * 0.8) / Math.pow(k, 0.85);
        terms.push({ k: k, a: a, p: rnd() * Math.PI * 2 });
        norm += a;
    });
    return x => {
        let v = 0;
        for (let i = 0; i < terms.length; i++) {
            const t = terms[i];
            const s = Math.sin(Math.PI * 2 * t.k * x / W + t.p);
            v += t.a * (ridged ? (1 - Math.abs(s)) * 2 - 1 : s);
        }
        return v / norm; // roughly -1..1
    };
}

function hdSoftDot(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hdRgba(color, alpha));
    g.addColorStop(1, hdRgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hdStar(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? inner : outer;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
}

// Where a pole-mounted object (goal, checkpoint) should stand: the surface
// nearest the object's own base, and never far from it, so the art always
// sits where the trigger actually is. Returns { x, y } with x nudged back
// onto the surface if the pole would hang just past its edge.
function hdPoleFooting(x, baseY) {
    let best = null;
    const consider = (top, left, right) => {
        if (Math.abs(top - baseY) > 35) return;
        if (x < left - 20 || x > right + 20) return;
        if (!best || Math.abs(top - baseY) < Math.abs(best.top - baseY)) best = { top, left, right };
    };
    consider(560, 0, currentLevel.worldWidth);
    [currentLevel.platforms, currentLevel.secretPlatforms].forEach(list => (list || []).forEach(p => {
        consider(p.y - p.height / 2, p.x - p.width / 2, p.x + p.width / 2);
    }));
    if (!best) return { x: x, y: baseY };
    return { x: Phaser.Math.Clamp(x, best.left + 6, best.right - 6), y: best.top };
}

// ========================
// Object textures
// ========================

function hdObjectTextures(scene) {
    // Coin: struck gold with an embossed rim
    hdTexture(scene, 'hd_tex_coin', 22, 22, (ctx) => {
        const g = ctx.createRadialGradient(8, 7, 1, 11, 11, 11);
        g.addColorStop(0, '#fff7c4');
        g.addColorStop(0.35, '#ffd84a');
        g.addColorStop(0.8, '#dc9c16');
        g.addColorStop(1, '#9a6206');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(11, 11, 10.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,70,4,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(11, 11, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,95,10,0.7)';
        ctx.beginPath(); ctx.arc(11, 11, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,245,190,0.7)';
        ctx.beginPath(); ctx.arc(11, 11, 7, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
        ctx.fillStyle = 'rgba(150,95,10,0.8)';
        hdStar(ctx, 11.6, 11.6, 4.2, 1.8);
        ctx.fillStyle = '#ffeaa0';
        hdStar(ctx, 11, 11, 4.2, 1.8);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.ellipse(7, 6, 2.2, 1.3, -0.6, 0, Math.PI * 2); ctx.fill();
    });

    // Spring: steel base, brass coil, rubber pad
    const drawSpring = (ctx, compressed) => {
        const base = ctx.createLinearGradient(0, 18, 0, 24);
        base.addColorStop(0, '#8a8f9c'); base.addColorStop(1, '#3b3f49');
        ctx.fillStyle = base;
        ctx.fillRect(1, 19, 30, 5);
        ctx.fillStyle = '#c9ced8'; ctx.fillRect(1, 19, 30, 1);
        ctx.fillStyle = '#2b2e36';
        ctx.fillRect(4, 21, 2, 2); ctx.fillRect(26, 21, 2, 2);
        const coils = compressed ? [17] : [16, 12.5, 9];
        coils.forEach(cy => {
            const cg = ctx.createLinearGradient(0, cy - 1.5, 0, cy + 1.5);
            cg.addColorStop(0, '#fbe29a'); cg.addColorStop(0.5, '#d6a13a'); cg.addColorStop(1, '#8a5d14');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.ellipse(16, cy, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
        });
        const padY = compressed ? 11 : 2;
        const pad = ctx.createLinearGradient(0, padY, 0, padY + 7);
        pad.addColorStop(0, '#ff7a6a'); pad.addColorStop(0.4, '#d8322a'); pad.addColorStop(1, '#8e1a16');
        ctx.fillStyle = pad;
        ctx.beginPath();
        ctx.moveTo(4, padY + 7); ctx.lineTo(4, padY + 2);
        ctx.quadraticCurveTo(4, padY, 7, padY); ctx.lineTo(25, padY);
        ctx.quadraticCurveTo(28, padY, 28, padY + 2); ctx.lineTo(28, padY + 7);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(8, padY + 1, 14, 1);
    };
    hdTexture(scene, 'hd_tex_spring', 32, 24, ctx => drawSpring(ctx, false));
    hdTexture(scene, 'hd_tex_spring_compressed', 32, 24, ctx => drawSpring(ctx, true));

    // Checkpoint: the tinted rect draws only the banner, so the wooden pole
    // (a separate untinted image) keeps its natural colour.
    hdTexture(scene, 'hd_tex_checkpoint', 20, 50, (ctx) => {
        const cloth = ctx.createLinearGradient(6, 0, 19, 0);
        cloth.addColorStop(0, '#d8d8d8'); cloth.addColorStop(0.45, '#ffffff'); cloth.addColorStop(1, '#cfcfcf');
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.moveTo(6, 3);
        ctx.quadraticCurveTo(13, 1, 19, 6);
        ctx.quadraticCurveTo(15, 9, 19, 14);
        ctx.quadraticCurveTo(12, 12, 6, 16);
        ctx.closePath(); ctx.fill();
    });
    hdTexture(scene, 'hd_checkpoint_pole', 8, 64, (ctx) => {
        const pole = ctx.createLinearGradient(2, 0, 6, 0);
        pole.addColorStop(0, '#5a3a20'); pole.addColorStop(0.5, '#a97c4f'); pole.addColorStop(1, '#6e4a2c');
        ctx.fillStyle = pole; ctx.fillRect(2.5, 2, 3, 62);
        ctx.fillStyle = '#c9ced8';
        ctx.beginPath(); ctx.arc(4, 2.5, 2.2, 0, Math.PI * 2); ctx.fill();
    });
    hdTexture(scene, 'hd_checkpoint_base', 14, 6, (ctx) => {
        ctx.fillStyle = '#8f949e';
        ctx.beginPath(); ctx.ellipse(7, 3.5, 6.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(3, 2, 8, 1);
    });

    // Wooden start sign
    hdTexture(scene, 'hd_sign_start', 46, 50, (ctx) => {
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(20, 20, 5, 30);
        const board = ctx.createLinearGradient(0, 4, 0, 24);
        board.addColorStop(0, '#c89a64'); board.addColorStop(1, '#8a6038');
        ctx.fillStyle = board;
        ctx.beginPath();
        ctx.moveTo(2, 6); ctx.lineTo(36, 6); ctx.lineTo(44, 14); ctx.lineTo(36, 22); ctx.lineTo(2, 22);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(60,36,16,0.8)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#3d2410';
        ctx.font = 'bold 9px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText('START', 6, 14.5);
    });

    hdTexture(scene, 'hd_mote', 16, 16, (ctx) => hdSoftDot(ctx, 8, 8, 8, 0xffffff, 1));

    // A streak for shooting stars and sparks
    hdTexture(scene, 'hd_streak', 64, 4, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 64, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 1, 64, 2);
    });

    hdTexture(scene, 'hd_drip', 3, 8, (ctx) => {
        ctx.fillStyle = 'rgba(170,220,255,0.85)';
        ctx.beginPath(); ctx.moveTo(1.5, 0); ctx.quadraticCurveTo(3, 6, 1.5, 8); ctx.quadraticCurveTo(0, 6, 1.5, 0); ctx.fill();
    });

    hdTexture(scene, 'hd_bat', 18, 8, (ctx) => {
        ctx.fillStyle = '#0a0610';
        ctx.beginPath();
        ctx.moveTo(9, 3);
        ctx.quadraticCurveTo(5, -1, 0, 2); ctx.quadraticCurveTo(3, 3, 2, 6); ctx.quadraticCurveTo(6, 4, 9, 6);
        ctx.quadraticCurveTo(12, 4, 16, 6); ctx.quadraticCurveTo(15, 3, 18, 2); ctx.quadraticCurveTo(13, -1, 9, 3);
        ctx.fill();
        ctx.beginPath(); ctx.arc(9, 4.5, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    hdGoalTextures(scene);
}

// Colours are baked in rather than tinted: the Canvas renderer ignores tint
function hdLeafTexture(scene, color) {
    return hdTexture(scene, 'hd_leaf_' + color.toString(16), 12, 7, (ctx) => {
        ctx.fillStyle = hdHex(color);
        ctx.beginPath();
        ctx.moveTo(0.5, 3.5);
        ctx.quadraticCurveTo(6, -1.5, 11.5, 3.5);
        ctx.quadraticCurveTo(6, 8.5, 0.5, 3.5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(1, 3.5); ctx.lineTo(11, 3.5); ctx.stroke();
    });
}

function hdButterflyTexture(scene, color) {
    return hdTexture(scene, 'hd_butterfly_' + color.toString(16), 14, 10, (ctx) => {
        ctx.fillStyle = hdHex(color);
        ctx.beginPath(); ctx.ellipse(4, 3.5, 3.8, 3.2, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10, 3.5, 3.8, 3.2, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4.5, 7.2, 2.4, 2, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(9.5, 7.2, 2.4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2018'; ctx.fillRect(6.5, 2, 1, 7);
    });
}

function hdBirdTexture(scene, color) {
    return hdTexture(scene, 'hd_bird_' + color.toString(16), 14, 6, (ctx) => {
        ctx.strokeStyle = hdHex(color); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(1, 2); ctx.quadraticCurveTo(4, 0, 7, 4); ctx.quadraticCurveTo(10, 0, 13, 2);
        ctx.stroke();
    });
}

// ========================
// Goal flag
// ========================
// The classic flag was small and gold, and melted into grass. The goal is now
// a tall pole with a big red banner that really waves (eight cloth frames),
// a golden light beacon rising from its base and sparkles drifting up.

const HD_GOAL_POLE = 150;
const HD_GOAL_FRAMES = 8;

function hdGoalTextures(scene) {
    hdTexture(scene, 'hd_goal_pole', 12, HD_GOAL_POLE, (ctx, w, h) => {
        const pole = ctx.createLinearGradient(2, 0, 10, 0);
        pole.addColorStop(0, '#3a2a1a'); pole.addColorStop(0.45, '#c8a070'); pole.addColorStop(1, '#5a3e24');
        ctx.fillStyle = pole;
        ctx.fillRect(3.5, 8, 5, h - 8);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let y = 30; y < h; y += 34) ctx.fillRect(3.5, y, 5, 2);
        const knob = ctx.createRadialGradient(4.5, 3.5, 0.5, 6, 5.5, 5.5);
        knob.addColorStop(0, '#fffbe0'); knob.addColorStop(0.5, '#ffd23a'); knob.addColorStop(1, '#a06a00');
        ctx.fillStyle = knob;
        ctx.beginPath(); ctx.arc(6, 5.5, 5.2, 0, Math.PI * 2); ctx.fill();
    });
    hdTexture(scene, 'hd_goal_base', 40, 16, (ctx) => {
        const g = ctx.createLinearGradient(0, 2, 0, 16);
        g.addColorStop(0, '#d8dce4'); g.addColorStop(1, '#6a6e7a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(4, 16); ctx.lineTo(8, 4); ctx.lineTo(32, 4); ctx.lineTo(36, 16);
        ctx.fill();
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(8, 4, 24, 2);
    });
    // Flat banner art first, then each frame slices it into columns and
    // offsets them along a travelling wave, shading by the wave's slope.
    const CW = 64, CH = 42;
    const art = document.createElement('canvas');
    art.width = CW; art.height = CH;
    const a = art.getContext('2d');
    const cloth = a.createLinearGradient(0, 0, 0, CH);
    cloth.addColorStop(0, '#ff4a3a'); cloth.addColorStop(1, '#b0141e');
    a.fillStyle = cloth;
    a.beginPath();
    a.moveTo(0, 0); a.lineTo(CW, 0); a.lineTo(CW - 10, CH / 2); a.lineTo(CW, CH); a.lineTo(0, CH);
    a.closePath(); a.fill();
    a.strokeStyle = '#ffd23a'; a.lineWidth = 3;
    a.beginPath();
    a.moveTo(0, 2); a.lineTo(CW - 2, 2); a.lineTo(CW - 12, CH / 2); a.lineTo(CW - 2, CH - 2); a.lineTo(0, CH - 2);
    a.stroke();
    a.fillStyle = '#ffe070';
    hdStar(a, 24, CH / 2, 11, 4.5);
    a.fillStyle = '#fff6c8';
    hdStar(a, 23, CH / 2 - 1, 5, 2);
    for (let f = 0; f < HD_GOAL_FRAMES; f++) {
        hdTexture(scene, 'hd_goal_cloth_' + f, CW + 4, CH + 12, (ctx) => {
            const phase = f / HD_GOAL_FRAMES * Math.PI * 2;
            for (let x = 0; x < CW; x++) {
                const u = x / CW;
                const amp = 1.5 + u * 5;
                const dy = Math.sin(phase - u * 7) * amp;
                const slope = Math.cos(phase - u * 7);
                ctx.drawImage(art, x, 0, 1, CH, x, 6 + dy, 1, CH);
                ctx.fillStyle = slope > 0 ? `rgba(255,240,220,${slope * 0.22})` : `rgba(40,0,10,${-slope * 0.3})`;
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillRect(x, 0, 1, CH + 12);
                ctx.globalCompositeOperation = 'source-over';
            }
        });
    }
}

// Built in decorateHdLevel once the classic flag exists. The classic image
// stays as the physics body (hidden); every part here mirrors its alpha, so
// boss levels that hide the flag until victory still work.
function hdBuildGoal(scene) {
    if (!endFlag) return;
    const footing = hdPoleFooting(endFlag.x - 14, endFlag.y + 30);
    const ground = footing.y;
    const poleX = footing.x;
    const top = ground - HD_GOAL_POLE;
    endFlag.setVisible(false);

    // The ray texture is brightest at its origin and fades along its length;
    // turned upside down it rises from the base and fades into the sky
    const beam = scene.add.image(poleX, ground, 'hd_ray').setOrigin(0.5, 0).setRotation(Math.PI)
        .setScale(1.3, 0.75).setTint(0xffd86a).setBlendMode(Phaser.BlendModes.ADD).setDepth(1).setAlpha(0.45);
    const pool = scene.add.image(poleX, ground, 'hd_glow').setScale(1.6, 0.45)
        .setTint(0xffd86a).setBlendMode(Phaser.BlendModes.ADD).setDepth(1).setAlpha(0.7);
    const pole = scene.add.image(poleX, ground, 'hd_goal_pole').setOrigin(0.5, 1).setDepth(2);
    const cloth = scene.add.image(poleX + 3, top + 6, 'hd_goal_cloth_0').setOrigin(0, 0).setDepth(2);
    const base = scene.add.image(poleX, ground + 2, 'hd_goal_base').setOrigin(0.5, 1).setDepth(2);
    const knobGlow = scene.add.image(poleX, top + 5, 'hd_glow').setScale(0.35)
        .setTint(0xffe28a).setBlendMode(Phaser.BlendModes.ADD).setDepth(66).setAlpha(0.8);
    scene.tweens.add({ targets: [beam, pool], alpha: { from: 0.3, to: 0.6 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const sparks = [];
    for (let i = 0; i < 10; i++) {
        const s = scene.add.image(poleX, ground, 'hd_mote').setScale(0.25)
            .setTint(0xffe070).setBlendMode(Phaser.BlendModes.ADD).setDepth(66);
        sparks.push({ obj: s, t: Math.random() });
    }
    hdGoal = {
        parts: [beam, pool, pole, cloth, base, knobGlow], cloth: cloth, sparks: sparks,
        x: poleX, ground: ground, height: HD_GOAL_POLE
    };
}

// ========================
// Player art
// ========================
// Player parts. The body is drawn in greys so the cosmetic tint shades it;
// the shine layer sits on top untinted, keeping highlights white.
function hdPlayerBodyPath(ctx, x, y, s, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + s - r, y);
    ctx.quadraticCurveTo(x + s, y, x + s, y + r);
    ctx.lineTo(x + s, y + s - r);
    ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
    ctx.lineTo(x + r, y + s);
    ctx.quadraticCurveTo(x, y + s, x, y + s - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function hdDrawPlayerBody(ctx) {
    hdPlayerBodyPath(ctx, 1, 1, 32, 10);
    const g = ctx.createLinearGradient(0, 1, 0, 33);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#e8ecf1');
    g.addColorStop(1, '#aeb6c3');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const side = ctx.createLinearGradient(1, 0, 33, 0);
    side.addColorStop(0, 'rgba(60,70,95,0.28)');
    side.addColorStop(0.5, 'rgba(60,70,95,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, 34, 34);
    ctx.restore();
    ctx.strokeStyle = 'rgba(55,62,80,0.6)';
    ctx.lineWidth = 1.2;
    hdPlayerBodyPath(ctx, 1.5, 1.5, 31, 9.5);
    ctx.stroke();
}

function hdDrawPlayerShine(ctx) {
    ctx.save();
    hdPlayerBodyPath(ctx, 1, 1, 32, 10);
    ctx.clip();
    // Form shadow away from the sun, drawn untinted so it reads on any colour
    const shade = ctx.createLinearGradient(30, 4, 6, 34);
    shade.addColorStop(0, 'rgba(10,14,40,0)');
    shade.addColorStop(0.55, 'rgba(10,14,40,0.08)');
    shade.addColorStop(1, 'rgba(10,14,40,0.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 34, 34);
    const top = ctx.createLinearGradient(0, 1, 0, 14);
    top.addColorStop(0, 'rgba(255,255,255,0.45)');
    top.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, 34, 14);
    // Warm rim light on the sun side
    const rim = ctx.createLinearGradient(26, 0, 34, 0);
    rim.addColorStop(0, 'rgba(255,236,190,0)');
    rim.addColorStop(1, 'rgba(255,236,190,0.6)');
    ctx.fillStyle = rim;
    ctx.fillRect(26, 0, 8, 26);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(27, 5.2, 3, 1.5, -0.4, 0, Math.PI * 2); ctx.fill();
}

function hdPlayerTextures(scene) {
    hdTexture(scene, 'hd_body', 34, 34, hdDrawPlayerBody);
    hdTexture(scene, 'hd_body_shine', 34, 34, hdDrawPlayerShine);
    // White cartoon glove: reads clearly over any body colour
    hdTexture(scene, 'hd_hand', 10, 10, (ctx) => {
        const g = ctx.createRadialGradient(6.5, 3.5, 0.5, 5, 5, 5);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f1f3f7'); g.addColorStop(1, '#bfc6d2');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(5, 5, 4.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(30,34,50,0.85)'; ctx.lineWidth = 1.1; ctx.stroke();
    });
    hdTexture(scene, 'hd_foot', 13, 8, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 8);
        g.addColorStop(0, '#5d6474'); g.addColorStop(1, '#262a33');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(1, 7.5); ctx.quadraticCurveTo(0, 1, 6, 0.8);
        ctx.quadraticCurveTo(12.5, 1, 12.5, 7.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(4, 1.5, 5, 1);
    });
    hdTexture(scene, 'hd_eye', 8, 11, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 11);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8dde6');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(4, 5.5, 3.6, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,24,40,0.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    });
    hdTexture(scene, 'hd_pupil', 5, 7, (ctx) => {
        ctx.fillStyle = '#141827';
        ctx.beginPath(); ctx.ellipse(2.5, 3.5, 2.3, 3.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(3.3, 2, 0.9, 0, Math.PI * 2); ctx.fill();
    });
    hdTexture(scene, 'hd_mouth_smile', 10, 6, (ctx) => {
        ctx.strokeStyle = '#1b1f2e'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(1.5, 1.5); ctx.quadraticCurveTo(5, 5, 8.5, 1.5); ctx.stroke();
    });
    hdTexture(scene, 'hd_mouth_open', 10, 8, (ctx) => {
        ctx.fillStyle = '#1b1f2e';
        ctx.beginPath(); ctx.moveTo(1, 1.5); ctx.quadraticCurveTo(5, 0.5, 9, 1.5);
        ctx.quadraticCurveTo(8, 7.5, 5, 7.5); ctx.quadraticCurveTo(2, 7.5, 1, 1.5); ctx.fill();
        ctx.fillStyle = '#e46a7a';
        ctx.beginPath(); ctx.ellipse(5, 6, 2.4, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    });
    hdTexture(scene, 'hd_mouth_o', 10, 8, (ctx) => {
        ctx.fillStyle = '#1b1f2e';
        ctx.beginPath(); ctx.ellipse(5, 4, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    });
    hdTexture(scene, 'hd_mouth_grit', 10, 6, (ctx) => {
        ctx.fillStyle = '#1b1f2e'; ctx.fillRect(0.5, 1, 9, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1.5, 1.8, 7, 1.2);
        ctx.fillStyle = 'rgba(27,31,46,0.8)'; ctx.fillRect(4.5, 1.8, 0.8, 1.2);
    });
    // Flat composite for the ghost replay and dash afterimages
    hdTexture(scene, 'hd_tex_player', 34, 34, (ctx) => {
        hdDrawPlayerBody(ctx);
        hdDrawPlayerShine(ctx);
        ctx.fillStyle = '#141827';
        ctx.beginPath(); ctx.ellipse(20, 13, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(28, 13, 2.6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    });
}

// ========================
// Scene assembly
// ========================
// Scenery (everything that belongs to a world: sky, layers, props, ground,
// framing, atmosphere, lighting) is built by hdBuildScenery and can be torn
// down and rebuilt, which is how endless mode moves from world to world.
// The rig, goal, glows and boss skin live outside it.

const HD_LOOP_TILE = 1024;       // how far a looping strip jumps when it recycles
const HD_ENDLESS_WORLD_PX = 4000; // endless: a new world every 400m
const HD_ENDLESS_ORDER = ['meadow', 'canyon', 'jungle', 'sky', 'fortress', 'cave', 'machine', 'castleNight', 'canyonNight'];

let hdScenery = [];        // objects owned by the current world
let hdStrips = [];         // endless: tiled strips that recycle as the camera moves
let hdLoopers = [];        // sprites that wrap around (clouds, props, overhangs)
let hdEndlessWorld = 0;
let hdEndlessNextX = 0;
let hdWarmJobs = [];       // endless: textures for the next world, painted a few per frame
let hdSwitching = false;
const hdWorldKeys = {};    // endless: texture keys each world painted, for release

function hdEndless() {
    return typeof endlessMode !== 'undefined' && endlessMode;
}

function hdResetState() {
    hdRig = null;
    hdCoinGlows = [];
    hdGoal = null;
    hdBoss = null;
    hdBubbles = [];
    hdGlowFollowers = [];
    hdResetSceneryState();
    hdScenery = [];
    hdEndlessWorld = 0;
    hdEndlessNextX = 0;
    hdWarmJobs = [];
    hdSwitching = false;
}

function hdResetSceneryState() {
    hdParticles = [];
    hdCritters = [];
    hdDrifters = [];
    hdOptional = [];
    hdStrips = [];
    hdLoopers = [];
    hdDarkness = null;
    hdNextShootingStar = 0;
}

// A tiled strip that scrolls with the camera at `factor`. In a level it is
// simply sized to cover the whole world; in endless mode the world has no
// end, so it is one screen plus a margin wide and recycles itself as the
// camera moves (see hdUpdateStrips).
function hdLayer(scene, key, y, height, factor, depth, alpha) {
    const width = hdEndless()
        ? 800 + HD_LOOP_TILE * 2
        : Math.ceil(800 + Math.max(0, currentLevel.worldWidth - 800) * factor) + 4;
    const strip = scene.add.tileSprite(0, y, width, height, key).setOrigin(0, 0);
    strip.setScrollFactor(factor, 0).setDepth(depth);
    strip.hdDrift = 0;
    if (alpha !== undefined) strip.setAlpha(alpha);
    if (hdEndless()) hdStrips.push({ strip: strip, f: factor });
    return strip;
}

// Keeps a looping strip under the camera. Moving the strip and its tile
// offset by the same amount leaves every texel where it was on screen.
function hdUpdateStrips(scene) {
    const scrollX = scene.cameras.main.scrollX;
    hdStrips.forEach(s => {
        const want = Math.floor((scrollX * s.f - HD_LOOP_TILE / 2) / HD_LOOP_TILE) * HD_LOOP_TILE;
        if (s.strip.x !== want) s.strip.x = want;
        s.strip.tilePositionX = s.strip.x + s.strip.hdDrift;
    });
}

// Sprites spread over `span` at scroll factor f wrap around once they leave
// the screen, so a handful of them cover any distance.
function hdLoop(obj, f, span, vx) {
    hdLoopers.push({ obj: obj, f: f, span: span, vx: vx || 0, margin: Math.max(obj.displayWidth, 60) / 2 + 20 });
}

function hdUpdateLoopers(scene, dt, running) {
    const scrollX = scene.cameras.main.scrollX;
    hdLoopers.forEach(l => {
        if (running) l.obj.x += l.vx * dt;
        const sx = l.obj.x - scrollX * l.f;
        if (sx < -l.margin) l.obj.x += l.span;
        else if (sx > l.span - l.margin) l.obj.x -= l.span;
    });
}

// Builds the look for the current level. Called from loadLevel in place of
// the classic backdrop.
function buildHdLook(scene) {
    hdLookActive = true;
    hdResetState();

    hdGlowTexture(scene);
    hdRayTexture(scene);
    hdDarknessTexture(scene);
    hdObjectTextures(scene);
    hdCreatureTextures(scene);
    hdBossPartTextures(scene);
    hdPlayerTextures(scene);

    // Endless runs start in the meadow and tour every world
    hdBuildScenery(scene, hdEndless() ? HD_ENDLESS_ORDER[0] : hdBiomeFor(currentLevel));
    if (hdEndless()) {
        hdEndlessNextX = HD_ENDLESS_WORLD_PX;
        hdQueueWarmup(scene, HD_ENDLESS_ORDER[1]);
    }

    scene.events.on('postupdate', hdPostUpdate, scene);
    scene.events.once('shutdown', () => {
        scene.events.off('postupdate', hdPostUpdate, scene);
        hdLookActive = false;
        hdResetState();
    });
}

function hdBuildScenery(scene, name) {
    hdBiomeName = name;
    hdBiome = HD_BIOMES[name];
    const recipe = hdBiome;
    const low = typeof lowFxMode !== 'undefined' && lowFxMode;
    const before = new Set(scene.children.list);
    const texBefore = new Set(game.textures.getTextureKeys());

    // Sky (with sun or moon baked in) stays fixed: it is "infinitely" far
    // away. Worlds whose back wall covers the whole screen skip it.
    if (!recipe.coveredSky) {
        scene.add.image(0, 0, hdSkyTexture(scene, 'hd_sky_' + name, recipe.sky))
            .setOrigin(0, 0).setScrollFactor(0).setDepth(-40);
    }

    const rnd = hdRandom(2024 + currentLevelIndex + HD_ENDLESS_ORDER.indexOf(name));
    if (recipe.clouds) hdBuildClouds(scene, recipe.clouds, rnd, low);

    // Parallax stack, far to near
    recipe.layers.forEach(L => {
        if (low && L.low) return;
        const strip = hdLayer(scene, L.tex(scene), L.y, L.h, L.f, L.depth, L.alpha);
        if (L.drift) hdDrifters.push({ strip: strip, speed: L.drift });
    });
    (recipe.props || []).forEach(p => hdBuildProps(scene, p, rnd, low));
    if (recipe.rays && !low) hdBuildRays(scene, recipe);

    // Ground: one continuous strip, surface at y=560
    hdLayer(scene, hdGroundTexture(scene, 'hd_ground_' + name, recipe.ground),
        560 - HD_GROUND_LIP, 600 - 560 + HD_GROUND_LIP, 1, -3);

    // Grass tufts in front of the player, so feet sink into the grass
    if (recipe.tufts) {
        const key = hdTuftStripTexture(scene, 'hd_tufts_' + name, recipe.tufts);
        hdOptional.push(hdLayer(scene, key, 562 - 14, 14, 1, 11));
    }

    // Depth of field: a blurred strip along the bottom and out-of-focus
    // shapes hanging into the top of the frame
    if (!low && recipe.foreground) {
        const key = hdForegroundTexture(scene, 'hd_fg_' + name, recipe.foreground);
        hdOptional.push(hdLayer(scene, key, 556, 46, 1.3, 70, 0.95));
    }
    if (!low && recipe.overhang) {
        const key = hdOverhangTexture(scene, 'hd_overhang_' + recipe.overhang, recipe.overhang);
        const reach = hdEndless() ? 3900 : 800 + Math.max(0, currentLevel.worldWidth - 800) * 1.25;
        const start = hdEndless() ? scene.cameras.main.scrollX * 1.25 + 900 : 900;
        for (let x = start, i = 0; x < start + reach - 900; x += 1300 + rnd() * 600, i++) {
            const b = scene.add.image(x, -8, key).setOrigin(0.5, 0)
                .setScrollFactor(1.25, 0).setDepth(70).setFlipX(i % 2 === 1).setAlpha(0.95);
            hdOptional.push(b);
            if (hdEndless()) hdLoop(b, 1.25, reach);
        }
    }

    hdBuildAmbient(scene, recipe.fx || {}, rnd, low);

    // Dark worlds: everything away from the player falls into shadow
    if (recipe.light && recipe.light.darkness) {
        hdDarkness = scene.add.image(player ? player.x : 0, player ? player.y : 0, 'hd_darkness')
            .setScale(8, 6.5).setDepth(65).setAlpha(recipe.light.darkness);
    }

    // Vignette, WebGL only (same cost as the classic look's)
    const cam = scene.cameras.main;
    if (cam.postFX && !low) {
        cam.postFX.clear();
        cam.postFX.addVignette(0.5, 0.5, 0.95, recipe.light ? 0.4 : 0.28);
    }

    hdScenery = scene.children.list.filter(o => !before.has(o));
    hdNoteWorldKeys(name, texBefore);
    if (hdEndless()) hdUpdateStrips(scene);
}

// Remembers which textures a world painted (endless only), so they can be
// released when the run moves on
function hdNoteWorldKeys(name, texBefore) {
    if (!hdEndless()) return;
    const set = hdWorldKeys[name] || (hdWorldKeys[name] = new Set());
    game.textures.getTextureKeys().forEach(k => { if (!texBefore.has(k)) set.add(k); });
}

// Endless: frees the world just left. Anything the new world shares or that
// is still on screen stays; the next lap paints the rest again ahead of time.
function hdReleaseWorld(scene, oldName, newName) {
    const used = new Set();
    scene.children.list.forEach(o => {
        if (o.texture) used.add(o.texture.key);
        if (o.displayTexture) used.add(o.displayTexture.key);
    });
    const keep = hdWorldKeys[newName] || new Set();
    const oldPlat = 'hd_plat_' + HD_BIOMES[oldName].platform.name + '_';
    const samePlat = HD_BIOMES[oldName].platform.name === HD_BIOMES[newName].platform.name;
    const candidates = new Set(hdWorldKeys[oldName] || []);
    if (!samePlat) game.textures.getTextureKeys().forEach(k => { if (k.startsWith(oldPlat)) candidates.add(k); });
    candidates.forEach(k => {
        if (used.has(k) || keep.has(k) || !game.textures.exists(k)) return;
        game.textures.remove(k);
    });
    delete hdWorldKeys[oldName];
}

function hdTeardownScenery(scene) {
    hdScenery.forEach(o => {
        scene.tweens.killTweensOf(o);
        o.destroy();
    });
    hdScenery = [];
    hdResetSceneryState();
}

// Endless: swap worlds under a quick flash, restyle the platforms already
// on screen, name the new world, and start painting the one after it.
function hdSwitchWorld(scene, name) {
    if (hdSwitching) return;
    hdSwitching = true;
    const flash = scene.add.rectangle(400, 300, 800, 600, 0xffffff, 1)
        .setScrollFactor(0).setDepth(80).setAlpha(0);
    scene.tweens.add({
        targets: flash, alpha: 0.9, duration: 140, ease: 'Sine.easeIn',
        onComplete: () => {
            if (!hdLookActive) { flash.destroy(); return; }
            const oldName = hdBiomeName;
            hdTeardownScenery(scene);
            hdBuildScenery(scene, name);
            hdRestylePlatforms(scene);
            hdReleaseWorld(scene, oldName, name);
            if (typeof updateEndlessHudTitle === 'function') updateEndlessHudTitle();
            // Below the HUD and tutorial hints
            const title = scene.add.text(400, 225, hdBiome.title, {
                fontSize: '26px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
            }).setOrigin(0.5).setScrollFactor(0).setDepth(95).setAlpha(0);
            scene.tweens.add({
                targets: title, alpha: 1, y: 215, duration: 400, hold: 1400, yoyo: true,
                onComplete: () => title.destroy()
            });
            scene.tweens.add({
                targets: flash, alpha: 0, duration: 500, ease: 'Sine.easeOut',
                onComplete: () => { flash.destroy(); hdSwitching = false; }
            });
            const next = HD_ENDLESS_ORDER[(hdEndlessWorld + 1) % HD_ENDLESS_ORDER.length];
            hdQueueWarmup(scene, next);
        }
    });
}

// Every platform image remembers its size, so it can be redrawn in the new
// world's material without touching its physics body
function hdRestylePlatforms(scene) {
    scene.children.list.forEach(o => {
        if (!o.hdPlat) return;
        const p = o.hdPlat;
        o.setTexture(hdPlatformTexture(scene, p.w, p.h, p.variant, hdBiome.platform, p.crumbling));
    });
}

// Queue the next world's textures so they are ready before the switch. Each
// job paints one texture; hdPostUpdate runs one per frame.
function hdQueueWarmup(scene, name) {
    const r = HD_BIOMES[name];
    const jobs = [];
    if (!r.coveredSky) jobs.push(() => hdSkyTexture(scene, 'hd_sky_' + name, r.sky));
    if (r.clouds) for (let i = 0; i < 3; i++) jobs.push(() => hdCloudTexture(scene, i, r.clouds.pal));
    r.layers.forEach(L => jobs.push(() => L.tex(scene)));
    (r.props || []).forEach(p => {
        if (p.kind === 'gear') jobs.push(() => hdGearTexture(scene, 'hd_gear_' + p.radius + '_' + p.color.toString(16), p.radius, p.color));
        if (p.kind === 'island') jobs.push(() => hdIslandTexture(scene, 'hd_island'));
    });
    jobs.push(() => hdGroundTexture(scene, 'hd_ground_' + name, r.ground));
    if (r.tufts) jobs.push(() => hdTuftStripTexture(scene, 'hd_tufts_' + name, r.tufts));
    if (r.foreground) jobs.push(() => hdForegroundTexture(scene, 'hd_fg_' + name, r.foreground));
    if (r.overhang) jobs.push(() => hdOverhangTexture(scene, 'hd_overhang_' + r.overhang, r.overhang));
    // Record what each job paints, so the world can be released later
    hdWarmJobs = jobs.map(job => () => {
        const texBefore = new Set(game.textures.getTextureKeys());
        job();
        hdNoteWorldKeys(name, texBefore);
    });
}

function hdUpdateEndless(scene) {
    if (hdWarmJobs.length) hdWarmJobs.shift()();
    if (!player || hdSwitching || player.x < hdEndlessNextX) return;
    hdEndlessNextX += HD_ENDLESS_WORLD_PX;
    hdEndlessWorld++;
    hdSwitchWorld(scene, HD_ENDLESS_ORDER[hdEndlessWorld % HD_ENDLESS_ORDER.length]);
}

function hdBuildClouds(scene, c, rnd, low) {
    for (let i = 0; i < 3; i++) hdCloudTexture(scene, i, c.pal);
    const worldW = hdEndless() ? 4000 : currentLevel.worldWidth;
    const count = low ? 3 : Math.max(4, Math.floor(worldW / c.per));
    const stretch = c.stretch || [1, 1];
    const scrollX = scene.cameras.main.scrollX;
    for (let i = 0; i < count; i++) {
        const far = i % 2 === 0;
        const factor = far ? 0.03 + rnd() * 0.03 : 0.08 + rnd() * 0.06;
        // Spread across at least a screen and a half so wrapping never pops
        // a cloud into view
        const span = Math.max(1800, 800 + worldW * factor);
        const x = scrollX * factor + (i + rnd() * 0.6) / count * span - 300;
        const y = c.y[0] + rnd() * (c.y[1] - c.y[0]);
        const scale = far ? 0.45 + rnd() * 0.25 : 0.65 + rnd() * 0.35;
        const cloud = scene.add.image(x, y, 'hd_cloud_' + c.pal + '_' + (i % 3))
            .setScale(scale * stretch[0], scale * stretch[1]).setAlpha(far ? 0.75 : 0.95)
            .setScrollFactor(factor, 0).setDepth(far ? -38 : -36);
        hdLoop(cloud, factor, span, -(2 + rnd() * 4));
    }
}

// Light shafts: fanning down-left from the sun, or falling through a
// canopy from above
function hdBuildRays(scene, recipe) {
    const sun = recipe.sky.sun;
    const rays = recipe.rays.fromTop
        ? [[120, -0.25, 1.4, 0.12], [330, -0.2, 1.6, 0.09], [560, -0.3, 1.3, 0.11], [740, -0.22, 1.5, 0.08]]
        : [[sun.x, 0.66, 1.3, 0.1], [sun.x, 0.9, 1.5, 0.08], [sun.x, 1.14, 1.2, 0.07]];
    rays.forEach(([x, angle, len, alpha], i) => {
        // Screen-fixed: they belong to the light source, not the ground
        const ray = scene.add.image(x, recipe.rays.fromTop ? -20 : sun.y, 'hd_ray')
            .setOrigin(0.5, 0).setRotation(angle).setScale(1 + i * 0.2, len)
            .setScrollFactor(0).setDepth(-29)
            .setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha).setTint(recipe.rays.color);
        scene.tweens.add({
            targets: ray, alpha: alpha * 0.35, duration: 3500 + i * 900,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        hdOptional.push(ray);
    });
}

// Animated scenery placed along a parallax band: glowing crystals, warning
// lights, torches, turning gears and drifting islands
function hdBuildProps(scene, p, rnd, low) {
    if (low && p.kind !== 'torch') return;
    const endless = hdEndless();
    const reach = endless ? 2400 : 800 + Math.max(0, currentLevel.worldWidth - 800) * p.f;
    const start = endless ? scene.cameras.main.scrollX * p.f - 200 : 0;
    const loop = obj => { if (endless) hdLoop(obj, p.f, reach); };
    let key = null;
    if (p.kind === 'gear') key = hdGearTexture(scene, 'hd_gear_' + p.radius + '_' + p.color.toString(16), p.radius, p.color);
    if (p.kind === 'island') key = hdIslandTexture(scene, 'hd_island');
    for (let x = start + 60 + rnd() * p.spacing[0]; x < start + reach; x += p.spacing[0] + rnd() * (p.spacing[1] - p.spacing[0])) {
        const y = p.y[0] + rnd() * (p.y[1] - p.y[0]);
        if (p.kind === 'glow') {
            const tint = p.tint[Math.floor(rnd() * p.tint.length)];
            const s = p.scale[0] + rnd() * (p.scale[1] - p.scale[0]);
            const g = scene.add.image(x, y, 'hd_glow').setScale(s).setTint(tint)
                .setBlendMode(Phaser.BlendModes.ADD).setAlpha(p.alpha).setScrollFactor(p.f, 0).setDepth(p.depth);
            if (p.anim === 'blink') {
                scene.tweens.add({ targets: g, alpha: 0.05, duration: 380, yoyo: true, repeat: -1, hold: 380, delay: rnd() * 800 });
            } else {
                scene.tweens.add({ targets: g, alpha: p.alpha * 0.4, scale: s * 0.85, duration: 1600 + rnd() * 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
            hdOptional.push(g);
            loop(g);
        } else if (p.kind === 'torch') {
            const torch = scene.add.image(x, y, 'hd_torch').setScrollFactor(p.f, 0).setDepth(p.depth);
            const g = scene.add.image(x, y - 12, 'hd_glow').setScale(0.9).setTint(0xff9a3a)
                .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setScrollFactor(p.f, 0).setDepth(66);
            scene.tweens.add({ targets: g, alpha: 0.45, scale: 0.8, duration: 90 + rnd() * 120, yoyo: true, repeat: -1, repeatDelay: rnd() * 200 });
            loop(torch);
            loop(g);
        } else if (p.kind === 'gear') {
            const gear = scene.add.image(x, y, key).setScrollFactor(p.f, 0).setDepth(p.depth);
            scene.tweens.add({ targets: gear, angle: rnd() < 0.5 ? 360 : -360, duration: 9000 + p.radius * 120, repeat: -1 });
            loop(gear);
        } else if (p.kind === 'island') {
            const s = p.scale[0] + rnd() * (p.scale[1] - p.scale[0]);
            const isl = scene.add.image(x, y, key).setScale(s).setAlpha(p.alpha).setScrollFactor(p.f, 0).setDepth(p.depth);
            scene.tweens.add({ targets: isl, y: y - 10, duration: 3000 + rnd() * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            loop(isl);
        }
    }
}

// Screen-space atmosphere. Each particle kind moves by its own rule in
// hdUpdateParticles; the level's weather setting adds to the recipe.
function hdBuildAmbient(scene, fx, rnd, low) {
    const weather = hdEndless() ? null : (currentLevel.theme || {}).weather;
    const f = Object.assign({}, fx);
    if (weather === 'embers' && !f.embers && !f.sparks) f.embers = true;
    if (weather === 'snow') f.snow = true;
    if (weather === 'leaves' && !f.leaves) f.leaves = [0x9cc45a, 0xd9b44a, 0xc7783a];

    if (!low && f.birds !== undefined) {
        const key = hdBirdTexture(scene, f.birds);
        for (let i = 0; i < 5; i++) {
            const b = scene.add.image(rnd() * 800, 110 + rnd() * 100, key)
                .setScrollFactor(0).setDepth(-37).setScale(0.5 + rnd() * 0.4).setAlpha(0.7);
            hdCritters.push({ kind: 'bird', obj: b, speed: 10 + rnd() * 8, phase: rnd() * 6, baseY: b.y });
        }
    }
    if (low) return;

    const add = (kind, obj, extra) => {
        hdParticles.push(Object.assign({ kind: kind, obj: obj, x: obj.x, y: obj.y, t: rnd() * 10 }, extra));
        hdOptional.push(obj);
    };
    if (f.motes) {
        for (let i = 0; i < f.motes.count; i++) {
            const m = scene.add.image(rnd() * 800, rnd() * 520, 'hd_mote').setScrollFactor(0)
                .setScale(0.2 + rnd() * 0.25).setDepth(f.motes.add ? 66 : -4).setTint(f.motes.color);
            if (f.motes.add) m.setBlendMode(Phaser.BlendModes.ADD);
            add('mote', m, { vx: (rnd() - 0.3) * 14, vy: (rnd() - 0.6) * 8, base: 0.35 + rnd() * 0.45 });
        }
    }
    if (f.dust) {
        for (let i = 0; i < f.dust.count; i++) {
            const m = scene.add.image(rnd() * 800, 200 + rnd() * 380, 'hd_mote').setScrollFactor(0)
                .setScale(0.12 + rnd() * 0.12).setDepth(58).setTint(f.dust.color).setAlpha(0.6);
            add('dust', m, { vx: 60 + rnd() * 80, vy: (rnd() - 0.5) * 10 });
        }
    }
    if (f.leaves) {
        for (let i = 0; i < 12; i++) {
            const near = i < 2;
            const l = scene.add.image(rnd() * 800, rnd() * 600, hdLeafTexture(scene, f.leaves[i % f.leaves.length]))
                .setScrollFactor(0).setDepth(near ? 71 : 58).setScale(near ? 2.6 : 0.8 + rnd() * 0.5)
                .setAlpha(near ? 0.55 : 0.9);
            add('leaf', l, {
                near: near, vx: -20 - rnd() * 30 - (near ? 40 : 0), vy: 22 + rnd() * 26 + (near ? 20 : 0),
                spin: (rnd() - 0.5) * 3
            });
        }
    }
    if (f.snow) {
        for (let i = 0; i < 40; i++) {
            const near = i < 5;
            const s = scene.add.image(rnd() * 800, rnd() * 600, 'hd_mote').setScrollFactor(0)
                .setScale(near ? 0.55 : 0.12 + rnd() * 0.18).setDepth(near ? 71 : 58).setAlpha(near ? 0.6 : 0.9);
            add('snow', s, { vx: -10 + rnd() * 10, vy: near ? 70 : 25 + rnd() * 30 });
        }
    }
    if (f.embers) {
        for (let i = 0; i < 26; i++) {
            const e = scene.add.image(rnd() * 800, rnd() * 600, 'hd_mote').setScrollFactor(0)
                .setScale(0.12 + rnd() * 0.18).setDepth(66).setTint(rnd() < 0.5 ? 0xff8a2a : 0xffc04a)
                .setBlendMode(Phaser.BlendModes.ADD);
            add('ember', e, { vx: 8 + rnd() * 20, vy: -30 - rnd() * 40 });
        }
    }
    if (f.sparks) {
        for (let i = 0; i < 14; i++) {
            const s = scene.add.image(-50, -50, 'hd_streak').setScrollFactor(0).setDepth(66)
                .setScale(0.25, 0.8).setTint(0xffb040).setBlendMode(Phaser.BlendModes.ADD);
            add('spark', s, { vx: 0, vy: 0, life: 0, delay: rnd() * 3 });
        }
    }
    if (f.drips) {
        for (let i = 0; i < 8; i++) {
            const d = scene.add.image(rnd() * 800, -20, 'hd_drip').setScrollFactor(0).setDepth(58).setAlpha(0.8);
            add('drip', d, { vy: 0, delay: rnd() * 4 });
        }
    }
    if (f.butterflies) {
        // World-space, each circling a home spot; in endless the homes hop
        // ahead of the camera as it passes them
        const from = hdEndless() ? scene.cameras.main.scrollX : 0;
        const spread = hdEndless() ? 1600 : currentLevel.worldWidth - 500;
        for (let i = 0; i < 4; i++) {
            const hx = from + 300 + (i / 4) * spread + rnd() * 200;
            const b = scene.add.image(hx, 520, hdButterflyTexture(scene, f.butterflies[i % f.butterflies.length]))
                .setDepth(4).setScale(0.9);
            hdCritters.push({ kind: 'butterfly', obj: b, hx: hx, hy: 505 + rnd() * 30, t: rnd() * 100, seed: rnd() * 10 });
            hdOptional.push(b);
        }
    }
    if (f.bats) {
        for (let i = 0; i < 4; i++) {
            const b = scene.add.image(-60, 0, 'hd_bat').setScrollFactor(0).setDepth(-21).setScale(0.8 + rnd() * 0.5);
            hdCritters.push({ kind: 'bat', obj: b, t: rnd() * 10, delay: 2 + rnd() * 8, active: false });
            hdOptional.push(b);
        }
    }
    if (f.shootingStars) hdNextShootingStar = 3;
}

// Called after coins, checkpoints, the flag and the start text exist
function decorateHdLevel(scene) {
    checkpointRects.forEach(cp => {
        // The banner is part of the classic image, so the pole stays under it
        // and only its length adapts to the surface below
        const footing = hdPoleFooting(cp.rect.x - 6, cp.rect.y + 25);
        const ground = Math.abs(footing.x - (cp.rect.x - 6)) < 1 ? footing.y : cp.rect.y + 25;
        const top = cp.rect.y - 23;
        scene.add.image(cp.rect.x - 6, ground, 'hd_checkpoint_pole').setOrigin(0.5, 1)
            .setDisplaySize(8, Math.max(10, ground - top)).setDepth(cp.rect.depth - 0.1);
        scene.add.image(cp.rect.x - 6, ground + 2, 'hd_checkpoint_base').setOrigin(0.5, 1).setDepth(cp.rect.depth - 0.1);
    });
    if (startText) {
        startText.setVisible(false);
        const start = currentLevel.playerStart;
        const footing = hdPoleFooting(Math.max(20, start.x - 38), start.y + 16);
        scene.add.image(footing.x, footing.y + 2, 'hd_sign_start').setOrigin(0.5, 1).setDepth(-1);
    }
    // Hidden platforms: world-styled art that fades in with the classic
    // rectangle (which keeps driving the reveal)
    (typeof invisiblePlatforms !== 'undefined' ? invisiblePlatforms : []).forEach(ip => {
        ip.hdImg = hdTerrainBlock(scene, ip.x, ip.y, ip.width, ip.height, 0, false, 'hidden')[0];
        ip.hdImg.setAlpha(ip.rect.alpha);
        ip.rect.setVisible(false);
    });
    hdBuildGoal(scene);
}

// Coins get a glow as soon as they exist, including ones spawned later
// (endless chunks, crates)
function hdAttachCoinGlows(scene) {
    coinRects.forEach(c => {
        const rect = c.rect;
        if (!rect || !rect.scene || rect.hdGlowAttached) return;
        rect.hdGlowAttached = true;
        const glow = scene.add.image(rect.x, rect.y, 'hd_glow')
            .setScale(0.42).setTint(0xffcf4a).setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0.5).setDepth(rect.depth - 0.1);
        hdCoinGlows.push({ glow: glow, rect: rect });
    });
}

// Replaces drawTerrainBlock while the HD look is active. Ground blocks
// return nothing: one continuous strip covers the whole floor instead.
// Floating platforms come back with the soft shadow they cast on the ground,
// so anything that fades or destroys a block's parts handles both.
function hdTerrainBlock(scene, x, y, w, h, color, isGround, kind) {
    if (isGround) return [];
    // Endless mode rolls random sizes; rounding them (more coarsely there)
    // lets platforms share textures. Level platforms already sit on 10/4 px
    // steps, so they are drawn exactly.
    const step = hdEndless() ? 20 : 10;
    const qw = Math.max(20, Math.round(w / step) * step);
    const qh = hdEndless() ? 20 : Math.max(8, Math.round(h / 4) * 4);
    const variant = Math.abs(Math.round(x * 7 + y * 13)) % 3;
    const crumbling = kind === 'crumbling';
    const key = hdPlatformTexture(scene, qw, qh, variant, hdBiome.platform, crumbling);
    const img = scene.add.image(x, y, key);
    img.setOrigin(
        (HD_PLAT_PAD_X + qw / 2) / (qw + HD_PLAT_PAD_X * 2),
        (HD_PLAT_PAD_TOP + qh / 2) / (qh + HD_PLAT_PAD_TOP + HD_PLAT_PAD_BOTTOM)
    );
    if (qw !== w || qh !== h) img.setScale(w / qw, h / qh);
    img.setDepth(typeof DEPTH_TERRAIN !== 'undefined' ? DEPTH_TERRAIN : -2);
    img.hdPlat = { w: qw, h: qh, variant: variant, crumbling: crumbling };
    const parts = [img];

    // Crumbling blocks shake by repositioning their parts, and hidden ones
    // must not give themselves away, so neither casts a shadow
    const height = 560 - (y + h / 2);
    if (!crumbling && kind !== 'hidden' && w >= 40 && height > 0 && height <= 260 &&
        scene.textures.exists('tex_shadow')) {
        const t = 1 - height / 260;
        const strength = hdBiome.light ? 0.6 : 1;
        parts.push(scene.add.image(x - 12 - height * 0.08, 562, 'tex_shadow')
            .setScale(w / 40, 0.9).setAlpha((0.18 + t * 0.3) * strength).setDepth(-1));
    }
    return parts;
}

// ========================
// Player rig
// ========================
// The classic sprite stays as the source of truth (position, squash tweens,
// rotation, tint, alpha all still land on it); it is hidden and this
// container mirrors it with separately animated parts.

function createHdPlayerRig(scene) {
    const img = key => scene.add.image(0, 0, key);
    const r = {
        footBack: img('hd_foot'), handBack: img('hd_hand'),
        body: img('hd_body'), shine: img('hd_body_shine'),
        eyeA: img('hd_eye'), eyeB: img('hd_eye'),
        pupilA: img('hd_pupil'), pupilB: img('hd_pupil'),
        mouth: img('hd_mouth_smile'),
        handFront: img('hd_hand'), footFront: img('hd_foot')
    };
    r.container = scene.add.container(playerRect.x, playerRect.y, [
        r.footBack, r.handBack, r.body, r.shine, r.eyeA, r.eyeB,
        r.pupilA, r.pupilB, r.mouth, r.handFront, r.footFront
    ]).setDepth(playerRect.depth);
    r.phase = 0;
    r.blinkTimer = 2500;
    r.blink = 0;
    r.look = { x: 1, y: 0 };
    r.pose = {
        footFront: { x: 6, y: 14 }, footBack: { x: -6, y: 14 },
        handFront: { x: -12, y: 6 }, handBack: { x: 12, y: 6 },
        bodyY: 0
    };
    hdRig = r;
    playerRect.setVisible(false);
}

function hdApproach(cur, target, rate, dt) {
    return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

function updateHdRig(scene, dt) {
    const r = hdRig;
    if (!r || !playerRect || !playerRect.scene || !player || !player.body) return;
    const frozen = isPaused || gameOver || levelComplete || scene.physics.world.isPaused;
    const body = player.body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const onGround = body.touching.down || body.blocked.down;
    const t = scene.time.now;
    const facing = playerRect.flipX ? -1 : 1;
    const base = playerBaseScale || 1;
    const speed = Math.abs(vx);

    // --- Pose targets (local space, +x = the way the player faces) ---
    let ff, fb, hf, hb, bodyY = 0, mouth = 'hd_mouth_smile';
    let eyeScale = 1;
    let rate = 18;
    if (!frozen && onGround && speed > 30) {
        r.phase += speed * dt / 9;
    }
    const s = Math.sin(r.phase);
    const c = Math.cos(r.phase);

    if (isPounding) {
        ff = { x: 3, y: 10 }; fb = { x: -3, y: 10 };
        hf = { x: 5, y: -19 }; hb = { x: -5, y: -19 };
        mouth = 'hd_mouth_grit'; eyeScale = 0.55;
        rate = 30;
    } else if (isDashing) {
        ff = { x: -5, y: 12 }; fb = { x: -10, y: 11 };
        hf = { x: -16, y: 2 }; hb = { x: -14, y: -1 };
        mouth = 'hd_mouth_grit'; eyeScale = 0.75;
        rate = 30;
    } else if (isWallSliding) {
        ff = { x: 10, y: 11 }; fb = { x: 7, y: 15 };
        hf = { x: 16, y: -4 }; hb = { x: 14, y: 3 };
        mouth = 'hd_mouth_grit';
    } else if (!onGround) {
        if (vy < -40) {
            ff = { x: 5, y: 10 }; fb = { x: -5, y: 11 };
            hf = { x: 12, y: -13 }; hb = { x: -10, y: -14 };
            mouth = 'hd_mouth_open';
        } else {
            const flail = Math.sin(t * 0.03) * 2.5;
            ff = { x: 8, y: 15 }; fb = { x: -8, y: 15 };
            hf = { x: 15, y: -6 + flail }; hb = { x: -15, y: -7 - flail };
            mouth = vy > 380 ? 'hd_mouth_o' : 'hd_mouth_open';
            eyeScale = vy > 380 ? 1.15 : 1;
        }
    } else if (speed > 30) {
        // Run cycle: feet orbit, arms counter-swing, body bobs on each step
        ff = { x: s * 7, y: 14 - Math.max(0, c) * 4 };
        fb = { x: -s * 7, y: 14 - Math.max(0, -c) * 4 };
        hf = { x: 15 + s * 2, y: 5 + s * 3.5 };
        hb = { x: -15 + s * 2, y: 5 - s * 3.5 };
        bodyY = -Math.abs(c) * 1.6;
        rate = 40;
    } else {
        // Idle: planted feet, slow breathing, arms at rest
        const breathe = Math.sin(t * 0.004);
        ff = { x: 6, y: 14 }; fb = { x: -6, y: 14 };
        hf = { x: 16, y: 7 + breathe * 0.8 }; hb = { x: -16, y: 7 + breathe * 0.8 };
        bodyY = breathe * 0.6;
    }

    const p = r.pose;
    const lerp = (obj, target) => {
        obj.x = hdApproach(obj.x, target.x, rate, dt);
        obj.y = hdApproach(obj.y, target.y, rate, dt);
    };
    if (!frozen) {
        lerp(p.footFront, ff); lerp(p.footBack, fb);
        lerp(p.handFront, hf); lerp(p.handBack, hb);
        p.bodyY = hdApproach(p.bodyY, bodyY, rate, dt);
    }

    // --- Eyes: blink, and track the nearest threat or the travel direction ---
    if (!frozen) {
        r.blinkTimer -= dt * 1000;
        if (r.blinkTimer <= 0) {
            r.blink = 120;
            r.blinkTimer = 2200 + Math.random() * 2800;
        }
        if (r.blink > 0) r.blink -= dt * 1000;
    }
    let lookX = 1.2, lookY = Phaser.Math.Clamp(vy / 300, -1.5, 1.5);
    if (enemies && enemies.children) {
        let best = 230 * 230;
        enemies.children.entries.forEach(e => {
            if (!e.active) return;
            const dx = e.x - player.x, dy = e.y - player.y;
            const d = dx * dx + dy * dy;
            if (d < best) {
                best = d;
                const len = Math.sqrt(d) || 1;
                lookX = (dx / len) * facing * 1.8;
                lookY = (dy / len) * 1.8;
            }
        });
    }
    r.look.x = hdApproach(r.look.x, lookX, 10, dt);
    r.look.y = hdApproach(r.look.y, lookY, 10, dt);
    const eyeY = -4 + p.bodyY;
    const blinkScale = r.blink > 0 ? 0.12 : eyeScale;
    [[r.eyeA, r.pupilA, 3], [r.eyeB, r.pupilB, 11]].forEach(([eye, pupil, ex]) => {
        eye.setPosition(ex, eyeY).setScale(1, blinkScale);
        pupil.setPosition(ex + 0.4 + r.look.x, eyeY + 0.6 + r.look.y * blinkScale).setScale(1, blinkScale);
    });
    r.mouth.setTexture(mouth).setPosition(7.5, 6 + p.bodyY);

    r.body.setPosition(0, p.bodyY);
    r.shine.setPosition(0, p.bodyY);
    r.footFront.setPosition(p.footFront.x, p.footFront.y);
    r.footBack.setPosition(p.footBack.x, p.footBack.y);
    r.handFront.setPosition(p.handFront.x, p.handFront.y + p.bodyY);
    r.handBack.setPosition(p.handBack.x, p.handBack.y + p.bodyY);

    // --- Mirror the classic sprite: tint, squash, rotation, alpha ---
    r.body.setTint(playerRect.tintTopLeft);
    r.handBack.setTint(0xb8bcc6);
    r.footBack.setTint(0xb0b0b0);

    const sx = playerRect.scaleX;
    const sy = playerRect.scaleY;
    // Squash from the feet while grounded, so landing compresses into the
    // ground instead of lifting off it
    const footAnchor = onGround ? (base - sy) * 16 : 0;
    let lean = 0;
    if (!isDashing && !isPounding) lean = Phaser.Math.Clamp(vx / 220, -1, 1) * (onGround ? 0.09 : 0.05);
    r.container.setPosition(playerRect.x, playerRect.y + footAnchor);
    r.container.setScale(sx * facing, sy);
    r.container.setRotation(playerRect.rotation + lean);
    r.container.setAlpha(playerRect.alpha);

    // Hats ride the head, including the bob
    if (typeof updateHatPosition === 'function' && playerHatObjects.length) {
        const ly = (-16 + p.bodyY) * sy;
        const rot = r.container.rotation;
        updateHatPosition(playerHatObjects, {
            x: r.container.x - Math.sin(rot) * ly,
            y: r.container.y + Math.cos(rot) * ly + 16
        });
    }
}

// ========================
// Per-frame update
// ========================

function hdPostUpdate() {
    const scene = this;
    const dt = Math.min(0.05, scene.game.loop.delta / 1000);
    const t = scene.time.now;
    const low = typeof lowFxMode !== 'undefined' && lowFxMode;
    const running = !(isPaused || gameOver || levelComplete);

    updateHdRig(scene, dt);

    // The performance monitor can switch to low-FX mid-level
    if (low && hdOptional.length) {
        hdOptional.forEach(o => o.setVisible(false));
        hdOptional = [];
        hdParticles = [];
        hdCritters = hdCritters.filter(c => c.kind === 'bird');
        if (scene.cameras.main.postFX) scene.cameras.main.postFX.clear();
    }

    if (hdDarkness && player) hdDarkness.setPosition(player.x, player.y - 10);
    if (hdStrips.length) hdUpdateStrips(scene);
    hdUpdateLoopers(scene, dt, running);
    hdAttachCoinGlows(scene);

    // Coin glows follow their coin; the coin darkens as it turns edge-on
    hdCoinGlows = hdCoinGlows.filter(cg => {
        if (!cg.rect.scene) { cg.glow.destroy(); return false; }
        cg.glow.setPosition(cg.rect.x, cg.rect.y);
        cg.glow.setAlpha(cg.rect.alpha * (0.4 + Math.sin(t * 0.004 + cg.rect.x) * 0.12));
        const edge = Phaser.Math.Clamp((cg.rect.scaleX - 0.25) / 0.75, 0, 1);
        cg.rect.setTint(hdMix(0xb07818, 0xffffff, edge));
        return true;
    });

    hdUpdateEnemies(scene, t);
    hdUpdateBoss(scene, t);
    hdUpdateGlowFollowers(scene);
    hdUpdateGoal(dt, t);

    invisiblePlatforms.forEach(ip => { if (ip.hdImg) ip.hdImg.setAlpha(ip.rect.alpha); });

    // Lit checkpoints get a glow once reached
    checkpointRects.forEach(cp => {
        if (cp.activated && !cp.hdGlow && cp.rect.scene) {
            cp.hdGlow = scene.add.image(cp.rect.x + 6, cp.rect.y - 15, 'hd_glow')
                .setTint(0x9cff9c).setBlendMode(Phaser.BlendModes.ADD).setDepth(66)
                .setScale(0.2).setAlpha(0);
            scene.tweens.add({ targets: cp.hdGlow, scale: 0.7, alpha: 0.55, duration: 400, ease: 'Sine.easeOut' });
            scene.tweens.add({
                targets: cp.hdGlow, alpha: 0.3, duration: 1200, delay: 400,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }
    });

    if (!running) return;
    if (hdEndless()) hdUpdateEndless(scene);
    hdDrifters.forEach(d => {
        d.strip.hdDrift += dt * d.speed;
        d.strip.tilePositionX = d.strip.x + d.strip.hdDrift;
    });
    hdUpdateCritters(scene, dt);
    if (!low) hdUpdateParticles(scene, dt);
}

// Picks each enemy's animation frame from its movement and AI state
function hdEnemyFrame(e, t) {
    const type = e.enemyType || 'walker';
    const vx = e.body ? e.body.velocity.x : 0;
    const vy = e.body ? e.body.velocity.y : 0;
    const step = Math.floor(Math.abs(e.x) / 5) % 4;
    const walk = base => (Math.abs(vx) > 5 && step) ? base + '_' + step : base;
    switch (type) {
        case 'walker': return walk('hd_tex_enemy_walker');
        case 'shield': return walk('hd_tex_enemy_shield');
        case 'charger':
            if (e.chargeState === 'windup') return 'hd_tex_enemy_charger_windup';
            if (e.chargeState === 'charge') return 'hd_tex_enemy_charger_run' + (Math.floor(Math.abs(e.x) / 7) % 4);
            return walk('hd_tex_enemy_charger');
        case 'jumper': {
            const grounded = e.body && (e.body.blocked.down || e.body.touching.down);
            if (grounded) return 'hd_tex_enemy_jumper';
            return vy < 0 ? 'hd_tex_enemy_jumper_rise' : 'hd_tex_enemy_jumper_fall';
        }
        case 'flyer': {
            const f = Math.floor((t + e.x * 3) / 90) % 4;
            return ['hd_tex_enemy_flyer', 'hd_tex_enemy_flyer_1', 'hd_tex_enemy_flyer_2', 'hd_tex_enemy_flyer_1'][f];
        }
        case 'diver':
            if (e.diveState === 'telegraph') return 'hd_tex_enemy_diver_spread';
            if (e.diveState === 'dive') return 'hd_tex_enemy_diver_tuck';
            return Math.floor((t + e.x * 3) / 110) % 2 ? 'hd_tex_enemy_diver_down' : 'hd_tex_enemy_diver';
        case 'shooter': return e.telegraphing ? 'hd_tex_enemy_shooter_charge' : 'hd_tex_enemy_shooter';
        default: return null;
    }
}

function hdUpdateEnemies(scene, t) {
    if (!enemies || !enemies.children) return;
    enemies.children.entries.forEach(e => {
        const v = e.visual;
        if (!e.active || !v || !v.setTexture) return;
        const key = hdEnemyFrame(e, t);
        if (key && v.texture.key !== key && scene.textures.exists(key)) v.setTexture(key);
        // Shield: a soft bubble instead of the classic square outline
        if (v.shieldBorder && !v.hdBubble) {
            v.hdBubble = scene.add.image(v.x, v.y, 'hd_bubble').setDepth(v.depth + 0.1);
            hdBubbles.push(v);
        }
    });
    hdBubbles = hdBubbles.filter(v => {
        const b = v.hdBubble;
        const border = v.shieldBorder;
        if (v.scene && border && border.scene) {
            border.setVisible(false);
            b.setPosition(v.x, v.y).setScale(1 + Math.sin(t * 0.006) * 0.04);
            return true;
        }
        // Shield broken (or its owner gone): pop the bubble
        v.hdBubble = null;
        scene.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 220, onComplete: () => b.destroy() });
        return false;
    });
}

// Boss: the classic rectangles keep driving the fight (position, flashes,
// phase colours, the defeat fade); they are hidden and mirrored by a sculpted
// body, glowing eyes and a pulsing core.
function hdUpdateBoss(scene, t) {
    const rect = typeof bossRect !== 'undefined' ? bossRect : null;
    if (!rect || !rect.scene) {
        if (hdBoss) {
            hdBoss.parts.forEach(p => p.destroy());
            hdBoss = null;
        }
        return;
    }
    if (!hdBoss) {
        const body = scene.add.image(rect.x, rect.y, hdBossTexture(scene, bossConfig.color)).setDepth(rect.depth + 0.1);
        const eyes = scene.add.image(rect.x, rect.y, 'hd_boss_eyes').setDepth(rect.depth + 0.2);
        const coreGlow = scene.add.image(rect.x, rect.y, 'hd_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(rect.depth + 0.2);
        const core = scene.add.image(rect.x, rect.y, 'hd_boss_core').setDepth(rect.depth + 0.3);
        const eyeGlow = scene.add.image(rect.x, rect.y, 'hd_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(rect.depth + 0.2).setScale(0.5, 0.2);
        hdBoss = { body, eyes, coreGlow, core, eyeGlow, parts: [body, eyes, coreGlow, core, eyeGlow] };
    }
    const b = hdBoss;
    const coreRect = typeof bossCoreRect !== 'undefined' ? bossCoreRect : null;
    rect.setVisible(false);
    if (coreRect && coreRect.scene) coreRect.setVisible(false);

    const moving = bossSprite && bossSprite.body && Math.abs(bossSprite.body.velocity.x) > 5;
    const bob = moving ? Math.abs(Math.sin(t * 0.012)) * -3 : Math.sin(t * 0.003) * 1.5;
    const facing = player && player.x < rect.x ? -1 : 1;
    const s = rect.scaleX;
    const x = rect.x, y = rect.y + bob;
    const alpha = rect.alpha;
    b.body.setPosition(x, y).setScale(s * facing, s).setAlpha(alpha);
    // Damage and defeat flashes recolour the rectangle; carry that onto the body
    if (rect.fillColor !== bossConfig.color) b.body.setTint(hdMix(rect.fillColor, 0xffffff, 0.35));
    else b.body.clearTint();
    const eyeColor = rect.strokeColor || bossConfig.strokeColor;
    b.eyes.setPosition(x, y - 27 * s).setScale(s).setTint(eyeColor).setAlpha(alpha);
    b.eyeGlow.setPosition(x, y - 27 * s).setTint(eyeColor).setAlpha(alpha * 0.8);
    const coreColor = coreRect && coreRect.scene ? coreRect.fillColor : bossConfig.coreColor;
    const pulse = coreRect && coreRect.scene ? coreRect.scaleX : 1;
    b.core.setPosition(x, y + 2 * s).setScale(pulse * s * 0.9).setTint(coreColor).setAlpha(alpha);
    b.coreGlow.setPosition(x, y + 2 * s).setScale(0.45 * pulse * s).setTint(coreColor).setAlpha(alpha * 0.9);
}

// Projectiles get a soft glow that follows them until they are gone
function hdUpdateGlowFollowers(scene) {
    const attach = (list, tint) => list.forEach(p => {
        if (p.rect && p.rect.scene && !p.rect.hdGlow) {
            p.rect.hdGlow = scene.add.image(p.rect.x, p.rect.y, 'hd_glow').setScale(0.28)
                .setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(66);
            hdGlowFollowers.push(p.rect);
        }
    });
    if (typeof projectileRects !== 'undefined') attach(projectileRects, 0xffe040);
    if (typeof bossProjectiles !== 'undefined') attach(bossProjectiles, 0xff5a20);
    hdGlowFollowers = hdGlowFollowers.filter(r => {
        if (!r.scene || !r.active) { r.hdGlow.destroy(); return false; }
        r.hdGlow.setPosition(r.x, r.y);
        return true;
    });
}

function hdUpdateGoal(dt, t) {
    const g = hdGoal;
    if (!g || !endFlag) return;
    const alpha = endFlag.alpha;
    g.parts.forEach(p => { if (p !== g.parts[0] && p !== g.parts[1]) p.setAlpha(alpha); });
    g.parts[0].setVisible(alpha > 0);
    g.parts[1].setVisible(alpha > 0);
    g.cloth.setTexture('hd_goal_cloth_' + (Math.floor(t / 80) % HD_GOAL_FRAMES));
    g.sparks.forEach(s => {
        s.t += dt * 0.35;
        if (s.t > 1) s.t -= 1;
        const rise = s.t * g.height;
        s.obj.setPosition(g.x + Math.sin(s.t * 9 + s.obj.depth) * 12, g.ground - rise);
        s.obj.setAlpha(alpha * Math.sin(s.t * Math.PI) * 0.9);
    });
}

function hdUpdateCritters(scene, dt) {
    hdCritters.forEach(c => {
        if (c.kind === 'bird') {
            c.phase += dt * 9;
            c.obj.x -= c.speed * dt;
            c.obj.y = c.baseY + Math.sin(c.phase * 0.15) * 4;
            c.obj.scaleY = Math.abs(c.obj.scaleX) * (0.55 + Math.abs(Math.sin(c.phase)) * 0.6);
            if (c.obj.x < -20) { c.obj.x = 820; c.baseY = 110 + Math.random() * 100; }
        } else if (c.kind === 'butterfly') {
            c.t += dt;
            if (hdEndless() && c.hx < scene.cameras.main.scrollX - 300) c.hx += 1600;
            const x = c.hx + Math.sin(c.t * 0.7 + c.seed) * 60 + Math.sin(c.t * 1.9) * 14;
            const y = c.hy + Math.sin(c.t * 1.3 + c.seed * 2) * 22 + Math.sin(c.t * 4.1) * 5;
            c.obj.setFlipX(x < c.obj.x);
            c.obj.setPosition(x, y);
            c.obj.scaleY = 0.9 * (0.25 + Math.abs(Math.sin(c.t * 16)) * 0.75);
        } else if (c.kind === 'bat') {
            // Bats burst across the screen now and then, in a loose group
            if (!c.active) {
                c.delay -= dt;
                if (c.delay <= 0) {
                    c.active = true;
                    c.dir = Math.random() < 0.5 ? 1 : -1;
                    c.obj.setPosition(c.dir > 0 ? -30 : 830, 60 + Math.random() * 200).setFlipX(c.dir < 0);
                    c.speed = 160 + Math.random() * 90;
                }
                return;
            }
            c.t += dt;
            c.obj.x += c.dir * c.speed * dt;
            c.obj.y += Math.sin(c.t * 7) * 40 * dt;
            c.obj.scaleY = Math.abs(c.obj.scaleX) * (0.4 + Math.abs(Math.sin(c.t * 22)) * 0.7);
            if (c.obj.x < -40 || c.obj.x > 840) { c.active = false; c.delay = 5 + Math.random() * 9; }
        }
    });
}

function hdUpdateParticles(scene, dt) {
    for (let i = 0; i < hdParticles.length; i++) {
        const p = hdParticles[i];
        const o = p.obj;
        p.t += dt;
        switch (p.kind) {
            case 'mote':
                p.x += (p.vx + Math.sin(p.t * 0.7) * 6) * dt;
                p.y += (p.vy + Math.cos(p.t * 0.9) * 5) * dt;
                o.setAlpha(p.base * (0.6 + Math.sin(p.t * 2.3) * 0.4));
                break;
            case 'dust':
                p.x += p.vx * dt;
                p.y += (p.vy + Math.sin(p.t * 1.7) * 12) * dt;
                break;
            case 'leaf': {
                p.x += (p.vx + Math.sin(p.t * 2.2) * 22) * dt;
                p.y += p.vy * dt;
                o.rotation += p.spin * dt;
                const base = p.near ? 2.6 : 1;
                o.scaleX = base * (0.3 + Math.abs(Math.sin(p.t * 2.9)) * 0.7);
                break;
            }
            case 'snow':
                p.x += (p.vx + Math.sin(p.t * 1.3) * 14) * dt;
                p.y += p.vy * dt;
                break;
            case 'ember':
                p.x += (p.vx + Math.sin(p.t * 3) * 10) * dt;
                p.y += p.vy * dt;
                o.setAlpha(0.5 + Math.sin(p.t * 9) * 0.4);
                break;
            case 'spark':
                // Short bursts from somewhere overhead, falling under gravity
                if (p.life <= 0) {
                    p.delay -= dt;
                    o.setVisible(false);
                    if (p.delay <= 0) {
                        p.x = 40 + Math.random() * 720; p.y = 40 + Math.random() * 160;
                        p.vx = (Math.random() - 0.5) * 160; p.vy = -60 - Math.random() * 80;
                        p.life = 0.9 + Math.random() * 0.6; p.delay = 1 + Math.random() * 3;
                        o.setVisible(true);
                    }
                    continue;
                }
                p.life -= dt;
                p.vy += 420 * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
                o.setRotation(Math.atan2(p.vy, p.vx)).setAlpha(Math.min(1, p.life * 2));
                break;
            case 'drip':
                if (p.delay > 0) {
                    p.delay -= dt;
                    o.setVisible(false);
                    if (p.delay <= 0) { p.x = 20 + Math.random() * 760; p.y = -10; p.vy = 0; o.setVisible(true); }
                    continue;
                }
                p.vy += 500 * dt;
                p.y += p.vy * dt;
                if (p.y > 620) p.delay = 1 + Math.random() * 4;
                break;
        }
        // Wrap drifting particles around the screen
        if (p.kind !== 'spark' && p.kind !== 'drip') {
            if (p.y > 620) { p.y = -20; p.x = Math.random() * 900; }
            if (p.y < -30) { p.y = 610; p.x = Math.random() * 800; }
            if (p.x < -30) p.x = 830;
            if (p.x > 840) p.x = -20;
        }
        o.setPosition(p.x, p.y);
    }

    // An occasional shooting star over night skies
    if (hdNextShootingStar > 0) {
        hdNextShootingStar -= dt;
        if (hdNextShootingStar <= 0) {
            hdNextShootingStar = 5 + Math.random() * 7;
            const sx = 150 + Math.random() * 500, sy = 30 + Math.random() * 110;
            const star = scene.add.image(sx, sy, 'hd_streak').setScrollFactor(0).setDepth(-37)
                .setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.PI * 0.85).setScale(1.2, 0.6);
            scene.tweens.add({
                targets: star, x: sx - 220, y: sy + 90, alpha: 0, duration: 900, ease: 'Quad.easeIn',
                onComplete: () => star.destroy()
            });
        }
    }
}
