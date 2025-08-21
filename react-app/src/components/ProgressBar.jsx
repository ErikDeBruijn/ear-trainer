function ProgressBar({ progress, progressText, noteResults, practiceTarget }) {
    const totalNotes = parseInt(practiceTarget, 10) || 10;
    
    const renderSegmentedProgress = () => {
        const segments = [];
        
        for (let i = 1; i <= totalNotes; i++) {
            const noteResult = noteResults?.find(result => result.noteNumber === i);
            let segmentClass = 'progress-segment pending';
            
            if (noteResult) {
                segmentClass = `progress-segment ${noteResult.isCorrect ? 'correct' : 'incorrect'}`;
            }
            
            segments.push(
                <div key={i} className={segmentClass}></div>
            );
        }
        
        return segments;
    };
    
    return (
        <div className="progress-container">
            <div className="progress-label">
                Practice Progress <span>{progressText}</span>
            </div>
            <div className="progress-bar segmented">
                {renderSegmentedProgress()}
            </div>
        </div>
    );
}

export default ProgressBar;