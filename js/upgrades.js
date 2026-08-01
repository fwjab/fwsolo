const upgrades = [
  { id: "xpBoost", name: "XP Gain +5%", cost: 10000, max: 5 },
  { id: "extraDailyQuest", name: "Second Daily Quest", cost: 20000, max: 1 },
  { id: "bossChance", name: "Boss Spawn +10%", cost: 25000, max: 3 },
  { id: "inventorySlots", name: "Inventory +10", cost: 5000, max: 4 }
];

function buyUpgrade(player, upgradeId) {
  const upgrade = upgrades.find(item => item.id === upgradeId);
  const profile = getProfile(player);
  if (!upgrade || profile.gold < upgrade.cost) return false;
  const current = upgrade.id === "inventorySlots" ? (profile.upgrades.inventorySlots - 20) / 10 : Number(profile.upgrades[upgrade.id]);
  if (current >= upgrade.max) return false;
  profile.gold -= upgrade.cost;
  if (upgrade.id === "inventorySlots") profile.upgrades.inventorySlots += 10;
  else if (upgrade.id === "extraDailyQuest") profile.upgrades.extraDailyQuest = true;
  else profile.upgrades[upgrade.id] += 1;
  return true;
}
