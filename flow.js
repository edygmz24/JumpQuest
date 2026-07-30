// ========================
// Flow Meter — style / momentum system
// ========================
// Rewards sustained aggressive play rather than discrete pickups (that's what
// the combo system already does). Flow builds while you hold speed and take
// risks, and drains the moment you slow down or play safe. Higher tiers pay
// out more coins, so the fastest line is also the most profitable one.

const FLOW_MAX = 100;
const FLOW_TIER_WARM = 40;   // tier 1
const FLOW_TIER_FIRE = 75;   // tier 2

const FLOW_GAIN_PER_SEC = 14;   // while running near top speed
const FLOW_DRAIN_PER_SEC = 22;  // while crawling / standing still
const FLOW_IDLE_DRAIN = 7;      // while moving at a middling pace

let flowMeter = 0;
let flowTier = 0;
let flowBar = null;
let flowBarBg = null;
let flowLabel = null;
let _flowGlowFx = null;

function resetFlowState() {
    flowMeter = 0;
    flowTier = 0;
    flowBar = null;
    flowBarBg = null;
    flowLabel = null;
    _flowGlowFx = null;
}

function createFlowHUD(scene, x, y) {
    flowBarBg = scene.add.rectangle(x, y, 80, 8, 0x333333);
    flowBarBg.setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    flowBar = scene.add.rectangle(x, y, 80, 8, 0xffdd44);
    flowBar.setOrigin(0, 0.5).setScrollFactor(0).setDepth(100).setScale(0, 1);
    flowLabel = scene.add.text(x + 86, y, 'FLOW', {
        fontSize: '10px', fill: '#888'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
}

function setFlowHUDVisible(visible) {
    [flowBarBg, flowBar, flowLabel].forEach(obj => {
        if (obj && obj.setVisible) obj.setVisible(visible);
    });
}

function flowAdd(amount) {
    flowMeter = Math.max(0, Math.min(FLOW_MAX, flowMeter + amount));
}

// Event hooks — called from game.js at the corresponding moments
function flowAddStomp() { flowAdd(14); }
function flowAddNearMiss() { flowAdd(12); }
function flowAddCoin() { flowAdd(4); }
function flowAddPound() { flowAdd(8); }
function flowAddSecret() { flowAdd(12); }
function flowAddWavedash() { flowAdd(10); }

// Taking a hit wipes the meter — that's the risk half of risk/reward
function flowBreak() {
    flowMeter = 0;
    flowTier = 0;
}

function getFlowMultiplier() {
    if (flowTier >= 2) return 2;
    if (flowTier >= 1) return 1.5;
    return 1;
}

function getFlowTierName() {
    return flowTier >= 2 ? 'ON FIRE' : (flowTier >= 1 ? 'HOT' : '');
}

function updateFlowMeter(scene, delta, speedRatio, playerVisual) {
    const dt = delta / 1000;

    if (speedRatio > 0.8) {
        flowMeter += FLOW_GAIN_PER_SEC * dt;
    } else if (speedRatio < 0.35) {
        flowMeter -= FLOW_DRAIN_PER_SEC * dt;
    } else {
        flowMeter -= FLOW_IDLE_DRAIN * dt;
    }
    flowMeter = Math.max(0, Math.min(FLOW_MAX, flowMeter));

    const newTier = flowMeter >= FLOW_TIER_FIRE ? 2 : (flowMeter >= FLOW_TIER_WARM ? 1 : 0);
    if (newTier !== flowTier) {
        _onFlowTierChange(scene, newTier, flowTier, playerVisual);
        flowTier = newTier;
    }

    // HUD
    if (flowBar) {
        flowBar.setScale(flowMeter / FLOW_MAX, 1);
        flowBar.setFillStyle(flowTier >= 2 ? 0xff6622 : (flowTier >= 1 ? 0xffaa22 : 0xffdd44));
    }
    if (flowLabel) {
        const name = getFlowTierName();
        flowLabel.setText(name || 'FLOW');
        flowLabel.setColor(flowTier >= 2 ? '#ff6622' : (flowTier >= 1 ? '#ffaa22' : '#888'));
    }

    // Ambient tier particles trailing the player
    if (playerVisual) {
        if (flowTier >= 2 && Math.random() < 0.45) {
            spawnParticles(scene, playerVisual.x, playerVisual.y + 10, 0xff8833, 1, 22);
        } else if (flowTier >= 1 && Math.random() < 0.18) {
            spawnParticles(scene, playerVisual.x, playerVisual.y + 10, 0xffcc44, 1, 16);
        }
    }
}

function _onFlowTierChange(scene, newTier, oldTier, playerVisual) {
    if (!playerVisual) return;

    if (newTier > oldTier && newTier >= 1) {
        const label = newTier >= 2 ? 'ON FIRE!' : 'HOT!';
        const color = newTier >= 2 ? '#ff6622' : '#ffaa22';
        showScorePopup(scene, playerVisual.x, playerVisual.y - 40, label, color);
        spawnParticles(scene, playerVisual.x, playerVisual.y, newTier >= 2 ? 0xff6622 : 0xffaa22, 10, 55);
        playSound('powerup');
        if (typeof recordFlowTier === 'function') recordFlowTier(scene, newTier);
    }

    // Glow only at the top tier, and only where postFX exists (WebGL)
    if (newTier >= 2 && playerVisual.postFX && !_flowGlowFx) {
        _flowGlowFx = playerVisual.postFX.addGlow(0xff7722, 3, 0, false, 0.1, 12);
    } else if (newTier < 2 && _flowGlowFx && playerVisual.postFX) {
        playerVisual.postFX.remove(_flowGlowFx);
        _flowGlowFx = null;
    }
}
