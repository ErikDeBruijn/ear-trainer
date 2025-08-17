// js/audio.js
import { midi } from "./midi.js";

export class AudioEngine {
    constructor() {
        this.synth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.2 }})
            .toDestination();
        this.currentTonic = null;
        this.currentTarget = null;
    }
    async resume() { await Tone.start(); }
    async playMidiNote(midiNumber, duration = 0.3, sendToMidi = true) {
        const freq = Tone.Frequency(midiNumber, "midi").toFrequency();
        this.synth.triggerAttackRelease(freq, duration);

        // Send to MIDI out if requested
        if (sendToMidi && midi.out) {
            midi.sendNote(midiNumber, 0.8, duration * 1000);
        }
    }

    async playTonicThenTarget(tonicMidi, targetMidi, tonicDuration = 0.5, gap = 0.3, targetDuration = 0.35) {
        // Store current tonic and target for replay
        this.currentTonic = tonicMidi;
        this.currentTarget = targetMidi;

        // Play tonic (resolution) and send to MIDI out
        await this.playMidiNote(tonicMidi, tonicDuration, true);
        await new Promise(resolve => setTimeout(resolve, (tonicDuration + gap) * 1000));

        // Play target note but don't send to MIDI out
        await this.playMidiNote(targetMidi, targetDuration, false);
    }

    async replayCurrentNotes() {
        if (this.currentTarget !== null) {
            if (this.currentTonic !== null) {
                // Replay both tonic and target
                await this.playTonicThenTarget(this.currentTonic, this.currentTarget);
            } else {
                // Only replay target note (no tonic)
                await this.playMidiNote(this.currentTarget, 0.35, false);
            }
        }
    }
}
