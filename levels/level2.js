const level2 = {
    name: "Level 2 - Coin Canyon",
    worldWidth: 3200,
    worldHeight: 600,

    theme: {
        skyColor: 0xE8A87C,
        groundColor: 0xCD853F,
        platformColor: 0x8B6914,
        bgColor1: 0xC19552,
        bgColor2: 0x8B7355
    },

    platforms: [
        // Section 1 (0-700): Intro platforming
        { x: 200, y: 500, width: 160, height: 20 },
        { x: 450, y: 460, width: 140, height: 20 },

        // Section 2 (700-1400): Branching paths
        // Upper path (narrow platforms, more coins)
        { x: 750, y: 380, width: 80, height: 20 },
        { x: 900, y: 340, width: 80, height: 20 },
        { x: 1050, y: 380, width: 80, height: 20 },
        { x: 1200, y: 420, width: 100, height: 20 },
        // Lower path (wide platforms, fewer coins)
        { x: 720, y: 510, width: 160, height: 20 },
        { x: 950, y: 510, width: 160, height: 20 },
        { x: 1180, y: 510, width: 140, height: 20 },

        // Merge point
        { x: 1350, y: 480, width: 180, height: 20 },

        // Section 3 (1400-2000): Jumper enemies on wide platforms
        { x: 1550, y: 480, width: 200, height: 20 },
        { x: 1850, y: 470, width: 200, height: 20 },

        // Section 4 (2000-2600): Power-up area + moving platform section
        { x: 2050, y: 490, width: 140, height: 20 },
        { x: 2500, y: 480, width: 140, height: 20 },

        // Section 5 (2600-3200): Long platform with walkers, then flag area
        { x: 2750, y: 490, width: 300, height: 20 },
        { x: 3100, y: 500, width: 120, height: 20 }
    ],

    movingPlatforms: [
        // Section 4: Two moving platforms in sequence
        { x: 2230, y: 470, width: 100, height: 20, moveX: 120, moveY: 0, speed: 55 },
        { x: 2400, y: 450, width: 100, height: 20, moveX: 0, moveY: -60, speed: 50 }
    ],

    enemies: [
        // Section 1: A walker on the intro platform
        { x: 470, y: 444, type: 'walker' },

        // Section 3: Two jumper enemies
        { x: 1600, y: 464, type: 'jumper' },
        { x: 1900, y: 454, type: 'jumper' },

        // Section 5: Three walkers on the long platform
        { x: 2780, y: 474, type: 'walker' },
        { x: 2860, y: 474, type: 'walker' },
        { x: 2940, y: 474, type: 'walker' }
    ],

    obstacles: [],

    coins: [
        // Section 1: Couple coins on intro platforms
        { x: 220, y: 470 },
        { x: 460, y: 430 },

        // Section 2 - Upper path (6 coins - the rewarding path)
        { x: 750, y: 350 },
        { x: 830, y: 350 },
        { x: 900, y: 310 },
        { x: 975, y: 310 },
        { x: 1050, y: 350 },
        { x: 1200, y: 390 },

        // Section 2 - Lower path (2 coins - the safe path)
        { x: 800, y: 480 },
        { x: 1020, y: 480 },

        // Section 3: Coins around jumper areas
        { x: 1550, y: 450 },
        { x: 1650, y: 450 },
        { x: 1850, y: 440 },
        { x: 1950, y: 440 },

        // Section 4: Coins on moving platforms
        { x: 2280, y: 440 },
        { x: 2450, y: 420 },

        // Section 5: Coins along the long platform
        { x: 2800, y: 460 },
        { x: 2850, y: 460 },
        { x: 2900, y: 460 },
        { x: 2950, y: 460 },
        { x: 3100, y: 470 }
    ],

    checkpoints: [
        // After the jumper enemies in Section 3
        { x: 2000, y: 555 }
    ],

    powerUps: [
        // Speed boost before the moving platform section
        { x: 2080, y: 460, type: 'speed' }
    ],

    breakableBlocks: [
        // Hidden coins in breakable blocks
        { x: 1370, y: 450, width: 40, height: 20, contains: 'coin' },
        { x: 2530, y: 450, width: 40, height: 20, contains: 'coin' }
    ],

    // Secret area: hidden coin stash underground near x:1200
    // A fake wall disguised as ground - dash through to find hidden coins
    fakeWalls: [
        { x: 1300, y: 560, width: 120, height: 40 }
    ],
    secretCoins: [
        { x: 1260, y: 530, revealTrigger: { x: 1300, y: 540, radius: 60 } },
        { x: 1290, y: 530, revealTrigger: { x: 1300, y: 540, radius: 60 } },
        { x: 1320, y: 530, revealTrigger: { x: 1300, y: 540, radius: 60 } },
        { x: 1350, y: 530, revealTrigger: { x: 1300, y: 540, radius: 60 } },
        { x: 1300, y: 500, revealTrigger: { x: 1300, y: 540, radius: 60 } }
    ],

    playerStart: { x: 60, y: 540 },
    flagPosition: { x: 3150, y: 475 }
};
