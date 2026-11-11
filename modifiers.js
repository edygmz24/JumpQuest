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

            const timeUpText = scene.add.text(400, 250, 'TIME UP!', {
                fontSize: '48px', fill: '#ff0000',
                backgroundColor: '#000', padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

            const restartButton = scene.add.text(400, 370, 'RESTART LEVEL', {
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

    const T = UI.theme;
    const CX = VIEW_W / 2;
    const s = UI.screen(scene, {
        id: 'modifiers', depth: T.depth.menu, backdrop: 'solid',
        onBack: () => s.close(() => { clearMenuObjects(); showMainMenu(scene); }),
        // Down from the mode tabs goes to the first switch; Left / Right move
        // between the two panels on the same row
        onKey: (event) => {
            const f = s.focused;
            if (!f) return false;
            if (event.key === 'ArrowDown' && tabs && f === tabs.record) {
                s.setFocus(colToggles[modifierMode === 'hardcore' ? 1 : 0][0]);
                return true;
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                for (let c = 0; c < 2; c++) {
                    const idx = colToggles[c].findIndex(t => t.record === f);
                    if (idx === -1) continue;
                    const other = colToggles[1 - c];
                    s.setFocus(other[Math.min(idx, other.length - 1)]);
                    return true;
                }
            }
            return false;
        }
    });
    const colToggles = [[], []];
    let tabs = null;

    s.title(CX, 42, 'DIFFICULTY MODIFIERS', { ribbon: true });

    // Mode selector: the active mode is the highlighted tab
    const modes = ['normal', 'assist', 'hardcore'];
    const modeLabels = { normal: 'NORMAL', assist: 'ASSIST', hardcore: 'HARDCORE' };
    const modeDescs = {
        normal: 'No modifiers active. Standard gameplay.',
        assist: 'Select assist options to make the game easier.',
        hardcore: 'Select hardcore options for an extra challenge.'
    };
    const descText = s.label(CX, 136, modeDescs[modifierMode] || modeDescs.normal, { style: 'small' });
    tabs = s.tabs(CX, 98, modes.map(m => modeLabels[m]), Math.max(0, modes.indexOf(modifierMode)), (i) => {
        setModifierMode(modes[i]);
        descText.setText(modeDescs[modifierMode]);
    }, { default: true });

    // Two panels; each modifier is a switch with its description under it
    const PW = 470, ROW = 60, TW = PW - 40;
    const panelTop = 160, firstY = panelTop + 64;
    const rows = Math.max(Object.keys(ASSIST_MODIFIERS).length, Object.keys(HARDCORE_MODIFIERS).length);
    const panelH = 64 + rows * ROW - 8;
    const columns = [
        { mode: 'assist', header: 'ASSIST', accent: 'go', x: CX - 255, mods: ASSIST_MODIFIERS },
        { mode: 'hardcore', header: 'HARDCORE', accent: 'danger', x: CX + 255, mods: HARDCORE_MODIFIERS }
    ];
    columns.forEach((col, c) => {
        s.panel(col.x, panelTop + panelH / 2, PW, panelH, { header: col.header, accent: col.accent });
        Object.keys(col.mods).forEach((key, i) => {
            const mod = col.mods[key];
            const y = firstY + i * ROW;
            const on = activeModifiers[col.mode].indexOf(key) !== -1;
            colToggles[c].push(s.toggle(col.x, y, mod.name, on, () => toggleModifier(col.mode, key), { width: TW }));
            s.label(col.x - TW / 2 + 16, y + 29, mod.desc, { style: 'small', align: 'left' });
        });
    });

    // Hardcore completion status
    if (isHardcoreComplete()) {
        s.label(columns[1].x, panelTop + panelH + 18, 'ALL HARDCORE COMPLETE!', { style: 'body', color: 'gold', outline: true });
    }

    s.button(CX, 541, 'Back', { role: 'neutral', size: 'sm', icon: 'back', onClick: () => s.onBack() });
    s.hintBar([['←↑↓→', 'Move'], ['←→', 'Mode'], ['ENTER', 'Toggle'], ['ESC', 'Back']]);
    s.open();
    menuObjects.push({ destroy: () => s.destroy() });
}

function isHardcoreComplete() {
    var data = JSON.parse(localStorage.getItem('jqHardcoreComplete')) || {};
    // Check if all 10 levels beaten with all hardcore modifiers active
    for (var i = 0; i < CAMPAIGN_LEVELS.length; i++) {
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
