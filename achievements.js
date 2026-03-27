// ========================
// JumpQuest Achievement System
// Tracks player stats, checks conditions, unlocks achievements with notifications
// ========================

// --- Achievement Definitions ---
const ACHIEVEMENTS = [
    // Skill achievements
    { id: 'combo_starter',  name: 'Combo Starter',  desc: 'Reach a 5x combo',                        icon: '\u{1F525}', hidden: false },
    { id: 'combo_king',     name: 'Combo King',      desc: 'Reach a 10x combo',                       icon: '\u{1F451}', hidden: false },
    { id: 'combo_master',   name: 'Combo Master',    desc: 'Reach a 15x combo',                       icon: '\u{1F4A5}', hidden: false },
    { id: 'flawless',       name: 'Flawless',        desc: 'Complete any level with 0 deaths',        icon: '\u{2728}',  hidden: false },
    { id: 'speed_demon',    name: 'Speed Demon',     desc: 'Beat any level in under 20 seconds',      icon: '\u{26A1}',  hidden: false },
    { id: 'untouchable',    name: 'Untouchable',     desc: 'Complete a level without getting hit',     icon: '\u{1F6E1}', hidden: false },
    { id: 'air_master',     name: 'Air Master',      desc: 'Perform 5 wall jumps in one level',       icon: '\u{1F4A8}', hidden: false },
    { id: 'dash_master',    name: 'Dash Master',     desc: 'Dash 50 times total',                     icon: '\u{1F3C3}', hidden: false },

    // Cumulative achievements
    { id: 'coin_collector', name: 'Coin Collector',  desc: 'Collect 100 coins total',                 icon: '\u{1FA99}', hidden: false },
    { id: 'midas_touch',    name: 'Midas Touch',     desc: 'Collect 500 coins total',                 icon: '\u{1F4B0}', hidden: false },
    { id: 'gold_hoarder',   name: 'Gold Hoarder',    desc: 'Collect 1000 coins total',                icon: '\u{1F3C6}', hidden: false },
    { id: 'exterminator',   name: 'Exterminator',    desc: 'Stomp 50 enemies total',                  icon: '\u{1F9B6}', hidden: false },
    { id: 'centurion',      name: 'Centurion',       desc: 'Stomp 100 enemies total',                 icon: '\u{2694}',  hidden: false },
    { id: 'determined',     name: 'Determined',      desc: 'Die 50 times total',                      icon: '\u{1F4AA}', hidden: false },
    { id: 'never_give_up',  name: 'Never Give Up',   desc: 'Die 100 times total',                     icon: '\u{1F525}', hidden: false },
    { id: 'marathon_runner',name: 'Marathon Runner',  desc: 'Play for 30 minutes total',               icon: '\u{23F1}',  hidden: false },

    // Progression achievements
    { id: 'first_steps',    name: 'First Steps',     desc: 'Complete Level 1',                        icon: '\u{1F476}', hidden: false },
    { id: 'halfway_there',  name: 'Halfway There',   desc: 'Complete Level 5',                        icon: '\u{1F6A9}', hidden: false },
    { id: 'champion',       name: 'Champion',        desc: 'Complete Level 10',                       icon: '\u{1F3C5}', hidden: false },
    { id: 'star_collector', name: 'Star Collector',   desc: 'Earn 15 stars',                           icon: '\u{2B50}',  hidden: false },
    { id: 'perfectionist',  name: 'Perfectionist',   desc: 'Earn all 30 stars',                       icon: '\u{1F31F}', hidden: false },

    // Secret/fun achievements (hidden)
    { id: 'wrong_way',      name: 'Wrong Way',       desc: 'Walk left for 5 seconds at level start',  icon: '\u{2B05}',  hidden: true },
    { id: 'patience',       name: 'Patience',        desc: 'Wait 30 seconds without moving',          icon: '\u{1F9D8}', hidden: true },
    { id: 'ascetic',        name: 'Ascetic',         desc: 'Complete a level with 0 coins collected',  icon: '\u{1F3F5}', hidden: true },
    { id: 'lucky_break',    name: 'Lucky Break',     desc: 'Survive by the skin of your teeth',       icon: '\u{1F340}', hidden: true }
];

// --- Stats State ---
// Persistent stats stored in localStorage under 'jqStats'
// Per-level tracking fields (wallJumpsThisLevel, deathsThisLevel) reset each level
let jqStats = null;
let jqUnlockedAchievements = null;

// Tracking for secret achievements (transient, per-session/level)
let _achLeftWalkTimer = 0;     // seconds walking left at level start
let _achIdleTimer = 0;         // seconds without moving
let _achLastPlayerX = 0;
let _achLastPlayerY = 0;
let _achLevelStarted = false;  // true once player first moves
let _achNotificationQueue = [];
let _achNotificationActive = false;

// --- Initialization ---

function initStats() {
    const saved = localStorage.getItem('jqStats');
    if (saved) {
        jqStats = JSON.parse(saved);
    } else {
        jqStats = {
            totalCoins: 0,
            totalStomps: 0,
            totalDashes: 0,
            totalWallJumps: 0,
            totalDeaths: 0,
            totalPlayTime: 0,
            maxCombo: 0,
            levelsCompleted: [],
            wallJumpsThisLevel: 0,
            deathsThisLevel: 0
        };
    }
    // Ensure all keys exist (forward-compatibility)
    const defaults = {
        totalCoins: 0, totalStomps: 0, totalDashes: 0, totalWallJumps: 0,
        totalDeaths: 0, totalPlayTime: 0, maxCombo: 0,
        levelsCompleted: [], wallJumpsThisLevel: 0, deathsThisLevel: 0
    };
    for (const key in defaults) {
        if (jqStats[key] === undefined) jqStats[key] = defaults[key];
    }

    // Load unlocked achievements
    const savedAch = localStorage.getItem('jqAchievements');
    jqUnlockedAchievements = savedAch ? JSON.parse(savedAch) : [];

    // Reset per-level trackers
    jqStats.wallJumpsThisLevel = 0;
    jqStats.deathsThisLevel = 0;
    _achLeftWalkTimer = 0;
    _achIdleTimer = 0;
    _achLevelStarted = false;
    _achNotificationQueue = [];
    _achNotificationActive = false;

    saveStats();
}

function saveStats() {
    localStorage.setItem('jqStats', JSON.stringify(jqStats));
}

function saveAchievements() {
    localStorage.setItem('jqAchievements', JSON.stringify(jqUnlockedAchievements));
}

// --- Stat Helpers ---

function updateStat(key, value) {
    if (!jqStats) initStats();
    jqStats[key] = value;
    saveStats();
}

function incrementStat(key, amount) {
    if (!jqStats) initStats();
    if (amount === undefined) amount = 1;
    if (typeof jqStats[key] === 'number') {
        jqStats[key] += amount;
    } else {
        jqStats[key] = amount;
    }
    saveStats();
}

// --- Achievement Query Functions ---

function isAchievementUnlocked(id) {
    if (!jqUnlockedAchievements) initStats();
    return jqUnlockedAchievements.indexOf(id) !== -1;
}

function getUnlockedAchievements() {
    if (!jqUnlockedAchievements) initStats();
    return ACHIEVEMENTS.filter(function(a) {
        return jqUnlockedAchievements.indexOf(a.id) !== -1;
    });
}

function getAllAchievements() {
    return ACHIEVEMENTS;
}

// --- Unlock Logic ---

function unlockAchievement(scene, id) {
    if (!jqUnlockedAchievements) initStats();
    if (jqUnlockedAchievements.indexOf(id) !== -1) return; // already unlocked

    jqUnlockedAchievements.push(id);
    saveAchievements();

    var achievement = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (achievement && scene) {
        _achNotificationQueue.push(achievement);
        _processNotificationQueue(scene);
    }
}

function _processNotificationQueue(scene) {
    if (_achNotificationActive || _achNotificationQueue.length === 0) return;
    _achNotificationActive = true;
    var achievement = _achNotificationQueue.shift();
    showAchievementNotification(scene, achievement);
}

// --- Achievement Notification Banner ---

function showAchievementNotification(scene, achievement) {
    // Play sound if available
    if (typeof playAchievementSound === 'function') {
        playAchievementSound();
    }

    // Banner background
    var bannerWidth = 320;
    var bannerHeight = 60;
    var bannerX = 400;
    var startY = -50;
    var targetY = 30;

    var bg = scene.add.rectangle(bannerX, startY, bannerWidth, bannerHeight, 0x1a1a2e, 0.95);
    bg.setScrollFactor(0).setDepth(2500);
    bg.setStrokeStyle(2, 0xffd700);

    // Icon
    var iconText = scene.add.text(bannerX - bannerWidth / 2 + 15, startY, achievement.icon, {
        fontSize: '28px'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2501);

    // "Achievement Unlocked!" label
    var label = scene.add.text(bannerX - bannerWidth / 2 + 52, startY - 10, 'Achievement Unlocked!', {
        fontSize: '11px', fill: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2501);

    // Achievement name
    var nameText = scene.add.text(bannerX - bannerWidth / 2 + 52, startY + 10, achievement.name, {
        fontSize: '16px', fill: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2501);

    var allObjects = [bg, iconText, label, nameText];

    // Slide in
    scene.tweens.add({
        targets: allObjects,
        y: function(target) { return target.y + (targetY - startY); },
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: function() {
            // Hold, then slide out
            scene.time.delayedCall(2500, function() {
                scene.tweens.add({
                    targets: allObjects,
                    y: function(target) { return target.y - (targetY - startY); },
                    alpha: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: function() {
                        allObjects.forEach(function(obj) {
                            if (obj && obj.destroy) obj.destroy();
                        });
                        _achNotificationActive = false;
                        _processNotificationQueue(scene);
                    }
                });
            });
        }
    });
}

// --- Check Achievements ---
// Call this from game.js at key moments (level complete, coin collect, stomp, death, etc.)

function checkAchievements(scene) {
    if (!jqStats) initStats();
    if (!scene) return;

    // --- Skill achievements ---

    // Combo achievements (check maxCombo from game.js global and stats)
    var currentMaxCombo = (typeof maxCombo !== 'undefined') ? maxCombo : 0;
    if (currentMaxCombo > jqStats.maxCombo) {
        jqStats.maxCombo = currentMaxCombo;
        saveStats();
    }
    if (jqStats.maxCombo >= 5)  unlockAchievement(scene, 'combo_starter');
    if (jqStats.maxCombo >= 10) unlockAchievement(scene, 'combo_king');
    if (jqStats.maxCombo >= 15) unlockAchievement(scene, 'combo_master');

    // Flawless & Untouchable (0 deaths on level completion)
    // These are checked when called after level completion
    // deathsThisLevel tracks hits taken this level attempt
    if (jqStats.deathsThisLevel === 0 && jqStats.levelsCompleted.length > 0) {
        unlockAchievement(scene, 'flawless');
        unlockAchievement(scene, 'untouchable');
    }

    // Speed Demon (beat any level in < 20s)
    if (typeof levelTimer !== 'undefined' && typeof levelComplete !== 'undefined' && levelComplete) {
        if (levelTimer < 20000) {
            unlockAchievement(scene, 'speed_demon');
        }
    }

    // Air Master (5 wall jumps in one level)
    if (jqStats.wallJumpsThisLevel >= 5) {
        unlockAchievement(scene, 'air_master');
    }

    // Dash Master (50 dashes total)
    if (jqStats.totalDashes >= 50) {
        unlockAchievement(scene, 'dash_master');
    }

    // --- Cumulative achievements ---

    if (jqStats.totalCoins >= 100)   unlockAchievement(scene, 'coin_collector');
    if (jqStats.totalCoins >= 500)   unlockAchievement(scene, 'midas_touch');
    if (jqStats.totalCoins >= 1000)  unlockAchievement(scene, 'gold_hoarder');

    if (jqStats.totalStomps >= 50)   unlockAchievement(scene, 'exterminator');
    if (jqStats.totalStomps >= 100)  unlockAchievement(scene, 'centurion');

    if (jqStats.totalDeaths >= 50)   unlockAchievement(scene, 'determined');
    if (jqStats.totalDeaths >= 100)  unlockAchievement(scene, 'never_give_up');

    if (jqStats.totalPlayTime >= 1800) unlockAchievement(scene, 'marathon_runner'); // 30 min in seconds

    // --- Progression achievements ---

    if (jqStats.levelsCompleted.indexOf(0) !== -1) unlockAchievement(scene, 'first_steps');
    if (jqStats.levelsCompleted.indexOf(4) !== -1) unlockAchievement(scene, 'halfway_there');
    if (jqStats.levelsCompleted.indexOf(9) !== -1) unlockAchievement(scene, 'champion');

    // Star-based achievements (uses getTotalStars from menu.js)
    if (typeof getTotalStars === 'function') {
        var totalStars = getTotalStars();
        if (totalStars >= 15) unlockAchievement(scene, 'star_collector');
        if (totalStars >= 30) unlockAchievement(scene, 'perfectionist');
    }

    // --- Secret achievements ---

    // Ascetic: complete a level with 0 coins
    if (typeof levelComplete !== 'undefined' && levelComplete) {
        if (typeof coinsCollected !== 'undefined' && coinsCollected === 0) {
            unlockAchievement(scene, 'ascetic');
        }
    }

    // Wrong Way and Patience are checked via updateAchievementTimers()
}

// --- Per-frame timer updates for secret achievements ---
// Call this from update() in game.js

function updateAchievementTimers(scene, delta) {
    if (!jqStats || !scene) return;
    if (typeof player === 'undefined' || !player || typeof gameOver === 'undefined') return;
    if (gameOver || (typeof levelComplete !== 'undefined' && levelComplete)) return;
    if (typeof isPaused !== 'undefined' && isPaused) return;

    var deltaS = delta / 1000;

    // Track total play time
    jqStats.totalPlayTime += deltaS;
    // Save periodically (every ~5 seconds worth of accumulated time)
    if (Math.floor(jqStats.totalPlayTime) % 5 === 0) {
        saveStats();
    }

    // Check marathon runner
    if (jqStats.totalPlayTime >= 1800) {
        unlockAchievement(scene, 'marathon_runner');
    }

    var px = player.x;
    var py = player.y;

    // --- Wrong Way: walk left for 5 seconds at level start ---
    if (typeof currentLevel !== 'undefined' && currentLevel && typeof levelTimer !== 'undefined') {
        // Only track during the first 15 seconds of the level
        if (levelTimer < 15000) {
            var isMovingLeft = (typeof cursors !== 'undefined' && cursors.left.isDown) ||
                               (typeof touchLeft !== 'undefined' && touchLeft);
            if (isMovingLeft && player.body && player.body.velocity.x < -10) {
                _achLeftWalkTimer += deltaS;
            } else {
                _achLeftWalkTimer = Math.max(0, _achLeftWalkTimer - deltaS * 0.5); // decay slowly
            }
            if (_achLeftWalkTimer >= 5) {
                unlockAchievement(scene, 'wrong_way');
            }
        }
    }

    // --- Patience: wait 30 seconds without moving ---
    if (player.body) {
        var speed = Math.abs(player.body.velocity.x) + Math.abs(player.body.velocity.y);
        // Consider "not moving" if essentially stationary (allow tiny drift from gravity settle)
        if (speed < 5 && player.body.blocked.down) {
            _achIdleTimer += deltaS;
        } else {
            _achIdleTimer = 0;
        }
        if (_achIdleTimer >= 30) {
            unlockAchievement(scene, 'patience');
            _achIdleTimer = 0; // prevent re-triggering notification
        }
    }
}

// --- Lucky Break Detection ---
// Call this from hitEnemy() in game.js when the player gets hit
// at 1 life remaining and has a checkpoint near the flag

function checkLuckyBreak(scene) {
    if (!scene) return;
    if (typeof lives === 'undefined' || typeof lastCheckpoint === 'undefined') return;
    if (typeof currentLevel === 'undefined' || !currentLevel) return;

    // Player must be on their last life (1 remaining, about to die means lives was 1 before decrement)
    // This should be called BEFORE lives is decremented, or check for lives === 0 after decrement
    // We check lives === 0 (just decremented to 0 = game over scenario)
    // But the achievement is about surviving: hit at 1 life but respawn at checkpoint before flag
    // So check: lives === 1 (still has 1 life, will respawn) and checkpoint is near flag
    if (lives === 1 && lastCheckpoint) {
        var flagPos = currentLevel.flagPosition;
        if (flagPos) {
            var dx = Math.abs(lastCheckpoint.x - flagPos.x);
            // "Right before the flag" = within 400px
            if (dx < 400) {
                unlockAchievement(scene, 'lucky_break');
            }
        }
    }
}

// --- Reset per-level trackers ---
// Call this at the start of each level (in create() or resetLevel())

function resetLevelAchievementTrackers() {
    if (!jqStats) initStats();
    jqStats.wallJumpsThisLevel = 0;
    jqStats.deathsThisLevel = 0;
    _achLeftWalkTimer = 0;
    _achIdleTimer = 0;
    _achLevelStarted = false;
    saveStats();
}

// --- Record level completion in stats ---
// Call this from reachEnd() in game.js

function recordLevelCompletion(levelIndex) {
    if (!jqStats) initStats();
    if (jqStats.levelsCompleted.indexOf(levelIndex) === -1) {
        jqStats.levelsCompleted.push(levelIndex);
    }
    saveStats();
}

// --- Achievement Gallery ---
// Creates an overlay showing all achievements. Uses menuObjects for cleanup.

function showAchievementGallery(scene) {
    if (typeof menuObjects === 'undefined') return;

    // Clear existing menu objects
    if (typeof clearMenuObjects === 'function') {
        clearMenuObjects();
    }

    if (!jqUnlockedAchievements) initStats();

    var unlockedCount = jqUnlockedAchievements.length;
    var totalCount = ACHIEVEMENTS.length;

    // Dark background
    var bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    bg.setScrollFactor(0).setDepth(2000);
    menuObjects.push(bg);

    // Title
    var title = scene.add.text(400, 35, 'ACHIEVEMENTS', {
        fontSize: '32px', fill: '#ffd700', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Count
    var countText = scene.add.text(400, 68, unlockedCount + '/' + totalCount + ' Achievements Unlocked', {
        fontSize: '14px', fill: '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(countText);

    // Scrollable list area
    var listStartY = 95;
    var itemHeight = 52;
    var visibleItems = 9;
    var scrollOffset = 0;
    var maxScroll = Math.max(0, ACHIEVEMENTS.length - visibleItems);

    // Clipping mask area
    var maskY = listStartY;
    var maskHeight = visibleItems * itemHeight;

    // Create a container for the list items
    var listItems = [];

    function renderList() {
        // Destroy old list items
        listItems.forEach(function(items) {
            items.forEach(function(obj) { if (obj && obj.destroy) obj.destroy(); });
        });
        listItems = [];

        for (var i = 0; i < visibleItems && (i + scrollOffset) < ACHIEVEMENTS.length; i++) {
            var achIndex = i + scrollOffset;
            var ach = ACHIEVEMENTS[achIndex];
            var isUnlocked = jqUnlockedAchievements.indexOf(ach.id) !== -1;
            var isHidden = ach.hidden && !isUnlocked;
            var yPos = maskY + i * itemHeight + itemHeight / 2;

            var rowItems = [];

            // Row background (alternating)
            var rowBg = scene.add.rectangle(400, yPos, 700, itemHeight - 4,
                achIndex % 2 === 0 ? 0x1a1a2e : 0x151528, isUnlocked ? 0.9 : 0.5);
            rowBg.setScrollFactor(0).setDepth(2001);
            if (isUnlocked) {
                rowBg.setStrokeStyle(1, 0x333355);
            }
            rowItems.push(rowBg);
            menuObjects.push(rowBg);

            // Icon
            var iconStr = isHidden ? '\u{1F512}' : ach.icon;
            var icon = scene.add.text(70, yPos, iconStr, {
                fontSize: '24px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
            rowItems.push(icon);
            menuObjects.push(icon);

            // Name
            var displayName = isHidden ? '???' : ach.name;
            var nameColor = isUnlocked ? '#ffd700' : '#666';
            var achName = scene.add.text(100, yPos - 10, displayName, {
                fontSize: '15px', fill: nameColor, fontStyle: isUnlocked ? 'bold' : 'normal'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
            rowItems.push(achName);
            menuObjects.push(achName);

            // Description
            var displayDesc = isHidden ? 'Hidden achievement' : ach.desc;
            var descColor = isUnlocked ? '#ccc' : '#555';
            var achDesc = scene.add.text(100, yPos + 10, displayDesc, {
                fontSize: '12px', fill: descColor
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
            rowItems.push(achDesc);
            menuObjects.push(achDesc);

            // Unlocked indicator
            if (isUnlocked) {
                var check = scene.add.text(720, yPos, '\u2713', {
                    fontSize: '20px', fill: '#00ff00', fontStyle: 'bold'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
                rowItems.push(check);
                menuObjects.push(check);
            }

            listItems.push(rowItems);
        }
    }

    renderList();

    // Scroll indicators
    var upArrow = scene.add.text(400, maskY - 8, '\u25B2  Scroll Up', {
        fontSize: '12px', fill: '#666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    menuObjects.push(upArrow);

    var downArrow = scene.add.text(400, maskY + maskHeight + 8, '\u25BC  Scroll Down', {
        fontSize: '12px', fill: '#666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    menuObjects.push(downArrow);

    function updateScrollIndicators() {
        upArrow.setAlpha(scrollOffset > 0 ? 1 : 0.2);
        downArrow.setAlpha(scrollOffset < maxScroll ? 1 : 0.2);
    }
    updateScrollIndicators();

    // Scroll up button
    upArrow.setInteractive({ useHandCursor: true });
    upArrow.on('pointerup', function() {
        if (scrollOffset > 0) {
            scrollOffset--;
            renderList();
            updateScrollIndicators();
        }
    });

    // Scroll down button
    downArrow.setInteractive({ useHandCursor: true });
    downArrow.on('pointerup', function() {
        if (scrollOffset < maxScroll) {
            scrollOffset++;
            renderList();
            updateScrollIndicators();
        }
    });

    // Mouse wheel scrolling
    var wheelHandler = function(pointer, gameObjects, deltaX, deltaY) {
        if (deltaY > 0 && scrollOffset < maxScroll) {
            scrollOffset++;
            renderList();
            updateScrollIndicators();
        } else if (deltaY < 0 && scrollOffset > 0) {
            scrollOffset--;
            renderList();
            updateScrollIndicators();
        }
    };
    scene.input.on('wheel', wheelHandler);

    // Close button
    var closeBtn = scene.add.text(400, 565, 'CLOSE', {
        fontSize: '20px', fill: '#fff', backgroundColor: '#c00',
        padding: { x: 30, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', function() { closeBtn.setStyle({ backgroundColor: '#f00' }); });
    closeBtn.on('pointerout', function() { closeBtn.setStyle({ backgroundColor: '#c00' }); });
    closeBtn.on('pointerup', function() {
        scene.input.off('wheel', wheelHandler);
        // Clean up all gallery objects via menuObjects
        if (typeof clearMenuObjects === 'function') {
            clearMenuObjects();
        }
        // Return to main menu
        if (typeof showMainMenu === 'function') {
            showMainMenu(scene);
        }
    });
    menuObjects.push(closeBtn);
}
