const level4 = {
    name: "Level 4 - Sky Towers",
    worldWidth: 4200,
    worldHeight: 600,

    platforms: [
        // Starting area - staggered steps
        { x: 100, y: 500, width: 150, height: 20 },
        { x: 280, y: 440, width: 120, height: 20 },
        { x: 450, y: 380, width: 120, height: 20 },

        // Checkpoint recovery platform 1
        { x: 620, y: 520, width: 100, height: 20 },

        // Mid section - ascending
        { x: 700, y: 420, width: 100, height: 20 },
        { x: 860, y: 360, width: 100, height: 20 },
        // Platform at 1020, 300 moved to movingPlatforms (horizontal)
        { x: 1180, y: 240, width: 90, height: 20 },

        // High platforms
        { x: 1340, y: 280, width: 90, height: 20 },
        // Platform at 1490, 340 moved to movingPlatforms (vertical)
        { x: 1640, y: 280, width: 90, height: 20 },

        // Checkpoint recovery platform 2
        { x: 1800, y: 520, width: 100, height: 20 },

        // Mid-level traverse
        { x: 1900, y: 380, width: 120, height: 20 },
        { x: 2070, y: 320, width: 100, height: 20 },
        { x: 2220, y: 380, width: 100, height: 20 },
        // Platform at 2380, 320 moved to movingPlatforms (horizontal)

        // Checkpoint recovery platform 3
        { x: 2550, y: 520, width: 100, height: 20 },

        // Ascending to finale
        { x: 2650, y: 420, width: 100, height: 20 },
        { x: 2810, y: 360, width: 100, height: 20 },
        { x: 2970, y: 300, width: 100, height: 20 },
        { x: 3130, y: 240, width: 100, height: 20 },

        // Final stretch
        { x: 3300, y: 300, width: 120, height: 20 },
        { x: 3480, y: 260, width: 100, height: 20 },
        { x: 3650, y: 320, width: 120, height: 20 },
        { x: 3840, y: 260, width: 140, height: 20 }
    ],

    obstacles: [
        { x: 280, y: 555 },
        { x: 650, y: 555 },
        { x: 1080, y: 555 },
        { x: 1400, y: 555 },
        { x: 1900, y: 555 },
        { x: 2250, y: 555 },
        { x: 2750, y: 555 },
        { x: 3150, y: 555 },
        { x: 3550, y: 555 },
        { x: 3750, y: 555 }
    ],

    enemies: [
        { x: 280, y: 400 },
        { x: 450, y: 340 },
        { x: 860, y: 320 },
        { x: 1180, y: 200 },
        { x: 1490, y: 300 },
        { x: 1640, y: 240 },
        { x: 1900, y: 340 },
        { x: 2220, y: 340 },
        { x: 2810, y: 320 },
        { x: 3130, y: 200 },
        { x: 3480, y: 220 },
        { x: 3840, y: 220 }
    ],

    playerStart: { x: 100, y: 370 },
    flagPosition: { x: 3950, y: 140 },

    checkpoints: [
        { x: 620, y: 490 },   // After starting area
        { x: 1800, y: 490 },  // After high platforms
        { x: 2550, y: 490 }   // After mid-level traverse
    ],

    coins: [
        // Starting area
        { x: 100, y: 470 },
        { x: 280, y: 410 },
        { x: 450, y: 350 },
        // Mid section
        { x: 700, y: 390 },
        { x: 860, y: 330 },
        { x: 1020, y: 270 },
        { x: 1180, y: 210 },
        // High platforms
        { x: 1340, y: 250 },
        { x: 1490, y: 310 },
        { x: 1640, y: 250 },
        // Mid-level traverse
        { x: 1900, y: 350 },
        { x: 2070, y: 290 },
        { x: 2220, y: 350 },
        { x: 2380, y: 290 },
        // Ascending to finale
        { x: 2650, y: 390 },
        { x: 2810, y: 330 },
        { x: 2970, y: 270 },
        { x: 3130, y: 210 },
        // Final stretch
        { x: 3300, y: 270 },
        { x: 3480, y: 230 },
        { x: 3650, y: 290 },
        { x: 3840, y: 230 }
    ],

    movingPlatforms: [
        // Mid section - Horizontal moving platform (was static at 1020, 300)
        { x: 1020, y: 300, width: 90, height: 20, moveX: 90, moveY: 0, speed: 60 },
        // High platforms - Vertical moving platform (was static at 1490, 340)
        { x: 1490, y: 340, width: 90, height: 20, moveX: 0, moveY: 70, speed: 55 },
        // Mid-level traverse - Horizontal moving platform (was static at 2380, 320)
        { x: 2380, y: 320, width: 100, height: 20, moveX: 100, moveY: 0, speed: 70 }
    ]
};
