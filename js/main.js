// js/main.js
import { midi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { parseKey, rangeToMidi, randomNoteInKey } from "./theory.js";
import { UI } from "./ui.js";
import { Game } from "./game.js";
import { store } from "./storage.js";
import { bindMidiOut, setKeyColor, clearAllKeys, setScaleColors, clearRange, sendPrimaryGreen, sendPrimaryRed } from "./lights.js";

const RESULT_HOLD_MS = 1000; // keep feedback visible before next prompt

const ui = new UI();
const audio = new AudioEngine();

let keySet = parseKey(document.getElementById("key-select").value);
let range = rangeToMidi(document.getElementById("range-select").value);
ui.setKeyboardRange(range[0], range[1]);
setScaleColors(keySet, range[0], range[1]);
let wrongMode = "silent";

function pick() { return randomNoteInKey(keySet, range); }

const game = new Game({
    pickNote: pick,
    onTarget: async (m) => {
        ui.clearStatus();
        audio.playMidiNote(m, 0.35);
    },
    checkAnswer: (t, a) => t === a,
    onTick: (sec) => ui.updateHUD({ timer: sec }),
    onEnd: (sum) => {
        ui.updateHUD({ accuracy: sum.accuracy });
        store.save({ best: Math.max(store.load().best||0, sum.score) });
    }
});

async function boot() {
    // resume audio on user gesture
    document.getElementById("start").addEventListener("click", async () => {
        await audio.resume();
        game.start();
    });
    document.getElementById("pause").addEventListener("click", () => game.pause());

    // UI selects
    document.getElementById("key-select").addEventListener("change", (e)=>{
        keySet = parseKey(e.target.value);
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
    });
    document.getElementById("range-select").addEventListener("change", (e)=>{
        range = rangeToMidi(e.target.value);
        ui.setKeyboardRange(range[0], range[1]);
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
    });

    // Wrong answer mode selector
    const wrongSel = document.getElementById("wrong-mode");
    if (wrongSel) {
      wrongSel.addEventListener("change", e => { wrongMode = e.target.value; });
      wrongMode = wrongSel.value || "silent";
    }

    // Screen keyboard input
    ui.onScreenKey((m)=>handleAnswer(m));

    // MIDI setup
    try {
        const { inputs, outputs } = await midi.enable();
        const inSel = document.getElementById("midi-in");
        const outSel = document.getElementById("midi-out");
        inputs.forEach(p => inSel.append(new Option(p.name, p.id)));
        outputs.forEach(p => outSel.append(new Option(p.name, p.id)));
        inSel.addEventListener("change", (e) => {
            midi.setInById(e.target.value);
            midi.onNote(ev => { if (ev.type === "on") handleAnswer(ev.note); });
        });
        outSel.addEventListener("change", (e) => {
          midi.setOutById(e.target.value);
          bindMidiOut(midi.out);
          if (midi.out) {
            clearRange(range[0], range[1]);
            setScaleColors(keySet, range[0], range[1]);
          }
        });
        // auto-select first ports if present
        if (inputs[0]) { inSel.value = inputs[0].id; inSel.dispatchEvent(new Event("change")); }
        if (outputs[0]) {
          outSel.value = outputs[0].id;
          outSel.dispatchEvent(new Event("change"));
          bindMidiOut(midi.out);
          if (midi.out) {
            clearRange(range[0], range[1]);
            setScaleColors(keySet, range[0], range[1]);
          }
        }
    } catch (e) {
        document.getElementById("status").textContent = `MIDI not available: ${e.message}`;
    }
}

function handleAnswer(midiNote) {
    const ok = game.answer(midiNote);
    if (ok == null) return;
    ui.flash(midiNote, ok);
    ui.flashScreen(ok ? "ok" : "bad");
    if (ok) {
      if (midi.out) midi.sendNote(midiNote, 0.9, 180); // success ping
      setKeyColor(midiNote, "green");
      sendPrimaryGreen();
    } else {
      if (wrongMode === "play-pressed") {
        audio.playMidiNote(midiNote, 0.4);
      }
      setKeyColor(midiNote, "red");
      sendPrimaryRed();
    }
    // brief flash, then restore the scale coloring
    setTimeout(() => setScaleColors(keySet, range[0], range[1]), 300);
    ui.updateHUD({ score: game.score, streak: game.streak, accuracy: (100*game.correct/game.attempts) });
    setTimeout(() => game.nextRound(), RESULT_HOLD_MS);
}

boot();