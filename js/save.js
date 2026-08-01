function saveGame() {
  window.HunterWorkout?.save();
}

function loadGame() {
  if (!window.HunterWorkout) return;
  window.HunterProgression.migrationOccurred = false;
  window.HunterWorkout.players().forEach(getProfile);
  if (window.HunterProgression.migrationOccurred) saveGame();
}
