function saveGame() {
  window.HunterWorkout?.save();
}

function loadGame() {
  window.HunterWorkout?.players().forEach(getProfile);
}
