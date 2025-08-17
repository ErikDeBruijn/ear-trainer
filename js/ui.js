// js/ui.js
export class UI {
    constructor() {
        this.pianoKeys = document.getElementById("piano-keys");
        this.scoreEl = document.getElementById("score");
        this.streakEl = document.getElementById("streak");
        this.timerEl = document.getElementById("timer");
        this.accEl = document.getElementById("acc");
        this.statusEl = document.getElementById("status");
    }

    onScreenKey(cb, noteOffCb) {
      if (!this.pianoKeys) return;
      // HTML piano keys with data-note attributes
      this.pianoKeys.addEventListener("mousedown", e => {
        const key = e.target.closest('.key');
        if (key && key.dataset.note) {
          const midiNote = parseInt(key.dataset.note);
          cb(midiNote);
        }
      });
      
      // Add mouseup handler for note off
      if (noteOffCb) {
        this.pianoKeys.addEventListener("mouseup", e => {
          const key = e.target.closest('.key');
          if (key && key.dataset.note) {
            const midiNote = parseInt(key.dataset.note);
            noteOffCb(midiNote);
          }
        });
        
        // Also handle mouse leave to stop notes when dragging off keys
        this.pianoKeys.addEventListener("mouseleave", e => {
          const key = e.target.closest('.key');
          if (key && key.dataset.note) {
            const midiNote = parseInt(key.dataset.note);
            noteOffCb(midiNote);
          }
        });
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

    updateStatus(message) {
        this.statusEl.textContent = message;
        this.statusEl.className = "status success";
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

    setKeyboardRange(min, maxExclusive) {
      // HTML piano keyboard range is fixed in the HTML structure
      // This method is kept for compatibility but doesn't need to do anything
    }

    highlightScaleNotes(keySet, min, maxExclusive) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const highlightedNotes = [];
      
      // Clear all highlights
      const allKeys = document.querySelectorAll('#piano-keys .key');
      allKeys.forEach(key => key.classList.remove('highlighted'));
      
      // Highlight scale notes
      for (let midiNote = min; midiNote < maxExclusive; midiNote++) {
        if (keySet.includes(midiNote % 12)) {
          const octave = Math.floor(midiNote / 12) - 1;
          const noteName = noteNames[midiNote % 12];
          highlightedNotes.push(`${noteName}${octave}`);
          
          // Find and highlight the key with this MIDI note
          const keyElement = document.querySelector(`#piano-keys .key[data-note="${midiNote}"]`);
          if (keyElement) {
            keyElement.classList.add('highlighted');
          }
        }
      }
      
      console.log(`Highlighted keys: ${highlightedNotes.join(', ')}`);
    }

    updateHUD({score, streak, timer, accuracy}) {
        if (score != null) this.scoreEl.textContent = score;
        if (streak != null) this.streakEl.textContent = streak;
        if (timer != null) this.timerEl.textContent = timer;
        if (accuracy != null) this.accEl.textContent = isNaN(accuracy) ? "—" : `${Math.round(accuracy)}%`;
    }


    showConfetti() {
        // Use canvas-confetti library
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }
}
