const level9 = {
    name: "Level 9 - Speed Run Alley",
    worldWidth: 5000,
    worldHeight: 600,
    theme: {
        skyColor: 0x0a0a0a,
        groundColor: 0x1a1a1a,
        platformColor: 0x333333,
        bgColor1: 0x001a00,
        bgColor2: 0x002200
    },

    platforms: [
        // Starting runway
        { x: 80, y: 500, width: 250, height: 20 },

        // First speed section - long wide platforms
        { x: 400, y: 480, width: 280, height: 20 },
        { x: 750, y: 460, width: 250, height: 20 },
        { x: 1070, y: 480, width: 200, height: 20 },

        // Slight elevation change
        { x: 1340, y: 450, width: 260, height: 20 },
        { x: 1670, y: 480, width: 220, height: 20 },

        // Second speed section after checkpoint
        { x: 1970, y: 460, width: 280, height: 20 },
        { x: 2320, y: 480, width: 250, height: 20 },
        { x: 2640, y: 460, width: 220, height: 20 },

        // Brief vertical moment
        { x: 2930, y: 420, width: 180, height: 20 },
        { x: 3170, y: 460, width: 200, height: 20 },

        // Third speed section - chain stomp paradise
        { x: 3440, y: 480, width: 300, height: 20 },
        { x: 3810, y: 460, width: 280, height: 20 },

        // Final sprint
        { x: 4160, y: 480, width: 260, height: 20 },
        { x: 4490, y: 460, width: 250, height: 20 },
        { x: 4800, y: 480, width: 150, height: 20 }
    ],

    movingPlatforms: [],

    enemies: [
        // Chain stomp group 1 - walkers on first long platform
        { x: 430, y: 464, type: 'walker' },
        { x: 500, y: 464, type: 'walker' },
        { x: 570, y: 464, type: 'walker' },
        // Chain stomp group 2 - on second speed section
        { x: 2000, y: 444, type: 'walker' },
        { x: 2070, y: 444, type: 'walker' },
        { x: 2140, y: 444, type: 'walker' },
        // Chain stomp group 3 - chain stomp paradise
        { x: 3470, y: 464, type: 'walker' },
        { x: 3550, y: 464, type: 'walker' },
        // Jumpers for variety
        { x: 1340, y: 434, type: 'jumper' },
        { x: 2930, y: 404, type: 'jumper' },
        { x: 4490, y: 444, type: 'jumper' },
        // Flyers to dodge while running
        { x: 1200, y: 400, type: 'flyer' },
        { x: 3300, y: 380, type: 'flyer' }
    ],

    obstacles: [
        // Sparse obstacles - this is about speed not spike avoidance
        { x: 1260, y: 555 },
        { x: 2260, y: 555 },
        { x: 3380, y: 555 },
        { x: 4100, y: 555 }
    ],

    coins: [
        // Coins along the speed path - easy to grab while running
        { x: 150, y: 470 },
        { x: 220, y: 470 },
        { x: 450, y: 450 },
        { x: 550, y: 450 },
        { x: 650, y: 450 },
        { x: 800, y: 430 },
        { x: 900, y: 430 },
        { x: 1100, y: 450 },
        { x: 1200, y: 450 },
        { x: 1400, y: 420 },
        { x: 1500, y: 420 },
        { x: 1700, y: 450 },
        { x: 1800, y: 450 },
        // After checkpoint 1
        { x: 2020, y: 430 },
        { x: 2120, y: 430 },
        { x: 2370, y: 450 },
        { x: 2470, y: 450 },
        { x: 2700, y: 430 },
        // Brief vertical
        { x: 2960, y: 390 },
        { x: 3200, y: 430 },
        // Chain stomp section
        { x: 3500, y: 450 },
        { x: 3600, y: 450 },
        { x: 3850, y: 430 },
        // Final sprint
        { x: 4200, y: 450 },
        { x: 4530, y: 430 }
    ],

    checkpoints: [
        { x: 1670, y: 455 },
        { x: 3440, y: 455 }
    ],

    powerUps: [
        // Speed power-ups spread throughout
        { x: 400, y: 450, type: 'speed' },
        { x: 1970, y: 430, type: 'speed' },
        { x: 3810, y: 430, type: 'speed' }
    ],

    breakableBlocks: [
        { x: 1070, y: 440, width: 40, height: 40, contains: 'coin' },
        { x: 2640, y: 420, width: 40, height: 40, contains: 'coin' }
    ],

    playerStart: { x: 100, y: 540 },
    flagPosition: { x: 4900, y: 530 }
};
