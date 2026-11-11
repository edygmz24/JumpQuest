// ========================
// JumpQuest Tutorial Hint System
// Shows contextual hints at specific trigger points (first time only)
// ========================

const TUTORIAL_HINTS = [
    { level: 0, triggerX: 200, text: 'Arrow keys to move, Space to jump!' },
    { level: 0, triggerX: 800, text: 'Hold Space longer for higher jumps' },
    { level: 0, triggerX: 1600, text: 'Jump on enemies to stomp them!' },
    { level: 1, triggerX: 300, text: 'Press SHIFT to dash through obstacles' },
    { level: 1, triggerX: 1500, text: 'Mind the gaps: falling in costs a heart' },
    { level: 2, triggerX: 500, text: 'Crates break when hit from below, or with a ground pound' },
    { level: 4, triggerX: 1500, text: 'Chain coins and stomps for combo multipliers!' },
    { level: 8, triggerX: 500, text: 'Slide on walls and press Space to wall jump!' },
    { level: 8, triggerX: 1800, text: 'Crates break when hit from below, or with a ground pound' },
    { level: 12, triggerX: 600, text: 'Watch out for shooters! Dodge their projectiles' },
    { level: 16, triggerX: 400, text: 'Some walls are fake... try dashing through them!' },
    { level: 21, triggerX: 300, text: 'Speed boosts let you run faster! Grab power-ups' },
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
    // A non-blocking kit toast at the top; long hints wrap inside it.
    // On screen for about as long as before (fade in, 3.5 s, fade out).
    const duration = 3800;
    const hint = UI.toast(scene, {
        icon: 'star', title: 'TIP', body: text, position: 'top', belowHud: true, duration: duration,
        // Free the slot for the next hint once this one has gone
        onClose: () => { if (activeTutorialHint === hint) activeTutorialHint = null; }
    });
    activeTutorialHint = hint;
}
