// ========================
// Campaign — six worlds of four levels
// ========================
// Owns the order of the adventure, the world map graph, and the per-level
// extras that belong to the campaign rather than to one mechanic: pits,
// tall levels, the three hidden gems and secret exits.
//
// Level data used here:
//   pits        [{x, width}]   gaps in the ground; falling in costs a heart
//   worldTop    number         negative: the level extends this far upward
//   gems        [{x, y}]       three per level
//   secretExit  {x, y}         a hidden second goal that opens a map shortcut

const WORLDS = [
    { name: 'Green Meadows', color: 0x4caf50 },
    { name: 'Coin Canyon', color: 0xe08a3c },
    { name: 'Crystal Caves', color: 0x4fd0e0 },
    { name: 'Sunset Fortress', color: 0xc0504a },
    { name: 'Wild Heights', color: 0x8fc9ff },
    { name: 'The Tower', color: 0x9a8cff }
];

// Campaign order. The ten original levels keep their place as the opening
// (or closing) act of the world that matches them.
const CAMPAIGN_LEVELS = [
    level1, level_w1_2, level_w1_3, level_w1_4,
    level2, level_w2_2, level_w2_3, level_w2_4,
    level3, level_w3_2, level_w3_3, level_w3_4,
    level4, level_w4_2, level_w4_3, level5,
    level6, level8, level_w5_3, level_w5_4,
    level7, level9, level_w6_3, level10
];

// Where each original level sits now (old index -> campaign index)
const CAMPAIGN_OLD_INDEX = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 15, 5: 16, 6: 20, 7: 17, 8: 21, 9: 23 };

// Secret exits: finishing `from` by its hidden goal opens a path to `to`
const SECRET_PATHS = [
    { from: 1, to: 3 },
    { from: 5, to: 8 },
    { from: 13, to: 16 },
    { from: 18, to: 21 }
];

const GEM_SCORE = 500;

(function nameCampaignLevels() {
    CAMPAIGN_LEVELS.forEach((lvl, i) => {
        const short = lvl.name.replace(/^Level\s+\d+\s*[-–]\s*/i, '');
        lvl.name = 'Level ' + (i + 1) + ' - ' + short;
    });
})();

// One-time move of saves made when the game had ten levels
(function migrateOldSaves() {
    if (localStorage.getItem('jqCampaign') === '2') return;
    const remapKey = k => {
        const m = /^level(\d+)$/.exec(k);
        return m && CAMPAIGN_OLD_INDEX[m[1]] !== undefined ? 'level' + CAMPAIGN_OLD_INDEX[m[1]] : k;
    };
    ['jqCompleted', 'jqStars', 'jqHighScores', 'jqBestTimes', 'jqBestDeaths', 'jqLeaderboard',
        'jqStoryShown', 'jqHardcoreComplete', 'jqSpeedrunRecords'].forEach(store => {
        try {
            const data = JSON.parse(localStorage.getItem(store));
            if (!data || typeof data !== 'object' || Array.isArray(data)) return;
            const out = {};
            Object.keys(data).forEach(k => { out[remapKey(k)] = data[k]; });
            localStorage.setItem(store, JSON.stringify(out));
        } catch (e) { /* unreadable store: leave it alone */ }
    });
    const ghosts = {};
    for (let i = 0; i < 10; i++) {
        const g = localStorage.getItem('jqGhost_level' + i);
        if (g) ghosts[CAMPAIGN_OLD_INDEX[i]] = g;
        localStorage.removeItem('jqGhost_level' + i);
    }
    Object.keys(ghosts).forEach(i => localStorage.setItem('jqGhost_level' + i, ghosts[i]));
    localStorage.setItem('jqCampaign', '2');
})();

let gemData = JSON.parse(localStorage.getItem('jqGems') || '{}');
let secretData = JSON.parse(localStorage.getItem('jqSecrets') || '{}');

function levelWorld(index) { return Math.floor(index / 4); }
function levelLabel(index) { return (levelWorld(index) + 1) + '-' + (index % 4 + 1); }

function getLevelGems(index) {
    return gemData['level' + index] || [false, false, false];
}

function getTotalGems() {
    let n = 0;
    for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) n += getLevelGems(i).filter(Boolean).length;
    return n;
}

function isSecretFound(index) { return !!secretData['level' + index]; }

// A level opens once the one before it is beaten, or a secret path reaches it
function isLevelUnlocked(index) {
    if (index === 0) return true;
    if (completedLevels['level' + (index - 1)]) return true;
    return SECRET_PATHS.some(p => p.to === index && isSecretFound(p.from));
}

// ========================
// Ground and pits
// ========================

// The stretches of ground between pits, as [left, right] pairs
function groundIntervals(lvl) {
    const pits = (lvl.pits || []).map(p => [p.x - p.width / 2, p.x + p.width / 2]).sort((a, b) => a[0] - b[0]);
    const out = [];
    let x = 0;
    pits.forEach(([l, r]) => {
        if (l > x) out.push([x, l]);
        x = Math.max(x, r);
    });
    if (x < lvl.worldWidth) out.push([x, lvl.worldWidth]);
    return out;
}

function levelHasPits(lvl) { return !!(lvl.pits && lvl.pits.length); }

// World and camera limits for a level, allowing for tall levels and for
// room under the floor to fall into.
function levelBounds(lvl) {
    const top = lvl.worldTop || 0;
    return {
        top: top,
        viewHeight: lvl.worldHeight - top,
        physHeight: lvl.worldHeight - top + (levelHasPits(lvl) ? 200 : 0)
    };
}

// ========================
// Gems and the secret exit
// ========================

let campGems = [];
let campGemHud = [];
let campGemsRun = [false, false, false];   // picked up this attempt
let campSecret = null;
let secretExitTaken = false;

function resetCampaignLevelState() {
    campGems = [];
    campGemHud = [];
    campGemsRun = [false, false, false];
    campSecret = null;
    secretExitTaken = false;
}

function campaignStoryMode() {
    return typeof movesStoryMode === 'function' ? movesStoryMode() : true;
}

function campaignTextures(scene) {
    if (scene.textures.exists('camp_gem')) return;
    const gem = (key, fill, edge, alpha) => hdTexture(scene, key, 26, 26, ctx => {
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(24, 10); ctx.lineTo(13, 25); ctx.lineTo(2, 10); ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, 26, 26);
        g.addColorStop(0, fill[0]); g.addColorStop(0.5, fill[1]); g.addColorStop(1, fill[2]);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(24, 10); ctx.moveTo(8, 10); ctx.lineTo(13, 1); ctx.lineTo(18, 10); ctx.lineTo(13, 25); ctx.closePath(); ctx.stroke();
    });
    gem('camp_gem', ['#ffd0f4', '#ff4fb8', '#9a1470'], '#5c0840', 1);
    gem('camp_gem_empty', ['#3a4254', '#2a3040', '#1c2130'], '#0a1220', 0.85);
    hdTexture(scene, 'camp_secret_flag', 44, 84, ctx => {
        ctx.fillStyle = '#c8d2e6'; ctx.fillRect(6, 2, 4, 80);
        ctx.fillStyle = '#5a657a'; ctx.fillRect(2, 78, 12, 6);
        const g = ctx.createLinearGradient(10, 0, 44, 0);
        g.addColorStop(0, '#6fd3ff'); g.addColorStop(1, '#2a63e0');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(10, 4); ctx.quadraticCurveTo(28, 0, 42, 8); ctx.lineTo(34, 18); ctx.lineTo(42, 30);
        ctx.quadraticCurveTo(26, 24, 10, 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#123a8a'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('?', 18, 22);
    });
    hdTexture(scene, 'camp_pit', 32, 48, ctx => {
        const g = ctx.createLinearGradient(0, 0, 0, 48);
        g.addColorStop(0, 'rgba(8,10,20,0.55)'); g.addColorStop(0.5, 'rgba(8,10,20,0.92)'); g.addColorStop(1, 'rgba(4,5,10,1)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 48);
    });
}

function buildCampaignLevel(scene) {
    campaignTextures(scene);
    const lvl = currentLevel;
    if (typeof endlessMode !== 'undefined' && endlessMode) return;

    // Pits: darkness below the lip, so the gap reads as a drop
    (lvl.pits || []).forEach(p => {
        scene.add.image(p.x, 556, 'camp_pit').setOrigin(0.5, 0).setDisplaySize(p.width, 48).setDepth(-3);
    });

    const saved = getLevelGems(currentLevelIndex);
    (lvl.gems || []).slice(0, 3).forEach((g, i) => {
        const img = scene.add.image(g.x, g.y, 'camp_gem').setDepth(8);
        // A gem already owned is shown faded: it can be picked up again but is not new
        if (saved[i]) img.setAlpha(0.45);
        campGems.push({ x: g.x, y: g.y, img: img, slot: i, taken: false });
    });
    if (lvl.gems && lvl.gems.length && campaignStoryMode()) {
        for (let i = 0; i < 3; i++) {
            const h = wideUI(scene.add.image(VIEW_W / 2 - 22 + i * 22, 44, saved[i] ? 'camp_gem' : 'camp_gem_empty'));
            h.setScrollFactor(0).setDepth(100).setScale(0.7);
            campGemHud.push(h);
            if (typeof gameplayHudObjects !== 'undefined') gameplayHudObjects.push(h);
        }
    }

    if (lvl.secretExit) {
        const img = scene.add.image(lvl.secretExit.x, lvl.secretExit.y, 'camp_secret_flag').setOrigin(0.25, 1).setDepth(1);
        campSecret = { x: lvl.secretExit.x, y: lvl.secretExit.y, img: img };
    }
}

function updateCampaignLevel(scene) {
    if (!player || !player.body) return;
    const t = scene.time.now;
    campGems.forEach(g => {
        if (g.taken) return;
        g.img.y = g.y + Math.sin(t * 0.004 + g.x) * 4;
        g.img.setScale(1 + Math.sin(t * 0.006 + g.x) * 0.06);
        if (Math.abs(player.x - g.x) < 26 && Math.abs(player.y - g.y) < 30) {
            g.taken = true;
            campGemsRun[g.slot] = true;
            g.img.destroy();
            score += GEM_SCORE;
            scoreText.setText(formatScoreHUD(score, highScores['level' + currentLevelIndex] || 0));
            spawnParticles(scene, g.x, g.y, 0xff4fb8, 16, 80);
            showScorePopup(scene, g.x, g.y - 24, 'GEM!', '#ff8fd6');
            playSound('powerup');
            if (campGemHud[g.slot]) {
                campGemHud[g.slot].setTexture('camp_gem');
                scene.tweens.add({ targets: campGemHud[g.slot], scale: 1.3, duration: 140, yoyo: true });
            }
            if (typeof flowAddSecret === 'function') flowAddSecret();
        }
    });

    if (campSecret && !levelComplete && !gameOver &&
        Math.abs(player.x - campSecret.x) < 24 && Math.abs(player.y - (campSecret.y - 30)) < 50) {
        secretExitTaken = true;
        reachEnd.call(scene);
    }

    // Falling into a pit costs a heart, whatever is being worn or ridden
    if (levelHasPits(currentLevel) && player.y > currentLevel.worldHeight + 50 && !controlLocked && !gameOver) {
        suitForceHit = true;
        hitEnemy.call(scene);
    }
}

// Called when a level is finished: banks the gems and any secret exit.
// Returns what was new, for the results screen.
function campaignOnComplete(index) {
    const result = { gems: campGemsRun.filter(Boolean).length, newGems: 0, secret: false, secretTo: -1 };
    if (!campaignStoryMode()) return result;
    const saved = getLevelGems(index).slice();
    campGemsRun.forEach((got, i) => {
        if (got && !saved[i]) { saved[i] = true; result.newGems++; }
    });
    gemData['level' + index] = saved;
    localStorage.setItem('jqGems', JSON.stringify(gemData));
    result.gems = saved.filter(Boolean).length;

    if (secretExitTaken) {
        const path = SECRET_PATHS.find(p => p.from === index);
        result.secret = !isSecretFound(index);
        result.secretTo = path ? path.to : -1;
        secretData['level' + index] = true;
        localStorage.setItem('jqSecrets', JSON.stringify(secretData));
    }
    return result;
}
