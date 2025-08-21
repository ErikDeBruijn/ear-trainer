import { useState } from 'react';
import { TRAINING_LEVELS } from '../services/levelService.js';

function Header({ settings, midiDevices, gameState, onSettingsChange, onMidiDeviceChange, onStartPause, onReplay }) {
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [inputDropdownVisible, setInputDropdownVisible] = useState(false);
    const [outputDropdownVisible, setOutputDropdownVisible] = useState(false);
    const [lockClickCount, setLockClickCount] = useState(0);

    const toggleSettings = () => {
        const newVisibility = !settingsVisible;
        setSettingsVisible(newVisibility);
        onSettingsChange({ settingsVisible: newVisibility });
    };

    const toggleInputDropdown = () => {
        setInputDropdownVisible(!inputDropdownVisible);
        setOutputDropdownVisible(false); // Close other dropdown
    };

    const toggleOutputDropdown = () => {
        setOutputDropdownVisible(!outputDropdownVisible);
        setInputDropdownVisible(false); // Close other dropdown
    };

    const handleInputChange = (key, value) => {
        // Check if changing key/scale while in training mode
        if ((key === 'rootKey' || key === 'scale') && settings.trainingMode) {
            if (confirm('Changing the key or scale will exit Training Mode and enter Advanced Mode. Continue?')) {
                onSettingsChange({ [key]: value, trainingMode: false });
            }
        } else {
            onSettingsChange({ [key]: value });
        }
    };

    const handleTrainingModeChange = (isTrainingMode) => {
        if (isTrainingMode) {
            // Entering training mode - preserve current level, set appropriate key
            const currentLevel = settings.currentLevel;
            const levelKey = TRAINING_LEVELS[currentLevel]?.key || 'C';
            onSettingsChange({ 
                trainingMode: true,
                rootKey: levelKey,
                scale: 'major'
            });
        } else {
            // Exiting training mode - preserve level progress
            onSettingsChange({ trainingMode: false });
        }
    };

    const getLevelName = (level) => {
        return TRAINING_LEVELS[level]?.name || 'Unknown';
    };

    const getLevelDescription = (level) => {
        return TRAINING_LEVELS[level]?.description || '';
    };

    const handleMidiInputChange = (deviceId, checked) => {
        const newInputs = checked 
            ? [...midiDevices.selectedInputs, deviceId]
            : midiDevices.selectedInputs.filter(id => id !== deviceId);
        onMidiDeviceChange(newInputs, midiDevices.selectedOutputs);
    };

    const handleMidiOutputChange = (deviceId, checked) => {
        const newOutputs = checked 
            ? [...midiDevices.selectedOutputs, deviceId]
            : midiDevices.selectedOutputs.filter(id => id !== deviceId);
        onMidiDeviceChange(midiDevices.selectedInputs, newOutputs);
    };

    const getInputSummary = () => {
        if (midiDevices.selectedInputs.length === 0) return 'No devices selected';
        if (midiDevices.selectedInputs.length === 1) {
            const device = midiDevices.inputs.find(d => d.id === midiDevices.selectedInputs[0]);
            return device ? device.name : 'Unknown device';
        }
        return `${midiDevices.selectedInputs.length} devices selected`;
    };

    const getOutputSummary = () => {
        if (midiDevices.selectedOutputs.length === 0) return 'No devices selected';
        if (midiDevices.selectedOutputs.length === 1) {
            const device = midiDevices.outputs.find(d => d.id === midiDevices.selectedOutputs[0]);
            return device ? device.name : 'Unknown device';
        }
        return `${midiDevices.selectedOutputs.length} devices selected`;
    };

    const handleSecretUnlock = () => {
        const newCount = lockClickCount + 1;
        setLockClickCount(newCount);
        
        if (newCount >= 5) {
            // Secret unlock! Advance to next level
            const nextLevel = settings.currentLevel + 1;
            if (nextLevel <= 26) {
                const nextLevelInfo = TRAINING_LEVELS[nextLevel];
                const levelKey = nextLevelInfo?.key || 'C';
                
                // Update to next level and appropriate key
                const settingsUpdate = { currentLevel: nextLevel };
                if (levelKey !== settings.rootKey && levelKey !== "any") {
                    settingsUpdate.rootKey = levelKey;
                    settingsUpdate.scale = "major";
                }
                onSettingsChange(settingsUpdate);
                
                // Reset click count
                setLockClickCount(0);
                
                // Show feedback
                alert(`🔓 Secret unlock! Advanced to Level ${nextLevel}: ${nextLevelInfo.name}`);
            }
        }
        
        // Reset click count after 3 seconds of no clicks
        setTimeout(() => setLockClickCount(0), 3000);
    };

    return (
        <header>
            <div className="title">
                Ear Trainer — v1.1
                {settings.trainingMode && (
                    <span className="level-badge">
                        Level {settings.currentLevel}: {getLevelName(settings.currentLevel)}
                    </span>
                )}
            </div>
            <div className="settings-section">
                <button className="settings-toggle" onClick={toggleSettings}>
                    <span className="settings-toggle-text">Settings</span>
                    <span className="settings-toggle-icon">{settingsVisible ? '▲' : '▼'}</span>
                </button>
                
                {settingsVisible && (
                    <div className={`settings-panel ${settingsVisible ? 'expanded' : ''}`}>
                        <div className="controls">
                            {/* Training Mode Section */}
                            <div className="training-mode-section">
                                <label className="mode-toggle">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.trainingMode}
                                        onChange={(e) => handleTrainingModeChange(e.target.checked)}
                                    />
                                    <span className="mode-label">
                                        {settings.trainingMode ? '🎓 Training Mode' : '🔧 Advanced Mode'}
                                    </span>
                                </label>
                                
                                {settings.trainingMode && (
                                    <div className="level-info">
                                        <div className="current-level">
                                            Level {settings.currentLevel}: {getLevelName(settings.currentLevel)}
                                        </div>
                                        <div className="level-description">
                                            {getLevelDescription(settings.currentLevel)}
                                        </div>
                                        {settings.currentLevel < 26 && (
                                            <div className="next-level-preview">
                                                <span 
                                                    className={`secret-lock ${lockClickCount > 0 ? 'clicked' : ''}`}
                                                    onClick={handleSecretUnlock}
                                                    title={lockClickCount > 0 ? `${5 - lockClickCount} more clicks to unlock` : ''}
                                                >
                                                    🔒
                                                </span>
                                                {' '}Level {settings.currentLevel + 1}: {getLevelName(settings.currentLevel + 1)}
                                            </div>
                                        )}
                                        {settings.currentLevel === 26 && (
                                            <div className="max-level-achieved">
                                                🏆 Grand Master achieved!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <label>
                                Root Key
                                <select 
                                    value={settings.rootKey} 
                                    onChange={(e) => handleInputChange('rootKey', e.target.value)}
                                >
                                    <option value="C">C</option>
                                    <option value="C#">C#</option>
                                    <option value="Db">D♭</option>
                                    <option value="D">D</option>
                                    <option value="D#">D#</option>
                                    <option value="Eb">E♭</option>
                                    <option value="E">E</option>
                                    <option value="F">F</option>
                                    <option value="F#">F#</option>
                                    <option value="Gb">G♭</option>
                                    <option value="G">G</option>
                                    <option value="G#">G#</option>
                                    <option value="Ab">A♭</option>
                                    <option value="A">A</option>
                                    <option value="A#">A#</option>
                                    <option value="Bb">B♭</option>
                                    <option value="B">B</option>
                                </select>
                            </label>
                            
                            <label>
                                Scale
                                <select 
                                    value={settings.scale} 
                                    onChange={(e) => handleInputChange('scale', e.target.value)}
                                >
                                    <optgroup label="Common Scales">
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                        <option value="harmonic-minor">Harmonic Minor</option>
                                    </optgroup>
                                    <optgroup label="Pentatonic Scales">
                                        <option value="pentatonic-major">Pentatonic Major</option>
                                        <option value="pentatonic-minor">Pentatonic Minor</option>
                                        <option value="pentatonic-neutral">Pentatonic Neutral</option>
                                    </optgroup>
                                    <optgroup label="Modal Scales">
                                        <option value="dorian">Dorian</option>
                                        <option value="phrygian">Phrygian</option>
                                        <option value="lydian">Lydian</option>
                                        <option value="mixolydian">Mixolydian</option>
                                        <option value="locrian">Locrian</option>
                                    </optgroup>
                                    <optgroup label="Other Scales">
                                        <option value="blues">Blues</option>
                                        <option value="whole-tone">Whole Tone</option>
                                        <option value="chromatic">Chromatic</option>
                                        <option value="arabic-a">Arabic (A)</option>
                                        <option value="arabic-b">Arabic (B)</option>
                                        <option value="japanese">Japanese</option>
                                        <option value="ryukyu">Ryukyu</option>
                                        <option value="8-tone-spanish">8-tone Spanish</option>
                                    </optgroup>
                                </select>
                            </label>
                            
                            <label>
                                Range
                                <select 
                                    value={settings.range} 
                                    onChange={(e) => handleInputChange('range', e.target.value)}
                                >
                                    <optgroup label="Single octave">
                                        <option value="C3-C4">C3–C4 (1 octave)</option>
                                        <option value="C4-C5">C4–C5 (1 octave)</option>
                                        <option value="C5-C6">C5–C6 (1 octave)</option>
                                    </optgroup>
                                    <optgroup label="Two octaves">
                                        <option value="C2-C4">C2–C4 (2 octaves)</option>
                                        <option value="C3-B4">C3–B4 (2 octaves)</option>
                                        <option value="C4-C6">C4–C6 (2 octaves)</option>
                                    </optgroup>
                                </select>
                            </label>
                            
                            <label>
                                MIDI Inputs
                                <div className="midi-input-selector">
                                    <div 
                                        className={`midi-input-header ${inputDropdownVisible ? 'expanded' : ''}`}
                                        onClick={toggleInputDropdown}
                                    >
                                        <span>{getInputSummary()}</span>
                                        <span className="dropdown-arrow">▼</span>
                                    </div>
                                    <div className={`midi-input-dropdown ${inputDropdownVisible ? 'show' : ''}`}>
                                        <div className="midi-input-list">
                                            {midiDevices.inputs.map(device => (
                                                <label key={device.id} className="midi-device-option">
                                                    <input
                                                        type="checkbox"
                                                        checked={midiDevices.selectedInputs.includes(device.id)}
                                                        onChange={(e) => handleMidiInputChange(device.id, e.target.checked)}
                                                    />
                                                    <span className="device-name">{device.name}</span>
                                                    {device.manufacturer && (
                                                        <span className="device-manufacturer"> ({device.manufacturer})</span>
                                                    )}
                                                </label>
                                            ))}
                                            {midiDevices.inputs.length === 0 && (
                                                <div className="no-devices">No MIDI input devices found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </label>
                            
                            <label>
                                MIDI Outputs
                                <div className="midi-output-selector">
                                    <div 
                                        className={`midi-output-header ${outputDropdownVisible ? 'expanded' : ''}`}
                                        onClick={toggleOutputDropdown}
                                    >
                                        <span>{getOutputSummary()}</span>
                                        <span className="dropdown-arrow">▼</span>
                                    </div>
                                    <div className={`midi-output-dropdown ${outputDropdownVisible ? 'show' : ''}`}>
                                        <div className="midi-output-list">
                                            {midiDevices.outputs.map(device => (
                                                <label key={device.id} className="midi-device-option">
                                                    <input
                                                        type="checkbox"
                                                        checked={midiDevices.selectedOutputs.includes(device.id)}
                                                        onChange={(e) => handleMidiOutputChange(device.id, e.target.checked)}
                                                    />
                                                    <span className="device-name">{device.name}</span>
                                                    {device.manufacturer && (
                                                        <span className="device-manufacturer"> ({device.manufacturer})</span>
                                                    )}
                                                </label>
                                            ))}
                                            {midiDevices.outputs.length === 0 && (
                                                <div className="no-devices">No MIDI output devices found</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </label>
                            
                            <label>
                                Play home note first
                                <select 
                                    value={settings.homeNoteFrequency} 
                                    onChange={(e) => handleInputChange('homeNoteFrequency', e.target.value)}
                                >
                                    <option value="always">Always</option>
                                    <option value="every-2">Every other note</option>
                                    <option value="every-3">Every third note</option>
                                    <option value="every-4">Every fourth note</option>
                                    <option value="first-only">Only the first note</option>
                                    <option value="never">Never</option>
                                </select>
                            </label>
                            
                            <label>
                                Notes to practice
                                <select 
                                    value={settings.practiceTarget} 
                                    onChange={(e) => handleInputChange('practiceTarget', e.target.value)}
                                >
                                    <option value="4">4 notes</option>
                                    <option value="10">10 notes</option>
                                    <option value="20">20 notes</option>
                                    <option value="30">30 notes</option>
                                    <option value="50">50 notes</option>
                                    <option value="100">100 notes</option>
                                </select>
                            </label>
                            
                            <label>
                                🔊 Volume
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={settings.volume} 
                                    onChange={(e) => handleInputChange('volume', parseInt(e.target.value))}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="game-controls">
                <button 
                    className="primary" 
                    onClick={onStartPause}
                    autoFocus={gameState === 'idle' || gameState === 'ended'}
                >
                    {gameState === 'idle' || gameState === 'ended' ? '▶' : '⏸'}
                </button>
                <button className="secondary" onClick={onReplay}>🎵</button>
            </div>
        </header>
    );
}

export default Header;