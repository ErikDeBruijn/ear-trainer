// js/game.js
import { store } from "./storage.js";

export class Game {
    constructor({pickNote, onTarget, checkAnswer, onTick, onEnd}) {
        this.state = "idle";
        this.pickNote = pickNote;
        this.onTarget = onTarget;
        this.checkAnswer = checkAnswer;
        this.onTick = onTick;
        this.onEnd = onEnd;
        this.reset();
    }
    reset() {
        this.score = 0; this.streak = 0; this.correct = 0; this.attempts = 0;
        this.practiceTime = store.getDailyPracticeTime(); this.target = null; this.noteCount = 0;
        this.responseTimes = []; this.targetStartTime = null;
    }
    start() {
        this.reset(); this.state = "prompt";
        this.nextRound();
        this.timer = setInterval(()=>this.tick(),1000);
    }
    pause() { if (this.timer) clearInterval(this.timer); this.state = "paused"; }
    tick() {
        this.practiceTime += 1; 
        store.saveDailyPracticeTime(this.practiceTime);
        const minutes = Math.floor(this.practiceTime / 60);
        const seconds = this.practiceTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.onTick(timeString);
    }
    finish() { clearInterval(this.timer); this.state = "ended"; this.onEnd(this.summary()); }
    summary() {
        const accuracy = this.attempts ? (100 * this.correct / this.attempts) : 0;
        const avgResponseTime = this.responseTimes.length ? 
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length : 0;
        return { score: this.score, streak: this.streak, accuracy, avgResponseTime };
    }
    nextRound() {
        this.noteCount++;
        this.target = this.pickNote();
        this.onTarget(this.target);
    }
    answer(midi) {
        if (this.state !== "prompt" && this.state !== "await") return;
        this.attempts++;
        
        // Calculate response time
        const responseTime = this.targetStartTime ? Date.now() - this.targetStartTime : 0;
        this.responseTimes.push(responseTime);
        
        const ok = this.checkAnswer(this.target, midi);
        if (ok) { 
            this.correct++; 
            // Base score + time bonus (faster = higher bonus)
            const timeBonus = Math.max(0, Math.floor((2000 - responseTime) / 100));
            this.score += 10 + timeBonus;
            this.streak++; 
        }
        else { this.score = Math.max(0, this.score - 5); this.streak = 0; }
        return ok;
    }
}
