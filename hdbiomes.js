// ========================
// HD look — world recipes
// ========================
// One recipe per world. Each names its sky, parallax layers (far to near),
// animated props, ground and platform materials, framing layers, ambient
// effects and lighting. Painters live in hdscenery.js; hdlook.js assembles.
//
// title: shown when an endless run enters the world.
// coveredSky: the back wall fills the screen, so the sky is never drawn.
// Layer fields: tex (paints and returns a texture key), y/h (screen band),
// f (scroll factor), depth, alpha, low (dropped in low-FX mode), drift
// (px/s of slow sideways movement, e.g. mist).

function hdBiomeFor(level) {
    const t = level.theme || {};
    const lum = colorLuminance(t.skyColor ?? 0x1a1a2e);
    switch (t.biome) {
        case 'canyon': return lum > 90 ? 'canyon' : 'canyonNight';
        case 'cave': return 'cave';
        case 'castle': return lum > 90 ? 'fortress' : 'castleNight';
        case 'sky': return 'sky';
        case 'machine': return 'machine';
        case 'jungle': return 'jungle';
        default: return 'meadow';
    }
}

// Shared materials
const HD_EARTH = {
    name: 'earth', style: 'earth', side: '#4a3322', face: ['#8a6441', '#553824'],
    top: ['#a9d866', '#78b545'], turf: ['#86c24c', '#4a862b'], rim: 'rgba(230,255,170,0.7)',
    blades: [0x5c9a34, 0xc2e57f], pebbles: [0x6b6052, 0x9a8c78], roots: 'rgba(70,46,26,0.9)',
    vines: ['#3f7a2a', '#5fa33b']
};

const HD_BIOMES = {
    // ---- Level 1: late-afternoon meadow under snowy peaks ----
    meadow: {
        title: 'Green Meadows',
        sky: {
            stops: [[0, '#3a78c2'], [0.35, '#74b0e3'], [0.62, '#c3dcea'], [0.78, '#f3dfb4'], [1, '#eed3a0']],
            sun: { x: 640, y: 92, glow: '255,232,176' }
        },
        clouds: { pal: 'day', per: 560, y: [40, 190] },
        rays: { color: 0xfff0c8 },
        layers: [
            { tex: s => hdMountainTexture(s, 'hd_meadow_mtn_far', { seed: 11, height: 300, base: 250, amp: 190, snowLine: 150, lit: 0xbccade, shade: 0x7486aa, haze: 0xeee2c6, hazeAlpha: 0.55 }), y: 180, h: 300, f: 0.05, depth: -35 },
            { tex: s => hdMountainTexture(s, 'hd_meadow_mtn_mid', { seed: 23, height: 260, base: 200, amp: 120, lit: 0x94b596, shade: 0x547379, haze: 0xe4e1c8, hazeAlpha: 0.4 }), y: 280, h: 260, f: 0.1, depth: -33, low: true },
            { tex: s => hdMistTexture(s, 'hd_mist_warm', '255,250,238'), y: 405, h: 120, f: 0.13, depth: -32, alpha: 0.5, low: true, drift: 6 },
            { tex: s => hdHillsTexture(s, 'hd_meadow_forest', { seed: 77, h: 200, base: 120, amp: 60, lit: 0x86a869, shade: 0x5d8156, deep: 0x5b7f58, blur: 1.4, haze: 0xd6decf, hazeAlpha: [0.35, 0.15], deco: [{ type: 'canopy', spacing: [5, 12], size: [6, 15], lit: 0x7a9d62, shade: 0x4a6e4a, sink: 5 }] }), y: 360, h: 200, f: 0.2, depth: -30 },
            { tex: s => hdHillsTexture(s, 'hd_meadow_hills', { seed: 131, h: 240, base: 170, amp: 70, lit: 0x8fc158, shade: 0x5c9140, deep: 0x4f8338, deco: [
                { type: 'trees', spacing: [90, 250], size: [34, 64], lit: 0x9ccb62, shade: 0x3f7236, trunk: 0x6b4a2f, sink: 6 },
                { type: 'bushes', spacing: [40, 110], size: [5, 11], lit: 0x93c35c, shade: 0x467a37, sink: 2 },
                { type: 'specks', spacing: [2, 6], size: [1, 1], colors: [0xfff4d0, 0xffd34d, 0xf29bc6, 0xb9a6ff] }] }), y: 350, h: 240, f: 0.35, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_meadow_bushes', { seed: 0, bushes: true, lit: 0x6ea648, shade: 0x2f5a27 }), y: 462, h: 110, f: 0.6, depth: -20, low: true }
        ],
        ground: {
            style: 'grass', body: ['#7d5733', '#5f4027', '#3e2918'], turf: ['#9bd156', '#4d8a2c'],
            blades: [0x3f7a26, 0x8cc84e], tip: 0xe6f2a0, pebbles: [0x6f6456, 0xa39684],
            roots: 'rgba(52,34,18,0.55)', flowers: [0xffffff, 0xffe066, 0xf6a5d0]
        },
        platform: HD_EARTH,
        plank: 'wood',
        tufts: [0x4a8a2c, 0xa6d964],
        foreground: { style: 'grass', colors: [0x14260f, 0x2f5423] },
        overhang: 'branch',
        fx: {
            motes: { color: 0xfff2c0, count: 26, add: true },
            leaves: [0x9cc45a, 0xd9b44a, 0xc7783a],
            butterflies: [0xffa24a, 0xfff6e0, 0x8fb8ff],
            birds: 0x3c4658
        }
    },

    // ---- Level 2: sunlit desert canyon ----
    canyon: {
        title: 'Coin Canyon',
        sky: {
            stops: [[0, '#4f7fbf'], [0.4, '#8fb5d8'], [0.68, '#efcfa4'], [1, '#f2b27c']],
            sun: { x: 600, y: 130, r: 40, glow: '255,214,150', haloAlpha: 0.7 }
        },
        clouds: { pal: 'warm', per: 700, y: [40, 160], stretch: [1.6, 0.55] },
        rays: { color: 0xffd9a0 },
        layers: [
            { tex: s => hdMountainTexture(s, 'hd_canyon_far', { profile: 'mesa', seed: 5, height: 260, base: 230, amp: 150, lit: 0xe0ae96, shade: 0xa87888, haze: 0xf1d0ae, hazeAlpha: 0.6, spread: 0.1, strata: 0.04 }), y: 220, h: 260, f: 0.05, depth: -35 },
            { tex: s => hdMountainTexture(s, 'hd_canyon_mid', { profile: 'mesa', seed: 9, height: 240, base: 220, amp: 140, lit: 0xe39158, shade: 0x93462f, haze: 0xefc394, hazeAlpha: 0.35, spread: 0.12, strata: 0.08 }), y: 300, h: 240, f: 0.12, depth: -33 },
            { tex: s => hdMistTexture(s, 'hd_mist_dust', '240,200,150'), y: 410, h: 120, f: 0.15, depth: -31, alpha: 0.45, low: true, drift: 12 },
            { tex: s => hdHillsTexture(s, 'hd_canyon_dunes', { seed: 41, h: 220, base: 150, amp: 50, lit: 0xf0c27f, shade: 0xc98d52, deep: 0xb77a45, deco: [
                { type: 'rocks', spacing: [60, 160], size: [6, 16], lit: 0xc88f63, shade: 0x7a4a33, sink: 4 },
                { type: 'cacti', spacing: [120, 260], size: [22, 40], lit: 0x8fb05a, shade: 0x3f5a2a, sink: 5 }] }), y: 380, h: 220, f: 0.3, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_canyon_scrub', { seed: 3, blades: 220, bladeH: 18, lit: 0xc8b070, shade: 0x7a6a3a }), y: 470, h: 110, f: 0.6, depth: -20, low: true }
        ],
        ground: {
            style: 'sand', body: ['#c88a52', '#a86a3e', '#7a4a2a'], surface: ['#f2d69c', '#ddb06e'],
            strata: [0xd49a5c, 0xc07d45, 0xa8653a], pebbles: [0x9a7050, 0xcca070]
        },
        platform: {
            name: 'sandstone', style: 'sandstone', side: '#8a5232', face: ['#d69a62', '#a8683c'],
            top: ['#f2d69c', '#e0b777'], rim: 'rgba(255,240,200,0.8)', strata: 'rgba(120,60,30,0.35)',
            pebbles: [0x9a6a48, 0xd8a878]
        },
        plank: 'wood',
        tufts: [0x9a8a4a, 0xd8c078],
        foreground: { style: 'rocks', colors: [0x2a160c, 0x5a341e] },
        overhang: null,
        fx: {
            dust: { color: 0xf5d8a8, count: 24 },
            birds: 0x3a2a24
        }
    },

    // ---- Level 9: the canyon at night, under an aurora ----
    canyonNight: {
        title: 'Moonlit Canyon',
        sky: {
            stops: [[0, '#02040a'], [0.45, '#081424'], [0.75, '#0f2a2c'], [1, '#173a30']],
            stars: 220,
            moon: { x: 640, y: 100, r: 24, glow: '180,220,255', halo: 220, haloAlpha: 0.35 },
            aurora: [{ y: 50, len: 190, rgb: '80,255,170', alpha: 0.22 }, { y: 100, len: 150, rgb: '90,200,255', alpha: 0.14 }]
        },
        clouds: null,
        rays: null,
        layers: [
            { tex: s => hdMountainTexture(s, 'hd_night_mesa_far', { profile: 'mesa', seed: 5, height: 260, base: 230, amp: 150, lit: 0x3a4866, shade: 0x161c30, haze: 0x14302c, hazeAlpha: 0.55, spread: 0.1, strata: 0.03, lightDir: -1 }), y: 220, h: 260, f: 0.05, depth: -35 },
            { tex: s => hdMountainTexture(s, 'hd_night_mesa_mid', { profile: 'mesa', seed: 9, height: 240, base: 220, amp: 140, lit: 0x323a58, shade: 0x0f1222, haze: 0x10221f, hazeAlpha: 0.3, spread: 0.12, strata: 0.05, lightDir: -1, rim: 0x6a88a8 }), y: 300, h: 240, f: 0.12, depth: -33 },
            { tex: s => hdHillsTexture(s, 'hd_night_dunes', { seed: 41, h: 220, base: 150, amp: 50, lit: 0x3a3c52, shade: 0x1c1d2a, deep: 0x15161f, lightDir: -1, deco: [
                { type: 'rocks', spacing: [60, 160], size: [6, 16], lit: 0x2e3040, shade: 0x101118, sink: 4 },
                { type: 'cacti', spacing: [120, 260], size: [22, 40], lit: 0x2c3a2e, shade: 0x0f1610, sink: 5 }] }), y: 380, h: 220, f: 0.3, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_night_scrub', { seed: 3, blades: 200, bladeH: 18, lit: 0x3a3f4a, shade: 0x15171c }), y: 470, h: 110, f: 0.6, depth: -20, low: true }
        ],
        ground: {
            style: 'sand', body: ['#3a3648', '#2a2636', '#18151f'], surface: ['#7a7890', '#56546a'],
            strata: [0x4a4660, 0x3e3a52, 0x322e44], pebbles: [0x3a3848, 0x6a6878]
        },
        platform: {
            name: 'sandstone_night', style: 'sandstone', side: '#1e1c2a', face: ['#4a4862', '#2c2a3c'],
            top: ['#8a88a0', '#626078'], rim: 'rgba(170,200,255,0.6)', strata: 'rgba(0,0,0,0.3)',
            pebbles: [0x3a3848, 0x6a6878]
        },
        plank: 'wood',
        tufts: [0x2c3230, 0x5a6a60],
        foreground: { style: 'rocks', colors: [0x05060a, 0x14161e] },
        overhang: null,
        fx: {
            motes: { color: 0x9fffd0, count: 18, add: true },
            shootingStars: true
        },
        light: { darkness: 0.35 }
    },

    // ---- Level 3: crystal cave ----
    cave: {
        title: 'Crystal Caves',
        sky: { stops: [[0, '#04060b'], [0.5, '#0a1020'], [1, '#10182a']], darkTop: true },
        coveredSky: true,
        clouds: null,
        rays: null,
        layers: [
            { tex: s => hdCaveWallTexture(s, 'hd_cave_wall', { h: 600, seed: 3, dark: 0x080c16, light: 0x1c2a40, crystals: [0x5ff0ff, 0xd070ff] }), y: 0, h: 600, f: 0.06, depth: -38 },
            { tex: s => hdSpikeBandTexture(s, 'hd_cave_stal_far', { h: 200, seed: 5, dir: 'down', color: 0x0c1220, lit: 0x2a3a58, rim: 24, len: [40, 150], blur: 1.5 }), y: 0, h: 200, f: 0.15, depth: -34, low: true },
            { tex: s => hdSpikeBandTexture(s, 'hd_cave_mite_far', { h: 220, seed: 6, dir: 'up', color: 0x0e1424, lit: 0x2a3a58, rim: 40, len: [40, 160], crystals: [0x5ff0ff], blur: 1.5 }), y: 380, h: 220, f: 0.18, depth: -32 },
            { tex: s => hdMistTexture(s, 'hd_mist_cave', '120,160,255'), y: 420, h: 120, f: 0.2, depth: -31, alpha: 0.25, low: true, drift: 4 },
            { tex: s => hdSpikeBandTexture(s, 'hd_cave_mite_near', { h: 200, seed: 9, dir: 'up', color: 0x070a12, lit: 0x1c2436, rim: 50, len: [30, 120], crystals: [0xd070ff, 0x5ff0ff] }), y: 400, h: 200, f: 0.45, depth: -24 },
            { tex: s => hdSpikeBandTexture(s, 'hd_cave_stal_near', { h: 170, seed: 12, dir: 'down', color: 0x06080f, lit: 0x161e2e, rim: 30, len: [30, 130], crystals: [0x5ff0ff] }), y: 0, h: 170, f: 0.5, depth: -22, low: true }
        ],
        props: [
            { kind: 'glow', f: 0.18, y: [400, 560], spacing: [180, 380], scale: [0.8, 1.6], tint: [0x5ff0ff, 0xd070ff], alpha: 0.35, anim: 'pulse', depth: 66 }
        ],
        ground: {
            style: 'rock', body: ['#1a2030', '#11151f', '#080a10'], surface: ['#2a3246', '#56688a'],
            crystals: [0x5ff0ff, 0xd070ff], pebbles: [0x2a3040, 0x4a5468]
        },
        platform: {
            name: 'rock', style: 'rock', side: '#0e121c', face: ['#3a4458', '#1c2230'],
            top: ['#56688a', '#3a4660'], rim: 'rgba(150,220,255,0.6)', pebbles: [0x2a3040, 0x5a6680],
            crystals: [0x5ff0ff, 0xd070ff], drips: '#1c2230'
        },
        plank: 'wood',
        tufts: null,
        foreground: { style: 'rocks', colors: [0x020306, 0x0c1018] },
        overhang: 'stalactites',
        fx: {
            motes: { color: 0x7ff8ff, count: 30, add: true },
            drips: true,
            bats: true
        },
        light: { darkness: 0.5 }
    },

    // ---- Level 4: fortress at sunset ----
    fortress: {
        title: 'Sunset Fortress',
        sky: {
            stops: [[0, '#1f1236'], [0.3, '#5c2148'], [0.55, '#c9472e'], [0.75, '#f28a38'], [1, '#ffcf70']],
            sun: { x: 560, y: 360, r: 56, glow: '255,190,110', core: '255,236,190', halo: 340, haloAlpha: 0.75 }
        },
        clouds: { pal: 'sunset', per: 600, y: [50, 200], stretch: [1.8, 0.5] },
        rays: null,
        layers: [
            { tex: s => hdMountainTexture(s, 'hd_fort_mtn', { seed: 31, height: 280, base: 250, amp: 170, lit: 0x8a3a4a, shade: 0x4a1c3a, haze: 0xe0703a, hazeAlpha: 0.55, rim: 0xffb070, lightDir: -1 }), y: 200, h: 280, f: 0.05, depth: -35 },
            { tex: s => hdCastleTexture(s, 'hd_fort_castle', { h: 300, seed: 7, color: 0x2a0f1c, windowColor: 0xffb040, lit: 0.5, wallH: 70, spacing: [120, 260], towerH: [120, 240], rim: 0x9a3a2a, flag: 0x8a1a1a, blur: 1.2 }), y: 250, h: 300, f: 0.1, depth: -33 },
            { tex: s => hdHillsTexture(s, 'hd_fort_hills', { seed: 55, h: 220, base: 140, amp: 60, lit: 0x6a3024, shade: 0x3a1a18, deep: 0x2a1210, lightDir: -1, deco: [
                { type: 'deadtrees', spacing: [140, 300], size: [40, 70], color: 0x1e0c0c, sink: 4 },
                { type: 'rocks', spacing: [60, 150], size: [6, 14], lit: 0x5a2a20, shade: 0x2a1210, sink: 4 }] }), y: 380, h: 220, f: 0.3, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_fort_scrub', { seed: 5, blades: 200, bladeH: 20, lit: 0x6a3a24, shade: 0x2a140c }), y: 470, h: 110, f: 0.6, depth: -20, low: true }
        ],
        ground: {
            style: 'cobble', body: ['#4a2c1c', '#36200f', '#221308'], stone: [0x9a7a64, 0x5a4034],
            edge: 0xffb070, pebbles: [0x5a4030, 0x8a6a50]
        },
        platform: {
            name: 'masonry_warm', style: 'masonry', side: '#3a2418', face: ['#7a5a48', '#4a3226'],
            top: ['#b08a6a', '#8a6a50'], rim: 'rgba(255,190,120,0.8)', stone: [0x8a6a54, 0x6a4c3a]
        },
        plank: 'wood',
        tufts: [0x5a3a1a, 0x9a6a3a],
        foreground: { style: 'rocks', colors: [0x120606, 0x2a1210] },
        overhang: 'chains',
        fx: {
            embers: true,
            motes: { color: 0x3a2a2a, count: 14, add: false },
            birds: 0x1a0c0c
        }
    },

    // ---- Levels 5 and 10: moonlit castle ----
    castleNight: {
        title: 'Moonlit Castle',
        sky: {
            stops: [[0, '#04020b'], [0.45, '#120828'], [0.75, '#26124a'], [1, '#3a1c5e']],
            stars: 200,
            moon: { x: 620, y: 110, r: 34, glow: '200,190,255', halo: 260, haloAlpha: 0.4 }
        },
        clouds: { pal: 'night', per: 700, y: [60, 200], stretch: [1.6, 0.55] },
        rays: null,
        layers: [
            { tex: s => hdMountainTexture(s, 'hd_castle_mtn', { seed: 44, height: 280, base: 250, amp: 160, lit: 0x3a2e66, shade: 0x160f30, haze: 0x2a1650, hazeAlpha: 0.5, rim: 0x8a80d0 }), y: 200, h: 280, f: 0.05, depth: -35 },
            { tex: s => hdCastleTexture(s, 'hd_castle_far', { h: 320, seed: 17, color: 0x120a24, windowColor: 0xffd070, lit: 0.45, wallH: 80, spacing: [110, 240], towerH: [140, 280], rim: 0x4a3a80, flag: 0x5a1a6a, blur: 1.2 }), y: 230, h: 320, f: 0.1, depth: -33 },
            { tex: s => hdMistTexture(s, 'hd_mist_purple', '150,120,220'), y: 420, h: 120, f: 0.15, depth: -31, alpha: 0.35, low: true, drift: 5 },
            { tex: s => hdCastleTexture(s, 'hd_castle_near', { h: 200, seed: 23, color: 0x0a0616, windowColor: 0xffb050, lit: 0.6, wallH: 110, spacing: [220, 420], towerH: [150, 190], rim: 0x3a2a60 }), y: 380, h: 200, f: 0.35, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_castle_scrub', { seed: 7, blades: 160, bladeH: 16, lit: 0x2a2440, shade: 0x0c0a14 }), y: 470, h: 110, f: 0.6, depth: -20, low: true }
        ],
        props: [
            { kind: 'torch', f: 0.35, y: [478, 478], spacing: [200, 320], depth: -25 }
        ],
        ground: {
            style: 'cobble', body: ['#1c1628', '#130f1c', '#0a0810'], stone: [0x5a5070, 0x2e2840],
            edge: 0xc0b0ff, pebbles: [0x2a2438, 0x4a4260]
        },
        platform: {
            name: 'masonry_cold', style: 'masonry', side: '#1c1628', face: ['#4e4466', '#2e2840'],
            top: ['#7a70a0', '#5a5078'], rim: 'rgba(200,190,255,0.7)', stone: [0x4a4062, 0x3a3252]
        },
        plank: 'wood',
        tufts: [0x2a2a3a, 0x4a4a60],
        foreground: { style: 'rocks', colors: [0x040308, 0x100c1a] },
        overhang: 'chains',
        fx: {
            motes: { color: 0xc090ff, count: 18, add: true },
            bats: true
        },
        light: { darkness: 0.42 }
    },

    // ---- Level 6: above the clouds ----
    sky: {
        title: 'Bouncy Clouds',
        sky: {
            stops: [[0, '#2c6ccf'], [0.45, '#7db5ee'], [0.8, '#d4ebfb'], [1, '#f0f8ff']],
            sun: { x: 660, y: 90, glow: '255,244,220' }
        },
        clouds: { pal: 'day', per: 420, y: [30, 220] },
        rays: { color: 0xffffff },
        layers: [
            { tex: s => hdCloudBankTexture(s, 'hd_sky_sea_far', { h: 220, seed: 1, top: 20, jitter: 20, r: [20, 40], step: [14, 30], lit: '#ffffff', mid: '#e6effa', shade: '#c6d6ec', depthTint: 'rgba(170,195,230,0.6)', blur: 1.6 }), y: 400, h: 220, f: 0.04, depth: -35 },
            { tex: s => hdCloudBankTexture(s, 'hd_sky_bank_mid', { h: 200, seed: 2, top: 30, jitter: 30, r: [30, 55], step: [30, 60], lit: '#ffffff', mid: '#eef4fc', shade: '#cddbee', depthTint: 'rgba(180,200,235,0.45)', blur: 1.3 }), y: 430, h: 200, f: 0.15, depth: -30 },
            { tex: s => hdCloudBankTexture(s, 'hd_sky_bank_near', { h: 160, seed: 3, top: 20, jitter: 24, r: [36, 60], step: [40, 80], lit: '#ffffff', mid: '#f2f7fd', shade: '#d4e1f2', depthTint: 'rgba(190,210,240,0.35)' }), y: 480, h: 160, f: 0.35, depth: -26 }
        ],
        props: [
            { kind: 'island', f: 0.08, y: [230, 340], spacing: [420, 700], scale: [0.5, 0.9], depth: -34, alpha: 0.9, anim: 'bob' }
        ],
        ground: { style: 'cloud', body: ['#ffffff', '#e8f0fa', '#b9c9e0'] },
        platform: { name: 'cloud', style: 'cloud' },
        plank: 'cloud',
        tufts: null,
        foreground: { style: 'clouds', colors: [0xffffff, 0xffffff] },
        overhang: null,
        fx: {
            snow: true,
            motes: { color: 0xffffff, count: 14, add: true },
            birds: 0x5a6a88
        }
    },

    // ---- Level 7: inside the machine ----
    machine: {
        title: 'The Machine',
        sky: { stops: [[0, '#0b0f15'], [0.6, '#18202b'], [1, '#222c38']], darkTop: true },
        coveredSky: true,
        clouds: null,
        rays: null,
        layers: [
            { tex: s => hdFactoryWallTexture(s, 'hd_factory_wall', { seed: 4, panel: 0x2a3440, pipe: 0x5a4a3a, window: 0x7fb0d0 }), y: 0, h: 600, f: 0.06, depth: -38 },
            { tex: s => hdMachineryTexture(s, 'hd_factory_mid', { h: 340, seed: 8, color: 0x151b24, edge: 0x3a4a5a, trussY: 40, minH: 140, blur: 1.3 }), y: 260, h: 340, f: 0.2, depth: -32, low: true },
            { tex: s => hdMachineryTexture(s, 'hd_factory_near', { h: 220, seed: 15, color: 0x0a0e14, edge: 0x2a3440, trussY: 10, minH: 80 }), y: 380, h: 220, f: 0.45, depth: -24 }
        ],
        props: [
            { kind: 'gear', radius: 70, color: 0x1a222c, f: 0.12, y: [150, 420], spacing: [260, 420], depth: -35 },
            { kind: 'gear', radius: 40, color: 0x10161d, f: 0.3, y: [330, 470], spacing: [300, 500], depth: -28 },
            { kind: 'glow', f: 0.2, y: [280, 420], spacing: [240, 400], scale: [0.35, 0.45], tint: [0xff3020], alpha: 0.9, anim: 'blink', depth: 66 }
        ],
        ground: {
            style: 'metal', body: ['#3a434e', '#2a3139', '#1a1f25'], surface: ['#8a949f', '#5a636d']
        },
        platform: {
            name: 'girder', style: 'girder', side: '#2a3038', face: ['#6a737e', '#434a54'],
            top: ['#9aa3ad', '#7a838d'], rim: 'rgba(220,235,255,0.7)', flange: '#7d8691'
        },
        plank: 'metal',
        tufts: null,
        foreground: { style: 'pipes', colors: [0x06080b, 0x1a2028] },
        overhang: 'chains',
        fx: {
            sparks: true,
            motes: { color: 0xb0b8c0, count: 12, add: false }
        },
        light: { darkness: 0.35 }
    },

    // ---- Level 8: deep jungle ----
    jungle: {
        title: 'Emerald Jungle',
        sky: { stops: [[0, '#0a2012'], [0.4, '#1c4426'], [0.75, '#4f8a48'], [1, '#86b060']] },
        clouds: null,
        rays: { color: 0xe8ffb0, fromTop: true },
        layers: [
            { tex: s => hdJungleTrunksTexture(s, 'hd_jungle_far', { seed: 2, spacing: [70, 140], width: [14, 26], color: 0x3e6a44, lit: 0x7aa870, vine: 0x3a6a3a, leaf: [0x4f8a4f, 0x2a5a30], haze: 0x9ac48a, hazeAlpha: 0.45, blur: 1.6 }), y: 0, h: 600, f: 0.06, depth: -36 },
            { tex: s => hdMistTexture(s, 'hd_mist_green', '200,240,190'), y: 380, h: 120, f: 0.1, depth: -34, alpha: 0.45, low: true, drift: 5 },
            { tex: s => hdJungleTrunksTexture(s, 'hd_jungle_mid', { seed: 5, spacing: [140, 260], width: [24, 44], color: 0x2a4a2c, lit: 0x5a8a50, vine: 0x2a5a2a, leaf: [0x3a7a3a, 0x1a4a22], haze: 0x6a9a60, hazeAlpha: 0.2, blur: 1.2 }), y: 0, h: 600, f: 0.18, depth: -32, low: true },
            { tex: s => hdHillsTexture(s, 'hd_jungle_ferns', { seed: 88, h: 220, base: 170, amp: 40, lit: 0x3a7a34, shade: 0x1c4a20, deep: 0x143818, deco: [
                { type: 'ferns', spacing: [30, 70], size: [22, 42], color: 0x2f6a2c, sink: 6 },
                { type: 'bushes', spacing: [50, 120], size: [10, 18], lit: 0x4a8a3a, shade: 0x1a4a1c, sink: 0 }] }), y: 380, h: 220, f: 0.35, depth: -26 },
            { tex: s => hdBushLineTexture(s, 'hd_jungle_under', { seed: 9, bushes: true, lit: 0x3a7a30, shade: 0x0f3314, blades: 300, bladeH: 30 }), y: 470, h: 110, f: 0.6, depth: -20, low: true }
        ],
        ground: {
            style: 'grass', body: ['#3e2a1c', '#2c1d14', '#1a110b'], turf: ['#4f8f3a', '#24502a'],
            blades: [0x1d4a22, 0x5aa040], tip: 0xb0e070, bladeH: 14, pebbles: [0x3a3228, 0x5a5040],
            roots: 'rgba(30,18,8,0.6)', flowers: [0xff7aa8, 0xffa040]
        },
        platform: {
            name: 'mossy', style: 'earth', side: '#2a1c12', face: ['#5a4030', '#33241a'],
            top: ['#6aa84a', '#3f7a30'], turf: ['#4f9a3a', '#2a5a24'], rim: 'rgba(200,255,150,0.6)',
            blades: [0x2a6a2a, 0x8ad060], pebbles: [0x4a4a3a, 0x6a6a58], roots: 'rgba(40,26,14,0.9)',
            vines: ['#2a6a2a', '#4a9a3a']
        },
        plank: 'wood',
        tufts: [0x1f5a22, 0x6aaa44],
        foreground: { style: 'ferns', colors: [0x061408, 0x14301a] },
        overhang: 'vines',
        fx: {
            motes: { color: 0xd8ff70, count: 22, add: true },
            leaves: [0x6aa04a, 0x3a7a2a, 0xa0c050],
            butterflies: [0x4aa0ff, 0xff8a3a]
        },
        light: { darkness: 0.2 }
    }
};
