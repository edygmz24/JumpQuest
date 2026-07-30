// ========================
// JumpQuest Difficulty Modifier System
// ========================

let activeModifiers = JSON.parse(localStorage.getItem('jqModifiers')) || { assist: [], hardcore: [] };
let modifierMode = 'normal'; // 'normal', 'assist', 'hardcore'

const ASSIST_MODIFIERS = {
    extraLives: { name: 'Extra Lives', desc: '5 lives instead of 3' },
    slowEnemies: { name: 'Slow Enemies', desc: 'Enemies move at half speed' },
    infiniteDash: { name: 'Infinite Dash', desc: 'No dash cooldown' },
    guidedCoins: { name: 'Guided', desc: 'Coins glow brighter to guide the path' }
};

const HARDCORE_MODIFIERS = {
    oneLife: { name: 'One Life', desc: 'Single life, no retries' },
    noCheckpoints: { name: 'No Safety Net', desc: 'Checkpoints disabled' },
    timeLimit: { name: 'Time Pressure', desc: 'Strict time limit per level' },
    fastEnemies: { name: 'Turbo Enemies', desc: 'Enemies 1.5x faster' },
    noPowerups: { name: 'No Power-ups', desc: 'Power-ups disabled' }
};

// Saved original enemy speeds so we can restore them
let _originalEnemySpeeds = null;

function setModifierMode(mode) {
    if (mode === 'normal' || mode === 'assist' || mode === 'hardcore') {
        modifierMode = mode;
    }
}

function toggleModifier(mode, key) {
    const list = activeModifiers[mode];
    if (!list) return;
    const idx = list.indexOf(key);
    if (idx === -1) {
        list.push(key);
    } else {
        list.splice(idx, 1);
    }
    localStorage.setItem('jqModifiers', JSON.stringify(activeModifiers));
}

function isModifierActive(mode, key) {
    return modifierMode === mode && activeModifiers[mode] && activeModifiers[mode].indexOf(key) !== -1;
}

function applyModifiers(scene) {
    // Save original enemy speeds on first call
    if (!_originalEnemySpeeds) {
        _originalEnemySpeeds = {};
        for (const key in ENEMY_TYPES) {
            _originalEnemySpeeds[key] = ENEMY_TYPES[key].speed;
        }
    }

    // Reset enemy speeds to originals first
    for (const key in ENEMY_TYPES) {
        ENEMY_TYPES[key].speed = _originalEnemySpeeds[key];
    }

    // --- Assist Modifiers ---
    if (isModifierActive('assist', 'extraLives')) {
        lives = 5;
        if (livesText) livesText.setText(typeof formatLivesHUD === 'function' ? formatLivesHUD(5) : '♥♥♥♥♥');
    }

    if (isModifierActive('assist', 'slowEnemies')) {
        for (const key in ENEMY_TYPES) {
            ENEMY_TYPES[key].speed = Math.floor(_originalEnemySpeeds[key] * 0.5);
        }
    }

    if (isModifierActive('assist', 'guidedCoins')) {
        // Make coin rects pulse brighter — handled in update via this flag
        // We just set a global flag here
        if (typeof coinRects !== 'undefined') {
            coinRects.forEach(function(cr) {
                if (cr && cr.setStrokeStyle) {
                    cr.setStrokeStyle(2, 0xffff00);
                }
            });
        }
    }

    // --- Hardcore Modifiers ---
    if (isModifierActive('hardcore', 'oneLife')) {
        lives = 1;
        if (livesText) livesText.setText(typeof formatLivesHUD === 'function' ? formatLivesHUD(1) : '♥');
    }

    if (isModifierActive('hardcore', 'noCheckpoints')) {
        // Disable checkpoints by clearing the group
        if (typeof checkpoints !== 'undefined' && checkpoints) {
            checkpoints.clear(true, true);
        }
        if (typeof checkpointRects !== 'undefined') {
            checkpointRects.forEach(function(cr) { if (cr && cr.destroy) cr.destroy(); });
            checkpointRects = [];
        }
        lastCheckpoint = null;
    }

    if (isModifierActive('hardcore', 'fastEnemies')) {
        for (const key in ENEMY_TYPES) {
            ENEMY_TYPES[key].speed = Math.floor(_originalEnemySpeeds[key] * 1.5);
        }
    }

    if (isModifierActive('hardcore', 'noPowerups')) {
        if (typeof powerUps !== 'undefined' && powerUps) {
            powerUps.clear(true, true);
        }
        if (typeof powerUpRects !== 'undefined') {
            powerUpRects.forEach(function(pr) { if (pr && pr.rect && pr.rect.destroy) pr.rect.destroy(); });
            powerUpRects = [];
        }
    }

    if (isModifierActive('hardcore', 'timeLimit')) {
        // Apply strict time limit — stored as a flag, checked in update
        // Uses TARGET_TIMES from menu.js with a 0.8x multiplier (stricter)
        if (typeof TARGET_TIMES !== 'undefined') {
            const limit = (TARGET_TIMES[currentLevelIndex] || 60000) * 0.8;
            scene._hardcoreTimeLimit = limit;
        }
    }
}

// Called from update() to handle ongoing modifier effects
function updateModifiers(scene, delta) {
    // Infinite dash: reset cooldown every frame
    if (isModifierActive('assist', 'infiniteDash')) {
        dashCooldown = 0;
    }

    // Guided coins: pulse effect
    if (isModifierActive('assist', 'guidedCoins') && typeof coinRects !== 'undefined') {
        const pulse = 0.6 + Math.sin(scene.time.now / 200) * 0.4;
        coinRects.forEach(function(cr) {
            if (cr && cr.setAlpha) cr.setAlpha(pulse);
        });
    }

    // Time limit enforcement
    if (isModifierActive('hardcore', 'timeLimit') && scene._hardcoreTimeLimit) {
        if (levelTimer >= scene._hardcoreTimeLimit && !gameOver && !levelComplete) {
            // Force game over
            lives = 0;
            if (livesText) livesText.setText(typeof formatLivesHUD === 'function' ? formatLivesHUD(0) : '—');
            gameOver = true;
            scene.physics.pause();
            if (typeof stopBackgroundMusic === 'function') stopBackgroundMusic();
            playSound('gameOver');

            const timeUpText = scene.add.text(scene.cameras.main.centerX, 250, 'TIME UP!', {
                fontSize: '48px', fill: '#ff0000',
                backgroundColor: '#000', padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

            const restartButton = scene.add.text(scene.cameras.main.centerX, 370, 'RESTART LEVEL', {
                fontSize: '28px', fill: '#fff',
                backgroundColor: '#444', padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
            restartButton.setInteractive({ useHandCursor: true });
            restartButton.on('pointerup', function() {
                restartWithTransition(scene);
            });
        }
    }
}

function showModifierScreen(scene) {
    clearMenuObjects();

    // Dark background
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();
    menuObjects.push(bg);

    // Title
    const title = scene.add.text(400, 30, 'DIFFICULTY MODIFIERS', {
        fontSize: '28px', fill: '#fff', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Mode selector
    const modes = ['normal', 'assist', 'hardcore'];
    const modeColors = { normal: '#888', assist: '#0a0', hardcore: '#c00' };
    const modeLabels = { normal: 'NORMAL', assist: 'ASSIST', hardcore: 'HARDCORE' };

    modes.forEach(function(mode, i) {
        const x = 200 + i * 200;
        const isActive = modifierMode === mode;
        const color = isActive ? modeColors[mode] : '#333';
        const btn = scene.add.text(x, 75, modeLabels[mode], {
            fontSize: '18px', fill: isActive ? '#fff' : '#888', fontStyle: 'bold',
            backgroundColor: color, padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerup', function() {
            setModifierMode(mode);
            clearMenuObjects();
            showModifierScreen(scene);
        });
        menuObjects.push(btn);
    });

    // Current mode description
    var modeDesc = '';
    if (modifierMode === 'normal') modeDesc = 'No modifiers active. Standard gameplay.';
    else if (modifierMode === 'assist') modeDesc = 'Select assist options to make the game easier.';
    else modeDesc = 'Select hardcore options for an extra challenge.';

    const descText = scene.add.text(400, 110, modeDesc, {
        fontSize: '13px', fill: '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(descText);

    // Two columns
    var startY = 150;
    var leftX = 200;
    var rightX = 600;

    // Assist column header
    var assistHeader = scene.add.text(leftX, startY, 'ASSIST', {
        fontSize: '20px', fill: '#0f0', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(assistHeader);

    // Hardcore column header
    var hardcoreHeader = scene.add.text(rightX, startY, 'HARDCORE', {
        fontSize: '20px', fill: '#f44', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(hardcoreHeader);

    // Assist modifiers
    var ay = startY + 40;
    for (var key in ASSIST_MODIFIERS) {
        var mod = ASSIST_MODIFIERS[key];
        var active = activeModifiers.assist.indexOf(key) !== -1;
        var checkmark = active ? '[X] ' : '[ ] ';
        var modKey = key; // closure capture

        (function(k, yPos) {
            var label = scene.add.text(leftX, yPos, checkmark + mod.name, {
                fontSize: '15px', fill: active ? '#0f0' : '#aaa', fontStyle: active ? 'bold' : 'normal'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            label.setInteractive({ useHandCursor: true });
            label.on('pointerup', function() {
                toggleModifier('assist', k);
                clearMenuObjects();
                showModifierScreen(scene);
            });
            menuObjects.push(label);

            var desc = scene.add.text(leftX, yPos + 18, mod.desc, {
                fontSize: '11px', fill: '#666'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            menuObjects.push(desc);
        })(key, ay);

        ay += 50;
    }

    // Hardcore modifiers
    var hy = startY + 40;
    for (var hkey in HARDCORE_MODIFIERS) {
        var hmod = HARDCORE_MODIFIERS[hkey];
        var hactive = activeModifiers.hardcore.indexOf(hkey) !== -1;
        var hcheckmark = hactive ? '[X] ' : '[ ] ';

        (function(k, yPos) {
            var label = scene.add.text(rightX, yPos, hcheckmark + hmod.name, {
                fontSize: '15px', fill: hactive ? '#f44' : '#aaa', fontStyle: hactive ? 'bold' : 'normal'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            label.setInteractive({ useHandCursor: true });
            label.on('pointerup', function() {
                toggleModifier('hardcore', k);
                clearMenuObjects();
                showModifierScreen(scene);
            });
            menuObjects.push(label);

            var desc = scene.add.text(rightX, yPos + 18, hmod.desc, {
                fontSize: '11px', fill: '#666'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
            menuObjects.push(desc);
        })(hkey, hy);

        hy += 50;
    }

    // Hardcore completion status
    if (isHardcoreComplete()) {
        var completeText = scene.add.text(rightX, hy + 10, 'ALL HARDCORE COMPLETE!', {
            fontSize: '14px', fill: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        menuObjects.push(completeText);
    }

    // Back button
    createMenuButton(scene, 400, 550, 'BACK TO MENU', '#666', '#888', function() {
        clearMenuObjects();
        showMainMenu(scene);
    });
}

function isHardcoreComplete() {
    var data = JSON.parse(localStorage.getItem('jqHardcoreComplete')) || {};
    // Check if all 10 levels beaten with all hardcore modifiers active
    for (var i = 0; i < 10; i++) {
        if (!data['level' + i]) return false;
    }
    return true;
}

function markHardcoreComplete(levelIndex) {
    // Only mark if ALL hardcore modifiers are active
    var allKeys = Object.keys(HARDCORE_MODIFIERS);
    var allActive = allKeys.every(function(k) {
        return activeModifiers.hardcore.indexOf(k) !== -1;
    });
    if (modifierMode === 'hardcore' && allActive) {
        var data = JSON.parse(localStorage.getItem('jqHardcoreComplete')) || {};
        data['level' + levelIndex] = true;
        localStorage.setItem('jqHardcoreComplete', JSON.stringify(data));
    }
}
