// ========================
// JumpQuest Menu & Progression System
// Works as an overlay within the existing game scene
// ========================

// Progression data
let completedLevels = JSON.parse(localStorage.getItem('jqCompleted')) || {};
let starData = JSON.parse(localStorage.getItem('jqStars')) || {};
let showingMenu = true;
let showingLevelSelect = false;
let menuObjects = [];

// Target times for star 3 (in ms) per level, from each level's data
const TARGET_TIMES = {};
CAMPAIGN_LEVELS.forEach((lvl, i) => { TARGET_TIMES[i] = lvl.targetTime || 60000; });

function saveCompletion(levelIndex, coinCount, totalCoins, timeMs) {
    const key = 'level' + levelIndex;
    completedLevels[key] = true;
    localStorage.setItem('jqCompleted', JSON.stringify(completedLevels));

    // Calculate stars
    const stars = { completion: true, coins: false, time: false };
    if (totalCoins > 0 && coinCount / totalCoins >= 0.8) stars.coins = true;
    const target = (levels[levelIndex] && levels[levelIndex].targetTime) || 60000;
    if (timeMs <= target) stars.time = true;

    // Only upgrade stars, never downgrade
    const existing = starData[key] || { completion: false, coins: false, time: false };
    starData[key] = {
        completion: existing.completion || stars.completion,
        coins: existing.coins || stars.coins,
        time: existing.time || stars.time
    };
    localStorage.setItem('jqStars', JSON.stringify(starData));

    return starData[key];
}

function getStarCount(levelIndex) {
    const key = 'level' + levelIndex;
    const s = starData[key];
    if (!s) return 0;
    return (s.completion ? 1 : 0) + (s.coins ? 1 : 0) + (s.time ? 1 : 0);
}

function getTotalStars() {
    let total = 0;
    for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) total += getStarCount(i);
    return total;
}

// isLevelUnlocked lives in campaign.js: secret exits can open levels too.

function showMainMenu(scene) {
    showingMenu = true;
    showingLevelSelect = false;
    if (typeof showingSpeedrunSelect !== 'undefined') showingSpeedrunSelect = false;
    if (typeof speedrunMode !== 'undefined') speedrunMode = false;
    clearMenuObjects();
    if (typeof setGameplayHUDVisible === 'function') setGameplayHUDVisible(false);

    const T = UI.theme, CX = VIEW_W / 2;
    // Up / Down go row by row (hero, modes, collection, controls) to the
    // nearest button in x. The kit's own nearest-in-direction rule would skip
    // the modes row, since none of its four buttons sits right under Play.
    // Left / Right use the kit's default (along the row, wrapping).
    const rows = [[], [], [], []];
    const onKey = (e) => {
        const dir = { ArrowUp: -1, ArrowDown: 1 }[e.key];
        const cur = s.focused;
        if (!dir || !cur) return false;
        const r = rows.findIndex(row => row.some(b => b.record === cur));
        if (r === -1) return false;
        const next = rows[(r + dir + rows.length) % rows.length];
        let best = null;
        next.forEach(b => { if (!best || Math.abs(b.x - cur.x) < Math.abs(best.x - cur.x)) best = b; });
        if (e.preventDefault) e.preventDefault();
        if (best) s.setFocus(best);
        return true;
    };
    // No onBack: the main menu is the root, Esc does nothing here.
    const s = UI.screen(scene, { id: 'main-menu', depth: T.depth.menu, backdrop: 'dim', onKey: onKey });

    // ---- Logo: big gold title, two twinkling stars, a gentle idle bob ----
    const LOGO_Y = 82;
    const logoSize = Math.round(T.size.title * 1.75);
    const logo = s.title(CX, LOGO_Y, 'JUMP QUEST', { size: logoSize });
    const logoHalf = logo.text.width / 2;
    const sparkles = [
        s.icon(CX - logoHalf - 30, LOGO_Y - 14, 'star', 30),
        s.icon(CX + logoHalf + 30, LOGO_Y - 14, 'star', 30)
    ];
    if (T.motion) {
        // starts after the enter animation, so the two never fight over y
        const settle = T.time.enter + 120;
        scene.tweens.add({ targets: logo, y: { from: LOGO_Y, to: LOGO_Y - 6 }, delay: settle,
            duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        sparkles.forEach((sp, i) => scene.tweens.add({
            targets: sp, scale: { from: 1, to: 0.72 }, angle: { from: 0, to: 18 }, delay: settle + i * 700,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        }));
    }

    // ---- Hero group: progress, wallet, the big Play ----
    s.panel(CX, 218, 440, 156);
    const totalStars = getTotalStars();
    const hasWallet = typeof walletCoins !== 'undefined';
    const statY = 172;
    s.stat(hasWallet ? CX - 12 : CX, statY, 'star', `${totalStars}/${CAMPAIGN_LEVELS.length * 3}`,
        { color: 'gold', align: hasWallet ? 'right' : 'center' });

    // Coin wallet, plus the once-a-day login bonus
    if (hasWallet) {
        let loginBonus = 0;
        if (typeof claimDailyLoginBonus === 'function') {
            loginBonus = claimDailyLoginBonus();
        }
        const wallet = s.stat(CX + 12, statY, 'coin', `${walletCoins}`, { color: 'gold', align: 'left' });

        if (loginBonus > 0) {
            const popX = CX + 12 + wallet.width / 2, popY = statY + 30;
            const bonusText = s.label(popX, popY + 4, `+${loginBonus} today`, { style: 'small', color: 'go', outline: true });
            if (T.motion) {
                bonusText.setAlpha(0);
                scene.tweens.add({
                    targets: bonusText, alpha: 1, y: popY,
                    duration: 400, delay: T.time.enter + 300, ease: 'Back.easeOut'
                });
            } else {
                bonusText.y = popY;
            }
        }
    }

    // Big PLAY button: the hero action
    rows[0].push(s.button(CX, 248, 'PLAY', { role: 'go', size: 'lg', icon: 'play', width: 300, default: true, onClick: () => {
        clearMenuObjects();
        if (typeof setGameplayHUDVisible === 'function') setGameplayHUDVisible(true);
        showingMenu = false;
        if (typeof speedrunMode !== 'undefined') speedrunMode = false;
        if (typeof showingSpeedrunSelect !== 'undefined') showingSpeedrunSelect = false;
        if (typeof endlessMode !== 'undefined') endlessMode = false;
        if (typeof dailyChallengeMode !== 'undefined') dailyChallengeMode = false;
        let startLevel = 0;
        for (let i = 0; i < levels.length; i++) {
            if (!completedLevels['level' + i]) { startLevel = i; break; }
            startLevel = i;
        }
        currentLevelIndex = startLevel;
        if (typeof restartWithTransition === 'function') restartWithTransition(scene);
        else scene.scene.restart();
    } }));

    // ---- Ways to play ----
    const MODE_Y = 366, MODE_W = 178, MODE_GAP = 192;
    s.panel(CX, MODE_Y + 2, 820, 82, { fill: 'dark' });
    const modeX = i => CX + (i - 1.5) * MODE_GAP;
    rows[1].push(s.button(modeX(0), MODE_Y, 'MAP', { role: 'nav', icon: 'map', width: MODE_W, onClick: () => {
        clearMenuObjects();
        showLevelSelect(scene);
    } }));
    rows[1].push(s.button(modeX(1), MODE_Y, 'SPEEDRUN', { role: 'mode', icon: 'bolt', width: MODE_W, onClick: () => {
        clearMenuObjects();
        if (typeof showSpeedrunLevelSelect === 'function') showSpeedrunLevelSelect(scene);
        else showMainMenu(scene);
    } }));
    rows[1].push(s.button(modeX(2), MODE_Y, 'ENDLESS', { role: 'mode', icon: 'infinity', width: MODE_W, onClick: () => {
        clearMenuObjects();
        showingMenu = false;
        if (typeof speedrunMode !== 'undefined') speedrunMode = false;
        if (typeof showingSpeedrunSelect !== 'undefined') showingSpeedrunSelect = false;
        if (typeof endlessMode !== 'undefined') endlessMode = true;
        currentLevelIndex = 0;
        if (typeof restartWithTransition === 'function') restartWithTransition(scene);
        else scene.scene.restart();
    } }));
    rows[1].push(s.button(modeX(3), MODE_Y, 'DAILY', { role: 'mode', icon: 'sun', width: MODE_W, onClick: () => {
        clearMenuObjects();
        if (typeof showDailyChallengeScreen === 'function') showDailyChallengeScreen(scene);
        else showMainMenu(scene);
    } }));

    // Daily streak badge, pinned to the Daily button's top right corner
    const ds = typeof dailyStreak !== 'undefined' && dailyStreak > 0 ? dailyStreak : 0;
    if (ds > 0) {
        const badge = s.stat(modeX(3) + MODE_W / 2 + 6, MODE_Y - 26, 'bolt', `${ds}`, { color: 'mode', align: 'right' });
        badge.setDepth(s.depth + 5);     // above the button it sits on
    }

    // ---- Collection ----
    const COL_Y = 458, COL_W = 200, COL_GAP = 216;
    s.panel(CX, COL_Y + 2, 680, 70, { fill: 'dark' });
    rows[2].push(s.button(CX - COL_GAP, COL_Y, 'ACHIEVEMENTS', { role: 'neutral', size: 'sm', icon: 'trophy', iconColor: T.color.gold, width: COL_W, onClick: () => {
        clearMenuObjects();
        if (typeof showAchievementGallery === 'function') showAchievementGallery(scene);
    } }));
    rows[2].push(s.button(CX, COL_Y, 'SHOP', { role: 'neutral', size: 'sm', icon: 'brush', width: COL_W, onClick: () => {
        clearMenuObjects();
        if (typeof showCosmeticScreen === 'function') showCosmeticScreen(scene);
    } }));
    rows[2].push(s.button(CX + COL_GAP, COL_Y, 'MODIFIERS', { role: 'neutral', size: 'sm', icon: 'gear', width: COL_W, onClick: () => {
        clearMenuObjects();
        if (typeof showModifierScreen === 'function') showModifierScreen(scene);
    } }));

    rows[3].push(s.button(CX, 526, 'CONTROLS', { role: 'neutral', size: 'sm', width: 150, onClick: () => {
        if (typeof toggleControlsPopup === 'function') toggleControlsPopup(scene);
    } }));

    s.hintBar([['ENTER', 'Select'], ['\u2190 \u2192', 'Move'], ['SPACE', 'Jump'], ['SHIFT', 'Dash'], ['R', 'Retry'], ['ESC', 'Pause']]);

    s.open();
    menuObjects.push({ destroy: () => s.destroy() });
}

function createMenuButton(scene, x, y, text, bgColor, hoverColor, callback) {
    const btn = scene.add.text(x, y, text, {
        fontSize: '24px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: bgColor, padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => { btn.setStyle({ backgroundColor: hoverColor }); if (typeof playSound === 'function') playSound('menuHover'); });
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: bgColor }));
    btn.on('pointerup', () => { if (typeof playSound === 'function') playSound('menuClick'); callback(); });
    menuObjects.push(btn);
    return btn;
}

// ========================
// Local Leaderboard System
// ========================

let leaderboardData = JSON.parse(localStorage.getItem('jqLeaderboard')) || {};

function saveLeaderboardEntry(levelIndex, score, time) {
    const key = 'level' + levelIndex;
    if (!leaderboardData[key]) {
        leaderboardData[key] = { scores: [], times: [] };
    }
    const lb = leaderboardData[key];

    // Add score entry
    lb.scores.push({ score: score, date: Date.now() });
    lb.scores.sort((a, b) => b.score - a.score);
    lb.scores = lb.scores.slice(0, 5);

    // Add time entry
    lb.times.push({ time: time, date: Date.now() });
    lb.times.sort((a, b) => a.time - b.time);
    lb.times = lb.times.slice(0, 5);

    localStorage.setItem('jqLeaderboard', JSON.stringify(leaderboardData));

    // Return ranks (1-based, 0 = not in top 5)
    const scoreRank = lb.scores.findIndex(e => e.score === score && e.date === lb.scores.find(s => s.score === score)?.date) + 1;
    const timeRank = lb.times.findIndex(e => e.time === time && e.date === lb.times.find(s => s.time === time)?.date) + 1;
    return { scoreRank: scoreRank || 0, timeRank: timeRank || 0 };
}

function getLeaderboard(levelIndex) {
    const key = 'level' + levelIndex;
    return leaderboardData[key] || { scores: [], times: [] };
}

function clearMenuObjects() {
    if (typeof closeControlsPopup === 'function') closeControlsPopup();
    menuObjects.forEach(obj => obj.destroy());
    menuObjects = [];
}
