

// lights.js - abstraction for per-key lighting (ROLI LUMI etc.)

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