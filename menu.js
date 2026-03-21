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
    bg.setScrollFactor(0).setDepth(2000);
    menuObjects.push(bg);

    // Title
    const title = scene.add.text(400, 100, 'JUMP QUEST', {
        fontSize: '56px', fill: '#ffdd00', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Subtitle
    const sub = scene.add.text(400, 160, 'A Platformer Adventure', {
        fontSize: '18px', fill: '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(sub);

    // Total stars
    const totalStars = getTotalStars();
    const starText = scene.add.text(400, 200, `Total Stars: ${totalStars}/30`, {
        fontSize: '16px', fill: '#ffd700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(starText);

    // Play button
    const playBtn = createMenuButton(scene, 400, 290, 'PLAY', '#0a0', '#0c0', () => {
        clearMenuObjects();
        showingMenu = false;
        // Start from first unlocked incomplete level
        let startLevel = 0;
        for (let i = 0; i < levels.length; i++) {
            if (!completedLevels['level' + i]) { startLevel = i; break; }
            startLevel = i;
        }
        currentLevelIndex = startLevel;
        scene.scene.restart();
    });

    // Level Select button
    const selectBtn = createMenuButton(scene, 400, 370, 'LEVEL SELECT', '#06a', '#08c', () => {
        clearMenuObjects();
        showLevelSelect(scene);
    });

    // Controls info
    const controls = scene.add.text(400, 470, [
        'Controls:',
        'Arrow Keys - Move    |    Space - Jump',
        'Shift - Dash    |    Wall Jump - Jump off walls',
        'ESC - Pause'
    ].join('\n'), {
        fontSize: '13px', fill: '#888', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(controls);
}

function showLevelSelect(scene) {
    showingMenu = false;
    showingLevelSelect = true;
    clearMenuObjects();

    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
    bg.setScrollFactor(0).setDepth(2000);
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
                scene.scene.restart();
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
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: hoverColor }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: bgColor }));
    btn.on('pointerup', callback);
    menuObjects.push(btn);
    return btn;
}

function clearMenuObjects() {
    menuObjects.forEach(obj => obj.destroy());
    menuObjects = [];
}
