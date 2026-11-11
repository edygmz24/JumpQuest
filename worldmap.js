// ========================
// World map — the level select, as a place
// ========================
// Six worlds laid out left to right, four levels each, joined by a path the
// hero walks along. Replaces the old grid (showLevelSelect keeps its name so
// every caller still works).
//
// Keys: LEFT / RIGHT walk the path, UP / DOWN take a secret path once it has
// been found, SPACE or ENTER plays, ESC goes back. Everything is clickable.

const MAP_WORLD_W = 500;
const MAP_NODE_DY = [45, -40, 35, -55];

let mapSelected = 0;

function mapNodePos(i) {
    const w = levelWorld(i), s = i % 4;
    return {
        x: 150 + w * MAP_WORLD_W + s * 112,
        y: 300 + MAP_NODE_DY[s] + (w % 2 ? -18 : 18)
    };
}

function showLevelSelect(scene) {
    showingMenu = false;
    showingLevelSelect = true;
    if (typeof showingSpeedrunSelect !== 'undefined') showingSpeedrunSelect = false;
    if (typeof speedrunMode !== 'undefined') speedrunMode = false;
    clearMenuObjects();
    if (typeof setGameplayHUDVisible === 'function') setGameplayHUDVisible(false);

    const T = UI.theme, C = T.color, CX = VIEW_W / 2;
    const count = CAMPAIGN_LEVELS.length;
    const ink = C.ink, inkCss = UI.css(C.ink);

    // Focus: the map selection is the focus. The arrows walk the path (onKey
    // swallows them, so they never move kit focus onto the buttons) and Space /
    // Enter press Play, which holds the kit focus ring. The mouse can still
    // hover and click Play or Back; the next arrow key puts the ring back on Play.
    const s = UI.screen(scene, {
        id: 'world-map', depth: T.depth.menu, backdrop: 'solid',
        onBack: () => back(),
        onKey: (e) => onKey(e)
    });

    // ---- The map itself: custom art, scrolled sideways by select() ----
    const map = scene.add.container(0, 0);
    const g = scene.add.graphics();
    map.add(g);
    const mapText = (x, y, text, size, color, extra) => scene.add.text(x, y, text, Object.assign({
        fontFamily: T.font, fontSize: size + 'px', fontStyle: 'bold', color: color, resolution: T.textResolution
    }, extra || {})).setOrigin(0.5);

    // World islands
    WORLDS.forEach((world, w) => {
        const cx = 150 + w * MAP_WORLD_W + 168, cy = 305;
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(cx + 6, cy + 16, 440, 250);
        g.fillStyle(Phaser.Display.Color.ValueToColor(world.color).darken(45).color, 1);
        g.fillEllipse(cx, cy + 6, 440, 250);
        g.fillStyle(Phaser.Display.Color.ValueToColor(world.color).darken(15).color, 1);
        g.fillEllipse(cx, cy, 430, 236);
        g.fillStyle(world.color, 0.35);
        g.fillEllipse(cx - 30, cy - 30, 300, 130);
        const cap = mapText(cx, 148, `WORLD ${w + 1}`, T.size.caps, T.text.caps, { stroke: inkCss, strokeThickness: 3 });
        if (cap.setLetterSpacing) cap.setLetterSpacing(1.5);
        map.add(cap);
        map.add(mapText(cx, 168, world.name.toUpperCase(), T.size.header, T.text.white, { stroke: inkCss, strokeThickness: 5 }));
    });

    // Paths
    for (let i = 0; i < count - 1; i++) {
        const a = mapNodePos(i), b = mapNodePos(i + 1);
        const open = isLevelUnlocked(i + 1);
        g.lineStyle(8, ink, 0.9);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(4, open ? 0xffe9a8 : 0x4a5568, 1);
        g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Secret paths arc over the top, and only appear once found
    SECRET_PATHS.forEach(p => {
        if (!isSecretFound(p.from)) return;
        const a = mapNodePos(p.from), b = mapNodePos(p.to);
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2((a.x + b.x) / 2, 215),
            new Phaser.Math.Vector2(b.x, b.y));
        const pts = curve.getPoints(24);
        g.lineStyle(3, C.cyan, 1);
        for (let k = 0; k < pts.length - 1; k += 2) g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    });

    // Clicks on nodes follow the kit's rules: none while the screen animates
    // or while a popup covers it
    const mapInput = () => s.state === 'open' && s.inputEnabled && UI.top() === s;

    // Nodes
    const nodes = [];
    const PIP = 13;      // star / gem pip size under a node
    const pips = (x, y, filled, full, empty) => {
        for (let k = 0; k < 3; k++) map.add(UI.icon(scene, k < filled ? full : empty, PIP).setPosition(x + (k - 1) * (PIP + 1), y));
    };
    for (let i = 0; i < count; i++) {
        const pos = mapNodePos(i);
        const unlocked = isLevelUnlocked(i);
        const done = !!completedLevels['level' + i];
        const boss = !!CAMPAIGN_LEVELS[i].bossArena;
        const r = boss ? 26 : 20;
        const ring = scene.add.circle(pos.x, pos.y, r + 4, done ? C.gold : ink);
        const fill = unlocked ? (boss ? T.roles.danger.base : WORLDS[levelWorld(i)].color) : 0x3a4254;
        const dot = scene.add.circle(pos.x, pos.y, r, fill);
        dot.setStrokeStyle(2, C.white, unlocked ? 0.9 : 0.25);
        let label;
        if (!unlocked) label = UI.icon(scene, 'lock', 18, C.iconDisabled).setPosition(pos.x, pos.y);
        else if (boss) label = UI.icon(scene, 'crown', 26).setPosition(pos.x, pos.y - 1);
        else label = mapText(pos.x, pos.y, levelLabel(i), T.size.small, T.text.white, { stroke: inkCss, strokeThickness: 4 });
        map.add([ring, dot, label]);
        if (unlocked) {
            pips(pos.x, pos.y + r + 12, getStarCount(i), 'star', 'starEmpty');
            pips(pos.x, pos.y + r + 26, getLevelGems(i).filter(Boolean).length, 'gem', 'gemEmpty');
            dot.setInteractive({ useHandCursor: true });
            dot.uiLabel = levelLabel(i);     // names the node in the control inventory
            dot.on('pointerup', () => {
                if (!mapInput()) return;
                if (mapSelected === i) play(); else select(i, true);
            });
        }
        nodes.push({ pos: pos, unlocked: unlocked, dot: dot });
    }

    // The hero standing on the selected node
    const heroKey = scene.textures.exists('hd_tex_player') ? 'hd_tex_player' : 'tex_player';
    const hero = scene.add.image(0, 0, heroKey).setOrigin(0.5, 0.85);
    if (typeof cosmeticData !== 'undefined' && typeof applyPlayerColor === 'function') applyPlayerColor(hero, 0);
    map.add(hero);
    if (T.motion) scene.tweens.add({ targets: hero, scaleY: 0.92, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Adopted once fully built, so every child gets the screen's scroll factor
    s.add(map, 1);

    // ---- Header ----
    s.title(CX, 40, 'WORLD MAP', { ribbon: true });
    s.stat(24, 40, 'star', `${getTotalStars()}/${count * 3}`, { color: 'gold', align: 'left' });
    s.stat(VIEW_W - 24, 40, 'gem', `${getTotalGems()}/${count * 3}`, { color: 'pink', align: 'right' });

    // ---- Info panel ----
    const PANEL_W = 700, PANEL_Y = 498, L = CX - PANEL_W / 2 + 28;
    s.panel(CX, PANEL_Y, PANEL_W, 124);
    const title = s.label(L, PANEL_Y - 30, '', { style: 'body', size: T.size.value, align: 'left' });
    const timeLine = s.label(L, PANEL_Y + 2, '', { style: 'small', align: 'left' });
    const bossLine = s.label(L, PANEL_Y + 28, 'Boss level', { style: 'small', color: 'danger', align: 'left' });
    const secretLine = s.label(L, PANEL_Y + 28, '', { style: 'small', color: 'cyan', align: 'left' });
    const BTN_X = CX + PANEL_W / 2 - 110;
    const playBtn = s.button(BTN_X, PANEL_Y - 24, 'PLAY', { role: 'go', icon: 'play', width: 176, default: true, onClick: () => play() });
    s.button(BTN_X, PANEL_Y + 30, 'BACK', { role: 'neutral', size: 'sm', icon: 'back', width: 176, onClick: () => back() });

    s.hintBar([['← →', 'Walk'], ['↑ ↓', 'Secret path'], ['SPACE', 'Play'], ['ESC', 'Back']]);

    function select(i, animate) {
        if (i < 0 || i >= count || !nodes[i].unlocked) return;
        mapSelected = i;
        const pos = nodes[i].pos;
        const lvl = CAMPAIGN_LEVELS[i];
        const scroll = Phaser.Math.Clamp(VIEW_W / 2 - pos.x, VIEW_W - (150 + 6 * MAP_WORLD_W), 0);
        scene.tweens.killTweensOf(map);
        if (animate) {
            scene.tweens.add({ targets: map, x: scroll, duration: 260, ease: 'Sine.easeOut' });
            scene.tweens.add({ targets: hero, x: pos.x, y: pos.y - 4, duration: 220, ease: 'Quad.easeOut' });
            if (typeof playSound === 'function') playSound('menuHover');
        } else {
            map.x = scroll;
            hero.setPosition(pos.x, pos.y - 4);
        }
        title.setText(`${levelLabel(i)}  ${lvl.name.replace(/^Level\s+\d+\s*[-–]\s*/i, '')}`);
        const best = bestTimes['level' + i];
        timeLine.setText(`Best time ${best ? formatTime(best) : '--:--'}      Target ${formatTime(lvl.targetTime || 60000)}`);
        bossLine.setVisible(!!lvl.bossArena);
        const hasSecret = SECRET_PATHS.some(p => p.from === i);
        secretLine.setText(hasSecret ? (isSecretFound(i) ? 'Secret exit found' : 'There is a secret exit here…') : '');
        secretLine.x = L + (lvl.bossArena ? bossLine.width + 24 : 0);
    }

    function play() {
        if (!nodes[mapSelected].unlocked) return;
        currentLevelIndex = mapSelected;
        if (typeof endlessMode !== 'undefined') endlessMode = false;
        if (typeof dailyChallengeMode !== 'undefined') dailyChallengeMode = false;
        clearMenuObjects();
        showingLevelSelect = false;
        if (typeof restartWithTransition === 'function') restartWithTransition(scene);
        else scene.scene.restart();
    }

    function back() {
        clearMenuObjects();
        showMainMenu(scene);
    }

    // Runs before the kit's own navigation; true = handled
    function onKey(e) {
        if (!showingLevelSelect) return false;
        const step = (dir) => {
            let i = mapSelected + dir;
            while (i >= 0 && i < count && !nodes[i].unlocked) i += dir;
            select(i, true);
        };
        const code = e.code || e.key;
        switch (code) {
            case 'ArrowLeft': step(-1); break;
            case 'ArrowRight': step(1); break;
            case 'ArrowUp':
            case 'ArrowDown': {
                const p = SECRET_PATHS.find(sp => isSecretFound(sp.from) && (sp.from === mapSelected || sp.to === mapSelected));
                if (p) select(p.from === mapSelected ? p.to : p.from, true);
                break;
            }
            case 'Space':
            case 'Enter':
            case 'NumpadEnter':
                // the kit presses the focused button: make sure that is Play
                if (s.focused !== playBtn.record) s.setFocus(playBtn, { silent: true });
                return false;
            default:
                return false;     // Esc and the rest: the kit's defaults
        }
        if (e.preventDefault) e.preventDefault();
        if (s.focused !== playBtn.record) s.setFocus(playBtn, { silent: true });
        return true;
    }

    // Open on the level last played, or the furthest one reached
    let startAt = Phaser.Math.Clamp(currentLevelIndex, 0, count - 1);
    if (!nodes[startAt].unlocked) startAt = 0;
    select(startAt, false);

    s.open();
    // Removed with the rest of the screen by clearMenuObjects
    menuObjects.push({ destroy: () => { scene.tweens.killTweensOf(hero); s.destroy(); } });
}
