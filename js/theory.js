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
    // "C3-C5"
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

export function randomNoteInKey(keySet, [low, high]) {
    const candidates = [];
    for (let m = low; m <= high; m++) {
        if (keySet.includes(m % 12)) candidates.push(m);
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
}