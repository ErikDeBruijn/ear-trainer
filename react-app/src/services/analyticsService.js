// services/analyticsService.js

class AnalyticsService {
  constructor() {
    this.currentSession = null;
    this.sessionId = null;
  }

  // Start a new practice session
  startSession(settings) {
    this.sessionId = this.generateSessionId();
    this.currentSession = {
      id: this.sessionId,
      startTime: Date.now(),
      endTime: null,
      settings: {
        rootKey: settings.rootKey,
        scale: settings.scale,
        range: settings.range,
        homeNoteFrequency: settings.homeNoteFrequency,
        practiceTarget: settings.practiceTarget,
        volume: settings.volume
      },
      attempts: [],
      summary: {
        totalNotes: 0,
        correctNotes: 0,
        accuracy: 0,
        streak: 0,
        maxStreak: 0,
        duration: 0,
        score: 0
      },
      weakSpots: {}, // noteClass -> { attempts: number, correct: number }
      timeDistribution: [] // Track response times
    };
    
    console.log(`📊 Started analytics session ${this.sessionId}`);
    return this.sessionId;
  }

  // Log each attempt during the session
  logAttempt(targetNote, guessNote, isCorrect, responseTime, currentStreak) {
    if (!this.currentSession) return;

    const attempt = {
      timestamp: Date.now(),
      targetNote,
      guessNote, 
      isCorrect,
      responseTime,
      streak: currentStreak,
      targetNoteClass: targetNote % 12,
      guessNoteClass: guessNote % 12
    };

    this.currentSession.attempts.push(attempt);
    
    // Update weak spots tracking
    const targetClass = targetNote % 12;
    if (!this.currentSession.weakSpots[targetClass]) {
      this.currentSession.weakSpots[targetClass] = { attempts: 0, correct: 0 };
    }
    this.currentSession.weakSpots[targetClass].attempts++;
    if (isCorrect) {
      this.currentSession.weakSpots[targetClass].correct++;
    }

    // Track response times for analysis
    if (responseTime && responseTime > 0) {
      this.currentSession.timeDistribution.push(responseTime);
    }

    // Update streak tracking
    if (currentStreak > this.currentSession.summary.maxStreak) {
      this.currentSession.summary.maxStreak = currentStreak;
    }
  }

  // End the current session and save it
  endSession(finalGameState) {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    // Calculate accurate stats from both finalGameState and logged attempts
    const totalAttempts = finalGameState.attempts || this.currentSession.attempts.length;
    const correctAnswers = finalGameState.correct || this.currentSession.attempts.filter(a => a.isCorrect).length;
    const calculatedAccuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;
    
    this.currentSession.summary = {
      totalNotes: totalAttempts,
      correctNotes: correctAnswers,
      accuracy: calculatedAccuracy,
      streak: finalGameState.streak || 0,
      maxStreak: this.currentSession.summary.maxStreak,
      duration: this.currentSession.endTime - this.currentSession.startTime,
      score: finalGameState.score || 0
    };

    // Save to localStorage
    this.saveSession(this.currentSession);
    
    const completedSession = { ...this.currentSession };
    this.currentSession = null;
    this.sessionId = null;
    
    console.log(`📊 Ended analytics session, accuracy: ${completedSession.summary.accuracy}%`);
    return completedSession;
  }

  // Save session to localStorage
  saveSession(session) {
    try {
      const existingSessions = this.getAllSessions();
      existingSessions.push(session);
      
      // Keep only last 100 sessions to avoid storage bloat
      const recentSessions = existingSessions.slice(-100);
      
      localStorage.setItem('earTrainer_sessions', JSON.stringify(recentSessions));
      localStorage.setItem('earTrainer_lastSessionDate', new Date().toISOString());
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  // Get all stored sessions
  getAllSessions() {
    try {
      const sessions = localStorage.getItem('earTrainer_sessions');
      return sessions ? JSON.parse(sessions) : [];
    } catch (error) {
      console.error('Failed to load session data:', error);
      return [];
    }
  }

  // Get recent sessions (last N sessions)
  getRecentSessions(count = 10) {
    const allSessions = this.getAllSessions();
    return allSessions.slice(-count).reverse(); // Most recent first
  }

  // Get sessions for a specific date range
  getSessionsInRange(startDate, endDate) {
    const allSessions = this.getAllSessions();
    return allSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }

  // Get today's session-by-session accuracy trend
  getTodaysTrend() {
    const today = new Date().toISOString().split('T')[0];
    const allSessions = this.getAllSessions();
    
    const todaysSessions = allSessions.filter(session => {
      const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
      return sessionDate === today;
    }).sort((a, b) => a.startTime - b.startTime); // Chronological order
    
    return todaysSessions.map((session, index) => ({
      sessionNumber: index + 1,
      accuracy: session.summary.accuracy,
      time: new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalNotes: session.summary.totalNotes,
      score: session.summary.score
    }));
  }

  // Analyze accuracy trends over time
  getAccuracyTrend(days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const sessions = this.getSessionsInRange(startDate, endDate);
    const dailyStats = {};

    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sessions: 0, totalAccuracy: 0, totalNotes: 0 };
      }
      
      dailyStats[date].sessions++;
      dailyStats[date].totalAccuracy += session.summary.accuracy;
      dailyStats[date].totalNotes += session.summary.totalNotes;
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      averageAccuracy: stats.totalAccuracy / stats.sessions,
      totalSessions: stats.sessions,
      totalNotes: stats.totalNotes
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Identify weak spots across all sessions
  getWeakSpots(sessionCount = 20) {
    const recentSessions = this.getRecentSessions(sessionCount);
    const combinedWeakSpots = {};
    const noteNames = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

    // Combine weak spot data across sessions
    recentSessions.forEach(session => {
      Object.entries(session.weakSpots || {}).forEach(([noteClass, stats]) => {
        if (!combinedWeakSpots[noteClass]) {
          combinedWeakSpots[noteClass] = { attempts: 0, correct: 0 };
        }
        combinedWeakSpots[noteClass].attempts += stats.attempts;
        combinedWeakSpots[noteClass].correct += stats.correct;
      });
    });

    // Convert to array with accuracy calculations
    return Object.entries(combinedWeakSpots)
      .map(([noteClass, stats]) => ({
        noteClass: parseInt(noteClass),
        noteName: noteNames[parseInt(noteClass)],
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy: stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0
      }))
      .filter(spot => spot.attempts >= 3) // Only include notes attempted at least 3 times
      .sort((a, b) => a.accuracy - b.accuracy); // Worst accuracy first
  }

  // Get performance statistics
  getPerformanceStats(sessionCount = 20) {
    const recentSessions = this.getRecentSessions(sessionCount);
    
    if (recentSessions.length === 0) {
      return {
        totalSessions: 0,
        averageAccuracy: 0,
        totalPracticeTime: 0,
        totalNotes: 0,
        bestStreak: 0,
        averageResponseTime: 0
      };
    }

    const totalAccuracy = recentSessions.reduce((sum, s) => sum + s.summary.accuracy, 0);
    const totalTime = recentSessions.reduce((sum, s) => sum + s.summary.duration, 0);
    const totalNotes = recentSessions.reduce((sum, s) => sum + s.summary.totalNotes, 0);
    const bestStreak = Math.max(...recentSessions.map(s => s.summary.maxStreak));
    
    // Calculate average response time
    const allResponseTimes = recentSessions
      .flatMap(s => s.timeDistribution || [])
      .filter(time => time > 0 && time < 10000); // Filter out unrealistic times
    
    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
      : 0;

    return {
      totalSessions: recentSessions.length,
      averageAccuracy: Math.round(totalAccuracy / recentSessions.length),
      totalPracticeTime: totalTime,
      totalNotes,
      bestStreak,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  // Generate unique session ID
  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format duration for display
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  // Clear all session data (for testing/reset)
  clearAllData() {
    localStorage.removeItem('earTrainer_sessions');
    localStorage.removeItem('earTrainer_lastSessionDate');
    this.currentSession = null;
    this.sessionId = null;
    console.log('📊 Cleared all analytics data');
  }
}

export const analyticsService = new AnalyticsService();