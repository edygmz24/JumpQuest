const level1 = {
    name: "Level 1 - Green Meadows",
    worldWidth: 2800,
    worldHeight: 600,

    theme: {
        skyColor: 0x87CEEB,
        groundColor: 0x228B22,
        platformColor: 0x8B4513,
        bgColor1: 0x4a8505,
        bgColor2: 0x2d5a1e
    },

    platforms: [
        // Section 2 (600-1200): 3 stepping-stone platforms at increasing heights
        { x: 650, y: 500, width: 150, height: 20 },
        { x: 850, y: 440, width: 150, height: 20 },
        { x: 1050, y: 380, width: 150, height: 20 },

        // Section 3 (1200-1800): Wide platform with walker enemy
        { x: 1400, y: 480, width: 200, height: 20 },

        // Section 4 (1800-2200): Platforms around the gap + landing platform
        { x: 1800, y: 520, width: 150, height: 20 },
        // Gap of ~120px
        { x: 2070, y: 520, width: 150, height: 20 },

        // Section 5 (2200-2800): Platform before flag
        { x: 2600, y: 500, width: 160, height: 20 }
    ],

    movingPlatforms: [
        // Section 5: One slow-moving horizontal platform
        { x: 2300, y: 490, width: 120, height: 20, moveX: 150, moveY: 0, speed: 40 }
    ],

    enemies: [
        // Section 3: Walker on the wide platform
        { x: 1420, y: 464, type: 'walker' },
        // Section 5: Walker near the end
        { x: 2620, y: 484, type: 'walker' }
    ],

    obstacles: [],

    coins: [
        // Section 1 (0-600): Arrow pattern pointing right on the ground
        // Arrow shaft (horizontal line)
        { x: 100, y: 540 },
        { x: 140, y: 540 },
        { x: 180, y: 540 },
        { x: 220, y: 540 },
        { x: 260, y: 540 },
        // Arrow head (pointing right)
        { x: 300, y: 520 },
        { x: 300, y: 560 },
        { x: 340, y: 540 },

        // Section 2: Coins on each stepping platform
        { x: 650, y: 470 },
        { x: 850, y: 410 },
        { x: 1050, y: 350 },

        // Section 3: Coins behind the walker (reward for stomping)
        { x: 1480, y: 450 },
        { x: 1520, y: 450 }
    ],

    checkpoints: [
        // After the gap in Section 4
        { x: 2100, y: 495 }
    ],

    powerUps: [],

    breakableBlocks: [],

    playerStart: { x: 60, y: 540 },
    flagPosition: { x: 2750, y: 555 }
};
