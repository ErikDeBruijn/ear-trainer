// js/midi.js
export const midi = {
    enabled: false,
    inputs: [],
    outputs: [],
    in: null,
    out: null,

    async enable() {
        // Enable Web MIDI with SysEx (needed for per-key lighting on LUMI)
        await WebMidi.enable({ sysex: true });
        this.enabled = true;
        this.inputs = WebMidi.inputs;
        this.outputs = WebMidi.outputs;
        return { inputs: this.inputs, outputs: this.outputs };
    },

    setInById(id) {
        this.in = this.inputs.find(p => p.id === id) || null;
    },

    // Restrict SysEx output to ROLI devices (e.g., LUMI); inputs can be any MIDI controller.
    setOutById(id) {
        const dev = this.outputs.find(p => p.id === id) || null;
        if (dev && dev.manufacturer && dev.manufacturer.match(/ROLI/i)) {
            this.out = dev;
        } else {
            this.out = null;
        }
    },

    onNote(cb) {
        if (!this.in) return;
        // listen on all channels for MPE/keyboards
        this.in.addListener("noteon", "all", e => cb({ type: "on", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
        this.in.addListener("noteoff", "all", e => cb({ type: "off", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
    },

    // Hints/tones can play on any selected output, regardless of manufacturer.
    sendNote(number = 60, velocity = 0.8, durationMs = 300) {
        if (!this.out) return;
        this.out.playNote(number, { attack: velocity, duration: durationMs });
    }
};