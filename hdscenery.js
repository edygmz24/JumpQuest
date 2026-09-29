// ========================
// HD look — scenery generators
// ========================
// Parameterised painters for skies, parallax layers, ground, platforms and
// framing layers. hdbiomes.js combines them into one recipe per world; all
// of them draw with the Canvas 2D API and cache the result as a texture.

// ========================
// Sky and light
// ========================

// The sky is one full-screen image with the sun or moon, stars and aurora
// baked in: distant enough that they barely move with the camera, and one
// image is much cheaper to draw than a stack of large glows.
function hdSkyTexture(scene, key, sky) {
    return hdTexture(scene, key, 800, 600, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        sky.stops.forEach(([t, c]) => g.addColorStop(t, c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const rnd = hdRandom(4040 + sky.stops.length);

        if (sky.aurora) {
            // Curtains: soft vertical streaks whose top edge ripples
            ctx.globalCompositeOperation = 'lighter';
            sky.aurora.forEach((band, i) => {
                for (let x = 0; x < w; x += 2) {
                    const top = band.y + Math.sin(x * 0.011 + i * 2) * 26 + Math.sin(x * 0.037 + i) * 9;
                    const len = band.len * (0.6 + 0.4 * Math.sin(x * 0.023 + i * 3));
                    const fade = Math.pow(Math.sin(Math.PI * x / w), 0.6);
                    const streak = 0.55 + 0.45 * Math.sin(x * 0.21 + i) * Math.sin(x * 0.053);
                    const a = band.alpha * fade * streak;
                    const cg = ctx.createLinearGradient(0, top, 0, top + len);
                    cg.addColorStop(0, `rgba(${band.rgb},0)`);
                    cg.addColorStop(0.15, `rgba(${band.rgb},${a})`);
                    cg.addColorStop(1, `rgba(${band.rgb},0)`);
                    ctx.fillStyle = cg;
                    ctx.fillRect(x, top, 2, len);
                }
            });
            ctx.globalCompositeOperation = 'source-over';
        }

        if (sky.stars) {
            for (let i = 0; i < sky.stars; i++) {
                const x = rnd() * w;
                const y = Math.pow(rnd(), 1.4) * h * 0.72;
                const r = rnd() < 0.08 ? 1.4 : 0.5 + rnd() * 0.7;
                ctx.fillStyle = `rgba(255,${240 + Math.floor(rnd() * 15)},${220 + Math.floor(rnd() * 35)},${0.35 + rnd() * 0.65})`;
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
                if (r > 1.2) hdSoftDot(ctx, x, y, 5, 0xffffff, 0.35);
            }
        }

        const orb = sky.sun || sky.moon;
        if (orb) {
            ctx.globalCompositeOperation = 'lighter';
            const halo = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.halo || 300);
            halo.addColorStop(0, `rgba(${orb.glow},${orb.haloAlpha || 0.6})`);
            halo.addColorStop(0.1, `rgba(${orb.glow},${(orb.haloAlpha || 0.6) * 0.55})`);
            halo.addColorStop(0.35, `rgba(${orb.glow},${(orb.haloAlpha || 0.6) * 0.15})`);
            halo.addColorStop(1, `rgba(${orb.glow},0)`);
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
        }
        if (sky.sun) {
            const s = sky.sun, r = s.r || 36;
            const sun = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
            sun.addColorStop(0, 'rgba(255,255,250,1)');
            sun.addColorStop(0.55, `rgba(${s.core || '255,250,225'},1)`);
            sun.addColorStop(0.72, `rgba(${s.glow},0.55)`);
            sun.addColorStop(1, `rgba(${s.glow},0)`);
            ctx.fillStyle = sun;
            ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
        }
        if (sky.moon) {
            const m = sky.moon;
            const disc = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 1, m.x, m.y, m.r);
            disc.addColorStop(0, '#fffdf2');
            disc.addColorStop(0.8, '#e9e4d0');
            disc.addColorStop(1, '#cfc8b4');
            ctx.fillStyle = disc;
            ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(150,140,120,0.28)';
            [[-0.3, -0.1, 0.22], [0.25, 0.3, 0.16], [0.1, -0.4, 0.1], [-0.1, 0.45, 0.12], [0.45, -0.15, 0.08]].forEach(([dx, dy, rr]) => {
                ctx.beginPath(); ctx.arc(m.x + dx * m.r, m.y + dy * m.r, rr * m.r, 0, Math.PI * 2); ctx.fill();
            });
        }
        if (sky.darkTop) {
            // Cave and interior ceilings: fade the top of the frame to black
            const top = ctx.createLinearGradient(0, 0, 0, h * 0.4);
            top.addColorStop(0, 'rgba(0,0,0,0.6)');
            top.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = top;
            ctx.fillRect(0, 0, w, h * 0.4);
        }
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

// One soft beam, reused at several angles for god rays and the goal beacon
function hdRayTexture(scene) {
    return hdTexture(scene, 'hd_ray', 64, 512, (ctx) => {
        const across = ctx.createLinearGradient(0, 0, 64, 0);
        across.addColorStop(0, 'rgba(255,255,255,0)');
        across.addColorStop(0.5, 'rgba(255,255,255,1)');
        across.addColorStop(1, 'rgba(255,255,255,0)');
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

// Soft darkness with a clear centre, centred on the player in dark worlds
function hdDarknessTexture(scene) {
    return hdTexture(scene, 'hd_darkness', 256, 256, (ctx) => {
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.16, 'rgba(0,0,0,0)');
        g.addColorStop(0.42, 'rgba(0,0,0,0.55)');
        g.addColorStop(0.7, 'rgba(0,0,0,0.9)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
    });
}

// Cumulus: puffs scattered under a dome-shaped envelope, kept nearly flat
// white individually, then shaded as one mass (lit top, cool underside) so
// the cloud reads as a single volume rather than outlined circles.
const HD_CLOUD_PALETTES = {
    day: { puff: ['#ffffff', '#f6f6f4', '#e9ecf1'], top: '255,240,210', under: '120,138,172', underA: 0.5 },
    warm: { puff: ['#fffaf2', '#fbeee0', '#f0dccb'], top: '255,226,180', under: '170,120,120', underA: 0.45 },
    sunset: { puff: ['#ffd6a8', '#f7a88a', '#c9707e'], top: '255,214,140', under: '90,40,80', underA: 0.6 },
    night: { puff: ['#5a5680', '#48446c', '#34304f'], top: '190,200,255', under: '10,6,26', underA: 0.6 }
};

function hdCloudTexture(scene, variant, palName) {
    const pal = HD_CLOUD_PALETTES[palName || 'day'];
    const key = 'hd_cloud_' + (palName || 'day') + '_' + variant;
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
            g.addColorStop(0, pal.puff[0]);
            g.addColorStop(0.8, pal.puff[1]);
            g.addColorStop(1, pal.puff[2]);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.fillStyle = pal.puff[2];
        ctx.beginPath();
        ctx.ellipse(150, base - 4, 118, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-atop';
        const mass = ctx.createLinearGradient(0, 20, 0, base + 6);
        mass.addColorStop(0, `rgba(${pal.top},0.35)`);
        mass.addColorStop(0.45, `rgba(${pal.top},0)`);
        mass.addColorStop(0.8, `rgba(${pal.under},${pal.underA * 0.55})`);
        mass.addColorStop(1, `rgba(${pal.under},${pal.underA})`);
        ctx.fillStyle = mass;
        ctx.fillRect(0, 0, w, h);
        const side = ctx.createLinearGradient(0, 0, w, 0);
        side.addColorStop(0, `rgba(${pal.under},0.18)`);
        side.addColorStop(0.6, `rgba(${pal.under},0)`);
        ctx.fillStyle = side;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }, 2);
}

// ========================
// Ranges: mountains and mesas
// ========================

// Flat-topped buttes with steep cliffs, tileable over W
function hdMesaProfile(seed, W, base, amp) {
    const rnd = hdRandom(seed);
    const segs = [];
    let total = 0;
    while (total < W) {
        const width = 70 + rnd() * 190;
        segs.push({ w: width, level: base - amp * (0.15 + rnd() * 0.85) * (rnd() < 0.3 ? 0.35 : 1) });
        total += width;
    }
    const scale = W / total;
    segs.forEach(s => { s.w *= scale; });
    const bump = hdRidge(seed + 3, W, false);
    const heights = new Float32Array(W);
    let x0 = 0;
    segs.forEach((s, i) => {
        const prev = segs[(i - 1 + segs.length) % segs.length].level;
        const ramp = 8 + (i * 7) % 14;
        for (let x = Math.floor(x0); x < Math.min(W, Math.floor(x0 + s.w)); x++) {
            const t = Math.min(1, (x - x0) / ramp);
            const e = t * t * (3 - 2 * t);
            heights[x] = prev + (s.level - prev) * e + bump(x) * 3;
        }
        x0 += s.w;
    });
    return heights;
}

// Range shaded per pixel. Each ridge point is lit by its slope and that light
// fans diagonally downhill, so faces spread from the peaks as on real rock.
// Options: lightDir (-1 = lit from the left), profile 'mesa', strata banding,
// rim light along the crest (backlit sunsets), snow, haze toward the base.
function hdMountainTexture(scene, key, opts) {
    const W = 1024;
    const H = opts.height;
    return hdTexture(scene, key, W, H, (ctx) => {
        let heights;
        if (opts.profile === 'mesa') {
            heights = hdMesaProfile(opts.seed, W, opts.base, opts.amp);
        } else {
            const ridge = hdRidge(opts.seed, W, true);
            const soft = hdRidge(opts.seed + 7, W, false);
            heights = new Float32Array(W);
            for (let x = 0; x < W; x++) {
                const v = ridge(x) * 0.65 + soft(x) * 0.35;
                heights[x] = opts.base - (v * 0.5 + 0.5) * opts.amp;
            }
        }
        const dir = opts.lightDir || 1;
        const faceLight = new Float32Array(W);
        const steepness = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            const slope = (heights[(x + 3) % W] - heights[(x - 3 + W) % W]) / 6;
            faceLight[x] = Math.max(0, Math.min(1, 0.45 + slope * 1.6 * dir));
            steepness[x] = Math.min(1, Math.abs(slope) * 0.9);
        }
        const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
        const lit = rgb(opts.lit), shade = rgb(opts.shade), haze = rgb(opts.haze);
        const rim = opts.rim ? rgb(opts.rim) : null;
        const snowLit = rgb(0xfbfcff), snowShade = rgb(0xbfcadf);
        const hazeTop = opts.base - opts.amp;
        const spreadK = opts.spread !== undefined ? opts.spread : 0.75;
        const wrap = x => ((Math.round(x) % W) + W) % W;
        const img = ctx.createImageData(W, H);
        const d = img.data;
        for (let x = 0; x < W; x++) {
            const top = heights[x];
            for (let y = Math.max(0, Math.floor(top)); y < H; y++) {
                const below = y - top;
                const cover = Math.max(0, Math.min(1, below + 1));
                const spread = below * spreadK;
                const fanned = (faceLight[wrap(x - spread)] + faceLight[wrap(x + spread)]) * 0.5;
                const settle = Math.min(1, below / 110);
                const grain = Math.sin(x * 0.9 + y * 0.35) * Math.sin(y * 1.3 - x * 0.27) * 0.05;
                let light = fanned + (0.45 - fanned) * settle + grain;
                if (opts.strata) light += Math.sin(y * 0.42 + Math.sin(x * 0.013) * 3) * opts.strata;
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
                if (rim && below < 3) {
                    const k = (1 - below / 3) * 0.8;
                    r += (rim[0] - r) * k; g += (rim[1] - g) * k; b += (rim[2] - b) * k;
                }
                const hz = Math.max(0, Math.min(1, (y - hazeTop) / (H - hazeTop))) * opts.hazeAlpha;
                const i = (y * W + x) * 4;
                d[i] = r + (haze[0] - r) * hz;
                d[i + 1] = g + (haze[1] - g) * hz;
                d[i + 2] = b + (haze[2] - b) * hz;
                d[i + 3] = cover * 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    });
}

// ========================
// Vegetation and small props
// ========================

// Canopy blob with a lit crown and a shaded underside
function hdCanopy(ctx, x, y, r, lit, shade, rnd) {
    const g = ctx.createRadialGradient(x + r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, hdHex(lit));
    g.addColorStop(1, hdHex(shade));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
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

function hdTrunk(ctx, x, groundY, size, trunkH, trunk) {
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
}

function hdTree(ctx, x, groundY, size, lit, shade, trunk, rnd) {
    const trunkH = size * 0.9;
    hdTrunk(ctx, x, groundY, size, trunkH, trunk);
    const cy = groundY - trunkH - size * 0.25;
    hdCanopy(ctx, x - size * 0.28, cy + size * 0.12, size * 0.38, lit, shade, rnd);
    hdCanopy(ctx, x + size * 0.3, cy + size * 0.1, size * 0.36, lit, shade, rnd);
    hdCanopy(ctx, x, cy - size * 0.12, size * 0.46, lit, shade, rnd);
}

// Bare, gnarled tree for dusk and night worlds
function hdDeadTree(ctx, x, groundY, size, color, rnd) {
    ctx.strokeStyle = hdHex(color);
    ctx.lineCap = 'round';
    const branch = (bx, by, angle, len, width, depth) => {
        const ex = bx + Math.cos(angle) * len;
        const ey = by + Math.sin(angle) * len;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + ex) / 2 + (rnd() - 0.5) * len * 0.3, (by + ey) / 2, ex, ey);
        ctx.stroke();
        if (depth > 0) {
            const n = 2 + Math.floor(rnd() * 2);
            for (let i = 0; i < n; i++) {
                branch(ex, ey, angle + (rnd() - 0.5) * 1.3, len * (0.55 + rnd() * 0.2), width * 0.62, depth - 1);
            }
        }
    };
    branch(x, groundY, -Math.PI / 2 + (rnd() - 0.5) * 0.2, size * 0.45, size * 0.09, 3);
}

function hdCactus(ctx, x, groundY, size, lit, shade) {
    const arm = (ax, ay, dir, len) => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + dir * len * 0.5, ay);
        ctx.lineTo(ax + dir * len * 0.5, ay - len);
        ctx.stroke();
    };
    const g = ctx.createLinearGradient(x - size * 0.1, 0, x + size * 0.1, 0);
    g.addColorStop(0, hdHex(shade));
    g.addColorStop(1, hdHex(lit));
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.16;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, groundY - size);
    ctx.stroke();
    ctx.lineWidth = size * 0.11;
    arm(x, groundY - size * 0.45, -1, size * 0.4);
    arm(x, groundY - size * 0.62, 1, size * 0.34);
}

function hdRock(ctx, x, groundY, size, lit, shade) {
    const g = ctx.createLinearGradient(x - size, groundY - size, x + size, groundY);
    g.addColorStop(0, hdHex(shade));
    g.addColorStop(0.6, hdHex(lit));
    g.addColorStop(1, hdHex(hdMix(lit, 0xffffff, 0.15)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - size, groundY);
    ctx.quadraticCurveTo(x - size * 0.9, groundY - size * 0.7, x - size * 0.2, groundY - size * 0.85);
    ctx.quadraticCurveTo(x + size * 0.7, groundY - size * 0.8, x + size, groundY);
    ctx.closePath();
    ctx.fill();
}

// Fern / palm frond: a curved spine with leaflets
function hdFrond(ctx, x, y, len, angle, color, rnd) {
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    const cx = x + Math.cos(angle) * len * 0.5;
    const cy = y + Math.sin(angle) * len * 0.5 - len * 0.25;
    ctx.strokeStyle = hdHex(color);
    ctx.fillStyle = hdHex(color);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    const n = Math.floor(len / 4);
    for (let i = 1; i < n; i++) {
        const t = i / n;
        const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
        const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
        const leaf = len * 0.28 * Math.sin(t * Math.PI) + 2;
        [-1, 1].forEach(side => {
            const a = angle + side * (1.1 + rnd() * 0.3) + 0.4;
            ctx.beginPath();
            ctx.ellipse(px + Math.cos(a) * leaf * 0.5, py + Math.sin(a) * leaf * 0.5, leaf * 0.5, 1.6, a, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Rolling hills shaded by slope, then dressed with a decoration list
function hdHillsTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed * 7 + 11);
        const f = hdRidge(opts.seed, W, false);
        const heights = new Float32Array(W);
        for (let x = 0; x < W; x++) heights[x] = opts.base - (f(x) * 0.5 + 0.5) * opts.amp;
        const dir = opts.lightDir || 1;
        for (let x = 0; x < W; x++) {
            const y = heights[x];
            const slope = (heights[(x + 4) % W] - heights[(x - 4 + W) % W]) / 8;
            const light = Math.max(0, Math.min(1, 0.5 + slope * 2.2 * dir));
            const g = ctx.createLinearGradient(0, y, 0, H);
            g.addColorStop(0, hdHex(hdMix(opts.shade, opts.lit, light)));
            g.addColorStop(1, hdHex(opts.deep));
            ctx.fillStyle = g;
            // 2px so columns overlap when drawn at reduced scale
            ctx.fillRect(x, y, 2, H - y);
        }
        const at = x => heights[((Math.floor(x) % W) + W) % W];
        (opts.deco || []).forEach(d => {
            const step = d.spacing;
            for (let x = d.offset || 10; x < W; x += step[0] + rnd() * (step[1] - step[0])) {
                const gy = at(x) + (d.sink || 4);
                const size = d.size[0] + rnd() * (d.size[1] - d.size[0]);
                // One seed per item, so the copies drawn across the tile
                // edge match and the seam disappears
                const seed = Math.floor(rnd() * 1e6);
                hdWrap(W, off => {
                    const r = hdRandom(seed);
                    const px = x + off;
                    if (d.type === 'trees') hdTree(ctx, px, gy, size, d.lit, d.shade, d.trunk, r);
                    else if (d.type === 'canopy') hdCanopy(ctx, px, gy - size * 0.2, size, d.lit, d.shade, r);
                    else if (d.type === 'bushes') hdBush(ctx, px, gy + size * 0.5, size, d.lit, d.shade, r);
                    else if (d.type === 'deadtrees') hdDeadTree(ctx, px, gy, size, d.color, r);
                    else if (d.type === 'cacti') hdCactus(ctx, px, gy, size, d.lit, d.shade);
                    else if (d.type === 'rocks') hdRock(ctx, px, gy, size, d.lit, d.shade);
                    else if (d.type === 'ferns') {
                        for (let k = 0; k < 5; k++) hdFrond(ctx, px, gy, size, -Math.PI / 2 + (k - 2) * 0.5, d.color, r);
                    } else if (d.type === 'specks') {
                        const y = at(x) + 8 + r() * (H - at(x) - 8);
                        ctx.fillStyle = hdRgba(d.colors[Math.floor(r() * d.colors.length)], 0.8);
                        ctx.fillRect(px, y, 1.6, 1.6);
                    }
                });
            }
        });
        if (opts.haze) {
            ctx.globalCompositeOperation = 'source-atop';
            const hz = ctx.createLinearGradient(0, opts.base - opts.amp - 40, 0, H);
            hz.addColorStop(0, hdRgba(opts.haze, opts.hazeAlpha[0]));
            hz.addColorStop(1, hdRgba(opts.haze, opts.hazeAlpha[1]));
            ctx.fillStyle = hz;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
        }
    }, opts.blur);
}

// Bushes and tall grass (or dry scrub) peeking above the ground line
function hdBushLineTexture(scene, key, opts) {
    return hdTexture(scene, key, 1024, 110, (ctx, W, H) => {
        const rnd = hdRandom(6203 + opts.seed);
        if (opts.bushes) {
            for (let x = 0; x < W; x += 40 + rnd() * 70) {
                const r = 9 + rnd() * 10;
                const seed = Math.floor(rnd() * 1e6);
                hdWrap(W, off => hdBush(ctx, x + off, H - r * 0.5, r, opts.lit, opts.shade, hdRandom(seed)));
            }
        }
        for (let i = 0; i < (opts.blades || 380); i++) {
            const x = rnd() * W;
            const bh = 10 + rnd() * (opts.bladeH || 26);
            const lean = (rnd() - 0.4) * 8;
            const c = hdMix(opts.shade, opts.lit, rnd());
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

function hdMistTexture(scene, key, rgb) {
    return hdTexture(scene, key, 1024, 120, (ctx, W) => {
        const rnd = hdRandom(7717);
        for (let i = 0; i < 70; i++) {
            const x = rnd() * W;
            const y = 50 + (rnd() - 0.5) * 50;
            const rx = 60 + rnd() * 120;
            const ry = 12 + rnd() * 16;
            hdWrap(W, off => {
                const g = ctx.createRadialGradient(x + off, y, 0, x + off, y, rx);
                g.addColorStop(0, `rgba(${rgb},0.35)`);
                g.addColorStop(1, `rgba(${rgb},0)`);
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

// ========================
// Built and underground worlds
// ========================

// Castle skyline: keeps, round towers with conical roofs, crenellated walls
// and lit windows, tileable
function hdCastleTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        const body = hdHex(opts.color);
        const rimC = opts.rim ? hdHex(opts.rim) : null;
        const drawWindow = (wx, wy, ww, wh, lit) => {
            if (!lit) {
                ctx.fillStyle = hdHex(hdMix(opts.color, 0x000000, 0.35));
                ctx.fillRect(wx, wy, ww, wh);
                return;
            }
            hdSoftDot(ctx, wx + ww / 2, wy + wh / 2, ww * 2.4, opts.windowColor, 0.35);
            ctx.fillStyle = hdHex(opts.windowColor);
            ctx.beginPath();
            ctx.moveTo(wx, wy + wh);
            ctx.lineTo(wx, wy + ww / 2);
            ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
            ctx.lineTo(wx + ww, wy + wh);
            ctx.fill();
        };
        const crenels = (x0, x1, y) => {
            ctx.fillStyle = body;
            for (let x = x0; x < x1; x += 10) ctx.fillRect(x, y - 6, 6, 6);
        };
        // Curtain wall along the bottom
        const wallTop = H - opts.wallH;
        hdWrap(W, off => {
            ctx.fillStyle = body;
            ctx.fillRect(off, wallTop, W, opts.wallH);
            crenels(off, off + W, wallTop);
        });
        // Towers and keeps
        for (let x = 20; x < W; x += opts.spacing[0] + rnd() * (opts.spacing[1] - opts.spacing[0])) {
            const tw = 26 + rnd() * 34;
            const th = opts.towerH[0] + rnd() * (opts.towerH[1] - opts.towerH[0]);
            const roof = rnd() < 0.6;
            const wins = [];
            for (let wy = H - th + 24; wy < H - 30; wy += 26 + rnd() * 10) {
                wins.push([x + tw / 2 - 3 + (rnd() - 0.5) * tw * 0.4, wy, rnd() < opts.lit]);
            }
            const flagSide = rnd() < 0.5 ? -1 : 1;
            hdWrap(W, off => {
                const tx = x + off;
                ctx.fillStyle = body;
                ctx.fillRect(tx, H - th, tw, th);
                if (roof) {
                    ctx.beginPath();
                    ctx.moveTo(tx - 4, H - th);
                    ctx.lineTo(tx + tw / 2, H - th - tw * 1.1);
                    ctx.lineTo(tx + tw + 4, H - th);
                    ctx.fill();
                    ctx.strokeStyle = body; ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(tx + tw / 2, H - th - tw * 1.1);
                    ctx.lineTo(tx + tw / 2, H - th - tw * 1.1 - 14);
                    ctx.stroke();
                    ctx.fillStyle = hdHex(opts.flag || opts.color);
                    ctx.beginPath();
                    ctx.moveTo(tx + tw / 2, H - th - tw * 1.1 - 14);
                    ctx.lineTo(tx + tw / 2 + flagSide * 9, H - th - tw * 1.1 - 11);
                    ctx.lineTo(tx + tw / 2, H - th - tw * 1.1 - 8);
                    ctx.fill();
                } else {
                    crenels(tx - 2, tx + tw + 2, H - th);
                    ctx.fillStyle = body;
                    ctx.fillRect(tx - 3, H - th, tw + 6, 4);
                }
                if (rimC) {
                    ctx.fillStyle = rimC;
                    ctx.fillRect(tx + tw - 2, H - th, 2, th);
                }
                wins.forEach(([wx, wy, lit]) => drawWindow(wx - x + tx, wy, 6, 10, lit));
            });
        }
    }, opts.blur);
}

// Cheap 2D noise for rock surfaces (it
// uses whole-number frequencies across W so it tiles horizontally)
function hdRockNoise(x, y, W) {
    const f = Math.PI * 2 / W;
    return Math.sin(x * f * 7 + Math.sin(y * 0.021) * 2) * 0.5 +
        Math.sin(y * 0.067 - x * f * 3) * 0.3 +
        Math.sin(x * f * 27 + y * 0.17) * Math.sin(x * f * 15 - y * 0.11) * 0.2;
}

// Per-pixel painting at 1/scale resolution, scaled up into ctx (the scale-up
// doubles as a soft blur). fn(x, y) returns [r, g, b, a] in full-size units.
function hdPaintPixels(ctx, W, H, scale, fn) {
    const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const pctx = canvas.getContext('2d');
    const img = pctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = fn(x * scale, y * scale);
            const i = (y * w + x) * 4;
            d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3];
        }
    }
    pctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvas, 0, 0, W, H);
}

// Cave wall: full-height textured rock with glowing crystal veins
function hdCaveWallTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
        const a = rgb(opts.dark), b = rgb(opts.light);
        const f = Math.PI * 2 / W;
        hdPaintPixels(ctx, W, H, 2, (x, y) => {
            const n = hdRockNoise(x, y, W) * 0.5 + 0.5;
            const cracks = Math.abs(Math.sin(x * f * 5 + Math.sin(y * 0.02) * 3)) < 0.03 ? -0.25 : 0;
            const t = Math.max(0, Math.min(1, n * 0.8 + cracks));
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255];
        });
        const rnd = hdRandom(opts.seed);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
            const x = rnd() * W, y = 60 + rnd() * (H - 160);
            const c = opts.crystals[i % opts.crystals.length];
            hdWrap(W, off => {
                ctx.strokeStyle = hdRgba(c, 0.35);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x + off, y);
                let px = x + off, py = y;
                for (let k = 0; k < 6; k++) {
                    px += (rnd() - 0.3) * 30; py += (rnd() - 0.5) * 22;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
                hdSoftDot(ctx, x + off, y, 26, c, 0.18);
            });
        }
        ctx.globalCompositeOperation = 'source-over';
    });
}

// Jagged spikes hanging from the top (stalactites) or rising from the bottom
function hdSpikeBandTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        const up = opts.dir === 'up';
        const base = up ? H : 0;
        // A solid rock rim first so the spikes grow out of something
        ctx.fillStyle = hdHex(opts.color);
        ctx.beginPath();
        ctx.moveTo(0, base);
        for (let x = 0; x <= W; x += 8) {
            const rim = opts.rim * (0.6 + 0.4 * Math.sin(x * 0.02 + opts.seed) * Math.sin(x * 0.007));
            ctx.lineTo(x, up ? H - rim : rim);
        }
        ctx.lineTo(W, base);
        ctx.closePath();
        ctx.fill();
        for (let x = 0; x < W; x += 12 + rnd() * 40) {
            const len = opts.len[0] + rnd() * (opts.len[1] - opts.len[0]);
            const w = 10 + len * 0.18 + rnd() * 10;
            hdWrap(W, off => {
                const px = x + off;
                const g = ctx.createLinearGradient(px - w / 2, 0, px + w / 2, 0);
                g.addColorStop(0, hdHex(hdMix(opts.color, 0x000000, 0.3)));
                g.addColorStop(0.7, hdHex(hdMix(opts.color, opts.lit, 0.5)));
                g.addColorStop(1, hdHex(opts.color));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(px - w / 2, base);
                ctx.quadraticCurveTo(px - w * 0.2, up ? H - len * 0.6 : len * 0.6, px, up ? H - len : len);
                ctx.quadraticCurveTo(px + w * 0.25, up ? H - len * 0.5 : len * 0.5, px + w / 2, base);
                ctx.fill();
            });
        }
        (opts.crystals || []).forEach(c => {
            for (let i = 0; i < 7; i++) {
                const x = rnd() * W;
                const s = 6 + rnd() * 10;
                const seed = Math.floor(rnd() * 1e6);
                hdWrap(W, off => hdCrystalCluster(ctx, x + off, up ? H - opts.rim * 0.5 : opts.rim * 0.5, s, c, up ? -1 : 1, hdRandom(seed)));
            }
        });
    }, opts.blur);
}

// A few angled prisms with a bright facet and a glow
function hdCrystalCluster(ctx, x, y, size, color, dir, rnd) {
    hdSoftDot(ctx, x, y - dir * size * 0.6, size * 2.4, color, 0.35);
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 * dir + (i - (n - 1) / 2) * 0.35 + (rnd() - 0.5) * 0.2;
        const len = size * (0.7 + rnd() * 0.8);
        const w = size * 0.28;
        const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
        const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
        ctx.fillStyle = hdHex(hdMix(color, 0x000000, 0.25));
        ctx.beginPath();
        ctx.moveTo(x - nx, y - ny); ctx.lineTo(tx, ty); ctx.lineTo(x + nx, y + ny); ctx.fill();
        ctx.fillStyle = hdHex(hdMix(color, 0xffffff, 0.45));
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(x + nx, y + ny); ctx.fill();
    }
}

// Factory back wall: riveted panels, big pipes and dim windows
function hdFactoryWallTexture(scene, key, opts) {
    const W = 1024, H = 600;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, hdHex(hdMix(opts.panel, 0x000000, 0.5)));
        g.addColorStop(1, hdHex(opts.panel));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        for (let x = 0; x < W; x += 128) {
            for (let y = 0; y < H; y += 96) {
                ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, 126, 94);
                ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
                ctx.strokeRect(x + 3, y + 3, 122, 90);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                [[6, 6], [120, 6], [6, 88], [120, 88]].forEach(([rx, ry]) => {
                    ctx.beginPath(); ctx.arc(x + rx, y + ry, 1.6, 0, Math.PI * 2); ctx.fill();
                });
            }
        }
        // Tall windows with a cold glow
        for (let x = 60; x < W; x += 256) {
            const wg = ctx.createLinearGradient(0, 80, 0, 300);
            wg.addColorStop(0, hdRgba(opts.window, 0.55));
            wg.addColorStop(1, hdRgba(opts.window, 0.12));
            ctx.fillStyle = wg;
            ctx.fillRect(x, 80, 70, 220);
            ctx.fillStyle = hdHex(hdMix(opts.panel, 0x000000, 0.6));
            for (let k = 1; k < 3; k++) ctx.fillRect(x + k * 23, 80, 3, 220);
            for (let k = 1; k < 5; k++) ctx.fillRect(x, 80 + k * 44, 70, 3);
        }
        // Pipes
        const pipe = (y, r) => {
            const pg = ctx.createLinearGradient(0, y - r, 0, y + r);
            pg.addColorStop(0, hdHex(hdMix(opts.pipe, 0x000000, 0.4)));
            pg.addColorStop(0.35, hdHex(hdMix(opts.pipe, 0xffffff, 0.25)));
            pg.addColorStop(1, hdHex(hdMix(opts.pipe, 0x000000, 0.55)));
            ctx.fillStyle = pg;
            ctx.fillRect(0, y - r, W, r * 2);
            for (let x = 40; x < W; x += 160) {
                ctx.fillStyle = hdHex(hdMix(opts.pipe, 0x000000, 0.3));
                ctx.fillRect(x, y - r - 3, 10, r * 2 + 6);
            }
        };
        pipe(360, 14);
        pipe(400, 8);
        for (let x = 180; x < W; x += 256 + rnd() * 100) {
            const pg = ctx.createLinearGradient(x - 9, 0, x + 9, 0);
            pg.addColorStop(0, hdHex(hdMix(opts.pipe, 0x000000, 0.5)));
            pg.addColorStop(0.4, hdHex(hdMix(opts.pipe, 0xffffff, 0.2)));
            pg.addColorStop(1, hdHex(hdMix(opts.pipe, 0x000000, 0.5)));
            ctx.fillStyle = pg;
            ctx.fillRect(x - 9, 0, 18, 360);
        }
    }, 1.4);
}

// Silhouetted machinery: truss girders, tanks, stacks and pistons
function hdMachineryTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        const c = hdHex(opts.color);
        const edge = hdHex(opts.edge);
        ctx.fillStyle = c;
        ctx.strokeStyle = c;
        // Horizontal truss
        const ty = opts.trussY;
        ctx.fillRect(0, ty, W, 5);
        ctx.fillRect(0, ty + 26, W, 5);
        ctx.lineWidth = 3;
        for (let x = 0; x < W; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, ty + 3); ctx.lineTo(x + 15, ty + 28); ctx.lineTo(x + 30, ty + 3); ctx.stroke();
        }
        ctx.fillStyle = edge;
        ctx.fillRect(0, ty, W, 1);
        for (let x = 30; x < W; x += 120 + rnd() * 160) {
            const kind = rnd();
            const w = 40 + rnd() * 70;
            const h = opts.minH + rnd() * (H - opts.minH - 20);
            hdWrap(W, off => {
                const px = x + off;
                ctx.fillStyle = c;
                if (kind < 0.4) {
                    // Tank
                    ctx.beginPath();
                    ctx.moveTo(px, H);
                    ctx.lineTo(px, H - h + w / 2);
                    ctx.arc(px + w / 2, H - h + w / 2, w / 2, Math.PI, 0);
                    ctx.lineTo(px + w, H);
                    ctx.fill();
                    ctx.fillStyle = edge;
                    ctx.fillRect(px + w - 2, H - h + w / 2, 2, h - w / 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    for (let k = H - h + w; k < H; k += 18) ctx.fillRect(px, k, w, 2);
                } else if (kind < 0.7) {
                    // Smokestack
                    const sw = w * 0.4;
                    ctx.fillRect(px, H - h - 40, sw, h + 40);
                    ctx.fillRect(px - 3, H - h - 44, sw + 6, 6);
                    ctx.fillStyle = edge;
                    ctx.fillRect(px + sw - 2, H - h - 40, 2, h + 40);
                } else {
                    // Press with piston
                    ctx.fillRect(px, H - h, w, 18);
                    ctx.fillRect(px + w * 0.4, H - h + 18, w * 0.2, h * 0.5);
                    ctx.fillRect(px, H - h * 0.35, w, h * 0.35);
                    ctx.fillStyle = edge;
                    ctx.fillRect(px, H - h, w, 1);
                    // Hazard stripes on the press head
                    ctx.save();
                    ctx.beginPath(); ctx.rect(px, H - h + 12, w, 6); ctx.clip();
                    for (let s = -10; s < w + 10; s += 8) {
                        ctx.fillStyle = 'rgba(240,190,40,0.55)';
                        ctx.beginPath();
                        ctx.moveTo(px + s, H - h + 18); ctx.lineTo(px + s + 4, H - h + 18);
                        ctx.lineTo(px + s + 10, H - h + 12); ctx.lineTo(px + s + 6, H - h + 12);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            });
        }
    }, opts.blur);
}

function hdGearTexture(scene, key, radius, color) {
    const size = radius * 2 + 12;
    return hdTexture(scene, key, size, size, (ctx) => {
        const c = size / 2;
        const teeth = Math.max(8, Math.round(radius / 5));
        ctx.fillStyle = hdHex(color);
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
            const a = i / (teeth * 2) * Math.PI * 2;
            const r = i % 2 === 0 ? radius + 5 : radius;
            const a2 = a + Math.PI / (teeth * 2);
            ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
            ctx.lineTo(c + Math.cos(a2) * r, c + Math.sin(a2) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(c, c, radius * 0.22, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            ctx.beginPath(); ctx.arc(c + Math.cos(a) * radius * 0.58, c + Math.sin(a) * radius * 0.58, radius * 0.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = hdRgba(hdMix(color, 0xffffff, 0.25), 0.8);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(c, c, radius * 0.85, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    });
}

// Jungle: tall trunks with buttress roots, hanging vines and a canopy edge
function hdJungleTrunksTexture(scene, key, opts) {
    const W = 1024, H = 600;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        for (let x = 30; x < W; x += opts.spacing[0] + rnd() * (opts.spacing[1] - opts.spacing[0])) {
            const w = opts.width[0] + rnd() * (opts.width[1] - opts.width[0]);
            const vines = [];
            for (let v = 0; v < 3; v++) vines.push([(rnd() - 0.5) * w * 3, 80 + rnd() * 260]);
            hdWrap(W, off => {
                const px = x + off;
                const g = ctx.createLinearGradient(px - w / 2, 0, px + w / 2, 0);
                g.addColorStop(0, hdHex(hdMix(opts.color, 0x000000, 0.35)));
                g.addColorStop(0.7, hdHex(hdMix(opts.color, opts.lit, 0.5)));
                g.addColorStop(1, hdHex(opts.color));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(px - w / 2, 0);
                ctx.lineTo(px + w / 2, 0);
                ctx.lineTo(px + w / 2, H - 70);
                ctx.quadraticCurveTo(px + w * 0.6, H - 20, px + w * 1.6, H);
                ctx.lineTo(px - w * 1.6, H);
                ctx.quadraticCurveTo(px - w * 0.6, H - 20, px - w / 2, H - 70);
                ctx.closePath();
                ctx.fill();
                // Bark ridges
                ctx.strokeStyle = 'rgba(0,0,0,0.18)';
                ctx.lineWidth = 1;
                for (let k = -w / 2 + 4; k < w / 2; k += 6) {
                    ctx.beginPath(); ctx.moveTo(px + k, 0); ctx.lineTo(px + k + Math.sin(k) * 2, H - 70); ctx.stroke();
                }
                // Hanging vines
                ctx.strokeStyle = hdHex(opts.vine);
                ctx.lineWidth = 1.6;
                vines.forEach(([vx, len]) => {
                    ctx.beginPath();
                    ctx.moveTo(px + vx, 0);
                    ctx.quadraticCurveTo(px + vx + 10, len * 0.5, px + vx - 4, len);
                    ctx.stroke();
                });
            });
        }
        // Canopy along the top edge
        for (let x = 0; x < W; x += 20 + rnd() * 30) {
            const r = 20 + rnd() * 30;
            const seed = Math.floor(rnd() * 1e6);
            hdWrap(W, off => hdCanopy(ctx, x + off, r * 0.3, r, opts.leaf[0], opts.leaf[1], hdRandom(seed)));
        }
        if (opts.haze) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = hdRgba(opts.haze, opts.hazeAlpha);
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
        }
    }, opts.blur);
}

// Sky world: a sea of cloud tops, or a closer bank of big billows
function hdCloudBankTexture(scene, key, opts) {
    const W = 1024, H = opts.h;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(opts.seed);
        for (let x = -20; x < W + 20; x += opts.step[0] + rnd() * (opts.step[1] - opts.step[0])) {
            const r = opts.r[0] + rnd() * (opts.r[1] - opts.r[0]);
            const y = opts.top + rnd() * opts.jitter + r * 0.6;
            hdWrap(W, off => {
                const g = ctx.createRadialGradient(x + off + r * 0.3, y - r * 0.4, 0, x + off, y, r);
                g.addColorStop(0, opts.lit);
                g.addColorStop(0.7, opts.mid);
                g.addColorStop(1, opts.shade);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x + off, y, r, 0, Math.PI * 2); ctx.fill();
            });
        }
        ctx.fillStyle = opts.mid;
        ctx.fillRect(0, opts.top + opts.r[1], W, H);
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, opts.top, 0, H);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, opts.depthTint);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
    }, opts.blur);
}

// Floating island prop for the sky world
function hdIslandTexture(scene, key) {
    return hdTexture(scene, key, 140, 120, (ctx) => {
        const rnd = hdRandom(313);
        const rock = ctx.createLinearGradient(0, 40, 0, 120);
        rock.addColorStop(0, '#9a8a78');
        rock.addColorStop(1, '#5a5060');
        ctx.fillStyle = rock;
        ctx.beginPath();
        ctx.moveTo(10, 46);
        ctx.lineTo(130, 46);
        ctx.quadraticCurveTo(110, 80, 80, 116);
        ctx.quadraticCurveTo(60, 90, 30, 80);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7fbf4d';
        ctx.beginPath(); ctx.ellipse(70, 46, 62, 7, 0, 0, Math.PI * 2); ctx.fill();
        hdTree(ctx, 50, 46, 34, 0x9ccb62, 0x3f7236, 0x6b4a2f, rnd);
        hdTree(ctx, 92, 46, 24, 0x9ccb62, 0x3f7236, 0x6b4a2f, rnd);
        // A thin waterfall off one edge
        const wf = ctx.createLinearGradient(0, 48, 0, 120);
        wf.addColorStop(0, 'rgba(220,240,255,0.85)');
        wf.addColorStop(1, 'rgba(220,240,255,0)');
        ctx.fillStyle = wf;
        ctx.fillRect(118, 48, 4, 72);
    }, 1.3);
}

// ========================
// Ground
// ========================
// The playable surface is at y=HD_GROUND_LIP in every ground texture;
// anything above it sits behind the player.
const HD_GROUND_LIP = 14;

function hdGroundTexture(scene, key, gp) {
    return hdTexture(scene, key, 512, 60, (ctx, W, H) => {
        const rnd = hdRandom(8101);
        const top = HD_GROUND_LIP;
        const body = ctx.createLinearGradient(0, top, 0, H);
        body.addColorStop(0, gp.body[0]);
        body.addColorStop(0.5, gp.body[1]);
        body.addColorStop(1, gp.body[2]);
        ctx.fillStyle = body;
        ctx.fillRect(0, top + 2, W, H - top);

        if (gp.style === 'sand') {
            // Sandstone strata beneath a sand layer
            gp.strata.forEach((c, i) => {
                ctx.fillStyle = hdHex(c);
                ctx.beginPath();
                ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 8) {
                    ctx.lineTo(x, top + 12 + i * 11 + Math.sin((x / W) * Math.PI * 2 * (2 + i) + i) * 2.5);
                }
                ctx.lineTo(W, H);
                ctx.closePath();
                ctx.fill();
            });
        } else if (gp.style === 'metal') {
            for (let x = 0; x < W; x += 64) {
                ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
                ctx.strokeRect(x + 0.5, top + 8, 63, H - top - 8);
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(x + 2, top + 10, 60, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                [[5, 13], [58, 13], [5, H - 5], [58, H - 5]].forEach(([rx, ry]) => {
                    ctx.beginPath(); ctx.arc(x + rx, ry, 1.5, 0, Math.PI * 2); ctx.fill();
                });
            }
        } else if (gp.style !== 'cloud') {
            // Strata lines, pebbles and roots in soil or rock
            for (let i = 0; i < 3; i++) {
                const y0 = top + 18 + i * 11;
                ctx.strokeStyle = 'rgba(20,12,6,0.35)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let x = 0; x <= W; x += 8) {
                    const y = y0 + Math.sin((x / W) * Math.PI * 2 * (2 + i) + i) * 2;
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        if (gp.pebbles) {
            for (let i = 0; i < 46; i++) {
                const x = rnd() * W;
                const y = top + 12 + rnd() * (H - top - 14);
                const rx = 1.5 + rnd() * 3.5;
                const ry = rx * (0.55 + rnd() * 0.3);
                hdWrap(W, off => {
                    ctx.fillStyle = hdHex(hdMix(gp.pebbles[0], gp.pebbles[1], rnd()));
                    ctx.beginPath();
                    ctx.ellipse(x + off, y, rx, ry, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,240,210,0.3)';
                    ctx.beginPath();
                    ctx.ellipse(x + off + rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.35, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        }
        if (gp.roots) {
            ctx.strokeStyle = gp.roots;
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
        }

        // Surface layer
        if (gp.style === 'grass') {
            const turf = ctx.createLinearGradient(0, top - 2, 0, top + 9);
            turf.addColorStop(0, gp.turf[0]);
            turf.addColorStop(1, gp.turf[1]);
            ctx.fillStyle = turf;
            ctx.beginPath();
            ctx.moveTo(0, top - 2);
            ctx.lineTo(W, top - 2);
            ctx.lineTo(W, top + 6);
            for (let x = W; x >= 0; x -= 6) {
                ctx.lineTo(x, top + 5 + Math.abs(Math.sin(x * 0.37) * Math.sin(x * 0.11)) * 6);
            }
            ctx.closePath();
            ctx.fill();
            for (let i = 0; i < 520; i++) {
                const x = rnd() * W;
                const bh = 4 + rnd() * (gp.bladeH || 10);
                const lean = (rnd() - 0.35) * 5;
                const base = hdMix(gp.blades[0], gp.blades[1], rnd());
                const tip = hdMix(base, gp.tip, 0.45);
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
            (gp.flowers || []).length && hdFlowers(ctx, W, top, gp.flowers, rnd);
        } else if (gp.style === 'sand') {
            const sand = ctx.createLinearGradient(0, top - 1, 0, top + 10);
            sand.addColorStop(0, gp.surface[0]);
            sand.addColorStop(1, gp.surface[1]);
            ctx.fillStyle = sand;
            ctx.beginPath();
            ctx.moveTo(0, top - 1);
            for (let x = 0; x <= W; x += 8) ctx.lineTo(x, top - 1 - Math.sin(x * 0.049) * 0.8);
            ctx.lineTo(W, top + 8);
            for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, top + 8 + Math.sin(x * 0.07) * 2);
            ctx.closePath();
            ctx.fill();
            // Wind ripples
            ctx.strokeStyle = 'rgba(120,70,30,0.2)';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 40; i++) {
                const x = rnd() * W, y = top + 1 + rnd() * 5;
                hdWrap(W, off => {
                    ctx.beginPath(); ctx.moveTo(x + off, y); ctx.quadraticCurveTo(x + off + 6, y - 1.2, x + off + 12, y); ctx.stroke();
                });
            }
            ctx.fillStyle = 'rgba(255,245,220,0.5)';
            ctx.fillRect(0, top - 1, W, 1);
        } else if (gp.style === 'rock') {
            ctx.fillStyle = gp.surface[0];
            ctx.beginPath();
            ctx.moveTo(0, top + 6);
            for (let x = 0; x <= W; x += 6) ctx.lineTo(x, top - 1 - Math.abs(Math.sin(x * 0.13) * Math.sin(x * 0.041)) * 3);
            ctx.lineTo(W, top + 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = gp.surface[1];
            ctx.fillRect(0, top - 1, W, 1);
            (gp.crystals || []).forEach(c => {
                for (let i = 0; i < 5; i++) {
                    const x = rnd() * W;
                    const size = 4 + rnd() * 4;
                    const seed = Math.floor(rnd() * 1e6);
                    hdWrap(W, off => hdCrystalCluster(ctx, x + off, top + 2, size, c, 1, hdRandom(seed)));
                }
            });
        } else if (gp.style === 'cobble') {
            // One row of rounded setts along the top edge
            for (let x = 0; x < W; x += 16) {
                const w = 14 + (x % 3);
                const jitter = Math.sin(x * 1.7) * 1.2;
                const g = ctx.createLinearGradient(0, top - 2, 0, top + 12);
                g.addColorStop(0, hdHex(hdMix(gp.stone[1], gp.stone[0], 0.9)));
                g.addColorStop(1, hdHex(gp.stone[1]));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(x + 1, top + 12);
                ctx.lineTo(x + 1, top + 1 + jitter);
                ctx.quadraticCurveTo(x + 1, top - 2 + jitter, x + 5, top - 2 + jitter);
                ctx.lineTo(x + w - 4, top - 2 + jitter);
                ctx.quadraticCurveTo(x + w, top - 2 + jitter, x + w, top + 1 + jitter);
                ctx.lineTo(x + w, top + 12);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = hdRgba(gp.edge, 0.55);
                ctx.fillRect(x + 4, top - 1 + jitter, w - 8, 1);
            }
        } else if (gp.style === 'metal') {
            const plate = ctx.createLinearGradient(0, top - 1, 0, top + 8);
            plate.addColorStop(0, gp.surface[0]);
            plate.addColorStop(1, gp.surface[1]);
            ctx.fillStyle = plate;
            ctx.fillRect(0, top - 1, W, 9);
            // Tread pattern
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            for (let x = 2; x < W; x += 8) {
                ctx.fillRect(x, top + 1, 4, 1);
                ctx.fillRect(x + 4, top + 4, 4, 1);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fillRect(0, top - 1, W, 1);
        } else if (gp.style === 'cloud') {
            hdCloudSurface(ctx, W, top, H);
        }
    });
}

function hdFlowers(ctx, W, top, colors, rnd) {
    for (let i = 0; i < 14; i++) {
        const x = rnd() * W;
        const y = top - 4 - rnd() * 6;
        const c = colors[Math.floor(rnd() * colors.length)];
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
}

// Fluffy top for cloud ground and cloud platforms: billows rise a few
// pixels above the standing line and the mass shades cool underneath.
function hdCloudSurface(ctx, W, top, H, left, right) {
    const x0 = left || 0, x1 = right || W;
    const body = ctx.createLinearGradient(0, top, 0, H);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.5, '#e8f0fa');
    body.addColorStop(1, '#b9c9e0');
    ctx.fillStyle = body;
    ctx.fillRect(x0, top + 2, x1 - x0, H - top - 2);
    for (let x = x0 + 4; x < x1 - 2; x += 9) {
        const r = 6 + Math.abs(Math.sin(x * 0.37)) * 4;
        const g = ctx.createRadialGradient(x + r * 0.3, top - r * 0.2, 0, x, top + r * 0.5, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.8, '#f4f8fd');
        g.addColorStop(1, '#dde7f4');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, top + r * 0.5, r, 0, Math.PI * 2); ctx.fill();
    }
}

// Short tufts drawn IN FRONT of the player, so feet sink into the grass.
// Kept under 12px so they never hide what the player is landing on.
function hdTuftTexture(scene, key, colors, variant) {
    return hdTexture(scene, key, 28, 14, (ctx, W, H) => {
        const rnd = hdRandom(300 + variant);
        for (let i = 0; i < 14; i++) {
            const x = 4 + rnd() * (W - 8);
            const bh = 5 + rnd() * 7;
            const lean = (rnd() - 0.4) * 5;
            ctx.fillStyle = hdHex(hdMix(colors[0], colors[1], rnd()));
            ctx.beginPath();
            ctx.moveTo(x - 1.2, H);
            ctx.quadraticCurveTo(x + lean * 0.4, H - bh * 0.6, x + lean, H - bh);
            ctx.quadraticCurveTo(x + lean * 0.4 + 0.6, H - bh * 0.5, x + 1.2, H);
            ctx.fill();
        }
    });
}

// ========================
// Platforms
// ========================
// The front face matches the physics rect exactly; only the receding top,
// overhangs and thin hanging details draw outside it.
const HD_PLAT_PAD_X = 8;
const HD_PLAT_PAD_TOP = 12;
const HD_PLAT_PAD_BOTTOM = 22;
const HD_PLAT_DEPTH = 6;

function hdPlatformTexture(scene, w, h, variant, pp, crumbling) {
    const key = `hd_plat_${pp.name}_${w}x${h}_${variant}${crumbling ? '_c' : ''}`;
    const W = w + HD_PLAT_PAD_X * 2;
    const H = h + HD_PLAT_PAD_TOP + HD_PLAT_PAD_BOTTOM;
    return hdTexture(scene, key, W, H, (ctx) => {
        const rnd = hdRandom(variant * 977 + w * 13 + h);
        const x0 = HD_PLAT_PAD_X;
        const y0 = HD_PLAT_PAD_TOP;
        const d = HD_PLAT_DEPTH;
        const style = pp.style;

        if (style === 'cloud') {
            hdCloudSurface(ctx, W, y0, y0 + h + 4, x0 - 2, x0 + w + 2);
            // Soft rounded underside
            ctx.fillStyle = '#c9d8ec';
            for (let x = x0 + 6; x < x0 + w - 4; x += 10) {
                ctx.beginPath(); ctx.arc(x, y0 + h - 2, 5 + Math.abs(Math.sin(x)) * 3, 0, Math.PI); ctx.fill();
            }
            if (crumbling) hdCrumbleMarks(ctx, x0, y0, w, h, rnd, 'rgba(120,140,170,0.6)');
            return;
        }

        // Hanging details beneath, drawn first so the block covers their tops
        if (pp.roots) {
            for (let i = 0; i < Math.max(2, w / 30); i++) {
                const rx = x0 + 6 + rnd() * Math.max(1, w - 12);
                const len = 6 + rnd() * 14;
                ctx.strokeStyle = pp.roots;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(rx, y0 + h - 2);
                ctx.bezierCurveTo(rx + 3, y0 + h + len * 0.3, rx - 3, y0 + h + len * 0.6, rx + 1, y0 + h + len);
                ctx.stroke();
            }
        }
        if (pp.vines) {
            for (let v = 0; v < Math.max(1, Math.floor(w / 70)); v++) {
                const vx = x0 + 8 + rnd() * Math.max(1, w - 16);
                const vlen = 10 + rnd() * 12;
                ctx.strokeStyle = pp.vines[0];
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(vx, y0 + h - 3);
                ctx.quadraticCurveTo(vx + 4, y0 + h + vlen * 0.5, vx, y0 + h + vlen);
                ctx.stroke();
                ctx.fillStyle = pp.vines[1];
                for (let l = 3; l < vlen; l += 4) {
                    ctx.beginPath();
                    ctx.ellipse(vx + (l % 8 ? 2 : -2), y0 + h + l, 2.2, 1.2, 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        if (pp.drips) {
            for (let i = 0; i < Math.max(2, w / 25); i++) {
                const sx = x0 + 5 + rnd() * Math.max(1, w - 10);
                const len = 4 + rnd() * 10;
                ctx.fillStyle = pp.drips;
                ctx.beginPath();
                ctx.moveTo(sx - 3, y0 + h - 1); ctx.lineTo(sx, y0 + h + len); ctx.lineTo(sx + 3, y0 + h - 1);
                ctx.fill();
            }
        }

        // Receding side face
        ctx.fillStyle = pp.side;
        ctx.beginPath();
        ctx.moveTo(x0 + w, y0);
        ctx.lineTo(x0 + w + d, y0 - d);
        ctx.lineTo(x0 + w + d, y0 + h - d - 2);
        ctx.lineTo(x0 + w, y0 + h);
        ctx.closePath();
        ctx.fill();

        // Front face
        const face = ctx.createLinearGradient(0, y0, 0, y0 + h);
        face.addColorStop(0, pp.face[0]);
        face.addColorStop(1, pp.face[1]);
        ctx.fillStyle = face;
        const round = style === 'girder' || style === 'masonry' ? 1 : 4;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + w, y0);
        ctx.lineTo(x0 + w, y0 + h - round);
        ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - round, y0 + h);
        ctx.lineTo(x0 + round, y0 + h);
        ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - round);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
        if (style === 'masonry') {
            // Offset courses of dressed stone
            const course = Math.min(10, h / 2);
            for (let row = 0, y = y0; y < y0 + h; row++, y += course) {
                const shift = row % 2 ? 12 : 0;
                for (let x = x0 - shift; x < x0 + w; x += 24) {
                    const tone = hdMix(pp.stone[0], pp.stone[1], rnd());
                    ctx.fillStyle = hdHex(tone);
                    ctx.fillRect(x + 1, y + 1, 22, course - 1.5);
                    ctx.fillStyle = 'rgba(255,255,255,0.12)';
                    ctx.fillRect(x + 1, y + 1, 22, 1);
                }
            }
        } else if (style === 'girder') {
            // I-beam: flanges top and bottom, lightening holes in the web
            ctx.fillStyle = pp.flange;
            ctx.fillRect(x0, y0, w, 4);
            ctx.fillRect(x0, y0 + h - 4, w, 4);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            if (h >= 14 && w >= 24) {
                for (let x = x0 + 12; x < x0 + w - 8; x += 18) {
                    ctx.beginPath(); ctx.arc(x, y0 + h / 2, Math.min(4, h / 4), 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            for (let x = x0 + 4; x < x0 + w - 2; x += 9) {
                ctx.fillRect(x, y0 + 1.5, 1.5, 1.5);
                ctx.fillRect(x, y0 + h - 3, 1.5, 1.5);
            }
            // Hazard stripes at both ends
            [x0, x0 + w - 10].forEach(sx => {
                ctx.save();
                ctx.beginPath(); ctx.rect(sx, y0 + 4, 10, h - 8); ctx.clip();
                ctx.fillStyle = '#1b1b1b'; ctx.fillRect(sx, y0 + 4, 10, h - 8);
                ctx.fillStyle = '#f0b429';
                for (let s = -h; s < h; s += 6) {
                    ctx.beginPath();
                    ctx.moveTo(sx, y0 + 4 + s); ctx.lineTo(sx + 10, y0 + 4 + s - 10);
                    ctx.lineTo(sx + 10, y0 + 7 + s - 10); ctx.lineTo(sx, y0 + 7 + s);
                    ctx.fill();
                }
                ctx.restore();
            });
        } else {
            // Stones set into soil / sandstone / rock
            if (pp.strata) {
                ctx.strokeStyle = pp.strata;
                ctx.lineWidth = 1;
                for (let y = y0 + 6; y < y0 + h; y += 5) {
                    ctx.beginPath();
                    ctx.moveTo(x0, y);
                    for (let x = x0; x <= x0 + w; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.2 + y) * 0.8);
                    ctx.stroke();
                }
            }
            for (let i = 0; i < w * h / 280; i++) {
                const sx = x0 + 4 + rnd() * (w - 8);
                const sy = y0 + 7 + rnd() * Math.max(1, h - 10);
                const r = 1.5 + rnd() * 2.5;
                ctx.fillStyle = hdHex(hdMix(pp.pebbles[0], pp.pebbles[1], rnd()));
                ctx.beginPath();
                ctx.ellipse(sx, sy, r, r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,240,210,0.3)';
                ctx.beginPath();
                ctx.ellipse(sx + r * 0.3, sy - r * 0.3, r * 0.45, r * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // Soft occlusion along the underside
        const ao = ctx.createLinearGradient(0, y0 + h - 6, 0, y0 + h);
        ao.addColorStop(0, 'rgba(10,6,4,0)');
        ao.addColorStop(1, 'rgba(10,6,4,0.4)');
        ctx.fillStyle = ao;
        ctx.fillRect(x0, y0 + h - 6, w, 6);
        if (crumbling) hdCrumbleMarks(ctx, x0, y0, w, h, rnd, 'rgba(15,8,4,0.85)');
        ctx.restore();

        // Top face, receding up-right
        const topG = ctx.createLinearGradient(0, y0 - d, 0, y0);
        topG.addColorStop(0, pp.top[0]);
        topG.addColorStop(1, pp.top[1]);
        ctx.fillStyle = topG;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + d, y0 - d);
        ctx.lineTo(x0 + w + d, y0 - d);
        ctx.lineTo(x0 + w, y0);
        ctx.closePath();
        ctx.fill();

        if (pp.turf) {
            // Turf band over the front face, with a ragged hanging edge
            const turf = ctx.createLinearGradient(0, y0, 0, y0 + 7);
            turf.addColorStop(0, pp.turf[0]);
            turf.addColorStop(1, pp.turf[1]);
            ctx.fillStyle = turf;
            ctx.beginPath();
            ctx.moveTo(x0 - 3, y0 - 0.5);
            ctx.lineTo(x0 + w + 2, y0 - 0.5);
            for (let x = x0 + w + 2; x >= x0 - 3; x -= 5) {
                ctx.lineTo(x, y0 + 4 + Math.abs(Math.sin(x * 0.53 + variant)) * 5);
            }
            ctx.closePath();
            ctx.fill();
        }
        // Light catching the standing edge
        ctx.fillStyle = pp.rim;
        ctx.fillRect(x0, y0 - 0.5, w, 1.2);

        if (pp.blades) {
            for (let i = 0; i < w / 2.5; i++) {
                const bx = x0 + rnd() * (w + d);
                const by = y0 - rnd() * d * 0.8;
                const bh = 2 + rnd() * 6;
                const lean = (rnd() - 0.35) * 4;
                ctx.fillStyle = hdHex(hdMix(pp.blades[0], pp.blades[1], rnd()));
                ctx.beginPath();
                ctx.moveTo(bx - 0.9, by + 1);
                ctx.quadraticCurveTo(bx + lean * 0.4, by - bh * 0.6, bx + lean, by - bh);
                ctx.lineTo(bx + 0.9, by + 1);
                ctx.fill();
            }
        }
        if (pp.crystals && w >= 40) {
            const n = Math.max(1, Math.floor(w / 70));
            for (let i = 0; i < n; i++) {
                const cx = x0 + 10 + rnd() * (w - 20);
                hdCrystalCluster(ctx, cx, y0 - 1, 5 + rnd() * 4, pp.crystals[i % pp.crystals.length], 1, rnd);
            }
        }
    });
}

function hdCrumbleMarks(ctx, x0, y0, w, h, rnd, color) {
    // Slightly darker, like the classic art's crumbling tell
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < Math.max(2, w / 25); i++) {
        let x = x0 + 4 + rnd() * (w - 8), y = y0 + 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < y0 + h - 1) {
            x += (rnd() - 0.5) * 7;
            y += 2 + rnd() * 4;
            ctx.lineTo(x, Math.min(y, y0 + h - 1));
        }
        ctx.stroke();
    }
    // Chipped corners read as "this one is fragile"
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + 6, y0 + h); ctx.lineTo(x0, y0 + h - 5); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x0 + w, y0 + h); ctx.lineTo(x0 + w - 7, y0 + h); ctx.lineTo(x0 + w, y0 + h - 6); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// Moving platform textures, sized to the platform so nothing stretches
function hdPlankTexture(scene, w, h, style) {
    const key = `hd_plank_${style}_${w}x${h}`;
    return hdTexture(scene, key, w, h, (ctx, W, H) => {
        const rnd = hdRandom(4242 + w);
        if (style === 'cloud') {
            hdCloudSurface(ctx, W, 5, H, 0, W);
            return;
        }
        if (style === 'metal') {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#9aa3ad'); g.addColorStop(0.5, '#6b737d'); g.addColorStop(1, '#3b4148');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0, 0, W, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            for (let x = 4; x < W - 2; x += 10) { ctx.fillRect(x, 3, 1.5, 1.5); ctx.fillRect(x, H - 4, 1.5, 1.5); }
            ctx.fillStyle = '#f0b429'; ctx.fillRect(0, H / 2 - 1.5, W, 3);
            ctx.fillStyle = '#1b1b1b';
            for (let x = 0; x < W; x += 8) ctx.fillRect(x, H / 2 - 1.5, 4, 3);
            return;
        }
        const boards = Math.max(2, Math.round(W / 40));
        const bw = W / boards;
        for (let b = 0; b < boards; b++) {
            const bx = b * bw;
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#b98a5a'); g.addColorStop(1, '#6e4a2c');
            ctx.fillStyle = g;
            ctx.fillRect(bx + 0.5, 0, bw - 1, H);
            ctx.strokeStyle = 'rgba(70,42,20,0.45)'; ctx.lineWidth = 0.8;
            for (let i = 0; i < 4; i++) {
                const gy = 4 + i * 4 + rnd() * 2;
                ctx.beginPath();
                ctx.moveTo(bx + 2, gy);
                ctx.bezierCurveTo(bx + bw * 0.35, gy + 1.5, bx + bw * 0.65, gy - 1.5, bx + bw - 2, gy);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(40,22,10,0.6)';
            ctx.fillRect(bx, 0, 1, H);
        }
        ctx.fillStyle = 'rgba(255,230,190,0.35)'; ctx.fillRect(0, 0, W, 1.5);
        [W * 0.15, W * 0.8].forEach(sx => {
            ctx.fillStyle = '#4a4d55'; ctx.fillRect(sx, 0, 5, H);
            ctx.fillStyle = '#8d929c'; ctx.fillRect(sx, 0, 1, H);
            ctx.fillStyle = '#23252b';
            ctx.fillRect(sx + 1.5, 4, 2, 2); ctx.fillRect(sx + 1.5, H - 6, 2, 2);
        });
    });
}

// ========================
// Framing layers
// ========================

// Blurred near-camera strip along the bottom edge: the depth-of-field layer
function hdForegroundTexture(scene, key, fg) {
    return hdTexture(scene, key, 1024, 46, (ctx, W, H) => {
        const rnd = hdRandom(9901);
        const dark = fg.colors[0], light = fg.colors[1];
        ctx.fillStyle = hdHex(dark);
        ctx.fillRect(0, H - 10, W, 10);
        if (fg.style === 'rocks' || fg.style === 'pipes') {
            for (let x = 0; x < W; x += 30 + rnd() * 60) {
                const s = 10 + rnd() * 26;
                hdWrap(W, off => {
                    if (fg.style === 'pipes') {
                        ctx.fillStyle = hdHex(hdMix(dark, light, rnd()));
                        ctx.fillRect(x + off, H - s, 14, s);
                        ctx.fillRect(x + off - 3, H - s, 20, 4);
                    } else {
                        hdRock(ctx, x + off, H, s, light, dark);
                    }
                });
            }
            return;
        }
        if (fg.style === 'clouds') {
            for (let x = 0; x < W; x += 20 + rnd() * 40) {
                const r = 14 + rnd() * 18;
                hdWrap(W, off => {
                    const g = ctx.createRadialGradient(x + off, H, 0, x + off, H, r);
                    g.addColorStop(0, 'rgba(255,255,255,0.95)');
                    g.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = g;
                    ctx.fillRect(x + off - r, H - r, r * 2, r);
                });
            }
            return;
        }
        for (let i = 0; i < 160; i++) {
            const x = rnd() * W;
            const bh = 12 + rnd() * 30;
            const lean = (rnd() - 0.5) * 14;
            const c = hdMix(dark, light, rnd());
            hdWrap(W, off => {
                if (fg.style === 'ferns' && i % 8 === 0) {
                    hdFrond(ctx, x + off, H, bh, -Math.PI / 2 + lean * 0.05, c, rnd);
                    return;
                }
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

// Out-of-focus elements hanging into the top of the frame
function hdOverhangTexture(scene, key, style) {
    return hdTexture(scene, key, 360, 110, (ctx) => {
        const rnd = hdRandom(1212);
        if (style === 'branch' || style === 'vines') {
            ctx.strokeStyle = style === 'vines' ? '#10200c' : '#2a1c10';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(-10, 8);
            ctx.quadraticCurveTo(160, 40, 350, 18);
            ctx.stroke();
            if (style === 'vines') {
                ctx.lineWidth = 2.5;
                for (let i = 0; i < 9; i++) {
                    const x = 20 + rnd() * 320, len = 50 + rnd() * 60;
                    ctx.beginPath(); ctx.moveTo(x, 20); ctx.quadraticCurveTo(x + 10, len * 0.6, x - 4, len); ctx.stroke();
                }
            }
            for (let i = 0; i < 70; i++) {
                const t = rnd();
                const x = t * 340;
                const y = 14 + Math.sin(t * Math.PI) * 26 + rnd() * (style === 'vines' ? 80 : 50);
                const r = 8 + rnd() * 12;
                ctx.fillStyle = hdHex(hdMix(0x0f200c, 0x2a5220, rnd()));
                ctx.beginPath();
                ctx.ellipse(x, y, r, r * 0.55, rnd() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (style === 'stalactites') {
            ctx.fillStyle = '#07090f';
            ctx.fillRect(0, 0, 360, 14);
            for (let x = 0; x < 360; x += 14 + rnd() * 30) {
                const len = 30 + rnd() * 70, w = 12 + rnd() * 16;
                ctx.beginPath(); ctx.moveTo(x - w / 2, 0); ctx.lineTo(x, len); ctx.lineTo(x + w / 2, 0); ctx.fill();
            }
        } else if (style === 'chains') {
            ctx.strokeStyle = '#0c0a10';
            for (let c = 0; c < 3; c++) {
                const cx = 40 + c * 120 + rnd() * 40;
                const len = 60 + rnd() * 40;
                ctx.lineWidth = 3;
                for (let y = -4; y < len; y += 10) {
                    ctx.beginPath();
                    if ((y / 10) % 2 === 0) ctx.ellipse(cx, y, 3.5, 6, 0, 0, Math.PI * 2);
                    else ctx.ellipse(cx, y, 1.2, 6, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.fillStyle = '#0c0a10';
                ctx.beginPath(); ctx.arc(cx, len + 6, 7, 0, Math.PI * 2); ctx.fill();
            }
        }
    }, 4);
}
