const level8 = {
    name: "Level 8 - Emerald Jungle",
    worldWidth: 3600,
    worldHeight: 600,
    theme: {
        skyColor: 0x2D5F2D,
        groundColor: 0x1B4D1B,
        platformColor: 0x4A7A3D,
        bgColor1: 0x1A3A1A,
        bgColor2: 0x2B4F2B
    },

    platforms: [
        // Starting jungle floor
        { x: 80, y: 500, width: 180, height: 20 },
        { x: 300, y: 440, width: 120, height: 20 },
        { x: 460, y: 500, width: 100, height: 20 },

        // Lower path (easier, fewer secrets)
        { x: 620, y: 500, width: 140, height: 20 },
        { x: 820, y: 460, width: 100, height: 20 },
        { x: 980, y: 500, width: 120, height: 20 },

        // Upper path (more secrets via breakable blocks)
        { x: 620, y: 380, width: 100, height: 20 },
        { x: 780, y: 340, width: 90, height: 20 },
        { x: 940, y: 380, width: 100, height: 20 },

        // Convergence area
        { x: 1120, y: 500, width: 160, height: 20 },
        { x: 1340, y: 440, width: 100, height: 20 },
        { x: 1500, y: 380, width: 100, height: 20 },

        // Dense jungle middle - breakable block area
        { x: 1680, y: 500, width: 150, height: 20 },
        { x: 1880, y: 440, width: 120, height: 20 },
        { x: 2050, y: 380, width: 100, height: 20 },
        { x: 2200, y: 440, width: 100, height: 20 },
        { x: 2350, y: 500, width: 130, height: 20 },

        // Secret upper area
        { x: 1880, y: 300, width: 90, height: 20 },
        { x: 2050, y: 260, width: 80, height: 20 },

        // Exploration zone - multiple tiers
        { x: 2540, y: 460, width: 100, height: 20 },
        { x: 2700, y: 400, width: 100, height: 20 },
        { x: 2860, y: 340, width: 90, height: 20 },
        { x: 2700, y: 500, width: 120, height: 20 },

        // Final stretch
        { x: 3020, y: 480, width: 130, height: 20 },
        { x: 3200, y: 420, width: 100, height: 20 },
        { x: 3380, y: 480, width: 120, height: 20 }
    ],

    movingPlatforms: [],

    enemies: [
        // Walkers spread across paths
        { x: 620, y: 484, type: 'walker' },
        { x: 980, y: 484, type: 'walker' },
        { x: 1680, y: 484, type: 'walker' },
        { x: 2350, y: 484, type: 'walker' },
        // Jumpers in tricky spots
        { x: 1340, y: 424, type: 'jumper' },
        { x: 2700, y: 384, type: 'jumper' },
        // Flyers in canopy
        { x: 800, y: 280, type: 'flyer' },
        { x: 2000, y: 220, type: 'flyer' },
        // Shooter guarding secret area
        { x: 2050, y: 244, type: 'shooter' },
        // Shield enemy near end
        { x: 3200, y: 404, type: 'shield' }
    ],

    obstacles: [
        // Jungle floor spikes
        { x: 550, y: 555 },
        { x: 1050, y: 555 },
        { x: 1600, y: 555 },
        { x: 2480, y: 555 },
        { x: 2950, y: 555 },
        { x: 3150, y: 555 }
    ],

    coins: [
        // Starting area
        { x: 120, y: 470 },
        { x: 300, y: 410 },
        { x: 460, y: 470 },
        // Lower path coins
        { x: 660, y: 470 },
        { x: 820, y: 430 },
        // Upper path coins (reward exploration)
        { x: 620, y: 350 },
        { x: 780, y: 310 },
        { x: 940, y: 350 },
        // Convergence
        { x: 1160, y: 470 },
        { x: 1340, y: 410 },
        { x: 1500, y: 350 },
        // Dense jungle
        { x: 1720, y: 470 },
        { x: 1880, y: 410 },
        { x: 2050, y: 350 },
        // Secret upper area coins (hidden above breakables)
        { x: 1880, y: 270 },
        { x: 2050, y: 230 },
        { x: 2020, y: 230 },
        { x: 2080, y: 230 },
        // Exploration zone
        { x: 2200, y: 410 },
        { x: 2540, y: 430 },
        { x: 2700, y: 370 },
        { x: 2860, y: 310 },
        // Hidden coin caches (above breakable blocks)
        { x: 1720, y: 350 },
        { x: 2400, y: 350 },
        // Final stretch
        { x: 3020, y: 450 },
        { x: 3200, y: 390 },
        { x: 3380, y: 450 },
        // Ground level hidden coins
        { x: 1050, y: 470 },
        { x: 2480, y: 470 },
        { x: 2750, y: 470 },
        { x: 3100, y: 470 }
    ],

    checkpoints: [
        { x: 1120, y: 475 },
        { x: 2350, y: 475 }
    ],

    powerUps: [
        // Invincibility hidden in breakable block (see breakableBlocks)
        // Double jump hidden in breakable block (see breakableBlocks)
    ],

    breakableBlocks: [
        // Upper path - contains coin
        { x: 780, y: 300, width: 40, height: 40, contains: 'coin' },
        // Blocking access to upper path
        { x: 620, y: 340, width: 40, height: 40, contains: null },
        // Dense jungle - contains invincibility
        { x: 1880, y: 260, width: 40, height: 40, contains: 'invincibility' },
        // Hidden coin stash
        { x: 1720, y: 380, width: 40, height: 40, contains: 'coin' },
        // Contains double jump
        { x: 2400, y: 380, width: 40, height: 40, contains: 'doubleJump' },
        // Empty decoys
        { x: 2200, y: 400, width: 40, height: 40, contains: null },
        { x: 2700, y: 360, width: 40, height: 40, contains: 'coin' },
        // Near end - coin reward
        { x: 3020, y: 440, width: 40, height: 40, contains: 'coin' }
    ],

    playerStart: { x: 100, y: 540 },
    flagPosition: { x: 3500, y: 530 }
};
