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

function bankPendingCoins() {
    const banked = Math.floor(pendingCoins);
    pendingCoins = 0;
    if (banked <= 0) return 0;
    walletCoins += banked;
    saveWallet();
    return banked;
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
