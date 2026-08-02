const shadows = [
  { name: "Iron Knight", cost: 7000, fragments: 15, className: "iron", crest: "⚔", description: "A silent armored guardian forged from the battlefield." },
  { name: "Shadow Wolf", cost: 10000, fragments: 25, className: "wolf", crest: "◈", description: "A swift dusk predator that hunts beside its monarch." },
  { name: "Shadow Mage", cost: 15000, fragments: 40, className: "mage", crest: "✦", description: "An arcane sentinel wrapped in violet mana." },
  { name: "Shadow Dragon", cost: 50000, fragments: 100, className: "dragon", crest: "♜", description: "An ancient winged sovereign of the deepest shadows." }
];

function shadowSlotsFor(player) {
  const level = Math.max(1, Number(player?.level) || 1);
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

function activeShadowsFor(player) {
  const profile = getProfile(player);
  profile.activeShadows = [...new Set((profile.activeShadows || []).filter(shadowName => profile.shadows.includes(shadowName)))];
  return profile.activeShadows;
}

function activateShadow(player, shadowName) {
  const profile = getProfile(player);
  if (!profile.shadows.includes(shadowName)) return false;
  const activeShadows = activeShadowsFor(player);
  if (activeShadows.includes(shadowName)) return true;
  if (activeShadows.length >= shadowSlotsFor(player)) return false;
  activeShadows.push(shadowName);
  profile.equippedShadow = activeShadows[0] || null;
  return true;
}

function summonShadow(player, shadowName) {
  const shadow = shadows.find(item => item.name === shadowName);
  const profile = getProfile(player);
  if (!shadow || profile.shadows.includes(shadow.name) || profile.gold < shadow.cost) return false;
  profile.gold -= shadow.cost;
  profile.shadows.push(shadow.name);
  activateShadow(player, shadow.name);
  return true;
}

function equipShadow(player, shadowName) {
  const profile = getProfile(player);
  if (!profile.shadows.includes(shadowName)) return false;
  const activeShadows = activeShadowsFor(player);
  if (activeShadows.includes(shadowName)) {
    profile.activeShadows = activeShadows.filter(item => item !== shadowName);
    profile.equippedShadow = profile.activeShadows[0] || null;
    return true;
  }
  if (!activateShadow(player, shadowName)) return false;
  return true;
}
