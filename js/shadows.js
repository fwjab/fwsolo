const shadows = [
  { name: "Iron Knight", cost: 7000, fragments: 15, className: "iron", crest: "⚔", description: "A silent armored guardian forged from the battlefield." },
  { name: "Shadow Wolf", cost: 10000, fragments: 25, className: "wolf", crest: "◈", description: "A swift dusk predator that hunts beside its monarch." },
  { name: "Shadow Mage", cost: 15000, fragments: 40, className: "mage", crest: "✦", description: "An arcane sentinel wrapped in violet mana." },
  { name: "Shadow Dragon", cost: 50000, fragments: 100, className: "dragon", crest: "♜", description: "An ancient winged sovereign of the deepest shadows." }
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
