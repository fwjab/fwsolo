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

function backfillLegacyProgression(player, profile) {
  if (profile.migrationVersion >= 1) return;

  const totalXp = Math.max(0, Math.round(Number(player.totalXp) || 0));
  const level = Math.max(1, Math.round(Number(player.level) || 1));
  const loggedQuestClears = Array.isArray(player.log)
    ? player.log.filter(entry => /^\+\d+ XP:/.test(entry.text || "") && !/Daily quest bonus|Achievement:|Admin adjustment/.test(entry.text || "")).length
    : 0;
  const estimatedQuestClears = Math.max(loggedQuestClears, Math.floor(totalXp / 40));
  const earnedGold = estimatedQuestClears * 35 + (level - 1) * 100;

  profile.completedQuests = Math.max(Number(profile.completedQuests) || 0, estimatedQuestClears);
  profile.gold = Math.max(Number(profile.gold) || 0, earnedGold);
  profile.statPoints = Math.max(Number(profile.statPoints) || 0, (level - 1) * 3);

  if (profile.completedQuests >= 10 && !profile.achievements.includes("quest10")) profile.achievements.push("quest10");
  if (profile.completedQuests >= 100 && !profile.achievements.includes("quest100")) {
    profile.achievements.push("quest100");
    if (!profile.titles.includes("Dungeon Explorer")) profile.titles.push("Dungeon Explorer");
  }
  if (level >= 15 && !profile.titles.includes("Elite Hunter")) profile.titles.push("Elite Hunter");
  if (level >= 25 && !profile.titles.includes("Shadow Monarch")) profile.titles.push("Shadow Monarch");

  profile.migrationVersion = 1;
  window.HunterProgression.migrationOccurred = true;
}

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
  backfillLegacyProgression(player, player.progression);
  return player.progression;
}

window.HunterProgression.getProfile = getProfile;
window.HunterProgression.rankOrder = ["E", "D", "C", "B", "A", "S", "National", "Monarch"];
