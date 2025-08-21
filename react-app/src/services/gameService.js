// services/gameService.js
import { storageService } from './storageService.js';

export class GameService {
    constructor() {
        this.state = "idle";
        this.reset();
        this.callbacks = {
            pickNote: null,
            onTarget: null,
            checkAnswer: null,
            onTick: null,
            onEnd: null,
            onStateChange: null
        };
    }
    
    // Set callback functions
    setCallbacks({ pickNote, onTarget, checkAnswer, onTick, onEnd, onStateChange }) {
        this.callbacks = {
            ...this.callbacks,
            pickNote: pickNote || this.callbacks.pickNote,
            onTarget: onTarget || this.callbacks.onTarget,
            checkAnswer: checkAnswer || this.callbacks.checkAnswer,
            onTick: onTick || this.callbacks.onTick,
            onEnd: onEnd || this.callbacks.onEnd,
            onStateChange: onStateChange || this.callbacks.onStateChange
        };
    }
    
    reset() {
        this.score = 0; 
        this.streak = 0; 
        this.correct = 0; 
        this.attempts = 0;
        this.sessionTime = 0; 
        this.target = null; 
        this.noteCount = 0;
        this.responseTimes = []; 
        this.targetStartTime = null;
        this.practiceTarget = 10; // Default target
    }
    
    setPracticeTarget(target) {
        this.practiceTarget = parseInt(target, 10);
    }
    
    start() {
        this.reset(); 
        this.state = "prompt";
        this.nextRound();
        this.timer = setInterval(() => this.tick(), 1000);
        if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state);
    }
    
    pause() { 
        if (this.timer) clearInterval(this.timer); 
        this.state = "paused"; 
        if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state);
    }
    
    tick() {
        this.sessionTime += 1; 
        storageService.addDailyPracticeTime(1);
        const totalTime = storageService.getDailyPracticeTime();
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (this.callbacks.onTick) this.callbacks.onTick(timeString);
    }
    
    finish() { 
        clearInterval(this.timer); 
        this.state = "ended"; 
        if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state);
        if (this.callbacks.onEnd) this.callbacks.onEnd(this.summary()); 
    }
    
    summary() {
        const accuracy = this.attempts ? (100 * this.correct / this.attempts) : 0;
        const avgResponseTime = this.responseTimes.length ? 
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length : 0;
        return { score: this.score, streak: this.streak, accuracy, avgResponseTime };
    }
    
    nextRound() {
        // Check if we've reached our practice target
        if (this.noteCount >= this.practiceTarget) {
            this.finish();
            return;
        }
        
        this.noteCount++;
        if (this.callbacks.pickNote) {
            this.target = this.callbacks.pickNote();
            this.targetStartTime = Date.now();
            console.log(`🎵 New target generated: ${this.target} (Round ${this.noteCount}/${this.practiceTarget})`);
            if (this.callbacks.onTarget) this.callbacks.onTarget(this.target);
        }
    }
    
    answer(midi) {
        if (this.state !== "prompt" && this.state !== "await") return false;
        this.attempts++;
        
        // Calculate response time
        const responseTime = this.targetStartTime ? Date.now() - this.targetStartTime : 0;
        this.responseTimes.push(responseTime);
        
        let ok = false;
        if (this.callbacks.checkAnswer) {
            ok = this.callbacks.checkAnswer(this.target, midi);
        }
        
        if (ok) { 
            this.correct++; 
            // Base score + time bonus (faster = higher bonus)
            const timeBonus = Math.max(0, Math.floor((2000 - responseTime) / 100));
            this.score += 10 + timeBonus;
            this.streak++; 
        } else { 
            this.score = Math.max(0, this.score - 5); 
            this.streak = 0; 
        }
        
        return ok;
    }
    
    // Getters for current state
    getState() {
        return {
            state: this.state,
            score: this.score,
            streak: this.streak,
            correct: this.correct,
            attempts: this.attempts,
            noteCount: this.noteCount,
            practiceTarget: this.practiceTarget,
            target: this.target,
            progress: this.practiceTarget > 0 ? (this.noteCount / this.practiceTarget) * 100 : 0
        };
    }
}

// Export singleton instance
export const gameService = new GameService();