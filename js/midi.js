// js/midi.js
export const midi = {
    enabled: false,
    inputs: [],
    outputs: [],
    in: null,
    out: null,

    async enable() {
        // Request Web MIDI (permission prompt appears over HTTPS)
        await WebMidi.enable();
        this.enabled = true;
        this.inputs = WebMidi.inputs;
        this.outputs = WebMidi.outputs;
        return { inputs: this.inputs, outputs: this.outputs };
    },

    setInById(id) {
        this.in = this.inputs.find(p => p.id === id) || null;
    },

    setOutById(id) {
        this.out = this.outputs.find(p => p.id === id) || null;
    },

    onNote(cb) {
        if (!this.in) return;
        // listen on all channels for MPE/keyboards
        this.in.addListener("noteon", "all", e => cb({ type: "on", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
        this.in.addListener("noteoff", "all", e => cb({ type: "off", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
    },

    sendNote(number = 60, velocity = 0.8, durationMs = 300) {
        if (!this.out) return;
        this.out.playNote(number, { rawVelocity: false, velocity, duration: durationMs });
    }
};