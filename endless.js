// ========================
// JumpQuest Endless / Survival Mode
// Procedurally generated platforming with one life.
// Score = distance + coins (with combo system from game.js).
// ========================

// --- Globals ---
let endlessMode = false;
let endlessDistance = 0;
let endlessBest = parseInt(localStorage.getItem('jqEndlessBest')) || 0;
let endlessSeed = 0;
let endlessChunkIndex = 0;
let endlessLastGeneratedX = 0;
let endlessDistanceText = null;

// Internal tracking arrays for cleanup
let endlessObjects = [];       // { body, rect, type } — every spawned object
let endlessPlatformRects = []; // visual rects for platforms (no body tracking needed, static group)
let endlessCoinsCollected = 0;

// ========================
// Seeded PRNG (mulberry32)
// ========================

let _endlessSeedState = 0;

function endlessRandom() {
    _endlessSeedState |= 0;
    _endlessSeedState = (_endlessSeedState + 0x6D2B79F5) | 0;
    let t = Math.imul(_endlessSeedState ^ (_endlessSeedState >>> 15), 1 | _endlessSeedState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function endlessRandomRange(min, max) {
    return min + endlessRandom() * (max - min);
}

function endlessRandomInt(min, max) {
    return Math.floor(endlessRandomRange(min, max + 1));
}

// ========================
// Start Endless Mode
// ========================

function startEndlessMode(scene) {
    endlessMode = true;
    endlessDistance = 0;
    endlessChunkIndex = 0;
    endlessLastGeneratedX = 0;
    endlessObjects = [];
    endlessPlatformRects = [];
    endlessCoinsCollected = 0;

    // Seed from today's date so all players share the same daily layout
    endlessSeed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    _endlessSeedState = endlessSeed;

    // Set one life for endless mode
    lives = 1;
    if (livesText) livesText.setText('Lives: ❤');

    // Extend world bounds far to the right
    scene.physics.world.setBounds(0, 0, 999999, 600);
    scene.cameras.main.setBounds(0, 0, 999999, 600);

    // Distance HUD (top center)
    endlessDistanceText = scene.add.text(400, 10, 'Distance: 0m | Best: ' + endlessBest + 'm', {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    // Generate initial ground for first screen
    generateEndlessGround(scene, 0, 2400);

    // Generate first 6 chunks (2400px)
    for (let i = 0; i < 6; i++) {
        generateEndlessChunk(scene, i * 400);
    }
    endlessLastGeneratedX = 2400;
}

// ========================
// Generate ground tiles for a range
// ========================

function generateEndlessGround(scene, fromX, toX) {
    const startSection = Math.floor(fromX / 400);
    const endSection = Math.ceil(toX / 400);
    for (let i = startSection; i < endSection; i++) {
        const gx = 200 + i * 400;
        const gBody = platforms.create(gx, 580, null).setDisplaySize(400, 40).refreshBody();
        const gRect = scene.add.rectangle(gx, 580, 400, 40, 0x555555);
        endlessPlatformRects.push({ body: gBody, rect: gRect, x: gx });
    }
}

// ========================
// Generate one chunk (~400px)
// ========================

function generateEndlessChunk(scene, startX) {
    endlessChunkIndex++;

    // Difficulty ramps from 0 to 1 over 50 chunks
    const diff = Math.min(endlessChunkIndex / 50, 1);

    // --- Platforms ---
    const numPlatforms = endlessRandomInt(1, 3);
    const platformWidth = Math.max(60, Math.round(200 - diff * 100));
    const gap = 60 + diff * 80;

    for (let i = 0; i < numPlatforms; i++) {
        const px = startX + endlessRandomRange(40, 360);
        const py = endlessRandomRange(350, 520);
        const pw = platformWidth + endlessRandomRange(-20, 30);
        const ph = endlessRandomRange(16, 24);

        const pBody = platforms.create(px, py, null).setDisplaySize(pw, ph).refreshBody();
        const pRect = scene.add.rectangle(px, py, pw, ph, 0x7a5230);
        endlessPlatformRects.push({ body: pBody, rect: pRect, x: px });
    }

    // --- Coins ---
    const numCoins = endlessRandomInt(2, 5);
    for (let i = 0; i < numCoins; i++) {
        const cx = startX + endlessRandomRange(30, 370);
        const cy = endlessRandomRange(280, 540);

        const coin = coins.create(cx, cy, null).setDisplaySize(20, 20).refreshBody();
        const coinRect = scene.add.rectangle(cx, cy, 20, 20, 0xffd700);
        coinRects.push({ rect: coinRect, body: coin });
        endlessObjects.push({ body: coin, rect: coinRect, type: 'coin', x: cx });
    }

    // --- Enemies ---
    const spawnProb = 0.1 + diff * 0.5;
    if (endlessRandom() < spawnProb) {
        // Pick enemy type based on difficulty
        let enemyType;
        const roll = endlessRandom();
        if (diff < 0.2) {
            enemyType = 'walker';
        } else if (diff < 0.5) {
            enemyType = roll < 0.6 ? 'walker' : 'jumper';
        } else if (diff < 0.8) {
            if (roll < 0.35) enemyType = 'walker';
            else if (roll < 0.65) enemyType = 'jumper';
            else enemyType = 'flyer';
        } else {
            if (roll < 0.25) enemyType = 'walker';
            else if (roll < 0.45) enemyType = 'jumper';
            else if (roll < 0.70) enemyType = 'flyer';
            else enemyType = 'shooter';
        }

        const config = ENEMY_TYPES[enemyType];
        const ex = startX + endlessRandomRange(60, 340);
        const ey = enemyType === 'flyer' ? endlessRandomRange(250, 400) : 550;
        const size = 28;
        const height = enemyType === 'jumper' ? 40 : size;

        const enemy = enemies.create(ex, ey, null).setDisplaySize(size, height);
        const enemyRect = scene.add.rectangle(ex, ey, size, height, config.color);

        enemy.setBounce(0);
        enemy.setCollideWorldBounds(false);
        enemy.body.allowGravity = (enemyType !== 'flyer');
        enemy.enemyType = enemyType;
        enemy.hp = 1;
        enemy.lastJump = 0;
        enemy.lastShot = 0;
        enemy.startY = ey;

        enemyRects.push({ rect: enemyRect, body: enemy });
        endlessObjects.push({ body: enemy, rect: enemyRect, type: 'enemy', x: ex });
    }

    // --- Obstacles (spikes) at diff > 0.3 ---
    if (diff > 0.3 && endlessRandom() < (0.1 + diff * 0.2)) {
        const ox = startX + endlessRandomRange(80, 320);
        const oy = 560; // on top of ground

        const spike = obstacles.create(ox, oy, null).setDisplaySize(30, 30).refreshBody();
        const spikeRect = scene.add.rectangle(ox, oy, 30, 30, 0xff0000);
        endlessObjects.push({ body: spike, rect: spikeRect, type: 'obstacle', x: ox });
    }

    // --- Power-ups every 15-20 chunks ---
    if (endlessChunkIndex > 0 && endlessChunkIndex % endlessRandomInt(15, 20) === 0) {
        const types = ['speed', 'doubleJump', 'invincibility', 'highJump'];
        const puType = types[endlessRandomInt(0, types.length - 1)];
        const puConfig = POWERUP_TYPES[puType];
        const pux = startX + endlessRandomRange(80, 320);
        const puy = endlessRandomRange(300, 480);

        const pu = powerUps.create(pux, puy, null).setDisplaySize(25, 25).refreshBody();
        pu.powerUpType = puType;
        const puRect = scene.add.rectangle(pux, puy, 25, 25, puConfig.color);
        puRect.setStrokeStyle(2, 0xffffff);
        powerUpRects.push({ rect: puRect, body: pu });
        endlessObjects.push({ body: pu, rect: puRect, type: 'powerup', x: pux });
    }
}

// ========================
// Update (called every frame from game.js update loop)
// ========================

function updateEndlessMode(scene) {
    if (!endlessMode || gameOver || levelComplete) return;

    // Update distance
    endlessDistance = Math.max(endlessDistance, Math.floor(player.x / 10));
    if (endlessDistanceText) {
        endlessDistanceText.setText('Distance: ' + endlessDistance + 'm | Best: ' + endlessBest + 'm');
    }

    // Generate new chunks as player approaches the edge
    if (player.x > endlessLastGeneratedX - 800) {
        // Extend ground
        generateEndlessGround(scene, endlessLastGeneratedX, endlessLastGeneratedX + 800);
        // Generate two new chunks
        generateEndlessChunk(scene, endlessLastGeneratedX);
        generateEndlessChunk(scene, endlessLastGeneratedX + 400);
        endlessLastGeneratedX += 800;
    }

    // Cleanup objects far behind the player (memory management)
    const cleanupThreshold = player.x - 1200;
    cleanupEndlessObjects(cleanupThreshold);

    // Check if player fell off the screen
    if (player.y > 600) {
        endEndlessMode(scene);
    }
}

// ========================
// Cleanup offscreen objects
// ========================

function cleanupEndlessObjects(thresholdX) {
    // Clean up tracked endless objects (coins, enemies, obstacles, powerups)
    for (let i = endlessObjects.length - 1; i >= 0; i--) {
        const obj = endlessObjects[i];
        // Use current body position if available, otherwise stored x
        const objX = (obj.body && obj.body.x) ? obj.body.x : obj.x;
        if (objX < thresholdX) {
            // Remove from physics group
            if (obj.body && obj.body.active !== false) {
                obj.body.destroy();
            }
            // Remove visual rect
            if (obj.rect && obj.rect.active !== false) {
                obj.rect.destroy();
            }
            // Also remove from game.js tracking arrays
            if (obj.type === 'coin') {
                const idx = coinRects.findIndex(cr => cr.body === obj.body);
                if (idx !== -1) coinRects.splice(idx, 1);
            } else if (obj.type === 'enemy') {
                const idx = enemyRects.findIndex(er => er.body === obj.body);
                if (idx !== -1) enemyRects.splice(idx, 1);
            } else if (obj.type === 'powerup') {
                const idx = powerUpRects.findIndex(pr => pr.body === obj.body);
                if (idx !== -1) powerUpRects.splice(idx, 1);
            }
            endlessObjects.splice(i, 1);
        }
    }

    // Clean up platform rects and bodies
    for (let i = endlessPlatformRects.length - 1; i >= 0; i--) {
        const p = endlessPlatformRects[i];
        if (p.x < thresholdX) {
            if (p.body && p.body.active !== false) p.body.destroy();
            if (p.rect && p.rect.active !== false) p.rect.destroy();
            endlessPlatformRects.splice(i, 1);
        }
    }
}

// ========================
// End Endless Mode (death)
// ========================

function endEndlessMode(scene) {
    gameOver = true;
    scene.physics.pause();

    if (typeof stopBackgroundMusic === 'function') stopBackgroundMusic();
    playSound('gameOver');

    // Save best distance
    const isNewBest = endlessDistance > endlessBest;
    if (isNewBest) {
        endlessBest = endlessDistance;
        localStorage.setItem('jqEndlessBest', endlessBest.toString());
    }

    // Overlay background
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();

    // Title
    const title = scene.add.text(400, 120, 'ENDLESS MODE OVER', {
        fontSize: '40px', fill: '#ff4444', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Stats
    const bestLabel = isNewBest ? ' NEW BEST!' : '';
    const statsLines = [
        'Distance: ' + endlessDistance + 'm' + bestLabel,
        'Best: ' + endlessBest + 'm',
        'Coins: ' + coinsCollected,
        'Max Combo: ' + maxCombo + 'x'
    ];
    const statsText = scene.add.text(400, 250, statsLines.join('\n'), {
        fontSize: '22px', fill: '#fff', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // New best highlight
    if (isNewBest) {
        const newBestText = scene.add.text(400, 170, 'NEW RECORD!', {
            fontSize: '24px', fill: '#ffd700', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
        // Pulse animation
        scene.tweens.add({
            targets: newBestText,
            scaleX: 1.2, scaleY: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    // Try Again button
    const retryBtn = scene.add.text(400, 400, 'TRY AGAIN', {
        fontSize: '24px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#0a0', padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerover', () => retryBtn.setStyle({ backgroundColor: '#0c0' }));
    retryBtn.on('pointerout', () => retryBtn.setStyle({ backgroundColor: '#0a0' }));
    retryBtn.on('pointerup', () => {
        endlessMode = true; // keep endless flag on for restart
        cleanupEndlessMode();
        scene.scene.restart();
    });

    // Main Menu button
    const menuBtn = scene.add.text(400, 470, 'MAIN MENU', {
        fontSize: '24px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#444', padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#666' }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#444' }));
    menuBtn.on('pointerup', () => {
        cleanupEndlessMode();
        endlessMode = false;
        showingMenu = true;
        scene.scene.restart();
    });
}

// ========================
// Cleanup all endless state
// ========================

function cleanupEndlessMode() {
    endlessDistance = 0;
    endlessChunkIndex = 0;
    endlessLastGeneratedX = 0;
    endlessObjects = [];
    endlessPlatformRects = [];
    endlessCoinsCollected = 0;
    endlessDistanceText = null;
    _endlessSeedState = 0;
}

// ========================
// Integration Points (document only — do not modify other files)
// ========================

// In game.js update() function, add after existing update logic:
//   if (endlessMode && typeof updateEndlessMode === 'function') updateEndlessMode.call(this, this);

// In game.js create() function, after loadLevel(currentLevelIndex), add:
//   if (endlessMode && typeof startEndlessMode === 'function') startEndlessMode.call(this, this);

// In menu.js showMainMenu(), add an "ENDLESS MODE" button:
//   const endlessBtn = createMenuButton(scene, 400, 330, 'ENDLESS MODE', '#806', '#a08', () => {
//       endlessMode = true;
//       currentLevelIndex = 0;
//       clearMenuObjects();
//       showingMenu = false;
//       scene.scene.restart();
//   });

// In index.html, add before </body>:
//   <script src="endless.js"></script>
// (must be after game.js and menu.js)
