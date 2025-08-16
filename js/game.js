// js/game.js
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
        this.timeLeft = 60; this.target = null;
    }
    start() {
        this.reset(); this.state = "prompt";
        this.nextRound();
        this.timer = setInterval(()=>this.tick(),1000);
    }
    pause() { if (this.timer) clearInterval(this.timer); this.state = "paused"; }
    tick() {
        this.timeLeft -= 1; this.onTick(this.timeLeft);
        if (this.timeLeft <= 0) this.finish();
    }
    finish() { clearInterval(this.timer); this.state = "ended"; this.onEnd(this.summary()); }
    summary() {
        const accuracy = this.attempts ? (100 * this.correct / this.attempts) : 0;
        return { score: this.score, streak: this.streak, accuracy };
    }
    nextRound() {
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