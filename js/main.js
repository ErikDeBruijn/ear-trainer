// js/main.js
import { midi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { parseKey, rangeToMidi, randomNoteInKey } from "./theory.js";
import { UI } from "./ui.js";
import { Game } from "./game.js";
import { store } from "./storage.js";

const RESULT_HOLD_MS = 1000; // keep feedback visible before next prompt

const ui = new UI();
const audio = new AudioEngine();

let keySet = parseKey(document.getElementById("key-select").value);
let range = rangeToMidi(document.getElementById("range-select").value);

function pick() { return randomNoteInKey(keySet, range); }

const game = new Game({
    pickNote: pick,
    onTarget: async (m) => {
        ui.clearStatus();
        ui.highlightTarget(m);
        audio.playMidiNote(m, 0.35);
        if (midi.out) midi.sendNote(m, 0.8, 200); // light ping on external keyboard
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
    });
    document.getElementById("range-select").addEventListener("change", (e)=>{
        range = rangeToMidi(e.target.value);
    });

    // Screen keyboard input
    ui.onScreenKey((m)=>handleAnswer(m));

    // MIDI setup
    try {
        const { inputs, outputs } = await midi.enable();
        const inSel = document.getElementById("midi-in");
        const outSel = document.getElementById("midi-out");
        inputs.forEach(p => inSel.append(new Option(p.name, p.id)));
        outputs.forEach(p => outSel.append(new Option(p.name, p.id)));
        inSel.addEventListener("change", e => {
            midi.setInById(e.target.value);
            midi.onNote(ev => { if (ev.type === "on") handleAnswer(ev.note); });
        });
        outSel.addEventListener("change", e => midi.setOutById(e.target.value));
        // auto-select first ports if present
        if (inputs[0]) { inSel.value = inputs[0].id; inSel.dispatchEvent(new Event("change")); }
        if (outputs[0]) { outSel.value = outputs[0].id; outSel.dispatchEvent(new Event("change")); }
    } catch (e) {
        document.getElementById("status").textContent = `MIDI not available: ${e.message}`;
    }
}

function handleAnswer(midiNote) {
    const ok = game.answer(midiNote);
    if (ok == null) return;
    ui.flash(midiNote, ok);
    ui.updateHUD({ score: game.score, streak: game.streak, accuracy: (100*game.correct/game.attempts) });
    setTimeout(() => game.nextRound(), RESULT_HOLD_MS);
}

boot();