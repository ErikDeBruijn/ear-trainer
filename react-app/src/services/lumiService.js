/**
 * LUMI SysEx service for the React ear trainer.
 * 
 * This service provides ROLI LUMI LED lighting control functionality,
 * including visual feedback for correct/incorrect answers.
 */

// ROLI manufacturer id and SysEx constants
const MFR = [0xF0, 0x00, 0x21, 0x10];
const START = 0xF0;
const END = 0xF7;

// Map of simple colors → RGB values
const COLORS = {
  green: [0, 127, 0],
  red: [127, 0, 0],
  white: [127, 127, 127],
  darkred: [64, 0, 0],
  off: [0, 0, 0],
  brightblue: [0, 1, 255],
  cyan: [0, 255, 255],
  brightwhite: [255, 255, 255],
  grey: [64, 64, 64]
};

// Root key commands mapping - CORRECTED based on actual LUMI desktop app data
// Format: [0x10, 0x30, key_byte1, key_byte2, 0x00, 0x00, 0x00, 0x00] (8 bytes total)
const ROOT_KEY_COMMANDS = {
  'C': [0x10, 0x30, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00],   // From actual data
  'C#': [0x10, 0x30, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00],  // From actual data  
  'Db': [0x10, 0x30, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00],  // Same as C#
  'D': [0x10, 0x30, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00],   // Inferred pattern
  'D#': [0x10, 0x30, 0x63, 0x00, 0x00, 0x00, 0x00, 0x00],  // Inferred pattern
  'Eb': [0x10, 0x30, 0x63, 0x00, 0x00, 0x00, 0x00, 0x00],  // Same as D#
  'E': [0x10, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00, 0x00],   // Inferred pattern
  'F': [0x10, 0x30, 0x23, 0x01, 0x00, 0x00, 0x00, 0x00],   // Inferred pattern
  'F#': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],  // Inferred pattern
  'Gb': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],  // Same as F#
  'G': [0x10, 0x30, 0x63, 0x01, 0x00, 0x00, 0x00, 0x00],   // From actual data
  'G#': [0x10, 0x30, 0x03, 0x02, 0x00, 0x00, 0x00, 0x00],  // Inferred pattern
  'Ab': [0x10, 0x30, 0x03, 0x02, 0x00, 0x00, 0x00, 0x00],  // Same as G#
  'A': [0x10, 0x30, 0x23, 0x02, 0x00, 0x00, 0x00, 0x00],   // Inferred pattern
  'A#': [0x10, 0x30, 0x43, 0x02, 0x00, 0x00, 0x00, 0x00],  // Inferred pattern
  'Bb': [0x10, 0x30, 0x43, 0x02, 0x00, 0x00, 0x00, 0x00],  // Same as A#
  'B': [0x10, 0x30, 0x63, 0x02, 0x00, 0x00, 0x00, 0x00]    // From actual data
};

const BRIGHTNESS_MAP = {
  '0':   [0x10, 0x40, 0x04, 0x00, 0, 0, 0, 0],
  '25':  [0x10, 0x40, 0x24, 0x06, 0, 0, 0, 0],
  '50':  [0x10, 0x40, 0x44, 0x0C, 0, 0, 0, 0],
  '75':  [0x10, 0x40, 0x64, 0x12, 0, 0, 0, 0],
  '100': [0x10, 0x40, 0x04, 0x19, 0, 0, 0, 0]
};

// Helper functions
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v | 0));

function lumiChecksum(cmd) {
  if (!Array.isArray(cmd)) {
    throw new Error('lumiChecksum: cmd must be an array');
  }
  let c = cmd.length;
  for (const b of cmd) c = (c * 3 + (b & 0x7F)) & 0xFF;
  return c & 0x7F;
}

function buildFrameFromCmd8(cmd8, deviceId = 0x00) {
  const sum = lumiChecksum(cmd8);
  const body = [0x77, deviceId & 0x7F, ...cmd8, sum];
  return [...MFR, ...body, END];
}

function buildFrameFromCmd6(cmd6, deviceId = 0x00) {
  const sum = lumiChecksum(cmd6);
  const body = [0x77, deviceId & 0x7F, ...cmd6, sum];
  return [...MFR, ...body, END];
}

function encodeColorRGB(r, g, b) {
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  const v1 = ((b & 0x03) << 5) | 0x04;
  const v2 = ((b >> 2) & 0x3F) | (g & 0x01);
  const v3 = (g >> 1) & 0x7F;
  const v4 = r & 0x7F;
  const v5 = ((r >> 7) & 0x01) | 0x7E;
  return [v1, v2, v3, v4, v5];
}

function cmdPrimaryRGB(r, g, b) {
  return [0x10, 0x20, ...encodeColorRGB(r, g, b), 0x03];
}

function cmdBrightness(level) {
  const b = BRIGHTNESS_MAP[String(level)];
  if (!b) throw new Error(`Unknown brightness level: ${level}`);
  return b.slice();
}

function buildPrimaryRGB(r, g, b, deviceId = 0x00) {
  return buildFrameFromCmd8(cmdPrimaryRGB(r, g, b), deviceId);
}

function buildBrightness(level, deviceId = 0x00) {
  return buildFrameFromCmd8(cmdBrightness(level), deviceId);
}

// Mode commands based on SysEx documentation
const MODE_COMMANDS = {
  'rainbow': [0x10, 0x40, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00], // rainbow mode
  'single': [0x10, 0x40, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00],  // single color scale
  'piano': [0x10, 0x40, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00],   // piano mode
  'night': [0x10, 0x40, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00]    // night mode
};

// Scale commands based on LUMI protocol documentation
const SCALE_COMMANDS = {
  'major': [0x10, 0x60, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00],
  'minor': [0x10, 0x60, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00],
  'harmonic-minor': [0x10, 0x60, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00],
  'chromatic': [0x10, 0x60, 0x42, 0x04, 0x00, 0x00, 0x00, 0x00],
  'pentatonic-major': [0x10, 0x60, 0x02, 0x01, 0x00, 0x00, 0x00, 0x00],
  'pentatonic-minor': [0x10, 0x60, 0x22, 0x01, 0x00, 0x00, 0x00, 0x00]
};

function cmdMode(mode) {
  const cmd = MODE_COMMANDS[String(mode).toLowerCase()];
  if (!cmd) throw new Error(`Unknown mode: ${mode}`);
  return cmd.slice();
}

function buildMode(mode, deviceId = 0x00) {
  return buildFrameFromCmd8(cmdMode(mode), deviceId);
}

function cmdScale(scale) {
  const cmd = SCALE_COMMANDS[String(scale).toLowerCase()];
  if (!cmd) throw new Error(`Unknown scale: ${scale}`);
  return cmd.slice();
}

function buildScale(scale, deviceId = 0x00) {
  return buildFrameFromCmd8(cmdScale(scale), deviceId);
}

class LumiService {
  constructor() {
    this.midiOut = null;
    this.midiIn = null;
    this.isLumi = false;
    this.monitoring = false;
  }

  bindMidiOut(out) {
    this.midiOut = out;
    this.isLumi = !!out && /lumi/i.test(out.name);
    console.log(`🔌 LUMI service bound to: ${out?.name || 'null'}, isLumi: ${this.isLumi}`);
  }

  bindMidiIn(input) {
    // Remove existing listener if any
    if (this.midiIn) {
      this.midiIn.removeListener('sysex');
      this.midiIn.removeListener('midimessage');
    }
    
    this.midiIn = input;
    const isLumiInput = !!input && /lumi/i.test(input.name);
    
    if (input && isLumiInput) {
      console.log(`🎧 LUMI MIDI input bound: ${input.name}`);
      
      // Listen for SysEx messages
      input.addListener('sysex', (e) => {
        if (this.monitoring) {
          this.logSysExMessage('IN', Array.from(e.data));
        }
      });
      
      // Also listen for all MIDI messages to catch any we might miss
      input.addListener('midimessage', (e) => {
        const data = Array.from(e.data);
        // Only log SysEx messages (start with 0xF0)
        if (this.monitoring && data[0] === 0xF0) {
          this.logSysExMessage('IN', data);
        }
      });
    } else {
      console.log(`🎧 MIDI input bound: ${input?.name || 'null'} (not LUMI)`);
    }
  }

  startMonitoring() {
    this.monitoring = true;
    console.log('🎧 Started MIDI SysEx monitoring - change keys in LUMI desktop app now!');
  }

  stopMonitoring() {
    this.monitoring = false;
    console.log('🎧 Stopped MIDI SysEx monitoring');
  }

  logSysExMessage(direction, data) {
    const hex = data.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
    const timestamp = new Date().toLocaleTimeString();
    console.log(`📡 [${timestamp}] ${direction} SysEx: ${hex}`);
    
    // Try to decode if it looks like a LUMI message
    if (data.length >= 6 && 
        data[0] === 0xF0 && 
        data[1] === 0x00 && data[2] === 0x21 && data[3] === 0x10) {
      this.decodeLumiMessage(data);
    }
  }

  decodeLumiMessage(data) {
    if (data.length < 10) return;
    
    const messageType = data[4];
    const deviceId = data[5];
    const command = data.slice(6, -2); // All bytes except checksum and F7
    const checksum = data[data.length - 2];
    
    console.log(`🔍 LUMI decode: msgType=0x${messageType.toString(16)}, device=0x${deviceId.toString(16)}, checksum=0x${checksum.toString(16)}`);
    console.log(`🔍 Command bytes (${command.length}): ${command.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Try to identify the command type
    if (command[0] === 0x10 && command[1] === 0x30) {
      console.log('🔑 This looks like a KEY SETTING command!');
      this.identifyKeyCommand(command);
    } else if (command[0] === 0x10 && command[1] === 0x60) {
      console.log('🎵 This looks like a SCALE SETTING command!');
      this.identifyScaleCommand(command);
    } else if (command[0] === 0x10 && command[1] === 0x40) {
      console.log('🔧 This looks like a MODE/BRIGHTNESS command!');
    }
  }

  identifyKeyCommand(command) {
    // Find matching key in our ROOT_KEY_COMMANDS
    for (const [key, cmd] of Object.entries(ROOT_KEY_COMMANDS)) {
      if (JSON.stringify(command) === JSON.stringify(cmd)) {
        console.log(`🎯 MATCHED KEY: ${key}`);
        return;
      }
    }
    console.log('❓ Key command not found in our mapping');
    console.log('📝 Please tell me what key this represents so I can update the mapping!');
    console.log(`💾 Command to add: [${command.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);
  }

  identifyScaleCommand(command) {
    // Find matching scale in our SCALE_COMMANDS
    for (const [scale, cmd] of Object.entries(SCALE_COMMANDS)) {
      if (JSON.stringify(command) === JSON.stringify(cmd)) {
        console.log(`🎯 MATCHED SCALE: ${scale}`);
        return;
      }
    }
    console.log('❓ Scale command not found in our mapping');
  }

  setKeyColor(note, color) {
    if (!this.midiOut || !this.isLumi) return;
    const rgb = COLORS[color] || COLORS.off;
    
    const sysex = [
      0xF0,
      0x00, 0x21, 0x10,
      0x78,
      note & 0x7F,
      rgb[0] & 0x7F,
      rgb[1] & 0x7F,
      rgb[2] & 0x7F,
      0xF7
    ];
    
    try {
      this.midiOut.send(sysex);
    } catch (e) {
      console.warn("Failed to send SysEx key color:", e);
    }
  }

  setScaleColors(keySet, low, highExclusive) {
    if (!this.midiOut || !this.isLumi) return;
    try {
      for (let m = low; m < highExclusive; m++) {
        const inScale = keySet.includes(m % 12);
        this.setKeyColor(m, inScale ? "brightblue" : "darkred");
      }
    } catch (e) {
      console.warn("Failed to set scale colors:", e);
    }
  }

  sendPrimaryColor(r, g, b) {
    if (!this.midiOut || !this.isLumi) return;
    try {
      const frame = buildPrimaryRGB(r, g, b);
      this.midiOut.send(frame);
    } catch (e) {
      console.warn("Failed to send primary color:", e);
    }
  }

  sendPrimaryGreen() {
    console.log('🟢 Sending primary green (correct answer)');
    this.sendPrimaryColor(0, 255, 0);
    // Reset to normal bright blue after 500ms
    setTimeout(() => {
      this.sendPrimaryColor(0, 1, 255); // Bright blue (normal scale color)
    }, 500);
  }

  sendPrimaryRed() {
    console.log('🔴 Sending primary red (incorrect answer)');
    this.sendPrimaryColor(255, 0, 0);
    // Reset to normal bright blue after 500ms
    setTimeout(() => {
      this.sendPrimaryColor(0, 1, 255); // Bright blue (normal scale color)
    }, 500);
  }

  setRootKey(keySignature) {
    console.log(`🔑 setRootKey called with: ${keySignature}`);
    console.log(`🔑 midiOut=${!!this.midiOut}, isLumi=${this.isLumi}`);
    
    if (!this.midiOut || !this.isLumi) {
      console.log(`🔑 Early exit: midiOut or isLumi check failed`);
      return;
    }

    const rootNote = keySignature.split('-')[0];
    console.log(`🔑 Extracted root note: ${rootNote}`);
    
    const command = ROOT_KEY_COMMANDS[rootNote];
    console.log(`🔑 Command for ${rootNote}:`, command);

    if (!command) {
      console.warn(`Unknown root key: ${rootNote}`);
      return;
    }

    try {
      const frame = buildFrameFromCmd8(command); // Back to 8-byte command format
      console.log(`🎹 Setting LUMI root key to: ${rootNote}`);
      console.log(`📤 Sending SysEx frame:`, frame.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      this.midiOut.send(frame);
      console.log(`✅ LUMI root key set to: ${rootNote}`);
    } catch (e) {
      console.warn("Failed to set root key:", e);
    }
  }

  setBrightness(level) {
    if (!this.midiOut || !this.isLumi) return;

    try {
      const frame = buildBrightness(level);
      this.midiOut.send(frame);
    } catch (e) {
      console.warn("Failed to set brightness:", e);
    }
  }

  setMaxBrightness() {
    this.setBrightness('100');
  }

  setMode(mode) {
    if (!this.midiOut || !this.isLumi) return;

    try {
      const frame = buildMode(mode);
      this.midiOut.send(frame);
      console.log(`🔧 LUMI mode set to: ${mode}`);
    } catch (e) {
      console.warn("Failed to set LUMI mode:", e);
    }
  }

  setScale(scale) {
    if (!this.midiOut || !this.isLumi) return;

    try {
      const frame = buildScale(scale);
      this.midiOut.send(frame);
      console.log(`🎵 LUMI scale set to: ${scale}`);
    } catch (e) {
      console.warn("Failed to set LUMI scale:", e);
    }
  }

  // TODO: Future iteration - separate key and scale configuration
  // Currently we conflate "G major" as both key=G and scale=major
  // In future, allow independent key selection (C, D, E, etc.) and scale selection (major, minor, etc.)
  configureKeyAndScale(keySignature) {
    if (!this.midiOut || !this.isLumi) {
      console.log(`❌ Cannot configure LUMI: midiOut=${!!this.midiOut}, isLumi=${this.isLumi}`);
      return;
    }

    // Extract key and mode from signature like "G-major"
    const [rootNote, mode] = keySignature.split('-');
    
    console.log(`🎼 Configuring LUMI for ${keySignature}: key=${rootNote}, scale=${mode}`);
    
    // Set the key root note
    console.log(`🔑 About to call setRootKey with: ${keySignature}`);
    this.setRootKey(keySignature);
    
    // Set the scale
    this.setScale(mode);
    
    // Set to single color scale mode for best visibility
    this.setMode('single');
    
    console.log(`✅ LUMI configured for ${keySignature}`);
  }

  clearRange(low, highExclusive) {
    if (!this.midiOut) return;
    try {
      for (let m = low; m < highExclusive; m++) {
        this.setKeyColor(m, "off");
      }
    } catch (e) {
      console.warn("Failed to clear range:", e);
    }
  }

  // eslint-disable-next-line no-unused-vars
  sendRainbowCelebration(keySet, low, highExclusive) {
    if (!this.midiOut || !this.isLumi) return;
    
    // Generate ultra-smooth rainbow spectrum
    const rainbowColors = [];
    const steps = 32;
    
    for (let i = 0; i < steps; i++) {
      const hue = (i / steps) * 360;
      const [r, g, b] = this.hslToRgb(hue / 360, 1, 0.6);
      rainbowColors.push([Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]);
    }
    
    let colorIndex = 0;
    const totalFlashes = rainbowColors.length * 3;
    
    const flashColor = () => {
      if (colorIndex >= totalFlashes) {
        // Always end with bright blue after rainbow
        this.sendPrimaryColor(0, 1, 255); // Bright blue
        return;
      }
      
      const [r, g, b] = rainbowColors[colorIndex % rainbowColors.length];
      
      try {
        this.sendPrimaryColor(r, g, b);
      } catch (e) {
        console.warn("❌ Failed to send rainbow color:", e);
      }
      
      colorIndex++;
      
      // Faster for even smoother effect!
      setTimeout(flashColor, 40); // 40ms = buttery smooth 25fps
    };
    
    flashColor();
  }

  // Helper function to convert HSL to RGB
  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
  }

  // Manual test function - call from console
  testRainbow() {
    // Use C major scale and C3-B4 range as defaults
    const keySet = [0, 2, 4, 5, 7, 9, 11]; // C major
    const low = 48; // C3
    const high = 72; // C5
    this.sendRainbowCelebration(keySet, low, high);
  }

  // Test individual color setting
  testSingleColor(note, color) {
    console.log(`🎨 Testing single color: note ${note}, color ${color}`);
    this.setKeyColor(note, color);
  }

  // Test primary color (whole keyboard)
  testPrimaryColor(r, g, b) {
    console.log(`🎨 Testing primary color: RGB(${r}, ${g}, ${b})`);
    this.sendPrimaryColor(r, g, b);
  }

  // Test all available colors on a single note
  testAllColors(note = 60) {
    console.log(`🌈 Testing all colors on note ${note}`);
    const colors = Object.keys(COLORS);
    let colorIndex = 0;
    
    const testColor = () => {
      if (colorIndex >= colors.length) {
        console.log('✅ All colors tested');
        return;
      }
      
      const color = colors[colorIndex];
      console.log(`Testing color ${colorIndex + 1}/${colors.length}: ${color}`);
      this.setKeyColor(note, color);
      colorIndex++;
      
      setTimeout(testColor, 1000); // 1 second between colors
    };
    
    testColor();
  }

  // Test mode switching
  testMode(mode) {
    console.log(`🔧 Testing mode: ${mode}`);
    this.setMode(mode);
  }

  // Test brightness
  testBrightness(level) {
    console.log(`💡 Testing brightness: ${level}`);
    this.setBrightness(level);
  }

  // Convenience methods for console testing
  monitor() {
    this.startMonitoring();
  }

  stopmon() {
    this.stopMonitoring();
  }

  // Test our key setting vs what desktop app sends
  testKeyCompare(keyName) {
    console.log(`🧪 Testing key setting for: ${keyName}`);
    this.setRootKey(keyName + '-major');
  }

  // Parse raw hex data from debug output
  parseDebugData(hexString) {
    console.log('🔍 Parsing debug data:', hexString);
    const bytes = hexString.trim().split(/\s+/).map(h => parseInt(h.replace(/[^0-9A-Fa-f]/g, ''), 16));
    
    // Look for complete SysEx messages (F0 ... F7)
    const messages = [];
    let start = -1;
    
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0xF0) {
        start = i;
      } else if (bytes[i] === 0xF7 && start !== -1) {
        messages.push(bytes.slice(start, i + 1));
        start = -1;
      }
    }
    
    console.log(`Found ${messages.length} SysEx messages:`);
    messages.forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`, msg.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      if (msg.length >= 6 && msg[0] === 0xF0 && msg[1] === 0x00 && msg[2] === 0x21 && msg[3] === 0x10) {
        this.decodeLumiMessage(msg);
      }
    });
    
    return messages;
  }
}

export const lumiService = new LumiService();