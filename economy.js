// ========================
// Economy — Coin Wallet
// ========================
// Coins have historically only fed the score. They now also accumulate into a
// persistent wallet that will back the cosmetics shop. Score is untouched, so
// existing high scores and leaderboards stay comparable.
//
// Coins earned during a level are held in `pendingCoins` and only banked when
// the run ends (level complete or game over). Dying mid-level therefore keeps
// what you've picked up, but a fresh restart starts the tally over.

const WALLET_KEY = 'jqWallet';
const FIRST_CLEAR_KEY = 'jqLastEarnDay';
const LOGIN_BONUS_KEY = 'jqLastLoginBonus';

let walletCoins = 0;   // banked total, persisted
let pendingCoins = 0;  // earned this run, not yet banked

function initWallet() {
    const raw = parseInt(localStorage.getItem(WALLET_KEY), 10);
    walletCoins = isNaN(raw) ? 0 : Math.max(0, raw);
}

function saveWallet() {
    localStorage.setItem(WALLET_KEY, String(walletCoins));
}

// Total to show the player: banked plus what's riding on the current run.
// Pending is kept fractional so flow-tier multipliers (x1.5) accumulate
// exactly; only whole coins are ever shown or banked.
function getDisplayCoins() {
    return walletCoins + Math.floor(pendingCoins);
}

function earnCoins(amount) {
    pendingCoins += Math.max(0, amount);
}

// Run-level multipliers are applied here rather than per-coin, because
// "first clear today" isn't known until the run actually ends.
function bankPendingCoins(multiplier) {
    const mult = multiplier > 0 ? multiplier : 1;
    const banked = Math.floor(pendingCoins * mult);
    pendingCoins = 0;
    if (banked <= 0) return 0;
    walletCoins += banked;
    saveWallet();
    return banked;
}

function _todayString() {
    if (typeof getDailyDateString === 'function') return getDailyDateString();
    return new Date().toISOString().slice(0, 10);
}

// Doubles the first level cleared each day — the classic session starter.
function isFirstClearToday() {
    return localStorage.getItem(FIRST_CLEAR_KEY) !== _todayString();
}

function markFirstClearToday() {
    localStorage.setItem(FIRST_CLEAR_KEY, _todayString());
}

// Multipliers that apply to a whole run, with labels for the results screen.
function getRunCoinBonuses() {
    const bonuses = [];
    if (typeof modifierMode !== 'undefined' && modifierMode === 'hardcore') {
        bonuses.push({ label: 'Hardcore', mult: 1.5 });
    }
    if (isFirstClearToday()) {
        bonuses.push({ label: 'First clear today', mult: 2 });
    }
    return bonuses;
}

// Once-a-day login bonus that scales with the daily streak.
function claimDailyLoginBonus() {
    const today = _todayString();
    if (localStorage.getItem(LOGIN_BONUS_KEY) === today) return 0;
    localStorage.setItem(LOGIN_BONUS_KEY, today);
    const streak = (typeof dailyStreak !== 'undefined' && dailyStreak > 0) ? dailyStreak : 0;
    const bonus = Math.min(10 + streak * 10, 50);
    walletCoins += bonus;
    saveWallet();
    return bonus;
}

function spendCoins(amount) {
    const cost = Math.max(0, Math.floor(amount));
    if (walletCoins < cost) return false;
    walletCoins -= cost;
    saveWallet();
    return true;
}

function canAfford(amount) {
    return walletCoins >= Math.max(0, Math.floor(amount));
}

// Called from the create() reset seam in game.js so a restart doesn't carry
// over coins from an abandoned attempt.
function resetEconomyLevelState() {
    pendingCoins = 0;
}
