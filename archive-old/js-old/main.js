// js/main.js
import { midi } from "./midi.js";
import { AudioEngine } from "./audio.js";
import { parseKey, rangeToMidi, randomNoteInKey, midiNoteToKeySignature } from "./theory.js";
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
    const homeNoteSelect = document.getElementById("home-note-frequency");
    const practiceTargetSelect = document.getElementById("practice-target");

    // Restore saved values
    if (savedSettings.keySelect) keySelect.value = savedSettings.keySelect;
    if (savedSettings.rangeSelect) rangeSelect.value = savedSettings.rangeSelect;
    if (savedSettings.homeNoteFrequency) homeNoteSelect.value = savedSettings.homeNoteFrequency;
    if (savedSettings.practiceTarget) practiceTargetSelect.value = savedSettings.practiceTarget;

    const volumeSlider = document.getElementById("volume-slider");
    if (savedSettings.volume !== undefined) volumeSlider.value = savedSettings.volume;

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
        homeNoteFrequency: document.getElementById("home-note-frequency").value,
        practiceTarget: document.getElementById("practice-target").value,
        volume: document.getElementById("volume-slider").value
        // MIDI device settings are now saved separately via checkbox handlers
    };
    store.save(newSettings);
}

let keySet = parseKey(document.getElementById("key-select").value);
let range = rangeToMidi(document.getElementById("range-select").value);
ui.setKeyboardRange(range[0], range[1]);
setScaleColors(keySet, range[0], range[1]);
ui.highlightScaleNotes(keySet, range[0], range[1]);
// Always play sustained audible feedback - simplified from audible response setting
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
        console.log(`Target note: MIDI ${m}, note class: ${m % 12}, keySet:`, keySet, `in key: ${keySet.includes(m % 12)}`);
        ui.clearStatus();
        if (shouldPlayHomeNote(game.noteCount, homeNoteFrequency)) {
            const tonic = keySet[0] + Math.floor(m / 12) * 12;
            await audio.playTonicThenTarget(tonic, m, 0.5, 0.3, 0.35, 1.0);
        } else {
            // Store current target for replay (no tonic in this mode)
            audio.currentTonic = null;
            audio.currentTarget = m;
            audio.currentResolutionPlayed = false;
            // Play target note as challenge (to non-LUMI devices only)
            audio.playMidiNote(m, 0.35, true, 0, true);
        }
        // Start timing after audio finishes playing
        game.targetStartTime = Date.now();
    },
    checkAnswer: (t, a) => t === a,
    onTick: (timeString) => {
        ui.updateHUD({ timer: timeString });
        // Encourage user to practice for at least 10 minutes
        const practiceSeconds = store.getDailyPracticeTime();
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
        const practiceMinutes = Math.floor(store.getDailyPracticeTime() / 60);
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
        
        // Educational logging for music theory learning
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const keyNotes = keySet.map(noteClass => noteNames[noteClass]);
        console.log(`Key: ${e.target.value}`);
        console.log(`Scale degrees (note classes):`, keySet);
        console.log(`Note names in this key:`, keyNotes);
        
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
        setRootKey(e.target.value);
        ui.highlightScaleNotes(keySet, range[0], range[1]);
        saveSettings();
    });
    document.getElementById("range-select").addEventListener("change", (e)=>{
        range = rangeToMidi(e.target.value);
        ui.setKeyboardRange(range[0], range[1]);
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
        ui.highlightScaleNotes(keySet, range[0], range[1]);
        saveSettings();
    });

    // Audible response setting removed - always provide sustained feedback

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

    // Volume slider
    const volumeSlider = document.getElementById("volume-slider");
    if (volumeSlider) {
        volumeSlider.addEventListener("input", e => {
            const volume = parseInt(e.target.value);
            audio.setMasterVolume(volume);
            saveSettings();
        });
        // Set initial volume
        const initialVolume = parseInt(volumeSlider.value);
        audio.setMasterVolume(initialVolume);
    }

    // Screen keyboard input
    ui.onScreenKey((m)=>handleAnswer(m), (m)=>handleNoteOff(m));

    // Helper function to create device type icons
    function createDeviceTypeIcon(deviceType) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', `device-type-icon ${deviceType}`);
        icon.setAttribute('viewBox', '0 0 24 24');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        switch (deviceType) {
            case 'melodic':
                // Piano keys icon
                path.setAttribute('d', 'M5 3v18h2V3H5zm4 0v18h2V3H9zm4 0v18h2V3h-2zm4 0v18h2V3h-2z M6 3h1v10H6V3zm4 0h1v10h-1V3zm4 0h1v10h-1V3z');
                icon.setAttribute('title', 'Melodic instrument (suitable for ear training)');
                break;
            case 'drum':
                // Drum icon
                path.setAttribute('d', 'M12 3C8.13 3 5 6.13 5 10v6c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-6c0-3.87-3.13-7-7-7zm5 13H7v-6c0-2.76 2.24-5 5-5s5 2.24 5 5v6zm-5-9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z');
                icon.setAttribute('title', 'Drum/percussion device');
                break;
            case 'controller':
                // Controller/mixer icon
                path.setAttribute('d', 'M3 17h18v2H3zm0-4h18v2H3zm0-4h18v2H3zm0-4h18v2H3z M21 7h-4v4h4V7zm-6 0h-4v4h4V7zm-6 0H5v4h4V7z');
                icon.setAttribute('title', 'MIDI controller');
                break;
            default:
                return null;
        }
        
        icon.appendChild(path);
        return icon;
    }

    // Helper function to update MIDI device interface
    function updateMidiInterface(changedPort, changeType) {
        updateMidiInputs(changedPort, changeType);
        updateMidiOutputs(changedPort, changeType);
    }

    function updateMidiInputs(changedPort, changeType) {
        const inputList = document.getElementById("midi-input-list");
        const savedSettings = store.load();
        let selectedInputs = savedSettings.midiInputDevices || [];
        
        // Handle device changes
        if (changedPort && changeType) {
            if (changeType === 'connected' && changedPort.type === 'input') {
                // Only auto-select newly connected melodic devices
                const deviceType = midi.detectDeviceType(changedPort);
                if (deviceType === 'melodic' && !selectedInputs.includes(changedPort.id)) {
                    selectedInputs.push(changedPort.id);
                    console.log(`Auto-selected new melodic input device: ${changedPort.name} (${deviceType})`);
                } else if (deviceType !== 'melodic') {
                    console.log(`Skipped auto-selection of non-melodic device: ${changedPort.name} (${deviceType})`);
                }
            } else if (changeType === 'disconnected') {
                // Remove disconnected devices from selection
                selectedInputs = selectedInputs.filter(id => id !== changedPort.id);
                console.log(`Removed disconnected device: ${changedPort.name}`);
            }
            
            // Save updated selections
            const currentSettings = store.load();
            store.save({
                ...currentSettings,
                midiInputDevices: selectedInputs
            });
        }
        
        // Clear existing checkboxes
        inputList.innerHTML = '';
        
        // Add checkboxes for each input device
        midi.inputs.forEach(device => {
            const deviceType = midi.detectDeviceType(device);
            const isMelodic = deviceType === 'melodic';
            
            const item = document.createElement('div');
            item.className = `midi-input-item${!isMelodic ? ' non-melodic' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `midi-input-${device.id}`;
            checkbox.value = device.id;
            checkbox.checked = selectedInputs.includes(device.id);
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            
            // Create device label with icon if it's a Bluetooth device
            if (device.name.toLowerCase().includes('bluetooth')) {
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                icon.setAttribute('class', 'bluetooth-icon');
                icon.setAttribute('viewBox', '0 0 24 24');
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M13.42 8.58L15 10.17V11L13.41 12.59L12 11.17L10.59 12.59L9 11V10.17L10.58 8.58L9 7V6.17L10.59 4.59L12 6.01L13.41 4.59L15 6.17V7L13.42 8.58ZM12 4.83L11.41 5.41L12 6.01V4.83ZM12 12.01L11.41 11.41L12 10.83V12.01ZM17.71 7.71L12 2H11V9L5.71 3.71L4.29 5.29L10 11L4.29 16.71L5.71 18.29L11 13V20H12L17.71 14.29L13.41 10L17.71 7.71Z');
                
                icon.appendChild(path);
                label.appendChild(icon);
                
                // Clean device name (remove "Bluetooth" text)
                const cleanName = device.name.replace(/bluetooth/gi, '').trim();
                const textNode = document.createTextNode(cleanName);
                label.appendChild(textNode);
            } else {
                label.textContent = device.name;
            }

            // Add device type icon
            const typeIcon = createDeviceTypeIcon(deviceType);
            if (typeIcon) {
                label.appendChild(typeIcon);
            }
            
            item.appendChild(checkbox);
            item.appendChild(label);
            inputList.appendChild(item);
            
            checkbox.addEventListener('change', handleMidiInputChange);
        });
        
        // Update active inputs and summary
        if (selectedInputs.length > 0) {
            const validInputs = selectedInputs.filter(id => 
                midi.inputs.find(p => p.id === id)
            );
            if (validInputs.length !== selectedInputs.length) {
                // Some devices were disconnected, update saved settings
                const currentSettings = store.load();
                store.save({
                    ...currentSettings,
                    midiInputDevices: validInputs
                });
            }
            
            midi.setActiveInputs(validInputs);
            midi.onNote(ev => { 
                if (ev.type === "on") {
                    // Start sustained audible feedback immediately for any key press
                    audio.startSustainedNote(ev.note, -3);
                    // Also send sustained MIDI note to output devices
                    midi.sendNoteOn(ev.note, ev.velocity);
                    handleAnswer(ev.note);
                } else if (ev.type === "off") {
                    // Stop sustained MIDI note on output devices
                    midi.sendNoteOff(ev.note);
                    handleNoteOff(ev.note);
                }
            });
        }
        
        updateMidiInputSummary();
    }

    function updateMidiOutputs(changedPort, changeType) {
        const outputList = document.getElementById("midi-output-list");
        const savedSettings = store.load();
        let selectedOutputs = savedSettings.midiOutputDevices || [];
        
        // Handle device changes
        if (changedPort && changeType) {
            if (changeType === 'connected' && changedPort.type === 'output') {
                // Auto-select LUMI devices for output
                if (midi.isLumiDevice(changedPort) && !selectedOutputs.includes(changedPort.id)) {
                    selectedOutputs.push(changedPort.id);
                    console.log(`Auto-selected LUMI output device: ${changedPort.name}`);
                }
            } else if (changeType === 'disconnected') {
                // Remove disconnected devices from selection
                selectedOutputs = selectedOutputs.filter(id => id !== changedPort.id);
                console.log(`Removed disconnected output device: ${changedPort.name}`);
            }
            
            // Save updated selections
            const currentSettings = store.load();
            store.save({
                ...currentSettings,
                midiOutputDevices: selectedOutputs
            });
        }
        
        // Clear existing checkboxes
        outputList.innerHTML = '';
        
        // Add checkboxes for each output device
        midi.outputs.forEach(device => {
            const item = document.createElement('div');
            item.className = 'midi-output-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `midi-output-${device.id}`;
            checkbox.value = device.id;
            checkbox.checked = selectedOutputs.includes(device.id);
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            
            // Create device label with icon if it's a Bluetooth device
            if (device.name.toLowerCase().includes('bluetooth')) {
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                icon.setAttribute('class', 'bluetooth-icon');
                icon.setAttribute('viewBox', '0 0 24 24');
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M13.42 8.58L15 10.17V11L13.41 12.59L12 11.17L10.59 12.59L9 11V10.17L10.58 8.58L9 7V6.17L10.59 4.59L12 6.01L13.41 4.59L15 6.17V7L13.42 8.58ZM12 4.83L11.41 5.41L12 6.01V4.83ZM12 12.01L11.41 11.41L12 10.83V12.01ZM17.71 7.71L12 2H11V9L5.71 3.71L4.29 5.29L10 11L4.29 16.71L5.71 18.29L11 13V20H12L17.71 14.29L13.41 10L17.71 7.71Z');
                
                icon.appendChild(path);
                label.appendChild(icon);
                
                // Clean device name (remove "Bluetooth" text)
                const cleanName = device.name.replace(/bluetooth/gi, '').trim();
                const textNode = document.createTextNode(cleanName);
                label.appendChild(textNode);
            } else {
                label.textContent = device.name;
            }

            // Add device type icon for LUMI devices
            if (midi.isLumiDevice(device)) {
                const lumiIcon = createDeviceTypeIcon('melodic');
                if (lumiIcon) {
                    lumiIcon.setAttribute('title', 'LUMI lighting device');
                    label.appendChild(lumiIcon);
                }
            }
            
            item.appendChild(checkbox);
            item.appendChild(label);
            outputList.appendChild(item);
            
            checkbox.addEventListener('change', handleMidiOutputChange);
        });
        
        // Update active outputs and summary
        if (selectedOutputs.length > 0) {
            const validOutputs = selectedOutputs.filter(id => 
                midi.outputs.find(p => p.id === id)
            );
            if (validOutputs.length !== selectedOutputs.length) {
                // Some devices were disconnected, update saved settings
                const currentSettings = store.load();
                store.save({
                    ...currentSettings,
                    midiOutputDevices: validOutputs
                });
            }
            
            midi.setActiveOutputs(validOutputs);
            if (midi.out) {
                bindMidiOut(midi.out);
                clearRange(range[0], range[1]);
                setScaleColors(keySet, range[0], range[1]);
                setRootKey(document.getElementById("key-select").value);
            }
        }
        
        updateMidiOutputSummary();
    }

    function handleMidiOutputChange() {
        const checkboxes = document.querySelectorAll('#midi-output-list input[type="checkbox"]');
        const selectedOutputs = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Update MIDI system
        midi.setActiveOutputs(selectedOutputs);
        
        // Update lighting and scale colors
        if (midi.out) {
            bindMidiOut(midi.out);
            clearRange(range[0], range[1]);
            setScaleColors(keySet, range[0], range[1]);
            setRootKey(document.getElementById("key-select").value);
        }
        
        // Save settings
        const currentSettings = store.load();
        store.save({
            ...currentSettings,
            midiOutputDevices: selectedOutputs
        });
        
        updateMidiOutputSummary();
    }

    function updateMidiOutputSummary() {
        const checkboxes = document.querySelectorAll('#midi-output-list input[type="checkbox"]:checked');
        const summary = document.getElementById("midi-output-summary");
        
        if (checkboxes.length === 0) {
            summary.textContent = "No devices selected";
        } else if (checkboxes.length === 1) {
            const deviceName = checkboxes[0].nextElementSibling.textContent;
            summary.textContent = deviceName;
        } else {
            summary.textContent = `${checkboxes.length} devices selected`;
        }
    }

    function handleMidiInputChange() {
        const checkboxes = document.querySelectorAll('#midi-input-list input[type="checkbox"]');
        const selectedInputs = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Update MIDI system
        midi.setActiveInputs(selectedInputs);
        midi.onNote(ev => { 
            if (ev.type === "on") {
                // Start sustained audible feedback immediately for any key press
                audio.startSustainedNote(ev.note, -3);
                // Also send sustained MIDI note to output devices
                midi.sendNoteOn(ev.note, ev.velocity);
                handleAnswer(ev.note);
            } else if (ev.type === "off") {
                // Stop sustained MIDI note on output devices
                midi.sendNoteOff(ev.note);
                handleNoteOff(ev.note);
            }
        });
        
        // Save settings
        const currentSettings = store.load();
        store.save({
            ...currentSettings,
            midiInputDevices: selectedInputs
        });
        
        updateMidiInputSummary();
    }

    function updateMidiInputSummary() {
        const checkboxes = document.querySelectorAll('#midi-input-list input[type="checkbox"]:checked');
        const summary = document.getElementById("midi-input-summary");
        
        if (checkboxes.length === 0) {
            summary.textContent = "No devices selected";
        } else if (checkboxes.length === 1) {
            const deviceName = checkboxes[0].nextElementSibling.textContent;
            summary.textContent = deviceName;
        } else {
            summary.textContent = `${checkboxes.length} devices selected`;
        }
    }

    // Set up MIDI input dropdown toggle
    const midiInputHeader = document.getElementById("midi-input-header");
    const midiInputDropdown = document.getElementById("midi-input-dropdown");
    
    midiInputHeader.addEventListener("click", () => {
        const isExpanded = midiInputDropdown.classList.contains("show");
        if (isExpanded) {
            midiInputDropdown.classList.remove("show");
            midiInputHeader.classList.remove("expanded");
        } else {
            // Position the dropdown relative to the header
            const headerRect = midiInputHeader.getBoundingClientRect();
            midiInputDropdown.style.top = `${headerRect.bottom + window.scrollY}px`;
            midiInputDropdown.style.left = `${headerRect.left + window.scrollX}px`;
            midiInputDropdown.style.width = `${headerRect.width}px`;
            
            midiInputDropdown.classList.add("show");
            midiInputHeader.classList.add("expanded");
        }
    });

    // Set up MIDI output dropdown toggle
    const midiOutputHeader = document.getElementById("midi-output-header");
    const midiOutputDropdown = document.getElementById("midi-output-dropdown");
    
    midiOutputHeader.addEventListener("click", () => {
        const isExpanded = midiOutputDropdown.classList.contains("show");
        if (isExpanded) {
            midiOutputDropdown.classList.remove("show");
            midiOutputHeader.classList.remove("expanded");
        } else {
            // Position the dropdown relative to the header
            const headerRect = midiOutputHeader.getBoundingClientRect();
            midiOutputDropdown.style.top = `${headerRect.bottom + window.scrollY}px`;
            midiOutputDropdown.style.left = `${headerRect.left + window.scrollX}px`;
            midiOutputDropdown.style.width = `${headerRect.width}px`;
            
            midiOutputDropdown.classList.add("show");
            midiOutputHeader.classList.add("expanded");
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".midi-input-selector")) {
            midiInputDropdown.classList.remove("show");
            midiInputHeader.classList.remove("expanded");
        }
        if (!e.target.closest(".midi-output-selector")) {
            midiOutputDropdown.classList.remove("show");
            midiOutputHeader.classList.remove("expanded");
        }
    });

    // MIDI setup
    try {
        await midi.enable();
        
        // Initial population
        updateMidiInterface();
        
        // Set up device change callback
        midi.onDeviceChange = updateMidiInterface;

        // Initialize input devices with saved selections
        const savedSettings = store.load();
        if (savedSettings.midiInputDevices && savedSettings.midiInputDevices.length > 0) {
            const validInputs = savedSettings.midiInputDevices.filter(id => 
                midi.inputs.find(p => p.id === id)
            );
            if (validInputs.length > 0) {
                midi.setActiveInputs(validInputs);
                // Update the UI to show the restored devices
                updateMidiInputs();
                midi.onNote(ev => { 
                    if (ev.type === "on") {
                        // Start sustained audible feedback immediately for any key press
                        audio.startSustainedNote(ev.note, -3);
                        // Also send sustained MIDI note to output devices
                        midi.sendNoteOn(ev.note, ev.velocity);
                        handleAnswer(ev.note);
                    } else if (ev.type === "off") {
                        // Stop sustained MIDI note on output devices
                        midi.sendNoteOff(ev.note);
                        handleNoteOff(ev.note);
                    }
                });
            }
        }

        // Initialize output devices with saved selections (auto-select LUMI if not already saved)
        let outputDevices = savedSettings.midiOutputDevices || [];
        if (outputDevices.length === 0) {
            // Auto-select LUMI devices if no saved selections
            const lumiDevices = midi.outputs.filter(device => midi.isLumiDevice(device));
            if (lumiDevices.length > 0) {
                outputDevices = lumiDevices.map(device => device.id);
                console.log(`Auto-selected LUMI devices for output: ${lumiDevices.map(d => d.name).join(', ')}`);
                
                // Save the auto-selection
                store.save({
                    ...savedSettings,
                    midiOutputDevices: outputDevices
                });
                
                // Update the UI to show the auto-selected devices
                updateMidiOutputs();
            }
        }
        
        if (outputDevices.length > 0) {
            const validOutputs = outputDevices.filter(id => 
                midi.outputs.find(p => p.id === id)
            );
            if (validOutputs.length > 0) {
                midi.setActiveOutputs(validOutputs);
                if (midi.out) {
                    bindMidiOut(midi.out);
                    clearRange(range[0], range[1]);
                    setScaleColors(keySet, range[0], range[1]);
                    setRootKey(document.getElementById("key-select").value);
                }
            }
        }
    } catch (e) {
        document.getElementById("status").textContent = `MIDI not available: ${e.message}`;
    }
}

function handleAnswer(midiNote) {
    // Add visual feedback for key press
    if (window.addKeyPress) {
        window.addKeyPress(midiNote);
    }
    
    // Set root note and start game if idle when key is pressed
    if (game.state === "idle") {
        // Determine key signature from pressed note
        const newKeySignature = midiNoteToKeySignature(midiNote);
        
        // Update key selection
        const keySelect = document.getElementById("key-select");
        keySelect.value = newKeySignature;
        keySet = parseKey(newKeySignature);
        
        // Set range to C3-C4 to keep practice focused
        const rangeSelect = document.getElementById("range-select");
        rangeSelect.value = "C3-C4";
        range = rangeToMidi("C3-C4");
        ui.setKeyboardRange(range[0], range[1]);
        
        // Update lighting and UI
        clearRange(range[0], range[1]);
        setScaleColors(keySet, range[0], range[1]);
        setRootKey(newKeySignature);
        ui.highlightScaleNotes(keySet, range[0], range[1]);
        
        console.log(`Set key to ${newKeySignature}, keySet:`, keySet);
        
        // Save settings
        saveSettings();
        
        // Start the game
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
      // Skip MIDI success ping to avoid interfering with sustained user note
      // Visual and audio feedback provide sufficient success indication
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
