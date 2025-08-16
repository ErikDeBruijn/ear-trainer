// js/ui.js
export class UI {
    constructor() {
        this.kbd = document.getElementById("kbd");
        this.scoreEl = document.getElementById("score");
        this.streakEl = document.getElementById("streak");
        this.timerEl = document.getElementById("timer");
        this.accEl = document.getElementById("acc");
        this.statusEl = document.getElementById("status");
    }

    onScreenKey(cb) {
      if (!this.kbd) return;
      // webaudio-keyboard emits e.note as [state, midiNumber]; fire only on note-on
      this.kbd.addEventListener("change", e => {
        const pair = e.note || e.detail?.note;
        if (Array.isArray(pair)) {
          const [state, number] = pair;
          if (state === 1) cb(number);
        }
      });
    }

    highlightTarget(midi) {
      if (this.kbd && typeof this.kbd.setNote === "function") {
        this.kbd.setNote(1, midi);
        setTimeout(() => this.kbd.setNote(0, midi), 400);
      }
    }

    flash(midi, ok) {
        this.statusEl.textContent = ok ? "Correct!" : "Wrong";
        this.statusEl.className = `status status-pill ${ok ? "ok" : "bad"}`;
        this.statusEl.setAttribute("aria-live", "polite");
    }

    clearStatus() {
        this.statusEl.textContent = "";
        this.statusEl.className = "status";
    }

    flashScreen(kind = "ok") {
      const el = document.getElementById("overlay-flash");
      if (!el) return;
      el.classList.remove("flash-ok", "flash-bad");
      el.classList.add(kind === "ok" ? "flash-ok" : "flash-bad");
      // auto-clear after short pulse
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => this.clearScreenFlash(), 140);
    }

    clearScreenFlash() {
      const el = document.getElementById("overlay-flash");
      if (!el) return;
      el.classList.remove("flash-ok", "flash-bad");
    }

    updateHUD({score, streak, timer, accuracy}) {
        if (score != null) this.scoreEl.textContent = score;
        if (streak != null) this.streakEl.textContent = streak;
        if (timer != null) this.timerEl.textContent = timer;
        if (accuracy != null) this.accEl.textContent = isNaN(accuracy) ? "—" : `${Math.round(accuracy)}%`;
    }
}