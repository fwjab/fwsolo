const shadows = [
  { name: "Iron Knight", cost: 7000 },
  { name: "Shadow Wolf", cost: 10000 },
  { name: "Shadow Mage", cost: 15000 },
  { name: "Shadow Dragon", cost: 50000 }
];

function summonShadow(player, shadowName) {
  const shadow = shadows.find(item => item.name === shadowName);
  const profile = getProfile(player);
  if (!shadow || profile.shadows.includes(shadow.name) || profile.gold < shadow.cost) return false;
  profile.gold -= shadow.cost;
  profile.shadows.push(shadow.name);
  profile.equippedShadow = shadow.name;
  return true;
}

function equipShadow(player, shadowName) {
  if (!getProfile(player).shadows.includes(shadowName)) return false;
  getProfile(player).equippedShadow = shadowName;
  return true;
}
