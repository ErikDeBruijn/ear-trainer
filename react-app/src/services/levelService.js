// services/levelService.js

export const TRAINING_LEVELS = {
  // C Major Foundation (Levels 1-6)
  1: {
    name: "Root & Fifth",
    description: "Learn the foundation interval in C major",
    noteOffsets: [0, 7], // C, G
    key: "C",
    requiredAccuracy: 80,
    minSessions: 3
  },
  2: {
    name: "Major Triad", 
    description: "Add the major third in C major",
    noteOffsets: [0, 4, 7], // C, E, G
    key: "C",
    requiredAccuracy: 80,
    minSessions: 3
  },
  3: {
    name: "Add Fourth",
    description: "Common melody notes in C major",
    noteOffsets: [0, 4, 5, 7], // C, E, F, G
    key: "C",
    requiredAccuracy: 80,
    minSessions: 3
  },
  4: {
    name: "Pentatonic Feel",
    description: "Five core scale tones in C major",
    noteOffsets: [0, 2, 4, 5, 7], // C, D, E, F, G
    key: "C",
    requiredAccuracy: 80,
    minSessions: 3
  },
  5: {
    name: "Nearly Complete",
    description: "Add the sixth in C major",
    noteOffsets: [0, 2, 4, 5, 7, 9], // C, D, E, F, G, A
    key: "C",
    requiredAccuracy: 80,
    minSessions: 3
  },
  6: {
    name: "Full C Major Scale",
    description: "Complete diatonic scale in C major",
    noteOffsets: [0, 2, 4, 5, 7, 9, 11], // C, D, E, F, G, A, B
    key: "C",
    requiredAccuracy: 85,
    minSessions: 5
  },
  
  // C Major Chromatic Expansion (Levels 7-11)
  7: {
    name: "Add C#/Db",
    description: "First chromatic note in C major",
    noteOffsets: [0, 1, 2, 4, 5, 7, 9, 11], // + C#
    key: "C",
    requiredAccuracy: 85,
    minSessions: 3
  },
  8: {
    name: "Add D#/Eb",
    description: "Second chromatic note in C major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 7, 9, 11], // + D#
    key: "C",
    requiredAccuracy: 85,
    minSessions: 3
  },
  9: {
    name: "Add F#/Gb",
    description: "Third chromatic note in C major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 9, 11], // + F#
    key: "C",
    requiredAccuracy: 85,
    minSessions: 3
  },
  10: {
    name: "Add G#/Ab",
    description: "Fourth chromatic note in C major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11], // + G#
    key: "C",
    requiredAccuracy: 85,
    minSessions: 3
  },
  11: {
    name: "Add A#/Bb",
    description: "Complete chromatic scale in C major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // + A#
    key: "C",
    requiredAccuracy: 90,
    minSessions: 5
  },
  
  // F Major Progression (Levels 12-17)
  12: {
    name: "F Major Triad",
    description: "Major triad in F major",
    noteOffsets: [0, 4, 7], // F, A, C
    key: "F",
    requiredAccuracy: 80,
    minSessions: 3
  },
  13: {
    name: "F Major Pentatonic",
    description: "Five core tones in F major",
    noteOffsets: [0, 2, 4, 5, 7], // F, G, A, Bb, C
    key: "F",
    requiredAccuracy: 80,
    minSessions: 3
  },
  14: {
    name: "Full F Major Scale",
    description: "Complete diatonic scale in F major",
    noteOffsets: [0, 2, 4, 5, 7, 9, 10], // F, G, A, Bb, C, D, E
    key: "F",
    requiredAccuracy: 85,
    minSessions: 4
  },
  15: {
    name: "F Major + Chromatics",
    description: "Add chromatic passing tones in F major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All chromatic from F
    key: "F",
    requiredAccuracy: 90,
    minSessions: 5
  },
  
  // G Major Progression (Levels 16-19)
  16: {
    name: "G Major Triad",
    description: "Major triad in G major",
    noteOffsets: [0, 4, 7], // G, B, D
    key: "G",
    requiredAccuracy: 80,
    minSessions: 3
  },
  17: {
    name: "G Major Pentatonic",
    description: "Five core tones in G major",
    noteOffsets: [0, 2, 4, 5, 7], // G, A, B, C, D
    key: "G",
    requiredAccuracy: 80,
    minSessions: 3
  },
  18: {
    name: "Full G Major Scale",
    description: "Complete diatonic scale in G major",
    noteOffsets: [0, 2, 4, 6, 7, 9, 11], // G, A, B, C#, D, E, F#
    key: "G",
    requiredAccuracy: 85,
    minSessions: 4
  },
  19: {
    name: "G Major + Chromatics",
    description: "Add chromatic passing tones in G major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All chromatic from G
    key: "G",
    requiredAccuracy: 90,
    minSessions: 5
  },
  
  // D Major Progression (Levels 20-23)
  20: {
    name: "D Major Triad",
    description: "Major triad in D major",
    noteOffsets: [0, 4, 7], // D, F#, A
    key: "D",
    requiredAccuracy: 80,
    minSessions: 3
  },
  21: {
    name: "D Major Pentatonic",
    description: "Five core tones in D major",
    noteOffsets: [0, 2, 4, 5, 7], // D, E, F#, G, A
    key: "D",
    requiredAccuracy: 80,
    minSessions: 3
  },
  22: {
    name: "Full D Major Scale",
    description: "Complete diatonic scale in D major",
    noteOffsets: [0, 2, 4, 6, 7, 9, 11], // D, E, F#, G, A, B, C#
    key: "D",
    requiredAccuracy: 85,
    minSessions: 4
  },
  23: {
    name: "D Major + Chromatics",
    description: "Add chromatic passing tones in D major",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All chromatic from D
    key: "D",
    requiredAccuracy: 90,
    minSessions: 5
  },
  
  // Multi-Octave Master Levels (Levels 24-26)
  24: {
    name: "Two Octave C Major",
    description: "C major scale across two octaves",
    noteOffsets: [0, 2, 4, 5, 7, 9, 11], // Same pattern, expanded range
    key: "C",
    octaves: 2,
    requiredAccuracy: 85,
    minSessions: 6
  },
  25: {
    name: "Two Octave Chromatic",
    description: "All chromatic notes across two octaves",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    key: "C",
    octaves: 2,
    requiredAccuracy: 90,
    minSessions: 8
  },
  26: {
    name: "Grand Master",
    description: "All keys and octaves mastered",
    noteOffsets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    key: "any",
    octaves: 2,
    requiredAccuracy: 95,
    minSessions: 10
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

  // Get available notes for a given level
  getAvailableNotes(level, rootKeyMidi) {
    const levelData = TRAINING_LEVELS[level];
    if (!levelData) return [];
    
    // Calculate the root MIDI note for the level's key
    const keyRootMidi = this.getKeyRootMidi(levelData.key, rootKeyMidi);
    
    // Handle multi-octave levels
    const octaves = levelData.octaves || 1;
    const notes = [];
    
    for (let octave = 0; octave < octaves; octave++) {
      const octaveOffset = octave * 12;
      levelData.noteOffsets.forEach(offset => {
        notes.push(keyRootMidi + offset + octaveOffset);
      });
    }
    
    return notes;
  }
  
  // Get the root MIDI note for a specific key
  getKeyRootMidi(levelKey, baseRootMidi) {
    if (levelKey === "any") return baseRootMidi;
    
    const keyOffsets = {
      "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11
    };
    
    const baseKeyOffset = baseRootMidi % 12;
    const targetKeyOffset = keyOffsets[levelKey] || 0;
    const octaveBase = Math.floor(baseRootMidi / 12) * 12;
    
    return octaveBase + targetKeyOffset;
  }

  // Check if player can advance to next level
  canAdvanceLevel(level, recentPerformance) {
    const levelData = TRAINING_LEVELS[level];
    if (!levelData || level >= 26) return false; // Updated max level

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
    if (this.currentLevel < 26) { // Updated max level
      this.saveCurrentLevel(this.currentLevel + 1);
      return this.currentLevel;
    }
    return this.currentLevel;
  }

  // Reset to specific level
  setLevel(level) {
    if (level >= 1 && level <= 26) { // Updated max level
      this.saveCurrentLevel(level);
      return level;
    }
    return this.currentLevel;
  }
  
  // Get the key signature for a level
  getLevelKey(level) {
    const levelData = TRAINING_LEVELS[level];
    return levelData?.key || "C";
  }
  
  // Get maximum available level
  getMaxLevel() {
    return 26;
  }
}

export const levelService = new LevelService();