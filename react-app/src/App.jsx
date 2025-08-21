import { useState, useEffect, useRef } from 'react';
import { midiService } from './services/midiService.js';
import { audioService } from './services/audioService.js';
import { gameService } from './services/gameService.js';
import { storageService } from './services/storageService.js';
import { lumiService } from './services/lumiService.js';
import { analyticsService } from './services/analyticsService.js';
import { levelService, TRAINING_LEVELS } from './services/levelService.js';
import { parseKey, rangeToMidi, randomNoteInKey, midiNoteToKeySignature } from './services/theoryService.js';
import confetti from 'canvas-confetti';

import Header from './components/Header.jsx';
import Piano from './components/Piano.jsx';
import HUD from './components/HUD.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import Status from './components/Status.jsx';
import LatestSessions from './components/LatestSessions.jsx';
import StatsScreen from './components/StatsScreen.jsx';

import './css/styles.css';

function App() {
  // Ref to prevent duplicate answer processing
  const processingAnswerRef = useRef(false);
  // Ref to track when target note was played (for response time)
  const targetPlayedTimeRef = useRef(null);
  
  // Core app state
  const [showStatsScreen, setShowStatsScreen] = useState(false);
  const [levelUnlockNotification, setLevelUnlockNotification] = useState(null);
  const [appState, setAppState] = useState({
    midiEnabled: false,
    gameState: 'idle',
    settings: {
      rootKey: 'C',
      scale: 'major',
      range: 'C3-B4',
      homeNoteFrequency: 'always',
      practiceTarget: '4',
      volume: 70,
      settingsVisible: false,
      trainingMode: true,
      currentLevel: levelService.getCurrentLevel()
    },
    midiDevices: {
      inputs: [],
      outputs: [],
      selectedInputs: [],
      selectedOutputs: []
    },
    gameData: {
      score: 0,
      streak: 0,
      practiceTime: '0:00',
      accuracy: '—',
      progress: 0,
      progressText: ''
    },
    status: '',
    activeNotes: new Set(),
    scaleNotes: new Set(),
    availableNotes: new Set(), // For training mode - actual MIDI notes available
    currentIncorrectNote: null,
    homeNote: 0 // Default to C
  });

  // Initialize MIDI and load settings
  useEffect(() => {
    initializeApp();
    
    // Expose services to window for testing in development
    if (import.meta.env.DEV) {
      window.lumiService = lumiService;
      window.analyticsService = analyticsService;
      window.gameService = gameService;
      window.levelService = levelService;
      window.parseKey = parseKey;
      window.rangeToMidi = rangeToMidi;
      window.appState = appState;
      console.log('🔧 Exposed services to window for testing');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      // Enable MIDI
      await midiService.enable();
      
      // Load persisted settings
      const savedSettings = storageService.getSettings();
      const savedInputs = storageService.getMidiInputs();
      const savedOutputs = storageService.getMidiOutputs();
      
      // Setup device change listener
      midiService.onDeviceChange = () => updateMidiDevices();
      
      // Initialize audio
      await audioService.resume();
      
      // Setup game callbacks with initial settings
      const initialSettings = { 
        rootKey: 'C',
        scale: 'major',
        range: 'C3-B4', 
        homeNoteFrequency: 'always', 
        practiceTarget: '10', 
        volume: 70,
        trainingMode: true,
        currentLevel: levelService.getCurrentLevel(),
        ...savedSettings 
      };
      setupGameCallbacks(initialSettings);
      
      // Update state
      setAppState(prev => ({
        ...prev,
        midiEnabled: true,
        settings: { ...prev.settings, ...initialSettings },
        midiDevices: {
          inputs: midiService.inputs,
          outputs: midiService.outputs,
          selectedInputs: savedInputs,
          selectedOutputs: savedOutputs
        }
      }));
      
      // Apply saved device selections
      if (savedInputs.length > 0) {
        midiService.setActiveInputs(savedInputs);
        setupMidiListeners();
      }
      if (savedOutputs.length > 0) {
        midiService.setActiveOutputs(savedOutputs);
      }
      
      // Auto-select LUMI devices if available - will be called after state update
      
      // Update scale highlighting with proper key
      updateScaleHighlighting(`${initialSettings.rootKey}-${initialSettings.scale}`);
      
      // Load daily practice time
      updatePracticeTime();
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setStatus('MIDI not available - you can still use the on-screen keyboard');
    }
  };

  const setupGameCallbacks = (currentSettings = appState.settings) => {
    gameService.setCallbacks({
      pickNote: () => {
        const keySignature = `${currentSettings.rootKey}-${currentSettings.scale}`;
        const keySet = parseKey(keySignature);
        const [low, high] = rangeToMidi(currentSettings.range);
        
        if (currentSettings.trainingMode) {
          // In training mode, restrict to current level notes
          // Use the low MIDI note as the root to get proper octave
          const rootKeyMidi = low + (keySet[0] - (low % 12) + 12) % 12;
          const availableNotes = levelService.getAvailableNotes(currentSettings.currentLevel, rootKeyMidi);
          
          if (availableNotes && availableNotes.length > 0 && low !== null && high !== null) {
            // Filter available notes to the specified range
            const notesInRange = availableNotes.filter(note => note >= low && note <= high);
            
            if (notesInRange.length > 0) {
              const chosen = notesInRange[Math.floor(Math.random() * notesInRange.length)];
              return chosen;
            }
          }
        }
        
        // Advanced mode or fallback - use full key set
        return randomNoteInKey(keySet, [low, high]);
      },
      onTarget: async (target) => {
        const homeNoteFreq = getHomeNoteFrequency(currentSettings.homeNoteFrequency);
        // Record when target note is played for response time tracking
        targetPlayedTimeRef.current = Date.now();
        
        if (homeNoteFreq > 0) {
          const keySignature = `${currentSettings.rootKey}-${currentSettings.scale}`;
          const keySet = parseKey(keySignature);
          const tonic = keySet[0] + Math.floor(target / 12) * 12;
          await audioService.playTonicThenTarget(tonic, target, 0.5, 0.3, 0.35, homeNoteFreq);
        } else {
          await audioService.playTonicThenTarget(null, target, 0, 0, 0.35, 0);
        }
      },
      checkAnswer: (target, answer) => target === answer,
      onTick: (timeString) => {
        setAppState(prev => ({
          ...prev,
          gameData: { ...prev.gameData, practiceTime: timeString }
        }));
      },
      onEnd: (summary) => {
        setStatus(`Session complete! Final score: ${summary.score}`);
        
        // End analytics session and save data
        const currentGameState = gameService.getState();
        const sessionData = analyticsService.endSession(currentGameState);
        if (sessionData) {
          console.log(`📊 Session saved: ${sessionData.summary.accuracy}% accuracy, ${sessionData.summary.totalNotes} notes`);
        }
        
        // Check for level progression in training mode
        if (currentSettings.trainingMode && sessionData) {
          checkLevelProgression(sessionData);
        }
        
        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        // LUMI rainbow celebration with current key and range
        const keySignature = `${currentSettings.rootKey}-${currentSettings.scale}`;
        const keySet = parseKey(keySignature);
        const [low, high] = rangeToMidi(currentSettings.range);
        lumiService.sendRainbowCelebration(keySet, low, high);
      },
      onStateChange: (newState) => {
        setAppState(prev => ({ ...prev, gameState: newState }));
        updateGameData();
      }
    });
  };

  const setupMidiListeners = () => {
    midiService.onNote((event) => {
      if (event.type === "on") {
        audioService.startSustainedNote(event.note, -3);
        midiService.sendNoteOn(event.note, event.velocity);
        handleAnswer(event.note);
        
        // Update active notes for visual feedback
        setAppState(prev => ({
          ...prev,
          activeNotes: new Set([...prev.activeNotes, event.note])
        }));
      } else if (event.type === "off") {
        midiService.sendNoteOff(event.note);
        handleNoteOff(event.note);
        
        // Remove from active notes
        setAppState(prev => {
          const newActiveNotes = new Set(prev.activeNotes);
          newActiveNotes.delete(event.note);
          return { ...prev, activeNotes: newActiveNotes };
        });
      }
    });
  };

  const handleAnswer = (midiNote) => {
    // Prevent duplicate answer processing
    if (processingAnswerRef.current) {
      console.log(`⚠️ Duplicate answer blocked for note ${midiNote}`);
      return;
    }
    
    if (gameService.getState().state === 'idle') {
      // Auto-start game and set key based on first note played
      const detectedKey = midiNoteToKeySignature(midiNote);
      const [rootKey, scale] = detectedKey.split('-');
      updateSettings({ rootKey, scale });
      startGame();
      return;
    }
    
    // Log the current target and the attempted answer
    const currentTarget = gameService.getState().target;
    console.log(`🎯 Target note: ${currentTarget}, Attempted: ${midiNote}, Correct: ${currentTarget === midiNote}`);
    
    // Set flag to prevent duplicate processing
    processingAnswerRef.current = true;
    
    const isCorrect = gameService.answer(midiNote);
    
    // Calculate response time
    const responseTime = targetPlayedTimeRef.current ? Date.now() - targetPlayedTimeRef.current : null;
    
    // Log attempt to analytics
    const currentGameState = gameService.getState();
    analyticsService.logAttempt(
      currentTarget, 
      midiNote, 
      isCorrect, 
      responseTime,
      currentGameState.streak
    );
    
    if (isCorrect) {
      console.log(`✅ Correct! Advancing from ${gameService.getState().noteCount - 1} to ${gameService.getState().noteCount}`);
      // Clear any incorrect note when answer is correct
      setAppState(prev => ({
        ...prev,
        currentIncorrectNote: null
      }));
      flashScreen('correct');
      lumiService.sendPrimaryGreen(); // Green flash for correct answer
      setTimeout(() => {
        gameService.nextRound();
        updateGameData();
        // Reset flag after processing is complete
        processingAnswerRef.current = false;
      }, 750); // Brief pause before next note
    } else {
      console.log(`❌ Incorrect! Try again.`);
      // Set the current incorrect note for red feedback
      setAppState(prev => ({
        ...prev,
        currentIncorrectNote: midiNote
      }));
      flashScreen('incorrect');
      lumiService.sendPrimaryRed(); // Red flash for incorrect answer
      // Reset flag immediately for incorrect answers
      processingAnswerRef.current = false;
    }
    
    updateGameData();
  };

  const handleNoteOff = (midiNote) => {
    audioService.stopSustainedNote(midiNote);
  };

  const updateMidiDevices = () => {
    setAppState(prev => ({
      ...prev,
      midiDevices: {
        ...prev.midiDevices,
        inputs: midiService.inputs,
        outputs: midiService.outputs
      }
    }));
  };


  const updateMidiDeviceSelection = (inputIds, outputIds) => {
    const prevOutputs = appState.midiDevices.selectedOutputs;
    
    midiService.setActiveInputs(inputIds);
    midiService.setActiveOutputs(outputIds);
    storageService.saveMidiInputs(inputIds);
    storageService.saveMidiOutputs(outputIds);
    
    setAppState(prev => ({
      ...prev,
      midiDevices: {
        ...prev.midiDevices,
        selectedInputs: inputIds,
        selectedOutputs: outputIds
      }
    }));
    
    setupMidiListeners();
    
    // Trigger rainbow celebration when LUMI device is newly connected as output
    if (outputIds.length > prevOutputs.length) {
      const newOutputIds = outputIds.filter(id => !prevOutputs.includes(id));
      const newLumiOutputs = newOutputIds.filter(id => {
        const device = midiService.outputs.find(d => d.id === id);
        return device && midiService.isLumiDevice(device);
      });
      
      if (newLumiOutputs.length > 0) {
        console.log('🌈 LUMI device connected! Triggering welcome rainbow...');
        // Small delay to ensure LUMI service is properly bound
        setTimeout(() => {
          const keySet = parseKey(appState.settings.key);
          const [low, high] = rangeToMidi(appState.settings.range);
          lumiService.sendRainbowCelebration(keySet, low, high);
        }, 500);
      }
    }
  };

  const updateSettings = (newSettings) => {
    const updatedSettings = { ...appState.settings, ...newSettings };
    
    setAppState(prev => ({
      ...prev,
      settings: updatedSettings
    }));
    
    // Save to storage
    storageService.saveSettings(updatedSettings);
    
    // Update audio volume if changed
    if (newSettings.volume !== undefined) {
      audioService.setMasterVolume(newSettings.volume);
    }
    
    // Update LUMI hardware when rootKey or scale changes
    if (newSettings.rootKey !== undefined || newSettings.scale !== undefined) {
      const rootKey = newSettings.rootKey || updatedSettings.rootKey;
      const scale = newSettings.scale || updatedSettings.scale;
      const keySignature = `${rootKey}-${scale}`;
      
      console.log(`🎼 Updating LUMI: ${rootKey} ${scale}`);
      
      // Set both root key and scale on LUMI hardware  
      lumiService.setRootKey(keySignature);
      lumiService.setScale(scale);
      
      // Update scale highlighting
      updateScaleHighlighting(keySignature);
    }
    
    // Update game target if changed
    if (newSettings.practiceTarget) {
      gameService.setPracticeTarget(newSettings.practiceTarget);
    }
    
    // Update game callbacks with new settings
    setupGameCallbacks(updatedSettings);
  };

  const updateScaleHighlighting = (key = `${appState.settings.rootKey}-${appState.settings.scale}`) => {
    const keySet = parseKey(key);
    const homeNote = keySet[0]; // First note in the key set is the root/home note
    
    let notesToHighlight;
    let availableNotesSet = new Set();
    
    if (appState.settings.trainingMode) {
      // In training mode, only highlight current level notes
      const [low, high] = rangeToMidi(appState.settings.range);
      // Use the root note from the range (e.g., C3 = 48 for C3-B4 range)
      const rootKeyMidi = low;
      const availableMidiNotes = levelService.getAvailableNotes(appState.settings.currentLevel, rootKeyMidi);
      
      // Filter available notes to only those in the current range
      const notesInRange = availableMidiNotes.filter(note => note >= low && note <= high);
      availableNotesSet = new Set(notesInRange);
      
      // For scaleNotes, use the note classes of the notes that are actually in range
      const noteClasses = notesInRange.map(note => note % 12);
      notesToHighlight = new Set(noteClasses);
      
      console.log(`Training mode: level ${appState.settings.currentLevel}, root MIDI:`, rootKeyMidi, 'available MIDI notes:', availableMidiNotes, 'in range:', notesInRange);
    } else {
      // Advanced mode - highlight full key set  
      notesToHighlight = new Set(keySet);
    }
    
    setAppState(prev => ({
      ...prev,
      scaleNotes: notesToHighlight,
      availableNotes: availableNotesSet,
      homeNote: homeNote
    }));
    
    // Also update LUMI keyboard lighting
    const [low, high] = rangeToMidi(appState.settings.range);
    lumiService.setScaleColors(keySet, low, high);
  };

  const updateGameData = () => {
    const gameData = gameService.getState();
    const accuracy = gameData.attempts > 0 ? Math.round((gameData.correct / gameData.attempts) * 100) : 0;
    
    setAppState(prev => ({
      ...prev,
      gameData: {
        score: gameData.score,
        streak: gameData.streak,
        practiceTime: prev.gameData.practiceTime, // Keep existing time
        accuracy: accuracy > 0 ? `${accuracy}%` : '—',
        progress: gameData.progress,
        progressText: `${gameData.noteCount}/${gameData.practiceTarget}`,
        noteResults: gameData.noteResults
      }
    }));
  };

  const updatePracticeTime = () => {
    const totalTime = storageService.getDailyPracticeTime();
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    setAppState(prev => ({
      ...prev,
      gameData: { ...prev.gameData, practiceTime: timeString }
    }));
  };

  const startGame = () => {
    // Clear any incorrect note feedback when starting new game
    setAppState(prev => ({
      ...prev,
      currentIncorrectNote: null
    }));
    
    // Start analytics session
    analyticsService.startSession(appState.settings);
    
    gameService.start();
    // Set the practice target after starting (since start() calls reset())
    gameService.setPracticeTarget(appState.settings.practiceTarget);
    updateGameData(); // Update UI with correct practice target
    
    // Update LUMI scale highlighting for the current game
    updateScaleHighlighting(`${appState.settings.rootKey}-${appState.settings.scale}`);
  };

  const pauseGame = () => {
    gameService.pause();
    
    // End analytics session when manually pausing
    const currentGameState = gameService.getState();
    if (analyticsService.currentSession && currentGameState) {
      const sessionData = analyticsService.endSession(currentGameState);
      if (sessionData) {
        console.log(`📊 Session paused and saved: ${sessionData.summary.accuracy}% accuracy`);
      }
    }
  };

  const replayNotes = async () => {
    await audioService.replayCurrentNotes();
  };

  const flashScreen = (type) => {
    // Visual feedback implementation
    setStatus(type === 'correct' ? '✓' : '✗');
    setTimeout(() => setStatus(''), 500);
  };

  const setStatus = (message) => {
    setAppState(prev => ({ ...prev, status: message }));
  };

  const getHomeNoteFrequency = (setting) => {
    const frequencies = {
      'always': 1.0,
      'every-2': 0.5,
      'every-3': 0.33,
      'every-4': 0.25,
      'first-only': 0.1,
      'never': 0
    };
    return frequencies[setting] || 1.0;
  };

  const checkLevelProgression = (sessionData) => {
    const currentLevel = appState.settings.currentLevel;
    if (currentLevel >= 7) return; // Already at max level
    
    // Get recent performance for current level
    const recentSessions = analyticsService.getRecentSessions(10);
    const currentLevelSessions = recentSessions.filter(session => 
      session.settings.trainingMode && 
      session.settings.currentLevel === currentLevel
    );
    
    if (currentLevelSessions.length === 0) return;
    
    // Calculate performance metrics
    const totalAccuracy = currentLevelSessions.reduce((sum, session) => sum + session.summary.accuracy, 0);
    const averageAccuracy = totalAccuracy / currentLevelSessions.length;
    const sessionCount = currentLevelSessions.length;
    
    const recentPerformance = { averageAccuracy, sessionCount };
    
    // Check if can advance
    if (levelService.canAdvanceLevel(currentLevel, recentPerformance)) {
      // Show unlock notification after a brief delay
      setTimeout(() => {
        const nextLevel = currentLevel + 1;
        const nextLevelInfo = levelService.getLevelInfo(nextLevel);
        
        // Show prominent unlock notification
        setLevelUnlockNotification({
          level: nextLevel,
          name: nextLevelInfo.name,
          description: nextLevelInfo.description
        });
        
        // Auto-advance to next level
        const newLevel = levelService.advanceLevel();
        updateSettings({ currentLevel: newLevel });
        
        // Clear notification after 5 seconds
        setTimeout(() => setLevelUnlockNotification(null), 5000);
      }, 2000); // Show after confetti
    }
  };

  const handlePianoKeyPress = (midiNote) => {
    // Always handle piano key presses - the duplicate prevention is in handleAnswer
    handleAnswer(midiNote);
    
    // Always provide visual and audio feedback for piano keys
    audioService.startSustainedNote(midiNote, -3);
    
    // Add visual feedback
    setAppState(prev => ({
      ...prev,
      activeNotes: new Set([...prev.activeNotes, midiNote])
    }));
    
    // Remove visual feedback after short delay
    setTimeout(() => {
      audioService.stopSustainedNote(midiNote);
      setAppState(prev => {
        const newActiveNotes = new Set(prev.activeNotes);
        newActiveNotes.delete(midiNote);
        return { ...prev, activeNotes: newActiveNotes };
      });
    }, 200);
  };

  const isIncorrectAnswer = (midiNote) => {
    return appState.currentIncorrectNote === midiNote;
  };

  const handleViewAllStats = () => {
    setShowStatsScreen(true);
  };

  const handleCloseStats = () => {
    setShowStatsScreen(false);
  };

  const handlePracticeWeakSpot = (rootKey, scale) => {
    // Update settings to practice this exact key-scale combination
    updateSettings({ rootKey, scale });
    
    // Ensure scale highlighting is updated immediately
    updateScaleHighlighting(`${rootKey}-${scale}`);
    
    // Close stats and start practice
    setShowStatsScreen(false);
    startGame();
  };

  if (showStatsScreen) {
    return <StatsScreen onClose={handleCloseStats} onPracticeWeakSpot={handlePracticeWeakSpot} />;
  }

  return (
    <div className="container">
      <Header 
        settings={appState.settings}
        midiDevices={appState.midiDevices}
        gameState={appState.gameState}
        onSettingsChange={updateSettings}
        onMidiDeviceChange={updateMidiDeviceSelection}
        onStartPause={(appState.gameState === 'idle' || appState.gameState === 'ended') ? startGame : pauseGame}
        onReplay={replayNotes}
      />
      
      <section className="panel">
        <Piano 
          activeNotes={appState.activeNotes}
          scaleNotes={appState.scaleNotes}
          noteRange={appState.settings.range}
          onKeyPress={handlePianoKeyPress}
          isIncorrectAnswer={isIncorrectAnswer}
          homeNote={appState.homeNote}
          trainingMode={appState.settings.trainingMode}
          availableNotes={appState.availableNotes}
        />
        
        <HUD 
          score={appState.gameData.score}
          streak={appState.gameData.streak}
          practiceTime={appState.gameData.practiceTime}
          accuracy={appState.gameData.accuracy}
        />
        
        <ProgressBar 
          progress={appState.gameData.progress}
          progressText={appState.gameData.progressText}
          noteResults={appState.gameData.noteResults}
          practiceTarget={appState.settings.practiceTarget}
          currentNoteNumber={appState.gameData.noteCount}
        />
        
        <Status message={appState.status} />
      </section>
      
      <LatestSessions onViewAll={handleViewAllStats} />
      
      {levelUnlockNotification && (
        <div className="level-unlock-overlay">
          <div className="level-unlock-notification">
            <div className="unlock-icon">🔓</div>
            <div className="unlock-title">Level {levelUnlockNotification.level} Unlocked!</div>
            <div className="unlock-name">{levelUnlockNotification.name}</div>
            <div className="unlock-description">{levelUnlockNotification.description}</div>
            <button 
              className="unlock-dismiss"
              onClick={() => setLevelUnlockNotification(null)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      
      <div id="overlay-flash" aria-hidden="true"></div>
    </div>
  );
}

export default App;