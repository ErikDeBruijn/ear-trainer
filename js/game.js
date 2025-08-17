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
        return { score: this.score, streak: this.streak, accuracy };
    }
    nextRound() {
        this.noteCount++;
        this.target = this.pickNote();
        this.onTarget(this.target);
    }
    answer(midi) {
        if (this.state !== "prompt" && this.state !== "await") return;
        this.attempts++;
        const ok = this.checkAnswer(this.target, midi);
        if (ok) { this.correct++; this.score += 10; this.streak++; }
        else { this.score = Math.max(0, this.score - 5); this.streak = 0; }
        return ok;
    }
}
