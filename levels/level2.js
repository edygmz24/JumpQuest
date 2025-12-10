const level2 = {
    name: "Level 2 - Rising Heights",
    worldWidth: 3600,
    worldHeight: 600,

    platforms: [
        // Starting area
        { x: 120, y: 520, width: 180, height: 20 },
        { x: 320, y: 480, width: 140, height: 20 },

        // Section 1 - Ascending
        { x: 500, y: 440, width: 120, height: 20 },
        { x: 680, y: 390, width: 100, height: 20 },
        { x: 850, y: 330, width: 120, height: 20 },

        // Checkpoint recovery platform 1
        { x: 1000, y: 520, width: 100, height: 20 },
        { x: 1000, y: 440, width: 80, height: 20 },  // Stepping stone after checkpoint 1
        { x: 1000, y: 360, width: 80, height: 20 },  // Extra step for high section

        // Section 2 - High jumps
        { x: 1100, y: 280, width: 100, height: 20 },
        { x: 1220, y: 340, width: 90, height: 20 },
        { x: 1380, y: 280, width: 100, height: 20 },
        { x: 1550, y: 220, width: 110, height: 20 },

        // Section 3 - Narrow platforms
        { x: 1750, y: 300, width: 80, height: 20 },
        { x: 1900, y: 360, width: 80, height: 20 },
        { x: 2060, y: 300, width: 80, height: 20 },

        // Checkpoint recovery platform 2
        { x: 2200, y: 520, width: 100, height: 20 },
        { x: 2200, y: 440, width: 80, height: 20 },  // Stepping stone after checkpoint 2

        // Section 4 - Mixed heights
        { x: 2320, y: 380, width: 120, height: 20 },
        { x: 2480, y: 320, width: 100, height: 20 },
        { x: 2650, y: 260, width: 90, height: 20 },
        { x: 2820, y: 340, width: 110, height: 20 },

        // Section 5 - Final gauntlet
        { x: 3000, y: 280, width: 100, height: 20 },
        { x: 3180, y: 220, width: 120, height: 20 },
        { x: 3380, y: 280, width: 140, height: 20 }
    ],

    obstacles: [
        { x: 450, y: 555 },
        { x: 750, y: 555 },
        { x: 1150, y: 555 },
        { x: 1450, y: 555 },
        { x: 1850, y: 555 },
        { x: 2350, y: 555 },
        { x: 2750, y: 555 },
        { x: 3100, y: 555 }
    ],

    enemies: [
        { x: 500, y: 400 },
        { x: 850, y: 290 },
        { x: 1050, y: 230 },
        { x: 1380, y: 240 },
        { x: 1750, y: 260 },
        { x: 1900, y: 320 },
        { x: 2280, y: 360 },
        { x: 2650, y: 220 },
        { x: 3000, y: 240 },
        { x: 3380, y: 240 }
    ],

    playerStart: { x: 120, y: 470 },
    flagPosition: { x: 3450, y: 180 },

    checkpoints: [
        { x: 1000, y: 490 },  // After section 1
        { x: 2200, y: 490 }   // After section 3
    ],

    coins: [
        // Starting area
        { x: 120, y: 490 },
        { x: 170, y: 490 },
        { x: 320, y: 450 },
        // Section 1
        { x: 500, y: 410 },
        { x: 680, y: 360 },
        { x: 850, y: 300 },
        // Section 2
        { x: 1050, y: 240 },
        { x: 1220, y: 310 },
        { x: 1380, y: 250 },
        { x: 1550, y: 190 },
        // Section 3
        { x: 1750, y: 270 },
        { x: 1900, y: 330 },
        { x: 2060, y: 270 },
        // Section 4
        { x: 2280, y: 370 },
        { x: 2480, y: 290 },
        { x: 2650, y: 230 },
        { x: 2820, y: 310 },
        // Section 5
        { x: 3000, y: 250 },
        { x: 3180, y: 190 },
        { x: 3380, y: 250 }
    ]
};
