// js/audio.js
export class AudioEngine {
    constructor() {
        this.synth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.2 }})
            .toDestination();
    }
    async resume() { await Tone.start(); }
    async playMidiNote(midiNumber, duration = 0.3) {
        const freq = Tone.Frequency(midiNumber, "midi").toFrequency();
        this.synth.triggerAttackRelease(freq, duration);
    }
}