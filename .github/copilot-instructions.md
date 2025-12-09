# Mario-Like Platformer Game - AI Coding Instructions

## Project Architecture

This is a **Phaser 3-based browser platformer game** with a single-scene architecture running entirely in the browser. The game uses HTML5 physics simulation (Arcade physics) for movement, collision, and gravity.

### Core Structure
- **game.js**: Single game file containing all logic - configuration, scene functions (preload, create, update), and event handlers
- **index.html**: Entry point that loads Phaser from CDN and initializes the game container
- **No external assets**: Uses Phaser primitives (rectangles) instead of sprite images for game objects

### Data Flow
1. **Config object** → Phaser.Game initialization (lines 1-17)
2. **preload()** → (placeholder, minimal setup)
3. **create()** → All game objects instantiated: platforms, player, enemies, end flag, collisions registered
4. **update()** → Called every frame for continuous movement, input processing, enemy AI, win/lose conditions

## Key Architectural Patterns

### Game State Management
- **Global flags**: `gameOver`, `levelComplete` prevent further updates when true
- **Physics pause**: `this.physics.pause()` halts all movement when game ends
- **No scene restart**: Game requires page refresh to replay (intentional design limitation)

### Object System
All game entities use **Phaser physics sprites or physics-enabled rectangles**:
- Static platforms group: `this.physics.add.staticGroup()` (no collision with each other)
- Dynamic player: `this.physics.add.sprite()` with bounce and world bounds
- Enemy group: `this.physics.add.group()` with automated patrol via velocity bouncing

### Collision & Overlap Handling
- **Collider** (solid): `physics.add.collider()` - platforms vs player/enemies (line 106)
- **Overlap** (trigger): `physics.add.overlap()` - enemy damage and win condition (lines 107-108)
- Handlers receive `this` context as 4th param for access to scene methods

### Camera & Viewport
No custom camera code - uses default that follows world bounds (800x600 fixed)

## Development Workflows

### Running the Game
```bash
npm install          # Install dependencies (Phaser & http-server)
npm start            # Start http-server on port 8000
# Open browser to http://localhost:8000
```

### Common Modifications
- **Level design**: Edit platform positions/sizes in `create()` (lines 38-65)
- **Difficulty**: Adjust enemy velocities (lines 73-84) or gravity (line 7)
- **Player mechanics**: Modify jump velocity (-400) or move speed (±200) in `update()`
- **Visual tweaks**: Change rectangle colors (hex codes) or sizes via `setDisplaySize()`

### No Build System
This is a **no-build project** - changes to `game.js` are live-reloaded by the browser. No webpack, bundler, or compile step needed.

## Code Conventions & Patterns

### Naming
- **PascalCase**: Config objects (`config`), game instances (`game`)
- **camelCase**: Functions (`preload`, `hitEnemy`), variables (`gameOver`)
- **Phaser context**: Always use `this` inside scene functions to access scene methods

### Physics Configuration
Arcade physics is hardcoded (line 4-7):
```javascript
physics: {
    default: 'arcade',
    arcade: {
        gravity: { y: 800 },        // Constant downward force
        debug: false
    }
}
```
Adjust `gravity.y` for platformer feel (higher = falls faster)

### Event Callbacks
- **Collision handlers** receive `this` context (e.g., `hitEnemy.call(this)` at line 142)
- **Input handlers** use `this.input.keyboard.createCursorKeys()` for keyboard input
- No event emitters - direct function calls for win/lose

### Visual Representation
- Platforms: Brown (0x8B4513), ground green (0x00aa00)
- Player: Blue (0x0000ff)
- Enemies: Red (0xff0000)
- Goal flag: Yellow (0xffff00)
- Obstacles: Red (0xff0000)

## Integration Points

### Phaser API Usage
- `this.physics.add.*` - Create physics objects and groups
- `this.add.*` - Create display objects (rectangles, text)
- `this.input.keyboard` - Handle keyboard input
- `body` property - Access physics properties (velocity, touching, blocked)

### External Dependencies
- **Phaser 3.80.1** (CDN in HTML): Core game framework
- **http-server**: Dev server (npm start)
- No other libraries; game is self-contained

## Important Constraints

1. **Single scene**: Game doesn't use multiple scenes; all logic in one `create()`/`update()`
2. **Rectangle-only graphics**: No sprite assets; all visual objects are primitives
3. **No game restart**: Must refresh page to replay (no scene restart implemented)
4. **Fixed world size**: 800x600 canvas; no responsive sizing
5. **Synchronous physics**: No async/await patterns; frame-by-frame deterministic updates

## Testing & Debugging

No formal test suite exists. Verification is manual:
- **Player movement**: Arrow keys + space for jump
- **Enemy patrol**: Check if enemies bounce at world edges
- **Collision**: Verify player stops on platforms
- **Win condition**: Reach yellow flag
- **Lose condition**: Touch red enemy or fall below world (y > 600)

Debug tip: Set `debug: true` in physics config to visualize colliders.
