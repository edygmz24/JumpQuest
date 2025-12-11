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

// Array of all levels (loaded from separate files)
const levels = [level1, level2, level3, level4, level5];

function preload() {
    // We'll use simple shapes instead of sprites for now
}

function create() {
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

    // Load the current level
    loadLevel.call(this, currentLevelIndex);
}

function loadLevel(levelIndex) {
    // Get level data
    currentLevel = levels[levelIndex];

    // Set world bounds based on level
    this.physics.world.setBounds(0, 0, currentLevel.worldWidth, currentLevel.worldHeight);

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, currentLevel.worldWidth, currentLevel.worldHeight);
    this.cameras.main.setZoom(1);

    // Create platform group (this will create a new group)
    platforms = this.physics.add.staticGroup();

    // Extended ground (multiple sections to cover the whole level)
    const groundSections = Math.ceil(currentLevel.worldWidth / 400);
    for (let i = 0; i < groundSections; i++) {
        platforms.create(200 + i * 400, 580, null).setDisplaySize(400, 40).refreshBody();
        this.add.rectangle(200 + i * 400, 580, 400, 40, 0x00aa00);
    }

    // Create platforms from level data
    currentLevel.platforms.forEach(platform => {
        platforms.create(platform.x, platform.y, null).setDisplaySize(platform.width, platform.height).refreshBody();
        this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x8B4513);
    });

    // Obstacles (spikes) from level data
    obstacles = this.physics.add.staticGroup();
    currentLevel.obstacles.forEach(obstacle => {
        obstacles.create(obstacle.x, obstacle.y, null).setDisplaySize(30, 30).refreshBody();
        this.add.rectangle(obstacle.x, obstacle.y, 30, 30, 0xff0000);
    });

    // Coins from level data
    coins = this.physics.add.staticGroup();
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
    player.setBounce(0.1);
    player.setCollideWorldBounds(true);

    // Camera follows player
    this.cameras.main.startFollow(player, true, 0.1, 0.1);

    // Enemies from level data
    enemies = this.physics.add.group();
    currentLevel.enemies.forEach(enemyData => {
        const enemy = enemies.create(enemyData.x, enemyData.y, null).setDisplaySize(32, 32);
        const enemyRect = this.add.rectangle(enemyData.x, enemyData.y, 32, 32, 0xff0000);
        enemyRects.push(enemyRect);
        enemy.setBounce(1);
        enemy.setCollideWorldBounds(true);
        enemy.setVelocityX(Math.random() > 0.5 ? 100 : -100);
    });

    // End flag at the position from level data
    endFlag = this.add.rectangle(currentLevel.flagPosition.x, currentLevel.flagPosition.y, 40, 60, 0xffff00);
    this.physics.add.existing(endFlag, true);

    // Start indicator
    startText = this.add.text(50, 450, 'START', { fontSize: '20px', fill: '#fff' });

    // Collisions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);
    this.physics.add.overlap(player, enemies, handleEnemyCollision, null, this);
    this.physics.add.overlap(player, endFlag, reachEnd, null, this);
    this.physics.add.overlap(player, obstacles, hitEnemy, null, this);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
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

    // Controls
    cursors = this.input.keyboard.createCursorKeys();

    // Level name and instructions - fixed to camera
    const levelName = this.add.text(16, 16, currentLevel.name, {
        fontSize: '18px',
        fill: '#ffff00',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    levelName.setScrollFactor(0);

    const instructions = this.add.text(16, 50, 'Arrow Keys to Move | Space to Jump | Reach the Yellow Flag!', {
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
    if (gameOver || levelComplete || isPaused) {
        return;
    }

    // Update timer
    levelTimer += this.game.loop.delta;
    const bestTime = bestTimes['level' + currentLevelIndex];
    const bestTimeStr = bestTime ? formatTime(bestTime) : '--:--';
    timerText.setText(`Time: ${formatTime(levelTimer)} | Best: ${bestTimeStr}`);

    // Update player rectangle position to follow physics sprite
    playerRect.setPosition(player.x, player.y);

    // Player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown) {
        player.setVelocityX(200);
    } else {
        player.setVelocityX(0);
    }

    // Jump
    if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
        player.setVelocityY(-400);
    }

    // Enemy patrol behavior and update visual rectangles
    enemies.children.entries.forEach((enemy, index) => {
        // Skip inactive enemies (stomped)
        if (!enemy.active) return;

        if (enemy.body.velocity.x > 0 && enemy.body.blocked.right) {
            enemy.setVelocityX(-Math.abs(enemy.body.velocity.x));
        } else if (enemy.body.velocity.x < 0 && enemy.body.blocked.left) {
            enemy.setVelocityX(Math.abs(enemy.body.velocity.x));
        }
        // Update enemy rectangle position
        if (enemyRects[index]) {
            enemyRects[index].setPosition(enemy.x, enemy.y);
        }
    });

    // Check checkpoint activation based on player X position
    checkpointRects.forEach((cpData) => {
        if (!cpData.activated && player.x >= cpData.body.x) {
            cpData.activated = true;
            cpData.rect.setFillStyle(0x00ff00); // Green = activated
            lastCheckpoint = { x: cpData.body.x, y: cpData.body.y - 30 };

            // Visual feedback - brief scale animation
            this.tweens.add({
                targets: cpData.rect,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Power2'
            });
        }
    });

    // Fall off world

    // Update moving platforms
    movingPlatforms.forEach(mp => {
        const platform = mp.sprite;
        const deltaTime = this.game.loop.delta / 1000;

        // Calculate movement
        if (mp.moveX > 0) {
            platform.x += mp.speed * mp.direction * deltaTime;
            if (platform.x > mp.startX + mp.moveX || platform.x < mp.startX) {
                mp.direction *= -1;
            }
        }

        if (mp.moveY > 0) {
            platform.y += mp.speed * mp.direction * deltaTime;
            if (platform.y > mp.startY + mp.moveY || platform.y < mp.startY) {
                mp.direction *= -1;
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

    if (player.y > 600) {
        hitEnemy.call(this);
    }
}

function collectCoin(player, coin) {
    // Find and remove the visual rectangle
    const coinIndex = coinRects.findIndex(c => c.body === coin);
    if (coinIndex !== -1) {
        coinRects[coinIndex].rect.destroy();
        coinRects.splice(coinIndex, 1);
    }

    coin.disableBody(true, true);
    score += 100;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);
}

function handleEnemyCollision(player, enemy) {
    if (gameOver) return;

    // Check if player is falling and above the enemy
    const playerBottom = player.y + player.displayHeight / 2;
    const enemyTop = enemy.y - enemy.displayHeight / 2;
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
    // Find the enemy visual
    const enemyIndex = enemies.children.entries.indexOf(enemy);
    const enemyRect = enemyRects[enemyIndex];

    // Disable enemy physics immediately
    enemy.disableBody(true, true);

    // Animate the visual rectangle (squish, then fade out)
    if (enemyRect) {
        // Squish effect - flatten vertically
        this.tweens.add({
            targets: enemyRect,
            scaleY: 0.2,
            scaleX: 1.5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                enemyRect.destroy();
            }
        });
        // Remove from array (set to null to maintain indices during animation)
        enemyRects[enemyIndex] = null;
    }

    // Update score
    score += 200;
    const highScore = highScores['level' + currentLevelIndex] || 0;
    scoreText.setText(`Score: ${score} | Best: ${highScore}`);
}

function hitEnemy() {
    if (gameOver) return;

    // Decrease lives
    lives--;
    livesText.setText(`Lives: ${'❤'.repeat(lives)}`);

    if (lives <= 0) {
        // Game over - no more lives
        gameOver = true;
        this.physics.pause();
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

    // Check if there are more levels
    const isLastLevel = currentLevelIndex >= levels.length - 1;

    const winText = this.add.text(this.cameras.main.centerX, 280,
        isLastLevel ? 'GAME COMPLETE!' : 'LEVEL COMPLETE!', {
        fontSize: '48px',
        fill: '#00ff00',
        backgroundColor: '#000',
        padding: { x: 20, y: 10 }
    });
    winText.setOrigin(0.5);
    winText.setScrollFactor(0);

    if (!isLastLevel) {
        const nextLevelButton = this.add.text(this.cameras.main.centerX, 360, 'NEXT LEVEL', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#0a0',
            padding: { x: 20, y: 10 }
        });
        nextLevelButton.setOrigin(0.5);
        nextLevelButton.setScrollFactor(0);
        nextLevelButton.setDepth(1000);
        nextLevelButton.setInteractive({ useHandCursor: true });
        nextLevelButton.on('pointerover', () => {
            nextLevelButton.setStyle({ backgroundColor: '#0c0' });
        });
        nextLevelButton.on('pointerout', () => {
            nextLevelButton.setStyle({ backgroundColor: '#0a0' });
        });
        nextLevelButton.on('pointerup', () => {
            currentLevelIndex++;
            this.scene.restart();
        });
    }

    const restartButton = this.add.text(this.cameras.main.centerX, 420,
        isLastLevel ? 'PLAY AGAIN' : 'RESTART LEVEL', {
        fontSize: '28px',
        fill: '#fff',
        backgroundColor: '#666',
        padding: { x: 20, y: 10 }
    });
    restartButton.setOrigin(0.5);
    restartButton.setScrollFactor(0);
    restartButton.setDepth(1000);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerover', () => {
        restartButton.setStyle({ backgroundColor: '#888' });
    });
    restartButton.on('pointerout', () => {
        restartButton.setStyle({ backgroundColor: '#666' });
    });
    restartButton.on('pointerup', () => {
        if (isLastLevel) {
            currentLevelIndex = 0;
        }
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

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
}
