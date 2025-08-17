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
- [x] Don't display the target note on the keyboard because it gives away the answer
- [x] Play "ta da" pattern where "da" is the home/root note to emphasize it
- [x] Add option to control resolution frequency (always/half/third of the time) with replay always audible, ta-da at 20% less volume
- [x] Show a progress bar for the current practice/training run that updates as you go with animated progress (based on correct answers, not time)
- [x] Remember settings such as all dropdown selections (key, range, resolution) in `localStorage`
- [x] Make the progress bar section also show how many are left in the current run
- [x] Practice 20 in a row by default and make it configurable, also group all settings and enable these to be shown/hidden (and remember that, too).
- [x] The settings disappear after briefly being shown. It's nicer if that distractive thing doesn't happen
- [ ] Remove the time limit and just show how long the user has been practicing in total (e.g., "Practice time: 3:45"), encourage with feedback to go for 10 minutes at least.
- [ ] The active notes (part of the current key) should be highlighted much more, on the keyboard.
- [ ] Remove the "Wrong answer sound" option and replace it with an "Audible response" that enables us to hear whether we guessed correctly (options: "Correct answer only" / "Always").
- [ ] Make average response times part of the score. Give feedback "FAST!" when the user was fast.
- [ ] In a game, the Start button should be "muted". Other buttons should be disabled, too, such as pause/replay when not playing yet. Change them into nice symbols. 
- [ ] Press a key (note) to start with that note as the root note (keeping the range within C3-C4)
- [ ] Clamp range to valid white-key `min` for keyboard widget
- [ ] Debounce double answers on overlapping note-ons
- [ ] Relegate MIDI in/out to settings modal (to be displayed when no MIDI devices is chosen/remembered or the connection not present)
- [ ] Better error UI when MIDI permission denied

## 🎯 Next (v0.2)
- [ ] Difficulty modes (subset degrees vs. full scale vs. chromatic)
- [ ] Keep track of accuracy & response times in a nice visual way (e.g., bar chart), also, whether you practiced with a streak multiple days in a row.
- [ ] Per-degree stats & response-time histogram
- [ ] Range picker with draggable handles on piano
- [ ] Sampler piano (Tone.Sampler) for acoustic sound

## 🚀 Later
- [ ] Intervals mode; 2–3 note melodic dictation
- [ ] Chord quality rounds (maj/min/dim/aug/7)
- [ ] LED keyboards (e.g., ROLI LUMI) via SysEx (opt-in)
- [ ] React port with `react-piano` (logic stays modular)
- [ ] Cloud profiles & sharing high scores
