const titles = [
  { name: "Rookie Hunter", unlock: "Default", available: () => true },
  { name: "Dungeon Explorer", unlock: "Complete 100 Quests", available: player => getProfile(player).completedQuests >= 100 },
  { name: "Elite Hunter", unlock: "Reach Rank B", available: player => window.HunterProgression.rankOrder.indexOf(window.HunterWorkout.rankFor(player.level)) >= 3 },
  { name: "Shadow Monarch", unlock: "Reach Rank S", available: player => window.HunterProgression.rankOrder.indexOf(window.HunterWorkout.rankFor(player.level)) >= 5 },
  { name: "The Persistent", unlock: "Complete 10 dawn missions", available: player => window.HunterProgression.adventureFor(player).hidden.earlyBird >= 10 },
  { name: "Unbroken", unlock: "Reach a 7-day combo", available: player => player.streak >= 7 }
];

function equipTitle(player, titleName) {
  const title = titles.find(item => item.name === titleName);
  if (!title || !title.available(player)) return false;
  const profile = getProfile(player);
  if (!profile.titles.includes(titleName)) profile.titles.push(titleName);
  profile.title = titleName;
  return true;
}
