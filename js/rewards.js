function giveGold(player, amount, reason = "System reward") {
  const profile = getProfile(player);
  const scaledAmount = Math.round((Number(amount) || 0) * (1 + Math.max(0, profile.stats.agi - 10) * 0.005));
  profile.gold = Math.max(0, profile.gold + scaledAmount);
  window.HunterWorkout?.pushFeed(`${player.name} received ${scaledAmount} gold: ${reason}.`);
}

function giveXP(player, amount, reason = "System reward") {
  const profile = getProfile(player);
  const boostedAmount = Math.round((Number(amount) || 0) * (1 + profile.upgrades.xpBoost * 0.05 + Math.max(0, profile.stats.str - 10) * 0.01));
  window.HunterWorkout?.addXp(player, boostedAmount, reason);
}

function giveStatPoint(player, amount = 1) {
  getProfile(player).statPoints += Math.max(0, Math.round(Number(amount) || 0));
}

function giveRewards(player, { gold = 0, xp = 0, statPoints = 0, reason = "System reward" } = {}) {
  if (gold) giveGold(player, gold, reason);
  if (xp) giveXP(player, xp, reason);
  if (statPoints) giveStatPoint(player, statPoints);
}
