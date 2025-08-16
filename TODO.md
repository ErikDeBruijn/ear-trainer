# TODO

## ✅ Done (v0.1)
- [x] Single-page scaffold with modular JS
- [x] WebMidi.js in/out selection
- [x] Tone.js synth prompt
- [x] On-screen keyboard input + target flash
- [x] 60s sprint loop (score, streak, accuracy)
- [x] Local best in storage
- [x] Package scripts for dev/serve/https

## 🧰 Fix/Polish
- [x] Visuals: success/fail glow on keys (CSS) instead of status text
- [ ] Don't display the target note on the keyboard because it gives away the answer
- [ ] Clamp range to valid white-key `min` for keyboard widget
- [ ] Debounce double answers on overlapping note-ons
- [ ] Relegate MIDI in/out to settings modal (to be displayed when no MIDI devices is chosen/remembered or the connection not present)
- [ ] Better error UI when MIDI permission denied

## 🎯 Next (v0.2)
- [ ] Difficulty modes (subset degrees vs. full scale vs. chromatic)
- [ ] Per-degree stats & response-time histogram
- [ ] Range picker with draggable handles on piano
- [ ] Sampler piano (Tone.Sampler) for acoustic sound

## 🚀 Later
- [ ] Intervals mode; 2–3 note melodic dictation
- [ ] Chord quality rounds (maj/min/dim/aug/7)
- [ ] LED keyboards (e.g., ROLI LUMI) via SysEx (opt-in)
- [ ] React port with `react-piano` (logic stays modular)
- [ ] Cloud profiles & sharing high scores