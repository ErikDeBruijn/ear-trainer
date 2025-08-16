# Web-based Ear Trainer (with MIDI support)

Single-page ear trainer that plays a target note and checks your answer from a MIDI keyboard (or on-screen). Minimal, modular, ROLI-friendly.

## Quick start
[Try it live](https://erikdebruijn.github.io/ear-trainer/)

## Stack
- Audio: [Tone.js] for prompts
- MIDI I/O: [WebMidi.js] (MIDI in/out, MPE-safe by listening on all channels)
- UI piano: `<webaudio-keyboard>` from webaudio-controls

[Tone.js]: https://tonejs.github.io/
[WebMidi.js]: https://webmidijs.org/docs/getting-started/basics
[webaudio-controls keyboard]: https://g200kg.github.io/webaudio-controls/docs/detailspecs.html

## Features (v0.1)
- 60s sprint mode
- Key & range selection (major/natural minor)
- MIDI-in answer, MIDI-out ping of the target
- On-screen keyboard input + visual flash on target
- Score, streak, accuracy, local best in `localStorage`

```bash
# serve locally
npm run dev
# or Node server
npm run serve
# open https tunnel for Web MIDI permission prompts
npm run https