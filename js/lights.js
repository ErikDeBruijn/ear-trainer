

// lights.js - abstraction for per-key lighting (ROLI LUMI etc.)

import { buildPrimaryRGB, buildFrameFromCmd8, buildBrightness } from './lumi.js';

let midiOut = null;
let isLumi = false;

export function bindMidiOut(out) {
  midiOut = out;
  isLumi = !!out && /lumi/i.test(out.name);
}

// Map of simple colors → RGB values (used in SysEx stub for LUMI)
const COLORS = {
  green: [0, 127, 0],
  red: [127, 0, 0],
  white: [127, 127, 127],
  darkred: [64, 0, 0],
  off: [0, 0, 0]
};

export function setKeyColor(note, color) {
  if (!midiOut || !isLumi) return;
  const rgb = COLORS[color] || COLORS.off;
  // Construct SysEx: [F0, <ROLI ID>, <command>, note, r, g, b, F7]
  // Actual spec TBD — this is a scaffold only.
  const sysex = [
    0xF0,
    0x00, 0x21, 0x10, // ROLI manufacturer ID
    0x78,             // hypothetical command for key light
    note & 0x7F,
    rgb[0] & 0x7F,
    rgb[1] & 0x7F,
    rgb[2] & 0x7F,
    0xF7
  ];
  try {
    midiOut.send(sysex);
  } catch (e) {
    console.warn("Failed to send SysEx key color:", e);
  }
}

export function setScaleColors(keySet, low, highExclusive) {
  if (!midiOut || !isLumi) return;
  try {
    for (let m = low; m < highExclusive; m++) {
      const inScale = keySet.includes(m % 12);
      setKeyColor(m, inScale ? "white" : "darkred");
    }
  } catch (e) {
    console.warn("Failed to set scale colors:", e);
  }
}

export function clearRange(low, highExclusive) {
  if (!midiOut) return;
  try {
    for (let m = low; m < highExclusive; m++) {
      setKeyColor(m, "off");
    }
  } catch (e) {
    console.warn("Failed to clear range:", e);
  }
}

export function clearAllKeys() {
  if (!midiOut) return;
  try {
    for (let n = 0; n < 128; n++) {
      midiOut.send([0x80, n, 0]);
    }
  } catch (e) {
    console.warn("Failed to clear keys:", e);
  }
}

function sendPrimaryColor(r, g, b) {
  if (!midiOut || !isLumi) return;
  try {
    const frame = buildPrimaryRGB(r, g, b);
    midiOut.send(frame);
  } catch (e) {
    console.warn("Failed to send primary color:", e);
  }
}

export function sendPrimaryGreen() {
  sendPrimaryColor(0, 255, 0);
  setTimeout(() => sendPrimaryColor(127, 127, 127), 350); // Return to white
}

export function sendPrimaryRed() {
  sendPrimaryColor(255, 0, 0);
  setTimeout(() => sendPrimaryColor(127, 127, 127), 350); // Return to white
}

// Root key commands mapping - all 12 chromatic keys
const ROOT_KEY_COMMANDS = {
  'C': [0x10, 0x30, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00],   // C (confirmed)
  'C#': [0x10, 0x30, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00],  // C#/Db
  'Db': [0x10, 0x30, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00],  // Db (same as C#)
  'D': [0x10, 0x30, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00],   // D
  'D#': [0x10, 0x30, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00],  // D#/Eb
  'Eb': [0x10, 0x30, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00],  // Eb (same as D#)
  'E': [0x10, 0x30, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00],   // E
  'F': [0x10, 0x30, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00],   // F
  'F#': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],  // F# (confirmed)
  'Gb': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00],  // Gb (same as F#)
  'G': [0x10, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00, 0x00],   // G
  'G#': [0x10, 0x30, 0x13, 0x01, 0x00, 0x00, 0x00, 0x00],  // G#/Ab
  'Ab': [0x10, 0x30, 0x13, 0x01, 0x00, 0x00, 0x00, 0x00],  // Ab (same as G#)
  'A': [0x10, 0x30, 0x23, 0x01, 0x00, 0x00, 0x00, 0x00],   // A
  'A#': [0x10, 0x30, 0x33, 0x01, 0x00, 0x00, 0x00, 0x00],  // A#/Bb
  'Bb': [0x10, 0x30, 0x33, 0x01, 0x00, 0x00, 0x00, 0x00],  // Bb (same as A#)
  'B': [0x10, 0x30, 0x43, 0x01, 0x00, 0x00, 0x00, 0x00]    // B
};

export function setRootKey(keySignature) {
  if (!midiOut || !isLumi) return;

  // Extract root note from key signature like "C-major" or "A-minor"
  const rootNote = keySignature.split('-')[0];
  const command = ROOT_KEY_COMMANDS[rootNote];

  if (!command) {
    console.warn(`Unknown root key: ${rootNote}`);
    return;
  }

  try {
    const frame = buildFrameFromCmd8(command);
    midiOut.send(frame);
  } catch (e) {
    console.warn("Failed to set root key:", e);
  }
}

export function setBrightness(level) {
  if (!midiOut || !isLumi) return;

  try {
    const frame = buildBrightness(level);
    midiOut.send(frame);
  } catch (e) {
    console.warn("Failed to set brightness:", e);
  }
}

export function setMaxBrightness() {
  setBrightness('100');
}
