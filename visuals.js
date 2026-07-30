// ========================
// Visuals — 2.5D presentation layer
// ========================
// Everything here is presentation only. Physics bodies are untouched: the game
// already separates invisible bodies from their visual sprites, so depth,
// shading and shadows can be layered on without disturbing the tuned feel.

// Depth of the extruded faces, in pixels. The top face recedes up-and-right by
// this much, which is what sells the perspective.
const EXTRUDE_DEPTH = 8;

// Draw-order bands, kept well apart so new layers can slot between them.
const DEPTH_SKY = -40;
const DEPTH_CELESTIAL = -34;
const DEPTH_SILHOUETTE = -30;
const DEPTH_HILLS_FAR = -26;
const DEPTH_HILLS_NEAR = -22;
const DEPTH_PROPS = -18;
const DEPTH_TERRAIN = -2;
const DEPTH_SHADOW = 1;
const DEPTH_WEATHER = 60;
const DEPTH_FOREGROUND = 70;

// Reduced-effects mode for weaker hardware. Set during level load.
let lowFxMode = false;

let shadowPool = [];
let weatherParticles = [];
let foregroundLayers = [];

function resetVisualState() {
    shadowPool = [];
    weatherParticles = [];
    foregroundLayers = [];
    lowFxMode = false;
}

function detectLowFxMode(scene) {
    // Touch devices are the common weak case; the FPS check catches the rest
    // once the level has been running for a moment.
    lowFxMode = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    return lowFxMode;
}

// ========================
// Extruded terrain
// ========================

// Bakes one block into a cached texture and returns the key. Blocks of the
// same size, colour and variant share a texture, so a level of 40 platforms
// costs a handful of textures and one draw call each — fewer display objects
// than the 3-8 rectangles per block this replaces.
function getTerrainTexture(scene, w, h, color, isGround, variant) {
    const key = `terr_${w}x${h}_${color.toString(16)}_${isGround ? 'g' : 'p'}_${variant}`;
    if (scene.textures.exists(key)) return key;

    const d = EXTRUDE_DEPTH;
    const texW = w + d;
    const texH = h + d;
    const g = scene.add.graphics();

    const topFace = shadeColor(color, 0.42);
    const sideFace = shadeColor(color, -0.38);
    const frontTop = shadeColor(color, 0.12);
    const frontBottom = shadeColor(color, -0.22);

    // Front face, with a soft vertical gradient built from horizontal bands
    const bands = Math.max(4, Math.min(12, Math.floor(h / 4)));
    const cTop = Phaser.Display.Color.ValueToColor(frontTop);
    const cBot = Phaser.Display.Color.ValueToColor(frontBottom);
    for (let i = 0; i < bands; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(cTop, cBot, bands - 1, i);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        g.fillRect(0, d + i * (h / bands), w, h / bands + 1);
    }

    // Right side face — the receding edge
    g.fillStyle(sideFace);
    g.fillPoints([
        { x: w, y: d }, { x: texW, y: 0 }, { x: texW, y: h }, { x: w, y: d + h }
    ], true);

    // Top face — the lit surface receding up-right
    g.fillStyle(topFace);
    g.fillPoints([
        { x: 0, y: d }, { x: d, y: 0 }, { x: texW, y: 0 }, { x: w, y: d }
    ], true);

    // Rim highlight along the front-top edge, where the player actually stands
    g.fillStyle(shadeColor(color, 0.6));
    g.fillRect(0, d, w, 2);

    // Dark contact edge at the base
    g.fillStyle(shadeColor(color, -0.45));
    g.fillRect(0, d + h - 3, w, 3);

    if (isGround) {
        // Grass fringe overhanging the front-top edge
        const tuft = shadeColor(color, 0.5);
        g.fillStyle(tuft);
        let seed = variant * 7919 + w;
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return (seed % 1000) / 1000;
        };
        for (let tx = 4; tx < w - 4; tx += 18 + rnd() * 26) {
            const th = 3 + rnd() * 5;
            g.fillRect(Math.floor(tx), d + 1, 3, th);
        }
        // Embedded rocks in the front face
        g.fillStyle(shadeColor(color, -0.32));
        for (let rx = 18; rx < w - 18; rx += 55 + rnd() * 70) {
            g.fillRect(Math.floor(rx), d + 10 + rnd() * Math.max(1, h - 22), 6, 4);
        }
    }

    g.generateTexture(key, texW, texH);
    g.destroy();
    return key;
}

// Places an extruded block so its FRONT FACE aligns with the physics body.
// The top face sits above that line and recedes behind the player, who draws
// over it at a higher depth — which is what reads as depth rather than a lip.
function placeTerrainBlock(scene, x, y, w, h, color, isGround, variant) {
    const key = getTerrainTexture(scene, w, h, color, isGround, variant);
    const d = EXTRUDE_DEPTH;
    const img = scene.add.image(x, y, key);
    img.setOrigin(w / 2 / (w + d), (d + h / 2) / (h + d));
    img.setDepth(DEPTH_TERRAIN);
    return img;
}

// ========================
// Blob shadows
// ========================

function ensureShadowTexture(scene) {
    if (scene.textures.exists('tex_shadow')) return;
    const g = scene.add.graphics();
    // Concentric ellipses approximate a soft edge without a blur shader
    for (let i = 6; i >= 1; i--) {
        g.fillStyle(0x000000, 0.05 * i * 0.5);
        g.fillEllipse(32, 10, 12 + i * 7, 4 + i * 2.2);
    }
    g.generateTexture('tex_shadow', 64, 20);
    g.destroy();
}

function getShadow(scene) {
    for (let i = 0; i < shadowPool.length; i++) {
        if (!shadowPool[i].inUse) {
            shadowPool[i].inUse = true;
            return shadowPool[i];
        }
    }
    if (shadowPool.length >= 24) return null;
    const img = scene.add.image(0, 0, 'tex_shadow').setDepth(DEPTH_SHADOW).setVisible(false);
    const entry = { img: img, inUse: true };
    shadowPool.push(entry);
    return entry;
}

// Nearest walkable surface below a point, from level data rather than a
// physics raycast (Arcade has none, and the data is already to hand).
function findSurfaceBelow(x, fromY) {
    let best = null;
    const consider = (topY, cx, halfW) => {
        if (topY < fromY - 2) return;
        if (Math.abs(x - cx) > halfW + 6) return;
        if (best === null || topY < best) best = topY;
    };

    if (typeof currentLevel !== 'undefined' && currentLevel) {
        const groundTop = 560;
        if (groundTop >= fromY - 2) best = groundTop;
        if (currentLevel.platforms) {
            for (let i = 0; i < currentLevel.platforms.length; i++) {
                const p = currentLevel.platforms[i];
                consider(p.y - p.height / 2, p.x, p.width / 2);
            }
        }
    }
    if (typeof movingPlatforms !== 'undefined' && movingPlatforms) {
        for (let i = 0; i < movingPlatforms.length; i++) {
            const mp = movingPlatforms[i];
            if (!mp.sprite) continue;
            consider(mp.sprite.y - mp.sprite.displayHeight / 2, mp.sprite.x, mp.sprite.displayWidth / 2);
        }
    }
    return best;
}

// Shadows shrink and fade with height, which doubles as a landing-distance cue.
function _placeShadow(scene, x, bottomY, width) {
    const surface = findSurfaceBelow(x, bottomY);
    if (surface === null) return;
    const height = surface - bottomY;
    if (height > 220) return;

    const entry = getShadow(scene);
    if (!entry) return;
    const t = Phaser.Math.Clamp(1 - height / 220, 0, 1);
    entry.img.setVisible(true);
    entry.img.setPosition(x, surface + 2);
    entry.img.setScale((width / 52) * (0.45 + t * 0.55), 0.5 + t * 0.5);
    entry.img.setAlpha(0.12 + t * 0.33);
}

function updateShadows(scene) {
    if (lowFxMode) return;
    for (let i = 0; i < shadowPool.length; i++) {
        shadowPool[i].inUse = false;
        shadowPool[i].img.setVisible(false);
    }
    if (typeof player === 'undefined' || !player || !player.body) return;

    _placeShadow(scene, player.x, player.body.bottom, 34);

    // Only nearby enemies — offscreen shadows cost the same and show nothing
    if (typeof enemies !== 'undefined' && enemies) {
        const list = enemies.children.entries;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (!e.active) continue;
            if (Math.abs(e.x - player.x) > 460) continue;
            _placeShadow(scene, e.x, e.body ? e.body.bottom : e.y + 16, e.displayWidth || 30);
        }
    }
    if (typeof springRects !== 'undefined' && springRects) {
        for (let i = 0; i < springRects.length; i++) {
            const s = springRects[i];
            if (!s.body || Math.abs(s.body.x - player.x) > 460) continue;
            _placeShadow(scene, s.body.x, s.body.y + 10, 30);
        }
    }
}

// ========================
// Parallax scenery
// ========================

// Far skyline, drawn once into a wide texture so it costs a single image.
function buildSilhouette(scene, worldWidth, color, style) {
    const key = `sil_${color.toString(16)}_${style}`;
    const segW = 800;
    if (!scene.textures.exists(key)) {
        const g = scene.add.graphics();
        g.fillStyle(color, 1);
        let seed = 1337 + style.length;
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return (seed % 1000) / 1000;
        };
        if (style === 'towers') {
            for (let x = 0; x < segW; x += 46 + rnd() * 40) {
                const w = 30 + rnd() * 34;
                const h = 60 + rnd() * 130;
                g.fillRect(x, 220 - h, w, h + 20);
                if (rnd() < 0.5) g.fillTriangle(x, 220 - h, x + w, 220 - h, x + w / 2, 220 - h - 26);
            }
        } else if (style === 'spires') {
            for (let x = 0; x < segW; x += 40 + rnd() * 34) {
                const w = 18 + rnd() * 26;
                const h = 70 + rnd() * 140;
                g.fillTriangle(x, 240, x + w, 240, x + w / 2, 240 - h);
            }
        } else if (style === 'trees') {
            for (let x = 0; x < segW; x += 34 + rnd() * 28) {
                const h = 60 + rnd() * 90;
                const w = 26 + rnd() * 26;
                g.fillRect(x + w / 2 - 3, 240 - h * 0.4, 6, h * 0.4 + 10);
                g.fillCircle(x + w / 2, 240 - h * 0.55, w * 0.6);
                g.fillCircle(x + w / 2 - w * 0.3, 240 - h * 0.4, w * 0.42);
                g.fillCircle(x + w / 2 + w * 0.3, 240 - h * 0.42, w * 0.42);
            }
        } else {
            // Mountains, overlapped and varied so the ridge reads as a range
            // rather than a row of identical cones.
            for (let x = -60; x < segW + 60; x += 62 + rnd() * 70) {
                const w = 150 + rnd() * 210;
                const h = 70 + rnd() * 120;
                const peak = x + w * (0.35 + rnd() * 0.3);
                g.fillTriangle(x, 250, x + w, 250, peak, 250 - h);
            }
        }
        g.generateTexture(key, segW, 250);
        g.destroy();
        // Linear filtering samples across the tile wrap and leaves a seam line
        // along the top edge; nearest suits the art anyway.
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const strip = scene.add.tileSprite(0, 360, worldWidth, 250, key).setOrigin(0, 0);
    strip.setScrollFactor(0.08).setDepth(DEPTH_SILHOUETTE).setAlpha(0.38);
    return strip;
}

// Mid-distance props, depth-scaled so lower ones read as nearer.
function buildProps(scene, worldWidth, color, style) {
    if (lowFxMode) return;
    const count = Math.floor(worldWidth / 420);
    for (let i = 0; i < count; i++) {
        const x = 80 + Math.random() * (worldWidth - 120);
        const scale = 0.7 + Math.random() * 0.7;
        const y = 470 + Math.random() * 40;
        const g = scene.add.graphics();
        g.fillStyle(color, 0.75);
        if (style === 'trees') {
            g.fillRect(-4, -18, 8, 24);
            g.fillCircle(0, -30, 20);
            g.fillCircle(-14, -20, 13);
            g.fillCircle(14, -21, 13);
        } else if (style === 'spires') {
            g.fillTriangle(-12, 6, 12, 6, 0, -46);
            g.fillTriangle(-20, 6, -6, 6, -13, -24);
        } else if (style === 'towers') {
            g.fillRect(-14, -44, 28, 50);
            g.fillTriangle(-18, -44, 18, -44, 0, -66);
        } else {
            g.fillEllipse(0, 0, 46, 26);
            g.fillEllipse(-16, 4, 26, 16);
        }
        g.setPosition(x, y).setScale(scale).setDepth(DEPTH_PROPS);
        g.setScrollFactor(0.5, 0.5);
        g.setAlpha(0.8);
    }
}

// Foreground strips that scroll faster than the world. This is the layer that
// puts the camera *inside* the scene rather than in front of it.
function buildForeground(scene, worldWidth, color) {
    if (lowFxMode) return;
    // Only the tips show along the very bottom edge. Any taller and it covers
    // the ground line the player is landing on, which a precision platformer
    // cannot afford.
    const key = 'fg_strip_' + color.toString(16);
    const stripH = 26;
    if (!scene.textures.exists(key)) {
        const g = scene.add.graphics();
        let seed = 4242;
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return (seed % 1000) / 1000;
        };
        g.fillStyle(shadeColor(color, -0.62), 1);
        g.fillRect(0, stripH - 8, 256, 8);
        for (let x = 0; x < 256; x += 7 + rnd() * 13) {
            const h = 7 + rnd() * 15;
            g.fillRect(x, stripH - 8 - h, 2 + rnd() * 3, h + 4);
        }
        g.generateTexture(key, 256, stripH);
        g.destroy();
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const strip = scene.add.tileSprite(0, 600 - stripH, 900, stripH, key).setOrigin(0, 0);
    strip.setScrollFactor(0).setDepth(DEPTH_FOREGROUND).setAlpha(0.55);
    foregroundLayers.push({ sprite: strip, factor: 1.2 });
}

function updateForeground(scene) {
    if (!foregroundLayers.length) return;
    const cam = scene.cameras.main;
    for (let i = 0; i < foregroundLayers.length; i++) {
        const l = foregroundLayers[i];
        l.sprite.tilePositionX = cam.scrollX * l.factor;
    }
}

// ========================
// Weather
// ========================

function buildWeather(scene, kind) {
    weatherParticles = [];
    if (!kind || lowFxMode) return;

    // Kept sparse and low-contrast: weather is atmosphere, and anything busier
    // competes with coins and hazards for the player's attention.
    const count = kind === 'rain' ? 30 : 16;
    for (let i = 0; i < count; i++) {
        let p;
        if (kind === 'rain') {
            p = scene.add.rectangle(0, 0, 1.5, 11, 0xaaccff, 0.4);
        } else if (kind === 'snow') {
            p = scene.add.circle(0, 0, 1.4 + Math.random() * 1.4, 0xffffff, 0.6);
        } else if (kind === 'embers') {
            p = scene.add.circle(0, 0, 1.2 + Math.random() * 1.3, 0xff8844, 0.6);
        } else {
            p = scene.add.rectangle(0, 0, 4, 2.5, 0xa8c06a, 0.42);
        }
        p.setScrollFactor(0).setDepth(DEPTH_WEATHER);
        weatherParticles.push({
            obj: p,
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: kind === 'rain' ? -30 : (kind === 'embers' ? 12 + Math.random() * 20 : -18 + Math.random() * 36),
            vy: kind === 'rain' ? 430 : (kind === 'embers' ? -34 - Math.random() * 30 : 34 + Math.random() * 34),
            sway: Math.random() * Math.PI * 2,
            kind: kind
        });
    }
}

// Camera-relative with wraparound, so a fixed pool covers any world width.
function updateWeather(scene, delta) {
    if (!weatherParticles.length) return;
    const dt = delta / 1000;
    for (let i = 0; i < weatherParticles.length; i++) {
        const p = weatherParticles[i];
        p.sway += dt * 2;
        p.x += (p.vx + (p.kind === 'leaves' ? Math.sin(p.sway) * 26 : 0)) * dt;
        p.y += p.vy * dt;

        if (p.y > 620) { p.y = -20; p.x = Math.random() * 800; }
        if (p.y < -30) { p.y = 610; p.x = Math.random() * 800; }
        if (p.x < -20) p.x = 810;
        if (p.x > 820) p.x = -10;

        p.obj.setPosition(p.x, p.y);
    }
}
