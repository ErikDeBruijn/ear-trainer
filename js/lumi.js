/**
 * LUMI SysEx mini-lib for the ear trainer.
 *
 * Builds full SysEx frames (F0 .. F7) including checksum per RE docs:
 *   frame: F0 00 21 10 77 <device-id> <8-byte command> <checksum> F7
 *   checksum(cmd8): seed=size=8; for each b: c = (c*3 + (b&0x7F)) & 0xFF; return c & 0x7F
 *
 * No runtime globals; pass a Web MIDI Output (MIDIOutput) into the Lumi instance
 * or use the pure builder functions with your own sender.
 */

/** @typedef {import('./types').MIDIOutputLike} MIDIOutputLike */

const MFR = [0xF0, 0x00, 0x21, 0x10]; // ROLI manufacturer id
const START = 0xF0;
const END = 0xF7;

// ---------------- helpers ----------------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v | 0));

/** Compute checksum for an 8-byte command block. */
export function lumiChecksum(cmd8) {
  if (!Array.isArray(cmd8) || cmd8.length !== 8) {
    throw new Error('lumiChecksum: cmd8 must be an array of 8 bytes');
  }
  let c = cmd8.length; // seed = size = 8
  for (const b of cmd8) c = (c * 3 + (b & 0x7F)) & 0xFF;
  return c & 0x7F;
}

/** Build a full SysEx frame from an 8-byte command, given a device id (default 0x00). */
export function buildFrameFromCmd8(cmd8, deviceId = 0x00) {
  const sum = lumiChecksum(cmd8);
  const body = [0x77, deviceId & 0x7F, ...cmd8, sum];
  return [...MFR, ...body, END];
}

// ------------- RGB → 5-byte color encoding -------------
// As documented in the RE notes.
export function encodeColorRGB(r, g, b) {
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  const v1 = ((b & 0x03) << 5) | 0x04;           // 00100 + 2 LSB of B
  const v2 = ((b >> 2) & 0x3F) | (g & 0x01);     // 6 MSB of B + 1 LSB of G
  const v3 = (g >> 1) & 0x7F;                    // middle 7 bits of G
  const v4 = r & 0x7F;                           // lower 7 bits of R
  const v5 = ((r >> 7) & 0x01) | 0x7E;           // MSB of R + 1111110
  return [v1, v2, v3, v4, v5];
}

// ------------- Command builders (8-byte) -------------
export const MODE_MAP = {
  '1':  [0x10, 0x40, 0x02, 0, 0, 0, 0, 0], // single color scale
  '2':  [0x10, 0x40, 0x22, 0, 0, 0, 0, 0], // shows root differently
  'piano': [0x10, 0x40, 0x42, 0, 0, 0, 0, 0],
  'night': [0x10, 0x40, 0x62, 0, 0, 0, 0, 0],
};
export function cmdMode(mode) {
  const m = MODE_MAP[String(mode)];
  if (!m) throw new Error(`Unknown mode: ${mode}`);
  return m.slice();
}

export const SCALE_MAP = {
  'major': [0x10, 0x60, 0x02, 0, 0, 0, 0, 0],
  'minor': [0x10, 0x60, 0x22, 0, 0, 0, 0, 0],
  // Extend with other scales as needed
};
export function cmdScale(name) {
  const s = SCALE_MAP[String(name).toLowerCase()];
  if (!s) throw new Error(`Unknown scale: ${name}`);
  return s.slice();
}

export const ROOT_MAP = {
  'c':  [0x10, 0x30, 0x03, 0x00, 0, 0, 0, 0],
  'f#': [0x10, 0x30, 0x43, 0x01, 0, 0, 0, 0],
  // Extend mapping when we learn more
};
export function cmdRootKey(root) {
  const r = ROOT_MAP[String(root).toLowerCase()];
  if (!r) throw new Error(`Unknown root: ${root}`);
  return r.slice();
}

/** Primary/global color: 10 20 [color5] 03 */
export function cmdPrimaryRGB(r, g, b) {
  return [0x10, 0x20, ...encodeColorRGB(r, g, b), 0x03];
}
/** Root color: 10 30 [color5] 03 */
export function cmdRootRGB(r, g, b) {
  return [0x10, 0x30, ...encodeColorRGB(r, g, b), 0x03];
}

// ------------- High-level builders (full F0..F7) -------------
export function buildMode(mode, deviceId = 0x00)      { return buildFrameFromCmd8(cmdMode(mode), deviceId); }
export function buildScale(name, deviceId = 0x00)     { return buildFrameFromCmd8(cmdScale(name), deviceId); }
export function buildRootKey(root, deviceId = 0x00)   { return buildFrameFromCmd8(cmdRootKey(root), deviceId); }
export function buildPrimaryRGB(r,g,b, deviceId=0x00) { return buildFrameFromCmd8(cmdPrimaryRGB(r,g,b), deviceId); }
export function buildRootRGB(r,g,b, deviceId=0x00)    { return buildFrameFromCmd8(cmdRootRGB(r,g,b), deviceId); }

// ------------- Instance wrapper -------------
export class Lumi {
  /**
   * @param {MIDIOutputLike} output - Web MIDI Output-like object with .send(Uint8Array|number[]) method
   * @param {number} [deviceId=0x00]
   */
  constructor(output, deviceId = 0x00) {
    this.out = output;
    this.deviceId = deviceId & 0x7F;
  }
  setDeviceId(id){ this.deviceId = id & 0x7F; return this; }
  setOutput(out){ this.out = out; return this; }
  send(bytes){ if (!this.out) throw new Error('No MIDI output bound'); this.out.send(bytes); return this; }

  // High-level senders
  sendMode(mode)            { return this.send(buildMode(mode, this.deviceId)); }
  sendScale(name)           { return this.send(buildScale(name, this.deviceId)); }
  sendRootKey(root)         { return this.send(buildRootKey(root, this.deviceId)); }
  sendPrimaryRGB(r,g,b)     { return this.send(buildPrimaryRGB(r,g,b, this.deviceId)); }
  sendRootRGB(r,g,b)        { return this.send(buildRootRGB(r,g,b, this.deviceId)); }
}

// ------------- Utilities -------------
/**
 * Parse a payload hex string (space/comma separated) to 7-bit bytes (no F0/F7, no checksum),
 * wrap into a full frame with checksum and device id.
 */
export function wrapPayloadHexToFrame(hex, deviceId = 0x00) {
  const tokens = String(hex).trim().split(/[^0-9a-fA-F]+/).filter(Boolean);
  const bytes = tokens.map(t => parseInt(t, 16) & 0x7F);
  if (bytes.length !== 8) throw new Error('wrapPayloadHexToFrame expects exactly 8 payload bytes');
  return buildFrameFromCmd8(bytes, deviceId);
}

/** Tiny type shim to help TS-aware IDEs without adding full types */
// eslint-disable-next-line no-unused-vars
export function /** @returns {boolean} */ isMidiOutputLike(obj) {
  return !!obj && typeof obj.send === 'function';
}

export default {
  MFR, START, END,
  lumiChecksum,
  encodeColorRGB,
  cmdMode, cmdScale, cmdRootKey, cmdPrimaryRGB, cmdRootRGB,
  buildMode, buildScale, buildRootKey, buildPrimaryRGB, buildRootRGB,
  MODE_MAP, SCALE_MAP, ROOT_MAP,
  Lumi,
  wrapPayloadHexToFrame,
};
