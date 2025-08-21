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

// Root key commands mapping - all 12 chromatic keys
const ROOT_KEY_COMMANDS = {
  'C': [0x10, 0x30, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00],
  'C#': [0x10, 0x30, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00],
  'Db': [0x10, 0x30, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00],
  'D': [0x10, 0x30, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00],
  'D#': [0x10, 0x30, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00],
  'Eb': [0x10, 0x30, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00],
  'E': [0x10, 0x30, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00],
  'F': [0x10, 0x30, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00],
  'F#': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],
  'Gb': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],
  'G': [0x10, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00, 0x00],
  'G#': [0x10, 0x30, 0x13, 0x01, 0x00, 0x00, 0x00, 0x00],
  'Ab': [0x10, 0x30, 0x13, 0x01, 0x00, 0x00, 0x00, 0x00],
  'A': [0x10, 0x30, 0x23, 0x01, 0x00, 0x00, 0x00, 0x00],
  'A#': [0x10, 0x30, 0x33, 0x01, 0x00, 0x00, 0x00, 0x00],
  'Bb': [0x10, 0x30, 0x33, 0x01, 0x00, 0x00, 0x00, 0x00],
  'B': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00]
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

function lumiChecksum(cmd8) {
  if (!Array.isArray(cmd8) || cmd8.length !== 8) {
    throw new Error('lumiChecksum: cmd8 must be an array of 8 bytes');
  }
  let c = cmd8.length;
  for (const b of cmd8) c = (c * 3 + (b & 0x7F)) & 0xFF;
  return c & 0x7F;
}

function buildFrameFromCmd8(cmd8, deviceId = 0x00) {
  const sum = lumiChecksum(cmd8);
  const body = [0x77, deviceId & 0x7F, ...cmd8, sum];
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

class LumiService {
  constructor() {
    this.midiOut = null;
    this.isLumi = false;
  }

  bindMidiOut(out) {
    this.midiOut = out;
    this.isLumi = !!out && /lumi/i.test(out.name);
    console.log(`🔌 LUMI service bound to: ${out?.name || 'null'}, isLumi: ${this.isLumi}`);
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
    if (!this.midiOut || !this.isLumi) return;

    const rootNote = keySignature.split('-')[0];
    const command = ROOT_KEY_COMMANDS[rootNote];

    if (!command) {
      console.warn(`Unknown root key: ${rootNote}`);
      return;
    }

    try {
      const frame = buildFrameFromCmd8(command);
      this.midiOut.send(frame);
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
}

export const lumiService = new LumiService();