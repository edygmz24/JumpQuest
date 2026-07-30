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

// Target times for star 3 (in ms) per level
const TARGET_TIMES = {
    0: 30000, 1: 45000, 2: 60000, 3: 75000, 4: 90000,
    5: 70000, 6: 80000, 7: 60000, 8: 90000, 9: 120000
};

function saveCompletion(levelIndex, coinCount, totalCoins, timeMs) {
    const key = 'level' + levelIndex;
    completedLevels[key] = true;
    localStorage.setItem('jqCompleted', JSON.stringify(completedLevels));

    // Calculate stars
    const stars = { completion: true, coins: false, time: false };
    if (totalCoins > 0 && coinCount / totalCoins >= 0.8) stars.coins = true;
    const target = TARGET_TIMES[levelIndex] || 60000;
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
    for (let i = 0; i < 10; i++) total += getStarCount(i);
    return total;
}

function isLevelUnlocked(index) {
    if (index === 0) return true;
    return !!completedLevels['level' + (index - 1)];
}

function showMainMenu(scene) {
    showingMenu = true;
    showingLevelSelect = false;
    clearMenuObjects();

    // Darken background
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();
    menuObjects.push(bg);

    // ---- HERO AREA: Title + Stars + Play ----
    const title = scene.add.text(400, 80, 'JUMP QUEST', {
        fontSize: '56px', fill: '#ffdd00', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    const sub = scene.add.text(400, 138, 'A Platformer Adventure', {
        fontSize: '16px', fill: '#888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(sub);

    // Star display with visual star icons
    const totalStars = getTotalStars();
    const starStr = '';
    let starDisplay = '';
    for (let i = 0; i < 30; i++) {
        starDisplay += i < totalStars ? '\u2605' : '\u2606';
        if (i === 9 || i === 19) starDisplay += '  ';
    }
    const starText = scene.add.text(400, 170, `${starDisplay}`, {
        fontSize: '10px', fill: totalStars > 0 ? '#ffd700' : '#555', letterSpacing: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(starText);

    const starCount = scene.add.text(400, 190, `${totalStars} / 30 Stars`, {
        fontSize: '13px', fill: '#ffd700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(starCount);

    // Coin wallet, plus the once-a-day login bonus
    if (typeof walletCoins !== 'undefined') {
        let loginBonus = 0;
        if (typeof claimDailyLoginBonus === 'function') {
            loginBonus = claimDailyLoginBonus();
        }

        const walletDisplay = scene.add.text(400, 210, `● ${walletCoins} coins`, {
            fontSize: '13px', fill: '#ffcc33'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        menuObjects.push(walletDisplay);

        if (loginBonus > 0) {
            const bonusText = scene.add.text(400, 228, `+${loginBonus} daily bonus!`, {
                fontSize: '12px', fill: '#7fdc7f', fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001).setAlpha(0);
            menuObjects.push(bonusText);
            scene.tweens.add({
                targets: bonusText, alpha: 1, y: 224,
                duration: 400, delay: 300, ease: 'Back.easeOut'
            });
        }
    }

    // Big PLAY button — the hero action
    const playBtn = createMenuButton(scene, 400, 245, '\u25B6  PLAY', '#0a0', '#0c0', () => {
        clearMenuObjects();
        showingMenu = false;
        let startLevel = 0;
        for (let i = 0; i < levels.length; i++) {
            if (!completedLevels['level' + i]) { startLevel = i; break; }
            startLevel = i;
        }
        currentLevelIndex = startLevel;
        if (typeof restartWithTransition === 'function') restartWithTransition(scene);
        else scene.scene.restart();
    });
    playBtn.setStyle({ fontSize: '28px', padding: { x: 40, y: 12 } });

    // ---- SECONDARY: Thin divider + game modes ----
    const divider1 = scene.add.rectangle(400, 290, 300, 1, 0x444444);
    divider1.setScrollFactor(0).setDepth(2001);
    menuObjects.push(divider1);

    const modeLabel = scene.add.text(400, 304, 'GAME MODES', {
        fontSize: '10px', fill: '#666', letterSpacing: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(modeLabel);

    // Level Select + Endless + Daily in a balanced row
    const selectBtn = createMenuButton(scene, 250, 340, 'LEVELS', '#06a', '#08c', () => {
        clearMenuObjects();
        showLevelSelect(scene);
    });
    selectBtn.setStyle({ fontSize: '16px', padding: { x: 20, y: 8 } });

    const endlessBtn = createMenuButton(scene, 400, 340, 'ENDLESS', '#830', '#a50', () => {
        clearMenuObjects();
        showingMenu = false;
        if (typeof endlessMode !== 'undefined') endlessMode = true;
        currentLevelIndex = 0;
        if (typeof restartWithTransition === 'function') restartWithTransition(scene);
        else scene.scene.restart();
    });
    endlessBtn.setStyle({ fontSize: '16px', padding: { x: 20, y: 8 } });

    const dailyBtn = createMenuButton(scene, 550, 340, 'DAILY', '#063', '#085', () => {
        clearMenuObjects();
        if (typeof showDailyChallengeScreen === 'function') showDailyChallengeScreen(scene);
        else showMainMenu(scene);
    });
    dailyBtn.setStyle({ fontSize: '16px', padding: { x: 20, y: 8 } });

    // Daily streak badge
    const ds = typeof dailyStreak !== 'undefined' && dailyStreak > 0 ? dailyStreak : 0;
    if (ds > 0) {
        const streakText = scene.add.text(550, 365, `${ds} day streak`, {
            fontSize: '9px', fill: '#0fa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        menuObjects.push(streakText);
    }

    // ---- TERTIARY: Extras section ----
    const divider2 = scene.add.rectangle(400, 385, 300, 1, 0x333333);
    divider2.setScrollFactor(0).setDepth(2001);
    menuObjects.push(divider2);

    const extrasLabel = scene.add.text(400, 399, 'EXTRAS', {
        fontSize: '10px', fill: '#555', letterSpacing: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(extrasLabel);

    // Extras row — smaller, uniform style with icons
    const achBtn = createMenuButton(scene, 210, 435, '\uD83C\uDFC6 Achievements', '#3a3a3a', '#4a4a4a', () => {
        clearMenuObjects();
        if (typeof showAchievementGallery === 'function') showAchievementGallery(scene);
    });
    achBtn.setStyle({ fontSize: '13px', padding: { x: 12, y: 6 } });

    const cosBtn = createMenuButton(scene, 400, 435, '\uD83C\uDFA8 Cosmetics & Shop', '#3a3a3a', '#4a4a4a', () => {
        clearMenuObjects();
        if (typeof showCosmeticScreen === 'function') showCosmeticScreen(scene);
    });
    cosBtn.setStyle({ fontSize: '13px', padding: { x: 12, y: 6 } });

    const modBtn = createMenuButton(scene, 590, 435, '\u2699 Modifiers', '#3a3a3a', '#4a4a4a', () => {
        clearMenuObjects();
        if (typeof showModifierScreen === 'function') showModifierScreen(scene);
    });
    modBtn.setStyle({ fontSize: '13px', padding: { x: 12, y: 6 } });

    // ---- FOOTER: Controls ----
    const controls = scene.add.text(400, 480, 'Arrows: Move  |  Space: Jump  |  Shift: Dash  |  R: Retry  |  ESC: Pause', {
        fontSize: '10px', fill: '#444'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(controls);
}

function showLevelSelect(scene) {
    showingMenu = false;
    showingLevelSelect = true;
    clearMenuObjects();

    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();
    menuObjects.push(bg);

    const title = scene.add.text(400, 40, 'SELECT LEVEL', {
        fontSize: '32px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Level grid: 2 rows of 5
    for (let i = 0; i < levels.length; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 120 + col * 145;
        const y = 140 + row * 230;
        const unlocked = isLevelUnlocked(i);
        const stars = getStarCount(i);

        // Level box
        const boxColor = unlocked ? 0x224488 : 0x333333;
        const box = scene.add.rectangle(x, y, 120, 100, boxColor);
        box.setStrokeStyle(2, unlocked ? 0x4488cc : 0x555555);
        box.setScrollFactor(0).setDepth(2001);
        menuObjects.push(box);

        // Level number
        const numText = scene.add.text(x, y - 25, `${i + 1}`, {
            fontSize: '28px', fill: unlocked ? '#fff' : '#666', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(numText);

        // Level name (abbreviated)
        const name = levels[i].name.replace(/Level \d+ - /, '');
        const nameText = scene.add.text(x, y + 5, name, {
            fontSize: '10px', fill: unlocked ? '#aaa' : '#555'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(nameText);

        // Stars
        const starStr = (stars >= 1 ? '\u2605' : '\u2606') +
                        (stars >= 2 ? '\u2605' : '\u2606') +
                        (stars >= 3 ? '\u2605' : '\u2606');
        const starDisplay = scene.add.text(x, y + 30, starStr, {
            fontSize: '18px', fill: stars > 0 ? '#ffd700' : '#555'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(starDisplay);

        // Best time
        const bt = bestTimes['level' + i];
        if (bt) {
            const timeStr = formatTime(bt);
            const timeText = scene.add.text(x, y + 48, timeStr, {
                fontSize: '11px', fill: '#0ff'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
            menuObjects.push(timeText);
        }

        // Lock icon or click handler
        if (!unlocked) {
            const lock = scene.add.text(x, y - 5, '\uD83D\uDD12', {
                fontSize: '24px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2003);
            menuObjects.push(lock);
        } else {
            box.setInteractive({ useHandCursor: true });
            box.on('pointerover', () => box.setFillStyle(0x336699));
            box.on('pointerout', () => box.setFillStyle(boxColor));
            box.on('pointerup', () => {
                currentLevelIndex = i;
                clearMenuObjects();
                showingLevelSelect = false;
                if (typeof restartWithTransition === 'function') restartWithTransition(scene);
                else scene.scene.restart();
            });
        }
    }

    // Back button
    createMenuButton(scene, 400, 530, 'BACK TO MENU', '#666', '#888', () => {
        clearMenuObjects();
        showMainMenu(scene);
    });
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
    menuObjects.forEach(obj => obj.destroy());
    menuObjects = [];
}
