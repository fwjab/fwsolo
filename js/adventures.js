(() => {
  const dateKey = () => new Date().toISOString().slice(0, 10);
  const roll = chance => Math.random() < chance;
  const pick = values => values[Math.floor(Math.random() * values.length)];
  const shadowRequirements = { "Iron Knight": 15, "Shadow Wolf": 25, "Shadow Mage": 40, "Shadow Dragon": 100 };
  const rarityTable = ["Common", "Common", "Rare", "Rare", "Epic", "Legendary", "Mythic"];

  function adventureFor(player) {
    const profile = getProfile(player);
    if (!profile.adventure || typeof profile.adventure !== "object") {
      profile.adventure = {
        dailyFortune: null, randomEvent: null, emergency: null, eliteBoss: null,
        loot: [], boxes: [], potions: { recovery: 0, doubleXp: 0, doubleXpArmed: false }, shadowFragments: {},
        contracts: { pushups: 0, totalPushups: 0 }, mastery: { pushups: 0 },
        constellations: [], awakenings: [], hidden: { earlyBird: 0, perfectDays: 0 },
        comboDays: 0, comboDate: "", headquarters: 0, loginDate: ""
      };
    }
    const defaults = { dailyFortune: null, randomEvent: null, emergency: null, eliteBoss: null, loot: [], boxes: [], potions: { recovery: 0, doubleXp: 0, doubleXpArmed: false }, shadowFragments: {}, contracts: { pushups: 0, totalPushups: 0 }, mastery: { pushups: 0 }, constellations: [], awakenings: [], hidden: { earlyBird: 0, perfectDays: 0 }, comboDays: 0, comboDate: "", headquarters: 0, loginDate: "" };
    Object.keys(defaults).forEach(key => { if (profile.adventure[key] === undefined) profile.adventure[key] = defaults[key]; });
    Object.keys(defaults.potions).forEach(key => { if (profile.adventure.potions[key] === undefined) profile.adventure.potions[key] = defaults.potions[key]; });
    return profile.adventure;
  }

  function addLoot(player, name, rarity) {
    const adventure = adventureFor(player);
    adventure.loot.unshift({ name, rarity, date: dateKey() });
    adventure.loot = adventure.loot.slice(0, 24);
  }

  function grantFragments(player, amount = 1) {
    const adventure = adventureFor(player);
    const shadowName = pick(Object.keys(shadowRequirements));
    adventure.shadowFragments[shadowName] = (adventure.shadowFragments[shadowName] || 0) + amount;
    const required = shadowRequirements[shadowName];
    const profile = getProfile(player);
    if (adventure.shadowFragments[shadowName] >= required && !profile.shadows.includes(shadowName)) {
      profile.shadows.push(shadowName);
      profile.equippedShadow = shadowName;
      window.HunterWorkout?.showToast("ARISE", `${shadowName} has joined your Shadow Army.`);
    }
  }

  function unlockMilestones(player) {
    const profile = getProfile(player);
    const adventure = adventureFor(player);
    const unlock = (id, condition, label) => {
      if (condition && !adventure.constellations.includes(id)) {
        adventure.constellations.push(id);
        window.HunterWorkout?.showToast("Constellation Awakened", label);
      }
    };
    unlock("iron-body", profile.completedQuests >= 25, "Iron Body: +5% bonus XP from system rewards.");
    unlock("night-hunter", profile.completedQuests >= 75, "Night Hunter: night missions grant double gold.");
    if (player.level >= 10 && !adventure.awakenings.includes("Iron Resolve")) adventure.awakenings.push("Iron Resolve");
    if (player.level >= 20 && !adventure.awakenings.includes("Monarch's Will")) adventure.awakenings.push("Monarch's Will");
    adventure.headquarters = profile.completedQuests >= 200 ? 5 : profile.completedQuests >= 120 ? 4 : profile.completedQuests >= 75 ? 3 : profile.completedQuests >= 25 ? 2 : 1;
  }

  function onQuest(player, quest) {
    const adventure = adventureFor(player);
    const profile = getProfile(player);
    const now = new Date();
    const hour = now.getHours();
    const questText = quest.title || "";
    const isPushupQuest = /push-?ups?/i.test(questText);
    const numbers = [...questText.matchAll(/\b(\d+)\b/g)].map(match => Number(match[1]));
    const pushups = isPushupQuest ? (numbers.length >= 2 && /sets?/i.test(questText) ? numbers[0] * numbers[1] : numbers[0] || 0) : 0;

    adventure.mastery.pushups += isPushupQuest ? 1 : 0;
    adventure.contracts.pushups += pushups;
    adventure.contracts.totalPushups += pushups;
    if (hour < 7) adventure.hidden.earlyBird += 1;
    if (player.streak >= 7) adventure.hidden.perfectDays = player.streak;
    if (adventure.hidden.earlyBird >= 10 && !profile.titles.includes("The Persistent")) profile.titles.push("The Persistent");
    if (player.streak >= 7 && !profile.titles.includes("Unbroken")) profile.titles.push("Unbroken");

    const previousDate = adventure.comboDate;
    adventure.comboDate = dateKey();
    adventure.comboDays = previousDate === adventure.comboDate ? Math.max(adventure.comboDays, player.streak || 1) : Math.max(1, player.streak || 1);
    const comboBonus = Math.min(0.3, adventure.comboDays * 0.03);
    if (comboBonus) giveXP(player, Math.round(quest.xp * comboBonus), `Combo Chain Day ${adventure.comboDays}`);
    if (hour < 7) giveXP(player, quest.xp, "Dawn Mission bonus");
    if (hour >= 21) giveGold(player, 35, "Night Hunt bonus");
    if (profile.adventure.dailyFortune?.type === "xp") giveXP(player, Math.round(quest.xp * 0.15), "Daily Fortune");
    if (profile.adventure.dailyFortune?.type === "gold") giveGold(player, 20, "Daily Fortune");
    if (isPushupQuest) {
      const masteryLevel = Math.floor(adventure.mastery.pushups / 5) + 1;
      giveXP(player, Math.min(100, masteryLevel * 10), `Push-Up Mastery Level ${masteryLevel}`);
    }
    if (adventure.potions.doubleXpArmed) {
      giveXP(player, quest.xp, "Double XP Potion");
      adventure.potions.doubleXpArmed = false;
    }

    if (roll(0.48)) addLoot(player, pick(["Energy Crystal", "Mana Shard", "Beast Core"]), pick(["Common", "Rare", "Epic"]));
    if (roll(0.25)) grantFragments(player, 1);
    if (roll(0.14)) adventure.boxes.push(pick(rarityTable));
    if (roll(0.12) && !adventure.emergency) adventure.emergency = { objective: "20 Burpees", xp: 1200, gold: 500, rare: true };
    if (profile.completedQuests >= 100 && adventure.contracts.pushups >= 250 && !profile.themes.includes("Golden King")) profile.themes.push("Golden King");
    unlockMilestones(player);
    if (roll(0.28)) window.HunterWorkout?.showToast("SYSTEM", pick(["The System is observing your growth.", "Your physical abilities have increased.", "Your body has adapted to today's training.", "Potential detected.", "Hunter status improving."]));
  }

  function login(player) {
    const adventure = adventureFor(player);
    if (adventure.loginDate === dateKey()) return false;
    adventure.loginDate = dateKey();
    adventure.dailyFortune = pick([{ type: "xp", text: "Potential detected. Today's quest XP is increased." }, { type: "gold", text: "A hunter's luck rises. Gold rewards are increased." }, { type: "none", text: "The System is observing your growth." }]);
    adventure.randomEvent = roll(0.18) ? pick([{ type: "goblin", text: "Treasure Goblin found", gold: 350 }, { type: "merchant", text: "Wandering merchant appeared", gold: 150 }]) : null;
    return true;
  }

  function claimEmergency(player) {
    const adventure = adventureFor(player);
    if (!adventure.emergency) return false;
    giveRewards(player, { xp: adventure.emergency.xp, gold: adventure.emergency.gold, reason: "Emergency Quest" });
    if (adventure.emergency.rare) addLoot(player, "Emergency Reward Cache", "Rare");
    adventure.emergency = null;
    return true;
  }

  function openBox(player) {
    const adventure = adventureFor(player);
    const rarity = adventure.boxes.shift();
    if (!rarity) return false;
    const multiplier = { Common: 1, Rare: 2, Epic: 4, Legendary: 8, Mythic: 15 }[rarity];
    giveRewards(player, { gold: 120 * multiplier, xp: 90 * multiplier, reason: `${rarity} Mystery Box` });
    if (rarity !== "Common") grantFragments(player, multiplier);
    if (rarity === "Rare" || rarity === "Epic") adventure.potions.doubleXp += 1;
    if (rarity === "Legendary" || rarity === "Mythic") adventure.potions.recovery += 1;
    if (rarity === "Legendary" || rarity === "Mythic") addLoot(player, "Monarch Relic", rarity);
    if (rarity === "Legendary" && !getProfile(player).themes.includes("Red Monarch")) getProfile(player).themes.push("Red Monarch");
    if (rarity === "Mythic" && !getProfile(player).themes.includes("Golden King")) getProfile(player).themes.push("Golden King");
    return rarity;
  }

  function summonEliteBoss(player) {
    const adventure = adventureFor(player);
    if (player.level < 10 || adventure.eliteBoss) return false;
    adventure.eliteBoss = { name: "A-Rank Iron Colossus", objective: "200 Squats · 100 Push-ups · 3 Minute Plank", xp: 2500, gold: 1250 };
    return true;
  }

  function claimEliteBoss(player) {
    const adventure = adventureFor(player);
    if (!adventure.eliteBoss) return false;
    giveRewards(player, { xp: adventure.eliteBoss.xp, gold: adventure.eliteBoss.gold, statPoints: 5, reason: adventure.eliteBoss.name });
    addLoot(player, "Elite Boss Core", "Epic");
    adventure.eliteBoss = null;
    return true;
  }

  function claimRandomEvent(player) {
    const adventure = adventureFor(player);
    if (!adventure.randomEvent) return false;
    giveGold(player, adventure.randomEvent.gold, adventure.randomEvent.text);
    adventure.randomEvent = null;
    return true;
  }

  function playLottery(player) {
    const profile = getProfile(player);
    if (profile.gold < 750) return false;
    profile.gold -= 750;
    const rarity = pick(rarityTable);
    adventureFor(player).boxes.push(rarity);
    return rarity;
  }

  function usePotion(player, potionName) {
    const potions = adventureFor(player).potions;
    if (!potions[potionName]) return false;
    potions[potionName] -= 1;
    if (potionName === "doubleXp") potions.doubleXpArmed = true;
    if (potionName === "recovery") getProfile(player).adventure.streakShielded = true;
    return true;
  }

  window.HunterProgression.adventureFor = adventureFor;
  window.HunterProgression.login = login;
  window.HunterProgression.actions = { claimEmergency, openBox, summonEliteBoss, claimEliteBoss, claimRandomEvent, playLottery, usePotion };
  const priorQuestHandler = window.HunterProgression.onQuestCompleted;
  window.HunterProgression.onQuestCompleted = (player, quest) => { priorQuestHandler?.(player, quest); onQuest(player, quest); };
})();
