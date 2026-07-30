const level10 = {
    name: "Level 10 - The Gauntlet Supreme",
    worldWidth: 6000,
    worldHeight: 600,
    theme: {
        biome: 'castle',
        propStyle: 'spires',
        weather: 'embers',
        skyColor: 0x1a0033,
        groundColor: 0x2a0944,
        platformColor: 0x4a1a7a,
        bgColor1: 0x2d0057,
        bgColor2: 0x3d0070
    },

    platforms: [
        // === SECTION 1: Platform gauntlet over spikes ===
        { x: 80, y: 500, width: 150, height: 20 },
        { x: 290, y: 480, width: 100, height: 20 },
        { x: 450, y: 460, width: 90, height: 20 },
        { x: 600, y: 480, width: 100, height: 20 },
        { x: 760, y: 460, width: 90, height: 20 },
        { x: 910, y: 500, width: 120, height: 20 },

        // === SECTION 2: Vertical shaft with flyers ===
        { x: 1080, y: 500, width: 130, height: 20 },
        { x: 1100, y: 420, width: 90, height: 20 },
        { x: 1250, y: 360, width: 90, height: 20 },
        { x: 1100, y: 300, width: 90, height: 20 },
        { x: 1250, y: 240, width: 90, height: 20 },
        { x: 1400, y: 300, width: 100, height: 20 },
        { x: 1400, y: 420, width: 100, height: 20 },
        { x: 1560, y: 480, width: 130, height: 20 },

        // === SECTION 3: Moving platform ride with shooters ===
        { x: 1750, y: 500, width: 140, height: 20 },
        { x: 2000, y: 440, width: 100, height: 20 },
        { x: 2250, y: 380, width: 100, height: 20 },
        { x: 2450, y: 440, width: 120, height: 20 },
        { x: 2650, y: 500, width: 130, height: 20 },

        // === SECTION 4: Breakable block maze with shield enemies ===
        { x: 2850, y: 500, width: 150, height: 20 },
        { x: 3050, y: 450, width: 120, height: 20 },
        { x: 3230, y: 400, width: 100, height: 20 },
        { x: 3390, y: 450, width: 110, height: 20 },
        { x: 3560, y: 500, width: 130, height: 20 },
        // Upper path through breakables
        { x: 3050, y: 320, width: 90, height: 20 },
        { x: 3230, y: 280, width: 90, height: 20 },
        { x: 3390, y: 320, width: 90, height: 20 },

        // === SECTION 5: Final sprint - everything at once ===
        { x: 3760, y: 500, width: 150, height: 20 },
        { x: 3970, y: 460, width: 120, height: 20 },
        { x: 4150, y: 420, width: 100, height: 20 },
        { x: 4310, y: 460, width: 110, height: 20 },
        { x: 4480, y: 500, width: 130, height: 20 },
        { x: 4670, y: 450, width: 100, height: 20 },
        { x: 4830, y: 400, width: 100, height: 20 },
        { x: 5000, y: 460, width: 120, height: 20 },
        { x: 5200, y: 500, width: 150, height: 20 },

        // === BOSS ARENA ===
        // Ground-level wide platform
        { x: 5600, y: 560, width: 500, height: 20 },
        // Mid-tier platforms
        { x: 5450, y: 440, width: 120, height: 20 },
        { x: 5750, y: 440, width: 120, height: 20 },
        // High-tier platforms
        { x: 5520, y: 320, width: 100, height: 20 },
        { x: 5700, y: 320, width: 100, height: 20 }
    ],

    movingPlatforms: [
        // Section 3 - moving platform rides
        { x: 1900, y: 460, width: 80, height: 20, moveX: 100, moveY: 0, speed: 55 },
        { x: 2130, y: 400, width: 80, height: 20, moveX: 80, moveY: 0, speed: 65 },
        { x: 2350, y: 440, width: 80, height: 20, moveX: 0, moveY: 60, speed: 50 },
        // Section 5 - one final moving platform challenge
        { x: 4580, y: 430, width: 80, height: 20, moveX: 60, moveY: 40, speed: 60 },
        // Boss arena - moving platforms for reaching phase 3 boss
        { x: 5550, y: 380, width: 70, height: 20, moveX: 80, moveY: 0, speed: 50 },
        { x: 5680, y: 350, width: 70, height: 20, moveX: 0, moveY: 60, speed: 45 }
    ],

    enemies: [
        // Gauntlet: the full roster
        { x: 1800, y: 300, type: 'diver' },
        { x: 3400, y: 464, type: 'charger' },
        { x: 4700, y: 320, type: 'diver' },
        // Section 1: Walkers on spike platforms
        { x: 290, y: 464, type: 'walker' },
        { x: 600, y: 464, type: 'walker' },
        { x: 910, y: 484, type: 'walker' },
        // Section 2: Flyers in vertical shaft
        { x: 1180, y: 280, type: 'flyer' },
        { x: 1180, y: 370, type: 'flyer' },
        { x: 1320, y: 200, type: 'flyer' },
        // Section 2: Jumper at base
        { x: 1080, y: 484, type: 'jumper' },
        // Section 3: Shooters during platform ride
        { x: 2000, y: 424, type: 'shooter' },
        { x: 2250, y: 364, type: 'shooter' },
        { x: 2450, y: 424, type: 'shooter' },
        // Section 4: Shield enemies in maze
        { x: 3050, y: 434, type: 'shield' },
        { x: 3390, y: 434, type: 'shield' },
        { x: 3230, y: 264, type: 'shield' },
        // Section 5: Every enemy type
        { x: 3970, y: 444, type: 'walker' },
        { x: 4150, y: 404, type: 'jumper' },
        { x: 4310, y: 444, type: 'jumper' },
        { x: 4500, y: 380, type: 'flyer' },
        { x: 4750, y: 340, type: 'flyer' },
        { x: 4830, y: 384, type: 'shooter' },
        { x: 5000, y: 444, type: 'walker' },
        { x: 5200, y: 484, type: 'jumper' }
    ],

    obstacles: [
        // Section 1: Spike gauntlet on ground
        { x: 230, y: 555 },
        { x: 260, y: 555 },
        { x: 380, y: 555 },
        { x: 410, y: 555 },
        { x: 530, y: 555 },
        { x: 560, y: 555 },
        { x: 700, y: 555 },
        { x: 730, y: 555 },
        { x: 850, y: 555 },
        // Section 2: Base of shaft
        { x: 1200, y: 555 },
        // Section 3: Between platforms
        { x: 2550, y: 555 },
        // Section 4: In maze
        { x: 3150, y: 555 },
        { x: 3470, y: 555 },
        // Section 5: Final challenges
        { x: 4400, y: 555 }
    ],

    coins: [
        // Section 1
        { x: 120, y: 470 },
        { x: 290, y: 450 },
        { x: 450, y: 430 },
        { x: 600, y: 450 },
        { x: 760, y: 430 },
        { x: 910, y: 470 },
        // Section 2
        { x: 1100, y: 390 },
        { x: 1250, y: 330 },
        { x: 1100, y: 270 },
        { x: 1250, y: 210 },
        { x: 1400, y: 270 },
        // Section 3
        { x: 1800, y: 470 },
        { x: 1950, y: 430 },
        { x: 2060, y: 410 },
        { x: 2200, y: 370 },
        { x: 2350, y: 400 },
        { x: 2500, y: 410 },
        { x: 2700, y: 470 },
        // Section 4
        { x: 2900, y: 470 },
        { x: 3050, y: 420 },
        { x: 3050, y: 290 },
        { x: 3230, y: 250 },
        { x: 3390, y: 290 },
        { x: 3230, y: 370 },
        { x: 3560, y: 470 },
        // Section 5
        { x: 3810, y: 470 },
        { x: 3970, y: 430 },
        { x: 4150, y: 390 },
        { x: 4310, y: 430 },
        { x: 4480, y: 470 },
        { x: 4670, y: 420 },
        { x: 4830, y: 370 },
        { x: 5000, y: 430 },
        { x: 5100, y: 470 },
        { x: 5250, y: 470 }
    ],

    checkpoints: [
        { x: 1560, y: 455 },
        { x: 2650, y: 475 },
        { x: 3760, y: 475 }
    ],

    powerUps: [
        // Speed at start of spike gauntlet
        { x: 80, y: 470, type: 'speed' },
        // Double jump for vertical shaft
        { x: 1080, y: 470, type: 'doubleJump' },
        // High jump for section 4 upper path
        { x: 2850, y: 470, type: 'highJump' },
        // Invincibility for the brave in final sprint
        { x: 3760, y: 470, type: 'invincibility' }
    ],

    breakableBlocks: [
        // Section 2: Blocking shortcut
        { x: 1400, y: 380, width: 40, height: 40, contains: 'coin' },
        // Section 4: Breakable block maze
        { x: 3050, y: 280, width: 40, height: 40, contains: 'coin' },
        { x: 3150, y: 410, width: 40, height: 40, contains: null },
        { x: 3230, y: 360, width: 40, height: 40, contains: 'coin' },
        { x: 3310, y: 410, width: 40, height: 40, contains: null },
        // Section 5: Hidden reward
        { x: 4480, y: 460, width: 40, height: 40, contains: 'coin' }
    ],

    playerStart: { x: 100, y: 540 },
    flagPosition: { x: 5850, y: 530 },
    bossArena: { x: 5350, width: 500 }
};
