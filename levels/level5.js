const level5 = {
    name: "Level 5 - The Final Trial",
    worldWidth: 4500,
    worldHeight: 600,
    theme: {
        skyColor: 0x0d0221,
        groundColor: 0x1a0533,
        platformColor: 0x3d1f6d,
        bgColor1: 0x150440,
        bgColor2: 0x260759
    },

    platforms: [
        // === Section 1 (0-900): Rapid small platforms over spiky ground ===
        // Starting safe platform
        { x: 80, y: 500, width: 120, height: 20 },
        // Small platforms - tight jumps requiring coyote time
        { x: 240, y: 470, width: 90, height: 20 },
        { x: 380, y: 440, width: 80, height: 20 },
        { x: 510, y: 410, width: 90, height: 20 },
        { x: 640, y: 380, width: 80, height: 20 },
        { x: 760, y: 420, width: 100, height: 20 },
        { x: 880, y: 460, width: 90, height: 20 },

        // === Section 2 (900-1800): Wall jump gauntlet - vertical shafts ===
        // Shaft 1: left-right alternating platforms
        { x: 950, y: 500, width: 120, height: 20 },
        { x: 1050, y: 430, width: 90, height: 20 },
        { x: 950, y: 360, width: 90, height: 20 },
        { x: 1080, y: 290, width: 90, height: 20 },
        { x: 950, y: 220, width: 100, height: 20 },
        // Bridge between shafts
        { x: 1150, y: 220, width: 120, height: 20 },
        // Shaft 2: right-left alternating
        { x: 1350, y: 280, width: 90, height: 20 },
        { x: 1480, y: 220, width: 90, height: 20 },
        { x: 1350, y: 160, width: 90, height: 20 },
        // Checkpoint platform at top
        { x: 1550, y: 160, width: 140, height: 20 },
        // Descent to section 3
        { x: 1700, y: 230, width: 100, height: 20 },

        // === Section 3 (1800-2700): "Choose your path" - three heights ===
        // Top path (y=250): Tiny platforms, hard, lots of coins
        { x: 1850, y: 250, width: 70, height: 20 },
        { x: 1970, y: 240, width: 60, height: 20 },
        { x: 2080, y: 250, width: 60, height: 20 },
        { x: 2190, y: 230, width: 60, height: 20 },
        { x: 2310, y: 250, width: 60, height: 20 },
        { x: 2430, y: 240, width: 70, height: 20 },
        { x: 2550, y: 250, width: 70, height: 20 },

        // Middle path (y=380): Medium difficulty
        { x: 1850, y: 380, width: 100, height: 20 },
        { x: 2000, y: 370, width: 90, height: 20 },
        { x: 2150, y: 380, width: 90, height: 20 },
        { x: 2300, y: 370, width: 90, height: 20 },
        { x: 2450, y: 380, width: 100, height: 20 },

        // Bottom path (y=500): Easy wide platforms
        { x: 1850, y: 500, width: 160, height: 20 },
        { x: 2060, y: 500, width: 160, height: 20 },
        { x: 2270, y: 500, width: 160, height: 20 },
        { x: 2480, y: 500, width: 160, height: 20 },

        // Merge platform - all paths converge
        { x: 2680, y: 460, width: 200, height: 20 },

        // === Section 4 (2700-3600): Moving platform ride with shooters ===
        // Shooter perches (elevated)
        { x: 2900, y: 220, width: 80, height: 20 },
        { x: 3200, y: 220, width: 80, height: 20 },
        // Shooter perch below
        { x: 3050, y: 550, width: 80, height: 20 },
        // Landing platforms between moving sections
        { x: 3000, y: 400, width: 120, height: 20 },
        { x: 3300, y: 380, width: 120, height: 20 },
        // Speed power-up platform
        { x: 3150, y: 320, width: 80, height: 20 },

        // === Section 5 (3600-4500): Final climb - everything combined ===
        // Ground level start
        { x: 3600, y: 500, width: 150, height: 20 },
        // Wall jump section
        { x: 3700, y: 430, width: 80, height: 20 },
        { x: 3800, y: 360, width: 80, height: 20 },
        { x: 3700, y: 290, width: 80, height: 20 },
        // Shooter dodge zone
        { x: 3900, y: 300, width: 100, height: 20 },
        // Shooter perch
        { x: 3950, y: 180, width: 80, height: 20 },
        // Massive gap - needs doubleJump
        { x: 4100, y: 320, width: 90, height: 20 },
        // Shield enemy platforms
        { x: 4250, y: 400, width: 120, height: 20 },
        { x: 4350, y: 480, width: 150, height: 20 }
    ],

    movingPlatforms: [
        // Section 4: Two horizontal moving platforms in sequence
        { x: 2800, y: 400, width: 100, height: 20, moveX: 180, moveY: 0, speed: 55 },
        { x: 3100, y: 380, width: 100, height: 20, moveX: 180, moveY: 0, speed: 60 }
    ],

    enemies: [
        // Section 1: 2 jumpers on platforms
        { x: 400, y: 424, type: 'jumper' },
        { x: 650, y: 364, type: 'jumper' },

        // Section 2: 3 flyers circling the shafts
        { x: 1000, y: 340, type: 'flyer' },
        { x: 1100, y: 250, type: 'flyer' },
        { x: 1420, y: 200, type: 'flyer' },

        // Section 3: enemies on paths
        // Top path: 1 flyer
        { x: 2200, y: 200, type: 'flyer' },
        // Middle path: 2 walkers
        { x: 2050, y: 354, type: 'walker' },
        { x: 2350, y: 354, type: 'walker' },
        // Bottom path: 1 walker
        { x: 2150, y: 484, type: 'walker' },

        // Section 4: 2 shooters elevated + 1 below + 1 jumper
        { x: 2920, y: 204, type: 'shooter' },
        { x: 3220, y: 204, type: 'shooter' },
        { x: 3070, y: 534, type: 'shooter' },
        { x: 3050, y: 384, type: 'jumper' },

        // Section 5: 2 shield + 1 shooter + 1 flyer + 2 walkers + 1 jumper
        { x: 3950, y: 164, type: 'shooter' },
        { x: 3800, y: 300, type: 'flyer' },
        { x: 3650, y: 484, type: 'walker' },
        { x: 4280, y: 384, type: 'shield' },
        { x: 4400, y: 464, type: 'shield' },
        { x: 4350, y: 464, type: 'walker' },
        { x: 4100, y: 304, type: 'jumper' },
        { x: 4250, y: 364, type: 'shield' }
    ],

    obstacles: [
        // Section 1: Spikes on ground making falling dangerous
        { x: 300, y: 555 },
        { x: 450, y: 555 },
        { x: 580, y: 555 },
        { x: 720, y: 555 },
        // Section 3: Spikes below paths
        { x: 1950, y: 555 },
        { x: 2200, y: 555 },
        // Section 5: Spikes throughout
        { x: 3750, y: 555 },
        { x: 4000, y: 555 }
    ],

    coins: [
        // Section 1: 5 coins floating between platforms
        { x: 240, y: 440 },
        { x: 380, y: 410 },
        { x: 510, y: 380 },
        { x: 640, y: 350 },
        { x: 760, y: 390 },

        // Section 2: 3 coins in shafts
        { x: 1000, y: 330 },
        { x: 1080, y: 260 },
        { x: 1400, y: 250 },

        // Section 3 - Top path: 8 coins (high reward)
        { x: 1880, y: 220 },
        { x: 1990, y: 210 },
        { x: 2080, y: 220 },
        { x: 2190, y: 200 },
        { x: 2310, y: 220 },
        { x: 2430, y: 210 },
        { x: 2510, y: 220 },
        { x: 2580, y: 220 },

        // Section 3 - Middle path: 4 coins
        { x: 1900, y: 350 },
        { x: 2060, y: 340 },
        { x: 2200, y: 350 },
        { x: 2350, y: 340 },

        // Section 3 - Bottom path: 2 coins
        { x: 1950, y: 470 },
        { x: 2350, y: 470 },

        // Section 4: 3 coins
        { x: 2850, y: 370 },
        { x: 3050, y: 370 },
        { x: 3250, y: 350 },

        // Section 5: 5 coins
        { x: 3700, y: 400 },
        { x: 3800, y: 330 },
        { x: 3900, y: 270 },
        { x: 4100, y: 290 },
        { x: 4300, y: 370 }
    ],

    checkpoints: [
        // After section 2 shaft climb
        { x: 1580, y: 135 },
        // After section 3 merge point
        { x: 2720, y: 435 },
        // After section 4 before final climb
        { x: 3600, y: 475 }
    ],

    powerUps: [
        // Section 4: Speed to help dodge shooter fire
        { x: 3150, y: 290, type: 'speed' },
        // Section 5: doubleJump for the massive gap
        { x: 3900, y: 270, type: 'doubleJump' },
        // Section 5: invincibility hidden in breakable block (placed via breakableBlocks)
    ],

    breakableBlocks: [
        // Section 2: Hidden coin at top of shaft
        { x: 1150, y: 180, width: 40, height: 40, contains: 'coin' },
        // Section 3: Hidden on merge platform
        { x: 2680, y: 420, width: 40, height: 40, contains: 'coin' },
        // Section 5: Invincibility for final push
        { x: 3700, y: 250, width: 40, height: 40, contains: 'invincibility' },
        // Section 5: Extra coin block
        { x: 4250, y: 360, width: 40, height: 40, contains: 'coin' }
    ],

    playerStart: { x: 100, y: 470 },
    flagPosition: { x: 4420, y: 455 }
};
