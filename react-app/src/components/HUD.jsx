function HUD({ score, streak, practiceTime, accuracy }) {
    return (
        <div className="hud">
            <div>Score: <span>{score}</span></div>
            <div>Streak: <span>{streak}</span></div>
            <div>Practice time today: <span>{practiceTime}</span></div>
            <div>Accuracy: <span>{accuracy}</span></div>
        </div>
    );
}

export default HUD;