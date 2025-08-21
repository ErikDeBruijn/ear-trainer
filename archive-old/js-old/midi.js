// js/midi.js
export const midi = {
    enabled: false,
    inputs: [],
    outputs: [],
    activeInputs: [], // Array of active input devices
    activeOutputs: [], // Array of active output devices
    out: null, // Legacy single output for compatibility
    onDeviceChange: null,

    async enable() {
        // Enable Web MIDI with SysEx (needed for per-key lighting on LUMI)
        await WebMidi.enable({ sysex: true });
        this.enabled = true;
        this.inputs = WebMidi.inputs;
        this.outputs = WebMidi.outputs;
        
        // Set up device change listeners
        WebMidi.addListener("connected", (e) => {
            console.log("MIDI device connected:", e.port.name);
            this.updateDeviceLists();
            if (this.onDeviceChange) this.onDeviceChange(e.port, 'connected');
        });
        
        WebMidi.addListener("disconnected", (e) => {
            console.log("MIDI device disconnected:", e.port.name);
            this.updateDeviceLists();
            if (this.onDeviceChange) this.onDeviceChange(e.port, 'disconnected');
        });
        
        return { inputs: this.inputs, outputs: this.outputs };
    },

    updateDeviceLists() {
        this.inputs = WebMidi.inputs;
        this.outputs = WebMidi.outputs;
    },

    // Detect device type based on name, manufacturer, and common patterns
    detectDeviceType(device) {
        const name = device.name.toLowerCase();
        const manufacturer = device.manufacturer ? device.manufacturer.toLowerCase() : '';
        
        // Drum devices - explicit patterns
        const drumPatterns = [
            'drum', 'pad', 'kick', 'snare', 'hihat', 'cymbal', 'tom',
            'percussion', 'beat', 'rhythm', 'sample pad', 'electronic drum',
            'm-vave', 'alesis', 'roland td', 'yamaha dtx', 'pearl e-pro'
        ];
        
        // Controller devices (non-melodic)
        const controllerPatterns = [
            'controller', 'control', 'mixer', 'interface', 'launch',
            'push', 'maschine', 'mpc', 'trigger finger', 'oxygen pro'
        ];
        
        // Melodic instruments - keyboards, pianos, synths
        const melodicPatterns = [
            'piano', 'keyboard', 'keys', 'synth', 'organ', 'stage',
            'digital piano', 'electric piano', 'workstation',
            'kawai', 'yamaha p', 'yamaha cp', 'nord', 'korg', 
            'roland fp', 'roland rd', 'casio', 'roli', 'lumi'
        ];

        // Check for drum devices first
        if (drumPatterns.some(pattern => 
            name.includes(pattern) || manufacturer.includes(pattern)
        )) {
            return 'drum';
        }

        // Check for controllers
        if (controllerPatterns.some(pattern => 
            name.includes(pattern) || manufacturer.includes(pattern)
        )) {
            return 'controller';
        }

        // Check for melodic instruments
        if (melodicPatterns.some(pattern => 
            name.includes(pattern) || manufacturer.includes(pattern)
        )) {
            return 'melodic';
        }

        // Default to melodic for unknown devices (safer for ear training)
        return 'melodic';
    },

    // Check if device is suitable for melodic ear training
    isMelodicDevice(device) {
        return this.detectDeviceType(device) === 'melodic';
    },

    setActiveInputs(deviceIds) {
        // Clear existing listeners
        this.activeInputs.forEach(device => {
            device.removeListener("noteon");
            device.removeListener("noteoff");
        });
        
        // Set new active inputs
        this.activeInputs = deviceIds
            .map(id => this.inputs.find(p => p.id === id))
            .filter(device => device !== undefined);
    },

    setInById(id) {
        // Legacy method for compatibility - converts single device to array
        this.setActiveInputs([id]);
        this.in = this.inputs.find(p => p.id === id) || null;
    },

    setActiveOutputs(deviceIds) {
        // Set new active outputs
        this.activeOutputs = deviceIds
            .map(id => this.outputs.find(p => p.id === id))
            .filter(device => device !== undefined);
            
        // Update legacy single output (use first ROLI device if available, otherwise first device)
        const roliDevice = this.activeOutputs.find(dev => 
            dev.manufacturer && dev.manufacturer.match(/ROLI/i)
        );
        this.out = roliDevice || this.activeOutputs[0] || null;
    },

    // Legacy method for compatibility - converts single device to array
    setOutById(id) {
        this.setActiveOutputs([id]);
    },

    // Check if device is a LUMI/ROLI device for auto-selection
    isLumiDevice(device) {
        return device.name.toLowerCase().includes('lumi') || 
               (device.manufacturer && device.manufacturer.match(/ROLI/i));
    },

    onNote(cb) {
        // Set up listeners for all active input devices
        this.activeInputs.forEach(device => {
            // listen on all channels for MPE/keyboards
            device.addListener("noteon", "all", e => cb({ type: "on", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
            device.addListener("noteoff", "all", e => cb({ type: "off", note: e.note.number, name: e.note.identifier, velocity: e.velocity }));
        });
    },

    // Send notes to all active output devices
    sendNote(number = 60, velocity = 0.8, durationMs = 300) {
        this.activeOutputs.forEach(device => {
            device.playNote(number, { attack: velocity, duration: durationMs });
        });
        
        // Legacy compatibility - also use single output if no active outputs
        if (this.activeOutputs.length === 0 && this.out) {
            this.out.playNote(number, { attack: velocity, duration: durationMs });
        }
    },

    // Send challenge notes only to non-LUMI devices (to avoid giving away the answer)
    sendChallengeNote(number = 60, velocity = 0.8, durationMs = 300) {
        // Filter out LUMI devices from active outputs
        const nonLumiDevices = this.activeOutputs.filter(device => !this.isLumiDevice(device));
        
        nonLumiDevices.forEach(device => {
            device.playNote(number, { attack: velocity, duration: durationMs });
        });
        
        // Legacy compatibility - use single output only if it's not LUMI and no active outputs
        if (this.activeOutputs.length === 0 && this.out && !this.isLumiDevice(this.out)) {
            this.out.playNote(number, { attack: velocity, duration: durationMs });
        }
    },

    // Start a sustained note on all active output devices (note-on)
    sendNoteOn(number = 60, velocity = 0.8) {
        this.activeOutputs.forEach(device => {
            // Play note without duration - this should sustain until stopNote is called
            device.playNote(number, { attack: velocity, release: velocity });
        });
        
        // Legacy compatibility - also use single output if no active outputs
        if (this.activeOutputs.length === 0 && this.out) {
            this.out.playNote(number, { attack: velocity, release: velocity });
        }
    },

    // Stop a sustained note on all active output devices (note-off)
    sendNoteOff(number = 60) {
        this.activeOutputs.forEach(device => {
            device.stopNote(number);
        });
        
        // Legacy compatibility - also use single output if no active outputs
        if (this.activeOutputs.length === 0 && this.out) {
            this.out.stopNote(number);
        }
    }
};