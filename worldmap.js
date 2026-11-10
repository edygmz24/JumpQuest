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

    const keep = o => { o.wideUI = true; o.setScrollFactor(0); menuObjects.push(o); return o; };
    const count = CAMPAIGN_LEVELS.length;

    // Backdrop
    const bg = keep(scene.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0b1326, 0.97).setOrigin(0, 0).setDepth(2000));
    bg.setInteractive();

    const map = keep(scene.add.container(0, 0).setDepth(2001));
    const g = scene.add.graphics();
    map.add(g);

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
        map.add(scene.add.text(cx, 150, `WORLD ${w + 1}`, {
            fontSize: '12px', fill: '#9fb4d8', fontStyle: 'bold'
        }).setOrigin(0.5));
        map.add(scene.add.text(cx, 168, world.name.toUpperCase(), {
            fontSize: '18px', fill: '#ffffff', fontStyle: 'bold', stroke: '#0b1326', strokeThickness: 4
        }).setOrigin(0.5));
    });

    // Paths
    for (let i = 0; i < count - 1; i++) {
        const a = mapNodePos(i), b = mapNodePos(i + 1);
        const open = isLevelUnlocked(i + 1);
        g.lineStyle(8, 0x0b1326, 0.9);
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
        g.lineStyle(3, 0x6fd3ff, 1);
        for (let k = 0; k < pts.length - 1; k += 2) g.lineBetween(pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
    });

    // Nodes
    const nodes = [];
    for (let i = 0; i < count; i++) {
        const pos = mapNodePos(i);
        const unlocked = isLevelUnlocked(i);
        const done = !!completedLevels['level' + i];
        const boss = !!CAMPAIGN_LEVELS[i].bossArena;
        const r = boss ? 26 : 20;
        const ring = scene.add.circle(pos.x, pos.y, r + 4, done ? 0xffd34d : 0x0b1326);
        const fill = unlocked ? (boss ? 0xc0392b : WORLDS[levelWorld(i)].color) : 0x3a4254;
        const dot = scene.add.circle(pos.x, pos.y, r, fill);
        dot.setStrokeStyle(2, 0xffffff, unlocked ? 0.9 : 0.25);
        const label = scene.add.text(pos.x, pos.y, unlocked ? (boss ? '♛' : levelLabel(i)) : '🔒', {
            fontSize: boss ? '22px' : '13px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#0b1326', strokeThickness: 3
        }).setOrigin(0.5);
        map.add([ring, dot, label]);
        if (unlocked) {
            const stars = getStarCount(i);
            const gems = getLevelGems(i).filter(Boolean).length;
            map.add(scene.add.text(pos.x, pos.y + r + 13,
                '★'.repeat(stars) + '☆'.repeat(3 - stars), { fontSize: '11px', fill: stars ? '#ffd34d' : '#5a6880' }).setOrigin(0.5));
            map.add(scene.add.text(pos.x, pos.y + r + 26,
                '◆'.repeat(gems) + '◇'.repeat(3 - gems), { fontSize: '10px', fill: gems ? '#ff8fd6' : '#5a6880' }).setOrigin(0.5));
            dot.setInteractive({ useHandCursor: true });
            dot.on('pointerup', () => { if (mapSelected === i) play(); else select(i, true); });
        }
        nodes.push({ pos: pos, unlocked: unlocked, dot: dot });
    }

    // The hero standing on the selected node
    const heroKey = scene.textures.exists('hd_tex_player') ? 'hd_tex_player' : 'tex_player';
    const hero = scene.add.image(0, 0, heroKey).setOrigin(0.5, 0.85);
    if (typeof cosmeticData !== 'undefined' && typeof applyPlayerColor === 'function') applyPlayerColor(hero, 0);
    map.add(hero);
    scene.tweens.add({ targets: hero, scaleY: 0.92, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Header
    keep(scene.add.text(24, 18, 'WORLD MAP', {
        fontSize: '26px', fill: '#ffdd00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setDepth(2002));
    keep(scene.add.text(VIEW_W - 24, 22,
        `★ ${getTotalStars()}/${count * 3}     ◆ ${getTotalGems()}/${count * 3}`, {
            fontSize: '16px', fill: '#ffe9a8', fontStyle: 'bold'
        }).setOrigin(1, 0).setDepth(2002));

    // Info panel
    keep(scene.add.rectangle(VIEW_W / 2, 520, 620, 104, 0x101a30, 0.95).setStrokeStyle(2, 0x31415e).setDepth(2002));
    const title = keep(scene.add.text(VIEW_W / 2 - 290, 480, '', {
        fontSize: '20px', fill: '#ffffff', fontStyle: 'bold'
    }).setDepth(2003));
    const detail = keep(scene.add.text(VIEW_W / 2 - 290, 510, '', {
        fontSize: '13px', fill: '#9fb4d8', lineSpacing: 6
    }).setDepth(2003));
    const button = (x, y, text, color, hover, fn) => {
        const b = keep(scene.add.text(x, y, text, {
            fontSize: '18px', fill: '#fff', fontStyle: 'bold', backgroundColor: color, padding: { x: 22, y: 9 }
        }).setOrigin(0.5).setDepth(2003));
        b.setInteractive({ useHandCursor: true });
        b.on('pointerover', () => b.setStyle({ backgroundColor: hover }));
        b.on('pointerout', () => b.setStyle({ backgroundColor: color }));
        b.on('pointerup', () => { if (typeof playSound === 'function') playSound('menuClick'); fn(); });
        return b;
    };
    button(VIEW_W / 2 + 215, 506, '▶  PLAY', '#0a0', '#0c0', () => play());
    button(VIEW_W / 2 + 215, 548, 'BACK', '#555', '#777', () => back());
    keep(scene.add.text(VIEW_W / 2, 586, '← →  walk      ↑ ↓  secret path      SPACE  play      ESC  back', {
        fontSize: '10px', fill: '#5a6880'
    }).setOrigin(0.5).setDepth(2002));

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
        const lines = [
            `Best time ${best ? formatTime(best) : '--:--'}      Target ${formatTime(lvl.targetTime || 60000)}`,
            (lvl.bossArena ? 'Boss level      ' : '') +
            (SECRET_PATHS.some(p => p.from === i) ? (isSecretFound(i) ? 'Secret exit found' : 'There is a secret exit here…') : '')
        ];
        detail.setText(lines.join('\n'));
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

    const onKey = (e) => {
        if (!showingLevelSelect) return;
        const step = (dir) => {
            let i = mapSelected + dir;
            while (i >= 0 && i < count && !nodes[i].unlocked) i += dir;
            select(i, true);
        };
        switch (e.code) {
            case 'ArrowLeft': step(-1); break;
            case 'ArrowRight': step(1); break;
            case 'ArrowUp':
            case 'ArrowDown': {
                const p = SECRET_PATHS.find(s => isSecretFound(s.from) && (s.from === mapSelected || s.to === mapSelected));
                if (p) select(p.from === mapSelected ? p.to : p.from, true);
                break;
            }
            case 'Space':
            case 'Enter': play(); break;
            case 'Escape': back(); break;
        }
    };
    scene.input.keyboard.on('keydown', onKey);
    // Removed with the rest of the screen by clearMenuObjects
    menuObjects.push({ destroy: () => scene.input.keyboard.off('keydown', onKey) });

    // Open on the level last played, or the furthest one reached
    let startAt = Phaser.Math.Clamp(currentLevelIndex, 0, count - 1);
    if (!nodes[startAt].unlocked) startAt = 0;
    select(startAt, false);
}
