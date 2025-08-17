// js/main.js
import { midi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { parseKey, rangeToMidi, randomNoteInKey } from "./theory.js";
import { UI } from "./ui.js";
import { Game } from "./game.js";
import { store } from "./storage.js";
import { bindMidiOut, setKeyColor, clearAllKeys, setScaleColors, setPausedColors, clearRange, sendPrimaryGreen, sendPrimaryRed, setRootKey, setMaxBrightness, buildPrimaryRGB } from "./lumi.js";

const RESULT_HOLD_MS = 1000; // keep feedback visible before next prompt

const ui = new UI();
const audio = new AudioEngine();

// Load saved settings from localStorage
const savedSettings = store.load();

// Initialize dropdowns with saved values or defaults
function initializeSettings() {
    const keySelect = document.getElementById("key-select");
    const rangeSelect = document.getElementById("range-select");
    const audibleResponseSelect = document.getElementById("audible-response");
    const homeNoteSelect = document.getElementById("home-note-frequency");
    const practiceTargetSelect = document.getElementById("practice-target");

    // Restore saved values
    if (savedSettings.keySelect) keySelect.value = savedSettings.keySelect;
    if (savedSettings.rangeSelect) rangeSelect.value = savedSettings.rangeSelect;
    if (savedSettings.audibleResponse) audibleResponseSelect.value = savedSettings.audibleResponse;
    if (savedSettings.homeNoteFrequency) homeNoteSelect.value = savedSettings.homeNoteFrequency;
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
        audibleResponse: document.getElementById("audible-response").value,
        homeNoteFrequency: document.getElementById("home-note-frequency").value,
        practiceTarget: document.getElementById("practice-target").value
    };
    store.save(newSettings);
}

let keySet = parseKey(document.getElementById("key-select").value);
let range = rangeToMidi(document.getElementById("range-select").value);
ui.setKeyboardRange(range[0], range[1]);
setScaleColors(keySet, range[0], range[1]);
let audibleResponse = document.getElementById("audible-response").value || "correct-only";
let homeNoteFrequency = document.getElementById("home-note-frequency").value || "always";
let practiceTarget = parseInt(document.getElementById("practice-target").value) || 10;

function pick() { return randomNoteInKey(keySet, range); }

function shouldPlayHomeNote(noteCount, frequency) {
    switch (frequency) {
        case "always": return true;
        case "every-2": return noteCount % 2 === 1;
        case "every-3": return noteCount % 3 === 1;
        case "every-4": return noteCount % 4 === 1;
        case "first-only": return noteCount === 1;
        case "never": return false;
        default: return true;
    }
}

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
        if (shouldPlayHomeNote(game.noteCount, homeNoteFrequency)) {
            const tonic = keySet[0] + Math.floor(m / 12) * 12;
            await audio.playTonicThenTarget(tonic, m, 0.5, 0.3, 0.35, 1.0);
        } else {
            // Store current target for replay (no tonic in this mode)
            audio.currentTonic = null;
            audio.currentTarget = m;
            audio.currentResolutionPlayed = false;
            // Play target note but don't send to MIDI out
            audio.playMidiNote(m, 0.35, false);
        }
        // Start timing after audio finishes playing
        game.targetStartTime = Date.now();
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

        // Show confetti celebration
        ui.showConfetti();

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

        // Reset button to Start state when game ends
        const startPauseBtn = document.getElementById("start-pause");
        startPauseBtn.textContent = "▶";
        startPauseBtn.className = "primary";
        
        // Set grey lighting for end state
        if (midi.out) {
            const frame = buildPrimaryRGB(64, 64, 64); // grey
            midi.out.send(frame);
        }
        setPausedColors(range[0], range[1]);

        // Reset progress bar after a short delay to show completion
        setTimeout(() => resetProgressBar(), 2000);
    }
});

// Initialize timer display with stored daily practice time
const dailyPracticeTime = store.getDailyPracticeTime();
const minutes = Math.floor(dailyPracticeTime / 60);
const seconds = dailyPracticeTime % 60;
const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
ui.updateHUD({ timer: timeString });

async function boot() {
    // resume audio on user gesture
    const startPauseBtn = document.getElementById("start-pause");
    
    startPauseBtn.addEventListener("click", async () => {
        if (game.state === "idle" || game.state === "paused" || game.state === "ended") {
            // Starting the game
            await audio.resume();
            setMaxBrightness(); // Set maximum brightness when game starts
            resetProgressBar(); // Reset progress bar for new session
            game.start();
            // Set bright blue lighting to indicate "You're UP!"
            if (midi.out) {
                const frame = buildPrimaryRGB(0, 1, 255); // bright blue
                midi.out.send(frame);
            }
            setScaleColors(keySet, range[0], range[1]);
            startPauseBtn.textContent = "⏹";
            startPauseBtn.className = "secondary";
        } else {
            // Stopping the game
            game.pause();
            // Set grey lighting for paused state
            if (midi.out) {
                const frame = buildPrimaryRGB(64, 64, 64); // grey
                midi.out.send(frame);
            }
            setPausedColors(range[0], range[1]);
            startPauseBtn.textContent = "▶";
            startPauseBtn.className = "primary";
        }
    });
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

    // Audible response selector
    const audibleResponseSel = document.getElementById("audible-response");
    if (audibleResponseSel) {
      audibleResponseSel.addEventListener("change", e => { 
        audibleResponse = e.target.value; 
        saveSettings();
      });
      audibleResponse = audibleResponseSel.value || "correct-only";
    }

    // Home note frequency selector
    const homeNoteSel = document.getElementById("home-note-frequency");
    if (homeNoteSel) {
      homeNoteSel.addEventListener("change", e => { 
        homeNoteFrequency = e.target.value; 
        saveSettings();
      });
      homeNoteFrequency = homeNoteSel.value || "always";
    }

    // Practice target selector
    const practiceTargetSel = document.getElementById("practice-target");
    if (practiceTargetSel) {
      practiceTargetSel.addEventListener("change", e => { 
        practiceTarget = parseInt(e.target.value); 
        resetProgressBar(); // Update progress bar display with new target
        saveSettings();
      });
      practiceTarget = parseInt(practiceTargetSel.value) || 10;
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
            midi.onNote(ev => { 
                if (ev.type === "on") {
                    handleAnswer(ev.note);
                } else if (ev.type === "off") {
                    handleNoteOff(ev.note);
                }
            });
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
        if (inputs[0]) { 
            inSel.value = inputs[0].id; 
            inSel.dispatchEvent(new Event("change")); 
        }
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
    // Auto-start game if idle when key is pressed
    if (game.state === "idle") {
        document.getElementById("start-pause").click();
        return;
    }
    
    const ok = game.answer(midiNote);
    if (ok == null) return;
    
    // Get the latest response time for feedback
    const responseTime = game.responseTimes[game.responseTimes.length - 1];
    const isFast = responseTime < 1500; // Less than 1.5 seconds is considered fast
    
    // Show fast response feedback for correct answers instead of normal flash
    if (ok && isFast) {
        ui.statusEl.textContent = "FAST! 🚀";
        ui.statusEl.className = "status status-pill ok";
        ui.statusEl.setAttribute("aria-live", "polite");
    } else {
        ui.flash(midiNote, ok);
    }
    ui.flashScreen(ok ? "ok" : "bad");
    
    if (ok) {
      if (midi.out) midi.sendNote(midiNote, 0.9, 180); // success ping
      // Play sustained audible feedback for correct answers
      if (audibleResponse === "correct-only" || audibleResponse === "always") {
        audio.startSustainedNote(midiNote, -3); // Slightly quieter than default
      }
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
      if (audibleResponse === "always") {
        audio.startSustainedNote(midiNote, -6); // Quieter for wrong answers
      }
      setKeyColor(midiNote, "red");
      sendPrimaryRed();
    }
    // brief flash, then restore the scale coloring
    setTimeout(() => {
        // Reset primary color to bright blue (default scale color)
        if (midi.out) {
            const frame = buildPrimaryRGB(0, 1, 255); // bright blue
            midi.out.send(frame);
        }
        setScaleColors(keySet, range[0], range[1]);
    }, 300);
    ui.updateHUD({ score: game.score, streak: game.streak, accuracy: (100*game.correct/game.attempts) });
}

function handleNoteOff(midiNote) {
    // Stop sustained audible feedback when note is released
    audio.stopSustainedNote(midiNote);
}

boot();
