// services/audioService.js
import * as Tone from 'tone';
import { midiService } from './midiService.js';

class AudioService {
    constructor() {
        this.masterGain = new Tone.Gain(0.7).toDestination();
        this.synth = new Tone.Synth({ 
            oscillator: { type: "triangle" }, 
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.2 }
        }).connect(this.masterGain);
        
        // Polyphonic synth for sustained audible response notes
        this.polySynth = new Tone.PolySynth(Tone.Synth, { 
            oscillator: { type: "triangle" }, 
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.3 }
        }).connect(this.masterGain);
        
        this.currentTonic = null;
        this.currentTarget = null;
        this.currentResolutionPlayed = false; // Track if resolution was played for replay
        this.sustainedNotes = new Map(); // Track sustained notes for audible response
    }

    setMasterVolume(volumePercent) {
        // Convert 0-100 percent to 0-1 gain scale
        const gain = volumePercent / 100;
        this.masterGain.gain.value = gain;
    }
    
    async resume() { 
        await Tone.start(); 
    }
    
    async playMidiNote(midiNumber, duration = 0.3, sendToMidi = true, volume = 0, isChallenge = false) {
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
        if (sendToMidi) {
            if (isChallenge) {
                // Challenge notes: send only to non-LUMI devices
                midiService.sendChallengeNote(midiNumber, 0.8, duration * 1000);
            } else {
                // Feedback notes: send to all devices including LUMI
                midiService.sendNote(midiNumber, 0.8, duration * 1000);
            }
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
            await this.playMidiNote(taNoteNumber, 0.25, true, resolutionVolume, false); // Play "ta" - feedback, not challenge
            await new Promise(resolve => setTimeout(resolve, 0.25 * 1000));

            // Play "da" (tonic/resolution) and send to MIDI out
            await this.playMidiNote(tonicMidi, tonicDuration, true, resolutionVolume, false); // Tonic - feedback, not challenge
            await new Promise(resolve => setTimeout(resolve, (tonicDuration + gap) * 1000));
        } else {
            // If no resolution, just wait a bit before playing target
            await new Promise(resolve => setTimeout(resolve, gap * 1000));
        }

        // Play target note - this is the challenge, so route to non-LUMI devices only
        await this.playMidiNote(targetMidi, targetDuration, true, 0, true);
    }

    async replayCurrentNotes() {
        if (this.currentTarget !== null) {
            if (this.currentTonic !== null) {
                // Replay both tonic and target - always play resolution during replay
                await this.playTonicThenTarget(this.currentTonic, this.currentTarget, 0.5, 0.3, 0.35, 1.0);
            } else {
                // Only replay target note (no tonic) - this is challenge replay
                await this.playMidiNote(this.currentTarget, 0.35, true, 0, true);
            }
        }
    }

    // Start a sustained note for audible response
    startSustainedNote(midiNumber, volume = 0) {
        // Stop any existing sustained note for this MIDI number
        this.stopSustainedNote(midiNumber);

        const freq = Tone.Frequency(midiNumber, "midi").toFrequency();

        // Set volume (in dB, 0 is default, negative values are quieter)
        const originalVolume = this.polySynth.volume.value;
        this.polySynth.volume.value = volume;

        // Trigger attack and store the note info
        this.polySynth.triggerAttack(freq);
        this.sustainedNotes.set(midiNumber, { originalVolume, startTime: Date.now() });
    }

    // Stop a sustained note for audible response
    stopSustainedNote(midiNumber) {
        const noteInfo = this.sustainedNotes.get(midiNumber);
        if (noteInfo) {
            const freq = Tone.Frequency(midiNumber, "midi").toFrequency();

            // Trigger release for this specific note
            this.polySynth.triggerRelease(freq);

            // Restore original volume after a short delay
            setTimeout(() => {
                this.polySynth.volume.value = noteInfo.originalVolume;
            }, 100);

            this.sustainedNotes.delete(midiNumber);
        }
    }

    // Stop all sustained notes
    stopAllSustainedNotes() {
        for (const midiNumber of this.sustainedNotes.keys()) {
            this.stopSustainedNote(midiNumber);
        }
    }
}

// Export singleton instance
export const audioService = new AudioService();