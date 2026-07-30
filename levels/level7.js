const level7 = {
    name: "Level 7 - The Machine",
    worldWidth: 4000,
    worldHeight: 600,
    theme: {
        biome: 'machine',
        propStyle: 'towers',
        weather: 'embers',
        skyColor: 0x2C3E50,
        groundColor: 0x555555,
        platformColor: 0x7F8C8D,
        bgColor1: 0x34495E,
        bgColor2: 0x2C3E50
    },

    platforms: [
        // Starting conveyor area
        { x: 80, y: 500, width: 180, height: 20 },
        { x: 320, y: 450, width: 120, height: 20 },
        { x: 500, y: 500, width: 100, height: 20 },

        // First timing section - wait for moving platforms
        { x: 680, y: 450, width: 100, height: 20 },
        { x: 950, y: 400, width: 100, height: 20 },

        // Shooter danger zone platforms
        { x: 1150, y: 500, width: 140, height: 20 },
        { x: 1350, y: 440, width: 100, height: 20 },
        { x: 1520, y: 380, width: 100, height: 20 },
        { x: 1700, y: 440, width: 120, height: 20 },

        // Second timing section
        { x: 1900, y: 500, width: 130, height: 20 },
        { x: 2100, y: 440, width: 100, height: 20 },
        { x: 2300, y: 380, width: 90, height: 20 },

        // Complex machinery area
        { x: 2520, y: 500, width: 150, height: 20 },
        { x: 2720, y: 430, width: 100, height: 20 },
        { x: 2900, y: 370, width: 100, height: 20 },
        { x: 3080, y: 430, width: 110, height: 20 },

        // Final gauntlet
        { x: 3280, y: 500, width: 120, height: 20 },
        { x: 3460, y: 440, width: 100, height: 20 },
        { x: 3640, y: 380, width: 100, height: 20 },
        { x: 3800, y: 450, width: 120, height: 20 }
    ],

    movingPlatforms: [
        // Horizontal - first timing gap
        { x: 780, y: 420, width: 80, height: 20, moveX: 100, moveY: 0, speed: 60 },
        // Vertical - rising/falling gear
        { x: 1050, y: 350, width: 80, height: 20, moveX: 0, moveY: 80, speed: 50 },
        // Horizontal - across shooter zone
        { x: 1800, y: 380, width: 90, height: 20, moveX: 120, moveY: 0, speed: 70 },
        // Diagonal movement - complex machinery
        { x: 2620, y: 380, width: 80, height: 20, moveX: 60, moveY: 50, speed: 45 },
        // Fast horizontal - final gauntlet
        { x: 3380, y: 400, width: 80, height: 20, moveX: 100, moveY: 0, speed: 90 }
    ],

    enemies: [
        // Walkers patrolling platforms
        { x: 320, y: 434, type: 'walker' },
        { x: 1150, y: 484, type: 'walker' },
        { x: 2520, y: 484, type: 'walker' },
        // Jumpers on key platforms
        { x: 1700, y: 424, type: 'jumper' },
        { x: 3080, y: 414, type: 'jumper' },
        // Shooters creating danger zones
        { x: 1350, y: 424, type: 'shooter' },
        { x: 2300, y: 364, type: 'shooter' },
        { x: 3640, y: 364, type: 'shooter' },
        // Shield enemy guarding final area
        { x: 3800, y: 434, type: 'shield' }
    ],

    obstacles: [
        // Spikes punishing mistimed jumps
        { x: 750, y: 555 },
        { x: 850, y: 555 },
        { x: 1450, y: 555 },
        { x: 2000, y: 555 },
        { x: 2400, y: 555 },
        { x: 2800, y: 555 },
        { x: 3200, y: 555 },
        { x: 3550, y: 555 }
    ],

    coins: [
        // Starting area
        { x: 120, y: 470 },
        { x: 320, y: 420 },
        { x: 500, y: 470 },
        // First timing section
        { x: 830, y: 390 },
        { x: 950, y: 370 },
        // Shooter zone
        { x: 1350, y: 410 },
        { x: 1520, y: 350 },
        { x: 1700, y: 410 },
        // Second timing section
        { x: 1900, y: 470 },
        { x: 2100, y: 410 },
        { x: 2300, y: 350 },
        // Complex machinery
        { x: 2720, y: 400 },
        { x: 2900, y: 340 },
        { x: 3080, y: 400 },
        // Final gauntlet
        { x: 3280, y: 470 },
        { x: 3460, y: 410 },
        { x: 3640, y: 350 },
        { x: 3800, y: 420 }
    ],

    checkpoints: [
        { x: 1150, y: 475 },
        { x: 2520, y: 475 }
    ],

    powerUps: [
        // Speed to help with timing
        { x: 1900, y: 470, type: 'speed' }
    ],

    breakableBlocks: [
        { x: 680, y: 410, width: 40, height: 40, contains: 'coin' },
        { x: 2100, y: 400, width: 40, height: 40, contains: 'coin' },
        { x: 3280, y: 460, width: 40, height: 40, contains: null }
    ],

    playerStart: { x: 100, y: 540 },
    flagPosition: { x: 3900, y: 530 }
};
