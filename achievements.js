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
    { id: 'wave_rider',     name: 'Wave Rider',      desc: 'Perform your first wavedash',             icon: '\u{1F30A}', hidden: false },
    { id: 'wave_master',    name: 'Wave Master',     desc: 'Perform 25 wavedashes total',             icon: '\u{1F3C4}', hidden: false },
    { id: 'ground_control', name: 'Ground Control',  desc: 'Land your first ground pound',            icon: '\u{1F4AB}', hidden: false },
    { id: 'seismic',        name: 'Seismic',         desc: 'Land 25 ground pounds total',             icon: '\u{1F30B}', hidden: false },
    { id: 'in_the_zone',    name: 'In the Zone',     desc: 'Reach the HOT flow tier',                 icon: '\u{1F525}', hidden: false },
    { id: 'flow_state',     name: 'Flow State',      desc: 'Reach the ON FIRE flow tier',             icon: '\u{26A1}',  hidden: false },

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
            totalWavedashes: 0,
            totalGroundPounds: 0,
            highestFlowTier: 0,
            levelsCompleted: [],
            wallJumpsThisLevel: 0,
            deathsThisLevel: 0
        };
    }
    // Ensure all keys exist (forward-compatibility)
    const defaults = {
        totalCoins: 0, totalStomps: 0, totalDashes: 0, totalWallJumps: 0,
        totalDeaths: 0, totalPlayTime: 0, maxCombo: 0,
        totalWavedashes: 0, totalGroundPounds: 0, highestFlowTier: 0,
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
// A kit toast (ui.js). Same cadence as before: about 400 ms in, 2.5 s held,
// out, and only then the next queued unlock shows (one at a time).

var _ACH_TOAST_IN = 400, _ACH_TOAST_HOLD = 2500, _ACH_TOAST_OUT = 400;

function showAchievementNotification(scene, achievement) {
    // Play sound if available
    if (typeof playAchievementSound === 'function') {
        playAchievementSound();
    }

    UI.toast(scene, {
        icon: 'trophy',
        title: 'Achievement Unlocked!',
        body: achievement.name,
        duration: _ACH_TOAST_IN + _ACH_TOAST_HOLD
    });

    scene.time.delayedCall(_ACH_TOAST_IN + _ACH_TOAST_HOLD + _ACH_TOAST_OUT, function() {
        _achNotificationActive = false;
        _processNotificationQueue(scene);
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
    if (jqStats.totalWavedashes >= 1)  unlockAchievement(scene, 'wave_rider');
    if (jqStats.totalWavedashes >= 25) unlockAchievement(scene, 'wave_master');
    if (jqStats.totalGroundPounds >= 1)  unlockAchievement(scene, 'ground_control');
    if (jqStats.totalGroundPounds >= 25) unlockAchievement(scene, 'seismic');
    if (jqStats.highestFlowTier >= 1) unlockAchievement(scene, 'in_the_zone');
    if (jqStats.highestFlowTier >= 2) unlockAchievement(scene, 'flow_state');

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

// --- Phase 6 movement/flow hooks ---

function recordWavedash(scene) {
    if (!jqStats) initStats();
    jqStats.totalWavedashes++;
    saveStats();
    unlockAchievement(scene, 'wave_rider');
    if (jqStats.totalWavedashes >= 25) unlockAchievement(scene, 'wave_master');
}

function recordGroundPound(scene) {
    if (!jqStats) initStats();
    jqStats.totalGroundPounds++;
    saveStats();
    unlockAchievement(scene, 'ground_control');
    if (jqStats.totalGroundPounds >= 25) unlockAchievement(scene, 'seismic');
}

function recordFlowTier(scene, tier) {
    if (!jqStats) initStats();
    if (tier > jqStats.highestFlowTier) {
        jqStats.highestFlowTier = tier;
        saveStats();
    }
    if (tier >= 1) unlockAchievement(scene, 'in_the_zone');
    if (tier >= 2) unlockAchievement(scene, 'flow_state');
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
// A kit screen (ui.js) listing every achievement. Uses menuObjects for cleanup.

// Kit icon shown for each achievement in the gallery (display only; the
// emoji in ACHIEVEMENTS stay as data)
var _ACH_GALLERY_ICONS = {
    combo_starter: 'bolt', combo_king: 'crown', combo_master: 'bolt', flawless: 'star',
    speed_demon: 'clock', untouchable: 'heart', air_master: 'play', dash_master: 'play',
    wave_rider: 'infinity', wave_master: 'infinity', ground_control: 'gem', seismic: 'gem',
    in_the_zone: 'sun', flow_state: 'bolt',
    coin_collector: 'coin', midas_touch: 'coin', gold_hoarder: 'trophy', exterminator: 'star',
    centurion: 'crown', determined: 'heart', never_give_up: 'heart', marathon_runner: 'clock',
    first_steps: 'play', halfway_there: 'map', champion: 'trophy', star_collector: 'star',
    perfectionist: 'crown',
    wrong_way: 'back', patience: 'clock', ascetic: 'starEmpty', lucky_break: 'heart'
};

function showAchievementGallery(scene) {
    if (typeof menuObjects === 'undefined') return;

    // Clear existing menu objects
    if (typeof clearMenuObjects === 'function') {
        clearMenuObjects();
    }

    if (!jqUnlockedAchievements) initStats();

    var unlockedCount = jqUnlockedAchievements.length;
    var totalCount = ACHIEVEMENTS.length;

    var s = UI.screen(scene, {
        id: 'achievements', depth: UI.theme.depth.menu, backdrop: 'solid',
        onBack: function() {
            s.close(function() {
                if (typeof clearMenuObjects === 'function') clearMenuObjects();
                // Return to main menu
                if (typeof showMainMenu === 'function') showMainMenu(scene);
            });
        }
    });

    s.title(VIEW_W / 2, 44, 'ACHIEVEMENTS', { ribbon: true });
    s.stat(24, 44, 'trophy', unlockedCount + ' / ' + totalCount + ' unlocked', { color: 'gold', align: 'left' });

    // Every achievement in a scrolling list: mouse wheel, Up / Down, scroll bar
    var list = s.scrollList(VIEW_W / 2, 294, 760, 404, { rowHeight: 58, gap: 8 });
    ACHIEVEMENTS.forEach(function(ach, i) {
        var isUnlocked = jqUnlockedAchievements.indexOf(ach.id) !== -1;
        var isHidden = ach.hidden && !isUnlocked;
        var row = list.addRow(isHidden ? '???' : ach.name, {
            sub: isHidden ? 'Hidden achievement' : ach.desc,
            icon: isHidden ? 'lock' : (_ACH_GALLERY_ICONS[ach.id] || 'trophy'),
            iconColor: isHidden ? UI.theme.color.iconDisabled : undefined,
            state: isUnlocked ? 'owned' : 'locked',
            default: i === 0
        });
        if (isUnlocked && row.labelText) row.labelText.setColor(UI.theme.text.gold);
    });

    s.button(VIEW_W / 2, 534, 'Close', { role: 'neutral', size: 'md', icon: 'close', onClick: function() { s.onBack(); } });
    s.hintBar([['\u2191\u2193', 'Scroll'], ['WHEEL', 'Scroll'], ['ESC', 'Back']]);
    s.open();
    menuObjects.push({ destroy: function() { s.destroy(); } });
}
