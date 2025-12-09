# Mario Game - Feature Implementation Guide

This document outlines new features to enhance gameplay and user engagement, ordered by recommended implementation priority.

---

## 1. Collectibles & Scoring System

**Priority: High | Difficulty: Easy**

### Description
Add coins scattered throughout levels that players collect for points. Display a running score and persist high scores.

### Implementation Details

#### Data Structure
Add to each level file:
```javascript
coins: [
    { x: 200, y: 450 },
    { x: 350, y: 420 },
    // ... more coin positions
]
```

#### Game Variables
```javascript
let coins;          // Physics group for coins
let coinRects = []; // Visual rectangles for coins
let score = 0;      // Current score
let highScores = JSON.parse(localStorage.getItem('marioHighScores')) || {};
```

#### In `loadLevel()` function
```javascript
// Create coins group
coins = this.physics.add.staticGroup();
currentLevel.coins.forEach(coinData => {
    const coin = coins.create(coinData.x, coinData.y, null).setDisplaySize(20, 20).refreshBody();
    const coinRect = this.add.rectangle(coinData.x, coinData.y, 20, 20, 0xffd700); // Gold color
    coinRects.push({ rect: coinRect, body: coin });
});

// Add collision
this.physics.add.overlap(player, coins, collectCoin, null, this);

// Score display (fixed to camera)
scoreText = this.add.text(16, 118, 'Score: 0', {
    fontSize: '14px',
    fill: '#fff',
    backgroundColor: '#000',
    padding: { x: 10, y: 5 }
});
scoreText.setScrollFactor(0);
```

#### Collect Coin Function
```javascript
function collectCoin(player, coin) {
    // Find and remove the visual rectangle
    const coinIndex = coinRects.findIndex(c => c.body === coin);
    if (coinIndex !== -1) {
        coinRects[coinIndex].rect.destroy();
        coinRects.splice(coinIndex, 1);
    }

    coin.disableBody(true, true);
    score += 100;
    scoreText.setText('Score: ' + score);
}
```

#### High Score Persistence
```javascript
// On level complete
function saveHighScore() {
    const levelKey = 'level' + currentLevelIndex;
    if (!highScores[levelKey] || score > highScores[levelKey]) {
        highScores[levelKey] = score;
        localStorage.setItem('marioHighScores', JSON.stringify(highScores));
    }
}
```

---

## 2. Stomp Enemies Mechanic

**Priority: High | Difficulty: Easy**

### Description
Allow players to defeat enemies by jumping on top of them, classic Mario-style. Getting hit from the side still kills the player.

### Implementation Details

#### Replace `hitEnemy` overlap callback
```javascript
this.physics.add.overlap(player, enemies, handleEnemyCollision, null, this);
```

#### New Collision Handler
```javascript
function handleEnemyCollision(player, enemy) {
    if (gameOver) return;

    // Check if player is falling and above the enemy
    const playerBottom = player.y + player.height / 2;
    const enemyTop = enemy.y - enemy.height / 2;
    const isFalling = player.body.velocity.y > 0;
    const isAbove = playerBottom < enemy.y;

    if (isFalling && isAbove) {
        // Stomp the enemy
        stompEnemy.call(this, enemy);
        // Bounce player up
        player.setVelocityY(-250);
    } else {
        // Player dies
        hitEnemy.call(this);
    }
}

function stompEnemy(enemy) {
    // Find and remove enemy visual
    const enemyIndex = enemies.children.entries.indexOf(enemy);
    if (enemyIndex !== -1 && enemyRects[enemyIndex]) {
        enemyRects[enemyIndex].destroy();
        enemyRects.splice(enemyIndex, 1);
    }

    enemy.disableBody(true, true);
    score += 200;
    scoreText.setText('Score: ' + score);
}
```

---

## 3. Checkpoints

**Priority: High | Difficulty: Easy**

### Description
Save player progress mid-level. When dying, respawn at the last checkpoint instead of the level start.

### Implementation Details

#### Data Structure
Add to each level file:
```javascript
checkpoints: [
    { x: 850, y: 480 },   // After section 1
    { x: 1580, y: 480 },  // After section 2
    { x: 2600, y: 480 }   // After section 3
]
```

#### Game Variables
```javascript
let checkpoints;
let checkpointRects = [];
let lastCheckpoint = null; // Stores {x, y} of last activated checkpoint
```

#### In `loadLevel()` function
```javascript
// Create checkpoints
checkpoints = this.physics.add.staticGroup();
currentLevel.checkpoints.forEach(cp => {
    const checkpoint = checkpoints.create(cp.x, cp.y, null).setDisplaySize(20, 50).refreshBody();
    const cpRect = this.add.rectangle(cp.x, cp.y, 20, 50, 0x888888); // Gray = inactive
    checkpointRects.push({ rect: cpRect, body: checkpoint, activated: false });
});

this.physics.add.overlap(player, checkpoints, activateCheckpoint, null, this);
```

#### Checkpoint Activation
```javascript
function activateCheckpoint(player, checkpoint) {
    const cpData = checkpointRects.find(c => c.body === checkpoint);
    if (cpData && !cpData.activated) {
        cpData.activated = true;
        cpData.rect.setFillStyle(0x00ff00); // Green = activated
        lastCheckpoint = { x: checkpoint.x, y: checkpoint.y - 30 };
    }
}
```

#### Modify `hitEnemy()` for Respawn
```javascript
function hitEnemy() {
    if (gameOver) return;

    if (lastCheckpoint) {
        // Respawn at checkpoint
        player.setPosition(lastCheckpoint.x, lastCheckpoint.y);
        playerRect.setPosition(lastCheckpoint.x, lastCheckpoint.y);
        player.setVelocity(0, 0);
        player.clearTint();
        // Brief invincibility could be added here
    } else {
        // No checkpoint - game over
        gameOver = true;
        this.physics.pause();
        // ... rest of game over logic
    }
}
```

---

## 4. Timer & Best Times

**Priority: Medium | Difficulty: Easy**

### Description
Track how long it takes to complete each level. Display current time and best time. Encourages speedrunning and replayability.

### Implementation Details

#### Game Variables
```javascript
let levelTimer = 0;
let timerText;
let bestTimes = JSON.parse(localStorage.getItem('marioBestTimes')) || {};
```

#### In `loadLevel()` function
```javascript
levelTimer = 0;

// Timer display
const bestTime = bestTimes['level' + currentLevelIndex];
const bestTimeStr = bestTime ? formatTime(bestTime) : '--:--';

timerText = this.add.text(650, 16, 'Time: 0:00\nBest: ' + bestTimeStr, {
    fontSize: '14px',
    fill: '#fff',
    backgroundColor: '#000',
    padding: { x: 10, y: 5 }
});
timerText.setScrollFactor(0);
```

#### In `update()` function
```javascript
// Update timer (delta is in ms)
levelTimer += this.game.loop.delta;
timerText.setText('Time: ' + formatTime(levelTimer) + '\nBest: ' +
    (bestTimes['level' + currentLevelIndex] ? formatTime(bestTimes['level' + currentLevelIndex]) : '--:--'));
```

#### Helper Function
```javascript
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}
```

#### Save Best Time on Level Complete
```javascript
function reachEnd() {
    // ... existing code ...

    // Save best time
    const levelKey = 'level' + currentLevelIndex;
    if (!bestTimes[levelKey] || levelTimer < bestTimes[levelKey]) {
        bestTimes[levelKey] = levelTimer;
        localStorage.setItem('marioBestTimes', JSON.stringify(bestTimes));
    }
}
```

---

## 5. Lives System

**Priority: Medium | Difficulty: Easy**

### Description
Give players multiple attempts per level instead of instant game over.

### Implementation Details

#### Game Variables
```javascript
let lives = 3;
let livesText;
```

#### In `loadLevel()` function
```javascript
// Only reset lives at level start, not checkpoint respawn
if (!lastCheckpoint) {
    lives = 3;
}

livesText = this.add.text(16, 152, 'Lives: ' + '❤'.repeat(lives), {
    fontSize: '14px',
    fill: '#ff0000',
    backgroundColor: '#000',
    padding: { x: 10, y: 5 }
});
livesText.setScrollFactor(0);
```

#### Modified Death Handler
```javascript
function hitEnemy() {
    if (gameOver) return;

    lives--;
    livesText.setText('Lives: ' + '❤'.repeat(lives));

    if (lives <= 0) {
        // Game over
        gameOver = true;
        this.physics.pause();
        // ... show game over screen
    } else {
        // Respawn at checkpoint or start
        const spawnPoint = lastCheckpoint || currentLevel.playerStart;
        player.setPosition(spawnPoint.x, spawnPoint.y);
        playerRect.setPosition(spawnPoint.x, spawnPoint.y);
        player.setVelocity(0, 0);

        // Brief invincibility
        player.setAlpha(0.5);
        this.time.delayedCall(2000, () => {
            player.setAlpha(1);
        });
    }
}
```

---

## 6. Power-ups

**Priority: Medium | Difficulty: Medium**

### Description
Add collectible power-ups that grant temporary abilities.

### Implementation Details

#### Power-up Types
```javascript
const POWERUP_TYPES = {
    SPEED: { color: 0x00ffff, duration: 5000, name: 'Speed Boost' },
    DOUBLE_JUMP: { color: 0xff00ff, duration: 8000, name: 'Double Jump' },
    INVINCIBILITY: { color: 0xffffff, duration: 3000, name: 'Invincibility' },
    HIGH_JUMP: { color: 0x00ff00, duration: 6000, name: 'High Jump' }
};
```

#### Data Structure
Add to each level file:
```javascript
powerups: [
    { x: 500, y: 350, type: 'SPEED' },
    { x: 1200, y: 250, type: 'DOUBLE_JUMP' }
]
```

#### Game Variables
```javascript
let powerups;
let powerupRects = [];
let activePowerups = {
    speed: false,
    doubleJump: false,
    invincibility: false,
    highJump: false
};
let hasDoubleJumped = false;
```

#### In `loadLevel()` function
```javascript
powerups = this.physics.add.staticGroup();
currentLevel.powerups?.forEach(pu => {
    const powerup = powerups.create(pu.x, pu.y, null).setDisplaySize(25, 25).refreshBody();
    powerup.powerupType = pu.type;
    const puRect = this.add.rectangle(pu.x, pu.y, 25, 25, POWERUP_TYPES[pu.type].color);
    powerupRects.push({ rect: puRect, body: powerup });
});

this.physics.add.overlap(player, powerups, collectPowerup, null, this);
```

#### Power-up Collection
```javascript
function collectPowerup(player, powerup) {
    const type = powerup.powerupType;
    const config = POWERUP_TYPES[type];

    // Remove visual
    const puIndex = powerupRects.findIndex(p => p.body === powerup);
    if (puIndex !== -1) {
        powerupRects[puIndex].rect.destroy();
        powerupRects.splice(puIndex, 1);
    }
    powerup.disableBody(true, true);

    // Activate power-up
    switch(type) {
        case 'SPEED':
            activePowerups.speed = true;
            break;
        case 'DOUBLE_JUMP':
            activePowerups.doubleJump = true;
            break;
        case 'INVINCIBILITY':
            activePowerups.invincibility = true;
            player.setTint(0xffffff);
            break;
        case 'HIGH_JUMP':
            activePowerups.highJump = true;
            break;
    }

    // Show power-up notification
    showPowerupNotification.call(this, config.name);

    // Set timer to deactivate
    this.time.delayedCall(config.duration, () => {
        deactivatePowerup(type);
    });
}

function deactivatePowerup(type) {
    switch(type) {
        case 'SPEED':
            activePowerups.speed = false;
            break;
        case 'DOUBLE_JUMP':
            activePowerups.doubleJump = false;
            break;
        case 'INVINCIBILITY':
            activePowerups.invincibility = false;
            player.clearTint();
            break;
        case 'HIGH_JUMP':
            activePowerups.highJump = false;
            break;
    }
}
```

#### Modified Movement in `update()`
```javascript
// Movement speed
const moveSpeed = activePowerups.speed ? 350 : 200;

if (cursors.left.isDown) {
    player.setVelocityX(-moveSpeed);
} else if (cursors.right.isDown) {
    player.setVelocityX(moveSpeed);
} else {
    player.setVelocityX(0);
}

// Jump
const jumpPower = activePowerups.highJump ? -550 : -400;
const canJump = player.body.touching.down ||
    (activePowerups.doubleJump && !hasDoubleJumped && !player.body.touching.down);

if ((cursors.up.isDown || cursors.space.isDown) && canJump) {
    if (!player.body.touching.down) {
        hasDoubleJumped = true;
    }
    player.setVelocityY(jumpPower);
}

// Reset double jump when landing
if (player.body.touching.down) {
    hasDoubleJumped = false;
}
```

#### Modified Enemy Collision
```javascript
function handleEnemyCollision(player, enemy) {
    if (gameOver) return;

    if (activePowerups.invincibility) {
        // Destroy enemy without taking damage
        stompEnemy.call(this, enemy);
        return;
    }

    // ... rest of collision logic
}
```

---

## 7. Moving Platforms

**Priority: Medium | Difficulty: Medium**

### Description
Add platforms that move horizontally or vertically, adding dynamic challenge.

### Implementation Details

#### Data Structure
Add to each level file:
```javascript
movingPlatforms: [
    { x: 600, y: 400, width: 100, height: 20, moveX: 150, moveY: 0, speed: 100 },
    { x: 1000, y: 350, width: 80, height: 20, moveX: 0, moveY: 100, speed: 80 }
]
```

#### Game Variables
```javascript
let movingPlatforms = [];
```

#### In `loadLevel()` function
```javascript
currentLevel.movingPlatforms?.forEach(mp => {
    const platform = this.physics.add.sprite(mp.x, mp.y, null).setDisplaySize(mp.width, mp.height);
    platform.body.setImmovable(true);
    platform.body.setAllowGravity(false);

    const rect = this.add.rectangle(mp.x, mp.y, mp.width, mp.height, 0x6B4423);

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
```

#### In `update()` function
```javascript
// Update moving platforms
movingPlatforms.forEach(mp => {
    const platform = mp.sprite;

    // Calculate movement
    if (mp.moveX > 0) {
        platform.x += mp.speed * mp.direction * (this.game.loop.delta / 1000);
        if (platform.x > mp.startX + mp.moveX || platform.x < mp.startX - mp.moveX) {
            mp.direction *= -1;
        }
    }

    if (mp.moveY > 0) {
        platform.y += mp.speed * mp.direction * (this.game.loop.delta / 1000);
        if (platform.y > mp.startY + mp.moveY || platform.y < mp.startY - mp.moveY) {
            mp.direction *= -1;
        }
    }

    // Update visual rectangle
    mp.rect.setPosition(platform.x, platform.y);

    // Move player with platform if standing on it
    if (player.body.touching.down) {
        // Check if player is on this platform
        const onPlatform = Math.abs(player.x - platform.x) < platform.width / 2 + player.width / 2 &&
                          Math.abs((player.y + player.height / 2) - (platform.y - platform.height / 2)) < 10;
        if (onPlatform && mp.moveX > 0) {
            player.x += mp.speed * mp.direction * (this.game.loop.delta / 1000);
            playerRect.x = player.x;
        }
    }
});
```

---

## 8. Enemy Variety

**Priority: Medium | Difficulty: Medium**

### Description
Add different enemy types with unique behaviors.

### Implementation Details

#### Enemy Types
```javascript
const ENEMY_TYPES = {
    WALKER: { color: 0xff0000, speed: 100 },      // Current behavior
    JUMPER: { color: 0xff6600, jumpInterval: 2000 },
    FLYER: { color: 0x9900ff, flyHeight: 50 },
    SHOOTER: { color: 0x00ff00, shootInterval: 3000 }
};
```

#### Data Structure
Modify level enemy data:
```javascript
enemies: [
    { x: 550, y: 360, type: 'WALKER' },
    { x: 900, y: 380, type: 'JUMPER' },
    { x: 1100, y: 250, type: 'FLYER' },
    { x: 1450, y: 340, type: 'SHOOTER' }
]
```

#### In `loadLevel()` function
```javascript
currentLevel.enemies.forEach(enemyData => {
    const type = enemyData.type || 'WALKER';
    const config = ENEMY_TYPES[type];

    const enemy = enemies.create(enemyData.x, enemyData.y, null).setDisplaySize(32, 32);
    const enemyRect = this.add.rectangle(enemyData.x, enemyData.y, 32, 32, config.color);

    enemy.enemyType = type;
    enemy.setBounce(type === 'WALKER' ? 1 : 0);
    enemy.setCollideWorldBounds(true);

    if (type === 'WALKER') {
        enemy.setVelocityX(Math.random() > 0.5 ? config.speed : -config.speed);
    } else if (type === 'FLYER') {
        enemy.body.setAllowGravity(false);
        enemy.startY = enemyData.y;
        enemy.setVelocityX(80);
    } else if (type === 'JUMPER') {
        enemy.lastJump = 0;
    } else if (type === 'SHOOTER') {
        enemy.lastShot = 0;
    }

    enemyRects.push({ rect: enemyRect, enemy: enemy });
});
```

#### In `update()` function
```javascript
enemies.children.entries.forEach((enemy, index) => {
    const type = enemy.enemyType || 'WALKER';

    switch(type) {
        case 'WALKER':
            // Existing patrol behavior
            if (enemy.body.velocity.x > 0 && enemy.body.blocked.right) {
                enemy.setVelocityX(-Math.abs(enemy.body.velocity.x));
            } else if (enemy.body.velocity.x < 0 && enemy.body.blocked.left) {
                enemy.setVelocityX(Math.abs(enemy.body.velocity.x));
            }
            break;

        case 'JUMPER':
            // Jump periodically
            if (this.time.now - enemy.lastJump > ENEMY_TYPES.JUMPER.jumpInterval) {
                if (enemy.body.touching.down) {
                    enemy.setVelocityY(-300);
                    enemy.lastJump = this.time.now;
                }
            }
            break;

        case 'FLYER':
            // Sine wave flight pattern
            enemy.y = enemy.startY + Math.sin(this.time.now / 500) * ENEMY_TYPES.FLYER.flyHeight;
            if (enemy.body.blocked.right) enemy.setVelocityX(-80);
            if (enemy.body.blocked.left) enemy.setVelocityX(80);
            break;

        case 'SHOOTER':
            // Shoot projectiles at player
            if (this.time.now - enemy.lastShot > ENEMY_TYPES.SHOOTER.shootInterval) {
                shootProjectile.call(this, enemy);
                enemy.lastShot = this.time.now;
            }
            break;
    }

    // Update visual
    if (enemyRects[index]) {
        enemyRects[index].rect.setPosition(enemy.x, enemy.y);
    }
});
```

#### Projectile System for Shooters
```javascript
let projectiles;
let projectileRects = [];

// In loadLevel()
projectiles = this.physics.add.group();
this.physics.add.overlap(player, projectiles, hitByProjectile, null, this);

function shootProjectile(enemy) {
    const direction = player.x < enemy.x ? -1 : 1;
    const projectile = projectiles.create(enemy.x, enemy.y, null).setDisplaySize(10, 10);
    projectile.setVelocityX(direction * 200);
    projectile.body.setAllowGravity(false);

    const projRect = this.add.rectangle(enemy.x, enemy.y, 10, 10, 0xffff00);
    projectileRects.push({ rect: projRect, body: projectile });

    // Destroy after 3 seconds
    this.time.delayedCall(3000, () => {
        const idx = projectileRects.findIndex(p => p.body === projectile);
        if (idx !== -1) {
            projectileRects[idx].rect.destroy();
            projectileRects.splice(idx, 1);
        }
        projectile.destroy();
    });
}

function hitByProjectile(player, projectile) {
    if (activePowerups.invincibility) {
        projectile.destroy();
        return;
    }
    hitEnemy.call(this);
}

// In update() - update projectile visuals
projectileRects.forEach(p => {
    if (p.body.active) {
        p.rect.setPosition(p.body.x, p.body.y);
    }
});
```

---

## 9. Sound & Music

**Priority: Low | Difficulty: Easy**

### Description
Add audio feedback for actions and background music.

### Implementation Details

#### Audio Files Needed
Create/obtain these audio files and place in an `assets/audio/` folder:
- `jump.mp3` - Short jump sound
- `coin.mp3` - Coin collection sound
- `death.mp3` - Player death sound
- `stomp.mp3` - Enemy stomp sound
- `powerup.mp3` - Power-up collection
- `checkpoint.mp3` - Checkpoint activation
- `levelcomplete.mp3` - Level completion fanfare
- `bgmusic.mp3` - Background music loop

#### In `preload()` function
```javascript
function preload() {
    this.load.audio('jump', 'assets/audio/jump.mp3');
    this.load.audio('coin', 'assets/audio/coin.mp3');
    this.load.audio('death', 'assets/audio/death.mp3');
    this.load.audio('stomp', 'assets/audio/stomp.mp3');
    this.load.audio('powerup', 'assets/audio/powerup.mp3');
    this.load.audio('checkpoint', 'assets/audio/checkpoint.mp3');
    this.load.audio('levelcomplete', 'assets/audio/levelcomplete.mp3');
    this.load.audio('bgmusic', 'assets/audio/bgmusic.mp3');
}
```

#### In `loadLevel()` function
```javascript
// Background music
if (!this.bgMusic || !this.bgMusic.isPlaying) {
    this.bgMusic = this.sound.add('bgmusic', { loop: true, volume: 0.3 });
    this.bgMusic.play();
}
```

#### Play Sounds at Appropriate Events
```javascript
// Jump (in update)
if ((cursors.up.isDown || cursors.space.isDown) && canJump) {
    player.setVelocityY(jumpPower);
    this.sound.play('jump', { volume: 0.5 });
}

// Coin collection
function collectCoin(player, coin) {
    this.sound.play('coin', { volume: 0.5 });
    // ... rest of function
}

// Enemy stomp
function stompEnemy(enemy) {
    this.sound.play('stomp', { volume: 0.5 });
    // ... rest of function
}

// Death
function hitEnemy() {
    this.sound.play('death', { volume: 0.5 });
    // ... rest of function
}

// Level complete
function reachEnd() {
    this.bgMusic.stop();
    this.sound.play('levelcomplete', { volume: 0.7 });
    // ... rest of function
}
```

#### Mute Toggle
```javascript
// Add mute button in loadLevel()
const muteButton = this.add.text(700, 50, 'MUTE', {
    fontSize: '14px',
    fill: '#fff',
    backgroundColor: '#666',
    padding: { x: 8, y: 4 }
});
muteButton.setScrollFactor(0);
muteButton.setInteractive({ useHandCursor: true });
muteButton.on('pointerup', () => {
    this.sound.mute = !this.sound.mute;
    muteButton.setText(this.sound.mute ? 'UNMUTE' : 'MUTE');
});
```

---

## 10. Level Select Screen

**Priority: Low | Difficulty: Medium**

### Description
Add a main menu with level selection, showing completion status and best scores.

### Implementation Details

#### Create New Scene
Create a new file `menu.js`:
```javascript
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Title
        this.add.text(400, 80, 'MARIO GAME', {
            fontSize: '48px',
            fill: '#ffff00'
        }).setOrigin(0.5);

        // Level buttons
        const levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
        const highScores = JSON.parse(localStorage.getItem('marioHighScores')) || {};
        const bestTimes = JSON.parse(localStorage.getItem('marioBestTimes')) || {};
        const completedLevels = JSON.parse(localStorage.getItem('marioCompleted')) || {};

        levels.forEach((name, index) => {
            const y = 180 + index * 80;
            const isUnlocked = index === 0 || completedLevels['level' + (index - 1)];

            // Level button
            const btn = this.add.text(400, y, name, {
                fontSize: '28px',
                fill: isUnlocked ? '#fff' : '#666',
                backgroundColor: isUnlocked ? '#0066cc' : '#333',
                padding: { x: 40, y: 10 }
            }).setOrigin(0.5);

            if (isUnlocked) {
                btn.setInteractive({ useHandCursor: true });
                btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#0088ff' }));
                btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#0066cc' }));
                btn.on('pointerup', () => {
                    currentLevelIndex = index;
                    this.scene.start('GameScene');
                });
            }

            // Stats
            const score = highScores['level' + index];
            const time = bestTimes['level' + index];
            const completed = completedLevels['level' + index];

            let statsText = '';
            if (completed) statsText += ' ✓';
            if (score) statsText += ` Score: ${score}`;
            if (time) statsText += ` Time: ${formatTime(time)}`;

            if (statsText) {
                this.add.text(400, y + 30, statsText, {
                    fontSize: '14px',
                    fill: '#aaa'
                }).setOrigin(0.5);
            }
        });
    }
}
```

#### Update Game Config
```javascript
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene]  // MenuScene loads first
};
```

#### Convert Game to Scene Class
```javascript
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // ... existing preload code
    }

    create() {
        // ... existing create code
    }

    update() {
        // ... existing update code
    }
}
```

#### Mark Level as Completed
```javascript
function reachEnd() {
    // ... existing code ...

    // Mark level as completed
    const completedLevels = JSON.parse(localStorage.getItem('marioCompleted')) || {};
    completedLevels['level' + currentLevelIndex] = true;
    localStorage.setItem('marioCompleted', JSON.stringify(completedLevels));
}
```

#### Return to Menu Button
Add in `loadLevel()`:
```javascript
const menuButton = this.add.text(16, 186, 'MENU', {
    fontSize: '14px',
    fill: '#fff',
    backgroundColor: '#666',
    padding: { x: 10, y: 5 }
});
menuButton.setScrollFactor(0);
menuButton.setInteractive({ useHandCursor: true });
menuButton.on('pointerup', () => {
    this.scene.start('MenuScene');
});
```

---

## 11. Visual Polish (Sprites & Particles)

**Priority: Low | Difficulty: Medium-Hard**

### Description
Replace colored rectangles with sprites and add particle effects.

### Implementation Details

#### Sprite Assets Needed
Create/obtain sprite sheets:
- `player.png` - Player character with animation frames
- `enemy.png` - Enemy sprite sheets for each type
- `coin.png` - Animated coin sprite
- `platform.png` - Tileable platform texture
- `background.png` - Parallax background layers

#### In `preload()` function
```javascript
function preload() {
    this.load.spritesheet('player', 'assets/sprites/player.png', {
        frameWidth: 32,
        frameHeight: 32
    });
    this.load.spritesheet('coin', 'assets/sprites/coin.png', {
        frameWidth: 20,
        frameHeight: 20
    });
    this.load.image('platform', 'assets/sprites/platform.png');
    this.load.image('background', 'assets/sprites/background.png');
}
```

#### Player Animations
```javascript
// In create()
this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
    frameRate: 1,
    repeat: -1
});

this.anims.create({
    key: 'walk',
    frames: this.anims.generateFrameNumbers('player', { start: 1, end: 4 }),
    frameRate: 10,
    repeat: -1
});

this.anims.create({
    key: 'jump',
    frames: this.anims.generateFrameNumbers('player', { start: 5, end: 5 }),
    frameRate: 1,
    repeat: -1
});

// Create player with sprite
player = this.physics.add.sprite(currentLevel.playerStart.x, currentLevel.playerStart.y, 'player');
```

#### Update Player Animation in `update()`
```javascript
if (!player.body.touching.down) {
    player.anims.play('jump', true);
} else if (cursors.left.isDown || cursors.right.isDown) {
    player.anims.play('walk', true);
    player.setFlipX(cursors.left.isDown);
} else {
    player.anims.play('idle', true);
}
```

#### Dust Particles on Landing
```javascript
// Create particle emitter in create()
const dustParticles = this.add.particles(0, 0, 'dust', {
    speed: { min: 20, max: 50 },
    scale: { start: 0.5, end: 0 },
    lifespan: 300,
    gravityY: 100
});

// Track if was in air
let wasInAir = false;

// In update()
if (!player.body.touching.down) {
    wasInAir = true;
} else if (wasInAir) {
    // Just landed - emit dust
    dustParticles.emitParticleAt(player.x, player.y + 16, 5);
    wasInAir = false;
}
```

#### Parallax Background
```javascript
// In loadLevel()
const bg = this.add.tileSprite(0, 0, currentLevel.worldWidth, currentLevel.worldHeight, 'background');
bg.setOrigin(0, 0);
bg.setScrollFactor(0.5); // Moves at half the camera speed

// In update()
bg.tilePositionX = this.cameras.main.scrollX * 0.5;
```

---

## Implementation Order Summary

| Priority | Feature | Difficulty | Dependencies |
|----------|---------|------------|--------------|
| 1 | Collectibles & Scoring | Easy | None |
| 2 | Stomp Enemies | Easy | None |
| 3 | Checkpoints | Easy | None |
| 4 | Timer & Best Times | Easy | Scoring (optional) |
| 5 | Lives System | Easy | Checkpoints |
| 6 | Power-ups | Medium | None |
| 7 | Moving Platforms | Medium | None |
| 8 | Enemy Variety | Medium | Stomp mechanic |
| 9 | Sound & Music | Easy | None (assets needed) |
| 10 | Level Select | Medium | Scoring, Timer |
| 11 | Visual Polish | Hard | All other features |

---

## Notes

- Each feature is designed to be modular and can be implemented independently
- Test thoroughly after each feature implementation
- Consider adding a debug mode (`arcade.debug: true`) during development
- Back up your code before making significant changes
- The code examples assume the current structure of `game.js`
