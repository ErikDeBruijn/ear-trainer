function ProgressBar({ progress, progressText }) {
    return (
        <div className="progress-container">
            <div className="progress-label">
                Practice Progress <span>{progressText}</span>
            </div>
            <div className="progress-bar">
                <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}

export default ProgressBar;