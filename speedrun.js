// ========================
// JumpQuest Speedrun Mode
// Dedicated timing, PB splits, visible ghost racing, and quick restarts.
// ========================

const SPEEDRUN_RECORDS_KEY = 'jqSpeedrunRecords';

let speedrunMode = false;
let showingSpeedrunSelect = false;
let speedrunRecords = {};
let speedrunRecordsLoaded = false;
let speedrunSplits = [];
let speedrunTimerDisplay = null;
let speedrunPbDisplay = null;
let speedrunSplitDisplay = null;
let speedrunRestarting = false;

function loadSpeedrunRecords() {
    try {
        speedrunRecords = JSON.parse(localStorage.getItem(SPEEDRUN_RECORDS_KEY)) || {};
    } catch (e) {
        speedrunRecords = {};
    }
    speedrunRecordsLoaded = true;
    return speedrunRecords;
}

function saveSpeedrunRecords() {
    localStorage.setItem(SPEEDRUN_RECORDS_KEY, JSON.stringify(speedrunRecords));
}

function getSpeedrunRecord(levelIndex) {
    if (!speedrunRecordsLoaded) loadSpeedrunRecords();
    return speedrunRecords['level' + levelIndex] || null;
}

function formatSpeedrunTime(ms) {
    if (ms === null || ms === undefined || !isFinite(ms)) return '--:--.--';
    const safeMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    const hundredths = Math.floor((safeMs % 1000) / 10);
    return minutes + ':' +
        (seconds < 10 ? '0' : '') + seconds + '.' +
        (hundredths < 10 ? '0' : '') + hundredths;
}

function formatSpeedrunDelta(ms) {
    if (ms === null || ms === undefined || !isFinite(ms)) return '';
    const sign = ms <= 0 ? '-' : '+';
    return sign + formatSpeedrunTime(Math.abs(ms));
}

function resetSpeedrunRunState() {
    speedrunSplits = [];
    speedrunTimerDisplay = null;
    speedrunPbDisplay = null;
    speedrunSplitDisplay = null;
    speedrunRestarting = false;
}

function beginSpeedrun(scene) {
    resetSpeedrunRunState();
    loadSpeedrunRecords();

    // A speedrun attempt ends on the first hit. This keeps auto-restart useful
    // and makes checkpoint comparisons consistent across attempts.
    lives = 1;
    if (livesText) livesText.setText(typeof formatLivesHUD === 'function' ? formatLivesHUD(1) : '♥');
    if (timerText) timerText.setVisible(false);

    const record = getSpeedrunRecord(currentLevelIndex);
    speedrunTimerDisplay = scene.add.text(400, 14, '0:00.00', {
        fontSize: '34px',
        fill: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1100);

    speedrunPbDisplay = scene.add.text(400, 52,
        'SPEEDRUN  •  PB ' + (record ? formatSpeedrunTime(record.time) : '--:--.--'), {
            fontSize: '12px',
            fill: '#7fdcff',
            fontFamily: 'monospace',
            backgroundColor: '#000000',
            padding: { x: 8, y: 3 }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1100);

    speedrunSplitDisplay = scene.add.text(784, 92, 'SPLITS\nNo checkpoints yet', {
        fontSize: '12px',
        fill: '#aaaaaa',
        align: 'right',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 8, y: 5 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1100);
}

function updateSpeedrunHUD(timeMs) {
    if (!speedrunMode || !speedrunTimerDisplay) return;
    speedrunTimerDisplay.setText(formatSpeedrunTime(timeMs));

    const record = getSpeedrunRecord(currentLevelIndex);
    if (record && record.time) {
        const delta = timeMs - record.time;
        speedrunTimerDisplay.setColor(delta <= 0 ? '#7dff9b' : '#ff8a8a');
    } else {
        speedrunTimerDisplay.setColor('#ffffff');
    }
}

function recordSpeedrunCheckpoint(scene, checkpointIndex, timeMs) {
    if (!speedrunMode || speedrunSplits[checkpointIndex] !== undefined) return;
    speedrunSplits[checkpointIndex] = timeMs;

    const record = getSpeedrunRecord(currentLevelIndex);
    const pbSplit = record && Array.isArray(record.splits) ? record.splits[checkpointIndex] : null;
    const delta = pbSplit === null || pbSplit === undefined ? null : timeMs - pbSplit;
    const deltaText = delta === null ? 'FIRST' : formatSpeedrunDelta(delta);
    const color = delta === null || delta <= 0 ? '#7dff9b' : '#ff8a8a';

    if (speedrunSplitDisplay) {
        const firstVisible = Math.max(0, checkpointIndex - 2);
        const rows = [];
        for (let i = firstVisible; i <= checkpointIndex; i++) {
            if (speedrunSplits[i] === undefined) continue;
            const prior = record && Array.isArray(record.splits) ? record.splits[i] : null;
            const splitDelta = prior === null || prior === undefined ? null : speedrunSplits[i] - prior;
            rows.push(
                'CP' + (i + 1) + '  ' +
                formatSpeedrunTime(speedrunSplits[i]) + '  ' +
                (splitDelta === null ? 'FIRST' : formatSpeedrunDelta(splitDelta))
            );
        }
        speedrunSplitDisplay.setText('SPLITS\n' + rows.join('\n')).setColor(color);
    }

    const popup = scene.add.text(400, 88, 'CHECKPOINT ' + (checkpointIndex + 1) + '  ' + deltaText, {
        fontSize: '18px',
        fill: color,
        fontStyle: 'bold',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200);
    scene.tweens.add({
        targets: popup,
        y: 76,
        alpha: 0,
        duration: 1100,
        ease: 'Power2',
        onComplete: () => popup.destroy()
    });
}

function completeSpeedrun(levelIndex, timeMs) {
    const key = 'level' + levelIndex;
    const previous = getSpeedrunRecord(levelIndex);
    const isNewBest = !previous || timeMs < previous.time;

    if (isNewBest) {
        speedrunRecords[key] = {
            time: Math.floor(timeMs),
            splits: speedrunSplits.map(value => Math.floor(value)),
            date: Date.now()
        };
        saveSpeedrunRecords();
    }

    return {
        isNewBest: isNewBest,
        previousTime: previous ? previous.time : null,
        time: timeMs,
        splits: speedrunSplits.slice()
    };
}

function quickRestartSpeedrun(scene) {
    if (speedrunRestarting) return;
    speedrunRestarting = true;
    gameOver = true;
    scene.physics.pause();

    const label = scene.add.text(400, 280, 'RUN RESET', {
        fontSize: '36px',
        fill: '#ff7777',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2200);

    scene.time.delayedCall(220, () => {
        if (label && label.destroy) label.destroy();
        scene.scene.restart();
    });
}

function getGhostReplayAlpha() {
    return speedrunMode ? 0.45 : 0.25;
}

function showSpeedrunLevelSelect(scene) {
    showingMenu = false;
    showingLevelSelect = false;
    showingSpeedrunSelect = true;
    speedrunMode = false;
    loadSpeedrunRecords();
    clearMenuObjects();

    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();
    menuObjects.push(bg);

    const title = scene.add.text(400, 34, 'SPEEDRUN', {
        fontSize: '34px',
        fill: '#7fdcff',
        fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    const subtitle = scene.add.text(400, 72,
        'Race your ghost • checkpoint splits • one-hit quick restart', {
            fontSize: '12px',
            fill: '#888888'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(subtitle);

    for (let i = 0; i < levels.length; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 110 + col * 145;
        const y = 160 + row * 190;
        const unlocked = isLevelUnlocked(i);
        const record = getSpeedrunRecord(i);
        const boxColor = unlocked ? 0x124d66 : 0x2a2a2a;

        const box = scene.add.rectangle(x, y, 120, 118, boxColor);
        box.setStrokeStyle(2, unlocked ? 0x55ccee : 0x444444);
        box.setScrollFactor(0).setDepth(2001);
        menuObjects.push(box);

        const number = scene.add.text(x, y - 34, 'LEVEL ' + (i + 1), {
            fontSize: '18px',
            fill: unlocked ? '#ffffff' : '#666666',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(number);

        const name = levels[i].name.replace(/Level \d+ - /, '');
        const nameText = scene.add.text(x, y - 8, name, {
            fontSize: '9px',
            fill: unlocked ? '#b9dce8' : '#555555',
            wordWrap: { width: 106 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(nameText);

        const pbText = scene.add.text(x, y + 30,
            unlocked ? 'PB  ' + (record ? formatSpeedrunTime(record.time) : '--:--.--') : 'LOCKED', {
                fontSize: '11px',
                fill: record ? '#7dff9b' : '#777777',
                fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(pbText);

        if (unlocked) {
            box.setInteractive({ useHandCursor: true });
            box.on('pointerover', () => box.setFillStyle(0x1d6d8c));
            box.on('pointerout', () => box.setFillStyle(boxColor));
            box.on('pointerup', () => {
                clearMenuObjects();
                currentLevelIndex = i;
                speedrunMode = true;
                showingSpeedrunSelect = false;
                showingMenu = false;
                showingLevelSelect = false;
                if (typeof endlessMode !== 'undefined') endlessMode = false;
                if (typeof dailyChallengeMode !== 'undefined') dailyChallengeMode = false;
                if (typeof restartWithTransition === 'function') restartWithTransition(scene);
                else scene.scene.restart();
            });
        }
    }

    createMenuButton(scene, 400, 545, 'BACK TO MENU', '#555555', '#777777', () => {
        showingSpeedrunSelect = false;
        speedrunMode = false;
        showMainMenu(scene);
    });
}
