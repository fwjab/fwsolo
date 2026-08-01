const titles = [
  { name: "Rookie Hunter", unlock: "Default", available: () => true },
  { name: "Dungeon Explorer", unlock: "Complete 100 Quests", available: player => getProfile(player).completedQuests >= 100 },
  { name: "Elite Hunter", unlock: "Reach Rank B", available: player => window.HunterProgression.rankOrder.indexOf(window.HunterWorkout.rankFor(player.level)) >= 3 },
  { name: "Shadow Monarch", unlock: "Reach Rank S", available: player => window.HunterProgression.rankOrder.indexOf(window.HunterWorkout.rankFor(player.level)) >= 5 }
];

function equipTitle(player, titleName) {
  const title = titles.find(item => item.name === titleName);
  if (!title || !title.available(player)) return false;
  const profile = getProfile(player);
  if (!profile.titles.includes(titleName)) profile.titles.push(titleName);
  profile.title = titleName;
  return true;
}
