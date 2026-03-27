// ========================
// JumpQuest Audio System
// Synthesized sounds via Web Audio API - no external assets needed
// ========================

let audioCtx = null;
let audioMuted = false;  // mutes background music only
const masterVolume = 0.3;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function createGain(ctx, volume) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime);
    gain.connect(ctx.destination);
    return gain;
}

function playSound(name) {
    // Sound effects always play; only background music is affected by audioMuted
    try {
        const sounds = {
            jump: playJumpSound,
            coin: playCoinSound,
            stomp: playStompSound,
            death: playDeathSound,
            checkpoint: playCheckpointSound,
            levelComplete: playLevelCompleteSound,
            powerup: playPowerupSound,
            dash: playDashSound,
            wallSlide: playWallSlideSound,
            gameOver: playGameOverSound,
            bossRoar: playBossRoarSound,
            bossHit: playBossHitSound,
            bossDefeat: playBossDefeatSound
        };
        if (sounds[name]) sounds[name]();
    } catch (e) {
        // Silently fail if audio context not ready
    }
}

function toggleMute() {
    audioMuted = !audioMuted;
    if (audioMuted) {
        if (bgMusic) bgMusic.pause();
    } else {
        if (bgMusic) bgMusic.play().catch(() => {});
        else if (typeof currentLevelIndex !== 'undefined') startBackgroundMusic(currentLevelIndex);
    }
    return audioMuted;
}

// --- Jump: Quick rising chirp ---
function playJumpSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.25);

    osc.type = 'square';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.linearRampToValueAtTime(500, t + 0.08);

    gain.gain.setValueAtTime(0.25 * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.1);
}

// --- Coin: Two bright ascending notes (pitch scales with combo) ---
function playCoinSound(combo) {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    combo = combo || 0;
    // Pitch scales up with combo: +5% per combo hit, capped at +60%
    const pitchMult = 1 + Math.min(combo * 0.05, 0.6);

    [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.2);

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq * pitchMult, t + i * 0.06);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.2 * masterVolume, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.08);

        osc.connect(gain);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.08);
    });
}

// --- Stomp: Percussive thump ---
function playStompSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Low thump
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.35);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(0.35 * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = createGain(ctx, 0.15);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    noise.connect(noiseGain);
    noise.start(t);
    noise.stop(t + 0.06);
}

// --- Death: Sad descending tone ---
function playDeathSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.3);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.4);

    gain.gain.setValueAtTime(0.3 * masterVolume, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.5);
}

// --- Checkpoint: Three ascending major notes ---
function playCheckpointSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    [440, 554, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.2);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.12);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.2 * masterVolume, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.15);

        osc.connect(gain);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.15);
    });
}

// --- Level Complete: Triumphant fanfare ---
function playLevelCompleteSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const notes = [523, 659, 784, 1047, 784, 1047];
    const durations = [0.12, 0.12, 0.12, 0.25, 0.12, 0.4];
    let offset = 0;

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.25);

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + offset);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.25 * masterVolume, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + durations[i]);

        osc.connect(gain);
        osc.start(t + offset);
        osc.stop(t + offset + durations[i] + 0.01);
        offset += durations[i];
    });
}

// --- Power-up: Bright ascending arpeggio ---
function playPowerupSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.18);

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.05);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.18 * masterVolume, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);

        osc.connect(gain);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.1);
    });
}

// --- Dash: Whoosh noise ---
function playDashSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.linearRampToValueAtTime(500, t + 0.12);
    filter.Q.setValueAtTime(2, t);

    const gain = createGain(ctx, 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + 0.12);
}

// --- Wall Slide: Soft scrape ---
function playWallSlideSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, t);

    const gain = createGain(ctx, 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + 0.08);
}

// --- Game Over: Sad chromatic descent ---
function playGameOverSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    const notes = [392, 370, 349, 330, 262];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.25);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.2);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.25 * masterVolume, t + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.001, t + i * 0.2 + 0.25);

        osc.connect(gain);
        osc.start(t + i * 0.2);
        osc.stop(t + i * 0.2 + 0.25);
    });
}

// --- Achievement: Triumphant ascending arpeggio (distinct from level complete) ---
function playAchievementSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Golden arpeggio: C5 E5 G5 C6 with shimmer
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.15);

        osc.type = i < 4 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.15 * masterVolume, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);

        osc.connect(gain);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.2);
    });
}

// --- Boss Roar: Low menacing rumble ---
function playBossRoarSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Deep rumble oscillator
    const osc1 = ctx.createOscillator();
    const gain1 = createGain(ctx, 0.35);
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, t);
    osc1.frequency.linearRampToValueAtTime(35, t + 0.8);
    gain1.gain.setValueAtTime(0.35 * masterVolume, t);
    gain1.gain.linearRampToValueAtTime(0.001, t + 0.8);
    osc1.connect(gain1);
    osc1.start(t);
    osc1.stop(t + 0.8);

    // Sub bass layer
    const osc2 = ctx.createOscillator();
    const gain2 = createGain(ctx, 0.25);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(40, t);
    osc2.frequency.linearRampToValueAtTime(25, t + 1.0);
    gain2.gain.setValueAtTime(0.25 * masterVolume, t);
    gain2.gain.linearRampToValueAtTime(0.001, t + 1.0);
    osc2.connect(gain2);
    osc2.start(t);
    osc2.stop(t + 1.0);

    // Noise burst for texture
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.linearRampToValueAtTime(80, t + 0.5);
    const noiseGain = createGain(ctx, 0.15);
    noiseGain.gain.linearRampToValueAtTime(0.001, t + 0.5);
    noise.connect(filter);
    filter.connect(noiseGain);
    noise.start(t);
    noise.stop(t + 0.5);
}

// --- Boss Hit: Thuddy impact with distortion ---
function playBossHitSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Heavy thud
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.4);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
    gain.gain.setValueAtTime(0.4 * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.2);

    // Crunch noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = createGain(ctx, 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(noiseGain);
    noise.start(t);
    noise.stop(t + 0.1);

    // Metallic ring
    const osc2 = ctx.createOscillator();
    const gain2 = createGain(ctx, 0.15);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(600, t);
    osc2.frequency.exponentialRampToValueAtTime(100, t + 0.15);
    gain2.gain.setValueAtTime(0.15 * masterVolume, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc2.connect(gain2);
    osc2.start(t);
    osc2.stop(t + 0.15);
}

// --- Boss Defeat: Extended triumphant fanfare ---
function playBossDefeatSound() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Dramatic ascending notes
    const notes = [262, 330, 392, 523, 659, 784, 1047, 784, 1047, 1319, 1047, 1319];
    const durations = [0.1, 0.1, 0.1, 0.15, 0.1, 0.1, 0.2, 0.1, 0.15, 0.2, 0.15, 0.4];
    let offset = 0;

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = createGain(ctx, 0.2);
        osc.type = i < 6 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.2 * masterVolume, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + durations[i]);
        osc.connect(gain);
        osc.start(t + offset);
        osc.stop(t + offset + durations[i] + 0.01);
        offset += durations[i];
    });

    // Victory bass note
    const bassOsc = ctx.createOscillator();
    const bassGain = createGain(ctx, 0.15);
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(131, t + offset - 0.4);
    bassGain.gain.setValueAtTime(0.15 * masterVolume, t + offset - 0.4);
    bassGain.gain.linearRampToValueAtTime(0.001, t + offset + 0.3);
    bassOsc.connect(bassGain);
    bassOsc.start(t + offset - 0.4);
    bassOsc.stop(t + offset + 0.3);
}

// ========================
// Background Music System
// ========================

let bgMusic = null;
let bgMusicPlaying = false;

function startBackgroundMusic(levelIndex) {
    if (audioMuted || bgMusicPlaying) return;

    if (!bgMusic) {
        bgMusic = new Audio('Top_Floor_Dash.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.2; // Low volume so it doesn't overpower sound effects
    }

    bgMusic.play().catch(() => {
        // Autoplay blocked — will retry on next user interaction
    });
    bgMusicPlaying = true;
}

function stopBackgroundMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
    bgMusicPlaying = false;
}
