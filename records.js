// ========================
// Saved-record migrations
// ========================
// Runs once per browser, before any other script reads saved records.
//
// Layout version 2 (platform spacing pass) changed levels 2-10, so time-based
// records set on the old layouts no longer compare fairly. For those levels
// it clears best times, ghost replays, speedrun PBs, best death counts and
// leaderboard times. High scores, stars, completions, unlocks and coins are
// kept.

const LAYOUT_VERSION = 2;
const LAYOUT_VERSION_KEY = 'jqLayoutVersion';

// Level indices (0-based) whose layout changed in each version
const LAYOUT_CHANGES = {
    2: [1, 2, 3, 4, 5, 6, 7, 8, 9]
};

(function migrateLayoutRecords() {
    let saved;
    try {
        saved = parseInt(localStorage.getItem(LAYOUT_VERSION_KEY)) || 1;
    } catch (e) {
        return;
    }
    if (saved >= LAYOUT_VERSION) return;

    const changed = new Set();
    for (let v = saved + 1; v <= LAYOUT_VERSION; v++) {
        (LAYOUT_CHANGES[v] || []).forEach(i => changed.add(i));
    }

    const clearKeys = (storageKey, perLevel) => {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(storageKey));
        } catch (e) {
            data = null;
        }
        if (!data || typeof data !== 'object') return;
        changed.forEach(i => perLevel(data, 'level' + i));
        localStorage.setItem(storageKey, JSON.stringify(data));
    };

    try {
        clearKeys('jqBestTimes', (d, k) => { delete d[k]; });
        clearKeys('jqBestDeaths', (d, k) => { delete d[k]; });
        clearKeys('jqSpeedrunRecords', (d, k) => { delete d[k]; });
        // Leaderboard: keep the score list, drop the time list
        clearKeys('jqLeaderboard', (d, k) => { if (d[k]) d[k].times = []; });
        changed.forEach(i => localStorage.removeItem('jqGhost_level' + i));
        localStorage.setItem(LAYOUT_VERSION_KEY, String(LAYOUT_VERSION));
    } catch (e) {
        // Storage unavailable or full: try again next load
    }
})();
