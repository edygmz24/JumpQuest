// ========================
// The goal pole, the results count-up, and bonus rounds
// ========================
// Finishing a level is an event:
//
//  - The goal is a pole. The higher up it you grab, the bigger the bonus;
//    the top pays the most and a few coins on top. The hero slides down
//    before the results appear. (Speedruns skip the slide.)
//  - Beating the level's target time pays a time bonus.
//  - On the results screen the score counts up from zero.
//  - After the second level of each world, a bonus round: twenty seconds
//    of coins raining from the sky, all of them banked.

const GOAL_TIERS = [
    { min: 135, points: 2000, label: 'TOP!', coins: 5 },
    { min: 90, points: 1000, label: 'HIGH!' },
    { min: 45, points: 400, label: 'NICE' },
    { min: 0, points: 100, label: '' }
];
const GOAL_TIME_POINTS = 20;        // per whole second under the target time
const GOAL_TIME_MAX = 2000;
const BONUS_SECONDS = 20;

let goalPole = null;
let goalSliding = false;
let goalDone = false;
let goalResult = null;              // { pole, time } points added at the goal

function resetGoalState() {
    goalPole = null;
    goalSliding = false;
    goalDone = false;
    goalResult = null;
    bonusState = null;
}

// Stretches the goal's hit box to the full height of the pole
function setupGoalPole(scene) {
    if (!endFlag || !endFlag.body) return;
    if (typeof endlessMode !== 'undefined' && endlessMode) return;
    const hd = typeof hdGoal !== 'undefined' && hdGoal;
    const x = hd ? hdGoal.x : endFlag.x;
    const ground = hd ? hdGoal.ground : endFlag.y + 30;
    const height = hd ? hdGoal.height : 120;
    endFlag.body.setSize(26, height);
    endFlag.body.position.set(x - 13, ground - height);
    endFlag.body.updateCenter();
    goalPole = { x: x, ground: ground, height: height };
}

// Called at the top of reachEnd. Returns true while the pole sequence is
// playing; reachEnd is called again when it has finished.
function goalPoleIntercept(scene) {
    if (goalDone || !goalPole) return false;
    if (goalSliding) return true;
    if (typeof secretExitTaken !== 'undefined' && secretExitTaken) return false;
    if (typeof speedrunMode !== 'undefined' && speedrunMode) return false;

    goalSliding = true;
    const grabbedAt = levelTimer;
    const h = Phaser.Math.Clamp(goalPole.ground - player.body.bottom, 0, goalPole.height);
    const tier = GOAL_TIERS.find(t => h >= t.min);
    const target = currentLevel.targetTime || 0;
    const timePoints = Math.min(GOAL_TIME_MAX,
        Math.max(0, Math.floor((target - levelTimer) / 1000)) * GOAL_TIME_POINTS);
    goalResult = { pole: tier.points, time: timePoints };
    score += tier.points + timePoints;
    if (tier.coins && typeof earnCoins === 'function') earnCoins(tier.coins);
    scoreText.setText(formatScoreHUD(score, highScores['level' + currentLevelIndex] || 0));

    // Hold on to the pole
    controlLocked = true;
    if (typeof iaDropShell === 'function') iaDropShell();
    if (isPounding) { isPounding = false; poundPauseTimer = 0; }
    isDashing = false;
    player.body.setAllowGravity(true);
    player.setVelocity(0, 0);
    player.body.enable = false;
    player.x = goalPole.x - 12;
    lastFacingDir = 1;

    const grabY = player.y;
    showScorePopup(scene, goalPole.x, grabY - 30, `${tier.label ? tier.label + ' ' : ''}+${tier.points}`, '#ffe680');
    spawnParticles(scene, goalPole.x, grabY, 0xffe680, tier.coins ? 18 : 8, 70);
    playSound(tier.coins ? 'powerup' : 'checkpoint');
    if (tier.coins) shakeCamera(scene, 18, 120);

    // Slide down, flag coming down alongside
    const slide = 250 + h * 2.2;
    scene.tweens.add({ targets: player, y: goalPole.ground - 16, duration: slide, ease: 'Quad.easeIn' });
    if (typeof hdGoal !== 'undefined' && hdGoal && hdGoal.cloth) {
        scene.tweens.add({ targets: hdGoal.cloth, y: goalPole.ground - 44, duration: slide, ease: 'Quad.easeIn' });
    }
    scene.time.delayedCall(slide + 220, () => {
        goalDone = true;
        levelTimer = grabbedAt;            // the slide is not on the clock
        reachEnd.call(scene);
    });
    return true;
}

// Results screen: the score line counts up from zero, with the pole and
// time bonuses listed above it.
function goalCountUp(scene, textObj, finalText, total, delay) {
    const counter = { v: 0 };
    let lastTick = 0;
    textObj.setText('Score: 0');
    scene.tweens.add({
        targets: counter, v: total, duration: Phaser.Math.Clamp(total * 0.4, 500, 1300), delay: delay + 250,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
            textObj.setText('Score: ' + Math.floor(counter.v));
            if (scene.time.now - lastTick > 55 && typeof playTick === 'function') {
                lastTick = scene.time.now;
                playTick(900 + (counter.v / Math.max(1, total)) * 700);
            }
        },
        onComplete: () => {
            textObj.setText(finalText);
            scene.tweens.add({ targets: textObj, scale: 1.25, duration: 110, yoyo: true });
            if (typeof playSound === 'function') playSound('coin');
        }
    });
    if (goalResult) {
        const parts = [`POLE +${goalResult.pole}`];
        if (goalResult.time > 0) parts.push(`TIME +${goalResult.time}`);
        const line = scene.add.text(400, 251, parts.join('     '), {
            fontSize: '11px', fill: '#ffe680', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
        scene.tweens.add({ targets: line, alpha: 1, duration: 250, delay: delay });
    }
}

// ========================
// Bonus round
// ========================

const BONUS_LEVEL = {
    name: 'Level 0 - Bonus Round',
    worldWidth: 1500,
    worldHeight: 600,
    theme: {
        biome: 'sky', propStyle: 'mountains', skyColor: 0xADD8E6, groundColor: 0xCCCCCC,
        platformColor: 0xE8E8E8, bgColor1: 0xB0D4E8, bgColor2: 0x87CEEB
    },
    platforms: [
        { x: 400, y: 470, width: 140, height: 20 },
        { x: 750, y: 400, width: 160, height: 20 },
        { x: 1100, y: 470, width: 140, height: 20 }
    ],
    movingPlatforms: [], enemies: [], obstacles: [], coins: [], checkpoints: [], powerUps: [], breakableBlocks: [],
    springs: [{ x: 575, y: 550 }, { x: 925, y: 550 }],
    playerStart: { x: 750, y: 540 },
    flagPosition: { x: 1470, y: 555 }
};

let bonusRound = null;      // { next: level index to go to afterwards }
let bonusState = null;
let bonusPlayed = JSON.parse(localStorage.getItem('jqBonus') || '{}');

// A bonus round follows the second level of each world, the first time it is beaten
function bonusDue(index) {
    if (typeof campaignStoryMode === 'function' && !campaignStoryMode()) return false;
    return index % 4 === 1 && index < CAMPAIGN_LEVELS.length - 1 && !bonusPlayed['level' + index];
}

function startBonusAfter(index) {
    bonusPlayed['level' + index] = true;
    localStorage.setItem('jqBonus', JSON.stringify(bonusPlayed));
    bonusRound = { next: index + 1 };
}

// The level to load: the bonus arena when a round is due, otherwise the
// campaign level. Leaving for a menu cancels a pending round.
function bonusLevelOr(level) {
    if (bonusRound && (showingMenu || showingLevelSelect ||
        (typeof showingSpeedrunSelect !== 'undefined' && showingSpeedrunSelect))) bonusRound = null;
    return bonusRound ? BONUS_LEVEL : level;
}

function buildBonusRound(scene) {
    if (!bonusRound) return;
    // No goal in here
    if (endFlag) { endFlag.setAlpha(0); if (endFlag.body) endFlag.body.enable = false; }
    if (typeof hdGoal !== 'undefined' && hdGoal) {
        hdGoal.parts.forEach(o => o.setVisible(false));
        hdGoal.sparks.forEach(s => s.obj.setVisible(false));
    }
    goalPole = null;
    if (typeof hdTexture === 'function' && !scene.textures.exists('bonus_coin_blue')) {
        hdTexture(scene, 'bonus_coin_blue', 24, 24, ctx => {
            const g = ctx.createRadialGradient(9, 8, 1, 12, 12, 11);
            g.addColorStop(0, '#e6fbff'); g.addColorStop(0.5, '#4bb8ff'); g.addColorStop(1, '#1560c0');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(12, 12, 10.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#0c3a7a'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('5', 12, 16.5);
        });
    }
    const clock = wideUI(scene.add.text(VIEW_W / 2, 40, String(BONUS_SECONDS), {
        fontSize: '34px', fill: '#ffe680', fontStyle: 'bold', stroke: '#0a1220', strokeThickness: 5
    }));
    clock.setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    bonusState = { time: BONUS_SECONDS * 1000, next: 600, coins: [], caught: 0, clock: clock, over: false };
    const banner = scene.add.text(400, 200, 'BONUS ROUND!\nCatch the coins', {
        fontSize: '30px', fill: '#ffe680', fontStyle: 'bold', align: 'center', stroke: '#0a1220', strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200);
    scene.tweens.add({ targets: banner, alpha: 0, duration: 500, delay: 1400, onComplete: () => banner.destroy() });
}

function updateBonusRound(scene, delta) {
    const b = bonusState;
    if (!b || b.over) return;
    // The HUD is built after this round is set up, so it is labelled here
    if (!b.named && levelNameText && levelNameText.scene) { levelNameText.setText('BONUS ROUND'); b.named = true; }
    b.time -= delta;
    b.clock.setText(String(Math.max(0, Math.ceil(b.time / 1000))));
    if (b.time < 5000) b.clock.setColor(Math.floor(b.time / 250) % 2 ? '#ff6b5a' : '#ffe680');

    // The shower
    b.next -= delta;
    if (b.next <= 0 && b.time > 800) {
        b.next = 100;
        const blue = Math.random() < 0.06;
        const x = 70 + Math.random() * (BONUS_LEVEL.worldWidth - 140);
        const key = blue && scene.textures.exists('bonus_coin_blue') ? 'bonus_coin_blue' : artKey('tex_coin');
        const img = scene.add.image(x, -20, key).setDepth(8);
        b.coins.push({ img: img, vy: 150 + Math.random() * 120, worth: blue ? 5 : 1, spin: Math.random() * 6 });
    }
    const s = delta / 1000;
    for (let i = b.coins.length - 1; i >= 0; i--) {
        const c = b.coins[i];
        c.img.y += c.vy * s;
        c.spin += s * 6;
        c.img.scaleX = 0.25 + Math.abs(Math.sin(c.spin)) * 0.75;
        const caught = Math.abs(c.img.x - player.x) < 26 && Math.abs(c.img.y - player.y) < 28;
        if (caught) {
            b.caught += c.worth;
            if (typeof earnCoins === 'function') earnCoins(c.worth);
            if (walletText && typeof getDisplayCoins === 'function') walletText.setText(`● ${getDisplayCoins()}`);
            spawnParticles(scene, c.img.x, c.img.y, c.worth > 1 ? 0x4bb8ff : 0xffd34d, c.worth > 1 ? 10 : 4, 45);
            if (c.worth > 1) showScorePopup(scene, c.img.x, c.img.y - 16, '+5', '#8fd4ff');
            playSound('coin');
        }
        if (caught || c.img.y > 566) {
            c.img.destroy();
            b.coins.splice(i, 1);
        }
    }

    if (b.time <= 0) endBonusRound(scene);
}

function endBonusRound(scene) {
    const b = bonusState;
    b.over = true;
    levelComplete = true;                 // stops play; the hero cheers
    scene.physics.pause();
    if (typeof bankPendingCoins === 'function') bankPendingCoins();
    playSound('levelComplete');
    b.coins.forEach(c => scene.tweens.add({ targets: c.img, alpha: 0, duration: 300 }));
    b.clock.setVisible(false);

    const parts = [];
    parts.push(scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.65).setDepth(990));
    parts.push(scene.add.text(400, 200, 'BONUS ROUND', {
        fontSize: '40px', fill: '#ffe680', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(1000));
    const tally = scene.add.text(400, 280, '● 0', {
        fontSize: '34px', fill: '#ffcc33', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000);
    parts.push(tally);
    parts.push(scene.add.text(400, 325, 'coins added to your wallet', {
        fontSize: '13px', fill: '#cbd5e6'
    }).setOrigin(0.5).setDepth(1000));
    const next = scene.add.text(400, 400, 'CONTINUE', {
        fontSize: '24px', fill: '#fff', fontStyle: 'bold', backgroundColor: '#0a0', padding: { x: 24, y: 9 }
    }).setOrigin(0.5).setDepth(1000).setAlpha(0);
    parts.push(next);
    parts.forEach(o => o.setScrollFactor(0));

    const counter = { v: 0 };
    let lastTick = 0;
    scene.tweens.add({
        targets: counter, v: b.caught, duration: Phaser.Math.Clamp(b.caught * 30, 300, 1500), delay: 400,
        onUpdate: () => {
            tally.setText('● ' + Math.floor(counter.v));
            if (scene.time.now - lastTick > 55 && typeof playTick === 'function') { lastTick = scene.time.now; playTick(1300); }
        },
        onComplete: () => {
            tally.setText('● ' + b.caught);
            scene.tweens.add({ targets: next, alpha: 1, duration: 250 });
            next.setInteractive({ useHandCursor: true });
            next.on('pointerover', () => next.setStyle({ backgroundColor: '#0c0' }));
            next.on('pointerout', () => next.setStyle({ backgroundColor: '#0a0' }));
            const go = () => {
                currentLevelIndex = bonusRound ? bonusRound.next : currentLevelIndex;
                bonusRound = null;
                restartWithTransition(scene);
            };
            next.on('pointerup', go);
            scene.input.keyboard.once('keydown-SPACE', go);
            scene.input.keyboard.once('keydown-ENTER', go);
        }
    });
}
