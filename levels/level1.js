const level1 = {
    name: "Level 1 - Getting Started",
    worldWidth: 3200,
    worldHeight: 600,

    platforms: [
        // Starting area platforms
        { x: 100, y: 500, width: 200, height: 20 },

        // Section 1 - Early platforms
        { x: 350, y: 460, width: 150, height: 20 },
        { x: 550, y: 400, width: 120, height: 20 },
        { x: 720, y: 340, width: 100, height: 20 },

        // Checkpoint recovery platform 1
        { x: 850, y: 520, width: 100, height: 20 },
        { x: 850, y: 440, width: 80, height: 20 },  // Stepping stone after checkpoint 1

        // Section 2 - Mid level
        { x: 950, y: 380, width: 150, height: 20 },
        { x: 1100, y: 360, width: 100, height: 20 },
        { x: 1250, y: 300, width: 120, height: 20 },
        { x: 1450, y: 380, width: 150, height: 20 },

        // Checkpoint recovery platform 2
        { x: 1580, y: 520, width: 100, height: 20 },
        { x: 1580, y: 440, width: 80, height: 20 },  // Stepping stone after checkpoint 2

        // Section 3 - Higher platforms
        { x: 1700, y: 360, width: 100, height: 20 },
        { x: 1800, y: 260, width: 120, height: 20 },
        { x: 1980, y: 340, width: 100, height: 20 },

        // Section 4 - Challenging jumps
        { x: 2150, y: 280, width: 80, height: 20 },
        { x: 2300, y: 220, width: 80, height: 20 },
        { x: 2480, y: 280, width: 100, height: 20 },

        // Checkpoint recovery platform 3
        { x: 2600, y: 520, width: 100, height: 20 },
        { x: 2600, y: 440, width: 80, height: 20 },  // Stepping stone after checkpoint 3

        // Section 5 - Final stretch
        { x: 2750, y: 360, width: 120, height: 20 },
        { x: 2920, y: 300, width: 120, height: 20 },
        { x: 3080, y: 240, width: 120, height: 20 }
    ],

    obstacles: [
        { x: 400, y: 555 },
        { x: 650, y: 555 },
        { x: 950, y: 555 },
        { x: 1300, y: 555 },
        { x: 1700, y: 555 },
        { x: 2000, y: 555 },
        { x: 2400, y: 555 },
        { x: 2700, y: 555 }
    ],

    enemies: [
        { x: 550, y: 360 },
        { x: 900, y: 380 },
        { x: 1100, y: 320 },
        { x: 1450, y: 340 },
        { x: 1650, y: 280 },
        { x: 1800, y: 220 },
        { x: 2150, y: 240 },
        { x: 2480, y: 240 },
        { x: 2750, y: 320 },
        { x: 2920, y: 260 }
    ],

    playerStart: { x: 100, y: 450 },
    flagPosition: { x: 3100, y: 200 },

    checkpoints: [
        { x: 850, y: 490 },   // After section 1
        { x: 1580, y: 490 },  // After section 2
        { x: 2600, y: 490 }   // After section 4
    ],

    coins: [
        // Starting area
        { x: 150, y: 470 },
        { x: 200, y: 470 },
        // Section 1
        { x: 350, y: 430 },
        { x: 400, y: 430 },
        { x: 550, y: 370 },
        { x: 720, y: 310 },
        // Section 2
        { x: 900, y: 390 },
        { x: 950, y: 390 },
        { x: 1100, y: 330 },
        { x: 1250, y: 270 },
        { x: 1450, y: 350 },
        // Section 3
        { x: 1650, y: 290 },
        { x: 1800, y: 230 },
        { x: 1980, y: 310 },
        // Section 4
        { x: 2150, y: 250 },
        { x: 2300, y: 190 },
        { x: 2480, y: 250 },
        // Section 5
        { x: 2750, y: 330 },
        { x: 2920, y: 270 },
        { x: 3080, y: 210 }
    ]
};
