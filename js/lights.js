

// lights.js - abstraction for per-key lighting (ROLI LUMI etc.)

let midiOut = null;
let isLumi = false;

export function bindMidiOut(out) {
  midiOut = out;
  isLumi = !!out && /lumi/i.test(out.name);
}

// Map of simple colors → RGB values (LUMI uses SysEx, but stubbed here)
const COLORS = {
  green: [0, 127, 0],
  red: [127, 0, 0],
  off: [0, 0, 0]
};

export function setKeyColor(note, color) {
  if (!midiOut || !isLumi) return;
  const rgb = COLORS[color] || COLORS.off;
  // TODO: Send proper SysEx to set per-key color on LUMI.
  // Placeholder: just send a short note with velocity-coded color.
  try {
    midiOut.send([0x90, note, Math.max(1, rgb[1])]);
    setTimeout(() => midiOut.send([0x80, note, 0]), 120);
  } catch (e) {
    console.warn("Failed to send key color:", e);
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