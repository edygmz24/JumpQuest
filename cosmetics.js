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
        rainbow: { name: 'Rainbow', color: null,     unlock: { type: 'achievement', id: 'Perfectionist' } },
        // Purchasable with coins
        orange:  { name: 'Ember',   color: 0xff7722, unlock: { type: 'coins', price: 120 } },
        pink:    { name: 'Blossom', color: 0xff66aa, unlock: { type: 'coins', price: 250 } },
        mint:    { name: 'Mint',    color: 0x66ffcc, unlock: { type: 'coins', price: 400 } }
    },
    trails: {
        none:    { name: 'None',    colors: [],                  unlock: { type: 'default' } },
        fire:    { name: 'Fire',    colors: [0xff4400, 0xff8800], unlock: { type: 'stars', count: 15 } },
        ice:     { name: 'Ice',     colors: [0x00ccff, 0xffffff], unlock: { type: 'achievement', id: 'Speed Demon' } },
        sparkle: { name: 'Sparkle', colors: [0xffd700],           unlock: { type: 'stars', count: 20 } },
        shadow:  { name: 'Shadow',  colors: [0x222222],           unlock: { type: 'achievement', id: 'Exterminator' } },
        // Purchasable with coins
        bubble:  { name: 'Bubble',  colors: [0x88ddff, 0xffffff], unlock: { type: 'coins', price: 200 } },
        prism:   { name: 'Prism',   colors: [0xff4444, 0x44ff44, 0x4488ff], unlock: { type: 'coins', price: 450 } },
        nova:    { name: 'Nova',    colors: [0xffee88, 0xff9933, 0xffffff], unlock: { type: 'coins', price: 800 } }
    },
    hats: {
        none:    { name: 'None',    unlock: { type: 'default' } },
        crown:   { name: 'Crown',   unlock: { type: 'stars', count: 25 } },
        tophat:  { name: 'Top Hat', unlock: { type: 'achievement', id: 'Champion' } },
        antenna: { name: 'Antenna', unlock: { type: 'achievement', id: 'Combo Master' } },
        halo:    { name: 'Halo',    unlock: { type: 'achievement', id: 'Flawless' } },
        // Purchasable with coins
        cap:        { name: 'Cap',        unlock: { type: 'coins', price: 150 } },
        headphones: { name: 'Headphones', unlock: { type: 'coins', price: 350 } },
        viking:     { name: 'Viking',     unlock: { type: 'coins', price: 600 } },
        flame:      { name: 'Flame',      unlock: { type: 'coins', price: 1000 } }
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
    // Purchased items, stored as "category:id"
    if (!Array.isArray(cosmeticData.owned)) cosmeticData.owned = [];
    _saveCosmeticData();
}

function _ownedKey(category, id) {
    return category + ':' + id;
}

function isCosmeticOwned(category, id) {
    if (!cosmeticData) initCosmetics();
    return cosmeticData.owned.indexOf(_ownedKey(category, id)) !== -1;
}

function getCosmeticPrice(category, id) {
    const items = COSMETIC_ITEMS[category];
    if (!items || !items[id]) return null;
    const unlock = items[id].unlock;
    return unlock.type === 'coins' ? unlock.price : null;
}

// Returns 'ok', 'owned', 'not_for_sale', or 'insufficient'
function purchaseCosmetic(category, id) {
    if (!cosmeticData) initCosmetics();
    const price = getCosmeticPrice(category, id);
    if (price === null) return 'not_for_sale';
    if (isCosmeticOwned(category, id)) return 'owned';
    if (typeof spendCoins !== 'function' || !spendCoins(price)) return 'insufficient';

    cosmeticData.owned.push(_ownedKey(category, id));
    _saveCosmeticData();
    return 'ok';
}

// The cheapest thing the player can't afford yet, for the "next unlock" teaser
function getNextPurchaseTeaser() {
    if (!cosmeticData) initCosmetics();
    const wallet = typeof walletCoins !== 'undefined' ? walletCoins : 0;
    let best = null;
    Object.keys(COSMETIC_ITEMS).forEach(cat => {
        Object.keys(COSMETIC_ITEMS[cat]).forEach(id => {
            const price = getCosmeticPrice(cat, id);
            if (price === null || isCosmeticOwned(cat, id)) return;
            if (!best || price < best.price) {
                best = { category: cat, id: id, name: COSMETIC_ITEMS[cat][id].name, price: price };
            }
        });
    });
    if (best) best.remaining = Math.max(0, best.price - wallet);
    return best;
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

    if (unlock.type === 'coins') {
        return isCosmeticOwned(category, id);
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

// Pass track === false for secondary wearers (e.g. the ghost replay) so they
// get their own object list instead of replacing the player's tracked hat.
function drawPlayerHat(scene, rect, track) {
    if (!cosmeticData) initCosmetics();
    // Clean up old hat objects
    if (track !== false) _destroyHatObjects();

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
    } else if (hatId === 'cap') {
        // Baseball cap: dome plus a visor facing right
        const gfx = scene.add.graphics();
        gfx.fillStyle(0x2266cc, 1);
        gfx.fillEllipse(0, -1, 22, 14);
        gfx.fillRect(-11, -1, 22, 4);
        gfx.fillStyle(0x1a4fa0, 1);
        gfx.fillRect(2, 1, 15, 3);          // visor
        gfx.fillStyle(0x88bbff, 1);
        gfx.fillCircle(0, -7, 2);           // button
        gfx.setPosition(px, py);
        gfx.setDepth(15);
        objects.push(gfx);
    } else if (hatId === 'headphones') {
        const gfx = scene.add.graphics();
        gfx.lineStyle(3, 0x333338, 1);
        gfx.beginPath();
        gfx.arc(0, 2, 12, Math.PI, 0, false);
        gfx.strokePath();
        gfx.fillStyle(0x8844cc, 1);
        gfx.fillRoundedRect(-15, 0, 6, 11, 2);   // left cup
        gfx.fillRoundedRect(9, 0, 6, 11, 2);     // right cup
        gfx.fillStyle(0xbb77ff, 1);
        gfx.fillRect(-14, 2, 2, 7);
        gfx.setPosition(px, py);
        gfx.setDepth(15);
        objects.push(gfx);
    } else if (hatId === 'viking') {
        const gfx = scene.add.graphics();
        gfx.fillStyle(0x9aa3ad, 1);
        gfx.fillEllipse(0, 0, 22, 15);           // helmet dome
        gfx.fillRect(-11, 0, 22, 3);
        gfx.fillStyle(0x6f7883, 1);
        gfx.fillRect(-2, -8, 4, 9);              // nose guard ridge
        gfx.fillStyle(0xf2e2c0, 1);              // horns
        gfx.fillTriangle(-11, -1, -20, -9, -10, -7);
        gfx.fillTriangle(11, -1, 20, -9, 10, -7);
        gfx.setPosition(px, py);
        gfx.setDepth(15);
        objects.push(gfx);
    } else if (hatId === 'flame') {
        const gfx = scene.add.graphics();
        gfx.fillStyle(0xff5511, 1);
        gfx.fillTriangle(-7, 2, 7, 2, 0, -18);
        gfx.fillStyle(0xff9933, 1);
        gfx.fillTriangle(-4, 2, 4, 2, 0, -12);
        gfx.fillStyle(0xffe066, 1);
        gfx.fillTriangle(-2, 2, 2, 2, 0, -6);
        gfx.setPosition(px, py);
        gfx.setDepth(15);
        objects.push(gfx);
    }

    if (track !== false) _currentHatObjects = objects;
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
    } else if (hatObjects[0]) {
        // Single-graphics hats (cap, headphones, viking, flame) draw relative
        // to their own origin, so they only need the anchor point.
        hatObjects[0].setPosition(px, py);
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
// Cosmetic Selection Screen (the shop), built with the menu kit (ui.js)
// ========================

let _cosmeticScreenActive = false;
let _cosmeticActiveTab = 'colors';
let _cosmeticScreen = null;          // the open kit screen, or null

const _COSMETIC_TABS = ['colors', 'trails', 'hats'];
const _COSMETIC_TAB_LABELS = ['Colors', 'Trails', 'Hats'];

function showCosmeticScreen(scene) {
    if (!cosmeticData) initCosmetics();
    _cosmeticScreenActive = true;
    _cosmeticActiveTab = 'colors';
    clearMenuObjects();
    _renderCosmeticScreen(scene);
}

// Shows the tab named by _cosmeticActiveTab. With the shop already open it
// only swaps the item grid (cross-fade); otherwise it builds the screen.
function _renderCosmeticScreen(scene) {
    if (!cosmeticData) initCosmetics();
    const tabIndex = Math.max(0, _COSMETIC_TABS.indexOf(_cosmeticActiveTab));
    const open = _cosmeticScreen;
    if (open && (open.state === 'new' || open.state === 'opening' || open.state === 'open')) {
        open._cosmeticTabs.setActive(tabIndex);
        open.rebuild(() => _buildCosmeticGrid(scene, open));
        return;
    }

    clearMenuObjects();
    const T = UI.theme;
    const s = UI.screen(scene, {
        id: 'shop', depth: T.depth.menu, backdrop: 'solid',
        onBack: () => {
            _cosmeticScreenActive = false;
            s.close(() => {
                clearMenuObjects();
                showMainMenu(scene);
            });
        }
    });
    _cosmeticScreen = s;
    _cosmeticScreenActive = true;

    s.title(VIEW_W / 2, 44, 'SHOP', { ribbon: true });
    // Wallet: this screen is the shop
    s._cosmeticWallet = s.stat(24, 44, 'coin', typeof walletCoins !== 'undefined' ? walletCoins : 0,
        { color: 'gold', align: 'left' });

    s._cosmeticTabs = s.tabs(VIEW_W / 2, 108, _COSMETIC_TAB_LABELS, tabIndex, (i) => {
        _cosmeticActiveTab = _COSMETIC_TABS[i];
        _renderCosmeticScreen(scene);
    }, { label: 'Colors / Trails / Hats', default: true });

    s.rebuild(() => _buildCosmeticGrid(scene, s));

    s.button(VIEW_W / 2, 522, 'Back to Menu', { role: 'neutral', size: 'md', icon: 'back', onClick: () => s.onBack() });
    s.hintBar([['←↑↓→', 'Move'], ['←→', 'Tabs'], ['ENTER', 'Buy / Equip'], ['ESC', 'Back']]);
    s.open();
    menuObjects.push({ destroy: () => { s.destroy(); if (_cosmeticScreen === s) _cosmeticScreen = null; } });
}

// The item cards of the active tab, three columns. Each card keeps a
// refresh() so a purchase or equip updates them in place (focus stays).
function _buildCosmeticGrid(scene, s) {
    const cat = _cosmeticActiveTab;
    const items = COSMETIC_ITEMS[cat];
    const keys = Object.keys(items);
    const CW = 322, CH = 66, GAP_X = 14, PITCH_Y = 80, COLS = 3, TOP = 176;
    const left = VIEW_W / 2 - (COLS * CW + (COLS - 1) * GAP_X) / 2 + CW / 2;
    const cards = [];

    keys.forEach((id, i) => {
        const item = items[id];
        const cx = left + (i % COLS) * (CW + GAP_X);
        const cy = TOP + Math.floor(i / COLS) * PITCH_Y;
        const card = s.card(cx, cy, CW, CH, {
            label: item.name, layout: 'row',
            onClick: () => _onCosmeticCard(scene, s, cat, id)
        });
        card.setEnabled(true);           // locked cards still answer (they explain why)

        const px = -CW / 2 + 32, tx = -CW / 2 + 62;
        _addCosmeticPreview(scene, card, cat, id, item, px);
        card.labelText.setPosition(tx, -10);
        const coin = UI.icon(scene, 'coin', 15);
        coin.setPosition(tx + 7, 11);
        const status = scene.add.text(tx, 11, '', {
            fontFamily: UI.theme.font, fontSize: UI.theme.size.cardSub + 'px', fontStyle: 'bold',
            color: UI.theme.text.dim, resolution: UI.theme.textResolution
        }).setOrigin(0, 0.5);
        card.add([coin, status]);

        card._cosmeticRefresh = () => {
            const st = _cosmeticCardStatus(cat, id, item);
            card.setState(st.state);
            card.setEnabled(true);       // setState('locked') switches the card off again
            coin.setVisible(st.coin);
            status.setX(st.coin ? tx + 18 : tx);
            status.setText(st.text);
            status.setColor(UI.theme.text[st.color] || st.color);
        };
        card._cosmeticRefresh();
        cards.push(card);
    });
    s._cosmeticCards = cards;
}

// What a card shows: kit state, status line (as before) and its colour
function _cosmeticCardStatus(cat, id, item) {
    const equippedKey = cat === 'colors' ? 'color' : cat === 'trails' ? 'trail' : 'hat';
    const isEquipped = getEquippedCosmetics()[equippedKey] === id;
    const unlocked = isCosmeticUnlocked(cat, id);
    const price = getCosmeticPrice(cat, id);
    const wallet = typeof walletCoins !== 'undefined' ? walletCoins : 0;
    const affordable = price !== null && typeof walletCoins !== 'undefined' && walletCoins >= price;
    if (isEquipped) return { state: 'selected', text: 'Equipped', color: 'nav', coin: false };
    if (!unlocked && price !== null) {
        return {
            state: affordable ? 'normal' : 'locked', coin: true,
            text: price + (affordable ? '  — click to buy' : '  (need ' + (price - wallet) + ' more)'),
            color: affordable ? 'gold' : 'dim'
        };
    }
    if (!unlocked) return { state: 'locked', text: _getUnlockText(item.unlock), color: 'danger', coin: false };
    return { state: 'owned', text: 'Click to equip', color: 'go', coin: false };
}

// Same outcomes as the old box clicks: equip, buy (then equip), or refuse
function _onCosmeticCard(scene, s, cat, id) {
    const item = COSMETIC_ITEMS[cat][id];
    const equippedKey = cat === 'colors' ? 'color' : cat === 'trails' ? 'trail' : 'hat';
    if (getEquippedCosmetics()[equippedKey] === id) return;
    const unlocked = isCosmeticUnlocked(cat, id);
    const price = getCosmeticPrice(cat, id);
    if (unlocked) {
        equipCosmetic(cat, id);
        _refreshCosmeticScreen(s);
    } else if (price !== null) {
        const result = purchaseCosmetic(cat, id);
        if (result === 'ok') {
            equipCosmetic(cat, id);
            if (typeof playSound === 'function') playSound('unlock');
            _refreshCosmeticScreen(s);
        } else {
            _showLockedMessage(scene, 'Not enough coins — need ' + (price - walletCoins) + ' more');
        }
    } else {
        _showLockedMessage(scene, _getUnlockText(item.unlock));
    }
}

function _refreshCosmeticScreen(s) {
    if (!s || s.state === 'closed') return;
    if (s._cosmeticWallet && typeof walletCoins !== 'undefined') s._cosmeticWallet.setText(walletCoins);
    (s._cosmeticCards || []).forEach(c => { if (c.active && c._cosmeticRefresh) c._cosmeticRefresh(); });
}

// Each item's own preview art, drawn into the card at local x = px
function _addCosmeticPreview(scene, card, cat, id, item, px) {
    const C = UI.theme.color;
    if (cat === 'hats' && id === 'crown') {
        const ic = UI.icon(scene, 'crown', 28);
        ic.setPosition(px, 0);
        card.add(ic);
        return;
    }
    const g = scene.add.graphics();
    g.setPosition(px, 0);
    if (cat === 'colors' && id !== 'rainbow') {
        g.fillStyle(C.ink, 1); g.fillRoundedRect(-15, -15, 30, 30, 7);
        g.fillStyle(item.color, 1); g.fillRoundedRect(-13, -13, 26, 26, 5);
        g.fillStyle(C.white, 0.25); g.fillRoundedRect(-10, -11, 20, 7, 3);
    } else if (cat === 'colors') {
        // mini rainbow stripes
        g.fillStyle(C.ink, 1); g.fillRoundedRect(-16, -15, 32, 30, 7);
        RAINBOW_COLORS.forEach((col, r) => { g.fillStyle(col, 1); g.fillRect(-14 + r * 4, -13, 4, 26); });
    } else if (cat === 'trails') {
        // trail colour dots
        const n = item.colors.length;
        item.colors.forEach((col, t) => {
            const dx = (t - (n - 1) / 2) * 13;
            g.fillStyle(C.ink, 1); g.fillCircle(dx, 0, 7);
            g.fillStyle(col, 1); g.fillCircle(dx, 0, 5.5);
        });
    } else if (cat === 'hats') {
        _drawHatPreview(g, id);
        g.setScale(1.3);
    }
    card.add(g);
}

// Small code-drawn hats, the same shapes as drawPlayerHat, centred on 0,0
function _drawHatPreview(g, id) {
    if (id === 'tophat') {
        g.fillStyle(0x111111, 1);
        g.fillRect(-12, 6, 24, 4);
        g.fillRect(-8, -10, 16, 16);
        g.fillStyle(0x660000, 1);
        g.fillRect(-8, 2, 16, 3);
    } else if (id === 'antenna') {
        g.fillStyle(0xaaaaaa, 1);
        g.fillRect(-1, -4, 2, 14);
        g.fillStyle(0xff0000, 1);
        g.fillCircle(0, -6, 3);
    } else if (id === 'halo') {
        g.lineStyle(2, 0xffd700, 0.9);
        g.strokeEllipse(0, 0, 22, 8);
    } else if (id === 'cap') {
        g.fillStyle(0x2266cc, 1);
        g.fillEllipse(0, 2, 22, 14);
        g.fillRect(-11, 2, 22, 4);
        g.fillStyle(0x1a4fa0, 1);
        g.fillRect(2, 4, 15, 3);
        g.fillStyle(0x88bbff, 1);
        g.fillCircle(0, -4, 2);
    } else if (id === 'headphones') {
        g.lineStyle(3, 0x333338, 1);
        g.beginPath();
        g.arc(0, -3, 12, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(0x8844cc, 1);
        g.fillRoundedRect(-15, -5, 6, 11, 2);
        g.fillRoundedRect(9, -5, 6, 11, 2);
        g.fillStyle(0xbb77ff, 1);
        g.fillRect(-14, -3, 2, 7);
    } else if (id === 'viking') {
        g.fillStyle(0x9aa3ad, 1);
        g.fillEllipse(0, 3, 22, 15);
        g.fillRect(-11, 3, 22, 3);
        g.fillStyle(0x6f7883, 1);
        g.fillRect(-2, -5, 4, 9);
        g.fillStyle(0xf2e2c0, 1);
        g.fillTriangle(-11, 2, -20, -6, -10, -4);
        g.fillTriangle(11, 2, 20, -6, 10, -4);
    } else if (id === 'flame') {
        g.fillStyle(0xff5511, 1);
        g.fillTriangle(-7, 10, 7, 10, 0, -10);
        g.fillStyle(0xff9933, 1);
        g.fillTriangle(-4, 10, 4, 10, 0, -4);
        g.fillStyle(0xffe066, 1);
        g.fillTriangle(-2, 10, 2, 10, 0, 2);
    }
}

function _getUnlockText(unlock) {
    if (unlock.type === 'stars') {
        return 'Locked: Earn ' + unlock.count + ' stars';
    }
    if (unlock.type === 'achievement') {
        return 'Locked: "' + unlock.id + '" achievement';
    }
    if (unlock.type === 'coins') {
        return '● ' + unlock.price;
    }
    return 'Locked';
}

// A short message above the Back button that floats up and fades out
function _showLockedMessage(scene, text) {
    const s = _cosmeticScreen;
    if (!s || s.state === 'closed' || s.state === 'closing') return;
    const msg = s.label(VIEW_W / 2, 470, text, { style: 'body', color: 'danger', outline: true });
    scene.tweens.killTweensOf(msg);       // drop the kit's late-entry tween
    msg.setPosition(VIEW_W / 2, 470).setAlpha(1);
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
