// js/theory.js
const NOTE_BASE = { C: 0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
const MAJOR = [0,2,4,5,7,9,11];
const NAT_MINOR = [0,2,3,5,7,8,10];

export function parseKey(keyStr) {
    // "C-major", "A-minor"
    const [tonic, mode] = keyStr.split("-");
    const semitone = NOTE_BASE[tonic];
    const scale = (mode === "major") ? MAJOR : NAT_MINOR;
    return scale.map(i => (i + semitone + 120) % 12); // normalize 0..11
}

export function rangeToMidi(rangeStr) {
    // "C3-C5" means C3 up to but not including C5 (upper bound exclusive)
    const [lo, hi] = rangeStr.split("-");
    return [toMidi(lo), toMidi(hi)];
}

export function toMidi(pitch) {
    // e.g., C4
    const m = pitch.match(/^([A-G]#?|Bb|Db|Gb|Ab)(\d)$/);
    const k = NOTE_BASE[m[1]];
    const oct = parseInt(m[2],10);
    return 12 * (oct + 1) + k; // MIDI: C4 = 60
}

export function randomNoteInKey(keySet, [low, highExclusive]) {
    const candidates = [];
    for (let m = low; m < highExclusive; m++) {
        if (keySet.includes(m % 12)) candidates.push(m);
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    console.log(`randomNoteInKey: keySet=${keySet}, range=[${low},${highExclusive}), candidates=${candidates.length}, chosen=${chosen} (${chosen%12})`);
    return chosen;
}

export function midiNoteToKeySignature(midiNote) {
    const noteClass = midiNote % 12;
    // Map note classes to available key signatures (prefer major, fallback to relative minor)
    const keyMap = {
        0: "C-major",    // C -> C major
        1: "C-major",    // C#/Db -> C major (closest)
        2: "D-major",    // D -> D major
        3: "E-minor",    // D#/Eb -> E minor (relative of G major)
        4: "E-minor",    // E -> E minor
        5: "F#-major",   // F -> F# major (closest available)
        6: "F#-major",   // F#/Gb -> F# major
        7: "G-major",    // G -> G major
        8: "A-minor",    // G#/Ab -> A minor (closest)
        9: "A-minor",    // A -> A minor
        10: "A-minor",   // A#/Bb -> A minor (closest)
        11: "G-major"    // B -> G major (closest)
    };
    return keyMap[noteClass];
}