const shopItems = [
  { id: "Purple Hunter", name: "Purple Hunter Theme", price: 6000, type: "theme" },
  { id: "Shadow Wolf", name: "Shadow Wolf", price: 10000, type: "shadow" },
  { id: "Quest Refresh", name: "Quest Refresh", price: 500, type: "item" },
  { id: "xpBoost", name: "XP Boost", price: 2500, type: "upgrade" }
];

function buyItem(player, itemId) {
  const item = shopItems.find(entry => entry.id === itemId);
  const profile = getProfile(player);
  if (!item) return false;
  if (item.type === "theme") {
    if (profile.gold < item.price || profile.themes.includes(item.id)) return false;
    profile.gold -= item.price;
    profile.themes.push(item.id);
    return equipTheme(player, item.id);
  }
  if (item.type === "shadow") {
    if (profile.gold < item.price || profile.shadows.includes(item.id)) return false;
    profile.gold -= item.price;
    profile.shadows.push(item.id);
    activateShadow(player, item.id);
    return true;
  }
  if (item.type === "upgrade") {
    if (profile.gold < item.price || profile.upgrades.xpBoost >= 5) return false;
    profile.gold -= item.price;
    profile.upgrades.xpBoost += 1;
    return true;
  }
  if (profile.gold < item.price || !addItem(player, { name: item.name, type: "consumable" })) return false;
  profile.gold -= item.price;
  return true;
}

function renderShop() {
  window.HunterProgression.renderConsole?.("shop");
}
