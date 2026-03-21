const level3 = {
    name: "Level 3 - Crystal Caves",
    worldWidth: 3600,
    worldHeight: 600,

    theme: {
        skyColor: 0x1a1a2e,
        groundColor: 0x2d2d2d,
        platformColor: 0x555555,
        bgColor1: 0x0d1b2a,
        bgColor2: 0x1b2838
    },

    platforms: [
        // Section 1 (0-800): Normal platforms leading to vertical shaft
        { x: 150, y: 500, width: 160, height: 20 },
        { x: 380, y: 460, width: 140, height: 20 },
        // Vertical shaft - alternating wall platforms to climb ~200px
        { x: 550, y: 480, width: 100, height: 20 },   // shaft base
        { x: 620, y: 400, width: 80, height: 20 },     // right wall platform
        { x: 530, y: 320, width: 80, height: 20 },     // left wall platform
        { x: 620, y: 250, width: 80, height: 20 },     // right wall - top of shaft
        // Exit from shaft
        { x: 750, y: 250, width: 120, height: 20 },

        // Section 2 (800-1600): Open area with flyers
        { x: 900, y: 300, width: 140, height: 20 },
        { x: 1100, y: 350, width: 140, height: 20 },
        { x: 1300, y: 400, width: 160, height: 20 },
        { x: 1500, y: 480, width: 140, height: 20 },

        // Section 3 (1600-2400): Shooter corridor
        // Ground-level running path with elevated shooter perches
        { x: 1700, y: 520, width: 180, height: 20 },
        { x: 1750, y: 350, width: 80, height: 20 },    // Shooter perch 1
        { x: 1950, y: 520, width: 180, height: 20 },
        { x: 2050, y: 350, width: 80, height: 20 },    // Shooter perch 2
        { x: 2200, y: 520, width: 160, height: 20 },

        // Section 4 (2400-3000): Shield enemy + breakable block
        { x: 2450, y: 480, width: 200, height: 20 },
        { x: 2700, y: 440, width: 160, height: 20 },
        { x: 2900, y: 480, width: 140, height: 20 },

        // Section 5 (3000-3600): Vertical ascent with wall jumps
        { x: 3050, y: 500, width: 120, height: 20 },   // base
        { x: 3100, y: 420, width: 80, height: 20 },     // right side
        { x: 3030, y: 340, width: 80, height: 20 },     // left side
        { x: 3100, y: 260, width: 80, height: 20 },     // right side
        { x: 3030, y: 180, width: 80, height: 20 },     // left side - top
        // Flag platform at top-right
        { x: 3250, y: 180, width: 160, height: 20 }
    ],

    movingPlatforms: [
        // Section 2: Moving platform to help cross the open area
        { x: 1000, y: 330, width: 100, height: 20, moveX: 80, moveY: 0, speed: 45 },
        // Section 5: Moving platform near the top to reach flag
        { x: 3150, y: 200, width: 90, height: 20, moveX: 80, moveY: 0, speed: 40 }
    ],

    enemies: [
        // Section 1: Walkers on early platforms
        { x: 400, y: 444, type: 'walker' },
        { x: 770, y: 234, type: 'walker' },

        // Section 2: Flyers in the open area (sine-wave movement)
        { x: 950, y: 250, type: 'flyer' },
        { x: 1200, y: 280, type: 'flyer' },

        // Section 3: Shooters on elevated perches
        { x: 1770, y: 334, type: 'shooter' },
        { x: 2070, y: 334, type: 'shooter' },

        // Section 4: Shield enemy guarding breakable block, plus a walker
        { x: 2720, y: 424, type: 'shield' },
        { x: 2920, y: 464, type: 'walker' },

        // Section 5: Flyer in vertical ascent
        { x: 3080, y: 300, type: 'flyer' }
    ],

    obstacles: [
        // Spikes in the shooter corridor to keep pressure on
        { x: 1880, y: 555 },
        { x: 2130, y: 555 }
    ],

    coins: [
        // Section 1: On early platforms and in shaft
        { x: 170, y: 470 },
        { x: 400, y: 430 },
        { x: 570, y: 450 },
        { x: 640, y: 370 },
        { x: 550, y: 290 },
        { x: 640, y: 220 },
        { x: 780, y: 220 },

        // Section 2: Across the open area (risky near flyers)
        { x: 930, y: 270 },
        { x: 1030, y: 270 },
        { x: 1130, y: 320 },
        { x: 1330, y: 370 },
        { x: 1430, y: 370 },
        { x: 1520, y: 450 },

        // Section 3: Coins on the ground path (reward for dodging shooters)
        { x: 1740, y: 490 },
        { x: 1800, y: 490 },
        { x: 2000, y: 490 },
        { x: 2060, y: 490 },
        { x: 2230, y: 490 },

        // Section 4: Around the shield enemy area
        { x: 2480, y: 450 },
        { x: 2550, y: 450 },
        { x: 2930, y: 450 },

        // Section 5: Vertical ascent coins
        { x: 3120, y: 390 },
        { x: 3050, y: 310 },
        { x: 3120, y: 230 },
        { x: 3050, y: 150 }
    ],

    checkpoints: [
        // After the flyer section
        { x: 1530, y: 455 },
        // After the shooter corridor
        { x: 2480, y: 455 }
    ],

    powerUps: [],

    breakableBlocks: [
        // Section 2: Hidden coin in breakable block
        { x: 1150, y: 320, width: 40, height: 20, contains: 'coin' },
        // Section 4: doubleJump power-up guarded by shield enemy
        { x: 2750, y: 410, width: 40, height: 20, contains: 'doubleJump' },
        // Section 5: Coin in the vertical shaft
        { x: 3070, y: 370, width: 40, height: 20, contains: 'coin' }
    ],

    playerStart: { x: 60, y: 540 },
    flagPosition: { x: 3350, y: 155 }
};
