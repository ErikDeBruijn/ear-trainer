// js/audio.js
import { midi } from "./midi.js";

export class AudioEngine {
    constructor() {
        this.synth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.2 }})
            .toDestination();
        this.currentTonic = null;
        this.currentTarget = null;
        this.currentResolutionPlayed = false; // Track if resolution was played for replay
    }
    async resume() { await Tone.start(); }
    async playMidiNote(midiNumber, duration = 0.3, sendToMidi = true, volume = 0) {
        const freq = Tone.Frequency(midiNumber, "midi").toFrequency();

        // Set volume (in dB, 0 is default, negative values are quieter)
        const originalVolume = this.synth.volume.value;
        this.synth.volume.value = volume;

        this.synth.triggerAttackRelease(freq, duration);

        // Restore original volume after a short delay
        setTimeout(() => {
            this.synth.volume.value = originalVolume;
        }, duration * 1000 + 50);

        // Send to MIDI out if requested
        if (sendToMidi && midi.out) {
            midi.sendNote(midiNumber, 0.8, duration * 1000);
        }
    }

    async playTonicThenTarget(tonicMidi, targetMidi, tonicDuration = 0.5, gap = 0.3, targetDuration = 0.35, resolutionFrequency = 1.0) {
        // Store current tonic and target for replay
        this.currentTonic = tonicMidi;
        this.currentTarget = targetMidi;

        // Determine if we should play the resolution based on frequency
        const shouldPlayResolution = Math.random() < resolutionFrequency;
        this.currentResolutionPlayed = shouldPlayResolution;

        if (shouldPlayResolution) {
            // Play "ta-da" where "da" is the home/tonic note at 20% less volume
            // 20% less volume = -1.94 dB (20 * log10(0.8) ≈ -1.94)
            const resolutionVolume = -1.94;

            // "ta" is a perfect fourth below the tonic
            const taNoteNumber = tonicMidi - 5; // Perfect fourth below
            await this.playMidiNote(taNoteNumber, 0.25, true, resolutionVolume); // Play "ta"
            await new Promise(resolve => setTimeout(resolve, 0.25 * 1000));

            // Play "da" (tonic/resolution) and send to MIDI out
            await this.playMidiNote(tonicMidi, tonicDuration, true, resolutionVolume);
            await new Promise(resolve => setTimeout(resolve, (tonicDuration + gap) * 1000));
        } else {
            // If no resolution, just wait a bit before playing target
            await new Promise(resolve => setTimeout(resolve, gap * 1000));
        }

        // Play target note but don't send to MIDI out (at normal volume)
        await this.playMidiNote(targetMidi, targetDuration, false);
    }

    async replayCurrentNotes() {
        if (this.currentTarget !== null) {
            if (this.currentTonic !== null) {
                // Replay both tonic and target - always play resolution during replay
                await this.playTonicThenTarget(this.currentTonic, this.currentTarget, 0.5, 0.3, 0.35, 1.0);
            } else {
                // Only replay target note (no tonic)
                await this.playMidiNote(this.currentTarget, 0.35, false);
            }
        }
    }
}
