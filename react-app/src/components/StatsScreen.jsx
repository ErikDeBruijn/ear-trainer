import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService.js';

function StatsScreen({ onClose, onPracticeWeakSpot }) {
    const [stats, setStats] = useState(null);
    const [recentSessions, setRecentSessions] = useState([]);
    const [weakSpots, setWeakSpots] = useState([]);
    const [accuracyTrend, setAccuracyTrend] = useState([]);
    const [todaysTrend, setTodaysTrend] = useState([]);
    const [selectedTimeframe, setSelectedTimeframe] = useState('20'); // sessions
    
    useEffect(() => {
        loadStatsData();
    }, [selectedTimeframe]);
    
    const loadStatsData = () => {
        const sessionCount = parseInt(selectedTimeframe);
        const performanceStats = analyticsService.getPerformanceStats(sessionCount);
        const sessions = analyticsService.getRecentSessions(sessionCount);
        const spots = analyticsService.getWeakSpots(sessionCount);
        const trend = analyticsService.getAccuracyTrend(30); // last 30 days
        const todaysProgress = analyticsService.getTodaysTrend();
        
        setStats(performanceStats);
        setRecentSessions(sessions);
        setWeakSpots(spots);
        setAccuracyTrend(trend);
        setTodaysTrend(todaysProgress);
    };
    
    const formatSessionSettings = (settings) => {
        return `${settings.rootKey} ${settings.scale}, ${settings.range}, ${settings.practiceTarget} notes`;
    };
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };
    
    const getAccuracyColor = (accuracy) => {
        if (accuracy >= 90) return '#22c55e'; // green
        if (accuracy >= 80) return '#eab308'; // yellow
        if (accuracy >= 70) return '#f97316'; // orange
        return '#ef4444'; // red
    };
    
    const getRelativeAccuracyColor = (accuracy, allAccuracies) => {
        if (allAccuracies.length <= 1) {
            // If only one data point, use encouraging colors
            if (accuracy >= 70) return '#22c55e'; // green
            if (accuracy >= 50) return '#eab308'; // yellow
            return '#f97316'; // orange (not red for encouragement)
        }
        
        // Sort accuracies to find percentiles
        const sorted = [...allAccuracies].sort((a, b) => a - b);
        const percentile = (sorted.indexOf(accuracy) + 1) / sorted.length;
        
        // Relative coloring based on performance rank
        if (percentile >= 0.8) return '#22c55e'; // green - top 20%
        if (percentile >= 0.6) return '#eab308'; // yellow - top 40%
        if (percentile >= 0.4) return '#f97316'; // orange - middle 40%
        return '#ef4444'; // red - bottom 40%
    };
    
    const clearAllData = () => {
        if (confirm('Are you sure you want to clear all practice data? This cannot be undone.')) {
            analyticsService.clearAllData();
            loadStatsData();
        }
    };
    
    if (!stats) {
        return <div className="stats-screen loading">Loading statistics...</div>;
    }
    
    return (
        <div className="stats-screen">
            <div className="stats-header">
                <button className="close-button" onClick={onClose} aria-label="Close Statistics">×</button>
                <h1>📊 Practice Statistics</h1>
                
                <div className="timeframe-selector">
                    <label>Show data for last:</label>
                    <select 
                        value={selectedTimeframe} 
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                    >
                        <option value="10">10 sessions</option>
                        <option value="20">20 sessions</option>
                        <option value="50">50 sessions</option>
                        <option value="100">100 sessions</option>
                    </select>
                </div>
            </div>
            
            {stats.totalSessions === 0 ? (
                <div className="no-data">
                    <h2>🎹 Start practicing to see your progress!</h2>
                    <p>Complete a few practice sessions and your statistics will appear here.</p>
                </div>
            ) : (
                <>
                    {/* Overview Cards */}
                    <div className="stats-overview">
                        <div className="stat-card">
                            <div className="stat-value">{stats.totalSessions}</div>
                            <div className="stat-label">Sessions</div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: getAccuracyColor(stats.averageAccuracy) }}>
                                {stats.averageAccuracy}%
                            </div>
                            <div className="stat-label">Avg Accuracy</div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-value">{stats.totalNotes}</div>
                            <div className="stat-label">Notes Practiced</div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-value">{analyticsService.formatDuration(stats.totalPracticeTime)}</div>
                            <div className="stat-label">Total Time</div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-value">{stats.bestStreak}</div>
                            <div className="stat-label">Best Streak</div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-value">{stats.averageResponseTime}ms</div>
                            <div className="stat-label">Avg Response</div>
                        </div>
                    </div>
                    
                    {/* Weak Spots Analysis */}
                    {weakSpots.length > 0 && (
                        <div className="stats-section">
                            <h2>🎯 Areas to Focus On</h2>
                            <p className="section-subtitle">
                                Notes ranked by relative performance • Green = your strongest notes
                            </p>
                            <div className="weak-spots">
                                {weakSpots.slice(0, 6).map((spot, index) => {
                                    const allAccuracies = weakSpots.map(s => s.accuracy);
                                    return (
                                        <div key={spot.noteClass} className="weak-spot">
                                            <div className="note-name">{spot.noteName}</div>
                                            <div className="accuracy-bar">
                                                <div 
                                                    className="accuracy-fill"
                                                    style={{ 
                                                        width: `${spot.accuracy}%`,
                                                        backgroundColor: getRelativeAccuracyColor(spot.accuracy, allAccuracies)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="accuracy-text">
                                                {spot.accuracy}% ({spot.correct}/{spot.attempts})
                                                {index < 2 && (
                                                    <button 
                                                        className="practice-button"
                                                        onClick={() => onPracticeWeakSpot && onPracticeWeakSpot(spot.noteName)}
                                                        title={`Start practicing ${spot.noteName} notes`}
                                                    >
                                                        Practice
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Today's Progress */}
                    {todaysTrend.length > 1 && (
                        <div className="stats-section">
                            <h2>📈 Today's Progress</h2>
                            <p className="section-subtitle">
                                Session-by-session accuracy for today • {todaysTrend.length} sessions completed
                            </p>
                            <div className="todays-trend-chart">
                                {todaysTrend.map((session, index) => (
                                    <div key={session.sessionNumber} className="today-session">
                                        <div 
                                            className="today-session-bar"
                                            style={{ 
                                                height: `${Math.max(session.accuracy, 5)}%`,
                                                backgroundColor: getAccuracyColor(session.accuracy)
                                            }}
                                            title={`Session ${session.sessionNumber} at ${session.time}: ${session.accuracy}% (${session.totalNotes} notes, score: ${session.score})`}
                                        ></div>
                                        <div className="today-session-label">
                                            {session.sessionNumber}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Accuracy Trend */}
                    {accuracyTrend.length > 0 && (
                        <div className="stats-section">
                            <h2>📈 Accuracy Trend (Last 30 Days)</h2>
                            <div className="trend-chart">
                                {accuracyTrend.map((day, index) => (
                                    <div key={day.date} className="trend-bar">
                                        <div 
                                            className="trend-fill"
                                            style={{ 
                                                height: `${Math.max(day.averageAccuracy, 5)}%`,
                                                backgroundColor: getAccuracyColor(day.averageAccuracy)
                                            }}
                                            title={`${day.date}: ${Math.round(day.averageAccuracy)}% (${day.totalSessions} sessions)`}
                                        ></div>
                                        {index % 7 === 0 && (
                                            <div className="trend-label">
                                                {new Date(day.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Recent Sessions */}
                    <div className="stats-section">
                        <h2>📝 Recent Sessions</h2>
                        <div className="recent-sessions">
                            {recentSessions.map((session) => (
                                <div key={session.id} className="session-card">
                                    <div className="session-header">
                                        <div className="session-accuracy" style={{ color: getAccuracyColor(session.summary.accuracy) }}>
                                            {session.summary.accuracy}%
                                        </div>
                                        <div className="session-time">{formatDate(session.startTime)}</div>
                                    </div>
                                    <div className="session-details">
                                        <div className="session-settings">{formatSessionSettings(session.settings)}</div>
                                        <div className="session-stats">
                                            {session.summary.totalNotes} notes • 
                                            {analyticsService.formatDuration(session.summary.duration)} • 
                                            {session.summary.maxStreak} streak
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            
            {/* Footer Actions */}
            <div className="stats-footer">
                <button className="secondary-button" onClick={clearAllData}>
                    Clear All Data
                </button>
                <div className="data-info">
                    Data is stored locally in your browser
                </div>
            </div>
        </div>
    );
}

export default StatsScreen;