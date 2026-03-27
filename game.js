const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let playerRect;
let platforms;
let cursors;

// Touch control state (set by index.html touch buttons)
let touchLeft = false;
let touchRight = false;
let touchJump = false;
let touchDashPressed = false;
let enemies;
let enemyRects = [];
let gameOver = false;
let levelComplete = false;
let isPaused = false;
let endFlag;
let startText;
let endText;
let obstacles;
let currentLevelIndex = 0;
let currentLevel;
let pauseButton;
let pauseOverlay;

// Collectibles & Scoring
let coins;
let coinRects = [];
let score = 0;
let scoreText;
let highScores = JSON.parse(localStorage.getItem('marioHighScores')) || {};

// Checkpoints
let checkpoints;
let checkpointRects = [];
let lastCheckpoint = null;

// Timer & Best Times
let levelTimer = 0;
let timerText;
let bestTimes = JSON.parse(localStorage.getItem('marioBestTimes')) || {};

// Lives System
let lives = 3;
let livesText;

// Moving Platforms
let movingPlatforms = [];

// Physics Constants
const GROUND_ACCEL = 600;
const GROUND_DECEL = 800;
const AIR_ACCEL = 400;
const AIR_DECEL = 200;
const MAX_SPEED = 220;
const JUMP_VELOCITY = -420;
const FAST_FALL_MULTIPLIER = 1.5;
const BASE_GRAVITY = 800;
const COYOTE_TIME = 80; // ms
const JUMP_BUFFER_TIME = 100; // ms

// Player state
let coyoteTimer = 0;
let jumpBufferTimer = 0;
let wasOnGround = false;
let jumpHeld = false;
let wasJumpPressed = false;
let landingSquash = false;
let cameraOffsetX = 0;

// Power-up System
const POWERUP_TYPES = {
    speed: { color: 0x00ffff, duration: 8000, name: 'Speed Boost' },
    doubleJump: { color: 0x9900ff, duration: 15000, name: 'Double Jump' },
    invincibility: { color: 0xffffff, duration: 10000, name: 'Invincibility' },
    highJump: { color: 0x00ff00, duration: 12000, name: 'High Jump' }
};
let powerUps;
let powerUpRects = [];
let activePowerUps = { speed: false, doubleJump: false, invincibility: false, highJump: false };
let hasDoubleJumped = false;
let powerUpTimers = {};

// Enemy Types
const ENEMY_TYPES = {
    walker: { color: 0xff0000, speed: 100 },
    jumper: { color: 0xff8800, speed: 60 },
    flyer: { color: 0x8800ff, speed: 80 },
    shooter: { color: 0x880000, speed: 0 },
    shield: { color: 0x008888, speed: 80 }
};
let projectiles;
let projectileRects = [];

// Boss System
let bossActive = false;
let bossPhase = 0;
let bossHP = 9;
let bossSprite = null;
let bossRect = null;
let bossCoreRect = null;
let bossShockwave = null;
let bossShockwaveRect = null;
let bossTriggered = false;
let bossAttackTimer = 0;
let bossInvulnerable = false;
let bossArenaWall = null;
let bossArenaWallRect = null;
let bossDashing = false;
let bossDashTimer = 0;
let bossProjectiles = [];
let bossHPBar = null;
let bossHPBarBg = null;
let bossHPText = null;
let bossFlagHidden = false;

// Wall Slide / Wall Jump
let isWallSliding = false;
let wallSlideDir = 0; // -1 left, 1 right

// Dash
let dashKey;
let isDashing = false;
let dashCooldown = 0;
let canAirDash = true;
const DASH_SPEED = 400;
const DASH_DURATION = 150;
const DASH_COOLDOWN = 1000;
let dashTimer = 0;
let dashDirection = 1;
let lastFacingDir = 1;

// Breakable Blocks
let breakableBlocks;
let breakableBlockRects = [];
let totalLevelCoins = 0;
let coinsCollected = 0;

// Secret Areas
let fakeWalls = [];
let fakeWallRects = [];
let secretCoins = [];
let secretCoinRects = [];
let invisiblePlatforms = [];
let invisiblePlatformRects = [];
let secretPowerUps = [];
let secretPowerUpRects = [];

// Combo System
let comboCount = 0;
let comboTimer = 0;
let comboMultiplier = 1;
let maxCombo = 0;
let comboText;
let comboTimerBar;
let comboTimerBarBg;
const COMBO_COIN_WINDOW = 2000;   // ms to chain coins
const COMBO_STOMP_WINDOW = 3000;  // ms to chain stomps (more generous)

// Death Tracking
let deathCount = 0;
let bestDeaths = JSON.parse(localStorage.getItem('jqBestDeaths')) || {};

// Dash HUD
let dashCooldownBar;
let dashCooldownBarBg;
let dashReadyPulse = 0;

// Ghost Racing
let ghostData = [];          // recording: array of {x, y, sx, sy} per frame
let ghostReplay = null;      // loaded replay data from localStorage
let ghostSprite = null;       // ghost visual (translucent rectangle)
let ghostFrameIndex = 0;     // current frame in replay
let ghostEnabled = true;      // toggle from pause menu
let isRecordingGhost = true;  // always recording during gameplay

// Array of all levels (loaded from separate files)
let levels = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

// Check for test level from editor
let isTestMode = false;
(function checkTestLevel() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('testLevel') === 'true') {
        const testLevelData = localStorage.getItem('editorTestLevel');
        if (testLevelData) {
            try {
                const testLevel = JSON.parse(testLevelData);
                levels = [testLevel]; // Replace levels array with just the test level
                isTestMode = true;
                console.log('Loaded test level from editor:', testLevel.name);
            } catch (e) {
                console.error('Failed to parse test level:', e);
            }
        }
    }
})();

function preload() {
    // We'll use simple shapes instead of sprites for now
}

function create() {
    // Clean up moving platforms from previous session
    if (movingPlatforms && movingPlatforms.length > 0) {
        movingPlatforms.forEach(mp => {
            if (mp.sprite) mp.sprite.destroy();
            if (mp.rect) mp.rect.destroy();
        });
    }

    // Reset game state
    gameOver = false;
    levelComplete = false;
    enemyRects = [];
    coinRects = [];
    checkpointRects = [];
    lastCheckpoint = null;
    score = 0;
    levelTimer = 0;
    lives = 3;
    movingPlatforms = [];
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    wasOnGround = false;
    jumpHeld = false;
    wasJumpPressed = false;
    landingSquash = false;
    cameraOffsetX = 0;
    powerUpRects = [];
    activePowerUps = { speed: false, doubleJump: false, invincibility: false, highJump: false };
    hasDoubleJumped = false;
    powerUpTimers = {};
    projectileRects = [];
    isWallSliding = false;
    wallSlideDir = 0;
    isDashing = false;
    dashCooldown = 0;
    canAirDash = true;
    dashTimer = 0;
    lastFacingDir = 1;
    breakableBlockRects = [];
    fakeWalls = [];
    fakeWallRects = [];
    secretCoins = [];
    secretCoinRects = [];
    invisiblePlatforms = [];
    invisiblePlatformRects = [];
    secretPowerUps = [];
    secretPowerUpRects = [];
    totalLevelCoins = 0;
    coinsCollected = 0;
    comboCount = 0;
    comboTimer = 0;
    comboMultiplier = 1;
    maxCombo = 0;
    deathCount = 0;
    dashReadyPulse = 0;
    bossActive = false;
    bossPhase = 0;
    bossHP = 9;
    bossSprite = null;
    bossRect = null;
    bossCoreRect = null;
    bossShockwave = null;
    bossShockwaveRect = null;
    bossTriggered = false;
    bossAttackTimer = 0;
    bossInvulnerable = false;
    bossArenaWall = null;
    bossArenaWallRect = null;
    bossDashing = false;
    bossDashTimer = 0;
    bossProjectiles = [];
    bossHPBar = null;
    bossHPBarBg = null;
    bossHPText = null;
    bossFlagHidden = false;

    // Ghost Racing reset
    if (ghostSprite) { ghostSprite.destroy(); ghostSprite = null; }
    ghostData = [];
    ghostFrameIndex = 0;
    isRecordingGhost = true;
    // Load ghost replay for this level
    const savedGhost = localStorage.getItem('jqGhost_level' + currentLevelIndex);
    ghostReplay = savedGhost ? JSON.parse(savedGhost) : null;

    // Initialize systems
    if (typeof initStats === 'function') initStats();
    if (typeof initCosmetics === 'function') initCosmetics();
    if (typeof resetLevelAchievementTrackers === 'function') resetLevelAchievementTrackers();

    // Load the current level
    loadLevel.call(this, currentLevelIndex);

    // Start endless mode if active
    if (typeof endlessMode !== 'undefined' && endlessMode && typeof startEndlessMode === 'function') {
        startEndlessMode.call(this, this);
    }

    // Apply difficulty modifiers
    if (typeof applyModifiers === 'function') applyModifiers(this);

    // Apply daily challenge modifiers
    if (typeof dailyChallengeMode !== 'undefined' && dailyChallengeMode && typeof applyDailyModifiers === 'function') {
        applyDailyModifiers(this);
        if (typeof showDailyModifierHUD === 'function') showDailyModifierHUD(this);
    }

    // Camera fade in for smooth transitions
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Endless mode: skip menu/story, hide base level flag and enemies
    if (typeof endlessMode !== 'undefined' && endlessMode) {
        // Hide the base level's flag so player doesn't accidentally complete it
        if (endFlag) { endFlag.setAlpha(0); if (endFlag.body) endFlag.body.enable = false; }
        if (endText) { endText.setAlpha(0); }
        if (startText) { startText.setAlpha(0); }
        // Remove base level enemies for clean endless experience
        if (enemies) {
            enemies.children.entries.forEach(e => e.disableBody(true, true));
        }
        enemyRects.forEach(r => { if (r && r.destroy) r.destroy(); else if (r && r.rect) r.rect.destroy(); });
        enemyRects = [];
        // Remove base level coins (endless generates its own)
        if (coins) {
            coins.children.entries.forEach(c => c.disableBody(true, true));
        }
        coinRects.forEach(c => { if (c && c.rect) c.rect.destroy(); else if (c && c.destroy) c.destroy(); });
        coinRects = [];
        totalLevelCoins = 0;
        coinsCollected = 0;
    } else if (showingMenu && typeof showMainMenu === 'function') {
        // Show main menu on first load
        showMainMenu(this);
    } else if (showingLevelSelect && typeof showLevelSelect === 'function') {
        showLevelSelect(this);
    } else if (typeof shouldShowStory === 'function' && shouldShowStory(currentLevelIndex)) {
        // Show story card before level starts, pause physics while showing
        isPaused = true;
        this.physics.pause();
        showStoryCard(this, currentLevelIndex, () => {
            isPaused = false;
            this.physics.resume();
        });
    }
}

function loadLevel(levelIndex) {
    // Get level data
    currentLevel = levels[levelIndex];

    // Set world bounds based on level
    this.physics.world.setBounds(0, 0, currentLevel.worldWidth, currentLevel.worldHeight);

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, currentLevel.worldWidth, currentLevel.worldHeight);
    this.cameras.main.setZoom(1);

    // Theme colors (with defaults)
    const theme = currentLevel.theme || {};
    const skyColor = theme.skyColor ?? 0x1a1a2e;
    const groundColor = theme.groundColor ?? 0x00aa00;
    const platformColor = theme.platformColor ?? 0x8B4513;
    const bgColor1 = theme.bgColor1 ?? 0x16213e;
    const bgColor2 = theme.bgColor2 ?? 0x0f3460;

    // Sky background
    this.add.rectangle(currentLevel.worldWidth / 2, currentLevel.worldHeight / 2,
        currentLevel.worldWidth, currentLevel.worldHeight, skyColor).setDepth(-10);

    // Parallax background layers
    const bgWidth = currentLevel.worldWidth;
    for (let i = 0; i < 6; i++) {
        const w = 200 + Math.random() * 300;
        const h = 80 + Math.random() * 120;
        const x = Math.random() * bgWidth;
        const y = 200 + Math.random() * 250;
        const bg = this.add.rectangle(x, y, w, h, bgColor1, 0.3);
        bg.setScrollFactor(0.1);
        bg.setDepth(-9);
    }
    for (let i = 0; i < 8; i++) {
        const w = 100 + Math.random() * 200;
        const h = 60 + Math.random() * 80;
        const x = Math.random() * bgWidth;
        const y = 250 + Math.random() * 200;
        const bg = this.add.rectangle(x, y, w, h, bgColor2, 0.25);
        bg.setScrollFactor(0.3);
        bg.setDepth(-8);
    }

    // Create platform group
    platforms = this.physics.add.staticGroup();

    // Extended ground
    const groundSections = Math.ceil(currentLevel.worldWidth / 400);
    for (let i = 0; i < groundSections; i++) {
        platforms.create(200 + i * 400, 580, null).setDisplaySize(400, 40).refreshBody();
        this.add.rectangle(200 + i * 400, 580, 400, 40, groundColor);
    }

    // Create platforms from level data
    currentLevel.platforms.forEach(platform => {
        platforms.create(platform.x, platform.y, null).setDisplaySize(platform.width, platform.height).refreshBody();
        this.add.rectangle(platform.x, platform.y, platform.width, platform.height, platformColor);
    });

    // Obstacles (spikes) from level data
    obstacles = this.physics.add.staticGroup();
    currentLevel.obstacles.forEach(obstacle => {
        obstacles.create(obstacle.x, obstacle.y, null).setDisplaySize(30, 30).refreshBody();
        this.add.rectangle(obstacle.x, obstacle.y, 30, 30, 0xff0000);
    });

    // Coins from level data
    coins = this.physics.add.staticGroup();
    totalLevelCoins = (currentLevel.coins ? currentLevel.coins.length : 0);
    if (currentLevel.coins) {
        currentLevel.coins.forEach(coinData => {
            const coin = coins.create(coinData.x, coinData.y, null).setDisplaySize(20, 20).refreshBody();
            const coinRect = this.add.rectangle(coinData.x, coinData.y, 20, 20, 0xffd700); // Gold color
            coinRects.push({ rect: coinRect, body: coin });
        });
    }

    // Checkpoints from level data
    checkpoints = this.physics.add.staticGroup();
    if (currentLevel.checkpoints) {
        currentLevel.checkpoints.forEach(cpData => {
            const checkpoint = checkpoints.create(cpData.x, cpData.y, null).setDisplaySize(20, 50).refreshBody();
            const cpRect = this.add.rectangle(cpData.x, cpData.y, 20, 50, 0x888888); // Gray = inactive
            checkpointRects.push({ rect: cpRect, body: checkpoint, activated: false });
        });
    }

    // Player
    player = this.physics.add.sprite(currentLevel.playerStart.x, currentLevel.playerStart.y, null).setDisplaySize(32, 32);
    playerRect = this.add.rectangle(currentLevel.playerStart.x, currentLevel.playerStart.y, 32, 32, 0x0000ff);

    // Ghost sprite (translucent white rectangle showing best-time replay)
    if (ghostReplay && ghostEnabled) {
        ghostSprite = this.add.rectangle(ghostReplay[0]?.x || 100, ghostReplay[0]?.y || 500, 32, 32, 0xffffff, 0.25);
        ghostSprite.setDepth(50);
    }

    player.setBounce(0);
    player.setCollideWorldBounds(true);

    // Camera follows player with deadzone for smoother feel
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(100, 50);
    this.cameras.main.setFollowOffset(0, -30);

    // Enemies from level data (with type support)
    enemies = this.physics.add.group();
    currentLevel.enemies.forEach(enemyData => {
        const type = enemyData.type || 'walker';
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.walker;
        const size = type === 'flyer' ? 28 : (type === 'jumper' ? 32 : 32);
        const height = type === 'jumper' ? 40 : size;

        const enemy = enemies.create(enemyData.x, enemyData.y, null).setDisplaySize(size, height);
        const enemyRect = this.add.rectangle(enemyData.x, enemyData.y, size, height, config.color);

        // Shield enemies get a visible border
        if (type === 'shield') {
            const shieldBorder = this.add.rectangle(enemyData.x, enemyData.y, size + 6, height + 6);
            shieldBorder.setStrokeStyle(2, 0x00ffff);
            enemyRect.shieldBorder = shieldBorder;
        }

        enemyRects.push(enemyRect);
        enemy.enemyType = type;
        enemy.hp = type === 'shield' ? 2 : 1;

        if (type === 'flyer') {
            enemy.body.setAllowGravity(false);
            enemy.startY = enemyData.y;
            enemy.setVelocityX(config.speed * (Math.random() > 0.5 ? 1 : -1));
            enemy.setBounce(0);
            enemy.setCollideWorldBounds(true);
        } else if (type === 'shooter') {
            enemy.setBounce(0);
            enemy.setCollideWorldBounds(true);
            enemy.lastShot = 0;
        } else {
            enemy.setBounce(1);
            enemy.setCollideWorldBounds(true);
            enemy.setVelocityX(config.speed * (Math.random() > 0.5 ? 1 : -1));
            if (type === 'jumper') {
                enemy.lastJump = 0;
            }
        }
    });

    // Projectiles group (for shooter enemies)
    projectiles = this.physics.add.group();

    // Power-ups from level data
    powerUps = this.physics.add.staticGroup();
    if (currentLevel.powerUps) {
        currentLevel.powerUps.forEach(puData => {
            const config = POWERUP_TYPES[puData.type];
            if (!config) return;
            const pu = powerUps.create(puData.x, puData.y, null).setDisplaySize(25, 25).refreshBody();
            pu.powerUpType = puData.type;
            const puRect = this.add.rectangle(puData.x, puData.y, 25, 25, config.color);
            puRect.setStrokeStyle(2, 0xffffff);
            powerUpRects.push({ rect: puRect, body: pu });
        });
    }

    // Breakable blocks from level data
    breakableBlocks = this.physics.add.staticGroup();
    if (currentLevel.breakableBlocks) {
        currentLevel.breakableBlocks.forEach(bbData => {
            const w = bbData.width || 40;
            const h = bbData.height || 40;
            const bb = breakableBlocks.create(bbData.x, bbData.y, null).setDisplaySize(w, h).refreshBody();
            bb.contains = bbData.contains || null;
            const bbRect = this.add.rectangle(bbData.x, bbData.y, w, h, 0xc4a060);
            // Draw X pattern
            const lineSize = Math.min(w, h) * 0.3;
            const x1 = this.add.rectangle(bbData.x, bbData.y, lineSize * 2, 3, 0x8B6914).setAngle(45);
            const x2 = this.add.rectangle(bbData.x, bbData.y, lineSize * 2, 3, 0x8B6914).setAngle(-45);
            breakableBlockRects.push({ rect: bbRect, body: bb, x1, x2 });
        });
    }

    // --- Secret Areas ---

    // Fake Walls: look like platforms but can be dashed through
    fakeWalls = [];
    fakeWallRects = [];
    const fakeWallGroup = this.physics.add.staticGroup();
    if (currentLevel.fakeWalls) {
        currentLevel.fakeWalls.forEach(fwData => {
            const fw = fakeWallGroup.create(fwData.x, fwData.y, null).setDisplaySize(fwData.width, fwData.height).refreshBody();
            const fwRect = this.add.rectangle(fwData.x, fwData.y, fwData.width, fwData.height, platformColor);
            fakeWalls.push({ body: fw, rect: fwRect, x: fwData.x, y: fwData.y, width: fwData.width, height: fwData.height, broken: false });
            fakeWallRects.push(fwRect);
        });
        // Fake walls collide with player but can be broken by dashing
        this.physics.add.collider(player, fakeWallGroup, function(player, wall) {
            if (isDashing) {
                breakFakeWall.call(this, wall);
            }
        }, null, this);
    }

    // Secret Platforms: additional platforms for secret areas (like wall-jump shafts)
    if (currentLevel.secretPlatforms) {
        currentLevel.secretPlatforms.forEach(sp => {
            platforms.create(sp.x, sp.y, null).setDisplaySize(sp.width, sp.height).refreshBody();
            this.add.rectangle(sp.x, sp.y, sp.width, sp.height, platformColor);
        });
    }

    // Invisible Platforms: barely visible until player stands on them
    invisiblePlatforms = [];
    invisiblePlatformRects = [];
    const invisPlatGroup = this.physics.add.staticGroup();
    if (currentLevel.invisiblePlatforms) {
        currentLevel.invisiblePlatforms.forEach(ipData => {
            const ip = invisPlatGroup.create(ipData.x, ipData.y, null).setDisplaySize(ipData.width, ipData.height).refreshBody();
            const ipRect = this.add.rectangle(ipData.x, ipData.y, ipData.width, ipData.height, platformColor);
            ipRect.setAlpha(0.05);
            invisiblePlatforms.push({ body: ip, rect: ipRect, x: ipData.x, y: ipData.y, width: ipData.width, height: ipData.height, revealed: false });
            invisiblePlatformRects.push(ipRect);
        });
        this.physics.add.collider(player, invisPlatGroup);
    }

    // Secret Coins: invisible until player enters trigger zone
    secretCoins = [];
    secretCoinRects = [];
    if (currentLevel.secretCoins) {
        totalLevelCoins += currentLevel.secretCoins.length;
        currentLevel.secretCoins.forEach(scData => {
            const sc = coins.create(scData.x, scData.y, null).setDisplaySize(20, 20).refreshBody();
            sc.setAlpha(0);
            sc.body.enable = false;
            const scRect = this.add.rectangle(scData.x, scData.y, 20, 20, 0xffd700);
            scRect.setAlpha(0);
            coinRects.push({ rect: scRect, body: sc });
            secretCoinRects.push({ rect: scRect, body: sc, trigger: scData.revealTrigger, revealed: false });
        });
    }

    // Secret Power-ups: invisible until triggered
    secretPowerUps = [];
    secretPowerUpRects = [];
    if (currentLevel.secretPowerUps) {
        currentLevel.secretPowerUps.forEach(spuData => {
            const puConfig = POWERUP_TYPES[spuData.type];
            if (!puConfig) return;
            const spu = powerUps.create(spuData.x, spuData.y, null).setDisplaySize(25, 25).refreshBody();
            spu.powerUpType = spuData.type;
            spu.setAlpha(0);
            spu.body.enable = false;
            const spuRect = this.add.rectangle(spuData.x, spuData.y, 25, 25, puConfig.color);
            spuRect.setStrokeStyle(2, 0xffffff);
            spuRect.setAlpha(0);
            powerUpRects.push({ rect: spuRect, body: spu });
            secretPowerUpRects.push({ rect: spuRect, body: spu, trigger: spuData.revealTrigger, revealed: false });
        });
    }

    // End flag at the position from level data
    endFlag = this.add.rectangle(currentLevel.flagPosition.x, currentLevel.flagPosition.y, 40, 60, 0xffff00);
    this.physics.add.existing(endFlag, true);

    // Hide the flag on boss levels until boss is defeated
    if (currentLevel.bossArena) {
        endFlag.setAlpha(0);
        endFlag.body.enable = false;
        bossFlagHidden = true;
    }

    // Start indicator
    startText = this.add.text(50, 450, 'START', { fontSize: '20px', fill: '#fff' });

    // Collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, breakableBlocks, handleBreakableBlockCollision, null, this);
    this.physics.add.collider(enemies, platforms);
    this.physics.add.overlap(player, enemies, handleEnemyCollision, null, this);
    this.physics.add.overlap(player, endFlag, reachEnd, null, this);
    this.physics.add.overlap(player, obstacles, hitEnemy, null, this);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    this.physics.add.overlap(player, powerUps, collectPowerUp, null, this);
    this.physics.add.overlap(player, projectiles, hitByProjectile, null, this);
    // Note: Checkpoints are activated based on X position in update(), not by overlap

    // Moving Platforms from level data
    if (currentLevel.movingPlatforms) {
        currentLevel.movingPlatforms.forEach(mp => {
            const platform = this.physics.add.sprite(mp.x, mp.y, null).setDisplaySize(mp.width, mp.height);
            platform.body.setImmovable(true);
            platform.body.setAllowGravity(false);

            const rect = this.add.rectangle(mp.x, mp.y, mp.width, mp.height, 0x9B7653);

            movingPlatforms.push({
                sprite: platform,
                rect: rect,
                startX: mp.x,
                startY: mp.y,
                moveX: mp.moveX,
                moveY: mp.moveY,
                speed: mp.speed,
                direction: 1
            });

            // Add collision with player
            this.physics.add.collider(player, platform);
        });
    }

    // Start background music
    if (typeof startBackgroundMusic === 'function') {
        stopBackgroundMusic();
        startBackgroundMusic(levelIndex);
    }

    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Level name and instructions - fixed to camera
    const levelName = this.add.text(16, 16, currentLevel.name, {
        fontSize: '18px',
        fill: '#ffff00',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    levelName.setScrollFactor(0);

    const instructions = this.add.text(16, 50, 'Arrows: Move | Space: Jump | Shift: Dash | Wall Jump: Jump off walls', {
        fontSize: '14px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    instructions.setScrollFactor(0);

    // Level counter
    const levelCounter = this.add.text(16, 84, `Level ${currentLevelIndex + 1} of ${levels.length}`, {
        fontSize: '14px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    levelCounter.setScrollFactor(0);

    // Score display
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText = this.add.text(16, 118, `Score: ${score} | Best: ${highScore}`, {
        fontSize: '14px',
        fill: '#ffd700',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    scoreText.setScrollFactor(0);

    // Timer display
    const bestTime = bestTimes['level' + currentLevelIndex];
    const bestTimeStr = bestTime ? formatTime(bestTime) : '--:--';
    timerText = this.add.text(16, 152, `Time: 0:00 | Best: ${bestTimeStr}`, {
        fontSize: '14px',
        fill: '#00ffff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    timerText.setScrollFactor(0);

    // Lives display
    livesText = this.add.text(16, 186, `Lives: ${'❤'.repeat(lives)}`, {
        fontSize: '14px',
        fill: '#ff0000',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    livesText.setScrollFactor(0);

    // Combo display (top-right area)
    comboText = this.add.text(784, 50, '', {
        fontSize: '20px',
        fill: '#ff0',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3
    });
    comboText.setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // Combo timer bar
    comboTimerBarBg = this.add.rectangle(730, 75, 60, 6, 0x333333);
    comboTimerBarBg.setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setAlpha(0);
    comboTimerBar = this.add.rectangle(730, 75, 60, 6, 0xffdd00);
    comboTimerBar.setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setAlpha(0);

    // Dash cooldown bar
    dashCooldownBarBg = this.add.rectangle(16, 218, 60, 8, 0x333333);
    dashCooldownBarBg.setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    dashCooldownBar = this.add.rectangle(16, 218, 60, 8, 0x00ccff);
    dashCooldownBar.setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    const dashLabel = this.add.text(80, 218, 'DASH', {
        fontSize: '10px', fill: '#00ccff'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    // Pause button
    pauseButton = this.add.text(750, 16, 'PAUSE', {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#666',
        padding: { x: 10, y: 5 }
    });
    pauseButton.setOrigin(1, 0);
    pauseButton.setScrollFactor(0);
    pauseButton.setDepth(100);
    pauseButton.setInteractive({ useHandCursor: true });
    pauseButton.on('pointerover', () => {
        pauseButton.setStyle({ backgroundColor: '#888' });
    });
    pauseButton.on('pointerout', () => {
        pauseButton.setStyle({ backgroundColor: '#666' });
    });
    pauseButton.on('pointerup', () => {
        togglePause.call(this);
    });

    // ESC key to pause
    this.input.keyboard.on('keydown-ESC', () => {
        togglePause.call(this);
    });
}

function update() {
    if (gameOver || levelComplete || isPaused || showingMenu || showingLevelSelect) {
        return;
    }

    // Update difficulty modifiers
    if (typeof updateModifiers === 'function') updateModifiers(this, this.game.loop.delta);

    // Update timer
    levelTimer += this.game.loop.delta;
    const bestTime = bestTimes['level' + currentLevelIndex];
    const bestTimeStr = bestTime ? formatTime(bestTime) : '--:--';
    timerText.setText(`Time: ${formatTime(levelTimer)} | Best: ${bestTimeStr}`);

    // --- Combo Timer ---
    if (comboTimer > 0) {
        comboTimer -= this.game.loop.delta;
        if (comboTimer <= 0) {
            comboCount = 0;
            comboMultiplier = 1;
            comboTimer = 0;
        }
    }
    // Combo HUD update
    if (comboCount >= 2) {
        comboText.setText(`${comboCount}x COMBO!`);
        comboText.setAlpha(1);
        comboTimerBar.setAlpha(1);
        comboTimerBarBg.setAlpha(0.5);
        const pct = Math.max(0, comboTimer / COMBO_COIN_WINDOW);
        comboTimerBar.setScale(pct, 1);
        // Color escalation
        if (comboMultiplier >= 3) {
            comboText.setStyle({ fontSize: '24px', fill: '#ff2222', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
        } else if (comboMultiplier >= 2) {
            comboText.setStyle({ fontSize: '22px', fill: '#ff8800', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
        } else if (comboMultiplier >= 1.5) {
            comboText.setStyle({ fontSize: '20px', fill: '#ffdd00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
        }
    } else {
        comboText.setAlpha(0);
        comboTimerBar.setAlpha(0);
        comboTimerBarBg.setAlpha(0);
    }

    // --- Dash Cooldown Bar ---
    const dashPct = Math.max(0, 1 - dashCooldown / DASH_COOLDOWN);
    dashCooldownBar.setScale(dashPct, 1);
    if (dashPct >= 1) {
        dashReadyPulse += this.game.loop.delta * 0.004;
        dashCooldownBar.setAlpha(0.7 + Math.sin(dashReadyPulse) * 0.3);
    } else {
        dashReadyPulse = 0;
        dashCooldownBar.setAlpha(1);
        dashCooldownBar.setFillStyle(0x666666);
    }
    if (dashPct >= 1) dashCooldownBar.setFillStyle(0x00ccff);

    // Update player rectangle position to follow physics sprite
    playerRect.setPosition(player.x, player.y);

    // Ghost: record current frame
    if (isRecordingGhost && !gameOver && !levelComplete) {
        ghostData.push({
            x: player.x,
            y: player.y,
            sx: playerRect.scaleX,
            sy: playerRect.scaleY
        });
    }

    // Ghost: playback
    if (ghostSprite && ghostReplay && ghostEnabled && ghostFrameIndex < ghostReplay.length) {
        const gf = ghostReplay[ghostFrameIndex];
        ghostSprite.setPosition(gf.x, gf.y);
        ghostSprite.setScale(gf.sx, gf.sy);
        ghostFrameIndex++;
    } else if (ghostSprite && ghostFrameIndex >= (ghostReplay?.length || 0)) {
        ghostSprite.setAlpha(0); // hide when replay ends
    }

    const deltaS = this.game.loop.delta / 1000;
    const onGround = player.body.touching.down || player.body.blocked.down;
    const jumpPressed = cursors.up.isDown || cursors.space.isDown || touchJump;

    // --- Coyote Time ---
    if (onGround) {
        coyoteTimer = COYOTE_TIME;
    } else {
        coyoteTimer -= this.game.loop.delta;
    }

    // --- Jump Buffering ---
    if (jumpPressed && !wasJumpPressed) {
        jumpBufferTimer = JUMP_BUFFER_TIME;
    } else {
        jumpBufferTimer -= this.game.loop.delta;
    }

    // --- Track facing direction ---
    if (cursors.left.isDown || touchLeft) lastFacingDir = -1;
    else if (cursors.right.isDown || touchRight) lastFacingDir = 1;

    // --- Reset double jump on landing ---
    if (onGround) {
        hasDoubleJumped = false;
        canAirDash = true;
    }

    // --- Dash System ---
    dashCooldown -= this.game.loop.delta;
    if (isDashing) {
        dashTimer -= this.game.loop.delta;
        if (dashTimer <= 0) {
            isDashing = false;
            player.body.setAllowGravity(true);
        } else {
            player.setVelocityX(DASH_SPEED * dashDirection);
            player.setVelocityY(0);
            // Dash trail particles
            spawnParticles(this, player.x - dashDirection * 10, player.y, 0x00ccff, 1, 10);
        }
    }

    if ((Phaser.Input.Keyboard.JustDown(dashKey) || touchDashPressed) && dashCooldown <= 0 && !isDashing) {
        touchDashPressed = false;
        if (onGround || canAirDash) {
            isDashing = true;
            dashTimer = DASH_DURATION;
            dashCooldown = DASH_COOLDOWN;
            dashDirection = lastFacingDir;
            player.body.setAllowGravity(false);
            if (!onGround) canAirDash = false;
            playSound('dash');
            if (typeof incrementStat === 'function') incrementStat('totalDashes', 1);
        }
    }

    // --- Wall Slide Detection ---
    const touchingWallLeft = player.body.blocked.left && !onGround;
    const touchingWallRight = player.body.blocked.right && !onGround;
    isWallSliding = (touchingWallLeft || touchingWallRight) && player.body.velocity.y > 0 && !isDashing;

    if (isWallSliding) {
        wallSlideDir = touchingWallLeft ? -1 : 1;
        // Slow the fall
        player.body.velocity.y = Math.min(player.body.velocity.y, 60);
        // Wall slide particles (occasional)
        if (Math.random() < 0.15) {
            spawnParticles(this, player.x + wallSlideDir * 16, player.y, 0xaaaaaa, 1, 10);
        }
    }

    // --- Acceleration-based Movement (skip during dash) ---
    if (!isDashing) {
        const maxSpeed = activePowerUps.speed ? 330 : MAX_SPEED;
        const accel = onGround ? (activePowerUps.speed ? 900 : GROUND_ACCEL) : AIR_ACCEL;
        const decel = onGround ? GROUND_DECEL : AIR_DECEL;
        let vx = player.body.velocity.x;

        if (cursors.left.isDown || touchLeft) {
            vx -= accel * deltaS;
            if (vx < -maxSpeed) vx = -maxSpeed;
        } else if (cursors.right.isDown || touchRight) {
            vx += accel * deltaS;
            if (vx > maxSpeed) vx = maxSpeed;
        } else {
            if (vx > 0) {
                vx -= decel * deltaS;
                if (vx < 0) vx = 0;
            } else if (vx < 0) {
                vx += decel * deltaS;
                if (vx > 0) vx = 0;
            }
        }
        player.setVelocityX(vx);
    }

    // --- Jump (with coyote time, buffer, double jump, wall jump) ---
    const jumpVelocity = activePowerUps.highJump ? -520 : JUMP_VELOCITY;
    const canJump = coyoteTimer > 0;
    const canDoubleJump = activePowerUps.doubleJump && !hasDoubleJumped && !onGround && coyoteTimer <= 0;
    const canWallJump = isWallSliding;
    const wantsJump = jumpBufferTimer > 0;

    if (wantsJump) {
        if (canWallJump) {
            // Wall jump: launch away from wall
            player.setVelocityY(-380);
            player.setVelocityX(250 * -wallSlideDir);
            coyoteTimer = 0;
            jumpBufferTimer = 0;
            isWallSliding = false;
            playSound('jump');
            if (typeof incrementStat === 'function') {
                incrementStat('totalWallJumps', 1);
                if (typeof jqStats !== 'undefined') jqStats.wallJumpsThisLevel++;
            }
        } else if (canJump) {
            player.setVelocityY(jumpVelocity);
            coyoteTimer = 0;
            jumpBufferTimer = 0;
            jumpHeld = true;
            playSound('jump');
        } else if (canDoubleJump) {
            player.setVelocityY(jumpVelocity * 0.9);
            hasDoubleJumped = true;
            jumpBufferTimer = 0;
            spawnParticles(this, player.x, player.y + 16, 0x9900ff, 6, 30);
            playSound('jump');
        }
    }

    // --- Variable Jump Height (release to cut jump short) ---
    if (!jumpPressed && player.body.velocity.y < 0 && !isDashing) {
        player.setVelocityY(player.body.velocity.y * 0.85);
        jumpHeld = false;
    }

    // --- Fast Fall (snappier descent) ---
    if (player.body.velocity.y > 0 && !isWallSliding && !isDashing) {
        player.body.velocity.y += BASE_GRAVITY * (FAST_FALL_MULTIPLIER - 1) * deltaS;
    }

    wasJumpPressed = jumpPressed;

    // --- Squash & Stretch ---
    const vy = player.body.velocity.y;
    if (!onGround) {
        if (vy < -50) {
            // Rising - stretch vertically
            playerRect.setScale(0.85, 1.15);
        } else if (vy > 50) {
            // Falling - stretch vertically
            playerRect.setScale(0.8, 1.2);
        } else {
            playerRect.setScale(1, 1);
        }
    } else if (!landingSquash) {
        playerRect.setScale(1, 1);
    }

    // --- Landing Detection ---
    if (onGround && !wasOnGround) {
        // Just landed
        landingSquash = true;
        playerRect.setScale(1.3, 0.7);
        this.tweens.add({
            targets: playerRect,
            scaleX: 1,
            scaleY: 1,
            duration: 120,
            ease: 'Bounce.easeOut',
            onComplete: () => { landingSquash = false; }
        });

        // Landing dust particles
        const fallSpeed = Math.abs(vy);
        if (fallSpeed > 200) {
            spawnParticles(this, player.x, player.y + 16, 0x999999, 4, 30);
            if (fallSpeed > 400) {
                shakeCamera(this, 15, 80);
            }
        }
    }

    wasOnGround = onGround;

    // --- Camera Look-Ahead ---
    const targetOffsetX = cursors.right.isDown ? -60 : (cursors.left.isDown ? 60 : 0);
    cameraOffsetX += (targetOffsetX - cameraOffsetX) * 0.05;
    this.cameras.main.setFollowOffset(cameraOffsetX, -30);

    // --- Coin Hover Animation ---
    const time = this.time.now;
    coinRects.forEach((coinData, i) => {
        if (coinData.rect && coinData.body) {
            coinData.rect.y = coinData.body.y + Math.sin(time * 0.004 + i) * 3;
        }
    });

    // Enemy behavior by type and update visual rectangles
    enemies.children.entries.forEach((enemy, index) => {
        if (!enemy.active) return;
        const type = enemy.enemyType || 'walker';

        switch (type) {
            case 'walker':
            case 'shield':
                if (enemy.body.blocked.right) enemy.setVelocityX(-Math.abs(enemy.body.velocity.x || 80));
                else if (enemy.body.blocked.left) enemy.setVelocityX(Math.abs(enemy.body.velocity.x || 80));
                break;

            case 'jumper':
                if (enemy.body.blocked.right) enemy.setVelocityX(-ENEMY_TYPES.jumper.speed);
                else if (enemy.body.blocked.left) enemy.setVelocityX(ENEMY_TYPES.jumper.speed);
                if (enemy.body.touching.down && this.time.now - enemy.lastJump > 2000 + Math.random() * 1000) {
                    enemy.setVelocityY(-300);
                    enemy.lastJump = this.time.now;
                }
                break;

            case 'flyer':
                enemy.y = enemy.startY + Math.sin(this.time.now / 500) * 50;
                if (enemy.body.blocked.right) enemy.setVelocityX(-ENEMY_TYPES.flyer.speed);
                else if (enemy.body.blocked.left) enemy.setVelocityX(ENEMY_TYPES.flyer.speed);
                break;

            case 'shooter':
                if (this.time.now - enemy.lastShot > 3000) {
                    shootProjectile.call(this, enemy);
                    enemy.lastShot = this.time.now;
                }
                break;
        }

        // Update enemy rectangle position
        if (enemyRects[index]) {
            enemyRects[index].setPosition(enemy.x, enemy.y);
            // Update shield border position
            if (enemyRects[index].shieldBorder) {
                enemyRects[index].shieldBorder.setPosition(enemy.x, enemy.y);
            }
        }
    });

    // Update projectile visuals
    projectileRects.forEach((p, i) => {
        if (p.body && p.body.active) {
            p.rect.setPosition(p.body.x + 4, p.body.y + 4);
        }
    });
    // Clean up destroyed projectiles
    projectileRects = projectileRects.filter(p => p.body && p.body.active);

    // Power-up pulsing animation
    const pulseScale = 1 + Math.sin(this.time.now * 0.005) * 0.15;
    powerUpRects.forEach(p => {
        if (p.rect) p.rect.setScale(pulseScale);
    });

    // Invincibility flash effect
    if (activePowerUps.invincibility) {
        playerRect.setFillStyle(Math.floor(this.time.now / 100) % 2 === 0 ? 0xffffff : 0x0000ff);
    } else if (typeof applyPlayerColor === 'function') {
        applyPlayerColor(playerRect, this.time.now);
    }

    // Cosmetic trail particles
    if (typeof spawnTrailParticle === 'function' && (Math.abs(player.body.velocity.x) > 50 || Math.abs(player.body.velocity.y) > 100)) {
        spawnTrailParticle(this, player.x, player.y + 8);
    }

    // Achievement timers (play time, secret achievements)
    if (typeof updateAchievementTimers === 'function') {
        updateAchievementTimers(this, this.game.loop.delta);
    }

    // Check checkpoint activation based on player X position
    checkpointRects.forEach((cpData) => {
        if (!cpData.activated && player.x >= cpData.body.x) {
            cpData.activated = true;
            cpData.rect.setFillStyle(0x00ff00); // Green = activated
            lastCheckpoint = { x: cpData.body.x, y: cpData.body.y - 30 };

            // Visual feedback - brief scale animation + particles
            this.tweens.add({
                targets: cpData.rect,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Power2'
            });
            spawnParticles(this, cpData.body.x, cpData.body.y - 25, 0x00ff00, 10, 60);
            playSound('checkpoint');
        }
    });

    // --- Secret Area Checks ---

    // Check if player is near any secret coin trigger zone -> reveal those coins
    secretCoinRects.forEach(sc => {
        if (!sc.revealed && sc.trigger) {
            const dx = player.x - sc.trigger.x;
            const dy = player.y - sc.trigger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < sc.trigger.radius) {
                sc.revealed = true;
                sc.body.setAlpha(1);
                sc.body.body.enable = true;
                // Sparkle reveal effect
                this.tweens.add({
                    targets: sc.rect,
                    alpha: 1,
                    duration: 400,
                    ease: 'Power2'
                });
                spawnParticles(this, sc.body.x, sc.body.y, 0xffd700, 4, 20);
            }
        }
    });

    // Check if player is near any secret power-up trigger zone -> reveal them
    secretPowerUpRects.forEach(spu => {
        if (!spu.revealed && spu.trigger) {
            const dx = player.x - spu.trigger.x;
            const dy = player.y - spu.trigger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < spu.trigger.radius) {
                spu.revealed = true;
                spu.body.setAlpha(1);
                spu.body.body.enable = true;
                this.tweens.add({
                    targets: spu.rect,
                    alpha: 1,
                    duration: 400,
                    ease: 'Power2'
                });
                spawnParticles(this, spu.body.x, spu.body.y, 0x00ffff, 6, 30);
            }
        }
    });

    // Check if player is standing on any invisible platform -> reveal it
    invisiblePlatforms.forEach(ip => {
        if (!ip.revealed) {
            // Check if player's feet are near the top of the invisible platform
            const playerBottom = player.y + 16;
            const playerLeft = player.x - 16;
            const playerRight = player.x + 16;
            const platTop = ip.y - ip.height / 2;
            const platLeft = ip.x - ip.width / 2;
            const platRight = ip.x + ip.width / 2;
            const onPlatform = playerBottom >= platTop - 5 && playerBottom <= platTop + 10
                && playerRight > platLeft && playerLeft < platRight
                && (player.body.touching.down || player.body.blocked.down);
            if (onPlatform) {
                ip.revealed = true;
                this.tweens.add({
                    targets: ip.rect,
                    alpha: 1,
                    duration: 300,
                    ease: 'Power2'
                });
                spawnParticles(this, ip.x, ip.y, 0xffffff, 8, 25);
                playSound('checkpoint');
            }
        }
    });

    // Fall off world

    // Update moving platforms
    if (movingPlatforms.length > 0) {
        movingPlatforms.forEach((mp, index) => {
            const platform = mp.sprite;
            const deltaTime = this.game.loop.delta / 1000;

            // Calculate movement
            if (mp.moveX > 0) {
                platform.x += mp.speed * mp.direction * deltaTime;
                // Check bounds and reverse direction, clamping to prevent getting stuck
                if (platform.x >= mp.startX + mp.moveX) {
                    platform.x = mp.startX + mp.moveX;
                    mp.direction = -1;
                } else if (platform.x <= mp.startX) {
                    platform.x = mp.startX;
                    mp.direction = 1;
                }
            }

            if (mp.moveY > 0) {
                platform.y += mp.speed * mp.direction * deltaTime;
                // Check bounds and reverse direction, clamping to prevent getting stuck
                if (platform.y >= mp.startY + mp.moveY) {
                    platform.y = mp.startY + mp.moveY;
                    mp.direction = -1;
                } else if (platform.y <= mp.startY) {
                    platform.y = mp.startY;
                    mp.direction = 1;
                }
            }

            // Update physics body position
            platform.body.updateFromGameObject();

            // Update visual rectangle
            mp.rect.setPosition(platform.x, platform.y);

            // Move player with platform if standing on it
            if (player.body.touching.down && platform.body.touching.up) {
                const onPlatform = Math.abs(player.x - platform.x) < platform.displayWidth / 2 + player.displayWidth / 2;
                if (onPlatform) {
                    if (mp.moveX > 0) {
                        player.x += mp.speed * mp.direction * deltaTime;
                        playerRect.x = player.x;
                    }
                }
            }
        });
    }

    // Boss trigger
    if (currentLevelIndex === 9 && !bossTriggered && currentLevel.bossArena && player.x > currentLevel.bossArena.x) {
        bossTriggered = true;
        triggerBoss.call(this);
    }

    // Boss AI update
    if (bossActive) {
        updateBoss.call(this);
    }

    if (player.y > 600) {
        if (typeof endlessMode !== 'undefined' && endlessMode && typeof endEndlessMode === 'function') {
            endEndlessMode.call(this, this);
        } else {
            hitEnemy.call(this);
        }
    }

    // Endless mode chunk generation & cleanup
    if (typeof endlessMode !== 'undefined' && endlessMode && typeof updateEndlessMode === 'function') {
        updateEndlessMode.call(this, this);
    }
}

function collectCoin(player, coin) {
    const cx = coin.x;
    const cy = coin.y;

    // Find and remove the visual rectangle
    const coinIndex = coinRects.findIndex(c => c.body === coin);
    if (coinIndex !== -1) {
        coinRects[coinIndex].rect.destroy();
        coinRects.splice(coinIndex, 1);
    }

    coin.disableBody(true, true);

    // Combo system
    comboCount++;
    comboTimer = COMBO_COIN_WINDOW;
    comboMultiplier = 1 + Math.floor(comboCount / 5) * 0.5;
    if (comboCount > maxCombo) maxCombo = comboCount;

    const basePoints = 100;
    const points = Math.floor(basePoints * comboMultiplier);
    score += points;
    coinsCollected++;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);

    // Visual juice: gold particle burst + score popup + sound
    const particleCount = comboMultiplier >= 2 ? 10 : 6;
    spawnParticles(this, cx, cy, 0xffd700, particleCount, 40);
    const popupText = comboMultiplier > 1 ? `+${points} x${comboMultiplier}` : `+${points}`;
    const popupColor = comboMultiplier >= 2.5 ? '#ff4444' : comboMultiplier >= 2 ? '#ff8800' : comboMultiplier >= 1.5 ? '#ffdd00' : '#ffd700';
    showScorePopup(this, cx, cy - 10, popupText, popupColor);
    playCoinSound(comboCount);

    // Achievement tracking
    if (typeof incrementStat === 'function') {
        incrementStat('totalCoins', 1);
        updateStat('maxCombo', Math.max((typeof jqStats !== 'undefined' ? jqStats.maxCombo : 0), comboCount));
        checkAchievements(this);
    }
}

function handleEnemyCollision(player, enemy) {
    if (gameOver) return;

    // Invincibility destroys enemies on contact
    if (activePowerUps.invincibility) {
        stompEnemy.call(this, enemy);
        return;
    }

    // Dashing through enemies kills them
    if (isDashing) {
        stompEnemy.call(this, enemy);
        return;
    }

    // Flyers can't be stomped
    if (enemy.enemyType === 'flyer') {
        hitEnemy.call(this);
        return;
    }

    // Check if player is falling and above the enemy
    const playerBottom = player.y + player.displayHeight / 2;
    const isFalling = player.body.velocity.y > 0;
    const isAbove = playerBottom < enemy.y;

    if (isFalling && isAbove) {
        stompEnemy.call(this, enemy);
        const jumpPressed = cursors.up.isDown || cursors.space.isDown || touchJump;
        player.setVelocityY(jumpPressed ? -400 : -250);
    } else {
        hitEnemy.call(this);
    }
}

function stompEnemy(enemy) {
    const ex = enemy.x;
    const ey = enemy.y;
    const enemyIndex = enemies.children.entries.indexOf(enemy);
    const enemyRect = enemyRects[enemyIndex];

    // Shield enemies take 2 hits
    if (enemy.hp > 1) {
        enemy.hp--;
        // Remove shield visual
        if (enemyRect && enemyRect.shieldBorder) {
            enemyRect.shieldBorder.destroy();
            enemyRect.shieldBorder = null;
        }
        spawnParticles(this, ex, ey, 0x00ffff, 6, 40);
        showScorePopup(this, ex, ey - 20, 'SHIELD!', '#00ffff');
        shakeCamera(this, 15, 60);
        playSound('stomp');
        return;
    }

    // Disable enemy physics
    enemy.disableBody(true, true);

    // Animate the visual rectangle
    if (enemyRect) {
        if (enemyRect.shieldBorder) enemyRect.shieldBorder.destroy();
        this.tweens.add({
            targets: enemyRect,
            scaleY: 0.2,
            scaleX: 1.5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => { enemyRect.destroy(); }
        });
        enemyRects[enemyIndex] = null;
    }

    // Combo: stomps add 3 to combo and give more time
    comboCount += 3;
    comboTimer = COMBO_STOMP_WINDOW;
    comboMultiplier = 1 + Math.floor(comboCount / 5) * 0.5;
    if (comboCount > maxCombo) maxCombo = comboCount;

    // Score: shield enemies are worth more, with combo multiplier
    const basePoints = (enemy.enemyType === 'shield') ? 400 : 200;
    const points = Math.floor(basePoints * comboMultiplier);
    score += points;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);

    // Visual juice
    const color = ENEMY_TYPES[enemy.enemyType]?.color || 0xff0000;
    const particleCount = comboMultiplier >= 2 ? 12 : 8;
    spawnParticles(this, ex, ey, color, particleCount, 50);
    shakeCamera(this, 25, 100);
    const popupText = comboMultiplier > 1 ? `+${points} x${comboMultiplier}` : `+${points}`;
    showScorePopup(this, ex, ey - 20, popupText, '#ff4444');
    playSound('stomp');

    // Achievement tracking
    if (typeof incrementStat === 'function') {
        incrementStat('totalStomps', 1);
        updateStat('maxCombo', Math.max((typeof jqStats !== 'undefined' ? jqStats.maxCombo : 0), comboCount));
        checkAchievements(this);
    }
}

function hitEnemy() {
    if (gameOver) return;

    // Death tracking
    deathCount++;

    // Reset combo on death
    comboCount = 0;
    comboMultiplier = 1;
    comboTimer = 0;

    // Achievement tracking
    if (typeof incrementStat === 'function') {
        incrementStat('totalDeaths', 1);
        if (typeof jqStats !== 'undefined') jqStats.deathsThisLevel++;
        checkAchievements(this);
    }

    // Screen shake on hit + sound
    shakeCamera(this, 40, 150);
    spawnParticles(this, player.x, player.y, 0xff0000, 6, 40);

    // Decrease lives
    lives--;
    playSound(lives <= 0 ? 'gameOver' : 'death');
    livesText.setText(`Lives: ${'❤'.repeat(lives)}`);

    if (lives <= 0) {
        // Game over - no more lives
        gameOver = true;
        this.physics.pause();
        if (typeof stopBackgroundMusic === 'function') stopBackgroundMusic();
        player.setTint(0xff0000);

        const gameOverText = this.add.text(this.cameras.main.centerX, 300, 'GAME OVER!', {
            fontSize: '48px',
            fill: '#ff0000',
            backgroundColor: '#000',
            padding: { x: 20, y: 10 }
        });
        gameOverText.setOrigin(0.5);
        gameOverText.setScrollFactor(0);

        const restartButton = this.add.text(this.cameras.main.centerX, 370, 'RESTART LEVEL', {
            fontSize: '28px',
            fill: '#fff',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        });
        restartButton.setOrigin(0.5);
        restartButton.setScrollFactor(0);
        restartButton.setDepth(1000);
        restartButton.setInteractive({ useHandCursor: true });
        restartButton.on('pointerover', () => {
            restartButton.setStyle({ backgroundColor: '#666' });
        });
        restartButton.on('pointerout', () => {
            restartButton.setStyle({ backgroundColor: '#444' });
        });
        restartButton.on('pointerup', () => {
            restartWithTransition(this);
        });
    } else {
        // Respawn at checkpoint or start
        const spawnPoint = lastCheckpoint || { x: currentLevel.playerStart.x, y: currentLevel.playerStart.y };
        player.setPosition(spawnPoint.x, spawnPoint.y);
        playerRect.setPosition(spawnPoint.x, spawnPoint.y);
        player.setVelocity(0, 0);

        // Brief invincibility effect with visual feedback
        player.setAlpha(0.5);
        playerRect.setAlpha(0.5);

        // Flash effect
        let flashCount = 0;
        const flashInterval = this.time.addEvent({
            delay: 200,
            callback: () => {
                flashCount++;
                const alpha = flashCount % 2 === 0 ? 0.5 : 0.3;
                player.setAlpha(alpha);
                playerRect.setAlpha(alpha);

                if (flashCount >= 10) {
                    flashInterval.remove();
                    player.setAlpha(1);
                    playerRect.setAlpha(1);
                }
            },
            loop: true
        });
    }
}

function reachEnd() {
    if (levelComplete) return;

    levelComplete = true;
    this.physics.pause();
    if (typeof stopBackgroundMusic === 'function') stopBackgroundMusic();
    playSound('levelComplete');

    const levelKey = 'level' + currentLevelIndex;

    // Calculate deltas before saving
    const prevHighScore = highScores[levelKey] || 0;
    const prevBestTime = bestTimes[levelKey] || null;
    const prevBestDeaths = bestDeaths[levelKey] !== undefined ? bestDeaths[levelKey] : null;
    const isNewHighScore = score > prevHighScore;
    const isNewBestTime = !prevBestTime || levelTimer < prevBestTime;
    const isNewBestDeaths = prevBestDeaths === null || deathCount < prevBestDeaths;
    const isFlawless = deathCount === 0;

    // Save high score
    if (isNewHighScore) {
        highScores[levelKey] = score;
        localStorage.setItem('marioHighScores', JSON.stringify(highScores));
    }

    // Save best time
    if (isNewBestTime) {
        bestTimes[levelKey] = levelTimer;
        localStorage.setItem('marioBestTimes', JSON.stringify(bestTimes));
    }

    // Save ghost replay on new best time
    if (isNewBestTime && ghostData.length > 0 && ghostData.length < 3600) {
        localStorage.setItem('jqGhost_level' + currentLevelIndex, JSON.stringify(ghostData));
    }

    // Save best deaths
    if (isNewBestDeaths) {
        bestDeaths[levelKey] = deathCount;
        localStorage.setItem('jqBestDeaths', JSON.stringify(bestDeaths));
    }

    // Save completion & stars
    let earnedStars = { completion: true, coins: false, time: false };
    if (typeof saveCompletion === 'function') {
        earnedStars = saveCompletion(currentLevelIndex, coinsCollected, totalLevelCoins, levelTimer);
    }
    if (typeof markHardcoreComplete === 'function') markHardcoreComplete(currentLevelIndex);

    // Save leaderboard entry
    let leaderRanks = { scoreRank: 0, timeRank: 0 };
    if (typeof saveLeaderboardEntry === 'function') {
        leaderRanks = saveLeaderboardEntry(currentLevelIndex, score, levelTimer);
    }

    // Achievement tracking: record level completion
    if (typeof recordLevelCompletion === 'function') {
        recordLevelCompletion(currentLevelIndex);
        updateStat('maxCombo', Math.max((typeof jqStats !== 'undefined' ? jqStats.maxCombo : 0), maxCombo));
        checkAchievements(this);
    }

    // Daily challenge completion
    let dailyResult = null;
    if (typeof dailyChallengeMode !== 'undefined' && dailyChallengeMode && typeof completeDailyChallenge === 'function') {
        dailyResult = completeDailyChallenge();
    }

    const isLastLevel = currentLevelIndex >= levels.length - 1;
    const scene = this;

    // Overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    overlay.setScrollFactor(0).setDepth(999);

    const winText = this.add.text(400, 120,
        isLastLevel ? 'GAME COMPLETE!' : 'LEVEL COMPLETE!', {
        fontSize: '42px', fill: '#00ff00', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    winText.setAlpha(0);
    this.tweens.add({ targets: winText, alpha: 1, duration: 400, ease: 'Power2' });

    // Animated star display (appear one at a time)
    const starLabels = ['Complete', 'Coins (80%)', 'Speed Run'];
    const starResults = [earnedStars.completion, earnedStars.coins, earnedStars.time];
    for (let i = 0; i < 3; i++) {
        const sy = 175 + i * 28;
        const icon = starResults[i] ? '\u2605' : '\u2606';
        const color = starResults[i] ? '#ffd700' : '#555';
        const starText = scene.add.text(300, sy, `${icon} ${starLabels[i]}`, {
            fontSize: '18px', fill: color
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1000);
        starText.setAlpha(0).setScale(0.5);
        scene.tweens.add({
            targets: starText,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 300, delay: 500 + i * 300,
            ease: 'Back.easeOut',
            onStart: () => {
                if (starResults[i]) {
                    spawnParticles(scene, 310, sy, 0xffd700, 6, 30);
                }
            }
        });
    }

    // Stats section (appears after stars)
    const statsDelay = 1500;

    // Score delta
    const scoreDelta = score - prevHighScore;
    const scoreStr = isNewHighScore ? `Score: ${score} (+${scoreDelta} NEW BEST!)` : `Score: ${score}`;
    const scoreColor = isNewHighScore ? '#00ff00' : '#ccc';
    const scoreDisplay = this.add.text(400, 270, scoreStr, {
        fontSize: '14px', fill: scoreColor
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: scoreDisplay, alpha: 1, duration: 300, delay: statsDelay });

    // Time delta
    let timeStr = `Time: ${formatTime(levelTimer)}`;
    if (prevBestTime && !isNewBestTime) {
        const diff = levelTimer - prevBestTime;
        timeStr += ` (+${formatTime(diff)})`;
    } else if (isNewBestTime && prevBestTime) {
        const diff = prevBestTime - levelTimer;
        timeStr += ` (-${formatTime(diff)} NEW BEST!)`;
    } else if (isNewBestTime) {
        timeStr += ' (NEW BEST!)';
    }
    const timeColor = isNewBestTime ? '#00ffff' : '#ccc';
    const timeDisplay = this.add.text(400, 290, timeStr, {
        fontSize: '14px', fill: timeColor
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: timeDisplay, alpha: 1, duration: 300, delay: statsDelay + 150 });

    // Coins
    const coinStr = `Coins: ${coinsCollected}/${totalLevelCoins}`;
    const coinDisplay = this.add.text(400, 310, coinStr, {
        fontSize: '14px', fill: '#ffd700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: coinDisplay, alpha: 1, duration: 300, delay: statsDelay + 300 });

    // Max combo
    if (maxCombo >= 2) {
        const comboStr = `Max Combo: ${maxCombo}x (x${1 + Math.floor(maxCombo / 5) * 0.5} multiplier)`;
        const comboDisplay = this.add.text(400, 330, comboStr, {
            fontSize: '14px', fill: '#ff8800'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
        this.tweens.add({ targets: comboDisplay, alpha: 1, duration: 300, delay: statsDelay + 450 });
    }

    // Deaths
    const deathY = maxCombo >= 2 ? 350 : 330;
    let deathStr = `Deaths: ${deathCount}`;
    if (prevBestDeaths !== null && isNewBestDeaths && deathCount < prevBestDeaths) {
        deathStr += ` (was ${prevBestDeaths}, NEW BEST!)`;
    }
    const deathDisplay = this.add.text(400, deathY, deathStr, {
        fontSize: '14px', fill: isFlawless ? '#ffd700' : '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: deathDisplay, alpha: 1, duration: 300, delay: statsDelay + 600 });

    // FLAWLESS badge
    if (isFlawless) {
        const flawlessY = deathY + 25;
        const flawlessText = this.add.text(400, flawlessY, 'FLAWLESS!', {
            fontSize: '28px', fill: '#ffd700', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0).setScale(0.3);
        this.tweens.add({
            targets: flawlessText,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 500, delay: statsDelay + 800,
            ease: 'Back.easeOut',
            onStart: () => {
                spawnParticles(scene, 400, flawlessY, 0xffd700, 15, 60);
                shakeCamera(scene, 15, 100);
            }
        });
    }

    // Buttons (appear after all stats)
    const buttonDelay = statsDelay + (isFlawless ? 1400 : 900);
    let btnY = isFlawless ? deathY + 60 : deathY + 30;

    if (!isLastLevel) {
        const nextBtn = this.add.text(400, btnY, 'NEXT LEVEL', {
            fontSize: '24px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#0a0', padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
        this.tweens.add({ targets: nextBtn, alpha: 1, duration: 300, delay: buttonDelay });
        nextBtn.setInteractive({ useHandCursor: true });
        nextBtn.on('pointerover', () => nextBtn.setStyle({ backgroundColor: '#0c0' }));
        nextBtn.on('pointerout', () => nextBtn.setStyle({ backgroundColor: '#0a0' }));
        nextBtn.on('pointerup', () => { currentLevelIndex++; restartWithTransition(this); });
        btnY += 45;
    }

    const restartBtn = this.add.text(400, btnY, isLastLevel ? 'PLAY AGAIN' : 'RESTART', {
        fontSize: '20px', fill: '#fff',
        backgroundColor: '#666', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: restartBtn, alpha: 1, duration: 300, delay: buttonDelay + 100 });
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#888' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#666' }));
    restartBtn.on('pointerup', () => {
        if (isLastLevel) currentLevelIndex = 0;
        restartWithTransition(this);
    });

    const menuBtn = this.add.text(400, btnY + 40, 'LEVEL SELECT', {
        fontSize: '18px', fill: '#fff',
        backgroundColor: '#06a', padding: { x: 20, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({ targets: menuBtn, alpha: 1, duration: 300, delay: buttonDelay + 200 });
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#08c' }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#06a' }));
    menuBtn.on('pointerup', () => {
        showingLevelSelect = true;
        restartWithTransition(this);
    });
}

let pauseMenuObjects = [];

function togglePause() {
    if (gameOver || levelComplete) {
        return;
    }

    isPaused = !isPaused;

    if (isPaused) {
        // Pause the game
        this.physics.pause();
        pauseButton.setText('RESUME');

        const scene = this;

        // Dark overlay
        const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
        bg.setScrollFactor(0).setDepth(1500);
        pauseMenuObjects.push(bg);

        // Title
        const title = scene.add.text(400, 150, 'PAUSED', {
            fontSize: '52px', fill: '#fff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        pauseMenuObjects.push(title);

        // Resume button
        const resumeBtn = scene.add.text(400, 240, 'RESUME', {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#0a0', padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        resumeBtn.setInteractive({ useHandCursor: true });
        resumeBtn.on('pointerover', () => resumeBtn.setStyle({ backgroundColor: '#0c0' }));
        resumeBtn.on('pointerout', () => resumeBtn.setStyle({ backgroundColor: '#0a0' }));
        resumeBtn.on('pointerup', () => { togglePause.call(scene); });
        pauseMenuObjects.push(resumeBtn);

        // Restart Level button
        const restartBtn = scene.add.text(400, 295, 'RESTART LEVEL', {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#c60', padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        restartBtn.setInteractive({ useHandCursor: true });
        restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#e80' }));
        restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#c60' }));
        restartBtn.on('pointerup', () => {
            cleanupPauseMenu();
            isPaused = false;
            scene.physics.resume();
            restartWithTransition(scene);
        });
        pauseMenuObjects.push(restartBtn);

        // Sound toggle button
        const soundLabel = audioMuted ? 'SOUND: OFF' : 'SOUND: ON';
        const soundColor = audioMuted ? '#800' : '#068';
        const soundHover = audioMuted ? '#a00' : '#08a';
        const soundBtn = scene.add.text(400, 350, soundLabel, {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: soundColor, padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        soundBtn.setInteractive({ useHandCursor: true });
        soundBtn.on('pointerover', () => soundBtn.setStyle({ backgroundColor: soundHover }));
        soundBtn.on('pointerout', () => soundBtn.setStyle({ backgroundColor: soundColor }));
        soundBtn.on('pointerup', () => {
            if (typeof toggleMute === 'function') toggleMute();
            const newLabel = audioMuted ? 'SOUND: OFF' : 'SOUND: ON';
            const newColor = audioMuted ? '#800' : '#068';
            soundBtn.setText(newLabel);
            soundBtn.setStyle({ backgroundColor: newColor });
        });
        pauseMenuObjects.push(soundBtn);

        // Level Select button
        const levelBtn = scene.add.text(400, 405, 'LEVEL SELECT', {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#06a', padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        levelBtn.setInteractive({ useHandCursor: true });
        levelBtn.on('pointerover', () => levelBtn.setStyle({ backgroundColor: '#08c' }));
        levelBtn.on('pointerout', () => levelBtn.setStyle({ backgroundColor: '#06a' }));
        levelBtn.on('pointerup', () => {
            cleanupPauseMenu();
            isPaused = false;
            scene.physics.resume();
            showingLevelSelect = true;
            scene.scene.restart();
        });
        pauseMenuObjects.push(levelBtn);

        // Quit to Menu button
        const quitBtn = scene.add.text(400, 460, 'QUIT TO MENU', {
            fontSize: '22px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#600', padding: { x: 30, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        quitBtn.setInteractive({ useHandCursor: true });
        quitBtn.on('pointerover', () => quitBtn.setStyle({ backgroundColor: '#800' }));
        quitBtn.on('pointerout', () => quitBtn.setStyle({ backgroundColor: '#600' }));
        quitBtn.on('pointerup', () => {
            cleanupPauseMenu();
            isPaused = false;
            scene.physics.resume();
            showingMenu = true;
            scene.scene.restart();
        });
        pauseMenuObjects.push(quitBtn);

    } else {
        // Resume the game
        this.physics.resume();
        pauseButton.setText('PAUSE');
        cleanupPauseMenu();
    }
}

function cleanupPauseMenu() {
    pauseMenuObjects.forEach(obj => obj.destroy());
    pauseMenuObjects = [];
}

// ========================
// Power-up System
// ========================

function collectPowerUp(player, powerUp) {
    const type = powerUp.powerUpType;
    const config = POWERUP_TYPES[type];
    if (!config) return;

    const px = powerUp.x;
    const py = powerUp.y;

    // Remove visual
    const idx = powerUpRects.findIndex(p => p.body === powerUp);
    if (idx !== -1) {
        powerUpRects[idx].rect.destroy();
        powerUpRects.splice(idx, 1);
    }
    powerUp.disableBody(true, true);

    // Cancel existing timer for this type
    if (powerUpTimers[type]) {
        powerUpTimers[type].remove();
    }

    // Activate
    activePowerUps[type] = true;
    if (type === 'doubleJump') hasDoubleJumped = false;

    // Show notification
    showScorePopup(this, px, py - 20, config.name, '#ffffff');
    spawnParticles(this, px, py, config.color, 10, 60);
    playSound('powerup');

    // Set deactivation timer
    powerUpTimers[type] = this.time.delayedCall(config.duration, () => {
        activePowerUps[type] = false;
        if (type === 'invincibility') {
            playerRect.setFillStyle(0x0000ff);
        }
    });

    // Warning flash before expiry (last 3 seconds)
    this.time.delayedCall(config.duration - 3000, () => {
        if (!activePowerUps[type]) return;
        showScorePopup(this, player.x, player.y - 30, `${config.name} ending!`, '#ffaa00');
    });
}

// ========================
// Projectile System
// ========================

function shootProjectile(enemy) {
    const direction = player.x < enemy.x ? -1 : 1;
    const projectile = projectiles.create(enemy.x + direction * 20, enemy.y, null).setDisplaySize(8, 8);
    projectile.setVelocityX(direction * 200);
    projectile.body.setAllowGravity(false);

    const projRect = this.add.rectangle(enemy.x + direction * 20, enemy.y, 8, 8, 0xffff00);
    projectileRects.push({ rect: projRect, body: projectile });

    // Destroy after 3 seconds
    this.time.delayedCall(3000, () => {
        const idx = projectileRects.findIndex(p => p.body === projectile);
        if (idx !== -1) {
            projectileRects[idx].rect.destroy();
            projectileRects.splice(idx, 1);
        }
        if (projectile.active) projectile.destroy();
    });
}

function hitByProjectile(player, projectile) {
    if (activePowerUps.invincibility || isDashing) {
        const idx = projectileRects.findIndex(p => p.body === projectile);
        if (idx !== -1) {
            projectileRects[idx].rect.destroy();
            projectileRects.splice(idx, 1);
        }
        projectile.destroy();
        return;
    }
    hitEnemy.call(this);
}

// ========================
// Breakable Blocks
// ========================

function breakFakeWall(wall) {
    // Find the fake wall data
    const fwIndex = fakeWalls.findIndex(fw => fw.body === wall);
    if (fwIndex === -1 || fakeWalls[fwIndex].broken) return;

    const fw = fakeWalls[fwIndex];
    fw.broken = true;

    // Particle burst to simulate crumbling
    spawnParticles(this, fw.x, fw.y, 0x888888, 12, 50);
    spawnParticles(this, fw.x, fw.y, 0xaaaaaa, 8, 30);

    // Fade out the visual rect
    this.tweens.add({
        targets: fw.rect,
        alpha: 0,
        duration: 200,
        ease: 'Power2'
    });

    // Remove the physics body
    wall.disableBody(true, true);

    // Play a sound (reuse stomp sound for wall breaking)
    playSound('stomp');

    // Reveal any nearby secret coins and power-ups whose triggers overlap this wall
    secretCoinRects.forEach(sc => {
        if (!sc.revealed && sc.trigger) {
            const dx = fw.x - sc.trigger.x;
            const dy = fw.y - sc.trigger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < sc.trigger.radius + Math.max(fw.width, fw.height)) {
                sc.revealed = true;
                sc.body.setAlpha(1);
                sc.body.body.enable = true;
                this.tweens.add({
                    targets: sc.rect,
                    alpha: 1,
                    duration: 400,
                    ease: 'Power2'
                });
                spawnParticles(this, sc.body.x, sc.body.y, 0xffd700, 4, 20);
            }
        }
    });

    secretPowerUpRects.forEach(spu => {
        if (!spu.revealed && spu.trigger) {
            const dx = fw.x - spu.trigger.x;
            const dy = fw.y - spu.trigger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < spu.trigger.radius + Math.max(fw.width, fw.height)) {
                spu.revealed = true;
                spu.body.setAlpha(1);
                spu.body.body.enable = true;
                this.tweens.add({
                    targets: spu.rect,
                    alpha: 1,
                    duration: 400,
                    ease: 'Power2'
                });
                spawnParticles(this, spu.body.x, spu.body.y, 0x00ffff, 6, 30);
            }
        }
    });
}

function handleBreakableBlockCollision(player, block) {
    // Break from below (player hitting head on block)
    const hitFromBelow = player.body.velocity.y < 0 && player.y > block.y;

    if (hitFromBelow) {
        breakBlock.call(this, block);
    }
}

function breakBlock(block) {
    const bx = block.x;
    const by = block.y;
    const contains = block.contains;

    // Find and remove visual
    const idx = breakableBlockRects.findIndex(b => b.body === block);
    if (idx !== -1) {
        const bbr = breakableBlockRects[idx];
        bbr.rect.destroy();
        bbr.x1.destroy();
        bbr.x2.destroy();
        breakableBlockRects.splice(idx, 1);
    }

    block.disableBody(true, true);

    // Spawn particles
    spawnParticles(this, bx, by, 0xc4a060, 8, 50);
    shakeCamera(this, 15, 60);

    // Spawn contents
    if (contains === 'coin') {
        const coin = coins.create(bx, by - 30, null).setDisplaySize(20, 20).refreshBody();
        const coinRect = this.add.rectangle(bx, by - 30, 20, 20, 0xffd700);
        coinRects.push({ rect: coinRect, body: coin });
    } else if (contains && POWERUP_TYPES[contains]) {
        const pu = powerUps.create(bx, by - 30, null).setDisplaySize(25, 25).refreshBody();
        pu.powerUpType = contains;
        const puRect = this.add.rectangle(bx, by - 30, 25, 25, POWERUP_TYPES[contains].color);
        puRect.setStrokeStyle(2, 0xffffff);
        powerUpRects.push({ rect: puRect, body: pu });
    }
}

// ========================
// Boss System
// ========================

function triggerBoss() {
    const scene = this;
    const arena = currentLevel.bossArena;
    bossActive = true;
    bossPhase = 0;
    bossHP = 9;
    bossAttackTimer = 2000;

    // Create invisible wall at arena entrance so player can't retreat
    bossArenaWall = scene.physics.add.sprite(arena.x, 400, null).setDisplaySize(20, 400);
    bossArenaWall.body.setImmovable(true);
    bossArenaWall.body.setAllowGravity(false);
    bossArenaWall.setAlpha(0);
    bossArenaWallRect = scene.add.rectangle(arena.x, 400, 20, 400, 0x440066, 0.3);
    scene.physics.add.collider(player, bossArenaWall);

    // Create boss physics sprite at center-right of arena
    const bossX = arena.x + arena.width * 0.65;
    const bossY = 500;
    bossSprite = scene.physics.add.sprite(bossX, bossY, null).setDisplaySize(64, 64);
    bossSprite.setBounce(0);
    bossSprite.setCollideWorldBounds(true);
    bossSprite.body.setMaxVelocityY(600);

    // Boss visual: dark purple rectangle with pulsing red core
    bossRect = scene.add.rectangle(bossX, bossY, 64, 64, 0x440066);
    bossRect.setStrokeStyle(3, 0x8800cc);
    bossCoreRect = scene.add.rectangle(bossX, bossY, 24, 24, 0xff0000);

    // Collide boss with platforms
    scene.physics.add.collider(bossSprite, platforms);
    movingPlatforms.forEach(mp => {
        scene.physics.add.collider(bossSprite, mp.sprite);
    });

    // Set up overlap for boss collision
    scene.physics.add.overlap(player, bossSprite, handleBossCollision, null, scene);

    // Boss walks left initially
    bossSprite.setVelocityX(-80);

    // Camera effects
    shakeCamera(scene, 50, 400);
    scene.cameras.main.flash(300, 68, 0, 102);

    // Boss entrance sound
    playSound('bossRoar');

    // Show "THE GUARDIAN" text with fade
    const titleText = scene.add.text(400, 200, 'THE GUARDIAN', {
        fontSize: '48px',
        fill: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(200);
    titleText.setScrollFactor(0);
    titleText.setAlpha(0);
    scene.tweens.add({
        targets: titleText,
        alpha: 1,
        duration: 500,
        yoyo: true,
        hold: 1500,
        onComplete: () => titleText.destroy()
    });

    // Boss HP bar (fixed to camera)
    bossHPBarBg = scene.add.rectangle(400, 560, 300, 16, 0x333333);
    bossHPBarBg.setScrollFactor(0).setDepth(150);
    bossHPBar = scene.add.rectangle(400, 560, 296, 12, 0x00ff00);
    bossHPBar.setScrollFactor(0).setDepth(151);
    bossHPText = scene.add.text(400, 560, 'THE GUARDIAN', {
        fontSize: '10px', fill: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(152);
}

function handleBossCollision(playerObj, boss) {
    if (gameOver || bossInvulnerable || !bossActive) return;

    // Check if player is falling and above the boss (stomp logic)
    const playerBottom = playerObj.y + playerObj.displayHeight / 2;
    const isFalling = playerObj.body.velocity.y > 0;
    const isAbove = playerBottom < boss.y - 10;

    if (isFalling && isAbove) {
        damageBoss.call(this);
    } else if (!activePowerUps.invincibility && !isDashing) {
        hitEnemy.call(this);
    } else {
        // Invincible or dashing - still damage boss
        damageBoss.call(this);
    }
}

function damageBoss() {
    const scene = this;
    bossHP--;
    bossInvulnerable = true;

    // Bounce player up
    player.setVelocityY(-350);

    // Visual feedback
    spawnParticles(scene, bossSprite.x, bossSprite.y, 0xff00ff, 12, 60);
    shakeCamera(scene, 35, 200);
    showScorePopup(scene, bossSprite.x, bossSprite.y - 40, 'HIT! ' + bossHP + ' HP', '#ff00ff');
    playSound('bossHit');

    // Flash boss white during invulnerability
    if (bossRect) bossRect.setFillStyle(0xffffff);
    scene.time.delayedCall(500, () => {
        bossInvulnerable = false;
        if (bossRect) bossRect.setFillStyle(bossPhase === 2 ? 0x660033 : 0x440066);
    });

    // Update HP bar
    if (bossHPBar) {
        const hpPct = bossHP / 9;
        bossHPBar.setScale(hpPct, 1);
        if (hpPct <= 0.33) bossHPBar.setFillStyle(0xff0000);
        else if (hpPct <= 0.66) bossHPBar.setFillStyle(0xff8800);
        else bossHPBar.setFillStyle(0x00ff00);
    }

    // Phase transitions
    if (bossHP === 6 && bossPhase === 0) {
        bossPhase = 1;
        bossAttackTimer = 1500;
        shakeCamera(scene, 50, 300);
        spawnParticles(scene, bossSprite.x, bossSprite.y, 0xff8800, 20, 80);
        const phaseText = scene.add.text(400, 250, 'PHASE 2', {
            fontSize: '36px', fill: '#ff8800', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        scene.tweens.add({
            targets: phaseText, alpha: 0, y: 220,
            duration: 1500, onComplete: () => phaseText.destroy()
        });
        if (bossRect) bossRect.setStrokeStyle(3, 0xff8800);
    }

    if (bossHP === 3 && bossPhase === 1) {
        bossPhase = 2;
        bossAttackTimer = 1000;
        bossSprite.body.setAllowGravity(false);
        bossSprite.startY = 300;
        shakeCamera(scene, 60, 400);
        spawnParticles(scene, bossSprite.x, bossSprite.y, 0xff0000, 25, 100);
        const phaseText = scene.add.text(400, 250, 'FINAL PHASE', {
            fontSize: '36px', fill: '#ff0000', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        scene.tweens.add({
            targets: phaseText, alpha: 0, y: 220,
            duration: 1500, onComplete: () => phaseText.destroy()
        });
        if (bossRect) {
            bossRect.setStrokeStyle(3, 0xff0000);
            bossRect.setFillStyle(0x660033);
        }
    }

    if (bossHP <= 0) {
        defeatBoss.call(scene);
    }
}

function updateBoss() {
    const scene = this;
    if (!bossActive || !bossSprite || !bossSprite.active) return;

    const arena = currentLevel.bossArena;
    const arenaLeft = arena.x + 30;
    const arenaRight = arena.x + arena.width - 30;
    const deltaMs = scene.game.loop.delta;

    // Update visual positions
    if (bossRect) bossRect.setPosition(bossSprite.x, bossSprite.y);
    if (bossCoreRect) {
        bossCoreRect.setPosition(bossSprite.x, bossSprite.y);
        const pulse = 1 + Math.sin(scene.time.now * 0.008) * 0.3;
        bossCoreRect.setScale(pulse);
        if (bossHP <= 3) {
            bossCoreRect.setFillStyle(scene.time.now % 200 < 100 ? 0xff0000 : 0xff4400);
        }
    }

    bossAttackTimer -= deltaMs;

    if (bossPhase === 0) {
        // Phase 1: Walk back and forth, periodic shockwave
        if (bossSprite.x <= arenaLeft) bossSprite.setVelocityX(80);
        else if (bossSprite.x >= arenaRight) bossSprite.setVelocityX(-80);

        if (bossAttackTimer <= 0) {
            bossAttackTimer = 3000;
            bossSprite.setVelocityY(-300);
            scene.time.delayedCall(600, () => {
                if (!bossActive) return;
                createBossShockwave.call(scene);
            });
        }
    } else if (bossPhase === 1) {
        // Phase 2: Faster movement, dash attacks, projectiles
        if (!bossDashing) {
            const speed = 140;
            if (bossSprite.x <= arenaLeft) bossSprite.setVelocityX(speed);
            else if (bossSprite.x >= arenaRight) bossSprite.setVelocityX(-speed);
        }

        if (bossDashing) {
            bossDashTimer -= deltaMs;
            if (bossDashTimer <= 0) {
                bossDashing = false;
                bossSprite.setVelocityX(player.x < bossSprite.x ? -140 : 140);
            }
        }

        if (bossAttackTimer <= 0) {
            bossAttackTimer = 2500;
            if (Math.random() > 0.4) {
                bossDashing = true;
                bossDashTimer = 200;
                const dashDir = player.x < bossSprite.x ? -1 : 1;
                bossSprite.setVelocityX(350 * dashDir);
                spawnParticles(scene, bossSprite.x, bossSprite.y, 0xff8800, 6, 30);
                playSound('dash');
            } else {
                shootBossProjectile.call(scene, bossSprite.x, bossSprite.y, player.x < bossSprite.x ? -1 : 1);
                if (Math.random() > 0.5) {
                    scene.time.delayedCall(300, () => {
                        if (!bossActive) return;
                        shootBossProjectile.call(scene, bossSprite.x, bossSprite.y, player.x < bossSprite.x ? -1 : 1);
                    });
                }
            }
        }
    } else if (bossPhase === 2) {
        // Phase 3: Flying sine-wave, rains projectiles
        const flySpeed = 100;
        if (bossSprite.x <= arenaLeft) bossSprite.setVelocityX(flySpeed);
        else if (bossSprite.x >= arenaRight) bossSprite.setVelocityX(-flySpeed);

        bossSprite.y = 300 + Math.sin(scene.time.now / 600) * 60;
        bossSprite.body.y = bossSprite.y - 32;

        if (bossAttackTimer <= 0) {
            bossAttackTimer = 1500;
            for (let i = -1; i <= 1; i++) {
                shootBossProjectileDown.call(scene, bossSprite.x + i * 40, bossSprite.y + 32, i * 50);
            }
            spawnParticles(scene, bossSprite.x, bossSprite.y + 32, 0xff4400, 4, 20);
        }
    }

    // Update boss projectile visuals
    bossProjectiles.forEach(p => {
        if (p.body && p.body.active) {
            p.rect.setPosition(p.body.x + 5, p.body.y + 5);
        }
    });
    bossProjectiles = bossProjectiles.filter(p => p.body && p.body.active);
}

function createBossShockwave() {
    const scene = this;
    if (!bossActive) return;
    const arena = currentLevel.bossArena;

    const swX = arena.x + arena.width / 2;
    const swY = 565;
    const sw = scene.physics.add.sprite(swX, swY, null).setDisplaySize(arena.width - 40, 20);
    sw.body.setImmovable(true);
    sw.body.setAllowGravity(false);

    const swRect = scene.add.rectangle(swX, swY, arena.width - 40, 20, 0xff4400, 0.8);
    swRect.setStrokeStyle(2, 0xff8800);

    scene.tweens.add({
        targets: swRect,
        alpha: 0, scaleY: 0.3,
        duration: 400, ease: 'Power2'
    });

    const overlap = scene.physics.add.overlap(player, sw, () => {
        if (!activePowerUps.invincibility && !isDashing) {
            hitEnemy.call(scene);
        }
        overlap.destroy();
    });

    shakeCamera(scene, 20, 150);
    playSound('stomp');

    scene.time.delayedCall(400, () => {
        sw.destroy();
        swRect.destroy();
        if (overlap && overlap.active !== false) overlap.destroy();
    });
}

function shootBossProjectile(x, y, direction) {
    const scene = this;
    if (!bossActive) return;

    const proj = projectiles.create(x + direction * 35, y, null).setDisplaySize(10, 10);
    proj.setVelocityX(direction * 220);
    proj.body.setAllowGravity(false);

    const projRect = scene.add.rectangle(x + direction * 35, y, 10, 10, 0xff4400);
    projRect.setStrokeStyle(1, 0xff8800);
    bossProjectiles.push({ rect: projRect, body: proj });

    scene.time.delayedCall(3000, () => {
        const idx = bossProjectiles.findIndex(p => p.body === proj);
        if (idx !== -1) {
            bossProjectiles[idx].rect.destroy();
            bossProjectiles.splice(idx, 1);
        }
        if (proj.active) proj.destroy();
    });
}

function shootBossProjectileDown(x, y, offsetX) {
    const scene = this;
    if (!bossActive) return;

    const proj = projectiles.create(x, y, null).setDisplaySize(10, 10);
    proj.setVelocityX(offsetX);
    proj.setVelocityY(250);
    proj.body.setAllowGravity(false);

    const projRect = scene.add.rectangle(x, y, 10, 10, 0xff2200);
    projRect.setStrokeStyle(1, 0xff6600);
    bossProjectiles.push({ rect: projRect, body: proj });

    scene.time.delayedCall(3000, () => {
        const idx = bossProjectiles.findIndex(p => p.body === proj);
        if (idx !== -1) {
            bossProjectiles[idx].rect.destroy();
            bossProjectiles.splice(idx, 1);
        }
        if (proj.active) proj.destroy();
    });
}

function defeatBoss() {
    const scene = this;
    bossActive = false;

    if (bossSprite) {
        bossSprite.body.setAllowGravity(false);
        bossSprite.setVelocity(0, 0);
    }

    shakeCamera(scene, 80, 800);

    let flashCount = 0;
    const savedBossX = bossSprite ? bossSprite.x : (currentLevel.bossArena.x + currentLevel.bossArena.width / 2);
    const savedBossY = bossSprite ? bossSprite.y : 400;
    scene.time.addEvent({
        delay: 100,
        repeat: 14,
        callback: () => {
            flashCount++;
            if (bossRect) {
                bossRect.setFillStyle(flashCount % 2 === 0 ? 0xffffff : 0xff0000);
            }
            spawnParticles(scene, savedBossX + (Math.random() - 0.5) * 40,
                savedBossY + (Math.random() - 0.5) * 40,
                [0xff0000, 0xff8800, 0xffff00, 0xff00ff][flashCount % 4], 5, 60);
        }
    });

    playSound('bossDefeat');

    scene.time.delayedCall(1500, () => {
        if (bossRect) {
            scene.tweens.add({
                targets: [bossRect, bossCoreRect],
                alpha: 0, scaleX: 2, scaleY: 2,
                duration: 500,
                onComplete: () => {
                    if (bossRect) bossRect.destroy();
                    if (bossCoreRect) bossCoreRect.destroy();
                    bossRect = null;
                    bossCoreRect = null;
                }
            });
        }
        if (bossSprite) bossSprite.disableBody(true, true);

        if (bossArenaWall) { bossArenaWall.destroy(); bossArenaWall = null; }
        if (bossArenaWallRect) { bossArenaWallRect.destroy(); bossArenaWallRect = null; }
        if (bossHPBar) bossHPBar.destroy();
        if (bossHPBarBg) bossHPBarBg.destroy();
        if (bossHPText) bossHPText.destroy();

        // Big explosion of particles
        for (let i = 0; i < 5; i++) {
            scene.time.delayedCall(i * 100, () => {
                spawnParticles(scene, savedBossX + (Math.random() - 0.5) * 80,
                    savedBossY + (Math.random() - 0.5) * 80, 0xff00ff, 15, 100);
            });
        }

        score += 2000;
        const highScore = highScores['level' + currentLevelIndex] || 0;
        scoreText.setText('Score: ' + score + ' | Best: ' + highScore);
        showScorePopup(scene, savedBossX, savedBossY - 50, '+2000', '#ff00ff');

        // Reveal the flag
        scene.time.delayedCall(500, () => {
            if (endFlag) {
                endFlag.setAlpha(1);
                endFlag.body.enable = true;
                bossFlagHidden = false;
                spawnParticles(scene, currentLevel.flagPosition.x, currentLevel.flagPosition.y, 0xffff00, 15, 60);
                shakeCamera(scene, 20, 200);
                showScorePopup(scene, currentLevel.flagPosition.x, currentLevel.flagPosition.y - 40, 'FLAG UNLOCKED!', '#ffff00');
                playSound('levelComplete');
            }
        });

        bossProjectiles.forEach(p => {
            if (p.rect) p.rect.destroy();
            if (p.body && p.body.active) p.body.destroy();
        });
        bossProjectiles = [];
    });
}

// ========================
// Visual Juice Functions
// ========================

function spawnParticles(scene, x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
        const size = 3 + Math.random() * 5;
        const particle = scene.add.rectangle(x, y, size, size, color);
        const angle = Math.random() * Math.PI * 2;
        const vel = speed * (0.5 + Math.random() * 0.5);
        scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * vel,
            y: y + Math.sin(angle) * vel - 20,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 300 + Math.random() * 200,
            ease: 'Power2',
            onComplete: () => particle.destroy()
        });
    }
}

function showScorePopup(scene, x, y, text, color) {
    const popup = scene.add.text(x, y, text, {
        fontSize: '16px',
        fill: color || '#fff',
        fontStyle: 'bold'
    });
    popup.setOrigin(0.5);
    scene.tweens.add({
        targets: popup,
        y: y - 40,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => popup.destroy()
    });
}

function shakeCamera(scene, intensity, duration) {
    scene.cameras.main.shake(duration, intensity / 1000);
}

function restartWithTransition(scene) {
    scene.cameras.main.fadeOut(300, 0, 0, 0);
    scene.time.delayedCall(300, () => {
        scene.scene.restart();
    });
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}
