// ========================
// JumpQuest Tutorial Hint System
// Shows contextual hints at specific trigger points (first time only)
// ========================

const TUTORIAL_HINTS = [
    { level: 0, triggerX: 200, text: 'Arrow keys to move, Space to jump!' },
    { level: 0, triggerX: 800, text: 'Hold Space longer for higher jumps' },
    { level: 0, triggerX: 1600, text: 'Jump on enemies to stomp them!' },
    { level: 1, triggerX: 300, text: 'Press SHIFT to dash through obstacles' },
    { level: 1, triggerX: 1500, text: 'Chain coins and stomps for combo multipliers!' },
    { level: 2, triggerX: 500, text: 'Slide on walls and press Space to wall jump!' },
    { level: 2, triggerX: 1800, text: 'Hit blocks from below to break them' },
    { level: 3, triggerX: 600, text: 'Watch out for shooters! Dodge their projectiles' },
    { level: 5, triggerX: 400, text: 'Some walls are fake... try dashing through them!' },
    { level: 8, triggerX: 300, text: 'Speed boosts let you run faster! Grab power-ups' },
];

let tutorialShown = JSON.parse(localStorage.getItem('jqTutorialShown')) || {};
let activeTutorialHint = null;

function checkTutorialTriggers(scene, playerX, levelIndex) {
    if (activeTutorialHint) return;

    for (const hint of TUTORIAL_HINTS) {
        if (hint.level !== levelIndex) continue;
        const hintKey = hint.level + '_' + hint.triggerX;
        if (tutorialShown[hintKey]) continue;

        if (playerX >= hint.triggerX) {
            tutorialShown[hintKey] = true;
            localStorage.setItem('jqTutorialShown', JSON.stringify(tutorialShown));
            showTutorialHint(scene, hint.text);
            break;
        }
    }
}

function showTutorialHint(scene, text) {
    // Positioned below the top HUD bars and right of the left HUD column so it never overlaps them
    const hint = scene.add.text(480, 140, text, {
        fontSize: '18px', fill: '#fff', fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 16, y: 10 },
        stroke: '#ffd700', strokeThickness: 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1200).setAlpha(0);

    activeTutorialHint = hint;

    scene.tweens.add({
        targets: hint,
        alpha: 1,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
            scene.tweens.add({
                targets: hint,
                alpha: 0,
                duration: 400,
                delay: 3500,
                ease: 'Power2',
                onComplete: () => {
                    hint.destroy();
                    activeTutorialHint = null;
                }
            });
        }
    });
}
