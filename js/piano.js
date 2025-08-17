"use strict";

// Piano key visual feedback for note presses
const keys = document.querySelectorAll(".key");
keys.forEach((key) => key.addEventListener("transitionend", removeStyle));

function removeStyle() {
  this.classList.remove("playing");
}

// Add visual feedback when keys are pressed
function addKeyPress(midiNote) {
  const key = document.querySelector(`.key[data-note="${midiNote}"]`);
  if (key) {
    key.classList.add("playing");
  }
}

// Export for use by main application
window.addKeyPress = addKeyPress;
