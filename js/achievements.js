const achievements = [
  { id: "quest10", name: "First Steps", description: "Clear 10 workout quests.", goal: 10, rewardGold: 500, rewardXP: 500 },
  { id: "quest100", name: "Dungeon Veteran", description: "Clear 100 workout quests.", goal: 100, rewardGold: 5000, rewardXP: 3000 }
];

function unlockAchievement(player, achievement) {
  const profile = getProfile(player);
  if (profile.achievements.includes(achievement.id)) return false;
  profile.achievements.push(achievement.id);
  giveRewards(player, { gold: achievement.rewardGold, xp: achievement.rewardXP, reason: `Achievement: ${achievement.name}` });
  window.HunterWorkout?.showToast("Achievement Unlocked", `${player.name}: ${achievement.name}`);
  return true;
}

function checkAchievements(player) {
  const profile = getProfile(player);
  achievements.filter(item => profile.completedQuests >= item.goal).forEach(item => unlockAchievement(player, item));
}

window.HunterProgression.onQuestCompleted = (player, quest) => {
  if (quest.boss) return;
  getProfile(player).completedQuests += 1;
  giveGold(player, 35, "Quest clear");
  checkAchievements(player);
};
