// Quick test script for analytics functionality
// Run this in browser console: navigator.clipboard.readText().then(text => eval(text))

console.log('🧪 Testing Analytics Service...');

// Test creating and ending a session
const testSettings = {
  rootKey: 'C',
  scale: 'major',
  range: 'C3-B4',
  homeNoteFrequency: 'always',
  practiceTarget: '10',
  volume: 70
};

console.log('1. Starting test session...');
const sessionId = analyticsService.startSession(testSettings);
console.log(`Session started: ${sessionId}`);

// Simulate some attempts
console.log('2. Logging test attempts...');
analyticsService.logAttempt(60, 60, true, 1500, 1);   // C4, correct, 1.5s response
analyticsService.logAttempt(62, 64, false, 2200, 1);  // D4 target, E4 guess, incorrect, 2.2s response
analyticsService.logAttempt(62, 62, true, 1100, 2);   // D4, correct, 1.1s response
analyticsService.logAttempt(64, 64, true, 800, 3);    // E4, correct, 0.8s response
analyticsService.logAttempt(67, 65, false, 3000, 3);  // G4 target, F4 guess, incorrect, 3s response
analyticsService.logAttempt(67, 67, true, 1200, 4);   // G4, correct, 1.2s response

console.log('3. Ending session...');
const mockGameState = {
  attempts: 6,
  correct: 4,
  streak: 4,
  score: 400
};

const completedSession = analyticsService.endSession(mockGameState);
console.log('Completed session:', completedSession);

// Test analytics functions
console.log('4. Testing analytics functions...');
const stats = analyticsService.getPerformanceStats(10);
console.log('Performance stats:', stats);

const weakSpots = analyticsService.getWeakSpots(10);
console.log('Weak spots:', weakSpots);

const recentSessions = analyticsService.getRecentSessions(5);
console.log('Recent sessions:', recentSessions);

const trend = analyticsService.getAccuracyTrend(7);
console.log('Accuracy trend (7 days):', trend);

console.log('✅ Analytics test completed successfully!');