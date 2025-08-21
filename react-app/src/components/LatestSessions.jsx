import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService.js';

function LatestSessions({ onViewAll }) {
    const [recentSessions, setRecentSessions] = useState([]);
    
    useEffect(() => {
        loadRecentSessions();
        
        // Refresh sessions periodically to catch new data
        const interval = setInterval(loadRecentSessions, 5000);
        return () => clearInterval(interval);
    }, []);
    
    const loadRecentSessions = () => {
        const sessions = analyticsService.getRecentSessions(3); // Show last 3 sessions
        setRecentSessions(sessions);
    };
    
    const formatSessionSettings = (settings) => {
        return `${settings.rootKey} ${settings.scale}, ${settings.practiceTarget} notes`;
    };
    
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes <= 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            return `${days}d ago`;
        }
    };
    
    const getAccuracyColor = (accuracy) => {
        if (accuracy >= 90) return '#22c55e'; // green
        if (accuracy >= 80) return '#eab308'; // yellow  
        if (accuracy >= 70) return '#f97316'; // orange
        return '#ef4444'; // red
    };
    
    if (recentSessions.length === 0) {
        return null; // Don't show section if no sessions
    }
    
    return (
        <div className="latest-sessions">
            <h3>
                🏆 Latest Sessions
                <button className="view-all-button" onClick={onViewAll}>
                    View All Stats
                </button>
            </h3>
            <div className="latest-session-list">
                {recentSessions.map((session) => (
                    <div key={session.id} className="latest-session">
                        <div className="latest-session-info">
                            <div 
                                className="latest-session-accuracy"
                                style={{ color: getAccuracyColor(session.summary.accuracy) }}
                            >
                                {session.summary.accuracy}%
                            </div>
                            <div className="latest-session-settings">
                                {formatSessionSettings(session.settings)}
                            </div>
                        </div>
                        <div className="latest-session-time">
                            {formatDate(session.startTime)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LatestSessions;