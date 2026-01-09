const level1 = {
    name: "Generated Level",
    worldWidth: 3200,
    worldHeight: 600,

    platforms: [
        { x: 158, y: 480, width: 115, height: 20 },
        { x: 359, y: 502, width: 154, height: 20 },
        { x: 592, y: 520, width: 173, height: 20 },
        { x: 860, y: 497, width: 177, height: 20 },
        { x: 1672, y: 458, width: 135, height: 20 },
        { x: 1985, y: 446, width: 147, height: 20 },
        { x: 2322, y: 434, width: 151, height: 20 },
        { x: 2674, y: 420, width: 167, height: 20 }
    ],

    movingPlatforms: [
        { x: 1123, y: 504, width: 125, height: 20, moveX: 78, moveY: 0, speed: 64 },
        { x: 1407, y: 478, width: 159, height: 20, moveX: 0, moveY: 49, speed: 55 },
        { x: 2959, y: 407, width: 143, height: 20, moveX: 107, moveY: 0, speed: 54 }
    ],

    obstacles: [
        { x: 1935, y: 555 },
        { x: 2283, y: 555 }
    ],

    enemies: [
        { x: 359, y: 476 },
        { x: 860, y: 471 },
        { x: 1672, y: 432 }
    ],

    coins: [
        { x: 595, y: 441 },
        { x: 823, y: 424 },
        { x: 907, y: 423 },
        { x: 1374, y: 436 },
        { x: 1460, y: 437 },
        { x: 1638, y: 417 },
        { x: 1961, y: 397 },
        { x: 2926, y: 347 }
    ],

    checkpoints: [
        { x: 1123, y: 469 },
        { x: 1672, y: 423 },
        { x: 2322, y: 399 }
    ],

    playerStart: { x: 158, y: 454 },
    flagPosition: { x: 2959, y: 367 }
};
