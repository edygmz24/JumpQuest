// ========================
// JumpQuest Daily Challenge System
// Provides a unique daily challenge with seeded randomness and modifiers
// ========================

// --- Globals ---
let dailyChallengeMode = false;
let dailyModifiers = [];
let dailyLevelIndex = 0;
let dailyCompleted = JSON.parse(localStorage.getItem('jqDailyCompleted')) || {};
let dailyStreak = parseInt(localStorage.getItem('jqDailyStreak')) || 0;
let dailyLastDate = localStorage.getItem('jqDailyLastDate') || '';

// --- Seeded PRNG ---
// Simple mulberry32-based seeded random number generator
function dailySeedRandom(seed) {
    // Convert string seed to numeric hash
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    // Return a function that produces deterministic floats [0, 1)
    return function() {
        h |= 0;
        h = h + 0x6D2B79F5 | 0;
        let t = Math.imul(h ^ (h >>> 15), 1 | h);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Modifier Definitions ---
const DAILY_MODIFIERS = {
    fastEnemies:   { name: 'Fast Enemies',   desc: 'Enemies move 1.5x faster',       icon: '\u26A1' },
    tinyPlatforms: { name: 'Tiny Platforms',  desc: 'Platforms are 30% smaller',       icon: '\uD83D\uDCCF' },
    noCheckpoints: { name: 'No Checkpoints',  desc: 'Checkpoints are disabled',        icon: '\uD83D\uDEAB' },
    doubleCoins:   { name: 'Double Coins',    desc: 'Twice as many coins!',            icon: '\uD83E\uDE99' },
    floatyJump:    { name: 'Floaty Jump',     desc: 'Lower gravity, floatier jumps',   icon: '\uD83C\uDF88' },
    speedRun:      { name: 'Speed Run',       desc: 'Tight time target!',              icon: '\u23F1\uFE0F' },
    oneLife:       { name: 'One Life',         desc: 'No extra lives!',                 icon: '\uD83D\uDC80' },
    bigPlayer:     { name: 'Super Size',       desc: 'Player is 1.5x bigger',          icon: '\uD83D\uDD0D' }
};

// Modifier conflict pairs: these two should not appear together
const MODIFIER_CONFLICTS = [
    ['floatyJump', 'speedRun']
];

// --- Helper: today's date string ---
function getDailyDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- Helper: yesterday's date string ---
function getYesterdayDateString() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- Core: get today's challenge config ---
function getDailyChallenge() {
    const today = getDailyDateString();
    const rng = dailySeedRandom(today);

    // Pick a level (0-9)
    const levelIndex = Math.floor(rng() * 10);

    // Pick 2 non-conflicting modifiers
    const modKeys = Object.keys(DAILY_MODIFIERS);
    let mod1Index = Math.floor(rng() * modKeys.length);
    let mod1 = modKeys[mod1Index];

    // Build list of valid second modifiers (no conflicts with mod1)
    const conflictsWithMod1 = MODIFIER_CONFLICTS
        .filter(pair => pair.includes(mod1))
        .flat()
        .filter(k => k !== mod1);
    const validSecond = modKeys.filter(k => k !== mod1 && !conflictsWithMod1.includes(k));
    let mod2Index = Math.floor(rng() * validSecond.length);
    let mod2 = validSecond[mod2Index];

    // Target time: base * 0.8
    const baseTarget = (typeof TARGET_TIMES !== 'undefined' && TARGET_TIMES[levelIndex])
        ? TARGET_TIMES[levelIndex]
        : 60000;
    const targetTime = Math.round(baseTarget * 0.8);

    return {
        date: today,
        levelIndex: levelIndex,
        modifiers: [mod1, mod2],
        targetTime: targetTime
    };
}

// --- Check if today's challenge is completed ---
function isDailyChallengeCompleted() {
    const today = getDailyDateString();
    return !!dailyCompleted[today];
}

// --- Start the daily challenge ---
function startDailyChallenge(scene) {
    const challenge = getDailyChallenge();
    dailyChallengeMode = true;
    dailyModifiers = challenge.modifiers;
    dailyLevelIndex = challenge.levelIndex;
    currentLevelIndex = dailyLevelIndex;

    // Clear any menu state
    if (typeof clearMenuObjects === 'function') clearMenuObjects();
    showingMenu = false;
    if (typeof showingLevelSelect !== 'undefined') showingLevelSelect = false;

    scene.scene.restart();
}

// --- Apply daily modifiers to the game after loadLevel ---
// Integration: In game.js create(), after loadLevel(), add:
//   if (dailyChallengeMode && typeof applyDailyModifiers === 'function') {
//       applyDailyModifiers(this);
//   }
function applyDailyModifiers(scene) {
    if (!dailyChallengeMode || !dailyModifiers || dailyModifiers.length === 0) return;

    for (const mod of dailyModifiers) {
        switch (mod) {
            case 'fastEnemies':
                // Multiply all enemy velocities by 1.5
                if (typeof enemies !== 'undefined' && enemies && enemies.getChildren) {
                    enemies.getChildren().forEach(enemy => {
                        if (enemy.body) {
                            enemy.body.velocity.x *= 1.5;
                            enemy.body.velocity.y *= 1.5;
                        }
                        // Also scale the stored speed data if present
                        if (enemy.getData && enemy.getData('speed')) {
                            enemy.setData('speed', enemy.getData('speed') * 1.5);
                        }
                    });
                }
                break;

            case 'tinyPlatforms':
                // Scale down platform display sizes by 0.7 and refresh physics
                if (typeof platforms !== 'undefined' && platforms && platforms.getChildren) {
                    platforms.getChildren().forEach(plat => {
                        // Skip ground platforms (at y=580) to keep the level playable
                        if (plat.y >= 575) return;
                        const origW = plat.displayWidth;
                        plat.setDisplaySize(origW * 0.7, plat.displayHeight);
                        plat.refreshBody();
                    });
                }
                break;

            case 'noCheckpoints':
                // Remove all checkpoints so they cannot be activated
                if (typeof checkpoints !== 'undefined' && checkpoints && checkpoints.getChildren) {
                    checkpoints.getChildren().forEach(cp => cp.destroy());
                }
                if (typeof checkpointRects !== 'undefined') {
                    checkpointRects.forEach(r => { if (r && r.destroy) r.destroy(); });
                    checkpointRects = [];
                }
                lastCheckpoint = null;
                break;

            case 'doubleCoins':
                // Duplicate coins at slight offset positions
                if (typeof coins !== 'undefined' && coins && coins.getChildren) {
                    const existingCoins = coins.getChildren().slice(); // copy array
                    existingCoins.forEach(coin => {
                        const offsetX = 20;
                        const offsetY = -15;
                        const newCoin = coins.create(coin.x + offsetX, coin.y + offsetY, null);
                        if (newCoin) {
                            newCoin.setDisplaySize(16, 16);
                            newCoin.setTint(0xffd700);
                            newCoin.refreshBody();
                            // Create visual rect for the new coin
                            const rect = scene.add.rectangle(
                                coin.x + offsetX, coin.y + offsetY,
                                16, 16, 0xffd700
                            ).setDepth(5);
                            coinRects.push(rect);
                            totalLevelCoins++;
                        }
                    });
                }
                break;

            case 'floatyJump':
                // Set gravity to 500 (from default 800)
                if (scene.physics && scene.physics.world) {
                    scene.physics.world.gravity.y = 500;
                }
                break;

            case 'speedRun':
                // No gameplay change needed; tighter target time is shown on HUD
                break;

            case 'oneLife':
                // Set lives to 1
                lives = 1;
                if (typeof livesText !== 'undefined' && livesText && livesText.setText) {
                    livesText.setText('Lives: 1');
                }
                break;

            case 'bigPlayer':
                // Scale player to 1.5x size
                if (typeof player !== 'undefined' && player) {
                    player.setDisplaySize(48, 48); // 32 * 1.5 = 48
                    player.refreshBody();
                }
                if (typeof playerRect !== 'undefined' && playerRect) {
                    playerRect.setSize(48, 48);
                }
                break;
        }
    }

    // Show active modifier indicators on HUD
    showDailyModifierHUD(scene);
}

// --- Show modifier indicators on the game HUD ---
function showDailyModifierHUD(scene) {
    if (!dailyChallengeMode) return;

    const challenge = getDailyChallenge();

    // "DAILY CHALLENGE" header
    const header = scene.add.text(400, 4, 'DAILY CHALLENGE', {
        fontSize: '12px', fill: '#ff8800', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1500);

    // Modifier icons below header
    const modText = challenge.modifiers.map(m => {
        const mod = DAILY_MODIFIERS[m];
        return mod ? `${mod.icon} ${mod.name}` : m;
    }).join('  |  ');

    const modDisplay = scene.add.text(400, 18, modText, {
        fontSize: '10px', fill: '#ffcc00',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1500);

    // Target time display
    const targetStr = typeof formatTime === 'function'
        ? formatTime(challenge.targetTime)
        : (challenge.targetTime / 1000).toFixed(1) + 's';

    const targetDisplay = scene.add.text(400, 30, `Target: ${targetStr}`, {
        fontSize: '10px', fill: '#00ffcc',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1500);
}

// --- Complete the daily challenge ---
// Integration: In game.js reachEnd(), add:
//   if (dailyChallengeMode && typeof completeDailyChallenge === 'function') {
//       const dailyResult = completeDailyChallenge();
//       // Optionally show streak info in the completion overlay
//   }
function completeDailyChallenge() {
    const today = getDailyDateString();
    const yesterday = getYesterdayDateString();
    const previousStreak = dailyStreak;

    // Mark today as completed
    dailyCompleted[today] = true;
    localStorage.setItem('jqDailyCompleted', JSON.stringify(dailyCompleted));

    // Update streak
    if (dailyLastDate === yesterday) {
        dailyStreak++;
    } else if (dailyLastDate !== today) {
        dailyStreak = 1;
    }
    // If dailyLastDate is already today, streak stays the same (already completed)

    dailyLastDate = today;
    localStorage.setItem('jqDailyStreak', String(dailyStreak));
    localStorage.setItem('jqDailyLastDate', dailyLastDate);

    // Reset daily mode
    dailyChallengeMode = false;
    dailyModifiers = [];

    return {
        streak: dailyStreak,
        isNewStreak: dailyStreak > previousStreak
    };
}

// --- Streak Reward System ---
function getDailyStreakReward(streak) {
    if (streak >= 30) {
        return { type: 'playerColor', id: 'daily30', name: 'Golden Player (30-day streak)' };
    }
    if (streak >= 14) {
        return { type: 'hat', id: 'daily14', name: 'Champion Hat (14-day streak)' };
    }
    if (streak >= 7) {
        return { type: 'trail', id: 'daily7', name: 'Fire Trail (7-day streak)' };
    }
    return null;
}

// --- Daily Challenge Screen Overlay ---
// Integration: In menu.js showMainMenu(), add a "DAILY CHALLENGE" button:
//   createMenuButton(scene, 400, 490, 'DAILY', '#a06', '#c28', () => {
//       clearMenuObjects();
//       if (typeof showDailyChallengeScreen === 'function') showDailyChallengeScreen(scene);
//   });
function showDailyChallengeScreen(scene) {
    if (typeof clearMenuObjects === 'function') clearMenuObjects();
    if (typeof showingMenu !== 'undefined') showingMenu = false;
    if (typeof showingLevelSelect !== 'undefined') showingLevelSelect = false;

    const challenge = getDailyChallenge();
    const completed = isDailyChallengeCompleted();
    const levelName = (typeof levels !== 'undefined' && levels[challenge.levelIndex])
        ? levels[challenge.levelIndex].name
        : 'Level ' + (challenge.levelIndex + 1);

    // Dark background
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    bg.setScrollFactor(0).setDepth(2000);
    menuObjects.push(bg);

    // Decorative top bar
    const topBar = scene.add.rectangle(400, 50, 700, 4, 0xff8800);
    topBar.setScrollFactor(0).setDepth(2001);
    menuObjects.push(topBar);

    // Title
    const title = scene.add.text(400, 75, 'DAILY CHALLENGE', {
        fontSize: '40px', fill: '#ff8800', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Date
    const dateText = scene.add.text(400, 115, challenge.date, {
        fontSize: '16px', fill: '#888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(dateText);

    // Level info panel
    const panel = scene.add.rectangle(400, 195, 500, 50, 0x1a1a2e);
    panel.setStrokeStyle(2, 0x334488);
    panel.setScrollFactor(0).setDepth(2001);
    menuObjects.push(panel);

    const levelLabel = scene.add.text(400, 195, levelName, {
        fontSize: '22px', fill: '#4488ff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    menuObjects.push(levelLabel);

    // Modifier cards
    const modStartY = 260;
    challenge.modifiers.forEach((modKey, i) => {
        const mod = DAILY_MODIFIERS[modKey];
        if (!mod) return;

        const cardY = modStartY + i * 70;

        // Card background
        const card = scene.add.rectangle(400, cardY, 460, 55, 0x1a1a2e, 0.9);
        card.setStrokeStyle(1, 0x555555);
        card.setScrollFactor(0).setDepth(2001);
        menuObjects.push(card);

        // Icon
        const icon = scene.add.text(200, cardY, mod.icon, {
            fontSize: '28px'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(icon);

        // Name
        const name = scene.add.text(240, cardY - 10, mod.name, {
            fontSize: '18px', fill: '#ffdd00', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(name);

        // Description
        const desc = scene.add.text(240, cardY + 12, mod.desc, {
            fontSize: '13px', fill: '#aaa'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(desc);
    });

    // Target time
    const targetStr = typeof formatTime === 'function'
        ? formatTime(challenge.targetTime)
        : (challenge.targetTime / 1000).toFixed(1) + 's';

    const targetLabel = scene.add.text(400, 410, `Target Time: ${targetStr}`, {
        fontSize: '18px', fill: '#00ffcc', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(targetLabel);

    // Streak display
    const streakIcon = dailyStreak > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F';
    const streakLabel = scene.add.text(400, 445, `${streakIcon} Streak: ${dailyStreak} day${dailyStreak !== 1 ? 's' : ''}`, {
        fontSize: '18px', fill: dailyStreak >= 7 ? '#ff4400' : '#ff8800', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(streakLabel);

    // Show next streak reward if applicable
    const nextMilestone = dailyStreak < 7 ? 7 : dailyStreak < 14 ? 14 : dailyStreak < 30 ? 30 : null;
    if (nextMilestone) {
        const reward = getDailyStreakReward(nextMilestone);
        if (reward) {
            const rewardText = scene.add.text(400, 468, `Next reward at ${nextMilestone} days: ${reward.name}`, {
                fontSize: '11px', fill: '#888'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            menuObjects.push(rewardText);
        }
    }

    // Completed badge
    if (completed) {
        const badge = scene.add.text(400, 500, 'COMPLETED', {
            fontSize: '28px', fill: '#00ff00', fontStyle: 'bold',
            backgroundColor: '#003300', padding: { x: 30, y: 10 },
            stroke: '#00ff00', strokeThickness: 1
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(badge);
    } else {
        // Start Challenge button
        if (typeof createMenuButton === 'function') {
            createMenuButton(scene, 400, 510, 'START CHALLENGE', '#a06', '#c28', () => {
                startDailyChallenge(scene);
            });
        }
    }

    // Decorative bottom bar
    const botBar = scene.add.rectangle(400, 550, 700, 4, 0xff8800);
    botBar.setScrollFactor(0).setDepth(2001);
    menuObjects.push(botBar);

    // Back button
    if (typeof createMenuButton === 'function') {
        createMenuButton(scene, 400, 565, 'BACK', '#444', '#666', () => {
            if (typeof clearMenuObjects === 'function') clearMenuObjects();
            if (typeof showMainMenu === 'function') {
                showingMenu = true;
                showMainMenu(scene);
            }
        });
    }
}
