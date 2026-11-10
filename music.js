// ========================
// Music — a tune per world that builds as you play well
// ========================
// The music is synthesized, like the sound effects: no audio files. Each
// world has its own key, tempo, chords and melody. A tune is made of layers
// that fade in with the flow meter:
//
//   always      bass, kick, hi-hat, a quiet arpeggio
//   flow > 25%  the lead melody and the snare
//   flow > 60%  sixteenth hi-hats and a harmony line over the lead
//
// Before the flow meter has been taught, the tune sits at a steady middle
// level. A boss fight pushes everything to full and speeds the tempo up.
//
// The last world keeps the original recorded track ("Top Floor Dash").
//
// This file replaces startBackgroundMusic / stopBackgroundMusic from
// audio.js; those versions stay as the fallback for the recorded track.

const MUSIC_SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11]
};

// root: MIDI note of the key. prog: one chord per bar, as scale degrees.
const MUSIC_SONGS = {
    meadow: { bpm: 132, root: 48, scale: 'major', prog: [0, 4, 5, 3], lead: 'square', arp: 'triangle', seed: 11 },
    canyon: { bpm: 124, root: 50, scale: 'dorian', prog: [0, 6, 3, 0], lead: 'sawtooth', arp: 'square', seed: 23 },
    cave: { bpm: 110, root: 45, scale: 'minor', prog: [0, 5, 2, 6], lead: 'triangle', arp: 'sine', seed: 37, echo: true },
    fortress: { bpm: 140, root: 52, scale: 'phrygian', prog: [0, 1, 0, 6], lead: 'sawtooth', arp: 'square', seed: 41 },
    heights: { bpm: 138, root: 53, scale: 'lydian', prog: [0, 1, 5, 4], lead: 'square', arp: 'triangle', seed: 53 },
    bonus: { bpm: 168, root: 55, scale: 'major', prog: [0, 3, 4, 0], lead: 'square', arp: 'square', seed: 67 }
};
const MUSIC_WORLD_SONG = ['meadow', 'canyon', 'cave', 'fortress', 'heights', null];   // null: recorded track

const MUSIC_LOOP_BARS = 8;
const MUSIC_LOOKAHEAD = 0.25;   // seconds of notes kept scheduled ahead

let music = null;               // the playing tune's state
let musicNoise = null;          // shared noise buffer for drums
let musicStopTimer = null;

function musicRandom(seed) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function musicFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

// Scale step -> MIDI note (steps run on past the octave)
function musicNote(song, step) {
    const scale = MUSIC_SCALES[song.scale];
    const oct = Math.floor(step / 7);
    return song.root + oct * 12 + scale[((step % 7) + 7) % 7];
}

// Writes the melody once per song: for each bar a rhythm and a line that
// lands on a chord note on the first beat and moves by step in between.
function musicCompose(song) {
    if (song.melody) return;
    const rnd = musicRandom(song.seed);
    // Rhythms as [sixteenth it starts on, length in sixteenths]
    const rhythms = [
        [[0, 4], [4, 2], [6, 2], [8, 4], [12, 4]],
        [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]],
        [[0, 6], [6, 2], [8, 6], [14, 2]],
        [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]],
        [[0, 8], [8, 4], [12, 4]]
    ];
    song.melody = [];
    let pos = 10;   // scale step, an octave and a bit above the root
    for (let bar = 0; bar < MUSIC_LOOP_BARS; bar++) {
        const chord = song.prog[bar % song.prog.length];
        const tones = [chord, chord + 2, chord + 4, chord + 7, chord + 9, chord + 11, chord + 14];
        // The second half repeats the first four bars' rhythm, so it sounds like a tune
        const rhythm = bar >= 4 ? song.melody[bar - 4].rhythm : rhythms[Math.floor(rnd() * rhythms.length)];
        const notes = rhythm.map(([start, len], i) => {
            if (i === 0 || start === 8) {
                // Nearest chord note to where the line is
                const near = tones.filter(t => t >= 7 && t <= 15);
                pos = near.reduce((best, t) => (Math.abs(t - pos) < Math.abs(best - pos) ? t : best), near[0]);
            } else {
                // Step up or down, leaning back toward the middle of the range
                // so the line rises and falls instead of sitting on one note
                const up = pos < 9 ? 0.8 : (pos > 12 ? 0.2 : 0.5);
                const size = rnd() < 0.7 ? 1 : 2;
                pos += rnd() < up ? size : -size;
            }
            if (pos < 7) pos = 14 - pos;
            if (pos > 15) pos = 30 - pos;
            return { start: start, len: len, step: pos };
        });
        // End the loop on the key note
        if (bar === MUSIC_LOOP_BARS - 1) notes[notes.length - 1].step = 7;
        song.melody.push({ rhythm: rhythm, notes: notes });
    }
}

function musicNoiseBuffer(ctx) {
    if (musicNoise && musicNoise.sampleRate === ctx.sampleRate) return musicNoise;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const data = buf.getChannelData(0);
    const rnd = musicRandom(99);
    for (let i = 0; i < data.length; i++) data[i] = rnd() * 2 - 1;
    musicNoise = buf;
    return buf;
}

// --- Instruments. Each takes the context, where to send the sound, a start
// --- time, and a level; they clean up after themselves.

function musicTone(ctx, out, type, freq, t, dur, level, attack) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + (attack || 0.008));
    g.gain.setValueAtTime(level, t + Math.max(attack || 0.008, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
}

function musicKick(ctx, out, t, level) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.2);
}

function musicNoiseHit(ctx, out, t, dur, level, filterType, filterFreq) {
    const src = ctx.createBufferSource();
    src.buffer = musicNoiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t); src.stop(t + dur + 0.02);
}

// Schedules one sixteenth-note step of a song. `layers` are the bus gains
// {base, lead, top}; writing to buses lets the mix change after notes have
// been scheduled. Kept free of globals so it can be rendered offline in tests.
function musicScheduleStep(ctx, layers, song, stepIndex, t, stepDur) {
    musicCompose(song);
    const bar = Math.floor(stepIndex / 16) % MUSIC_LOOP_BARS;
    const s = stepIndex % 16;
    const chord = song.prog[bar % song.prog.length];

    // Bass: eighth notes, root with a fifth and an octave thrown in
    const bassLine = { 0: 0, 4: 0, 6: 4, 8: 0, 12: 7, 14: 4 };
    if (bassLine[s] !== undefined) {
        musicTone(ctx, layers.base, 'triangle', musicFreq(musicNote(song, chord + bassLine[s]) - 12), t, stepDur * 1.8, 0.3);
    }
    // Arpeggio: chord notes up and back, quiet
    const arpStep = [0, 2, 4, 2][s % 4];
    musicTone(ctx, layers.base, song.arp, musicFreq(musicNote(song, chord + arpStep + 7)), t, stepDur * 0.9, 0.045);

    // Drums
    if (s === 0 || s === 8 || (s === 10 && bar % 4 === 3)) musicKick(ctx, layers.base, t, 0.55);
    if (s % 2 === 0) musicNoiseHit(ctx, layers.base, t, 0.04, 0.05, 'highpass', 7000);
    if (s === 4 || s === 12) musicNoiseHit(ctx, layers.lead, t, 0.14, 0.2, 'bandpass', 1800);
    if (s % 2 === 1) musicNoiseHit(ctx, layers.top, t, 0.03, 0.045, 'highpass', 8000);

    // Lead melody, and a harmony a third above on the top layer
    song.melody[bar].notes.forEach(n => {
        if (n.start !== s) return;
        const dur = n.len * stepDur * 0.92;
        musicTone(ctx, layers.lead, song.lead, musicFreq(musicNote(song, n.step)), t, dur, song.lead === 'sawtooth' ? 0.085 : 0.1, 0.012);
        musicTone(ctx, layers.top, 'triangle', musicFreq(musicNote(song, n.step + 2)), t, dur, 0.07, 0.012);
    });
}

// How hard the music should be playing right now, 0..1
function musicIntensity() {
    if (typeof bossActive !== 'undefined' && bossActive) return 1;
    if (typeof showingMenu !== 'undefined' && (showingMenu || showingLevelSelect)) return 0.4;
    if (typeof isMoveUnlocked === 'function' && !isMoveUnlocked('flow')) return 0.5;
    if (typeof flowMeter === 'undefined') return 0.5;
    return Math.max(0, Math.min(1, flowMeter / 100));
}

function musicSongFor(levelIndex) {
    if (typeof bonusRound !== 'undefined' && bonusRound) return 'bonus';
    if (typeof endlessMode !== 'undefined' && endlessMode) return 'heights';
    const world = typeof levelWorld === 'function' ? levelWorld(levelIndex) : 0;
    return MUSIC_WORLD_SONG[Math.max(0, Math.min(5, world))];
}

function musicTick() {
    const m = music;
    if (!m) return;
    const ctx = m.ctx;
    const now = ctx.currentTime;

    // Mix: follow the volume setting, mute, and the flow meter
    const vol = (typeof audioMuted !== 'undefined' && audioMuted) ? 0 : musicVolume * 1.5;
    m.master.gain.setTargetAtTime(vol, now, 0.05);
    const target = musicIntensity();
    m.intensity += (target - m.intensity) * 0.12;
    const fade = (x, from, width) => Math.max(0, Math.min(1, (x - from) / width));
    m.layers.lead.gain.setTargetAtTime(fade(m.intensity, 0.25, 0.2), now, 0.15);
    m.layers.top.gain.setTargetAtTime(fade(m.intensity, 0.6, 0.2), now, 0.15);

    const boss = typeof bossActive !== 'undefined' && bossActive;
    const stepDur = 60 / (m.song.bpm * (boss ? 1.12 : 1)) / 4;
    if (m.nextTime < now) m.nextTime = now + 0.05;      // tab was asleep: pick up from here
    while (m.nextTime < now + MUSIC_LOOKAHEAD) {
        musicScheduleStep(ctx, m.layers, m.song, m.step, m.nextTime, stepDur);
        m.step++;
        m.nextTime += stepDur;
    }
}

function musicBuildBuses(ctx, song) {
    const master = ctx.createGain();
    master.gain.value = 0;
    // A gentle limiter so stacked layers never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.005; comp.release.value = 0.12;
    master.connect(comp); comp.connect(ctx.destination);
    const mk = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
    const layers = { base: mk(1), lead: mk(0), top: mk(0) };
    if (song.echo) {
        // Caves: the lead rings on
        const delay = ctx.createDelay(1);
        delay.delayTime.value = 60 / song.bpm * 0.75;
        const fb = ctx.createGain(); fb.gain.value = 0.35;
        layers.lead.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
    }
    return { master: master, layers: layers };
}

// --- Replacements for the audio.js entry points ---

const musicRecordedStart = startBackgroundMusic;
const musicRecordedStop = stopBackgroundMusic;

startBackgroundMusic = function (levelIndex) {
    const name = musicSongFor(levelIndex);
    clearTimeout(musicStopTimer);
    if (!name) {
        // Recorded track
        if (music) musicHalt();
        musicRecordedStart(levelIndex);
        return;
    }
    musicRecordedStop();
    if (music && music.name === name) return;       // already playing this tune (quick retry)
    if (music) musicHalt();
    let ctx;
    try { ctx = getAudioContext(); } catch (e) { return; }
    const song = MUSIC_SONGS[name];
    const buses = musicBuildBuses(ctx, song);
    music = {
        name: name, song: song, ctx: ctx, master: buses.master, layers: buses.layers,
        step: 0, nextTime: ctx.currentTime + 0.1, intensity: 0.4,
        timer: setInterval(musicTick, 60)
    };
};

function musicHalt() {
    if (!music) return;
    clearInterval(music.timer);
    const m = music;
    music = null;
    try {
        m.master.gain.setTargetAtTime(0, m.ctx.currentTime, 0.04);
        setTimeout(() => { try { m.master.disconnect(); } catch (e) { /* already gone */ } }, 600);
    } catch (e) { /* context closed */ }
}

stopBackgroundMusic = function () {
    musicRecordedStop();
    // Level restarts stop and start the music back to back; hold on a moment
    // so the same tune carries straight on instead of starting over.
    clearTimeout(musicStopTimer);
    musicStopTimer = setTimeout(musicHalt, 250);
};

// A short blip for counters ticking up
function playTick(pitch) {
    if (typeof sfxMuted !== 'undefined' && sfxMuted) return;
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = createGain(ctx, 0.12);
        osc.type = 'square';
        osc.frequency.setValueAtTime(pitch || 1200, t);
        g.gain.setValueAtTime(0.12 * sfxVolume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(g);
        osc.start(t); osc.stop(t + 0.05);
    } catch (e) { /* no audio */ }
}

// The mute buttons in audio.js restart the recorded track whenever it has
// been loaded; keep it quiet while a synthesized tune is the one playing.
const musicToggleMute = toggleMute;
toggleMute = function () {
    const muted = musicToggleMute();
    if (music && typeof bgMusic !== 'undefined' && bgMusic) bgMusic.pause();
    return muted;
};
const musicToggleMuteAll = toggleMuteAll;
toggleMuteAll = function () {
    const muted = musicToggleMuteAll();
    if (music && typeof bgMusic !== 'undefined' && bgMusic) bgMusic.pause();
    return muted;
};
