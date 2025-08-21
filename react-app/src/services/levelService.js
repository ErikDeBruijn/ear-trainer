// services/levelService.js

export const TRAINING_LEVELS = {
  1: {
    name: "Root & Fifth",
    description: "Learn the foundation interval",
    noteOffsets: [0, 7], // Root and 5th
    requiredAccuracy: 80,
    minSessions: 3
  },
  2: {
    name: "Major Triad", 
    description: "Add the major third",
    noteOffsets: [0, 4, 7], // Major triad
    requiredAccuracy: 80,
    minSessions: 3
  },
  3: {
    name: "Add Fourth",
    description: "Common melody notes",
    noteOffsets: [0, 4, 5, 7], // C, E, F, G
    requiredAccuracy: 80,
    minSessions: 3
  },
  4: {
    name: "Pentatonic Feel",
    description: "Five core scale tones",
    noteOffsets: [0, 2, 4, 5, 7], // C, D, E, F, G
    requiredAccuracy: 80,
    minSessions: 3
  },
  5: {
    name: "Nearly Complete",
    description: "Add the sixth",
    noteOffsets: [0, 2, 4, 5, 7, 9], // C, D, E, F, G, A
    requiredAccuracy: 80,
    minSessions: 3
  },
  6: {
    name: "Full Major Scale",
    description: "Complete diatonic scale",
    noteOffsets: [0, 2, 4, 5, 7, 9, 11], // Full major scale
    requiredAccuracy: 85,
    minSessions: 5
  },
  7: {
    name: "Chromatic Master",
    description: "All twelve tones",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // Full chromatic
    requiredAccuracy: 90,
    minSessions: 5
  }
};

class LevelService {
  constructor() {
    this.currentLevel = this.loadCurrentLevel();
  }

  // Load current level from localStorage
  loadCurrentLevel() {
    try {
      const saved = localStorage.getItem('earTrainer_currentLevel');
      return saved ? parseInt(saved, 10) : 1; // Default to level 1
    } catch (error) {
      console.error('Failed to load current level:', error);
      return 1;
    }
  }

  // Save current level to localStorage
  saveCurrentLevel(level) {
    try {
      localStorage.setItem('earTrainer_currentLevel', level.toString());
      this.currentLevel = level;
    } catch (error) {
      console.error('Failed to save current level:', error);
    }
  }

  // Get available notes for a given level and root key
  getAvailableNotes(level, rootKeyMidi) {
    const levelData = TRAINING_LEVELS[level];
    if (!levelData) return [];
    
    return levelData.noteOffsets.map(offset => rootKeyMidi + offset);
  }

  // Check if player can advance to next level
  canAdvanceLevel(level, recentPerformance) {
    const levelData = TRAINING_LEVELS[level];
    if (!levelData || level >= 7) return false;

    const avgAccuracy = recentPerformance.averageAccuracy;
    const sessionCount = recentPerformance.sessionCount;

    return avgAccuracy >= levelData.requiredAccuracy && 
           sessionCount >= levelData.minSessions;
  }

  // Get level info
  getLevelInfo(level) {
    return TRAINING_LEVELS[level] || null;
  }

  // Get current level
  getCurrentLevel() {
    return this.currentLevel;
  }

  // Advance to next level
  advanceLevel() {
    if (this.currentLevel < 7) {
      this.saveCurrentLevel(this.currentLevel + 1);
      return this.currentLevel;
    }
    return this.currentLevel;
  }

  // Reset to specific level
  setLevel(level) {
    if (level >= 1 && level <= 7) {
      this.saveCurrentLevel(level);
      return level;
    }
    return this.currentLevel;
  }
}

export const levelService = new LevelService();