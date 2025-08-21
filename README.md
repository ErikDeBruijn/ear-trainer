# Web-based Ear Trainer (with Advanced MIDI Support)

Professional ear trainer with intelligent MIDI device management, sustained note feedback, and LUMI keyboard integration. Features natural game flow that respects musical expression while providing comprehensive practice tools.

![Ear Trainer Interface](ear-trainer-ui.png)

## Quick start
[Try it live](https://erikdebruijn.github.io/ear-trainer/)

## Stack
- **Audio Engine**: [Tone.js] for prompts and sustained feedback
- **MIDI I/O**: [WebMidi.js] with multi-device support and device type detection
- **UI Piano**: Custom responsive keyboard with visual feedback
- **LUMI Integration**: Complete SysEx protocol for LED lighting and challenge routing

[Tone.js]: https://tonejs.github.io/
[WebMidi.js]: https://webmidijs.org/docs/getting-started/basics

## Features (v0.1)

### Core Gameplay
- **Natural game flow**: Immediate progression after correct answers with sustained note support
- **Flexible practice sessions**: Configurable targets (10-100 notes) with real-time progress
- **Key & range selection**: Major/minor scales (1-2 octave ranges) with visual highlighting
- **Dual input methods**: MIDI keyboard + responsive on-screen keyboard
- **Musical audio feedback**: Tonic-target patterns with configurable resolution frequency
- **Challenge note separation**: Audio cues route only to non-LUMI devices (no spoilers!)

### Advanced MIDI Features
- **Multi-device management**: Select multiple MIDI inputs and outputs simultaneously  
- **Intelligent device detection**: Auto-classifies melodic, drum, and controller devices
- **LUMI auto-selection**: Automatically detects and configures ROLI LUMI keyboards
- **Sustained note feedback**: Proper note-on/off handling for realistic playing feel
- **Device persistence**: MIDI selections remembered across browser sessions
- **Visual device indicators**: Bluetooth icons and device type classification

### User Experience  
- **Immediate responsiveness**: Keys sustain naturally until released
- **Quick setup**: Press any key to begin (auto-selects key from root note)
- **Responsive settings**: Collapsible panel with auto-wrapping controls
- **Rich feedback**: Screen flashes, key highlighting, LED lighting, and audio cues
- **Speed recognition**: "FAST!" feedback for quick responses (<1.5s)
- **Session completion**: Confetti effects and achievement recognition

### Practice & Analytics
- **Daily practice tracking**: Persistent time accumulation across sessions
- **Always-on audio**: Sustained feedback for all key presses (correct and incorrect)
- **Scale visualization**: Active notes highlighted on keyboard and LUMI devices
- **Performance metrics**: Response time tracking with accuracy statistics
- **Progress motivation**: 10-minute daily milestone with encouraging feedback

### Technical Architecture
- **Zero-build ES6**: Direct module serving with no compilation step
- **Persistent storage**: Settings, device selections, and practice time in localStorage
- **Responsive layout**: Auto-wrapping controls prevent horizontal scrolling
- **Modern UI**: Dark theme with visual borders and accent color feedback
- **Modular design**: Separate audio, MIDI, game, and UI modules for maintainability

## Development Commands

```bash
# Local development server
npm run serve           # http-server on port 8080
npm run dev            # alias for serve

# HTTPS tunnel for MIDI permissions (requires ngrok)
npm run https          # opens ngrok tunnel to localhost:8080

# Code formatting
npm run format         # prettier -w .
```