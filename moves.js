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
    if (typeof bonusRound !== 'undefined' && bonusRound) return false;
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

// Wall jumps are taught by a tip at the start of this level (tutorial.js)
const WALL_JUMP_LEVEL = 8;

// Has the player met this suit or object yet? interact.js and suits.js
// record a one-time hint the first time each one turns up.
function controlsSeen(key) {
    return typeof tutorialShown !== 'undefined' && !!tutorialShown[key];
}

// The rows of the Controls popup: only what this player can do so far.
// Story mode adds moves as their levels are reached; suits and objects
// appear once they have been met. Other modes have every move.
function controlsRowsForPlayer() {
    const rows = [['Move', ['←', '→']], ['Jump', ['SPACE']]];
    if (isMoveUnlocked('dash')) rows.push(['Dash', ['SHIFT']]);
    if (isMoveUnlocked('pound')) rows.push(['Pound (in air)', ['↓', '+', 'SPACE']]);
    if (!movesStoryMode() || movesFurthestLevel() >= WALL_JUMP_LEVEL) rows.push(['Wall jump (on a wall)', ['SPACE']]);
    if (controlsSeen('ia_door')) rows.push(['Enter door', ['↓']]);
    if (controlsSeen('ia_shell')) rows.push(['Carry / throw shell', ['↓']]);
    if (controlsSeen('ia_suit_cape')) rows.push(['Glide (cape)', ['hold SPACE']]);
    if (controlsSeen('ia_suit_rang')) rows.push(['Boomerang', ['X']]);
    rows.push(['Retry', ['R']], ['Pause', ['ESC']]);
    return rows;
}

// True while there are still story moves left to unlock
function controlsMoreToCome() {
    if (!movesStoryMode()) return false;
    return !isMoveUnlocked('dash') || !isMoveUnlocked('pound') || movesFurthestLevel() < WALL_JUMP_LEVEL;
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
    const key = how || null;
    // Moves with a button join the Controls list (pause menu)
    const body = card.key ? card.text + ' Now listed in Pause > Controls.' : card.text;
    // The delay runs on the tween clock, like the old fade-in did
    scene.tweens.addCounter({
        from: 0, to: 1, duration: 900,
        onComplete: () => {
            UI.toast(scene, {
                icon: 'bolt', title: card.title, body: body, key: key,
                position: 'top', belowHud: true, accent: 'gold', duration: 6500
            });
            if (typeof playSound === 'function') playSound('powerup');
        }
    });
}

// A short reminder of the buttons at the start of the first levels. It lists
// only moves the player has, and fades after a few seconds or on first input.
function showControlsReminder(scene) {
    if (!movesStoryMode() || currentLevelIndex > 2) return;
    if (navigator.maxTouchPoints > 0) return;   // touch buttons label themselves
    const chips = [['← →', 'MOVE'], ['SPACE', 'JUMP']];
    if (isMoveUnlocked('dash')) chips.push(['SHIFT', 'DASH']);
    if (isMoveUnlocked('pound')) chips.push(['↓ + SPACE', 'POUND']);
    // Styled like the menu kit's hint bar: a light key cap and a label on a
    // dark rounded strip.
    const T = UI.theme, C = T.color;
    const textStyle = (size, color) => ({
        fontFamily: T.font, fontSize: size + 'px', fontStyle: 'bold', color: color, resolution: T.textResolution
    });
    const h = 30, padX = 8, inner = 7;
    const boxes = chips.map(([keyText, labelText]) => {
        const kt = scene.add.text(0, -1, keyText, textStyle(T.size.keyChip, T.text.dark)).setOrigin(0.5);
        const lt = scene.add.text(0, 0, labelText, textStyle(T.size.small, T.text.light)).setOrigin(0, 0.5);
        const kw = Math.max(26, kt.width + 14);
        const w = padX + kw + inner + lt.width + padX + 2;
        const g = scene.add.graphics();
        g.fillStyle(C.ink, 0.72); g.fillRoundedRect(-w / 2, -h / 2, w, h, T.radius.keyChip + 4);
        const kx = -w / 2 + padX + kw / 2;
        g.fillStyle(C.keyCapEdge, 1); g.fillRoundedRect(kx - kw / 2, -10, kw, 22, T.radius.keyChip);
        g.fillStyle(C.keyCap, 1); g.fillRoundedRect(kx - kw / 2, -11, kw, 20, T.radius.keyChip);
        kt.x = kx;
        lt.x = kx + kw / 2 + inner;
        const c = scene.add.container(0, 0, [g, kt, lt]);
        c.chipW = w;
        return c;
    });
    const gap = 10;
    const total = boxes.reduce((w, b) => w + b.chipW, 0) + gap * (boxes.length - 1);
    let x = (VIEW_W - total) / 2;
    boxes.forEach(b => {
        b.setPosition(x + b.chipW / 2, VIEW_H - 14 - h / 2);
        b.setScrollFactor(0).setDepth(100);
        b.list.forEach(o => o.setScrollFactor(0));
        b.wideUI = true;
        x += b.chipW + gap;
        if (typeof gameplayHudObjects !== 'undefined') gameplayHudObjects.push(b);
    });
    scene.tweens.add({
        targets: boxes, alpha: 0, duration: 600, delay: 5000,
        onComplete: () => boxes.forEach(b => b.destroy())
    });
}
