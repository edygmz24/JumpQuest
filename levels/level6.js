const level6 = {
    name: "Level 6 - Bouncy Clouds",
    worldWidth: 3800,
    worldHeight: 600,
    theme: {
        skyColor: 0xADD8E6,
        groundColor: 0xCCCCCC,
        platformColor: 0xE8E8E8,
        bgColor1: 0xB0D4E8,
        bgColor2: 0x87CEEB
    },

    platforms: [
        // Starting area - ground level platforms
        { x: 80, y: 500, width: 160, height: 20 },
        { x: 280, y: 440, width: 100, height: 20 },
        { x: 420, y: 380, width: 100, height: 20 },

        // Cloud staircase section 1 - ascending
        { x: 560, y: 480, width: 120, height: 20 },
        { x: 700, y: 420, width: 100, height: 20 },
        { x: 840, y: 360, width: 100, height: 20 },
        { x: 980, y: 300, width: 110, height: 20 },
        { x: 1120, y: 360, width: 100, height: 20 },

        // After checkpoint 1 - mid section with varied heights
        { x: 1300, y: 500, width: 140, height: 20 },
        { x: 1480, y: 440, width: 100, height: 20 },
        { x: 1620, y: 380, width: 90, height: 20 },
        { x: 1750, y: 320, width: 100, height: 20 },
        { x: 1880, y: 260, width: 90, height: 20 },

        // Descent and recovery
        { x: 2020, y: 340, width: 100, height: 20 },
        { x: 2160, y: 420, width: 120, height: 20 },

        // High cloud section - double jump needed
        { x: 2340, y: 500, width: 130, height: 20 },
        { x: 2500, y: 420, width: 100, height: 20 },
        { x: 2640, y: 340, width: 90, height: 20 },
        { x: 2780, y: 260, width: 100, height: 20 },
        { x: 2920, y: 340, width: 90, height: 20 },

        // Final stretch
        { x: 3080, y: 480, width: 120, height: 20 },
        { x: 3240, y: 400, width: 100, height: 20 },
        { x: 3400, y: 320, width: 100, height: 20 },
        { x: 3550, y: 400, width: 120, height: 20 }
    ],

    movingPlatforms: [
        // Vertical cloud float near start
        { x: 500, y: 320, width: 80, height: 20, moveX: 0, moveY: 80, speed: 40 },
        // Vertical cloud float mid-level
        { x: 1950, y: 200, width: 80, height: 20, moveX: 0, moveY: 70, speed: 45 },
        // Vertical cloud float near end
        { x: 3160, y: 300, width: 80, height: 20, moveX: 0, moveY: 80, speed: 50 }
    ],

    enemies: [
        // Walkers
        { x: 560, y: 464, type: 'walker' },
        { x: 3080, y: 464, type: 'walker' },
        // Flyers scattered across the sky
        { x: 350, y: 320, type: 'flyer' },
        { x: 800, y: 280, type: 'flyer' },
        { x: 1550, y: 300, type: 'flyer' },
        { x: 2450, y: 340, type: 'flyer' },
        { x: 3300, y: 260, type: 'flyer' },
        // Jumper
        { x: 2160, y: 404, type: 'jumper' }
    ],

    obstacles: [
        // Spikes on ground to punish falling
        { x: 650, y: 555 },
        { x: 1200, y: 555 },
        { x: 1700, y: 555 },
        { x: 2250, y: 555 },
        { x: 2850, y: 555 },
        { x: 3450, y: 555 }
    ],

    coins: [
        // Starting area
        { x: 120, y: 470 },
        { x: 280, y: 410 },
        { x: 420, y: 350 },
        // Cloud staircase section 1
        { x: 700, y: 390 },
        { x: 840, y: 330 },
        { x: 980, y: 270 },
        { x: 1120, y: 330 },
        // Mid section
        { x: 1480, y: 410 },
        { x: 1620, y: 350 },
        { x: 1750, y: 290 },
        { x: 1880, y: 230 },
        // High coins rewarding jumps
        { x: 500, y: 240 },
        { x: 1950, y: 170 },
        // Descent
        { x: 2020, y: 310 },
        { x: 2160, y: 390 },
        // High cloud section
        { x: 2500, y: 390 },
        { x: 2640, y: 310 },
        { x: 2780, y: 230 },
        // Final stretch
        { x: 3240, y: 370 },
        { x: 3400, y: 290 }
    ],

    checkpoints: [
        { x: 1300, y: 475 },
        { x: 2340, y: 475 }
    ],

    powerUps: [
        // Double jump given early
        { x: 280, y: 410, type: 'doubleJump' },
        // High jump for the high cloud section
        { x: 2340, y: 470, type: 'highJump' }
    ],

    breakableBlocks: [
        { x: 840, y: 320, width: 40, height: 40, contains: 'coin' },
        { x: 2640, y: 300, width: 40, height: 40, contains: 'coin' }
    ],

    playerStart: { x: 100, y: 540 },
    flagPosition: { x: 3700, y: 530 }
};
