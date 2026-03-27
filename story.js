// ========================
// JumpQuest Story Card System
// Minimal narrative text cards shown before levels
// ========================

const STORY_CARDS = [
    { level: 0, text: "You are a Jumper — a small but determined being at the base of the Infinite Tower.\nEach floor holds new challenges. The tower shifts and changes, but you must climb." },
    { level: 1, text: "The meadows gave way to a canyon of gleaming coins.\nThe tower tempts you with riches, but greed slows the climb." },
    { level: 2, text: "Deeper now. Crystal caves shimmer with an eerie light.\nSomething watches from the shadows..." },
    { level: 3, text: "A fortress blocks your path — built by those who climbed before.\nTheir traps remain active. Their treasure, unclaimed." },
    { level: 4, text: "The Final Trial of the lower tower. Beyond this, the true challenge begins.\nSteel yourself." },
    { level: 5, text: "Above the clouds! The air is thin but the view... incredible.\nThe tower's upper floors feel alive." },
    { level: 6, text: "Gears grind. Pistons pump. The Machine runs endlessly.\nWho built this? And why?" },
    { level: 7, text: "Nature reclaims what the tower forgot. Vines and emerald moss cover ancient platforms.\nSecrets hide in the overgrowth." },
    { level: 8, text: "A long corridor. Speed is your ally here.\nThe tower is testing how fast you've become." },
    { level: 9, text: "The summit. A Guardian waits — the tower's final protector.\nThis is what you've been training for." }
];

let storyShown = JSON.parse(localStorage.getItem('jqStoryShown')) || {};

function shouldShowStory(levelIndex) {
    return !storyShown['level' + levelIndex];
}

function showStoryCard(scene, levelIndex, callback) {
    var card = null;
    for (var i = 0; i < STORY_CARDS.length; i++) {
        if (STORY_CARDS[i].level === levelIndex) {
            card = STORY_CARDS[i];
            break;
        }
    }
    if (!card) {
        if (callback) callback();
        return;
    }

    // Mark as shown
    storyShown['level' + levelIndex] = true;
    localStorage.setItem('jqStoryShown', JSON.stringify(storyShown));

    var storyObjects = [];

    // Dark background
    var bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
    bg.setScrollFactor(0).setDepth(3000);
    storyObjects.push(bg);

    // Level indicator
    var levelLabel = scene.add.text(400, 160, 'LEVEL ' + (levelIndex + 1), {
        fontSize: '18px', fill: '#888', fontStyle: 'bold',
        letterSpacing: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);
    storyObjects.push(levelLabel);

    // Story text
    var storyText = scene.add.text(400, 280, card.text, {
        fontSize: '20px', fill: '#ddd', align: 'center',
        lineSpacing: 12, wordWrap: { width: 600 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);
    storyObjects.push(storyText);

    // Continue button
    var continueBtn = scene.add.text(400, 450, 'CONTINUE', {
        fontSize: '22px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: '#0a0', padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3001).setAlpha(0);
    storyObjects.push(continueBtn);

    // Fade in level label
    scene.tweens.add({
        targets: levelLabel,
        alpha: 1,
        duration: 400,
        delay: 200
    });

    // Fade in story text
    scene.tweens.add({
        targets: storyText,
        alpha: 1,
        duration: 600,
        delay: 600
    });

    // Fade in continue button
    scene.tweens.add({
        targets: continueBtn,
        alpha: 1,
        duration: 400,
        delay: 1200,
        onComplete: function() {
            continueBtn.setInteractive({ useHandCursor: true });
            continueBtn.on('pointerover', function() {
                continueBtn.setStyle({ backgroundColor: '#0c0' });
            });
            continueBtn.on('pointerout', function() {
                continueBtn.setStyle({ backgroundColor: '#0a0' });
            });
            continueBtn.on('pointerup', function() {
                // Fade out all story objects
                storyObjects.forEach(function(obj) {
                    scene.tweens.add({
                        targets: obj,
                        alpha: 0,
                        duration: 300,
                        onComplete: function() {
                            obj.destroy();
                        }
                    });
                });
                scene.time.delayedCall(350, function() {
                    if (callback) callback();
                });
            });
        }
    });
}

function resetStoryProgress() {
    storyShown = {};
    localStorage.removeItem('jqStoryShown');
}
