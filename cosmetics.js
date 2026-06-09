// ========================
// JumpQuest Cosmetic Unlock System
// Provides player colors, trails, and hats
// ========================

// Cosmetic item definitions
const COSMETIC_ITEMS = {
    colors: {
        blue:    { name: 'Blue',    color: 0x0000ff, unlock: { type: 'default' } },
        red:     { name: 'Red',     color: 0xff0000, unlock: { type: 'stars', count: 5 } },
        green:   { name: 'Green',   color: 0x00ff00, unlock: { type: 'stars', count: 10 } },
        purple:  { name: 'Purple',  color: 0x9900ff, unlock: { type: 'achievement', id: 'Combo King' } },
        cyan:    { name: 'Cyan',    color: 0x00ffff, unlock: { type: 'achievement', id: 'Dash Master' } },
        gold:    { name: 'Gold',    color: 0xffd700, unlock: { type: 'stars', count: 30 } },
        rainbow: { name: 'Rainbow', color: null,     unlock: { type: 'achievement', id: 'Perfectionist' } }
    },
    trails: {
        none:    { name: 'None',    colors: [],                  unlock: { type: 'default' } },
        fire:    { name: 'Fire',    colors: [0xff4400, 0xff8800], unlock: { type: 'stars', count: 15 } },
        ice:     { name: 'Ice',     colors: [0x00ccff, 0xffffff], unlock: { type: 'achievement', id: 'Speed Demon' } },
        sparkle: { name: 'Sparkle', colors: [0xffd700],           unlock: { type: 'stars', count: 20 } },
        shadow:  { name: 'Shadow',  colors: [0x222222],           unlock: { type: 'achievement', id: 'Exterminator' } }
    },
    hats: {
        none:    { name: 'None',    unlock: { type: 'default' } },
        crown:   { name: 'Crown',   unlock: { type: 'stars', count: 25 } },
        tophat:  { name: 'Top Hat', unlock: { type: 'achievement', id: 'Champion' } },
        antenna: { name: 'Antenna', unlock: { type: 'achievement', id: 'Combo Master' } },
        halo:    { name: 'Halo',    unlock: { type: 'achievement', id: 'Flawless' } }
    }
};

// Rainbow color cycle palette
const RAINBOW_COLORS = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x00ffff, 0x0000ff, 0x9900ff];

// Trail spawn frame counter
let _trailFrameCount = 0;

// Current cosmetic data (loaded from localStorage)
let cosmeticData = null;

// Currently active hat display objects
let _currentHatObjects = [];

// ========================
// Core Functions
// ========================

function initCosmetics() {
    const saved = localStorage.getItem('jqCosmetics');
    if (saved) {
        try {
            cosmeticData = JSON.parse(saved);
            // Ensure equipped object has all categories
            if (!cosmeticData.equipped) {
                cosmeticData.equipped = { color: 'blue', trail: 'none', hat: 'none' };
            }
            if (!cosmeticData.equipped.color) cosmeticData.equipped.color = 'blue';
            if (!cosmeticData.equipped.trail) cosmeticData.equipped.trail = 'none';
            if (!cosmeticData.equipped.hat) cosmeticData.equipped.hat = 'none';
        } catch (e) {
            cosmeticData = { equipped: { color: 'blue', trail: 'none', hat: 'none' } };
        }
    } else {
        cosmeticData = { equipped: { color: 'blue', trail: 'none', hat: 'none' } };
    }
    _saveCosmeticData();
}

function _saveCosmeticData() {
    localStorage.setItem('jqCosmetics', JSON.stringify(cosmeticData));
}

function isCosmeticUnlocked(category, id) {
    const items = COSMETIC_ITEMS[category];
    if (!items || !items[id]) return false;

    const unlock = items[id].unlock;
    if (unlock.type === 'default') return true;

    if (unlock.type === 'stars') {
        return getTotalStars() >= unlock.count;
    }

    if (unlock.type === 'achievement') {
        if (typeof isAchievementUnlocked === 'function') {
            return isAchievementUnlocked(unlock.id);
        }
        return false;
    }

    return false;
}

function equipCosmetic(category, id) {
    if (!cosmeticData) initCosmetics();
    if (!isCosmeticUnlocked(category, id)) return false;

    const categoryKey = category === 'colors' ? 'color' : category === 'trails' ? 'trail' : 'hat';
    cosmeticData.equipped[categoryKey] = id;
    _saveCosmeticData();
    return true;
}

function getEquippedCosmetics() {
    if (!cosmeticData) initCosmetics();
    return Object.assign({}, cosmeticData.equipped);
}

// ========================
// Player Color
// ========================

function applyPlayerColor(rect, time) {
    if (!cosmeticData) initCosmetics();
    if (!rect) return;

    const colorId = cosmeticData.equipped.color;
    let color = null;
    if (colorId === 'rainbow') {
        // Cycle through rainbow colors based on time
        const t = time || Date.now();
        color = RAINBOW_COLORS[Math.floor(t / 150) % RAINBOW_COLORS.length];
    } else {
        const item = COSMETIC_ITEMS.colors[colorId];
        if (item) color = item.color;
    }
    if (color === null) return;
    // Player visual may be a tinted sprite (textured) or a plain rectangle
    if (rect.setTint) rect.setTint(color);
    else rect.fillColor = color;
}

// ========================
// Trail Particles
// ========================

function spawnTrailParticle(scene, x, y) {
    if (!cosmeticData) initCosmetics();
    const trailId = cosmeticData.equipped.trail;
    if (trailId === 'none') return;

    // Throttle: only spawn every 3 frames
    _trailFrameCount++;
    if (_trailFrameCount % 3 !== 0) return;

    const trailDef = COSMETIC_ITEMS.trails[trailId];
    if (!trailDef || trailDef.colors.length === 0) return;

    // Pick a random color from the trail palette
    const color = trailDef.colors[Math.floor(Math.random() * trailDef.colors.length)];

    // Particle size varies by trail type
    let size = 4 + Math.random() * 4;
    let alpha = 0.7 + Math.random() * 0.3;
    let lifespan = 300;

    if (trailId === 'fire') {
        size = 5 + Math.random() * 5;
        lifespan = 350;
    } else if (trailId === 'ice') {
        size = 3 + Math.random() * 4;
        alpha = 0.6 + Math.random() * 0.4;
        lifespan = 400;
    } else if (trailId === 'sparkle') {
        size = 2 + Math.random() * 4;
        lifespan = 500;
    } else if (trailId === 'shadow') {
        size = 6 + Math.random() * 4;
        alpha = 0.4 + Math.random() * 0.3;
        lifespan = 250;
    }

    // Slight random offset for natural feel
    const ox = (Math.random() - 0.5) * 8;
    const oy = (Math.random() - 0.5) * 8;

    const particle = scene.add.rectangle(x + ox, y + oy, size, size, color, alpha);
    particle.setDepth(5);

    // Fade and shrink, then destroy
    scene.tweens.add({
        targets: particle,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        y: particle.y + (trailId === 'fire' ? -10 : 5),
        duration: lifespan,
        ease: 'Power2',
        onComplete: function () {
            particle.destroy();
        }
    });
}

// ========================
// Hats
// ========================

function drawPlayerHat(scene, rect) {
    if (!cosmeticData) initCosmetics();
    // Clean up old hat objects
    _destroyHatObjects();

    const hatId = cosmeticData.equipped.hat;
    if (hatId === 'none') return [];

    const objects = [];
    const px = rect.x;
    const py = rect.y - 16; // top of player

    if (hatId === 'crown') {
        // Gold triangle crown
        const gfx = scene.add.graphics();
        gfx.fillStyle(0xffd700, 1);
        gfx.fillTriangle(-8, 0, 8, 0, 0, -10);
        // Small center jewel
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(0, -3, 2);
        gfx.setPosition(px, py);
        gfx.setDepth(15);
        objects.push(gfx);
    } else if (hatId === 'tophat') {
        // Dark tall rectangle
        const brim = scene.add.rectangle(px, py, 24, 4, 0x111111);
        brim.setDepth(15);
        objects.push(brim);
        const top = scene.add.rectangle(px, py - 10, 16, 16, 0x111111);
        top.setDepth(15);
        objects.push(top);
        // Hat band
        const band = scene.add.rectangle(px, py - 4, 16, 3, 0x660000);
        band.setDepth(16);
        objects.push(band);
    } else if (hatId === 'antenna') {
        // Thin line + small circle on top
        const line = scene.add.rectangle(px, py - 8, 2, 14, 0xaaaaaa);
        line.setDepth(15);
        objects.push(line);
        const ball = scene.add.circle(px, py - 16, 3, 0xff0000);
        ball.setDepth(15);
        objects.push(ball);
    } else if (hatId === 'halo') {
        // Gold ring above head
        const gfx = scene.add.graphics();
        gfx.lineStyle(2, 0xffd700, 0.9);
        gfx.strokeEllipse(0, 0, 22, 8);
        gfx.setPosition(px, py - 8);
        gfx.setDepth(15);
        objects.push(gfx);
    }

    _currentHatObjects = objects;
    return objects;
}

function updateHatPosition(hatObjects, rect) {
    if (!hatObjects || hatObjects.length === 0) return;
    if (!rect) return;
    if (!cosmeticData) return;

    const hatId = cosmeticData.equipped.hat;
    const px = rect.x;
    const py = rect.y - 16;

    if (hatId === 'crown') {
        if (hatObjects[0]) hatObjects[0].setPosition(px, py);
    } else if (hatId === 'tophat') {
        if (hatObjects[0]) hatObjects[0].setPosition(px, py);       // brim
        if (hatObjects[1]) hatObjects[1].setPosition(px, py - 10);  // top
        if (hatObjects[2]) hatObjects[2].setPosition(px, py - 4);   // band
    } else if (hatId === 'antenna') {
        if (hatObjects[0]) hatObjects[0].setPosition(px, py - 8);   // line
        if (hatObjects[1]) hatObjects[1].setPosition(px, py - 16);  // ball
    } else if (hatId === 'halo') {
        if (hatObjects[0]) hatObjects[0].setPosition(px, py - 8);
    }
}

function _destroyHatObjects() {
    for (let i = 0; i < _currentHatObjects.length; i++) {
        if (_currentHatObjects[i] && _currentHatObjects[i].destroy) {
            _currentHatObjects[i].destroy();
        }
    }
    _currentHatObjects = [];
}

// ========================
// Cosmetic Selection Screen
// ========================

let _cosmeticScreenActive = false;
let _cosmeticActiveTab = 'colors';

function showCosmeticScreen(scene) {
    if (!cosmeticData) initCosmetics();
    _cosmeticScreenActive = true;
    _cosmeticActiveTab = 'colors';
    clearMenuObjects();
    _renderCosmeticScreen(scene);
}

function _renderCosmeticScreen(scene) {
    clearMenuObjects();

    // Background overlay
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92);
    bg.setScrollFactor(0).setDepth(2000).setInteractive();
    menuObjects.push(bg);

    // Title
    const title = scene.add.text(400, 30, 'COSMETICS', {
        fontSize: '32px', fill: '#ffdd00', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    menuObjects.push(title);

    // Tab buttons
    const tabs = ['colors', 'trails', 'hats'];
    const tabLabels = ['Colors', 'Trails', 'Hats'];

    for (let i = 0; i < tabs.length; i++) {
        const tx = 200 + i * 200;
        const isActive = _cosmeticActiveTab === tabs[i];
        const tabBg = scene.add.rectangle(tx, 75, 150, 32, isActive ? 0x446688 : 0x222222);
        tabBg.setStrokeStyle(2, isActive ? 0x88bbee : 0x444444);
        tabBg.setScrollFactor(0).setDepth(2001);
        tabBg.setInteractive({ useHandCursor: true });
        const tabIdx = i;
        tabBg.on('pointerup', function () {
            _cosmeticActiveTab = tabs[tabIdx];
            _renderCosmeticScreen(scene);
        });
        menuObjects.push(tabBg);

        const tabText = scene.add.text(tx, 75, tabLabels[i], {
            fontSize: '16px', fill: isActive ? '#fff' : '#888', fontStyle: isActive ? 'bold' : 'normal'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(tabText);
    }

    // Render items for active tab
    const items = COSMETIC_ITEMS[_cosmeticActiveTab];
    const keys = Object.keys(items);
    const equipped = getEquippedCosmetics();
    const equippedKey = _cosmeticActiveTab === 'colors' ? 'color' : _cosmeticActiveTab === 'trails' ? 'trail' : 'hat';
    const equippedId = equipped[equippedKey];

    // Grid layout - 2 columns
    const colWidth = 340;
    const rowHeight = 65;
    const startX = 140;
    const startY = 120;

    for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        const item = items[id];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = startX + col * colWidth;
        const cy = startY + row * rowHeight;

        const unlocked = isCosmeticUnlocked(_cosmeticActiveTab, id);
        const isEquipped = equippedId === id;

        // Item background box
        const boxColor = unlocked ? (isEquipped ? 0x335577 : 0x1a2a3a) : 0x1a1a1a;
        const box = scene.add.rectangle(cx + 130, cy, 300, 52, boxColor);
        box.setStrokeStyle(2, isEquipped ? 0x44aaff : (unlocked ? 0x334455 : 0x333333));
        box.setScrollFactor(0).setDepth(2001);
        menuObjects.push(box);

        // Color preview swatch (for colors tab)
        if (_cosmeticActiveTab === 'colors' && id !== 'rainbow') {
            const swatch = scene.add.rectangle(cx, cy, 24, 24, item.color || 0x444444, unlocked ? 1 : 0.3);
            swatch.setStrokeStyle(1, 0x666666);
            swatch.setScrollFactor(0).setDepth(2002);
            menuObjects.push(swatch);
        } else if (_cosmeticActiveTab === 'colors' && id === 'rainbow') {
            // Mini rainbow preview
            for (let r = 0; r < RAINBOW_COLORS.length; r++) {
                const rw = scene.add.rectangle(cx - 9 + r * 3, cy, 3, 24, RAINBOW_COLORS[r], unlocked ? 1 : 0.3);
                rw.setScrollFactor(0).setDepth(2002);
                menuObjects.push(rw);
            }
        } else if (_cosmeticActiveTab === 'trails' && item.colors && item.colors.length > 0) {
            // Trail color preview
            for (let t = 0; t < item.colors.length; t++) {
                const tw = scene.add.rectangle(cx - 4 + t * 10, cy, 8, 8, item.colors[t], unlocked ? 1 : 0.3);
                tw.setScrollFactor(0).setDepth(2002);
                menuObjects.push(tw);
            }
        } else if (_cosmeticActiveTab === 'hats' && id !== 'none') {
            // Simple hat icon
            var hatIcon;
            if (id === 'crown') {
                hatIcon = scene.add.text(cx, cy, '\u265B', { fontSize: '18px', fill: unlocked ? '#ffd700' : '#555' });
            } else if (id === 'tophat') {
                hatIcon = scene.add.text(cx, cy, '\u2302', { fontSize: '18px', fill: unlocked ? '#ccc' : '#555' });
            } else if (id === 'antenna') {
                hatIcon = scene.add.text(cx, cy, '\u2022', { fontSize: '18px', fill: unlocked ? '#f00' : '#555' });
            } else if (id === 'halo') {
                hatIcon = scene.add.text(cx, cy, '\u25CB', { fontSize: '18px', fill: unlocked ? '#ffd700' : '#555' });
            }
            if (hatIcon) {
                hatIcon.setOrigin(0.5).setScrollFactor(0).setDepth(2002);
                menuObjects.push(hatIcon);
            }
        }

        // Item name
        const nameText = scene.add.text(cx + 30, cy - 10, item.name, {
            fontSize: '16px', fill: unlocked ? '#fff' : '#666', fontStyle: isEquipped ? 'bold' : 'normal'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(nameText);

        // Status line: equipped, unlock requirement, or "Click to equip"
        var statusStr = '';
        var statusColor = '#888';
        if (isEquipped) {
            statusStr = 'Equipped';
            statusColor = '#44aaff';
        } else if (!unlocked) {
            statusStr = _getUnlockText(item.unlock);
            statusColor = '#aa5555';
        } else {
            statusStr = 'Click to equip';
            statusColor = '#6a6';
        }
        const statusText = scene.add.text(cx + 30, cy + 10, statusStr, {
            fontSize: '12px', fill: statusColor
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);
        menuObjects.push(statusText);

        // Interaction
        if (unlocked && !isEquipped) {
            box.setInteractive({ useHandCursor: true });
            const itemId = id;
            const cat = _cosmeticActiveTab;
            box.on('pointerover', function () { box.setFillStyle(0x2a4a6a); });
            box.on('pointerout', function () { box.setFillStyle(boxColor); });
            box.on('pointerup', function () {
                equipCosmetic(cat, itemId);
                _renderCosmeticScreen(scene);
            });
        } else if (!unlocked) {
            box.setInteractive({ useHandCursor: false });
            const lockText = _getUnlockText(item.unlock);
            box.on('pointerup', function () {
                _showLockedMessage(scene, lockText);
            });
        }
    }

    // Close button
    createMenuButton(scene, 400, 540, 'BACK TO MENU', '#666', '#888', function () {
        _cosmeticScreenActive = false;
        clearMenuObjects();
        showMainMenu(scene);
    });
}

function _getUnlockText(unlock) {
    if (unlock.type === 'stars') {
        return 'Locked: Earn ' + unlock.count + ' stars';
    }
    if (unlock.type === 'achievement') {
        return 'Locked: "' + unlock.id + '" achievement';
    }
    return 'Locked';
}

function _showLockedMessage(scene, text) {
    var msg = scene.add.text(400, 480, text, {
        fontSize: '14px', fill: '#ff6666', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2010);
    menuObjects.push(msg);

    scene.tweens.add({
        targets: msg,
        alpha: 0,
        y: msg.y - 20,
        duration: 1500,
        ease: 'Power2',
        onComplete: function () {
            msg.destroy();
        }
    });
}
