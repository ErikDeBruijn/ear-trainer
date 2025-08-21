import { useState } from 'react';

function Header({ settings, midiDevices, gameState, onSettingsChange, onMidiDeviceChange, onStartPause, onReplay }) {
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [inputDropdownVisible, setInputDropdownVisible] = useState(false);
    const [outputDropdownVisible, setOutputDropdownVisible] = useState(false);

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
        onSettingsChange({ [key]: value });
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

    return (
        <header>
            <div className="title">Ear Trainer — v1.0</div>
            <div className="settings-section">
                <button className="settings-toggle" onClick={toggleSettings}>
                    <span className="settings-toggle-text">Settings</span>
                    <span className="settings-toggle-icon">{settingsVisible ? '▲' : '▼'}</span>
                </button>
                
                {settingsVisible && (
                    <div className={`settings-panel ${settingsVisible ? 'expanded' : ''}`}>
                        <div className="controls">
                            <label>
                                Key
                                <select 
                                    value={settings.key} 
                                    onChange={(e) => handleInputChange('key', e.target.value)}
                                >
                                    <option value="C-major">C major</option>
                                    <option value="G-major">G major</option>
                                    <option value="D-major">D major</option>
                                    <option value="F#-major">F# major</option>
                                    <option value="A-minor">A minor</option>
                                    <option value="E-minor">E minor</option>
                                    <option value="F#-minor">F# minor</option>
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