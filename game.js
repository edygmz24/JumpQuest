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
let playerHatObjects = [];    // equipped cosmetic hat, drawn by cosmetics.js
let ghostHatObjects = [];     // same hat worn by the ghost replay
let walletText;               // HUD coin wallet counter
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
let highScores = JSON.parse(localStorage.getItem('jqHighScores') || localStorage.getItem('marioHighScores')) || {};

// Checkpoints
let checkpoints;
let checkpointRects = [];
let lastCheckpoint = null;

// Timer & Best Times
let levelTimer = 0;
let timerText;
let bestTimes = JSON.parse(localStorage.getItem('jqBestTimes') || localStorage.getItem('marioBestTimes')) || {};

// Lives System
let lives = 3;
let livesText;

// Moving Platforms
let movingPlatforms = [];

// Ambient floating background particles
let ambientParticles = [];

// Coin Magnet
const MAGNET_RADIUS = 90;
const MAGNET_PULL = 420; // max pull speed in px/s

// Physics Constants
// High accel/decel = snappy, grounded feel (player stops in ~4 frames instead of sliding)
const GROUND_ACCEL = 2600;
const GROUND_DECEL = 3400;
const AIR_ACCEL = 1600;
const AIR_DECEL = 800;
const TURN_BOOST = 2;       // extra accel multiplier when reversing direction
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
let playerBaseScale = 1; // raised by the 'bigPlayer' daily modifier

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
let wallSlideSoundTimer = 0; // throttles the scrape sound while sliding

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
let dashBufferTimer = 0;

// Accessibility
let colorblindMode = localStorage.getItem('jqColorblind') === 'true';

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
    // All art is generated procedurally in generateGameTextures()
}

// ========================
// Procedural Pixel Art
// ========================

function shadeColor(color, percent) {
    // percent > 0 lightens, < 0 darkens
    const c = Phaser.Display.Color.ValueToColor(color);
    const t = percent > 0 ? 255 : 0;
    const p = Math.abs(percent);
    const r = Math.round((t - c.red) * p) + c.red;
    const g = Math.round((t - c.green) * p) + c.green;
    const b = Math.round((t - c.blue) * p) + c.blue;
    return Phaser.Display.Color.GetColor(r, g, b);
}

function colorLuminance(color) {
    const c = Phaser.Display.Color.ValueToColor(color);
    return 0.299 * c.red + 0.587 * c.green + 0.114 * c.blue;
}

function generateGameTextures(scene) {
    const make = (key, w, h, draw) => {
        if (scene.textures.exists(key)) return;
        const g = scene.add.graphics();
        draw(g);
        g.generateTexture(key, w, h);
        g.destroy();
    };

    // --- Player: white base (tinted by cosmetic color), dark face details ---
    make('tex_player', 32, 32, g => {
        g.fillStyle(0xb0b0b0); g.fillRoundedRect(0, 0, 32, 32, 7);          // outline
        g.fillStyle(0xffffff); g.fillRoundedRect(2, 2, 28, 28, 6);          // body
        g.fillStyle(0xd5d5d5); g.fillRoundedRect(2, 20, 28, 10, { tl: 0, tr: 0, bl: 6, br: 6 }); // belly shade
        g.fillStyle(0x1a1a2e);                                              // eyes (face right)
        g.fillRect(15, 9, 5, 8); g.fillRect(24, 9, 5, 8);
        g.fillStyle(0xffffff);                                              // eye shine
        g.fillRect(17, 10, 2, 3); g.fillRect(26, 10, 2, 3);
        g.fillStyle(0x1a1a2e); g.fillRect(20, 21, 6, 2);                    // mouth
    });

    // --- Enemies ---
    make('tex_enemy_walker', 32, 32, g => {
        g.fillStyle(0xaa0000); g.fillRoundedRect(0, 4, 32, 26, 9);          // dark rim
        g.fillStyle(0xee2222); g.fillRoundedRect(2, 6, 28, 22, 8);          // body
        g.fillStyle(0xff6655); g.fillRoundedRect(5, 8, 22, 6, 3);           // top highlight
        g.fillStyle(0xffffff); g.fillRect(8, 14, 7, 6); g.fillRect(18, 14, 7, 6); // sclera
        g.fillStyle(0x220000); g.fillRect(12, 16, 3, 4); g.fillRect(19, 16, 3, 4); // pupils
        g.fillStyle(0x660000);                                              // angry brows
        g.fillRect(7, 12, 8, 2); g.fillRect(18, 12, 8, 2);
        g.fillStyle(0x770000); g.fillRect(6, 28, 8, 4); g.fillRect(18, 28, 8, 4); // feet
    });
    make('tex_enemy_jumper', 32, 40, g => {
        g.fillStyle(0xcc6600); g.fillRoundedRect(1, 0, 30, 28, 8);
        g.fillStyle(0xff8800); g.fillRoundedRect(3, 2, 26, 24, 7);
        g.fillStyle(0xffbb55); g.fillRoundedRect(6, 4, 20, 5, 2);
        g.fillStyle(0xffffff); g.fillRect(8, 10, 6, 7); g.fillRect(18, 10, 6, 7);
        g.fillStyle(0x331100); g.fillRect(10, 13, 3, 4); g.fillRect(20, 13, 3, 4);
        g.fillStyle(0x884400);                                              // spring legs
        g.fillRect(6, 28, 20, 2); g.fillRect(9, 31, 14, 2); g.fillRect(6, 34, 20, 2);
        g.fillRect(8, 37, 6, 3); g.fillRect(18, 37, 6, 3);
    });
    make('tex_enemy_flyer', 28, 28, g => {
        g.fillStyle(0xddddff, 0.85);                                        // wings
        g.fillTriangle(0, 14, 9, 6, 9, 20);
        g.fillTriangle(28, 14, 19, 6, 19, 20);
        g.fillStyle(0x550099); g.fillCircle(14, 14, 11);
        g.fillStyle(0x8822dd); g.fillCircle(14, 14, 9);
        g.fillStyle(0xbb66ff); g.fillCircle(11, 10, 3);                     // highlight
        g.fillStyle(0xffffff); g.fillRect(8, 11, 5, 6); g.fillRect(16, 11, 5, 6);
        g.fillStyle(0x220033); g.fillRect(10, 13, 3, 4); g.fillRect(17, 13, 3, 4);
    });
    make('tex_enemy_shooter', 32, 32, g => {
        g.fillStyle(0x550000); g.fillRect(2, 22, 28, 10);                   // base
        g.fillStyle(0x330000); g.fillRect(2, 22, 28, 3);
        g.fillStyle(0x880000);                                              // dome
        g.fillRoundedRect(4, 6, 24, 20, { tl: 12, tr: 12, bl: 0, br: 0 });
        g.fillStyle(0xbb2222); g.fillRoundedRect(7, 9, 12, 6, 3);           // highlight
        g.fillStyle(0xffdd00); g.fillCircle(16, 16, 5);                     // eye/cannon
        g.fillStyle(0x000000); g.fillCircle(16, 16, 2.5);
    });
    make('tex_enemy_shield', 32, 32, g => {
        g.fillStyle(0x005555); g.fillRoundedRect(0, 4, 32, 26, 8);
        g.fillStyle(0x00aaaa); g.fillRoundedRect(2, 6, 28, 22, 7);
        g.fillStyle(0x66dddd); g.fillRect(2, 11, 28, 5);                    // armor band
        g.fillStyle(0xeeeeee);                                              // rivets
        g.fillRect(5, 12, 3, 3); g.fillRect(14, 12, 3, 3); g.fillRect(24, 12, 3, 3);
        g.fillStyle(0xffffff); g.fillRect(8, 18, 6, 6); g.fillRect(18, 18, 6, 6);
        g.fillStyle(0x002222); g.fillRect(11, 20, 3, 4); g.fillRect(21, 20, 3, 4);
        g.fillStyle(0x003333); g.fillRect(6, 28, 8, 4); g.fillRect(18, 28, 8, 4);
    });

    // --- Coin: gold disc with rim + shine ---
    make('tex_coin', 20, 20, g => {
        g.fillStyle(0xb8860b); g.fillCircle(10, 10, 10);
        g.fillStyle(0xffd700); g.fillCircle(10, 10, 8);
        g.fillStyle(0xdaa520); g.fillCircle(10, 10, 5);
        g.fillStyle(0xfff3a8); g.fillRect(5, 4, 3, 3);                      // shine
    });

    // --- Spikes: two steel spikes on a dark base ---
    make('tex_spike', 30, 30, g => {
        g.fillStyle(0x441111); g.fillRect(0, 26, 30, 4);
        g.fillStyle(0x884444);
        g.fillTriangle(1, 27, 8, 2, 15, 27);
        g.fillTriangle(15, 27, 22, 2, 29, 27);
        g.fillStyle(0xcc8888);                                              // lit edge
        g.fillTriangle(1, 27, 8, 2, 8, 27);
        g.fillTriangle(15, 27, 22, 2, 22, 27);
        g.fillStyle(0xffeeee); g.fillRect(7, 2, 2, 5); g.fillRect(21, 2, 2, 5); // tips
    });

    // --- End flag: pole + golden pennant ---
    make('tex_flag', 40, 60, g => {
        g.fillStyle(0x555555); g.fillRect(3, 0, 5, 56);                     // pole
        g.fillStyle(0x999999); g.fillRect(3, 0, 2, 56);
        g.fillStyle(0xcccccc); g.fillCircle(5, 3, 4);                       // finial
        g.fillStyle(0xcc9900); g.fillTriangle(8, 4, 38, 13, 8, 24);         // pennant shadow
        g.fillStyle(0xffd700); g.fillTriangle(8, 4, 35, 12, 8, 21);
        g.fillStyle(0xfff3a8); g.fillTriangle(8, 6, 22, 10, 8, 14);         // highlight
        g.fillStyle(0x333333); g.fillRect(0, 56, 14, 4);                    // base
    });

    // --- Checkpoint flag: white base (tinted gray/green) ---
    make('tex_checkpoint', 20, 50, g => {
        g.fillStyle(0xbbbbbb); g.fillRect(2, 0, 4, 50);                     // pole
        g.fillStyle(0xeeeeee); g.fillRect(2, 0, 2, 50);
        g.fillStyle(0xffffff); g.fillTriangle(6, 2, 19, 8, 6, 15);          // flag
        g.fillStyle(0xcccccc); g.fillCircle(4, 2, 3);
    });

    // --- Power-up gem: white faceted diamond (tinted per type) ---
    make('tex_gem', 26, 26, g => {
        g.fillStyle(0x888888);
        g.fillTriangle(13, 0, 26, 13, 13, 26); g.fillTriangle(13, 0, 0, 13, 13, 26);
        g.fillStyle(0xffffff);
        g.fillTriangle(13, 2, 24, 13, 13, 24); g.fillTriangle(13, 2, 2, 13, 13, 24);
        g.fillStyle(0xcccccc); g.fillTriangle(13, 2, 24, 13, 13, 13);       // facet
        g.fillStyle(0xeeeeee); g.fillTriangle(13, 13, 13, 24, 2, 13);       // facet
        g.fillStyle(0xffffff, 0.9); g.fillRect(9, 6, 3, 3);                 // sparkle
    });

    // --- Crate (breakable block) ---
    make('tex_crate', 40, 40, g => {
        g.fillStyle(0x8a6a3a); g.fillRect(0, 0, 40, 40);
        g.fillStyle(0xc4a060); g.fillRect(2, 2, 36, 36);
        g.fillStyle(0xb08a4a);                                              // plank seams
        g.fillRect(2, 12, 36, 2); g.fillRect(2, 26, 36, 2);
        g.lineStyle(4, 0x8B6914, 1);                                        // X brace
        g.beginPath(); g.moveTo(4, 4); g.lineTo(36, 36); g.strokePath();
        g.beginPath(); g.moveTo(36, 4); g.lineTo(4, 36); g.strokePath();
        g.fillStyle(0x5a4420);                                              // corner bolts
        g.fillRect(3, 3, 4, 4); g.fillRect(33, 3, 4, 4); g.fillRect(3, 33, 4, 4); g.fillRect(33, 33, 4, 4);
    });

    // --- Moving platform plank ---
    make('tex_plank', 60, 20, g => {
        g.fillStyle(0x6e5236); g.fillRect(0, 0, 60, 20);
        g.fillStyle(0x9B7653); g.fillRect(1, 1, 58, 18);
        g.fillStyle(0xb98e66); g.fillRect(1, 1, 58, 4);                     // top light
        g.fillStyle(0x7d5f42); g.fillRect(19, 1, 2, 18); g.fillRect(39, 1, 2, 18); // seams
        g.fillStyle(0x4a3a24);                                              // bolts
        g.fillRect(4, 8, 3, 3); g.fillRect(53, 8, 3, 3);
    });

    // --- Cloud (parallax) ---
    make('tex_cloud', 110, 44, g => {
        g.fillStyle(0xffffff);
        g.fillCircle(25, 30, 14); g.fillCircle(50, 22, 19); g.fillCircle(78, 28, 15);
        g.fillCircle(95, 33, 10); g.fillRect(20, 28, 80, 14);
        g.fillStyle(0xe8eef4);
        g.fillRect(20, 38, 80, 4);
    });
}

// Draws a platform/ground block with top highlight and shaded sides.
// Returns the created game objects (so callers can fade/destroy them together).
function drawTerrainBlock(scene, x, y, w, h, color, isGround) {
    const parts = [];
    parts.push(scene.add.rectangle(x, y, w, h, color));
    // darker bottom edge
    const bottomH = Math.min(6, h * 0.3);
    parts.push(scene.add.rectangle(x, y + h / 2 - bottomH / 2, w, bottomH, shadeColor(color, -0.35)));
    // bright top lip (grass / surface)
    const topH = Math.min(6, h * 0.3);
    parts.push(scene.add.rectangle(x, y - h / 2 + topH / 2, w, topH, shadeColor(color, 0.35)));
    // side shading
    if (w > 24) {
        parts.push(scene.add.rectangle(x + w / 2 - 2, y, 4, h, shadeColor(color, -0.2)));
    }
    // grass tufts / speckles along the top of ground sections
    if (isGround) {
        const tuftColor = shadeColor(color, 0.45);
        for (let tx = x - w / 2 + 10; tx < x + w / 2 - 10; tx += 28 + Math.random() * 30) {
            parts.push(scene.add.rectangle(tx, y - h / 2 - 2, 3, 5, tuftColor));
        }
        // embedded "rocks"
        const rockColor = shadeColor(color, -0.3);
        for (let rx = x - w / 2 + 25; rx < x + w / 2 - 15; rx += 60 + Math.random() * 70) {
            parts.push(scene.add.rectangle(rx, y + 4 + Math.random() * (h / 2 - 8), 6, 4, rockColor));
        }
    }
    return parts;
}

function create() {
    // One-time migration of old localStorage keys
    if (localStorage.getItem('marioHighScores') && !localStorage.getItem('jqHighScores')) {
        localStorage.setItem('jqHighScores', localStorage.getItem('marioHighScores'));
    }
    if (localStorage.getItem('marioBestTimes') && !localStorage.getItem('jqBestTimes')) {
        localStorage.setItem('jqBestTimes', localStorage.getItem('marioBestTimes'));
    }
    localStorage.removeItem('marioHighScores');
    localStorage.removeItem('marioBestTimes');

    // Remove splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();

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
    playerBaseScale = 1;
    ambientParticles = [];
    powerUpRects = [];
    activePowerUps = { speed: false, doubleJump: false, invincibility: false, highJump: false };
    hasDoubleJumped = false;
    powerUpTimers = {};
    projectileRects = [];
    isWallSliding = false;
    wallSlideDir = 0;
    wallSlideSoundTimer = 0;
    playerHatObjects = [];
    ghostHatObjects = [];
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
    dashBufferTimer = 0;
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
    if (typeof initWallet === 'function') initWallet();
    if (typeof resetEconomyLevelState === 'function') resetEconomyLevelState();

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

    // Generate all procedural textures (no-op if already created)
    generateGameTextures(this);

    // Sky: vertical gradient (theme color fading toward a lighter horizon)
    const skyKey = 'sky_' + skyColor.toString(16);
    if (!this.textures.exists(skyKey)) {
        const g = this.add.graphics();
        const bands = 16;
        const top = Phaser.Display.Color.ValueToColor(skyColor);
        const bottom = Phaser.Display.Color.ValueToColor(shadeColor(skyColor, 0.35));
        for (let i = 0; i < bands; i++) {
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
            g.fillRect(0, i * (256 / bands), 32, 256 / bands + 1);
        }
        g.generateTexture(skyKey, 32, 256);
        g.destroy();
    }
    this.add.image(0, 0, skyKey).setOrigin(0, 0)
        .setDisplaySize(currentLevel.worldWidth, currentLevel.worldHeight).setDepth(-12);

    // Parallax decorations depend on how dark the sky is
    const bgWidth = currentLevel.worldWidth;
    const isNight = colorLuminance(skyColor) < 100;
    if (isNight) {
        // Stars + moon
        for (let i = 0; i < 50; i++) {
            const star = this.add.circle(Math.random() * bgWidth, 20 + Math.random() * 320,
                Math.random() < 0.2 ? 2 : 1, 0xffffff, 0.4 + Math.random() * 0.6);
            star.setScrollFactor(0.05).setDepth(-11);
            this.tweens.add({
                targets: star, alpha: 0.15, duration: 800 + Math.random() * 1800,
                yoyo: true, repeat: -1, delay: Math.random() * 2000
            });
        }
        this.add.circle(620, 90, 26, 0xf4f1de).setScrollFactor(0.03).setDepth(-11);
        this.add.circle(612, 82, 6, shadeColor(0xf4f1de, -0.15)).setScrollFactor(0.03).setDepth(-10.5);
        this.add.circle(630, 98, 4, shadeColor(0xf4f1de, -0.15)).setScrollFactor(0.03).setDepth(-10.5);
    } else {
        // Sun + drifting clouds
        const sun = this.add.circle(660, 80, 30, 0xfff3b0, 0.95).setScrollFactor(0.03).setDepth(-11);
        this.add.circle(660, 80, 42, 0xfff3b0, 0.25).setScrollFactor(0.03).setDepth(-11);
        const cloudCount = Math.max(5, Math.floor(bgWidth / 450));
        for (let i = 0; i < cloudCount; i++) {
            const cx = Math.random() * bgWidth;
            const cy = 50 + Math.random() * 180;
            const scale = 0.6 + Math.random() * 0.9;
            const cloud = this.add.image(cx, cy, 'tex_cloud')
                .setScale(scale).setAlpha(0.55 + Math.random() * 0.3)
                .setScrollFactor(0.1 + Math.random() * 0.15).setDepth(-10);
            this.tweens.add({
                targets: cloud, x: cx + 40 + Math.random() * 50,
                duration: 9000 + Math.random() * 8000, yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    // Distant rolling hills (two parallax layers, built from overlapping ellipses)
    for (let x = -100; x < bgWidth + 300; x += 260 + Math.random() * 160) {
        const w = 420 + Math.random() * 280;
        const h = 160 + Math.random() * 120;
        this.add.ellipse(x, 612, w, h, bgColor1, 0.55).setScrollFactor(0.15).setDepth(-9);
    }
    for (let x = -50; x < bgWidth + 300; x += 200 + Math.random() * 140) {
        const w = 300 + Math.random() * 220;
        const h = 110 + Math.random() * 90;
        this.add.ellipse(x, 616, w, h, bgColor2, 0.75).setScrollFactor(0.35).setDepth(-8);
    }

    // Ambient floating particles (fireflies at night, dust motes by day)
    ambientParticles = [];
    const ambColor = isNight ? 0xffe28a : 0xffffff;
    for (let i = 0; i < 14; i++) {
        const p = this.add.circle(Math.random() * 800, Math.random() * 500,
            isNight ? 2 : 1.5, ambColor, isNight ? 0.7 : 0.35);
        p.setDepth(-5);
        ambientParticles.push({
            obj: p,
            vx: (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.5) * 12,
            phase: Math.random() * Math.PI * 2
        });
    }

    // Create platform group
    platforms = this.physics.add.staticGroup();

    // Extended ground
    const groundSections = Math.ceil(currentLevel.worldWidth / 400);
    for (let i = 0; i < groundSections; i++) {
        platforms.create(200 + i * 400, 580, null).setDisplaySize(400, 40).setVisible(false).refreshBody();
        drawTerrainBlock(this, 200 + i * 400, 580, 400, 40, groundColor, true);
    }

    // Create platforms from level data
    currentLevel.platforms.forEach(platform => {
        platforms.create(platform.x, platform.y, null).setDisplaySize(platform.width, platform.height).setVisible(false).refreshBody();
        drawTerrainBlock(this, platform.x, platform.y, platform.width, platform.height, platformColor, false);
    });

    // Obstacles (spikes) from level data
    obstacles = this.physics.add.staticGroup();
    currentLevel.obstacles.forEach(obstacle => {
        obstacles.create(obstacle.x, obstacle.y, null).setDisplaySize(30, 30).setVisible(false).refreshBody();
        this.add.image(obstacle.x, obstacle.y, 'tex_spike');
    });

    // Coins from level data
    coins = this.physics.add.staticGroup();
    totalLevelCoins = (currentLevel.coins ? currentLevel.coins.length : 0);
    if (currentLevel.coins) {
        currentLevel.coins.forEach(coinData => {
            const coin = coins.create(coinData.x, coinData.y, null).setDisplaySize(20, 20).setVisible(false).refreshBody();
            const coinRect = this.add.image(coinData.x, coinData.y, 'tex_coin');
            coinRects.push({ rect: coinRect, body: coin });
        });
    }

    // Checkpoints from level data
    checkpoints = this.physics.add.staticGroup();
    if (currentLevel.checkpoints) {
        currentLevel.checkpoints.forEach(cpData => {
            const checkpoint = checkpoints.create(cpData.x, cpData.y, null).setDisplaySize(20, 50).setVisible(false).refreshBody();
            const cpRect = this.add.image(cpData.x, cpData.y, 'tex_checkpoint').setTint(0x999999); // Gray = inactive
            checkpointRects.push({ rect: cpRect, body: checkpoint, activated: false });
        });
    }

    // Player
    player = this.physics.add.sprite(currentLevel.playerStart.x, currentLevel.playerStart.y, null).setDisplaySize(32, 32).setVisible(false);
    playerRect = this.add.sprite(currentLevel.playerStart.x, currentLevel.playerStart.y, 'tex_player');
    playerRect.setDepth(10);

    // Equipped cosmetic hat
    if (typeof drawPlayerHat === 'function') {
        playerHatObjects = drawPlayerHat(this, playerRect);
    }

    // Ghost sprite (translucent player copy showing best-time replay)
    if (ghostReplay && ghostEnabled) {
        ghostSprite = this.add.image(ghostReplay[0]?.x || 100, ghostReplay[0]?.y || 500, 'tex_player').setAlpha(0.25);
        ghostSprite.setDepth(50);
        // The ghost wears the same hat, faded to match
        if (typeof drawPlayerHat === 'function') {
            ghostHatObjects = drawPlayerHat(this, ghostSprite, false);
            ghostHatObjects.forEach(o => o.setAlpha(0.25).setDepth(50));
        }
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

        const enemy = enemies.create(enemyData.x, enemyData.y, null).setDisplaySize(size, height).setVisible(false);
        const enemyTexKey = this.textures.exists('tex_enemy_' + type) ? 'tex_enemy_' + type : 'tex_enemy_walker';
        const enemyRect = this.add.sprite(enemyData.x, enemyData.y, enemyTexKey);

        // Shield enemies get a visible border
        if (type === 'shield') {
            const shieldBorder = this.add.rectangle(enemyData.x, enemyData.y, size + 6, height + 6);
            shieldBorder.setStrokeStyle(2, 0x00ffff);
            enemyRect.shieldBorder = shieldBorder;
        }

        // Colorblind mode: add shape indicators to distinguish enemy types
        if (colorblindMode) {
            let indicator;
            switch (type) {
                case 'walker':
                    // Small feet lines at bottom
                    indicator = this.add.text(enemyData.x, enemyData.y + height / 2 - 4, '..', {
                        fontSize: '10px', fill: '#fff'
                    }).setOrigin(0.5);
                    break;
                case 'jumper':
                    // Arrow on top
                    indicator = this.add.text(enemyData.x, enemyData.y - height / 2 + 2, '^', {
                        fontSize: '12px', fill: '#fff', fontStyle: 'bold'
                    }).setOrigin(0.5);
                    break;
                case 'flyer':
                    // Wing shapes on sides
                    indicator = this.add.text(enemyData.x, enemyData.y, '~  ~', {
                        fontSize: '10px', fill: '#fff'
                    }).setOrigin(0.5);
                    break;
                case 'shooter':
                    // Barrel dot in front
                    indicator = this.add.circle(enemyData.x + size / 2 + 4, enemyData.y, 3, 0xffffff);
                    break;
                case 'shield':
                    // S letter
                    indicator = this.add.text(enemyData.x, enemyData.y, 'S', {
                        fontSize: '14px', fill: '#fff', fontStyle: 'bold'
                    }).setOrigin(0.5);
                    break;
            }
            if (indicator) {
                enemyRect.cbIndicator = indicator;
            }
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
            const pu = powerUps.create(puData.x, puData.y, null).setDisplaySize(25, 25).setVisible(false).refreshBody();
            pu.powerUpType = puData.type;
            const puRect = this.add.image(puData.x, puData.y, 'tex_gem').setTint(config.color);
            powerUpRects.push({ rect: puRect, body: pu });
        });
    }

    // Breakable blocks from level data
    breakableBlocks = this.physics.add.staticGroup();
    if (currentLevel.breakableBlocks) {
        currentLevel.breakableBlocks.forEach(bbData => {
            const w = bbData.width || 40;
            const h = bbData.height || 40;
            const bb = breakableBlocks.create(bbData.x, bbData.y, null).setDisplaySize(w, h).setVisible(false).refreshBody();
            bb.contains = bbData.contains || null;
            const bbRect = this.add.image(bbData.x, bbData.y, 'tex_crate').setDisplaySize(w, h);
            breakableBlockRects.push({ rect: bbRect, body: bb, x1: null, x2: null });
        });
    }

    // --- Secret Areas ---

    // Fake Walls: look like platforms but can be dashed through
    fakeWalls = [];
    fakeWallRects = [];
    const fakeWallGroup = this.physics.add.staticGroup();
    if (currentLevel.fakeWalls) {
        currentLevel.fakeWalls.forEach(fwData => {
            const fw = fakeWallGroup.create(fwData.x, fwData.y, null).setDisplaySize(fwData.width, fwData.height).setVisible(false).refreshBody();
            // Must look identical to a real platform so the secret stays hidden
            const fwParts = drawTerrainBlock(this, fwData.x, fwData.y, fwData.width, fwData.height, platformColor, false);
            fakeWalls.push({ body: fw, rect: fwParts, x: fwData.x, y: fwData.y, width: fwData.width, height: fwData.height, broken: false });
            fakeWallRects.push(fwParts);
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
            platforms.create(sp.x, sp.y, null).setDisplaySize(sp.width, sp.height).setVisible(false).refreshBody();
            drawTerrainBlock(this, sp.x, sp.y, sp.width, sp.height, platformColor, false);
        });
    }

    // Invisible Platforms: barely visible until player stands on them
    invisiblePlatforms = [];
    invisiblePlatformRects = [];
    const invisPlatGroup = this.physics.add.staticGroup();
    if (currentLevel.invisiblePlatforms) {
        currentLevel.invisiblePlatforms.forEach(ipData => {
            const ip = invisPlatGroup.create(ipData.x, ipData.y, null).setDisplaySize(ipData.width, ipData.height).setVisible(false).refreshBody();
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
            const sc = coins.create(scData.x, scData.y, null).setDisplaySize(20, 20).setVisible(false).refreshBody();
            sc.setAlpha(0);
            sc.body.enable = false;
            const scRect = this.add.image(scData.x, scData.y, 'tex_coin');
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
            const spu = powerUps.create(spuData.x, spuData.y, null).setDisplaySize(25, 25).setVisible(false).refreshBody();
            spu.powerUpType = spuData.type;
            spu.setAlpha(0);
            spu.body.enable = false;
            const spuRect = this.add.image(spuData.x, spuData.y, 'tex_gem').setTint(puConfig.color);
            spuRect.setAlpha(0);
            powerUpRects.push({ rect: spuRect, body: spu });
            secretPowerUpRects.push({ rect: spuRect, body: spu, trigger: spuData.revealTrigger, revealed: false });
        });
    }

    // End flag at the position from level data
    endFlag = this.add.image(currentLevel.flagPosition.x, currentLevel.flagPosition.y, 'tex_flag');
    this.physics.add.existing(endFlag, true);
    // Gentle waving animation
    this.tweens.add({
        targets: endFlag, angle: { from: -2, to: 2 }, duration: 900,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

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
            const platform = this.physics.add.sprite(mp.x, mp.y, null).setDisplaySize(mp.width, mp.height).setVisible(false);
            platform.body.setImmovable(true);
            platform.body.setAllowGravity(false);

            const rect = this.add.image(mp.x, mp.y, 'tex_plank').setDisplaySize(mp.width, mp.height);

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

    const instructions = this.add.text(16, 50, 'Arrows: Move | Space: Jump | Shift: Dash | R: Retry', {
        fontSize: '14px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    instructions.setScrollFactor(0);
    // Fade the controls reminder out after a few seconds so it doesn't clutter the level view
    this.tweens.add({
        targets: instructions,
        alpha: 0,
        duration: 600,
        delay: 6000,
        ease: 'Power2',
        onComplete: () => instructions.destroy()
    });

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

    // Coin wallet display
    if (typeof getDisplayCoins === 'function') {
        walletText = this.add.text(16, 250, `● ${getDisplayCoins()}`, {
            fontSize: '14px',
            fill: '#ffcc33',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        });
        walletText.setScrollFactor(0).setDepth(100);
    }

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

    // Sound toggle button (always visible, bottom-right corner)
    const muteLabel = (typeof audioMuted !== 'undefined' && audioMuted) ? '[ MUSIC OFF ]' : '[ MUSIC ON ]';
    const muteBtn = this.add.text(784, 584, muteLabel, {
        fontSize: '11px', fill: '#aaa',
        fontFamily: 'monospace',
        padding: { x: 4, y: 3 }
    });
    muteBtn.setOrigin(1, 1).setScrollFactor(0).setDepth(2100).setAlpha(0.45);
    muteBtn.setInteractive({ useHandCursor: true });
    muteBtn.on('pointerover', () => muteBtn.setAlpha(0.85));
    muteBtn.on('pointerout', () => muteBtn.setAlpha(0.45));
    muteBtn.on('pointerup', () => {
        if (typeof toggleMute === 'function') toggleMute();
        muteBtn.setText((typeof audioMuted !== 'undefined' && audioMuted) ? '[ MUSIC OFF ]' : '[ MUSIC ON ]');
    });

    // Pause button
    pauseButton = this.add.text(750, 16, 'PAUSE', {
        fontSize: '16px',
        fill: '#fff',
        backgroundColor: '#666',
        padding: { x: 10, y: 5 }
    });
    pauseButton.setOrigin(1, 0);
    pauseButton.setScrollFactor(0);
    pauseButton.setDepth(2100);
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

    // R key for an instant retry — the "one more run" shortcut
    this.input.keyboard.on('keydown-R', () => {
        if (isPaused || gameOver || levelComplete) return;
        if (showingMenu || showingLevelSelect) return;
        restartWithTransition(this);
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
    const dashPct = Phaser.Math.Clamp(1 - dashCooldown / DASH_COOLDOWN, 0, 1);
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
    if (typeof updateHatPosition === 'function') {
        updateHatPosition(playerHatObjects, playerRect);
    }

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
        if (typeof updateHatPosition === 'function') {
            updateHatPosition(ghostHatObjects, ghostSprite);
        }
        ghostFrameIndex++;
    } else if (ghostSprite && ghostFrameIndex >= (ghostReplay?.length || 0)) {
        ghostSprite.setAlpha(0); // hide when replay ends
        ghostHatObjects.forEach(o => o.setAlpha(0));
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
            // Afterimage trail
            const after = this.add.image(player.x, player.y, 'tex_player')
                .setAlpha(0.35).setTint(0x66e0ff).setFlipX(playerRect.flipX).setDepth(9);
            this.tweens.add({
                targets: after, alpha: 0, duration: 180,
                onComplete: () => after.destroy()
            });
        }
    }

    // Dash buffer: store intent when on cooldown
    if (Phaser.Input.Keyboard.JustDown(dashKey) || touchDashPressed) {
        dashBufferTimer = 150;
    }
    dashBufferTimer -= this.game.loop.delta;

    if (dashBufferTimer > 0 && dashCooldown <= 0 && !isDashing) {
        touchDashPressed = false;
        dashBufferTimer = 0;
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
        // Scrape sound, throttled so it reads as a continuous slide
        wallSlideSoundTimer -= this.game.loop.delta;
        if (wallSlideSoundTimer <= 0) {
            playSound('wallSlide');
            wallSlideSoundTimer = 200;
        }
    } else {
        wallSlideSoundTimer = 0;
    }

    // --- Acceleration-based Movement (skip during dash) ---
    if (!isDashing) {
        const maxSpeed = activePowerUps.speed ? 330 : MAX_SPEED;
        const accel = onGround ? (activePowerUps.speed ? 3000 : GROUND_ACCEL) : AIR_ACCEL;
        const decel = onGround ? GROUND_DECEL : AIR_DECEL;
        let vx = player.body.velocity.x;

        if (cursors.left.isDown || touchLeft) {
            vx -= accel * (vx > 0 ? TURN_BOOST : 1) * deltaS;
            if (vx < -maxSpeed) vx = -maxSpeed;
        } else if (cursors.right.isDown || touchRight) {
            vx += accel * (vx < 0 ? TURN_BOOST : 1) * deltaS;
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

    // --- Facing, run wobble & dash lean ---
    playerRect.setFlipX(lastFacingDir === -1);
    if (isDashing) {
        playerRect.rotation = dashDirection * 0.2;
    } else if (onGround && Math.abs(player.body.velocity.x) > 30) {
        playerRect.rotation = Math.sin(this.time.now * 0.025) * 0.07;
        // Occasional running dust kicked up behind the player
        if (Math.random() < 0.1) {
            spawnParticles(this, player.x - lastFacingDir * 12, player.y + 14, 0xbbbbbb, 1, 12);
        }
    } else {
        playerRect.rotation = 0;
    }

    // --- Squash & Stretch ---
    const vy = player.body.velocity.y;
    if (!onGround) {
        if (vy < -50) {
            // Rising - stretch vertically
            playerRect.setScale(0.85 * playerBaseScale, 1.15 * playerBaseScale);
        } else if (vy > 50) {
            // Falling - stretch vertically
            playerRect.setScale(0.8 * playerBaseScale, 1.2 * playerBaseScale);
        } else {
            playerRect.setScale(playerBaseScale, playerBaseScale);
        }
    } else if (!landingSquash) {
        playerRect.setScale(playerBaseScale, playerBaseScale);
    }

    // --- Landing Detection ---
    if (onGround && !wasOnGround) {
        // Just landed
        landingSquash = true;
        playerRect.setScale(1.3 * playerBaseScale, 0.7 * playerBaseScale);
        this.tweens.add({
            targets: playerRect,
            scaleX: playerBaseScale,
            scaleY: playerBaseScale,
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

    // --- Coin Magnet: pull nearby coins toward the player ---
    coinRects.forEach(coinData => {
        const c = coinData.body;
        if (!c || !c.active || !c.body || !c.body.enable) return;
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < MAGNET_RADIUS * MAGNET_RADIUS && distSq > 4) {
            const dist = Math.sqrt(distSq);
            // Pull harder the closer the coin gets
            const pull = 140 + MAGNET_PULL * (1 - dist / MAGNET_RADIUS);
            c.x += (dx / dist) * pull * deltaS;
            c.y += (dy / dist) * pull * deltaS;
            c.refreshBody();
            // Sparkle trail while being pulled
            if (Math.random() < 0.2) {
                spawnParticles(this, c.x, c.y, 0xffd700, 1, 8);
            }
        }
    });

    // --- Coin Hover & Spin Animation ---
    const time = this.time.now;
    coinRects.forEach((coinData, i) => {
        if (coinData.rect && coinData.body) {
            coinData.rect.x = coinData.body.x;
            coinData.rect.y = coinData.body.y + Math.sin(time * 0.004 + i) * 3;
            // Fake 3D spin by oscillating horizontal scale
            coinData.rect.scaleX = 0.25 + Math.abs(Math.sin(time * 0.003 + i * 0.7)) * 0.75;
        }
    });

    // --- Ambient floating particles (drift and wrap around the camera view) ---
    const cam = this.cameras.main.worldView;
    ambientParticles.forEach(ap => {
        ap.obj.x += ap.vx * deltaS;
        ap.obj.y += (ap.vy + Math.sin(time * 0.001 + ap.phase) * 8) * deltaS;
        if (ap.obj.x < cam.x - 20) ap.obj.x = cam.x + cam.width + 10;
        if (ap.obj.x > cam.x + cam.width + 20) ap.obj.x = cam.x - 10;
        if (ap.obj.y < cam.y - 20) ap.obj.y = cam.y + cam.height + 10;
        if (ap.obj.y > cam.y + cam.height + 20) ap.obj.y = cam.y - 10;
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
                const timeSinceShot = this.time.now - enemy.lastShot;
                if (timeSinceShot > 2600 && !enemy.telegraphing) {
                    // Telegraph: show warning indicator
                    enemy.telegraphing = true;
                    const dir = player.x < enemy.x ? -1 : 1;
                    const warn = this.add.text(enemy.x + dir * 20, enemy.y - 20, '!', {
                        fontSize: '16px', fill: '#ff0000', fontStyle: 'bold'
                    }).setOrigin(0.5).setDepth(50);
                    const line = this.add.rectangle(enemy.x + dir * 30, enemy.y, 20, 2, 0xff0000, 0.6).setDepth(50);
                    this.time.delayedCall(400, () => {
                        warn.destroy();
                        line.destroy();
                    });
                }
                if (timeSinceShot > 3000) {
                    shootProjectile.call(this, enemy);
                    enemy.lastShot = this.time.now;
                    enemy.telegraphing = false;
                }
                break;
        }

        // Update enemy rectangle position
        if (enemyRects[index]) {
            enemyRects[index].setPosition(enemy.x, enemy.y);
            // Face direction of travel
            if (enemyRects[index].setFlipX && Math.abs(enemy.body.velocity.x) > 5) {
                enemyRects[index].setFlipX(enemy.body.velocity.x < 0);
            }
            // Update shield border position
            if (enemyRects[index].shieldBorder) {
                enemyRects[index].shieldBorder.setPosition(enemy.x, enemy.y);
            }
            // Update colorblind indicator position
            if (enemyRects[index].cbIndicator) {
                const ind = enemyRects[index].cbIndicator;
                if (type === 'shooter') {
                    const dir = player.x < enemy.x ? -1 : 1;
                    ind.setPosition(enemy.x + dir * 20, enemy.y);
                } else if (type === 'jumper') {
                    ind.setPosition(enemy.x, enemy.y - 18);
                } else if (type === 'walker') {
                    ind.setPosition(enemy.x, enemy.y + 12);
                } else {
                    ind.setPosition(enemy.x, enemy.y);
                }
            }
        }
    });

    // Close-call detection (near-miss with enemies)
    if (!activePowerUps.invincibility && !isDashing && !this._closeCallCooldown) {
        enemies.children.entries.forEach(enemy => {
            if (!enemy.active) return;
            const dx = Math.abs(player.x - enemy.x);
            const dy = Math.abs(player.y - enemy.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40 && dist > 20) {
                showScorePopup(this, player.x, player.y - 30, 'CLOSE!', '#ffffff');
                // Brief white flash
                const flash = this.add.rectangle(400, 300, 800, 600, 0xffffff, 0.2).setScrollFactor(0).setDepth(998);
                this.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
                this._closeCallCooldown = true;
                this.time.delayedCall(1000, () => { this._closeCallCooldown = false; });
            }
        });
    }

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
        playerRect.setTint(Math.floor(this.time.now / 100) % 2 === 0 ? 0xffffff : 0x88ccff);
    } else if (typeof applyPlayerColor === 'function') {
        applyPlayerColor(playerRect, this.time.now);
    }

    // Cosmetic trail particles
    if (typeof spawnTrailParticle === 'function' && (Math.abs(player.body.velocity.x) > 50 || Math.abs(player.body.velocity.y) > 100)) {
        spawnTrailParticle(this, player.x, player.y + 8);
    }

    // Tutorial hints
    if (typeof checkTutorialTriggers === 'function') {
        checkTutorialTriggers(this, player.x, currentLevelIndex);
    }

    // Achievement timers (play time, secret achievements)
    if (typeof updateAchievementTimers === 'function') {
        updateAchievementTimers(this, this.game.loop.delta);
    }

    // Check checkpoint activation based on player X position
    checkpointRects.forEach((cpData) => {
        if (!cpData.activated && player.x >= cpData.body.x) {
            cpData.activated = true;
            cpData.rect.setTint(0x44ff44); // Green = activated
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

            // Move player with platform if standing on it.
            // Vertical carry is deliberately not applied: gravity (800) far
            // outpaces platform speeds (~40-60), so the player tracks a
            // descending platform on its own, and collision lifts them on the
            // way up. Adding an explicit carry here fights the solver and
            // makes the ride drift.
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

    // Bank toward the persistent wallet (spendable currency, separate from score)
    if (typeof earnCoins === 'function') {
        earnCoins(1);
        if (walletText) walletText.setText(`● ${getDisplayCoins()}`);
    }

    // Visual juice: gold particle burst + score popup + sound
    const particleCount = comboMultiplier >= 2 ? 10 : 6;
    spawnParticles(this, cx, cy, 0xffd700, particleCount, 40);
    const popupText = comboMultiplier > 1 ? `+${points} x${comboMultiplier}` : `+${points}`;
    const popupColor = comboMultiplier >= 2.5 ? '#ff4444' : comboMultiplier >= 2 ? '#ff8800' : comboMultiplier >= 1.5 ? '#ffdd00' : '#ffd700';
    showScorePopup(this, cx, cy - 10, popupText, popupColor);
    playCoinSound(comboCount);

    // All coins collected: big bonus celebration
    if (totalLevelCoins > 0 && coinsCollected === totalLevelCoins) {
        score += 500;
        scoreText.setText(`Score: ${score} | Best: ${highScore}`);
        showScorePopup(this, player.x, player.y - 50, 'ALL COINS! +500', '#ffd700');
        spawnParticles(this, player.x, player.y, 0xffd700, 16, 70);
        spawnParticles(this, player.x, player.y - 20, 0xffffff, 8, 50);
        shakeCamera(this, 12, 100);
        playSound('unlock');
    }

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
        if (enemyRect.setTintFill) enemyRect.setTintFill(0xffffff); // white hit flash
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
        playerRect.setTint(0xff0000);

        // Losing the run still banks the coins earned during it
        if (typeof bankPendingCoins === 'function') bankPendingCoins();

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
        localStorage.setItem('jqHighScores', JSON.stringify(highScores));
    }

    // Save best time
    if (isNewBestTime) {
        bestTimes[levelKey] = levelTimer;
        localStorage.setItem('jqBestTimes', JSON.stringify(bestTimes));
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

    // Check if next level will be newly unlocked (before saving)
    const nextLevelExists = currentLevelIndex < levels.length - 1;
    const nextWasLocked = nextLevelExists && !completedLevels['level' + currentLevelIndex];

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

    // Bank the run's coins into the persistent wallet
    let coinsBanked = 0;
    if (typeof bankPendingCoins === 'function') {
        coinsBanked = bankPendingCoins();
        if (walletText) walletText.setText(`● ${getDisplayCoins()}`);
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

    // Show credits screen for game completion
    if (isLastLevel) {
        showCreditsScreen(scene, { score, levelTimer, coinsCollected, totalLevelCoins, deathCount, earnedStars, isNewHighScore, isNewBestTime, prevHighScore, prevBestTime });
        return;
    }

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

    // Personal-best ranking, shown to the right of the stars so the centered
    // stats column keeps its layout.
    if (leaderRanks.scoreRank > 0 || leaderRanks.timeRank > 0) {
        const rankLines = [];
        if (leaderRanks.scoreRank > 0) rankLines.push(`#${leaderRanks.scoreRank} SCORE`);
        if (leaderRanks.timeRank > 0) rankLines.push(`#${leaderRanks.timeRank} TIME`);
        const rankBadge = this.add.text(560, 190, rankLines.join('\n'), {
            fontSize: '16px', fill: '#ffd700', fontStyle: 'bold',
            align: 'center', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0).setScale(0.5);
        this.tweens.add({
            targets: rankBadge,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 400, delay: 1400, ease: 'Back.easeOut',
            onStart: () => spawnParticles(scene, 560, 190, 0xffd700, 8, 35)
        });
    }

    // Top runs for this level
    if (typeof getLeaderboard === 'function') {
        const lb = getLeaderboard(currentLevelIndex);
        if (lb.times && lb.times.length > 0) {
            const rows = lb.times.slice(0, 3)
                .map((e, i) => `${i + 1}. ${formatTime(e.time)}`)
                .join('\n');
            const lbPanel = this.add.text(560, 255, 'BEST RUNS\n' + rows, {
                fontSize: '12px', fill: '#aaddff', align: 'center', lineSpacing: 3
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000).setAlpha(0);
            this.tweens.add({ targets: lbPanel, alpha: 1, duration: 300, delay: statsDelay + 300 });
        }
    }

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
    let coinStr = `Coins: ${coinsCollected}/${totalLevelCoins}`;
    if (coinsBanked > 0) coinStr += `  (+${coinsBanked} banked)`;
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

    // "Level Unlocked!" banner
    if (nextWasLocked && nextLevelExists) {
        const unlockY = isFlawless ? deathY + 60 : deathY + 30;
        const unlockDelay = statsDelay + (isFlawless ? 1200 : 800);
        const unlockText = this.add.text(400, unlockY, `LEVEL ${currentLevelIndex + 2} UNLOCKED!`, {
            fontSize: '22px', fill: '#ffd700', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0).setScale(0.5);
        this.tweens.add({
            targets: unlockText,
            alpha: 1, scaleX: 1, scaleY: 1,
            duration: 400, delay: unlockDelay,
            ease: 'Back.easeOut',
            onStart: () => {
                spawnParticles(scene, 400, unlockY, 0xffd700, 10, 40);
                playSound('unlock');
            }
        });
    }

    // Buttons (appear after all stats)
    const unlockOffset = (nextWasLocked && nextLevelExists) ? 35 : 0;
    const buttonDelay = statsDelay + (isFlawless ? 1400 : 900) + (nextWasLocked ? 300 : 0);
    let btnY = (isFlawless ? deathY + 60 : deathY + 30) + unlockOffset;

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

        // Dark overlay (interactive to block clicks to game objects behind)
        const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
        bg.setScrollFactor(0).setDepth(1500).setInteractive();
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

        // Music volume slider
        const musicLabel = scene.add.text(280, 340, 'Music', {
            fontSize: '16px', fill: '#aaa'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1501);
        pauseMenuObjects.push(musicLabel);

        const musicSliderBg = scene.add.rectangle(440, 340, 160, 10, 0x444444).setScrollFactor(0).setDepth(1501);
        pauseMenuObjects.push(musicSliderBg);
        const musicSliderFill = scene.add.rectangle(440 - 80 + 80 * musicVolume, 340, 160 * musicVolume, 10, 0x08a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1502);
        musicSliderFill.x = 440 - 80;
        musicSliderFill.setDisplaySize(160 * musicVolume, 10);
        pauseMenuObjects.push(musicSliderFill);
        const musicHandle = scene.add.circle(440 - 80 + 160 * musicVolume, 340, 10, 0xffffff).setScrollFactor(0).setDepth(1503);
        musicHandle.setInteractive({ useHandCursor: true, draggable: true });
        scene.input.setDraggable(musicHandle);
        musicHandle.on('drag', (pointer, dragX) => {
            const clampedX = Phaser.Math.Clamp(dragX, 440 - 80, 440 + 80);
            musicHandle.x = clampedX;
            const val = (clampedX - (440 - 80)) / 160;
            musicSliderFill.setDisplaySize(160 * val, 10);
            if (typeof setMusicVolume === 'function') setMusicVolume(val);
        });
        pauseMenuObjects.push(musicHandle);

        // SFX volume slider
        const sfxLabel = scene.add.text(280, 380, 'SFX', {
            fontSize: '16px', fill: '#aaa'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1501);
        pauseMenuObjects.push(sfxLabel);

        const sfxSliderBg = scene.add.rectangle(440, 380, 160, 10, 0x444444).setScrollFactor(0).setDepth(1501);
        pauseMenuObjects.push(sfxSliderBg);
        const sfxSliderFill = scene.add.rectangle(440 - 80, 380, 160 * sfxVolume, 10, 0x068).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1502);
        pauseMenuObjects.push(sfxSliderFill);
        const sfxHandle = scene.add.circle(440 - 80 + 160 * sfxVolume, 380, 10, 0xffffff).setScrollFactor(0).setDepth(1503);
        sfxHandle.setInteractive({ useHandCursor: true, draggable: true });
        scene.input.setDraggable(sfxHandle);
        sfxHandle.on('drag', (pointer, dragX) => {
            const clampedX = Phaser.Math.Clamp(dragX, 440 - 80, 440 + 80);
            sfxHandle.x = clampedX;
            const val = (clampedX - (440 - 80)) / 160;
            sfxSliderFill.setDisplaySize(160 * val, 10);
            if (typeof setSfxVolume === 'function') setSfxVolume(val);
        });
        pauseMenuObjects.push(sfxHandle);

        // Mute All toggle
        const muteAllLabel = (sfxMuted && audioMuted) ? 'UNMUTE ALL' : 'MUTE ALL';
        const muteAllColor = (sfxMuted && audioMuted) ? '#800' : '#555';
        const muteBtn = scene.add.text(400, 420, muteAllLabel, {
            fontSize: '16px', fill: '#fff', fontStyle: 'bold',
            backgroundColor: muteAllColor, padding: { x: 20, y: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        muteBtn.setInteractive({ useHandCursor: true });
        muteBtn.on('pointerup', () => {
            if (typeof toggleMuteAll === 'function') toggleMuteAll();
            muteBtn.setText((sfxMuted && audioMuted) ? 'UNMUTE ALL' : 'MUTE ALL');
            muteBtn.setStyle({ backgroundColor: (sfxMuted && audioMuted) ? '#800' : '#555' });
        });
        pauseMenuObjects.push(muteBtn);

        // Colorblind mode toggle
        const cbLabel = colorblindMode ? 'COLORBLIND: ON' : 'COLORBLIND: OFF';
        const cbColor = colorblindMode ? '#068' : '#444';
        const cbBtn = scene.add.text(400, 448, cbLabel, {
            fontSize: '14px', fill: '#fff',
            backgroundColor: cbColor, padding: { x: 16, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
        cbBtn.setInteractive({ useHandCursor: true });
        cbBtn.on('pointerup', () => {
            colorblindMode = !colorblindMode;
            localStorage.setItem('jqColorblind', colorblindMode);
            cbBtn.setText(colorblindMode ? 'COLORBLIND: ON' : 'COLORBLIND: OFF');
            cbBtn.setStyle({ backgroundColor: colorblindMode ? '#068' : '#444' });
        });
        pauseMenuObjects.push(cbBtn);

        // Level Select button
        const levelBtn = scene.add.text(400, 480, 'LEVEL SELECT', {
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
            if (typeof endlessMode !== 'undefined') endlessMode = false;
            if (typeof dailyChallengeMode !== 'undefined') dailyChallengeMode = false;
            showingLevelSelect = true;
            restartWithTransition(scene);
        });
        pauseMenuObjects.push(levelBtn);

        // Quit to Menu button
        const quitBtn = scene.add.text(400, 535, 'QUIT TO MENU', {
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
            if (typeof endlessMode !== 'undefined') endlessMode = false;
            if (typeof dailyChallengeMode !== 'undefined') dailyChallengeMode = false;
            showingMenu = true;
            restartWithTransition(scene);
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
            if (typeof applyPlayerColor === 'function') applyPlayerColor(playerRect, Date.now());
            else playerRect.setTint(0x0000ff);
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
    const projectile = projectiles.create(enemy.x + direction * 20, enemy.y, null).setDisplaySize(8, 8).setVisible(false);
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
        if (bbr.x1) bbr.x1.destroy();
        if (bbr.x2) bbr.x2.destroy();
        breakableBlockRects.splice(idx, 1);
    }

    block.disableBody(true, true);

    // Spawn particles
    spawnParticles(this, bx, by, 0xc4a060, 8, 50);
    shakeCamera(this, 15, 60);

    // Spawn contents
    if (contains === 'coin') {
        const coin = coins.create(bx, by - 30, null).setDisplaySize(20, 20).setVisible(false).refreshBody();
        const coinRect = this.add.image(bx, by - 30, 'tex_coin');
        coinRects.push({ rect: coinRect, body: coin });
    } else if (contains && POWERUP_TYPES[contains]) {
        const pu = powerUps.create(bx, by - 30, null).setDisplaySize(25, 25).setVisible(false).refreshBody();
        pu.powerUpType = contains;
        const puRect = this.add.image(bx, by - 30, 'tex_gem').setTint(POWERUP_TYPES[contains].color);
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
    bossSprite = scene.physics.add.sprite(bossX, bossY, null).setDisplaySize(64, 64).setVisible(false);
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
    const sw = scene.physics.add.sprite(swX, swY, null).setDisplaySize(arena.width - 40, 20).setVisible(false);
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

    const proj = projectiles.create(x + direction * 35, y, null).setDisplaySize(10, 10).setVisible(false);
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

    const proj = projectiles.create(x, y, null).setDisplaySize(10, 10).setVisible(false);
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

const particlePool = [];
const PARTICLE_POOL_MAX = 200;

function spawnParticles(scene, x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
        let particle;
        if (particlePool.length > 0) {
            particle = particlePool.pop();
            particle.setPosition(x, y).setAlpha(1).setScale(1).setVisible(true).setActive(true);
            particle.setFillStyle(color);
        } else {
            const size = 3 + Math.random() * 5;
            particle = scene.add.rectangle(x, y, size, size, color);
        }
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
            onComplete: () => {
                particle.setVisible(false).setActive(false);
                if (particlePool.length < PARTICLE_POOL_MAX) {
                    particlePool.push(particle);
                } else {
                    particle.destroy();
                }
            }
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

function showCreditsScreen(scene, stats) {
    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
    overlay.setScrollFactor(0).setDepth(999);

    // Title
    const title = scene.add.text(400, 60, 'CONGRATULATIONS!', {
        fontSize: '42px', fill: '#ffd700', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    scene.tweens.add({ targets: title, alpha: 1, duration: 600, ease: 'Power2' });

    // Subtitle
    const sub = scene.add.text(400, 110, 'You conquered the tower and defeated The Guardian!', {
        fontSize: '16px', fill: '#aaa', fontStyle: 'italic'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    scene.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 500 });

    // Fireworks effect (repeating)
    const fireworkColors = [0xffd700, 0xff4444, 0x44ff44, 0x4488ff, 0xff44ff, 0x44ffff];
    let fireworkTimer = scene.time.addEvent({
        delay: 400,
        callback: () => {
            const fx = 100 + Math.random() * 600;
            const fy = 50 + Math.random() * 150;
            const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
            spawnParticles(scene, fx, fy, color, 8, 50);
        },
        loop: true
    });

    // Total stats across all levels
    const totalStars = typeof getTotalStars === 'function' ? getTotalStars() : 0;
    let totalCoins = 0, totalDeaths = 0;
    if (typeof jqStats !== 'undefined') {
        totalCoins = jqStats.totalCoins || 0;
        totalDeaths = jqStats.totalDeaths || 0;
    }

    const statsLines = [
        { text: `Total Stars: ${totalStars}/30`, color: '#ffd700', delay: 1000 },
        { text: `Total Coins Collected: ${totalCoins}`, color: '#ffd700', delay: 1200 },
        { text: `Total Deaths: ${totalDeaths}`, color: '#ff6666', delay: 1400 },
        { text: `Final Level Score: ${stats.score}`, color: '#00ff00', delay: 1600 },
        { text: `Final Level Time: ${formatTime(stats.levelTimer)}`, color: '#00ffff', delay: 1800 },
    ];

    statsLines.forEach((line, i) => {
        const t = scene.add.text(400, 160 + i * 28, line.text, {
            fontSize: '15px', fill: line.color
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
        scene.tweens.add({ targets: t, alpha: 1, duration: 300, delay: line.delay });
    });

    // Credits section
    const creditsY = 320;
    const creditLines = [
        { text: '--- CREDITS ---', color: '#888', size: '14px' },
        { text: 'JUMP QUEST', color: '#ffd700', size: '20px' },
        { text: 'A Platformer Adventure', color: '#aaa', size: '13px' },
        { text: '', color: '#000', size: '8px' },
        { text: 'Built with Phaser 3', color: '#888', size: '12px' },
        { text: 'Audio: Web Audio API + Top Floor Dash', color: '#888', size: '12px' },
        { text: 'Thank you for playing!', color: '#fff', size: '16px' },
    ];

    creditLines.forEach((line, i) => {
        const t = scene.add.text(400, creditsY + i * 22, line.text, {
            fontSize: line.size, fill: line.color, fontStyle: i === 1 ? 'bold' : ''
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
        scene.tweens.add({ targets: t, alpha: 1, duration: 300, delay: 2200 + i * 200 });
    });

    // Buttons
    const btnDelay = 3800;
    const playAgainBtn = scene.add.text(300, 520, 'PLAY AGAIN', {
        fontSize: '20px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#0a0', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    scene.tweens.add({ targets: playAgainBtn, alpha: 1, duration: 300, delay: btnDelay });
    playAgainBtn.setInteractive({ useHandCursor: true });
    playAgainBtn.on('pointerover', () => playAgainBtn.setStyle({ backgroundColor: '#0c0' }));
    playAgainBtn.on('pointerout', () => playAgainBtn.setStyle({ backgroundColor: '#0a0' }));
    playAgainBtn.on('pointerup', () => {
        fireworkTimer.remove();
        currentLevelIndex = 0;
        restartWithTransition(scene);
    });

    const menuBtn = scene.add.text(500, 520, 'MAIN MENU', {
        fontSize: '20px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#06a', padding: { x: 20, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    scene.tweens.add({ targets: menuBtn, alpha: 1, duration: 300, delay: btnDelay + 100 });
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#08c' }));
    menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#06a' }));
    menuBtn.on('pointerup', () => {
        fireworkTimer.remove();
        showingMenu = true;
        restartWithTransition(scene);
    });
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
