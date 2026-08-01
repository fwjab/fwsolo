window.HunterProgression = window.HunterProgression || {};

const defaultProgression = () => ({
  gold: 0,
  statPoints: 0,
  title: "Rookie Hunter",
  equippedShadow: null,
  equippedTheme: "Blue Hunter",
  inventory: [],
  titles: ["Rookie Hunter"],
  shadows: [],
  themes: ["Blue Hunter"],
  achievements: [],
  completedQuests: 0,
  upgrades: { xpBoost: 0, extraDailyQuest: false, bossChance: 0, inventorySlots: 20 },
  stats: { str: 10, agi: 10, end: 10, vit: 10 }
});

function getProfile(player) {
  if (!player.progression || typeof player.progression !== "object") {
    player.progression = defaultProgression();
  }
  const defaults = defaultProgression();
  Object.keys(defaults).forEach(key => {
    if (player.progression[key] === undefined) player.progression[key] = defaults[key];
  });
  Object.keys(defaults.upgrades).forEach(key => {
    if (player.progression.upgrades[key] === undefined) player.progression.upgrades[key] = defaults.upgrades[key];
  });
  Object.keys(defaults.stats).forEach(key => {
    if (player.progression.stats[key] === undefined) player.progression.stats[key] = defaults.stats[key];
  });
  return player.progression;
}

window.HunterProgression.getProfile = getProfile;
window.HunterProgression.rankOrder = ["E", "D", "C", "B", "A", "S", "National", "Monarch"];
