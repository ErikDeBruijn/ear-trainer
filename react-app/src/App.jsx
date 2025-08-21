import { useState, useEffect, useRef } from 'react';
import { midiService } from './services/midiService.js';
import { audioService } from './services/audioService.js';
import { gameService } from './services/gameService.js';
import { storageService } from './services/storageService.js';
import { lumiService } from './services/lumiService.js';
import { parseKey, rangeToMidi, randomNoteInKey, midiNoteToKeySignature } from './services/theoryService.js';
import confetti from 'canvas-confetti';

import Header from './components/Header.jsx';
import Piano from './components/Piano.jsx';
import HUD from './components/HUD.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import Status from './components/Status.jsx';

import './css/styles.css';

function App() {
  // Ref to prevent duplicate answer processing
  const processingAnswerRef = useRef(false);
  
  // Core app state
  const [appState, setAppState] = useState({
    midiEnabled: false,
    gameState: 'idle',
    settings: {
      key: 'C-major',
      range: 'C3-B4',
      homeNoteFrequency: 'always',
      practiceTarget: '10',
      volume: 70,
      settingsVisible: false
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
    currentIncorrectNote: null,
    homeNote: 0 // Default to C
  });

  // Initialize MIDI and load settings
  useEffect(() => {
    initializeApp();
    
    // Expose lumiService to window for testing in development
    if (import.meta.env.DEV) {
      window.lumiService = lumiService;
      console.log('🔧 Exposed lumiService to window for testing');
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
        key: 'C-major', 
        range: 'C3-B4', 
        homeNoteFrequency: 'always', 
        practiceTarget: '10', 
        volume: 70,
        ...savedSettings 
      };
      setupGameCallbacks(initialSettings);
      
      // Update state
      setAppState(prev => ({
        ...prev,
        midiEnabled: true,
        settings: { ...prev.settings, ...savedSettings },
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
      updateScaleHighlighting(initialSettings.key);
      
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
        const keySet = parseKey(currentSettings.key);
        const [low, high] = rangeToMidi(currentSettings.range);
        return randomNoteInKey(keySet, [low, high]);
      },
      onTarget: async (target) => {
        const homeNoteFreq = getHomeNoteFrequency(currentSettings.homeNoteFrequency);
        if (homeNoteFreq > 0) {
          const keySet = parseKey(currentSettings.key);
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
        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        // LUMI rainbow celebration with current key and range
        const keySet = parseKey(currentSettings.key);
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
      updateSettings({ key: detectedKey });
      startGame();
      return;
    }
    
    // Log the current target and the attempted answer
    const currentTarget = gameService.getState().target;
    console.log(`🎯 Target note: ${currentTarget}, Attempted: ${midiNote}, Correct: ${currentTarget === midiNote}`);
    
    // Set flag to prevent duplicate processing
    processingAnswerRef.current = true;
    
    const isCorrect = gameService.answer(midiNote);
    
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
    
    // Update LUMI hardware key setting when key changes
    if (newSettings.key !== undefined) {
      console.log(`🎹 Key changed to: ${newSettings.key}, updating LUMI...`);
      lumiService.setRootKey(newSettings.key);
    }
    
    // Update scale highlighting if key changed
    if (newSettings.key) {
      updateScaleHighlighting(newSettings.key);
    }
    
    // Update game target if changed
    if (newSettings.practiceTarget) {
      gameService.setPracticeTarget(newSettings.practiceTarget);
    }
    
    // Update game callbacks with new settings
    setupGameCallbacks(updatedSettings);
  };

  const updateScaleHighlighting = (key = appState.settings.key) => {
    const keySet = parseKey(key);
    const homeNote = keySet[0]; // First note in the key set is the root/home note
    setAppState(prev => ({
      ...prev,
      scaleNotes: new Set(keySet),
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
        progressText: `${gameData.noteCount}/${gameData.practiceTarget}`
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
    
    gameService.start();
    updateGameData();
    
    // Update LUMI scale highlighting for the current game
    updateScaleHighlighting(appState.settings.key);
  };

  const pauseGame = () => {
    gameService.pause();
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
        />
        
        <Status message={appState.status} />
      </section>
      
      <div id="overlay-flash" aria-hidden="true"></div>
    </div>
  );
}

export default App;