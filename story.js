// ========================
// JumpQuest Story Card System
// Minimal narrative text cards shown before levels
// ========================

const STORY_CARDS = [
    { level: 0, text: "You are a Jumper — a small but determined being at the base of the Infinite Tower.\nEach floor holds new challenges. The tower shifts and changes, but you must climb." },
    { level: 4, text: "The meadows gave way to a canyon of gleaming coins.\nThe tower tempts you with riches, but greed slows the climb." },
    { level: 8, text: "Deeper now. Crystal caves shimmer with an eerie light.\nSomething watches from the shadows..." },
    { level: 12, text: "A fortress blocks your path — built by those who climbed before.\nTheir traps remain active. Their treasure, unclaimed." },
    { level: 15, text: "The Final Trial of the lower tower. Beyond this, the true challenge begins.\nSteel yourself." },
    { level: 16, text: "Above the clouds! The air is thin but the view... incredible.\nThe tower's upper floors feel alive." },
    { level: 20, text: "Gears grind. Pistons pump. The Machine runs endlessly.\nWho built this? And why?" },
    { level: 17, text: "Nature reclaims what the tower forgot. Vines and emerald moss cover ancient platforms.\nSecrets hide in the overgrowth." },
    { level: 21, text: "A long corridor. Speed is your ally here.\nThe tower is testing how fast you've become." },
    { level: 23, text: "The summit. A Guardian waits — the tower's final protector.\nThis is what you've been training for." }
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

    // Continue (button, Space / Enter on it, or Esc) closes the card, then
    // runs the callback exactly once. It only works once the button is shown.
    var continueShown = false;
    var finished = false;
    var finish = function() {
        if (!continueShown || finished) return;
        finished = true;
        s.close(function() {
            if (callback) callback();
        });
    };

    var s = UI.screen(scene, {
        id: 'story-card',
        depth: 3000,
        backdrop: 'solid',
        enter: 'fade',
        onBack: finish
    });

    var cx = VIEW_W / 2;
    var levelName = 'LEVEL ' + (typeof window.levelLabel === 'function' ? window.levelLabel(levelIndex) : levelIndex + 1);

    // Story text first, so the panel can be sized around it
    var storyText = s.label(cx, 0, card.text, {
        style: 'body', size: UI.theme.size.value, wrap: 620, align: 'center'
    });
    storyText.setLineSpacing(Math.round(UI.theme.size.value * 0.5));
    var panelH = Math.round(Math.max(140, storyText.height + 76));
    var panelY = 280;
    storyText.y = panelY;
    s.panel(cx, panelY, 720, panelH, {});

    // Level indicator sits just above the panel
    s.label(cx, panelY - panelH / 2 - 30, levelName, { style: 'caps', size: UI.theme.size.header });

    var buttonY = Math.min(VIEW_H - 80, panelY + panelH / 2 + 64);
    s.hintBar([['ENTER', 'Continue']]);
    s.open();

    // The Continue button appears after the text, as before (on the tween
    // clock, like the old fade-in)
    scene.tweens.addCounter({
        from: 0, to: 1, duration: 1200,
        onComplete: function() {
            if (s.state === 'closed' || s.state === 'closing') return;
            s.button(cx, buttonY, 'Continue', {
                role: 'go', size: 'lg', icon: 'play', default: true, onClick: finish
            });
            continueShown = true;
        }
    });
}

function resetStoryProgress() {
    storyShown = {};
    localStorage.removeItem('jqStoryShown');
}
