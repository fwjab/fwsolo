const cosmetics = [
  { name: "Blue Hunter", price: 0, accent: "blue" },
  { name: "Purple Hunter", price: 6000, accent: "purple" },
  { name: "Red Monarch", price: 25000, accent: "red" },
  { name: "Golden King", price: 50000, accent: "gold" }
];

function equipTheme(player, themeName) {
  const theme = cosmetics.find(item => item.name === themeName);
  const profile = getProfile(player);
  if (!theme || !profile.themes.includes(themeName)) return false;
  profile.equippedTheme = themeName;
  document.documentElement.dataset.hunterTheme = theme.accent;
  return true;
}
