const level1 = {
    name: "Level 1 - Green Meadows",
    worldWidth: 3980,
    worldHeight: 600,

    theme: {
        biome: 'meadow',
        propStyle: 'mountains',
        weather: 'leaves',
        skyColor: 0x87CEEB,
        groundColor: 0x228B22,
        platformColor: 0x8B4513,
        bgColor1: 0x4a8505,
        bgColor2: 0x2d5a1e
    },

    platforms: [
        // Bonus room (through the door at x 1935)
        { x: 3420, y: 470, width: 160, height: 20 },
        { x: 3650, y: 400, width: 160, height: 20 },

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

    // First spring the player meets — sits in the open with a coin arc above it
    // so the launch teaches itself.
    springs: [
        { x: 1650, y: 550 }
    ],

    coins: [
        // Up the beanstalk, and the bonus room
        { x: 1264, y: 330 },
        { x: 1196, y: 268 },
        { x: 1264, y: 206 },
        { x: 1196, y: 144 },
        { x: 1230, y: 96 },
        { x: 1285, y: 96 },
        { x: 1175, y: 96 },
        { x: 3250, y: 540 },
        { x: 3290, y: 540 },
        { x: 3330, y: 540 },
        { x: 3370, y: 440 },
        { x: 3420, y: 440 },
        { x: 3470, y: 440 },
        { x: 3600, y: 370 },
        { x: 3650, y: 370 },
        { x: 3700, y: 370 },
        { x: 3800, y: 300 },
        { x: 3840, y: 300 },
        { x: 3880, y: 300 },

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
        { x: 1520, y: 450 },

        // Section 3.5: Reward arc above the spring
        { x: 1650, y: 430 },
        { x: 1650, y: 360 },
        { x: 1650, y: 300 }
    ],

    checkpoints: [
        // After the gap in Section 4
        { x: 2100, y: 495 }
    ],

    powerUps: [],

    breakableBlocks: [],

    // --- Interactables (see interact.js) ---

    // The level proper ends at mainWidth; past it are walled-off bonus rooms
    // reached by door.
    mainWidth: 2800,
    rooms: [{ x: 2840, width: 1100 }],

    bumpBlocks: [
        // First star blocks, with a hidden one just past them
        { x: 420, y: 440, contains: 'coin' },
        { x: 460, y: 440, contains: 'coins', count: 5 },
        { x: 500, y: 440, contains: 'coin' },
        { x: 540, y: 440, contains: 'coin', hidden: true },
        // Sprouts a beanstalk up to a coin stash
        { x: 1230, y: 440, contains: 'sprout', leaves: 4 },
        // Bonus room
        { x: 3080, y: 440, contains: 'coins', count: 5 },
        { x: 3120, y: 440, contains: 'coin' },
        { x: 3160, y: 440, contains: 'coin' }
    ],

    doors: [
        // Down to the bonus room and back
        { id: 'a', x: 1935, y: 526 },
        { id: 'a', x: 2910, y: 526 }
    ],

    // Three hidden gems (campaign.js)
    gems: [
        { x: 850, y: 388 },
        { x: 1050, y: 328 },
        { x: 2070, y: 468 }
    ],

    targetTime: 30000,

    playerStart: { x: 60, y: 540 },
    flagPosition: { x: 2750, y: 555 }
};
