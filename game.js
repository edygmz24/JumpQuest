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
    totalLevelCoins = 0;
    coinsCollected = 0;

    // Load the current level
    loadLevel.call(this, currentLevelIndex);

    // Show main menu on first load
    if (showingMenu && typeof showMainMenu === 'function') {
        showMainMenu(this);
    } else if (showingLevelSelect && typeof showLevelSelect === 'function') {
        showLevelSelect(this);
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

    // End flag at the position from level data
    endFlag = this.add.rectangle(currentLevel.flagPosition.x, currentLevel.flagPosition.y, 40, 60, 0xffff00);
    this.physics.add.existing(endFlag, true);

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

    // Update timer
    levelTimer += this.game.loop.delta;
    const bestTime = bestTimes['level' + currentLevelIndex];
    const bestTimeStr = bestTime ? formatTime(bestTime) : '--:--';
    timerText.setText(`Time: ${formatTime(levelTimer)} | Best: ${bestTimeStr}`);

    // Update player rectangle position to follow physics sprite
    playerRect.setPosition(player.x, player.y);

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

    if (player.y > 600) {
        hitEnemy.call(this);
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
    score += 100;
    coinsCollected++;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);

    // Visual juice: gold particle burst + score popup + sound
    spawnParticles(this, cx, cy, 0xffd700, 6, 40);
    showScorePopup(this, cx, cy - 10, '+100', '#ffd700');
    playSound('coin');
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

    // Score: shield enemies are worth more
    const points = (enemy.enemyType === 'shield') ? 400 : 200;
    score += points;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);

    // Visual juice
    const color = ENEMY_TYPES[enemy.enemyType]?.color || 0xff0000;
    spawnParticles(this, ex, ey, color, 8, 50);
    shakeCamera(this, 25, 100);
    showScorePopup(this, ex, ey - 20, `+${points}`, '#ff4444');
    playSound('stomp');
}

function hitEnemy() {
    if (gameOver) return;

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
            this.scene.restart();
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

    // Save high score
    const levelKey = 'level' + currentLevelIndex;
    if (!highScores[levelKey] || score > highScores[levelKey]) {
        highScores[levelKey] = score;
        localStorage.setItem('marioHighScores', JSON.stringify(highScores));
        scoreText.setText(`Score: ${score} | Best: ${score} (NEW!)`);
    }

    // Save best time
    if (!bestTimes[levelKey] || levelTimer < bestTimes[levelKey]) {
        bestTimes[levelKey] = levelTimer;
        localStorage.setItem('marioBestTimes', JSON.stringify(bestTimes));
        timerText.setText(`Time: ${formatTime(levelTimer)} | Best: ${formatTime(levelTimer)} (NEW!)`);
    }

    // Save completion & stars
    let earnedStars = { completion: true, coins: false, time: false };
    if (typeof saveCompletion === 'function') {
        earnedStars = saveCompletion(currentLevelIndex, coinsCollected, totalLevelCoins, levelTimer);
    }

    const isLastLevel = currentLevelIndex >= levels.length - 1;

    // Overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    overlay.setScrollFactor(0).setDepth(999);

    const winText = this.add.text(400, 160,
        isLastLevel ? 'GAME COMPLETE!' : 'LEVEL COMPLETE!', {
        fontSize: '42px', fill: '#00ff00', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Star display
    const starLabels = ['Complete', 'Coins (80%)', 'Speed Run'];
    const starResults = [earnedStars.completion, earnedStars.coins, earnedStars.time];
    for (let i = 0; i < 3; i++) {
        const sy = 220 + i * 30;
        const icon = starResults[i] ? '\u2605' : '\u2606';
        const color = starResults[i] ? '#ffd700' : '#555';
        this.add.text(300, sy, `${icon} ${starLabels[i]}`, {
            fontSize: '18px', fill: color
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1000);
    }

    // Coin count
    this.add.text(400, 330, `Coins: ${coinsCollected}/${totalLevelCoins} | Time: ${formatTime(levelTimer)}`, {
        fontSize: '14px', fill: '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // Buttons
    let btnY = 380;

    if (!isLastLevel) {
        const nextBtn = this.add.text(400, btnY, 'NEXT LEVEL', {
            fontSize: '24px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: '#0a0', padding: { x: 20, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
        nextBtn.setInteractive({ useHandCursor: true });
        nextBtn.on('pointerover', () => nextBtn.setStyle({ backgroundColor: '#0c0' }));
        nextBtn.on('pointerout', () => nextBtn.setStyle({ backgroundColor: '#0a0' }));
        nextBtn.on('pointerup', () => { currentLevelIndex++; this.scene.restart(); });
        btnY += 50;
    }

    const restartBtn = this.add.text(400, btnY, isLastLevel ? 'PLAY AGAIN' : 'RESTART', {
        fontSize: '20px', fill: '#fff',
        backgroundColor: '#666', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#888' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#666' }));
    restartBtn.on('pointerup', () => {
        if (isLastLevel) currentLevelIndex = 0;
        this.scene.restart();
    });

    const menuBtn = this.add.text(400, btnY + 45, 'LEVEL SELECT', {
        fontSize: '18px', fill: '#fff',
        backgroundColor: '#06a', padding: { x: 20, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#08c' }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#06a' }));
    menuBtn.on('pointerup', () => {
        showingLevelSelect = true;
        this.scene.restart();
    });
}

function togglePause() {
    if (gameOver || levelComplete) {
        return;
    }

    isPaused = !isPaused;

    if (isPaused) {
        // Pause the game
        this.physics.pause();
        pauseButton.setText('RESUME');

        // Create pause overlay
        pauseOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
        pauseOverlay.setScrollFactor(0);
        pauseOverlay.setDepth(999);

        const pausedText = this.add.text(400, 250, 'PAUSED', {
            fontSize: '64px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 20, y: 10 }
        });
        pausedText.setOrigin(0.5);
        pausedText.setScrollFactor(0);
        pausedText.setDepth(1000);

        const resumeText = this.add.text(400, 330, 'Press ESC or click RESUME to continue', {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        });
        resumeText.setOrigin(0.5);
        resumeText.setScrollFactor(0);
        resumeText.setDepth(1000);

        // Store references for cleanup
        pauseOverlay.pausedText = pausedText;
        pauseOverlay.resumeText = resumeText;
    } else {
        // Resume the game
        this.physics.resume();
        pauseButton.setText('PAUSE');

        // Remove pause overlay
        if (pauseOverlay) {
            pauseOverlay.pausedText.destroy();
            pauseOverlay.resumeText.destroy();
            pauseOverlay.destroy();
            pauseOverlay = null;
        }
    }
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

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}
