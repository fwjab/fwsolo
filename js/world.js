(() => {
  const dayKey = () => new Date().toISOString().slice(0, 10);
  const roll = chance => Math.random() < chance;
  const pick = values => values[Math.floor(Math.random() * values.length)];
  const reputationFor = quests => quests >= 500 ? "World-Class Hunter" : quests >= 300 ? "Monarch Candidate" : quests >= 180 ? "Legend" : quests >= 100 ? "Elite Hunter" : quests >= 40 ? "Recognized Hunter" : "Unknown Hunter";
  const guildFor = rank => ({ E: "Small Guild Room", D: "Small Guild Room", C: "Training Hall", B: "Training Hall", A: "Elite Guild", S: "Grand Guild", National: "Grand Guild", Monarch: "Shadow Palace" }[rank] || "Small Guild Room");

  function worldFor(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    if (!profile.world || typeof profile.world !== "object") profile.world = {};
    const world = profile.world;
    const defaults = { migrationVersion: 0, firstLogin: "", lastLogin: "", systemScan: "", reputation: "Unknown Hunter", legacy: [], dimensionGate: null, eclipse: null, welcomePackage: null, memoryCrystals: 0, bossesCleared: 0, criticals: 0, rankAtLastCheck: "E", settings: { voice: false } };
    Object.keys(defaults).forEach(key => { if (world[key] === undefined) world[key] = defaults[key]; });
    if (!world.settings || typeof world.settings !== "object") world.settings = { voice: false };
    if (world.settings.voice === undefined) world.settings.voice = false;
    if (world.migrationVersion !== 1) {
      const rank = window.HunterWorkout.rankFor(player.level);
      const quests = profile.completedQuests || 0;
      world.firstLogin = world.firstLogin || dayKey();
      world.reputation = reputationFor(quests);
      world.rankAtLastCheck = rank;
      world.bossesCleared = Math.max(world.bossesCleared || 0, Math.floor(quests / 30));
      world.memoryCrystals = Math.max(world.memoryCrystals || 0, Math.floor(quests / 50));
      world.legacy = [{ title: "First Workout", detail: "Legacy hunter record imported.", unlocked: true }, { title: `Reached ${rank} Rank`, detail: `Level ${player.level} · ${quests} missions completed.`, unlocked: true }];
      if (quests >= 100) world.legacy.push({ title: "100 Missions", detail: "Dungeon Veteran milestone recorded.", unlocked: true });
      if (profile.shadows.length) world.legacy.push({ title: "Shadow Army Formed", detail: `${profile.shadows.length} shadows are bound.`, unlocked: true });
      if (adventure.headquarters >= 3) world.legacy.push({ title: "Headquarters Expanded", detail: "Your consistent training built a lasting base.", unlocked: true });
      world.migrationVersion = 1;
      window.HunterProgression.worldMigrationOccurred = true;
    }
    return world;
  }

  function speak(player, text) {
    const world = worldFor(player);
    if (world.settings.voice && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function addLegacy(player, title, detail) {
    const world = worldFor(player);
    if (!world.legacy.some(item => item.title === title)) world.legacy.unshift({ title, detail, unlocked: true });
    world.legacy = world.legacy.slice(0, 40);
  }

  function runLogin(player) {
    const world = worldFor(player);
    const today = dayKey();
    if (world.lastLogin === today) return false;
    const priorLogin = world.lastLogin;
    world.lastLogin = today;
    world.systemScan = pick(["Strength increased. Recovery optimal. Mission availability: HIGH.", "The System is observing your growth. Potential remains stable.", "Hunter status evaluated. Shadow resonance detected.", "Daily scan complete. The body has adapted to training."]);
    if (priorLogin) {
      const daysAway = Math.floor((new Date(`${today}T00:00:00`) - new Date(`${priorLogin}T00:00:00`)) / 86400000);
      if (daysAway >= 3) world.welcomePackage = { xp: 250 + daysAway * 25, gold: 150 + daysAway * 15 };
    }
    if (!world.eclipse && roll(0.008)) world.eclipse = { date: today, title: "Eclipse Event", active: true };
    if (!world.dimensionGate && roll(0.08)) world.dimensionGate = { title: "A-Rank Dimension Gate", objective: "100 Push-ups · 100 Squats · 5 Minute Walk", xp: 3500, gold: 1800 };
    return true;
  }

  function onQuest(player, quest) {
    const profile = getProfile(player);
    const world = worldFor(player);
    const rank = window.HunterWorkout.rankFor(player.level);
    world.reputation = reputationFor(profile.completedQuests || 0);
    if (world.eclipse?.active && world.eclipse.date === dayKey()) {
      giveRewards(player, { xp: quest.xp, gold: 35, reason: "Eclipse Event" });
    }
    if (roll(0.06)) {
      world.criticals += 1;
      giveXP(player, quest.xp, "Critical Success");
      window.HunterWorkout.showToast("CRITICAL SUCCESS", "Workout efficiency exceeded expectations. XP doubled.");
      speak(player, "Critical success.");
    }
    if (roll(0.04)) world.memoryCrystals += 1;
    if (world.memoryCrystals >= 5 && !profile.themes.includes("Purple Hunter")) profile.themes.push("Purple Hunter");
    if (world.rankAtLastCheck !== rank) {
      addLegacy(player, `Reached ${rank} Rank`, `Rank evaluation complete at Level ${player.level}.`);
      world.rankAtLastCheck = rank;
      window.HunterProgression.showCinematic?.(rank);
      speak(player, `Hunter rank increased. ${rank} rank.`);
    }
    if (profile.completedQuests >= 100) addLegacy(player, "100 Missions", "Dungeon Veteran milestone recorded.");
  }

  function claimGate(player) {
    const gate = worldFor(player).dimensionGate;
    if (!gate) return false;
    giveRewards(player, { xp: gate.xp, gold: gate.gold, statPoints: 4, reason: gate.title });
    worldFor(player).bossesCleared += 1;
    addLegacy(player, "Dimension Gate Cleared", gate.title);
    worldFor(player).dimensionGate = null;
    return true;
  }

  function claimWelcome(player) {
    const world = worldFor(player);
    if (!world.welcomePackage) return false;
    giveRewards(player, { ...world.welcomePackage, reason: "Welcome Back Package" });
    window.HunterProgression.adventureFor(player).potions.recovery += 1;
    world.welcomePackage = null;
    return true;
  }

  function toggleVoice(player) {
    const world = worldFor(player);
    world.settings.voice = !world.settings.voice;
    return world.settings.voice;
  }

  window.HunterProgression.worldFor = worldFor;
  window.HunterProgression.worldLogin = runLogin;
  window.HunterProgression.worldActions = { claimGate, claimWelcome, toggleVoice };
  const existingQuestHandler = window.HunterProgression.onQuestCompleted;
  window.HunterProgression.onQuestCompleted = (player, quest) => { existingQuestHandler?.(player, quest); onQuest(player, quest); };
})();
