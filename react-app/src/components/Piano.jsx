import { useCallback } from 'react';

function Piano({ activeNotes, scaleNotes, onKeyPress }) {
    // Piano keys with their MIDI note numbers and labels
    const keys = [
        { note: 48, label: 'C3', sharp: false },
        { note: 49, label: 'C#3', sharp: true },
        { note: 50, label: 'D3', sharp: false },
        { note: 51, label: 'D#3', sharp: true },
        { note: 52, label: 'E3', sharp: false },
        { note: 53, label: 'F3', sharp: false },
        { note: 54, label: 'F#3', sharp: true },
        { note: 55, label: 'G3', sharp: false },
        { note: 56, label: 'G#3', sharp: true },
        { note: 57, label: 'A3', sharp: false },
        { note: 58, label: 'A#3', sharp: true },
        { note: 59, label: 'B3', sharp: false },
        { note: 60, label: 'C4', sharp: false },
        { note: 61, label: 'C#4', sharp: true },
        { note: 62, label: 'D4', sharp: false },
        { note: 63, label: 'D#4', sharp: true },
        { note: 64, label: 'E4', sharp: false },
        { note: 65, label: 'F4', sharp: false },
        { note: 66, label: 'F#4', sharp: true },
        { note: 67, label: 'G4', sharp: false },
        { note: 68, label: 'G#4', sharp: true },
        { note: 69, label: 'A4', sharp: false },
        { note: 70, label: 'A#4', sharp: true },
        { note: 71, label: 'B4', sharp: false }
    ];

    const handleKeyClick = useCallback((midiNote) => {
        onKeyPress(midiNote);
    }, [onKeyPress]);

    const getKeyClasses = (key) => {
        const classes = ['key'];
        
        if (key.sharp) {
            classes.push('sharp');
        }
        
        if (activeNotes.has(key.note)) {
            classes.push('active');
        }
        
        if (scaleNotes.has(key.note % 12)) {
            classes.push('in-scale');
        }
        
        // Don't show target note - this is ear training, not visual training!
        
        return classes.join(' ');
    };

    return (
        <div className="piano-container">
            <div className="keys" id="piano-keys">
                {keys.map(key => (
                    <div
                        key={key.note}
                        className={getKeyClasses(key)}
                        data-note={key.note}
                        onClick={() => handleKeyClick(key.note)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent text selection
                    >
                        {key.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Piano;