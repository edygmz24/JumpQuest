// ========================
// HD look — prototype presentation for Level 1
// ========================
// A richer art pass that sits entirely on the presentation side, like
// visuals.js. Physics bodies, level data and tuning are untouched: every
// object here either replaces a texture or follows an existing visual.
//
// Everything is drawn in code with the Canvas 2D API (gradients, curves,
// soft blur), then cached as textures, so it works in both renderers and
// needs no image files.
//
// Active on Level 1 only. Add ?look=classic to the URL to compare against
// the original art.

let hdLookActive = false;

// Everything animated per frame, rebuilt on every level load
let hdRig = null;
let hdCoinGlows = [];
let hdButterflies = [];
let hdBirds = [];
let hdMotes = [];
let hdLeaves = [];
let hdMist = null;
let hdOptional = [];      // decoration hidden when low-FX mode kicks in

// Late-afternoon palette. The sun sits upper-right, so every lit face in
// every texture leans that way.
const HD_SUN = { x: 640, y: 92 };
const HD_HORIZON = '#f3dfb4';

function shouldUseHdLook(levelIndex) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('look') === 'classic') return false;
    if (typeof endlessMode !== 'undefined' && endlessMode) return false;
    return levelIndex === 0;
}

// Swaps a classic texture key for its HD counterpart when one exists.
function hdTextureKey(key) {
    if (!hdLookActive) return key;
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
// (ctx.filter is not universal).
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

// ========================
// Scenery textures
// ========================

// Sky with the sun and its halo baked in. The sun is far enough away that
// it would barely move with the camera anyway, and one full-screen image is
// much cheaper to draw than a stack of large additive glows.
function hdSkyTexture(scene) {
    return hdTexture(scene, 'hd_sky', 800, 600, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#3a78c2');
        g.addColorStop(0.35, '#74b0e3');
        g.addColorStop(0.62, '#c3dcea');
        g.addColorStop(0.78, HD_HORIZON);
        g.addColorStop(1, '#eed3a0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(HD_SUN.x, HD_SUN.y, 0, HD_SUN.x, HD_SUN.y, 300);
        halo.addColorStop(0, 'rgba(255,244,210,0.6)');
        halo.addColorStop(0.1, 'rgba(255,232,176,0.35)');
        halo.addColorStop(0.35, 'rgba(255,214,140,0.1)');
        halo.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        const sun = ctx.createRadialGradient(HD_SUN.x, HD_SUN.y, 0, HD_SUN.x, HD_SUN.y, 36);
        sun.addColorStop(0, 'rgba(255,255,250,1)');
        sun.addColorStop(0.55, 'rgba(255,250,225,1)');
        sun.addColorStop(0.72, 'rgba(255,236,170,0.55)');
        sun.addColorStop(1, 'rgba(255,230,160,0)');
        ctx.fillStyle = sun;
        ctx.fillRect(HD_SUN.x - 36, HD_SUN.y - 36, 72, 72);
    });
}

function hdGlowTexture(scene) {
    return hdTexture(scene, 'hd_glow', 128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
    });
}

// One soft beam, reused at several angles for the god rays
function hdRayTexture(scene) {
    hdTexture(scene, 'hd_ray', 64, 512, (ctx) => {
        const across = ctx.createLinearGradient(0, 0, 64, 0);
        across.addColorStop(0, 'rgba(255,240,200,0)');
        across.addColorStop(0.5, 'rgba(255,240,200,1)');
        across.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = across;
        ctx.fillRect(0, 0, 64, 512);
        ctx.globalCompositeOperation = 'destination-in';
        const along = ctx.createLinearGradient(0, 0, 0, 512);
        along.addColorStop(0, 'rgba(0,0,0,0.9)');
        along.addColorStop(0.5, 'rgba(0,0,0,0.35)');
        along.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = along;
        ctx.fillRect(0, 0, 64, 512);
    }, 2);
}

// Cumulus: puffs scattered under a dome-shaped envelope, kept nearly flat
// white individually, then shaded as one mass (bright sunlit top, cool
// underside) so the cloud reads as a single volume rather than a stack of
// outlined circles.
function hdCloudTexture(scene, variant) {
    const key = 'hd_cloud_' + variant;
    return hdTexture(scene, key, 300, 130, (ctx, w, h) => {
        const rnd = hdRandom(900 + variant * 31);
        const base = 104;
        const puffs = [];
        for (let i = 0; i < 34; i++) {
            const t = rnd();
            const x = 36 + t * 228;
            const dome = Math.sin(t * Math.PI);
            const r = 10 + dome * (14 + rnd() * 16);
            const y = base - r * 0.55 - dome * rnd() * 34;
            puffs.push({ x: x, y: y, r: r });
        }
        puffs.sort((a, b) => b.y - a.y);
        puffs.forEach(p => {
            const g = ctx.createRadialGradient(p.x + p.r * 0.3, p.y - p.r * 0.35, 0, p.x, p.y, p.r);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.8, '#f6f6f4');
            g.addColorStop(1, '#e9ecf1');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = '#e9ecf1';
        ctx.beginPath();
        ctx.ellipse(150, base - 4, 118, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shade the whole mass: warm sunlit top, cool flat underside
        ctx.globalCompositeOperation = 'source-atop';
        const mass = ctx.createLinearGradient(0, 20, 0, base + 6);
        mass.addColorStop(0, 'rgba(255,240,210,0.35)');
        mass.addColorStop(0.45, 'rgba(255,255,255,0)');
        mass.addColorStop(0.8, 'rgba(150,165,195,0.28)');
        mass.addColorStop(1, 'rgba(120,138,172,0.5)');
        ctx.fillStyle = mass;
        ctx.fillRect(0, 0, w, h);
        const side = ctx.createLinearGradient(0, 0, w, 0);
        side.addColorStop(0, 'rgba(120,138,172,0.18)');
        side.addColorStop(0.6, 'rgba(120,138,172,0)');
        ctx.fillStyle = side;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }, 2);
}

// Mountain range, shaded per pixel. Each ridge point is lit by its slope
// (faces descending to the right face the sun), and that light spreads
// diagonally downhill, so faces fan out from the peaks as they would on real
// rock. Snow collects on gentle high ground; haze fades the base into the
// horizon (atmospheric perspective).
function hdMountainTexture(scene, key, opts) {
    const W = 1024;
    const H = opts.height;
    return hdTexture(scene, key, W, H, (ctx) => {
        const ridge = hdRidge(opts.seed, W, true);
        const soft = hdRidge(opts.seed + 7, W, false);
        const heights = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            const v = ridge(x) * 0.65 + soft(x) * 0.35;
            heights[x] = opts.base - (v * 0.5 + 0.5) * opts.amp;
        }
        const faceLight = new Float32Array(W);
        const steepness = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            const slope = (heights[(x + 3) % W] - heights[(x - 3 + W) % W]) / 6;
            faceLight[x] = Math.max(0, Math.min(1, 0.45 + slope * 1.6));
            steepness[x] = Math.min(1, Math.abs(slope) * 0.9);
        }
        const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
        const lit = rgb(opts.lit), shade = rgb(opts.shade), haze = rgb(opts.haze);
        const snowLit = rgb(0xfbfcff), snowShade = rgb(0xbfcadf);
        const hazeTop = opts.base - opts.amp;
        const wrap = x => ((Math.round(x) % W) + W) % W;
        const img = ctx.createImageData(W, H);
        const d = img.data;
        for (let x = 0; x < W; x++) {
            const top = heights[x];
            for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
                const below = y - top;
                const cover = Math.max(0, Math.min(1, below + 1));
                const spread = below * 0.75;
                const fanned = (faceLight[wrap(x - spread)] + faceLight[wrap(x + spread)]) * 0.5;
                const settle = Math.min(1, below / 110);
                const grain = Math.sin(x * 0.9 + y * 0.35) * Math.sin(y * 1.3 - x * 0.27) * 0.05;
                const light = fanned + (0.45 - fanned) * settle + grain;
                let r = shade[0] + (lit[0] - shade[0]) * light;
                let g = shade[1] + (lit[1] - shade[1]) * light;
                let b = shade[2] + (lit[2] - shade[2]) * light;
                if (opts.snowLine) {
                    const patch = Math.sin(x * 0.061 + y * 0.09) * Math.sin(x * 0.023 - y * 0.071);
                    const amt = Math.max(0, Math.min(1, (opts.snowLine - y) / 14 + patch * 0.9)) *
                        (1 - steepness[x] * 0.6);
                    if (amt > 0) {
                        r += (snowShade[0] + (snowLit[0] - snowShade[0]) * light - r) * amt;
                        g += (snowShade[1] + (snowLit[1] - snowShade[1]) * light - g) * amt;
                        b += (snowShade[2] + (snowLit[2] - snowShade[2]) * light - b) * amt;
                    }
                }
                const h = Math.max(0, Math.min(1, (y - hazeTop) / (H - hazeTop))) * opts.hazeAlpha;
                const i = (y * W + x) * 4;
                d[i] = r + (haze[0] - r) * h;
                d[i + 1] = g + (haze[1] - g) * h;
                d[i + 2] = b + (haze[2] - b) * h;
                d[i + 3] = cover * 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    });
}

// Canopy blob with a lit crown and a shaded underside
function hdCanopy(ctx, x, y, r, lit, shade, rnd) {
    const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, hdHex(lit));
    g.addColorStop(1, hdHex(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Leaf clumps break up the perfect circle
    const clumps = Math.floor(r / 3);
    for (let i = 0; i < clumps; i++) {
        const a = rnd() * Math.PI * 2;
        const d = r * (0.6 + rnd() * 0.35);
        const cr = r * (0.18 + rnd() * 0.14);
        const up = Math.sin(a) < 0 && Math.cos(a) > -0.3;
        ctx.fillStyle = hdHex(up ? hdMix(lit, 0xffffff, 0.08) : hdMix(shade, lit, 0.3));
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, Math.PI * 2);
        ctx.fill();
    }
}

// A low bush: a row of overlapping clumps, wider than tall
function hdBush(ctx, x, y, r, lit, shade, rnd) {
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const cr = r * (0.55 + Math.sin(t * Math.PI) * 0.45);
        hdCanopy(ctx, x + (t - 0.5) * r * 2.4, y - Math.sin(t * Math.PI) * r * 0.35, cr, lit, shade, rnd);
    }
}

function hdTree(ctx, x, groundY, size, lit, shade, trunk, rnd) {
    const trunkH = size * 0.9;
    const tg = ctx.createLinearGradient(x - size * 0.08, 0, x + size * 0.08, 0);
    tg.addColorStop(0, hdHex(hdMix(trunk, 0x000000, 0.35)));
    tg.addColorStop(1, hdHex(trunk));
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.09, groundY);
    ctx.quadraticCurveTo(x - size * 0.04, groundY - trunkH * 0.5, x - size * 0.05, groundY - trunkH);
    ctx.lineTo(x + size * 0.05, groundY - trunkH);
    ctx.quadraticCurveTo(x + size * 0.05, groundY - trunkH * 0.5, x + size * 0.1, groundY);
    ctx.closePath();
    ctx.fill();
    const cy = groundY - trunkH - size * 0.25;
    hdCanopy(ctx, x - size * 0.28, cy + size * 0.12, size * 0.38, lit, shade, rnd);
    hdCanopy(ctx, x + size * 0.3, cy + size * 0.1, size * 0.36, lit, shade, rnd);
    hdCanopy(ctx, x, cy - size * 0.12, size * 0.46, lit, shade, rnd);
}

function hdRollingHills(ctx, W, H, opts) {
    const f = hdRidge(opts.seed, W, false);
    const heights = new Float32Array(W);
    for (let x = 0; x < W; x++) heights[x] = opts.base - (f(x) * 0.5 + 0.5) * opts.amp;
    for (let x = 0; x < W; x++) {
        const y = heights[x];
        const slope = (heights[(x + 4) % W] - heights[(x - 4 + W) % W]) / 8;
        const light = Math.max(0, Math.min(1, 0.5 + slope * 2.2));
        const g = ctx.createLinearGradient(0, y, 0, H);
        g.addColorStop(0, hdHex(hdMix(opts.shade, opts.lit, light)));
        g.addColorStop(1, hdHex(opts.deep));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 2, H - y);
    }
    return heights;
}

function hdFarForestTexture(scene) {
    return hdTexture(scene, 'hd_far_forest', 1024, 200, (ctx, W, H) => {
        const rnd = hdRandom(4401);
        const heights = hdRollingHills(ctx, W, H, {
            seed: 77, base: 120, amp: 60, lit: 0x86a869, shade: 0x5d8156, deep: 0x5b7f58
        });
        // Dense tree line hugging the crest
        for (let x = 0; x < W; x += 5 + rnd() * 7) {
            const top = heights[Math.floor(x) % W];
            const r = 6 + rnd() * 9;
            hdWrap(W, off => hdCanopy(ctx, x + off, top + r * 0.4, r, 0x7a9d62, 0x4a6e4a, rnd));
        }
        ctx.globalCompositeOperation = 'source-atop';
        const haze = ctx.createLinearGradient(0, 40, 0, H);
        haze.addColorStop(0, 'rgba(214,222,206,0.35)');
        haze.addColorStop(1, 'rgba(214,222,206,0.15)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
    }, 1.4);
}

function hdNearHillsTexture(scene) {
    return hdTexture(scene, 'hd_near_hills', 1024, 240, (ctx, W, H) => {
        const rnd = hdRandom(5507);
        const heights = hdRollingHills(ctx, W, H, {
            seed: 131, base: 170, amp: 70, lit: 0x8fc158, shade: 0x5c9140, deep: 0x4f8338
        });
        // Mown stripes across the meadow catch the low sun
        ctx.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 9; i++) {
            ctx.fillStyle = i % 2 ? 'rgba(255,255,200,0.05)' : 'rgba(30,60,20,0.05)';
            ctx.fillRect(0, 120 + i * 14, W, 14);
        }
        ctx.globalCompositeOperation = 'source-over';
        // Scattered trees and bushes standing on the hill line
        for (let x = 30; x < W; x += 90 + rnd() * 160) {
            const gy = heights[Math.floor(x) % W] + 6;
            const size = 34 + rnd() * 30;
            hdWrap(W, off => hdTree(ctx, x + off, gy, size, 0x9ccb62, 0x3f7236, 0x6b4a2f, rnd));
        }
        for (let x = 10; x < W; x += 40 + rnd() * 70) {
            const gy = heights[Math.floor(x) % W];
            const r = 5 + rnd() * 6;
            hdWrap(W, off => hdBush(ctx, x + off, gy + r * 0.9, r, 0x93c35c, 0x467a37, rnd));
        }
        // Wildflower specks
        for (let i = 0; i < 260; i++) {
            const x = rnd() * W;
            const top = heights[Math.floor(x) % W];
            const y = top + 8 + rnd() * (H - top - 8);
            const c = [0xfff4d0, 0xffd34d, 0xf29bc6, 0xb9a6ff][Math.floor(rnd() * 4)];
            ctx.fillStyle = hdRgba(c, 0.8);
            ctx.fillRect(x, y, 1.6, 1.6);
        }
    });
}

// Bushes and tall grass peeking just above the ground line
function hdBushLineTexture(scene) {
    return hdTexture(scene, 'hd_bushes', 1024, 110, (ctx, W, H) => {
        const rnd = hdRandom(6203);
        for (let x = 0; x < W; x += 40 + rnd() * 70) {
            const r = 9 + rnd() * 10;
            hdWrap(W, off => hdBush(ctx, x + off, H - r * 0.5, r, 0x6ea648, 0x2f5a27, rnd));
        }
        for (let i = 0; i < 380; i++) {
            const x = rnd() * W;
            const bh = 10 + rnd() * 26;
            const lean = (rnd() - 0.4) * 8;
            const c = hdMix(0x2e5a24, 0x78b04c, rnd());
            hdWrap(W, off => {
                ctx.strokeStyle = hdHex(c);
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x + off, H);
                ctx.quadraticCurveTo(x + off + lean * 0.3, H - bh * 0.6, x + off + lean, H - bh);
                ctx.stroke();
            });
        }
    });
}

function hdMistTexture(scene) {
    return hdTexture(scene, 'hd_mist', 1024, 120, (ctx, W) => {
        const rnd = hdRandom(7717);
        for (let i = 0; i < 70; i++) {
            const x = rnd() * W;
            const y = 50 + (rnd() - 0.5) * 50;
            const rx = 60 + rnd() * 120;
            const ry = 12 + rnd() * 16;
            hdWrap(W, off => {
                const g = ctx.createRadialGradient(x + off, y, 0, x + off, y, rx);
                g.addColorStop(0, 'rgba(255,250,238,0.35)');
                g.addColorStop(1, 'rgba(255,250,238,0)');
                ctx.fillStyle = g;
                ctx.save();
                ctx.translate(x + off, y);
                ctx.scale(1, ry / rx);
                ctx.translate(-(x + off), -y);
                ctx.fillRect(x + off - rx, y - rx, rx * 2, rx * 2);
                ctx.restore();
            });
        }
    }, 2);
}

// Grass-topped earth for the main ground. The playable surface is at y=14 in
// the texture; blades rise above it and sit behind the player.
const HD_GROUND_LIP = 14;

function hdGroundTexture(scene) {
    return hdTexture(scene, 'hd_ground', 512, 60, (ctx, W, H) => {
        const rnd = hdRandom(8101);
        const top = HD_GROUND_LIP;
        const dirt = ctx.createLinearGradient(0, top, 0, H);
        dirt.addColorStop(0, '#7d5733');
        dirt.addColorStop(0.5, '#5f4027');
        dirt.addColorStop(1, '#3e2918');
        ctx.fillStyle = dirt;
        ctx.fillRect(0, top + 4, W, H - top);
        // Strata bands
        for (let i = 0; i < 3; i++) {
            const y0 = top + 18 + i * 11;
            ctx.strokeStyle = 'rgba(40,24,12,0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x <= W; x += 8) {
                const y = y0 + Math.sin((x / W) * Math.PI * 2 * (2 + i) + i) * 2;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Pebbles, lit from the upper right
        for (let i = 0; i < 46; i++) {
            const x = rnd() * W;
            const y = top + 12 + rnd() * (H - top - 14);
            const rx = 1.5 + rnd() * 3.5;
            const ry = rx * (0.55 + rnd() * 0.3);
            hdWrap(W, off => {
                ctx.fillStyle = hdHex(hdMix(0x6f6456, 0xa39684, rnd()));
                ctx.beginPath();
                ctx.ellipse(x + off, y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,240,210,0.35)';
                ctx.beginPath();
                ctx.ellipse(x + off + rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        // Roots threading through the soil
        ctx.strokeStyle = 'rgba(52,34,18,0.55)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const x = rnd() * W;
            hdWrap(W, off => {
                ctx.beginPath();
                ctx.moveTo(x + off, top + 6);
                ctx.bezierCurveTo(x + off + 6, top + 14, x + off - 5, top + 20, x + off + 3, top + 26 + rnd() * 8);
                ctx.stroke();
            });
        }
        // Turf cap with a ragged edge hanging over the soil
        const turf = ctx.createLinearGradient(0, top - 2, 0, top + 9);
        turf.addColorStop(0, '#9bd156');
        turf.addColorStop(1, '#4d8a2c');
        ctx.fillStyle = turf;
        ctx.beginPath();
        ctx.moveTo(0, top - 2);
        ctx.lineTo(W, top - 2);
        ctx.lineTo(W, top + 6);
        for (let x = W; x >= 0; x -= 6) {
            const drip = 5 + Math.abs(Math.sin(x * 0.37) * Math.sin(x * 0.11)) * 6;
            ctx.lineTo(x, top + drip);
        }
        ctx.closePath();
        ctx.fill();
        // Blades
        for (let i = 0; i < 520; i++) {
            const x = rnd() * W;
            const bh = 4 + rnd() * 10;
            const lean = (rnd() - 0.35) * 5;
            const base = hdMix(0x3f7a26, 0x8cc84e, rnd());
            const tip = hdMix(base, 0xe6f2a0, 0.45);
            hdWrap(W, off => {
                const g = ctx.createLinearGradient(0, top + 2, 0, top - bh);
                g.addColorStop(0, hdHex(base));
                g.addColorStop(1, hdHex(tip));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(x + off - 1.1, top + 2);
                ctx.quadraticCurveTo(x + off + lean * 0.4, top - bh * 0.6, x + off + lean, top - bh);
                ctx.quadraticCurveTo(x + off + lean * 0.4 + 0.6, top - bh * 0.5, x + off + 1.1, top + 2);
                ctx.fill();
            });
        }
        // A few flowers on the tips
        for (let i = 0; i < 14; i++) {
            const x = rnd() * W;
            const y = top - 4 - rnd() * 6;
            const c = [0xffffff, 0xffe066, 0xf6a5d0][Math.floor(rnd() * 3)];
            hdWrap(W, off => {
                ctx.fillStyle = hdHex(c);
                for (let p = 0; p < 5; p++) {
                    const a = p / 5 * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(x + off + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#f2b233';
                ctx.beginPath();
                ctx.arc(x + off, y, 1, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    });
}

// Short tufts drawn IN FRONT of the player, so feet sink into the grass.
// Kept under 12px so they never hide what the player is landing on.
function hdTuftTexture(scene, variant) {
    return hdTexture(scene, 'hd_tuft_' + variant, 28, 14, (ctx, W, H) => {
        const rnd = hdRandom(300 + variant);
        for (let i = 0; i < 14; i++) {
            const x = 4 + rnd() * (W - 8);
            const bh = 5 + rnd() * 7;
            const lean = (rnd() - 0.4) * 5;
            const c = hdMix(0x4a8a2c, 0xa6d964, rnd());
            ctx.fillStyle = hdHex(c);
            ctx.beginPath();
            ctx.moveTo(x - 1.2, H);
            ctx.quadraticCurveTo(x + lean * 0.4, H - bh * 0.6, x + lean, H - bh);
            ctx.quadraticCurveTo(x + lean * 0.4 + 0.6, H - bh * 0.5, x + 1.2, H);
            ctx.fill();
        }
    });
}

// Blurred near-camera grass along the bottom edge: the depth-of-field layer
function hdForegroundTexture(scene) {
    return hdTexture(scene, 'hd_foreground', 1024, 46, (ctx, W, H) => {
        const rnd = hdRandom(9901);
        ctx.fillStyle = '#1c3314';
        ctx.fillRect(0, H - 10, W, 10);
        for (let i = 0; i < 160; i++) {
            const x = rnd() * W;
            const bh = 12 + rnd() * 30;
            const lean = (rnd() - 0.5) * 14;
            const c = hdMix(0x14260f, 0x2f5423, rnd());
            hdWrap(W, off => {
                ctx.fillStyle = hdHex(c);
                ctx.beginPath();
                ctx.moveTo(x + off - 3, H);
                ctx.quadraticCurveTo(x + off + lean * 0.3, H - bh * 0.6, x + off + lean, H - bh);
                ctx.quadraticCurveTo(x + off + lean * 0.3 + 1, H - bh * 0.5, x + off + 3, H);
                ctx.fill();
            });
        }
    }, 3);
}

// Out-of-focus leaves hanging into the top of the frame
function hdBranchTexture(scene) {
    return hdTexture(scene, 'hd_branch', 360, 110, (ctx) => {
        const rnd = hdRandom(1212);
        ctx.strokeStyle = '#2a1c10';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.quadraticCurveTo(160, 40, 350, 18);
        ctx.stroke();
        for (let i = 0; i < 70; i++) {
            const t = rnd();
            const x = t * 340;
            const y = 14 + Math.sin(t * Math.PI) * 26 + rnd() * 50;
            const r = 8 + rnd() * 12;
            ctx.fillStyle = hdHex(hdMix(0x13260f, 0x2e5a22, rnd()));
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * 0.55, rnd() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }, 4);
}

// ========================
// Terrain
// ========================

// Floating earth island. The front face matches the physics rect exactly;
// only the receding top, grass overhang and thin roots draw outside it.
const HD_PLAT_PAD_X = 8;
const HD_PLAT_PAD_TOP = 12;
const HD_PLAT_PAD_BOTTOM = 22;
const HD_PLAT_DEPTH = 6;

function hdPlatformTexture(scene, w, h, seed) {
    const key = `hd_plat_${w}x${h}_${seed}`;
    const W = w + HD_PLAT_PAD_X * 2;
    const H = h + HD_PLAT_PAD_TOP + HD_PLAT_PAD_BOTTOM;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(seed);
        const x0 = HD_PLAT_PAD_X;
        const y0 = HD_PLAT_PAD_TOP;
        const d = HD_PLAT_DEPTH;

        // Hanging roots and a vine, drawn first so the block covers their tops
        for (let i = 0; i < Math.max(3, w / 30); i++) {
            const rx = x0 + 8 + rnd() * (w - 16);
            const len = 6 + rnd() * 14;
            ctx.strokeStyle = 'rgba(70,46,26,0.9)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(rx, y0 + h - 2);
            ctx.bezierCurveTo(rx + 3, y0 + h + len * 0.3, rx - 3, y0 + h + len * 0.6, rx + 1, y0 + h + len);
            ctx.stroke();
        }
        const vx = x0 + 10 + rnd() * (w - 20);
        const vlen = 10 + rnd() * 10;
        ctx.strokeStyle = '#3f7a2a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(vx, y0 + h - 3);
        ctx.quadraticCurveTo(vx + 4, y0 + h + vlen * 0.5, vx, y0 + h + vlen);
        ctx.stroke();
        ctx.fillStyle = '#5fa33b';
        for (let l = 3; l < vlen; l += 4) {
            ctx.beginPath();
            ctx.ellipse(vx + (l % 8 ? 2 : -2), y0 + h + l, 2.2, 1.2, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Receding side face
        ctx.fillStyle = '#4a3322';
        ctx.beginPath();
        ctx.moveTo(x0 + w, y0);
        ctx.lineTo(x0 + w + d, y0 - d);
        ctx.lineTo(x0 + w + d, y0 + h - d - 2);
        ctx.lineTo(x0 + w, y0 + h);
        ctx.closePath();
        ctx.fill();

        // Front face: soil and stone
        const soil = ctx.createLinearGradient(0, y0, 0, y0 + h);
        soil.addColorStop(0, '#8a6441');
        soil.addColorStop(1, '#553824');
        ctx.fillStyle = soil;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + w, y0);
        ctx.lineTo(x0 + w, y0 + h - 4);
        ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - 4, y0 + h);
        ctx.lineTo(x0 + 4, y0 + h);
        ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - 4);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < w / 14; i++) {
            const sx = x0 + 4 + rnd() * (w - 8);
            const sy = y0 + 8 + rnd() * Math.max(1, h - 11);
            const r = 1.5 + rnd() * 2.5;
            ctx.fillStyle = hdHex(hdMix(0x6b6052, 0x9a8c78, rnd()));
            ctx.beginPath();
            ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,240,210,0.35)';
            ctx.beginPath();
            ctx.ellipse(sx + r * 0.3, sy - r * 0.3, r * 0.45, r * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Soft occlusion along the underside
        const ao = ctx.createLinearGradient(0, y0 + h - 6, 0, y0 + h);
        ao.addColorStop(0, 'rgba(20,10,4,0)');
        ao.addColorStop(1, 'rgba(20,10,4,0.4)');
        ctx.fillStyle = ao;
        ctx.fillRect(x0, y0 + h - 6, w, 6);

        // Grass top face, receding up-right
        const topG = ctx.createLinearGradient(0, y0 - d, 0, y0);
        topG.addColorStop(0, '#a9d866');
        topG.addColorStop(1, '#78b545');
        ctx.fillStyle = topG;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + d, y0 - d);
        ctx.lineTo(x0 + w + d, y0 - d);
        ctx.lineTo(x0 + w, y0);
        ctx.closePath();
        ctx.fill();

        // Turf band over the front face, with a ragged hanging edge
        const turf = ctx.createLinearGradient(0, y0, 0, y0 + 7);
        turf.addColorStop(0, '#86c24c');
        turf.addColorStop(1, '#4a862b');
        ctx.fillStyle = turf;
        ctx.beginPath();
        ctx.moveTo(x0 - 3, y0 - 0.5);
        ctx.lineTo(x0 + w + 2, y0 - 0.5);
        for (let x = x0 + w + 2; x >= x0 - 3; x -= 5) {
            const drip = 4 + Math.abs(Math.sin(x * 0.53 + seed)) * 5;
            ctx.lineTo(x, y0 + drip);
        }
        ctx.closePath();
        ctx.fill();
        // Sun-catching rim right at the standing edge
        ctx.fillStyle = 'rgba(230,255,170,0.7)';
        ctx.fillRect(x0, y0 - 0.5, w, 1.2);

        // Blades along the top
        for (let i = 0; i < w / 2.5; i++) {
            const bx = x0 + rnd() * (w + d);
            const by = y0 - rnd() * d * 0.8;
            const bh = 2 + rnd() * 6;
            const lean = (rnd() - 0.35) * 4;
            ctx.fillStyle = hdHex(hdMix(0x5c9a34, 0xc2e57f, rnd()));
            ctx.beginPath();
            ctx.moveTo(bx - 0.9, by + 1);
            ctx.quadraticCurveTo(bx + lean * 0.4, by - bh * 0.6, bx + lean, by - bh);
            ctx.lineTo(bx + 0.9, by + 1);
            ctx.fill();
        }
    });
}

// Replaces drawTerrainBlock while the HD look is active. Ground blocks
// return nothing: one continuous strip covers the whole floor instead.
function hdTerrainBlock(scene, x, y, w, h, color, isGround) {
    if (isGround) return [];
    const seed = Math.round(x * 13 + y * 7 + w);
    const key = hdPlatformTexture(scene, w, h, seed);
    const img = scene.add.image(x, y, key);
    img.setOrigin(
        (HD_PLAT_PAD_X + w / 2) / (w + HD_PLAT_PAD_X * 2),
        (HD_PLAT_PAD_TOP + h / 2) / (h + HD_PLAT_PAD_TOP + HD_PLAT_PAD_BOTTOM)
    );
    img.setDepth(typeof DEPTH_TERRAIN !== 'undefined' ? DEPTH_TERRAIN : -2);
    return [img];
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
        // Embossed star
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

    // Moving plank: weathered boards with iron straps and a moss fringe
    hdTexture(scene, 'hd_tex_plank', 120, 20, (ctx, W, H) => {
        const rnd = hdRandom(4242);
        for (let b = 0; b < 3; b++) {
            const bx = b * 40;
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#b98a5a'); g.addColorStop(1, '#6e4a2c');
            ctx.fillStyle = g;
            ctx.fillRect(bx + 0.5, 0, 39, H);
            ctx.strokeStyle = 'rgba(70,42,20,0.45)'; ctx.lineWidth = 0.8;
            for (let i = 0; i < 4; i++) {
                const gy = 4 + i * 4 + rnd() * 2;
                ctx.beginPath();
                ctx.moveTo(bx + 2, gy);
                ctx.bezierCurveTo(bx + 14, gy + 1.5, bx + 26, gy - 1.5, bx + 38, gy);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(40,22,10,0.6)';
            ctx.fillRect(bx, 0, 1, H);
        }
        ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.fillRect(0, 0, W, 1.5);
        [18, 100].forEach(sx => {
            ctx.fillStyle = '#4a4d55'; ctx.fillRect(sx, 0, 5, H);
            ctx.fillStyle = '#8d929c'; ctx.fillRect(sx, 0, 1, H);
            ctx.fillStyle = '#23252b';
            ctx.fillRect(sx + 1.5, 4, 2, 2); ctx.fillRect(sx + 1.5, 14, 2, 2);
        });
        ctx.fillStyle = 'rgba(96,150,60,0.85)';
        for (let x = 2; x < W; x += 3 + rnd() * 5) {
            ctx.beginPath(); ctx.arc(x, H - 0.5, 1 + rnd() * 1.4, 0, Math.PI * 2); ctx.fill();
        }
    });

    // Goal flag. Same 40x60 footprint as the classic flag (its physics body
    // comes from the image size); the ground line sits at y=35.
    hdTexture(scene, 'hd_tex_flag', 40, 60, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(8, 36, 9, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        const pole = ctx.createLinearGradient(3, 0, 8, 0);
        pole.addColorStop(0, '#5a3a20'); pole.addColorStop(0.5, '#b88a58'); pole.addColorStop(1, '#6e4a2c');
        ctx.fillStyle = pole; ctx.fillRect(4, 3, 4, 33);
        const knob = ctx.createRadialGradient(5, 2, 0.5, 6, 3, 3.5);
        knob.addColorStop(0, '#fff3b8'); knob.addColorStop(1, '#b8860b');
        ctx.fillStyle = knob; ctx.beginPath(); ctx.arc(6, 3, 3.2, 0, Math.PI * 2); ctx.fill();
        // Cloth with two soft folds
        const cloth = ctx.createLinearGradient(8, 0, 38, 0);
        cloth.addColorStop(0, '#e0a410'); cloth.addColorStop(0.3, '#ffd23f');
        cloth.addColorStop(0.55, '#e3a817'); cloth.addColorStop(0.8, '#ffd84f'); cloth.addColorStop(1, '#d3960c');
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.moveTo(8, 5);
        ctx.quadraticCurveTo(22, 2, 37, 10);
        ctx.quadraticCurveTo(28, 14, 36, 20);
        ctx.quadraticCurveTo(22, 17, 8, 22);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff4c0';
        hdStar(ctx, 19, 12.5, 3.6, 1.5);
    });

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
    hdTexture(scene, 'hd_checkpoint_pole', 20, 50, (ctx) => {
        const pole = ctx.createLinearGradient(2, 0, 6, 0);
        pole.addColorStop(0, '#5a3a20'); pole.addColorStop(0.5, '#a97c4f'); pole.addColorStop(1, '#6e4a2c');
        ctx.fillStyle = pole; ctx.fillRect(3, 1, 3, 40);
        ctx.fillStyle = '#8f949e';
        ctx.beginPath(); ctx.ellipse(4.5, 41, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c9ced8';
        ctx.beginPath(); ctx.arc(4.5, 1.5, 2, 0, Math.PI * 2); ctx.fill();
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

    // Soft round mote / pollen
    hdTexture(scene, 'hd_mote', 16, 16, (ctx) => hdSoftDot(ctx, 8, 8, 8, 0xffffff, 1));

    // Colours are baked in rather than tinted: the Canvas renderer ignores tint
    ['#9cc45a', '#d9b44a', '#c7783a'].forEach((color, i) => {
        hdTexture(scene, 'hd_leaf_' + i, 12, 7, (ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0.5, 3.5);
            ctx.quadraticCurveTo(6, -1.5, 11.5, 3.5);
            ctx.quadraticCurveTo(6, 8.5, 0.5, 3.5);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(1, 3.5); ctx.lineTo(11, 3.5); ctx.stroke();
        });
    });

    ['#ffa24a', '#fff6e0', '#8fb8ff'].forEach((color, i) => {
        hdTexture(scene, 'hd_butterfly_' + i, 14, 10, (ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.ellipse(4, 3.5, 3.8, 3.2, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(10, 3.5, 3.8, 3.2, 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(4.5, 7.2, 2.4, 2, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9.5, 7.2, 2.4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2a2018'; ctx.fillRect(6.5, 2, 1, 7);
        });
    });

    hdTexture(scene, 'hd_bird', 14, 6, (ctx) => {
        ctx.strokeStyle = '#3c4658'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(1, 2); ctx.quadraticCurveTo(4, 0, 7, 4); ctx.quadraticCurveTo(10, 0, 13, 2);
        ctx.stroke();
    });

    hdWalkerTextures(scene);
    hdPlayerTextures(scene);
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

// Walker: a glossy red beetle. Four walk frames, facing right like the
// classic art so the existing flip logic still applies.
function hdWalkerTextures(scene) {
    for (let f = 0; f < 4; f++) {
        const key = f === 0 ? 'hd_tex_enemy_walker' : 'hd_tex_enemy_walker_' + f;
        hdTexture(scene, key, 34, 32, (ctx) => {
            const p = f * Math.PI / 2;
            const bob = Math.abs(Math.sin(p)) * 1.2;
            // Feet (back pair first)
            const feet = [
                { x: 12 + Math.sin(p + Math.PI) * 3.5, lift: Math.max(0, Math.cos(p + Math.PI)) * 2, back: true },
                { x: 22 + Math.sin(p) * 3.5, lift: Math.max(0, Math.cos(p)) * 2, back: false }
            ];
            feet.forEach(ft => {
                ctx.fillStyle = ft.back ? '#3d0808' : '#5c0d0d';
                ctx.beginPath();
                ctx.ellipse(ft.x, 29 - ft.lift, 4.5, 2.6, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            // Shell
            const by = 3 + bob;
            const g = ctx.createRadialGradient(22, by + 5, 1, 17, by + 13, 19);
            g.addColorStop(0, '#ff8a6a');
            g.addColorStop(0.45, '#e2311f');
            g.addColorStop(1, '#7a0c0c');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(2, by + 24);
            ctx.quadraticCurveTo(1, by + 2, 17, by + 1);
            ctx.quadraticCurveTo(33, by + 2, 32, by + 24);
            ctx.quadraticCurveTo(17, by + 27, 2, by + 24);
            ctx.fill();
            ctx.strokeStyle = 'rgba(70,6,6,0.8)'; ctx.lineWidth = 1; ctx.stroke();
            // Belly shadow
            ctx.fillStyle = 'rgba(60,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(17, by + 23, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
            // Specular
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.ellipse(23, by + 5.5, 5, 2.2, -0.25, 0, Math.PI * 2); ctx.fill();
            // Eyes looking ahead, under angry brows
            [[14, by + 13], [23, by + 13]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(ex, ey, 3.6, 4.2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#1a0505';
                ctx.beginPath(); ctx.ellipse(ex + 1.4, ey + 0.8, 1.9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.fillRect(ex + 1.6, ey - 0.8, 1, 1);
            });
            ctx.strokeStyle = '#3a0404'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(10.5, by + 7.5); ctx.lineTo(16.5, by + 9.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(20, by + 9.5); ctx.lineTo(26.5, by + 7.5); ctx.stroke();
            // Fang
            ctx.fillStyle = '#fff6ea';
            ctx.beginPath(); ctx.moveTo(21, by + 19); ctx.lineTo(24, by + 19); ctx.lineTo(22.5, by + 22); ctx.fill();
        });
    }
}

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

function hdResetState() {
    hdRig = null;
    hdCoinGlows = [];
    hdButterflies = [];
    hdBirds = [];
    hdMotes = [];
    hdLeaves = [];
    hdMist = null;
    hdOptional = [];
}

// A tiled strip that scrolls with the camera at `factor`, sized so it always
// covers the view without per-frame repositioning.
function hdLayer(scene, key, y, height, factor, depth, alpha) {
    const worldW = currentLevel.worldWidth;
    const width = Math.ceil(800 + Math.max(0, worldW - 800) * factor) + 4;
    const strip = scene.add.tileSprite(0, y, width, height, key).setOrigin(0, 0);
    strip.setScrollFactor(factor, 0).setDepth(depth);
    if (alpha !== undefined) strip.setAlpha(alpha);
    return strip;
}

// Builds the sky, parallax, weather, lighting and ground. Called from
// loadLevel in place of the classic backdrop.
function buildHdLook(scene) {
    hdLookActive = true;
    hdResetState();
    const worldW = currentLevel.worldWidth;
    const low = typeof lowFxMode !== 'undefined' && lowFxMode;

    // Textures (cached after the first build)
    hdSkyTexture(scene);
    hdGlowTexture(scene);
    hdRayTexture(scene);
    for (let i = 0; i < 3; i++) hdCloudTexture(scene, i);
    hdMountainTexture(scene, 'hd_mtn_far', {
        seed: 11, height: 300, base: 250, amp: 190, snowLine: 150,
        lit: 0xbccade, shade: 0x7486aa, haze: 0xeee2c6, hazeAlpha: 0.55
    });
    hdMountainTexture(scene, 'hd_mtn_mid', {
        seed: 23, height: 260, base: 200, amp: 120,
        lit: 0x94b596, shade: 0x547379, haze: 0xe4e1c8, hazeAlpha: 0.4
    });
    hdMistTexture(scene);
    hdFarForestTexture(scene);
    hdNearHillsTexture(scene);
    hdBushLineTexture(scene);
    hdGroundTexture(scene);
    for (let i = 0; i < 3; i++) hdTuftTexture(scene, i);
    hdForegroundTexture(scene);
    hdBranchTexture(scene);
    hdObjectTextures(scene);

    // Sky (with the sun baked in) stays fixed: it is "infinitely" far away
    scene.add.image(0, 0, 'hd_sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-40);

    // Clouds at a few depths, drifting
    const rnd = hdRandom(2024);
    const cloudCount = low ? 3 : Math.max(4, Math.floor(worldW / 560));
    for (let i = 0; i < cloudCount; i++) {
        const far = i % 2 === 0;
        const factor = far ? 0.03 + rnd() * 0.03 : 0.08 + rnd() * 0.06;
        const x = (i + rnd() * 0.6) / cloudCount * (800 + worldW * factor);
        const y = 40 + rnd() * (far ? 110 : 150);
        const scale = far ? 0.45 + rnd() * 0.25 : 0.65 + rnd() * 0.35;
        const cloud = scene.add.image(x, y, 'hd_cloud_' + (i % 3))
            .setScale(scale).setAlpha(far ? 0.75 : 0.95)
            .setScrollFactor(factor, 0).setDepth(far ? -38 : -36);
        scene.tweens.add({
            targets: cloud, x: x + 30 + rnd() * 50, duration: 14000 + rnd() * 10000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    // Distant birds crossing the sky
    if (!low) {
        for (let i = 0; i < 5; i++) {
            const b = scene.add.image(rnd() * 800, 120 + rnd() * 90, 'hd_bird')
                .setScrollFactor(0).setDepth(-37).setScale(0.5 + rnd() * 0.4).setAlpha(0.7);
            hdBirds.push({ obj: b, speed: 10 + rnd() * 8, phase: rnd() * 6, baseY: b.y });
            hdOptional.push(b);
        }
    }

    // Parallax stack, far to near
    hdLayer(scene, 'hd_mtn_far', 180, 300, 0.05, -35);
    if (!low) hdLayer(scene, 'hd_mtn_mid', 280, 260, 0.1, -33);
    if (!low) hdMist = hdLayer(scene, 'hd_mist', 405, 120, 0.13, -32, 0.5);
    hdLayer(scene, 'hd_far_forest', 360, 200, 0.2, -30);
    hdLayer(scene, 'hd_near_hills', 350, 240, 0.35, -26);
    if (!low) hdLayer(scene, 'hd_bushes', 462, 110, 0.6, -20);

    // God rays fanning down-left from the sun
    if (!low) {
        [[0.66, 1.3, 0.1], [0.9, 1.5, 0.08], [1.14, 1.2, 0.07]].forEach(([angle, len, alpha], i) => {
            const ray = scene.add.image(HD_SUN.x, HD_SUN.y, 'hd_ray')
                .setOrigin(0.5, 0).setRotation(angle).setScale(1 + i * 0.2, len)
                .setScrollFactor(0.02, 0).setDepth(-29).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha);
            scene.tweens.add({
                targets: ray, alpha: alpha * 0.35, duration: 3500 + i * 900,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
            hdOptional.push(ray);
        });
    }

    // Ground: one continuous strip, surface at y=560
    scene.add.tileSprite(0, 560 - HD_GROUND_LIP, worldW, 600 - 560 + HD_GROUND_LIP, 'hd_ground')
        .setOrigin(0, 0).setDepth(-3);

    // Soft shadows cast onto the ground by the floating platforms (sun is
    // upper-right, so they fall slightly left)
    if (currentLevel.platforms && scene.textures.exists('tex_shadow')) {
        currentLevel.platforms.forEach(p => {
            const height = 560 - (p.y + p.height / 2);
            if (height <= 0 || height > 260) return;
            const t = 1 - height / 260;
            scene.add.image(p.x - 12 - height * 0.08, 562, 'tex_shadow')
                .setScale(p.width / 40, 0.9).setAlpha(0.18 + t * 0.3).setDepth(-1);
        });
    }

    // Grass tufts in front of the player
    const trnd = hdRandom(515);
    for (let x = 30 + trnd() * 60; x < worldW; x += 70 + trnd() * 110) {
        const tuft = scene.add.image(x, 562, 'hd_tuft_' + Math.floor(trnd() * 3))
            .setOrigin(0.5, 1).setDepth(11).setFlipX(trnd() < 0.5);
        hdOptional.push(tuft);
    }

    // Foreground depth-of-field layers
    if (!low) {
        hdOptional.push(hdLayer(scene, 'hd_foreground', 556, 46, 1.3, 70, 0.95));
        const branchSpots = [[900, 0], [2300, 1], [3500, 0]];
        branchSpots.forEach(([x, flip]) => {
            if (x > 800 + Math.max(0, worldW - 800) * 1.25) return;
            const b = scene.add.image(x, -8, 'hd_branch').setOrigin(0.5, 0)
                .setScrollFactor(1.25, 0).setDepth(70).setFlipX(!!flip).setAlpha(0.95);
            hdOptional.push(b);
        });
    }

    // Atmosphere: pollen drifting through the light, butterflies, leaves
    if (!low) {
        for (let i = 0; i < 26; i++) {
            const m = scene.add.image(rnd() * 800, rnd() * 520, 'hd_mote')
                .setScale(0.2 + rnd() * 0.25).setDepth(-4)
                .setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff2c0);
            hdMotes.push({ obj: m, vx: (rnd() - 0.3) * 14, vy: (rnd() - 0.6) * 8, phase: rnd() * 6, base: 0.35 + rnd() * 0.45 });
            hdOptional.push(m);
        }
        for (let i = 0; i < 4; i++) {
            const hx = 300 + (i / 4) * (worldW - 500) + rnd() * 200;
            const b = scene.add.image(hx, 520, 'hd_butterfly_' + (i % 3)).setDepth(4).setScale(0.9);
            hdButterflies.push({ obj: b, hx: hx, hy: 505 + rnd() * 30, t: rnd() * 100, seed: rnd() * 10 });
            hdOptional.push(b);
        }
        for (let i = 0; i < 12; i++) {
            const near = i < 2;
            const l = scene.add.image(rnd() * 800, rnd() * 600, 'hd_leaf_' + (i % 3))
                .setScrollFactor(0).setDepth(near ? 71 : 58)
                .setScale(near ? 2.6 : 0.8 + rnd() * 0.5)
                .setAlpha(near ? 0.55 : 0.9);
            hdLeaves.push({
                obj: l, x: l.x, y: l.y, near: near,
                vx: -20 - rnd() * 30 - (near ? 40 : 0), vy: 22 + rnd() * 26 + (near ? 20 : 0),
                sway: rnd() * 6, spin: (rnd() - 0.5) * 3
            });
            hdOptional.push(l);
        }
    }

    // Vignette, WebGL only (same cost as the classic look's)
    const cam = scene.cameras.main;
    if (cam.postFX && !low) {
        cam.postFX.clear();
        cam.postFX.addVignette(0.5, 0.5, 0.95, 0.28);
    }

    scene.events.on('postupdate', hdPostUpdate, scene);
    scene.events.once('shutdown', () => {
        scene.events.off('postupdate', hdPostUpdate, scene);
        hdLookActive = false;
        hdResetState();
    });
}

// Called after coins, checkpoints and the start text exist
function decorateHdLevel(scene) {
    coinRects.forEach(c => hdAttachCoinGlow(scene, c.rect));
    checkpointRects.forEach(cp => {
        scene.add.image(cp.rect.x, cp.rect.y, 'hd_checkpoint_pole').setDepth(cp.rect.depth - 0.1);
    });
    if (startText) {
        startText.setVisible(false);
        scene.add.image(22, 562, 'hd_sign_start').setOrigin(0.5, 1).setDepth(-1);
    }
}

function hdAttachCoinGlow(scene, rect) {
    if (!rect) return;
    const glow = scene.add.image(rect.x, rect.y, 'hd_glow')
        .setScale(0.42).setTint(0xffcf4a).setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.5).setDepth(rect.depth - 0.1);
    hdCoinGlows.push({ glow: glow, rect: rect });
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
        if (scene.cameras.main.postFX) scene.cameras.main.postFX.clear();
    }

    // Coin glows follow their coin; the coin darkens as it turns edge-on
    hdCoinGlows = hdCoinGlows.filter(cg => {
        if (!cg.rect.scene) { cg.glow.destroy(); return false; }
        cg.glow.setPosition(cg.rect.x, cg.rect.y);
        cg.glow.setAlpha(cg.rect.alpha * (0.4 + Math.sin(t * 0.004 + cg.rect.x) * 0.12));
        const edge = Phaser.Math.Clamp((cg.rect.scaleX - 0.25) / 0.75, 0, 1);
        cg.rect.setTint(hdMix(0xb07818, 0xffffff, edge));
        return true;
    });

    // Walker walk cycle, stepped by distance so feet never skate
    if (enemies && enemies.children) {
        enemies.children.entries.forEach(e => {
            if (!e.active || !e.visual || e.enemyType !== 'walker' || !e.visual.setTexture) return;
            const moving = Math.abs(e.body.velocity.x) > 5;
            const f = moving ? Math.floor(Math.abs(e.x) / 5) % 4 : 0;
            const key = f === 0 ? 'hd_tex_enemy_walker' : 'hd_tex_enemy_walker_' + f;
            if (e.visual.texture.key !== key) e.visual.setTexture(key);
        });
    }

    // Lit checkpoints get a warm glow once reached
    checkpointRects.forEach(cp => {
        if (cp.activated && !cp.hdGlow && cp.rect.scene) {
            cp.hdGlow = scene.add.image(cp.rect.x + 6, cp.rect.y - 15, 'hd_glow')
                .setTint(0x9cff9c).setBlendMode(Phaser.BlendModes.ADD).setDepth(cp.rect.depth - 0.2)
                .setScale(0.2).setAlpha(0);
            scene.tweens.add({ targets: cp.hdGlow, scale: 0.7, alpha: 0.55, duration: 400, ease: 'Sine.easeOut' });
            scene.tweens.add({
                targets: cp.hdGlow, alpha: 0.3, duration: 1200, delay: 400,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }
    });

    if (low || !running) return;

    if (hdMist) hdMist.tilePositionX += dt * 6;

    hdBirds.forEach(b => {
        b.phase += dt * 9;
        b.obj.x -= b.speed * dt;
        b.obj.y = b.baseY + Math.sin(b.phase * 0.15) * 4;
        b.obj.scaleY = Math.abs(b.obj.scaleX) * (0.55 + Math.abs(Math.sin(b.phase)) * 0.6);
        if (b.obj.x < -20) { b.obj.x = 820; b.baseY = 110 + Math.random() * 100; }
    });

    const view = scene.cameras.main.worldView;
    hdMotes.forEach(m => {
        m.phase += dt;
        m.obj.x += (m.vx + Math.sin(m.phase * 0.7) * 6) * dt;
        m.obj.y += (m.vy + Math.cos(m.phase * 0.9) * 5) * dt;
        m.obj.setAlpha(m.base * (0.6 + Math.sin(m.phase * 2.3) * 0.4));
        if (m.obj.x < view.x - 10) m.obj.x = view.right + 8;
        if (m.obj.x > view.right + 10) m.obj.x = view.x - 8;
        if (m.obj.y < view.y - 10) m.obj.y = view.y + 520;
        if (m.obj.y > view.y + 540) m.obj.y = view.y - 8;
    });

    // Butterflies wander around a home spot, wings beating
    hdButterflies.forEach(b => {
        b.t += dt;
        const x = b.hx + Math.sin(b.t * 0.7 + b.seed) * 60 + Math.sin(b.t * 1.9) * 14;
        const y = b.hy + Math.sin(b.t * 1.3 + b.seed * 2) * 22 + Math.sin(b.t * 4.1) * 5;
        b.obj.setFlipX(x < b.obj.x);
        b.obj.setPosition(x, y);
        b.obj.scaleY = 0.9 * (0.25 + Math.abs(Math.sin(b.t * 16)) * 0.75);
    });

    hdLeaves.forEach(l => {
        l.sway += dt * 2.2;
        l.x += (l.vx + Math.sin(l.sway) * 22) * dt;
        l.y += l.vy * dt;
        if (l.y > 620) { l.y = -20; l.x = Math.random() * 900; }
        if (l.x < -30) l.x = 830;
        l.obj.setPosition(l.x, l.y);
        l.obj.rotation += l.spin * dt;
        // Flutter: the leaf turning over reads as a change in width
        const base = l.near ? 2.6 : 1;
        l.obj.scaleX = base * (0.3 + Math.abs(Math.sin(l.sway * 1.3)) * 0.7);
    });
}
