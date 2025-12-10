const level3 = {
    name: "Level 3 - The Gauntlet",
    worldWidth: 4000,
    worldHeight: 600,

    platforms: [
        // Starting area
        { x: 100, y: 500, width: 200, height: 20 },

        // Section 1 - Quick succession
        { x: 350, y: 450, width: 100, height: 20 },
        { x: 500, y: 400, width: 90, height: 20 },
        { x: 640, y: 350, width: 90, height: 20 },
        { x: 780, y: 300, width: 100, height: 20 },

        // Checkpoint recovery platform 1
        { x: 920, y: 520, width: 100, height: 20 },

        // Section 2 - Zigzag pattern (reduced vertical changes)
        { x: 1000, y: 380, width: 100, height: 20 },
        { x: 1180, y: 340, width: 90, height: 20 },
        { x: 1330, y: 300, width: 90, height: 20 },
        { x: 1510, y: 340, width: 100, height: 20 },
        { x: 1660, y: 380, width: 90, height: 20 },

        // Section 3 - Precision jumps (gentler slopes)
        { x: 1820, y: 340, width: 80, height: 20 },
        { x: 1970, y: 300, width: 80, height: 20 },
        { x: 2120, y: 260, width: 80, height: 20 },
        { x: 2270, y: 300, width: 100, height: 20 },

        // Checkpoint recovery platform 2
        { x: 2350, y: 520, width: 100, height: 20 },

        // Section 4 - Enemy maze
        { x: 2450, y: 420, width: 120, height: 20 },
        { x: 2620, y: 360, width: 100, height: 20 },
        { x: 2780, y: 300, width: 100, height: 20 },
        { x: 2940, y: 360, width: 100, height: 20 },

        // Section 5 - Final challenge
        { x: 3100, y: 280, width: 90, height: 20 },
        { x: 3250, y: 220, width: 80, height: 20 },
        { x: 3400, y: 280, width: 90, height: 20 },
        { x: 3550, y: 340, width: 100, height: 20 },
        { x: 3730, y: 260, width: 120, height: 20 }
    ],

    obstacles: [
        { x: 420, y: 555 },
        { x: 700, y: 555 },
        { x: 1080, y: 555 },
        { x: 1380, y: 555 },
        { x: 1700, y: 555 },
        { x: 2100, y: 555 },
        { x: 2550, y: 555 },
        { x: 2860, y: 555 },
        { x: 3200, y: 555 },
        { x: 3480, y: 555 }
    ],

    enemies: [
        { x: 500, y: 360 },
        { x: 780, y: 260 },
        { x: 1000, y: 340 },
        { x: 1330, y: 260 },
        { x: 1660, y: 340 },
        { x: 1820, y: 300 },
        { x: 2120, y: 220 },
        { x: 2450, y: 380 },
        { x: 2780, y: 260 },
        { x: 3100, y: 240 },
        { x: 3400, y: 240 },
        { x: 3730, y: 220 }
    ],

    playerStart: { x: 100, y: 450 },
    flagPosition: { x: 3800, y: 160 },

    checkpoints: [
        { x: 920, y: 490 },   // After section 1
        { x: 2350, y: 490 }   // After section 3
    ],

    coins: [
        // Starting area
        { x: 100, y: 470 },
        { x: 150, y: 470 },
        // Section 1
        { x: 350, y: 420 },
        { x: 500, y: 370 },
        { x: 640, y: 320 },
        { x: 780, y: 270 },
        // Section 2
        { x: 1000, y: 350 },
        { x: 1180, y: 310 },
        { x: 1330, y: 270 },
        { x: 1510, y: 310 },
        { x: 1660, y: 350 },
        // Section 3
        { x: 1820, y: 310 },
        { x: 1970, y: 270 },
        { x: 2120, y: 230 },
        { x: 2270, y: 270 },
        // Section 4
        { x: 2450, y: 390 },
        { x: 2620, y: 330 },
        { x: 2780, y: 270 },
        { x: 2940, y: 330 },
        // Section 5
        { x: 3100, y: 250 },
        { x: 3250, y: 190 },
        { x: 3400, y: 250 },
        { x: 3550, y: 310 },
        { x: 3730, y: 230 }
    ]
};
