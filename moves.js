// ========================
// Moves — taught one at a time
// ========================
// The adventure starts with just run and jump. Dash, ground pound and the
// flow meter each arrive at the start of a later level, with a short card
// that names the move and its button. Once a move has been reached it stays
// for good, so going back to an early level with new moves opens up routes
// that were out of reach the first time.
//
// The other modes (endless, daily, speedrun, editor test) always have every
// move.

const MOVE_INTRO_LEVEL = { dash: 1, pound: 2, flow: 3 };

const MOVE_CARDS = {
    dash: { title: 'NEW MOVE: DASH', key: 'SHIFT', touch: 'the dash button',
        text: 'A burst of speed, even in mid-air. Dashing into enemies defeats them.' },
    pound: { title: 'NEW MOVE: GROUND POUND', key: '↓ + SPACE in mid-air', touch: '▼ then ▲ in mid-air',
        text: 'Slam straight down. Smashes crates and anything standing nearby.' },
    flow: { title: 'NEW: FLOW', key: null, touch: null,
        text: 'Keep moving fast to fill the yellow bar. A full bar pays extra coins.' }
};

let movesSeen = JSON.parse(localStorage.getItem('jqMovesSeen') || '{}');

function movesStoryMode() {
    if (typeof isTestMode !== 'undefined' && isTestMode) return false;
    if (typeof endlessMode !== 'undefined' && endlessMode) return false;
    if (typeof dailyChallengeMode !== 'undefined' && dailyChallengeMode) return false;
    if (typeof speedrunMode !== 'undefined' && speedrunMode) return false;
    return true;
}

// The furthest level the player has reached in the adventure
function movesFurthestLevel() {
    let furthest = typeof currentLevelIndex !== 'undefined' ? currentLevelIndex : 0;
    if (typeof completedLevels !== 'undefined') {
        for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
            if (completedLevels['level' + i]) furthest = Math.max(furthest, i + 1);
        }
    }
    return furthest;
}

function isMoveUnlocked(move) {
    if (!movesStoryMode()) return true;
    return movesFurthestLevel() >= MOVE_INTRO_LEVEL[move];
}

// Shows the card for a move the first time its level is started.
function showMoveIntro(scene) {
    if (!movesStoryMode()) return;
    const move = Object.keys(MOVE_INTRO_LEVEL).find(m =>
        MOVE_INTRO_LEVEL[m] === currentLevelIndex && !movesSeen[m]);
    if (!move) return;
    movesSeen[move] = true;
    localStorage.setItem('jqMovesSeen', JSON.stringify(movesSeen));

    const card = MOVE_CARDS[move];
    const touch = navigator.maxTouchPoints > 0;
    const how = touch ? card.touch : card.key;
    const parts = [];
    const panel = scene.add.rectangle(400, 118, 470, how ? 96 : 74, 0x0a1220, 0.88)
        .setStrokeStyle(2, 0xffd34d);
    const title = scene.add.text(400, how ? 86 : 100, card.title, {
        fontSize: '20px', fill: '#ffd34d', fontStyle: 'bold'
    }).setOrigin(0.5);
    const body = scene.add.text(400, how ? 112 : 126, card.text, {
        fontSize: '12px', fill: '#e6edf7', align: 'center', wordWrap: { width: 430 }
    }).setOrigin(0.5);
    parts.push(panel, title, body);
    if (how) {
        parts.push(scene.add.text(400, 142, how, {
            fontSize: '13px', fill: '#0a1220', fontStyle: 'bold',
            backgroundColor: '#ffd34d', padding: { x: 8, y: 3 }
        }).setOrigin(0.5));
    }
    parts.forEach(o => o.setScrollFactor(0).setDepth(1200).setAlpha(0));
    scene.tweens.add({ targets: parts, alpha: 1, duration: 350, delay: 900 });
    scene.tweens.add({
        targets: parts, alpha: 0, duration: 500, delay: 7500,
        onComplete: () => parts.forEach(o => o.destroy())
    });
    if (typeof playSound === 'function') scene.time.delayedCall(900, () => playSound('powerup'));
}

// A short reminder of the buttons at the start of the first levels. It lists
// only moves the player has, and fades after a few seconds or on first input.
function showControlsReminder(scene) {
    if (!movesStoryMode() || currentLevelIndex > 2) return;
    if (navigator.maxTouchPoints > 0) return;   // touch buttons label themselves
    const chips = ['← →  MOVE', 'SPACE  JUMP'];
    if (isMoveUnlocked('dash')) chips.push('SHIFT  DASH');
    if (isMoveUnlocked('pound')) chips.push('↓ + SPACE  POUND');
    const texts = chips.map(text => scene.add.text(0, 0, text, {
        fontSize: '11px', fill: '#e6edf7', fontStyle: 'bold',
        backgroundColor: 'rgba(10,18,32,0.7)', padding: { x: 8, y: 5 }
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(100));
    const gap = 10;
    const total = texts.reduce((w, t) => w + t.width, 0) + gap * (texts.length - 1);
    let x = (VIEW_W - total) / 2;
    texts.forEach(t => {
        t.setPosition(x, VIEW_H - 14);
        t.wideUI = true;
        x += t.width + gap;
        if (typeof gameplayHudObjects !== 'undefined') gameplayHudObjects.push(t);
    });
    scene.tweens.add({
        targets: texts, alpha: 0, duration: 600, delay: 5000,
        onComplete: () => texts.forEach(t => t.destroy())
    });
}
