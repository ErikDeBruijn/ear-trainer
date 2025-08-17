// js/main.js
import { midi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { parseKey, rangeToMidi, randomNoteInKey } from "./theory.js";
import { UI } from "./ui.js";
import { Game } from "./game.js";
import { store } from "./storage.js";
import { bindMidiOut, setKeyColor, clearAllKeys, setScaleColors, clearRange, sendPrimaryGreen, sendPrimaryRed, setRootKey, setMaxBrightness } from "./lumi.js";

const RESULT_HOLD_MS = 1000; // keep feedback visible before next prompt

const ui = new UI();
const audio = new AudioEngine();

// Load saved settings from localStorage
const savedSettings = store.load();

// Initialize dropdowns with saved values or defaults
function initializeSettings() {
    const keySelect = document.getElementById("key-select");
    const rangeSelect = document.getElementById("range-select");
    const resolutionSelect = document.getElementById("resolution-frequency");
    const audibleResponseSelect = document.getElementById("audible-response");
    const tonicSelect = document.getElementById("tonic-mode");
    const practiceTargetSelect = document.getElementById("practice-target");

    // Restore saved values
    if (savedSettings.keySelect) keySelect.value = savedSettings.keySelect;
    if (savedSettings.rangeSelect) rangeSelect.value = savedSettings.rangeSelect;
    if (savedSettings.resolutionFrequency) resolutionSelect.value = savedSettings.resolutionFrequency;
    if (savedSettings.audibleResponse) audibleResponseSelect.value = savedSettings.audibleResponse;
    if (savedSettings.tonicMode) tonicSelect.value = savedSettings.tonicMode;
    if (savedSettings.practiceTarget) practiceTargetSelect.value = savedSettings.practiceTarget;

    // Initialize settings panel state
    initializeSettingsPanel();
}

// Initialize settings panel collapse/expand state
function initializeSettingsPanel() {
    const settingsToggle = document.getElementById("settings-toggle");
    const settingsPanel = document.getElementById("settings-panel");
    const settingsIcon = document.querySelector(".settings-toggle-icon");

    // Load saved state (default to collapsed)
    const isExpanded = !savedSettings.settingsCollapsed;

    if (isExpanded) {
        settingsPanel.classList.add("expanded");
        settingsToggle.classList.remove("collapsed");
        settingsIcon.textContent = "▼";
    } else {
        settingsToggle.classList.add("collapsed");
        settingsIcon.textContent = "▶";
    }

    // Add click handler
    settingsToggle.addEventListener("click", () => {
        const isCurrentlyExpanded = settingsPanel.classList.contains("expanded");

        if (isCurrentlyExpanded) {
            // Collapse
            settingsPanel.classList.remove("expanded");
            settingsToggle.classList.add("collapsed");
            settingsIcon.textContent = "▶";
        } else {
            // Expand
            settingsPanel.classList.add("expanded");
            settingsToggle.classList.remove("collapsed");
            settingsIcon.textContent = "▼";
        }

        // Save state
        const currentSettings = store.load();
        store.save({
            ...currentSettings,
            settingsCollapsed: isCurrentlyExpanded
        });
    });
}

// Initialize settings before parsing values
initializeSettings();

// Helper function to save current settings to localStorage
function saveSettings() {
    const currentSettings = store.load();
    const newSettings = {
        ...currentSettings,
        keySelect: document.getElementById("key-select").value,
        rangeSelect: document.getElementById("range-select").value,
        resolutionFrequency: document.getElementById("resolution-frequency").value,
        audibleResponse: document.getElementById("audible-response").value,
        tonicMode: document.getElementById("tonic-mode").value,
        practiceTarget: document.getElementById("practice-target").value
    };
    store.save(newSettings);
}

let keySet = parseKey(document.getElementById("key-select").value);
let range = rangeToMidi(document.getElementById("range-select").value);
ui.setKeyboardRange(range[0], range[1]);
setScaleColors(keySet, range[0], range[1]);
let audibleResponse = document.getElementById("audible-response").value || "correct-only";
let tonicMode = document.getElementById("tonic-mode").value || "before-target";
let resolutionFrequency = parseFloat(document.getElementById("resolution-frequency").value) || 1.0;
let practiceTarget = parseInt(document.getElementById("practice-target").value) || 20;

function pick() { return randomNoteInKey(keySet, range); }

function updateProgressBar(correctAnswers) {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (progressFill) {
        // Calculate progress as percentage
        const progress = (correctAnswers / practiceTarget) * 100;
        progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    if (progressText) {
        const remaining = Math.max(0, practiceTarget - correctAnswers);
        progressText.textContent = `(${correctAnswers}/${practiceTarget} - ${remaining} left)`;
    }
}

function resetProgressBar() {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    if (progressFill) {
        progressFill.style.width = "0%";
    }

    if (progressText) {
        progressText.textContent = `(0/${practiceTarget} - ${practiceTarget} left)`;
    }
}

const game = new Game({
    pickNote: pick,
    onTarget: async (m) => {
        ui.clearStatus();
        if (tonicMode === "before-target") {
            const tonic = keySet[0] + Math.floor(m / 12) * 12;
            await audio.playTonicThenTarget(tonic, m, 0.5, 0.3, 0.35, resolutionFrequency);
        } else {
            // Store current target for replay (no tonic in this mode)
            audio.currentTonic = null;
            audio.currentTarget = m;
            audio.currentResolutionPlayed = false;
            // Play target note but don't send to MIDI out
            audio.playMidiNote(m, 0.35, false);
        }
    },
    checkAnswer: (t, a) => t === a,
    onTick: (timeString) => {
        ui.updateHUD({ timer: timeString });
        // Encourage user to practice for at least 10 minutes
        const practiceSeconds = game.practiceTime;
        if (practiceSeconds === 600) { // 10 minutes
            ui.flash(null, true);
            ui.updateStatus("Great! You've been practicing for 10 minutes! 🎉");
        }
    },
    onEnd: (sum) => {
        ui.updateHUD({ accuracy: sum.accuracy });
        store.save({ best: Math.max(store.load().best||0, sum.score) });

        // Provide encouragement feedback based on practice time
        const practiceMinutes = Math.floor(game.practiceTime / 60);
        let encouragementMessage = "Practice session complete! ";
        if (practiceMinutes >= 10) {
            encouragementMessage += "Excellent work - you practiced for " + practiceMinutes + " minutes! 🌟";
        } else if (practiceMinutes >= 5) {
            encouragementMessage += "Good job! Try to reach 10 minutes next time. 💪";
        } else {
            encouragementMessage += "Great start! Aim for at least 10 minutes of practice. 🎯";
        }
        ui.updateStatus(encouragementMessage);

        // Reset progress bar after a short delay to show completion
        setTimeout(() => resetProgressBar(), 2000);
    }
});

async function boot() {
    // resume audio on user gesture
    document.getElementById("start").addEventListener("click", async () => {
        await audio.resume();
        setMaxBrightness(); // Set maximum brightness when game starts
        resetProgressBar(); // Reset progress bar for new session
        game.start();
    });
    document.getElementById("pause").addEventListener("click", () => game.pause());
    document.getElementById("replay").addEventListener("click", async () => {
        await audio.resume();
        audio.replayCurrentNotes();
    });

    // UI selects
    document.getElementById("key-select").addEventListener("change", (e)=>{
        keySet = parseKey(e.target.value);
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
        setRootKey(e.target.value);
        saveSettings();
    });
    document.getElementById("range-select").addEventListener("change", (e)=>{
        range = rangeToMidi(e.target.value);
        ui.setKeyboardRange(range[0], range[1]);
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
        saveSettings();
    });

    // Wrong answer mode selector
    const wrongSel = document.getElementById("wrong-mode");
    if (wrongSel) {
      wrongSel.addEventListener("change", e => { 
        wrongMode = e.target.value; 
        saveSettings();
      });
      wrongMode = wrongSel.value || "silent";
    }

    // Tonic reference mode selector
    const tonicSel = document.getElementById("tonic-mode");
    if (tonicSel) {
      tonicSel.addEventListener("change", e => { 
        tonicMode = e.target.value; 
        saveSettings();
      });
      tonicMode = tonicSel.value || "before-target";
    }

    // Resolution frequency selector
    const resolutionSel = document.getElementById("resolution-frequency");
    if (resolutionSel) {
      resolutionSel.addEventListener("change", e => { 
        resolutionFrequency = parseFloat(e.target.value); 
        saveSettings();
      });
      resolutionFrequency = parseFloat(resolutionSel.value) || 1.0;
    }

    // Practice target selector
    const practiceTargetSel = document.getElementById("practice-target");
    if (practiceTargetSel) {
      practiceTargetSel.addEventListener("change", e => { 
        practiceTarget = parseInt(e.target.value); 
        resetProgressBar(); // Update progress bar display with new target
        saveSettings();
      });
      practiceTarget = parseInt(practiceTargetSel.value) || 20;
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
            setRootKey(document.getElementById("key-select").value);
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
            setRootKey(document.getElementById("key-select").value);
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
      // Update progress bar based on correct answers
      updateProgressBar(game.correct);
      // Check if practice target is reached
      if (game.correct >= practiceTarget) {
        setTimeout(() => game.finish(), RESULT_HOLD_MS);
      } else {
        // Only move to next round if the answer is correct and target not reached
        setTimeout(() => game.nextRound(), RESULT_HOLD_MS);
      }
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
}

boot();
