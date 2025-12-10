const level5 = {
    name: "Level 5 - The Final Trial",
    worldWidth: 4500,
    worldHeight: 600,

    platforms: [
        // Starting sequence
        { x: 100, y: 500, width: 180, height: 20 },
        { x: 320, y: 440, width: 100, height: 20 },
        { x: 470, y: 380, width: 90, height: 20 },
        { x: 610, y: 320, width: 90, height: 20 },
        { x: 750, y: 260, width: 100, height: 20 },

        // Checkpoint recovery platform 1
        { x: 900, y: 520, width: 100, height: 20 },

        // Extreme heights section
        { x: 1000, y: 200, width: 80, height: 20 },
        { x: 1140, y: 260, width: 80, height: 20 },
        { x: 1280, y: 200, width: 80, height: 20 },
        { x: 1420, y: 150, width: 80, height: 20 },
        { x: 1560, y: 220, width: 90, height: 20 },

        // Drop and recovery
        { x: 1730, y: 380, width: 120, height: 20 },
        { x: 1920, y: 320, width: 100, height: 20 },

        // Checkpoint recovery platform 2
        { x: 2100, y: 520, width: 100, height: 20 },

        // Precision platforming
        { x: 2200, y: 280, width: 70, height: 20 },
        { x: 2330, y: 220, width: 70, height: 20 },
        { x: 2460, y: 280, width: 70, height: 20 },
        { x: 2590, y: 220, width: 70, height: 20 },
        { x: 2720, y: 160, width: 70, height: 20 },

        // Gauntlet section
        { x: 2880, y: 340, width: 100, height: 20 },
        { x: 3040, y: 280, width: 90, height: 20 },
        { x: 3190, y: 340, width: 90, height: 20 },
        { x: 3340, y: 280, width: 90, height: 20 },

        // Checkpoint recovery platform 3
        { x: 3500, y: 520, width: 100, height: 20 },

        // Final ascent
        { x: 3600, y: 400, width: 100, height: 20 },
        { x: 3750, y: 340, width: 100, height: 20 },
        { x: 3900, y: 280, width: 100, height: 20 },
        { x: 4050, y: 220, width: 100, height: 20 },
        { x: 4220, y: 180, width: 140, height: 20 }
    ],

    obstacles: [
        { x: 380, y: 555 },
        { x: 680, y: 555 },
        { x: 1050, y: 555 },
        { x: 1350, y: 555 },
        { x: 1800, y: 555 },
        { x: 2250, y: 555 },
        { x: 2650, y: 555 },
        { x: 2950, y: 555 },
        { x: 3280, y: 555 },
        { x: 3680, y: 555 },
        { x: 4000, y: 555 }
    ],

    enemies: [
        { x: 470, y: 340 },
        { x: 750, y: 220 },
        { x: 1000, y: 160 },
        { x: 1280, y: 160 },
        { x: 1560, y: 180 },
        { x: 1920, y: 280 },
        { x: 2200, y: 240 },
        { x: 2460, y: 240 },
        { x: 2720, y: 120 },
        { x: 3040, y: 240 },
        { x: 3340, y: 240 },
        { x: 3750, y: 300 },
        { x: 4050, y: 180 }
    ],

    playerStart: { x: 100, y: 450 },
    flagPosition: { x: 4300, y: 100 },

    checkpoints: [
        { x: 900, y: 490 },   // After starting sequence
        { x: 2100, y: 490 },  // After extreme heights
        { x: 3500, y: 490 }   // After gauntlet section
    ],

    coins: [
        // Starting sequence
        { x: 100, y: 470 },
        { x: 150, y: 470 },
        { x: 320, y: 410 },
        { x: 470, y: 350 },
        { x: 610, y: 290 },
        { x: 750, y: 230 },
        // Extreme heights section
        { x: 1000, y: 170 },
        { x: 1140, y: 230 },
        { x: 1280, y: 170 },
        { x: 1420, y: 120 },
        { x: 1560, y: 190 },
        // Drop and recovery
        { x: 1730, y: 350 },
        { x: 1920, y: 290 },
        // Precision platforming
        { x: 2200, y: 250 },
        { x: 2330, y: 190 },
        { x: 2460, y: 250 },
        { x: 2590, y: 190 },
        { x: 2720, y: 130 },
        // Gauntlet section
        { x: 2880, y: 310 },
        { x: 3040, y: 250 },
        { x: 3190, y: 310 },
        { x: 3340, y: 250 },
        // Final ascent
        { x: 3600, y: 370 },
        { x: 3750, y: 310 },
        { x: 3900, y: 250 },
        { x: 4050, y: 190 },
        { x: 4220, y: 150 }
    ]
};
