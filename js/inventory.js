function addItem(player, item) {
  const profile = getProfile(player);
  if (profile.inventory.length >= profile.upgrades.inventorySlots) return false;
  profile.inventory.push(item);
  return true;
}

function removeItem(player, itemName) {
  const inventoryIndex = getProfile(player).inventory.findIndex(item => item.name === itemName || item === itemName);
  if (inventoryIndex < 0) return false;
  getProfile(player).inventory.splice(inventoryIndex, 1);
  return true;
}
