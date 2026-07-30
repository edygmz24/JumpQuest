const level4 = {
    name: "Level 4 - Sunset Fortress",
    worldWidth: 4000,
    worldHeight: 600,
    theme: {
        biome: 'castle',
        propStyle: 'towers',
        weather: 'embers',
        skyColor: 0xE85D04,
        groundColor: 0x4a2800,
        platformColor: 0x5C3317,
        bgColor1: 0xBB3E00,
        bgColor2: 0x6B2D00
    },

    platforms: [
        // === Section 1 (0-800): Ascending the fortress exterior ===
        // Starting platform
        { x: 100, y: 500, width: 200, height: 20 },
        // Ascending steps
        { x: 300, y: 440, width: 120, height: 20 },
        { x: 470, y: 380, width: 120, height: 20 },
        { x: 640, y: 320, width: 120, height: 20 },
        // Upper ledge
        { x: 750, y: 260, width: 100, height: 20 },

        // === Section 2 (800-1600): Inside the fortress - breakable blocks area ===
        // Landing from section 1
        { x: 900, y: 300, width: 140, height: 20 },
        // Patrol platforms for walkers
        { x: 1050, y: 480, width: 200, height: 20 },
        { x: 1300, y: 480, width: 200, height: 20 },
        // Upper walkway
        { x: 1100, y: 350, width: 150, height: 20 },
        { x: 1350, y: 350, width: 150, height: 20 },
        // Transition platform
        { x: 1520, y: 420, width: 100, height: 20 },

        // === Section 3 (1600-2400): Gauntlet - shooter enemies above ===
        // Elevated shooter platforms (high up, enemies fire down)
        { x: 1700, y: 220, width: 100, height: 20 },
        { x: 2050, y: 220, width: 100, height: 20 },
        // Lower running platforms (player dashes through)
        { x: 1650, y: 470, width: 160, height: 20 },
        { x: 1850, y: 470, width: 160, height: 20 },
        { x: 2050, y: 470, width: 160, height: 20 },
        { x: 2250, y: 470, width: 160, height: 20 },

        // === Section 4 (2400-3200): Vertical tower climb ===
        // Alternating left-right platforms for wall-jump style climbing
        { x: 2500, y: 500, width: 120, height: 20 },
        { x: 2650, y: 430, width: 100, height: 20 },
        { x: 2500, y: 360, width: 100, height: 20 },
        { x: 2680, y: 290, width: 100, height: 20 },
        { x: 2500, y: 220, width: 100, height: 20 },
        // Bridge to section 5
        { x: 2800, y: 220, width: 120, height: 20 },
        { x: 2960, y: 280, width: 100, height: 20 },
        { x: 3100, y: 350, width: 120, height: 20 },

        // === Section 5 (3200-4000): Boss area ===
        // Open arena floor
        { x: 3300, y: 480, width: 250, height: 20 },
        { x: 3600, y: 480, width: 250, height: 20 },
        // Elevated platform for hidden breakable block
        { x: 3500, y: 320, width: 100, height: 20 },
        // Flag platform
        { x: 3850, y: 480, width: 150, height: 20 }
    ],

    movingPlatforms: [
        // Section 1: Horizontal moving platform bridging a gap
        { x: 550, y: 440, width: 90, height: 20, moveX: 100, moveY: 0, speed: 60 },
        // Section 4: Vertical moving platform in the tower
        { x: 2600, y: 500, width: 90, height: 20, moveX: 0, moveY: 100, speed: 50 }
    ],

    enemies: [
        // Section 1: 2 jumpers on ascending platforms
        { x: 350, y: 424, type: 'jumper' },
        { x: 670, y: 304, type: 'jumper' },

        // Section 2: 3 walkers patrolling inside fortress + 1 jumper
        { x: 1080, y: 464, type: 'walker' },
        { x: 1200, y: 464, type: 'walker' },
        { x: 1400, y: 464, type: 'walker' },
        { x: 1350, y: 334, type: 'jumper' },

        // Section 3: 2 shooters on elevated platforms
        { x: 1720, y: 204, type: 'shooter' },
        { x: 2070, y: 204, type: 'shooter' },

        // Section 4: 2 flyers circling the tower + 1 walker
        { x: 2550, y: 300, type: 'flyer' },
        { x: 2700, y: 200, type: 'flyer' },
        { x: 2960, y: 264, type: 'walker' },

        // Section 5: 2 shield enemies + 1 shooter + 1 flyer
        { x: 3400, y: 464, type: 'shield' },
        { x: 3650, y: 464, type: 'shield' },
        { x: 3500, y: 304, type: 'shooter' },
        { x: 3750, y: 380, type: 'flyer' }
    ],

    obstacles: [
        // Section 1: spikes on ground
        { x: 200, y: 555 },
        { x: 400, y: 555 },
        // Section 3: spikes to punish falling
        { x: 1750, y: 555 },
        { x: 1950, y: 555 },
        { x: 2150, y: 555 },
        // Section 5: spikes in arena
        { x: 3450, y: 555 },
        { x: 3700, y: 555 }
    ],

    coins: [
        // Section 1 (4 coins)
        { x: 300, y: 410 },
        { x: 470, y: 350 },
        { x: 640, y: 290 },
        { x: 750, y: 230 },
        // Section 2 (6 coins)
        { x: 950, y: 270 },
        { x: 1080, y: 450 },
        { x: 1200, y: 450 },
        { x: 1400, y: 450 },
        { x: 1130, y: 320 },
        { x: 1380, y: 320 },
        // Section 3 (4 coins)
        { x: 1700, y: 440 },
        { x: 1900, y: 440 },
        { x: 2100, y: 440 },
        { x: 2300, y: 440 },
        // Section 4 (4 coins)
        { x: 2500, y: 330 },
        { x: 2680, y: 260 },
        { x: 2500, y: 190 },
        { x: 2800, y: 190 },
        // Section 5 (4 coins)
        { x: 3350, y: 450 },
        { x: 3500, y: 290 },
        { x: 3650, y: 450 },
        { x: 3850, y: 450 }
    ],

    checkpoints: [
        // After section 2
        { x: 1550, y: 395 },
        // After section 3, before tower climb
        { x: 2450, y: 555 }
    ],

    powerUps: [
        // Section 3: speed to dash through gauntlet
        { x: 1650, y: 440, type: 'speed' },
        // Section 5: highJump hidden in breakable block (placed via breakableBlocks)
    ],

    breakableBlocks: [
        // Section 2: scattered breakable blocks
        { x: 1000, y: 350, width: 40, height: 40, contains: 'coin' },
        { x: 1250, y: 350, width: 40, height: 40, contains: 'coin' },
        { x: 1450, y: 300, width: 40, height: 40, contains: 'invincibility' },
        // Section 4: hidden coin
        { x: 2800, y: 180, width: 40, height: 40, contains: 'coin' },
        // Section 5: highJump power-up hidden above arena
        { x: 3500, y: 280, width: 40, height: 40, contains: 'highJump' }
    ],

    // Secret area: hidden upper path above Section 4 tower climb
    // Invisible platforms leading to the very top of the screen with secret coins
    invisiblePlatforms: [
        { x: 2500, y: 160, width: 80, height: 20 },
        { x: 2650, y: 100, width: 80, height: 20 },
        { x: 2800, y: 60, width: 80, height: 20 }
    ],
    secretCoins: [
        { x: 2500, y: 130, revealTrigger: { x: 2500, y: 160, radius: 40 } },
        { x: 2650, y: 70, revealTrigger: { x: 2650, y: 100, radius: 40 } },
        { x: 2800, y: 30, revealTrigger: { x: 2800, y: 60, radius: 40 } },
        { x: 2730, y: 30, revealTrigger: { x: 2800, y: 60, radius: 40 } },
        { x: 2870, y: 30, revealTrigger: { x: 2800, y: 60, radius: 40 } }
    ],

    playerStart: { x: 120, y: 470 },
    flagPosition: { x: 3900, y: 455 }
};
