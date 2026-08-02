(() => {
  const tabs = ["profile", "missions", "shadows", "guild", "headquarters", "archive", "codex", "stats", "shop", "titles", "cosmetics", "upgrades", "inventory", "settings"];
  let activeTab = "profile";
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  const currentPlayer = () => {
    const players = window.HunterWorkout?.players() || [];
    return players.find(item => item.id === localStorage.getItem("nightforgePlayerSession")) || players[0];
  };
  const stat = (label, value) => `<span><b>${value}</b>${label}</span>`;
  const cards = (items, render) => `<div class="sw-system-list">${items.map(render).join("")}</div>`;
  const card = (title, body, action = "") => `<article><div><h3>${title}</h3>${body ? `<small>${body}</small>` : ""}</div>${action}</article>`;

  function renderDailyLogin(players) {
    const today = window.HunterProgression.actions.easternDayKey();
    const dismissedKey = `nightforgeDailyLoginDismissed:${today}`;
    let popup = document.getElementById("sw-daily-login");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "sw-daily-login";
      popup.className = "sw-daily-login";
      document.body.append(popup);
    }
    const claimable = players.some(player => window.HunterProgression.adventureFor(player).dailyLoginDate !== today);
    popup.innerHTML = `<div class="sw-daily-login-card"><p class="sw-kicker">SYSTEM · DAILY PRESENCE</p><h2>Daily Login Available</h2><p>Select your hunter to claim today's reward. Resets at midnight Eastern Time.</p><p class="sw-muted">Reward: +120 XP · +75 Gold${players.some(player => player.streak >= 7) ? " · Streak hunters also receive a Recovery Potion" : ""}</p><div class="sw-daily-login-players">${players.map(player => { const claimed = window.HunterProgression.adventureFor(player).dailyLoginDate === today; return `<button data-action="daily-login" data-id="${player.id}" ${claimed ? "disabled" : ""}><b>${escapeHtml(player.name)}</b><span>${claimed ? "Claimed today" : "Claim reward"}</span></button>`; }).join("")}</div>${claimable ? "" : "<p class=\"sw-muted\">Every hunter has claimed today’s reward. Return after midnight EST.</p>"}<button class="sw-daily-login-exit" data-action="daily-close">Exit for now</button></div>`;
    popup.style.display = claimable && localStorage.getItem(dismissedKey) !== "true" ? "grid" : "none";
  }

  function openPlayerSession(players) {
    let popup = document.getElementById("sw-player-session");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "sw-player-session";
      popup.className = "sw-daily-login sw-player-session";
      document.body.append(popup);
    }
    popup.innerHTML = `<div class="sw-daily-login-card"><p class="sw-kicker">SYSTEM · HUNTER SESSION</p><h2>Enter Hunter Console</h2><p>Choose your hunter. You can update only your own quests, progression, and achievements. Other hunters remain visible as read-only records.</p><div class="sw-daily-login-players">${players.map(player => `<button data-action="player-session" data-id="${player.id}"><b>${escapeHtml(player.name)}</b><span>Enter console</span></button>`).join("")}</div></div>`;
    popup.style.display = "grid";
  }

  function renderShadows(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const activeShadows = activeShadowsFor(player);
    const slots = shadowSlotsFor(player);
    return `<div class="sw-hunter-card"><p class="sw-kicker">Active Shadow Army</p><h3>${activeShadows.length}/${slots} shadows deployed</h3><p class="sw-muted">${activeShadows.length ? activeShadows.join(" · ") : "No shadows are currently deployed."}</p></div><div class="sw-shadow-grid">${shadows.map(shadow => {
      const owned = profile.shadows.includes(shadow.name);
      const active = activeShadows.includes(shadow.name);
      const fragments = adventure.shadowFragments[shadow.name] || 0;
      return `<article class="sw-shadow-card sw-shadow-${shadow.className} ${owned ? "is-owned" : ""}"><div class="sw-shadow-crest">${shadow.crest}</div><div><p class="sw-kicker">${owned ? (active ? "Shadow Deployed" : "Shadow Bound") : `${fragments}/${shadow.fragments} fragments`}</p><h3>${shadow.name}</h3><p>${shadow.description}</p></div><button data-action="${owned ? "shadow" : "summon"}" data-id="${shadow.name}" ${owned && !active && activeShadows.length >= slots ? "disabled" : ""}>${owned ? (active ? "Dismiss" : "Deploy") : `Summon · ${shadow.cost} G`}</button></article>`;
    }).join("")}</div>`;
  }

  function renderMissions(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const world = window.HunterProgression.worldFor(player);
    const missionCards = [];
    if (world.storyGate) missionCards.push(card("SYSTEM MESSAGE · Unknown Gate", `${world.storyGate.objective} · +${world.storyGate.xp} XP · +${world.storyGate.gold} G`, world.storyGate.entered ? `<button data-action="story-clear">Clear Gate Challenge</button>` : `<button data-action="story-enter">Enter</button><button data-action="story-ignore">Ignore</button>`));
    if (adventure.eliteBoss) {
      const phases = adventure.eliteBoss.phases || ["Finish 30 controlled squats", "Finish 20 push-ups at your pace", "Hold a 60-second plank, split if needed"];
      const phase = Number(adventure.eliteBoss.phase) || 0;
      const hp = Math.max(0, 100 - Math.round((phase / phases.length) * 100));
      missionCards.push(card(`${adventure.eliteBoss.name} · ${hp}% HP`, phase < phases.length ? `Phase ${phase + 1}/${phases.length}: ${phases[phase]}` : "Boss broken. Claim the core below.", phase < phases.length ? `<button data-action="elite-phase">Clear Phase</button>` : ""));
    }
    const shadowMission = adventure.shadowMission;
    const activeShadows = activeShadowsFor(player);
    if (player.level >= 35) missionCards.push(card("Monarch Shadow Mission", shadowMission ? `${shadowMission.shadow} is scouting beyond the gate.` : `Send ${activeShadows[0] || "an active Shadow"} for XP, gold, and Shadow levels.`, shadowMission ? `<button data-action="shadow-claim">Claim when ready</button>` : `<button data-action="shadow-send" ${activeShadows.length ? "" : "disabled"}>Send Shadow</button>`));
    missionCards.push(card("Daily System Scan", world.systemScan || "Scanning Hunter..."));
    if (world.eclipse?.active) missionCards.push(card("Eclipse Event", "24 hours · Double XP · Double Gold · Exclusive missions active."));
    if (world.welcomePackage) missionCards.push(card("Welcome Back, Hunter", `Recovery package: +${world.welcomePackage.xp} XP · +${world.welcomePackage.gold} G · Recovery Potion`, `<button data-action="welcome">Claim Package</button>`));
    if (world.dimensionGate) missionCards.push(card("Dimension Gate Open", `${world.dimensionGate.title} · ${world.dimensionGate.objective} · +${world.dimensionGate.xp} XP · +${world.dimensionGate.gold} G`, `<button data-action="gate">Clear Gate</button>`));
    missionCards.push(card("Hunter Radar", `System scan complete · ${adventure.eliteBoss ? "1 Elite Boss detected" : "Boss activity is low"} · ${adventure.hidden.earlyBird < 10 ? "1 hidden quest nearby" : "Hidden quest trail resolved"}`));
    if (adventure.dailyFortune) missionCards.push(card("Daily Fortune", adventure.dailyFortune.text));
    if (adventure.randomEvent) missionCards.push(card(adventure.randomEvent.text, "A rare login event is available.", `<button data-action="event">Claim · ${adventure.randomEvent.gold} G</button>`));
    if (adventure.emergency) missionCards.push(card("Emergency Quest Detected", `${adventure.emergency.objective} · +${adventure.emergency.xp} XP · +${adventure.emergency.gold} G · Rare reward chance`, `<button data-action="emergency">Clear Emergency</button>`));
    else missionCards.push(card("Emergency Quest Scan", "The System is watching. Emergency quests can appear after any workout."));
    if (adventure.eliteBoss) missionCards.push(card(adventure.eliteBoss.name, `${adventure.eliteBoss.objective} · +${adventure.eliteBoss.xp} XP · +${adventure.eliteBoss.gold} G`, `<button data-action="elite-claim">Defeat Elite Boss</button>`));
    else missionCards.push(card("Elite Boss Terminal", player.level >= 10 ? "Threat Level A. Summon when you are ready." : "Unlocks at Level 10.", `<button data-action="elite-summon" ${player.level < 10 ? "disabled" : ""}>Summon Elite Boss</button>`));
    missionCards.push(card("Hunter Contract", `${adventure.contracts.pushups}/250 push-ups · Reward: Golden King cosmetic`, profile.themes.includes("Golden King") ? "Contract cleared." : "Long-term objective."));
    missionCards.push(card("Combo Chain", `Day ${adventure.comboDays} · ${Math.min(30, adventure.comboDays * 3)}% bonus XP on system rewards.`));
    return cards(missionCards, item => item);
  }

  function renderHeadquarters(player) {
    const adventure = window.HunterProgression.adventureFor(player);
    const rooms = ["Small Room", "Training Hall", "Trophy Wall", "Shadow Barracks", "Vault", "Mission Terminal"];
    return `<div class="sw-hq"><div class="sw-hq-core"><p class="sw-kicker">Hunter Headquarters</p><h3>${rooms[adventure.headquarters - 1]}</h3><p>Your base grows through real training, never purchases.</p></div><div class="sw-room-grid">${rooms.map((room, index) => `<div class="sw-room ${index < adventure.headquarters ? "is-built" : ""}"><b>${index < adventure.headquarters ? "◆" : "◇"}</b><span>${room}</span><small>${index < adventure.headquarters ? "Unlocked" : `${[0, 25, 75, 120, 200, 300][index]} quest clears`}</small></div>`).join("")}</div></div>`;
  }

  function renderGuild(player) {
    const profile = getProfile(player);
    const world = window.HunterProgression.worldFor(player);
    const rank = window.HunterWorkout.rankFor(player.level);
    const guild = rank === "Monarch" ? "Shadow Palace" : rank === "S" || rank === "National" ? "Grand Guild" : rank === "A" ? "Elite Guild" : rank === "C" || rank === "B" ? "Training Hall" : "Small Guild Room";
    const biography = `The hunter began as the weakest. Since then, ${profile.completedQuests} missions have been cleared, ${profile.titles.length} titles have been unlocked, and ${profile.shadows.length} shadows answer the call.`;
    return `<div class="sw-console-grid"><div class="sw-hunter-card sw-guild-card"><p class="sw-kicker">Hunter Guild</p><h3>${guild}</h3><p>${rank} Rank · ${world.reputation}</p><div class="sw-mini-stats">${stat("Lifetime XP", player.totalXp)}${stat("Gold", profile.gold)}${stat("Bosses", world.bossesCleared)}${stat("Crystals", world.memoryCrystals)}</div></div><div class="sw-hunter-card"><p class="sw-kicker">Hunter Biography</p><h3>${player.name}</h3><p>${biography}</p><p class="sw-muted">First record: ${world.firstLogin || "Today"}</p></div></div>`;
  }

  function renderArchive(player) {
    const world = window.HunterProgression.worldFor(player);
    return cards(world.legacy, item => card(item.title, item.detail));
  }

  function renderSettings(player) {
    const world = window.HunterProgression.worldFor(player);
    const styles = [{ id: "narrator", name: "Narrator", detail: "Measured system voice with a dramatic briefing tone." }, { id: "sentinel", name: "Sentinel", detail: "Lower, direct hunter-report delivery." }, { id: "oracle", name: "Oracle", detail: "Calmer, more mysterious system delivery." }];
    const push = window.HunterPush?.status?.() || { state: "checking", detail: "Checking push notification support." };
    const pushButton = push.state === "enabled" ? `<button data-action="push-disable">Disable Push Notifications</button>` : push.state === "blocked" || push.state === "unsupported" || push.state === "unavailable" ? "" : `<button data-action="push-enable">Enable Push Notifications</button>`;
    return `${cards([{ title: "System Voice", detail: world.settings.voice ? "Enabled: quest clears and rank evaluations are announced." : "Disabled: use your device's speech engine for optional announcements.", action: "voice" }, { title: "Push Notifications", detail: push.detail, action: "push" }], item => card(item.title, item.detail, item.action === "voice" ? `<button data-action="voice">${world.settings.voice ? "Disable" : "Enable"}</button>` : pushButton))}<div class="sw-system-list">${styles.map(style => `<article><div><b>${style.name}</b><p>${style.detail}</p></div><button data-action="voice-style" data-id="${style.id}">${world.settings.narration === style.id ? "Selected" : "Use Voice"}</button></article>`).join("")}</div>`;
  }

  function renderCodex(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const mastered = Math.floor(adventure.mastery.pushups / 5) + 1;
    const rank = window.HunterWorkout.rankFor(player.level);
    const license = rank === "E" || rank === "D" ? "Hunter Shop" : rank === "C" || rank === "B" ? "Elite Boss Terminal" : "Shadow Barracks";
    return `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">Hunter Codex</p><h3>Collected Knowledge</h3><div class="sw-mini-stats">${stat("Loot", adventure.loot.length)}${stat("Boxes", adventure.boxes.length)}${stat("Constellations", adventure.constellations.length)}${stat("Awakenings", adventure.awakenings.length)}</div><p class="sw-muted">${adventure.loot.slice(0, 4).map(item => `${item.rarity} ${item.name}`).join(" · ") || "No loot collected yet."}</p></div><div class="sw-hunter-card"><p class="sw-kicker">Exercise Mastery</p><h3>Push-Up Mastery · Level ${mastered}</h3><p>${adventure.mastery.pushups} push-up quests cleared. Next level at ${mastered * 5} clears. Current bonus: +${Math.min(100, mastered * 10)} XP per push-up quest.</p><p class="sw-muted">Constellations: ${adventure.constellations.join(", ") || "None yet"}<br>Awakenings: ${adventure.awakenings.join(", ") || "Not awakened"}</p></div><div class="sw-hunter-card"><p class="sw-kicker">Hunter License</p><h3>${rank} License</h3><p>Current authorization: ${license}</p><p class="sw-muted">E: Shop · C: Elite Bosses · A: Shadow Barracks</p></div></div>`;
  }

  function renderStats(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const records = adventure.statistics || {};
    const first = records.firstTrackedDate ? new Date(`${records.firstTrackedDate}T00:00:00`) : new Date();
    const days = Math.max(1, Math.ceil((Date.now() - first.getTime()) / 86400000) + 1);
    const world = window.HunterProgression.worldFor(player);
    return `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">Hunter Records</p><h3>Lifetime Statistics</h3><div class="sw-mini-stats">${stat("Workouts", records.workouts || profile.completedQuests)}${stat("Push-Ups", records.pushups || 0)}${stat("Squats", records.squats || 0)}${stat("Minutes", records.minutes || 0)}</div></div><div class="sw-hunter-card"><p class="sw-kicker">Growth Analysis</p><h3>Consistency Report</h3><div class="sw-mini-stats">${stat("Bosses", world.bossesCleared)}${stat("Highest Streak", Math.max(records.highestStreak || 0, player.streak || 0))}${stat("Lifetime XP", player.totalXp)}${stat("Avg XP/Day", Math.round((player.totalXp || 0) / days))}</div></div></div>`;
  }

  function renderProfile(player) {
    const profile = getProfile(player);
    const rankEfficiency = Math.round((window.HunterProgression.rankXpMultiplier(player) || 1) * 100);
    const effects = { str: "+1% XP per point above 10", agi: "+0.5% gold per point above 10", end: "Faster Shadow missions and stronger boss damage", vit: "One automatic weekly streak-save per 10 VIT" };
    const attributes = Object.entries(profile.stats).map(([key, value]) => `<span><b>${value}</b>${key.toUpperCase()}<button data-action="stat" data-id="${key}" ${profile.statPoints < 1 ? "disabled" : ""}>+</button><small>${effects[key]}</small></span>`).join("");
    return `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">${escapeHtml(profile.title)}</p><h3>${escapeHtml(player.name)}</h3><p>${window.HunterWorkout.rankFor(player.level)} Rank · Level ${player.level}</p><div class="sw-mini-stats">${stat("Gold", profile.gold)}${stat("Quest Clears", profile.completedQuests)}${stat("XP Efficiency", `${rankEfficiency}%`)}${stat("Shadow Army", `${activeShadowsFor(player).length}/${shadowSlotsFor(player)}`)}</div></div><div class="sw-hunter-card"><p class="sw-kicker">Spend ${profile.statPoints} Attribute Points</p><h3>Hunter Attributes</h3><div class="sw-mini-stats sw-attribute-grid">${attributes}</div><p class="sw-muted">Higher ranks earn stronger XP rewards to match their harder requirements, while attributes scale from this hunter’s own stats.</p></div></div>`;
  }

  function renderConsole(tab = activeTab) {
    activeTab = tab;
    const root = document.getElementById("sw-system-console");
    if (!root || !window.HunterWorkout) return;
    const players = window.HunterWorkout.players();
    if (!players.length) return;
    const activeSession = localStorage.getItem("nightforgePlayerSession");
    if (!players.some(player => player.id === activeSession)) openPlayerSession(players);
    renderDailyLogin(players);
    const player = currentPlayer();
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const nav = tabs.map(item => `<button class="sw-console-tab ${item === activeTab ? "is-active" : ""}" data-console-tab="${item}">${item}</button>`).join("");
    let content = "";
    if (activeTab === "profile") content = `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">${escapeHtml(profile.title)}</p><h3>${escapeHtml(player.name)}</h3><p>${window.HunterWorkout.rankFor(player.level)} Rank · Level ${player.level}</p><div class="sw-mini-stats">${stat("Gold", profile.gold)}${stat("Quest Clears", profile.completedQuests)}${stat("Stat Points", profile.statPoints)}${stat("Shadow", profile.equippedShadow || "None")}</div></div><div class="sw-hunter-card"><h3>Hunter Attributes</h3><div class="sw-mini-stats">${Object.entries(profile.stats).map(([key, value]) => stat(key.toUpperCase(), value)).join("")}</div><p class="sw-muted">Theme: ${escapeHtml(profile.equippedTheme)} · Current fortune: ${adventure.dailyFortune?.type || "none"}</p></div></div>`;
    if (activeTab === "profile") content = renderProfile(player);
    if (activeTab === "missions") content = renderMissions(player);
    if (activeTab === "shadows") content = renderShadows(player);
    if (activeTab === "guild") content = renderGuild(player);
    if (activeTab === "headquarters") content = renderHeadquarters(player);
    if (activeTab === "archive") content = renderArchive(player);
    if (activeTab === "codex") content = renderCodex(player);
    if (activeTab === "stats") content = renderStats(player);
    if (activeTab === "shop") content = cards(shopItems, item => card(item.name, `${item.price} Gold`, `<button data-action="buy" data-id="${item.id}">Buy</button>`));
    if (activeTab === "titles") content = cards(titles, item => card(item.name, item.unlock, `<button data-action="title" data-id="${item.name}" ${!item.available(player) ? "disabled" : ""}>${profile.title === item.name ? "Equipped" : "Equip"}</button>`));
    if (activeTab === "cosmetics") content = cards(cosmetics, item => card(item.name, `${item.price} Gold`, profile.themes.includes(item.name) ? `<button data-action="theme" data-id="${item.name}">${profile.equippedTheme === item.name ? "Equipped" : "Equip"}</button>` : `<button data-action="buy" data-id="${item.name}">Unlock</button>`));
    if (activeTab === "upgrades") content = cards(upgrades, item => card(item.name, `${item.cost} Gold`, `<button data-action="upgrade" data-id="${item.id}">Upgrade</button>`));
    if (activeTab === "inventory") content = cards([{ name: "Mystery Boxes", detail: `${adventure.boxes.length} stored`, action: adventure.boxes.length ? "open-box" : "" }, { name: "Hunter Lottery", detail: "750 Gold · win a mystery box", action: "lottery" }, { name: "Double XP Potion", detail: `${adventure.potions.doubleXp} stored · doubles your next cleared quest`, action: "potion" }, { name: "Recovery Potion", detail: `${adventure.potions.recovery} stored · protects your current streak`, action: "recovery" }, ...profile.inventory.map(item => ({ name: item.name, detail: "Consumable", action: "use-item" }))], item => card(item.name, item.detail, item.action ? `<button data-action="${item.action}" data-id="${item.name}">${item.action === "open-box" ? "Open Box" : item.action === "lottery" ? "Play" : "Use"}</button>` : ""));
    if (activeTab === "settings") content = renderSettings(player);
    root.innerHTML = `<div class="sw-console-head"><div><p class="sw-kicker">System Console</p><h2>Hunter Progression</h2></div><label>Active Hunter<strong>${escapeHtml(player.name)}</strong><small>Use Switch Hunter to change sessions.</small></label></div><div class="sw-console-tabs">${nav}</div><div class="sw-console-content">${content}</div>`;
  }

  function finish(success, successText, errorText) { window.HunterWorkout.showToast(success ? "System Updated" : "System Locked", success ? successText : errorText); if (success) { saveGame(); renderConsole(); } }
  document.addEventListener("click", event => {
    const tab = event.target.dataset.consoleTab;
    if (tab) {
      renderConsole(tab);
      document.getElementById("sw-system-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const action = event.target.dataset.action; if (!action) return; const id = event.target.dataset.id;
    if (action === "daily-login") {
      const player = window.HunterWorkout.players().find(item => item.id === id);
      const claimed = player && window.HunterProgression.actions.claimDailyLogin(player);
      if (claimed) { saveGame(); window.HunterWorkout.showToast("Daily Login Claimed", `${player.name} received 120 XP and 75 Gold.`); renderConsole(); }
      return;
    }
    if (action === "daily-close") {
      const today = window.HunterProgression.actions.easternDayKey();
      localStorage.setItem(`nightforgeDailyLoginDismissed:${today}`, "true");
      document.getElementById("sw-daily-login").style.display = "none";
      return;
    }
    if (action === "player-session") {
      localStorage.setItem("nightforgePlayerSession", id);
      localStorage.setItem("nightforgeViewedHunter", id);
      document.getElementById("sw-player-session").style.display = "none";
      window.HunterWorkout.render();
      window.HunterPush?.syncHunter?.();
      renderConsole();
      return;
    }
    const player = currentPlayer();
    if (action === "push-enable") {
      window.HunterPush?.enable().then(enabled => {
        window.HunterWorkout.showToast(enabled ? "Push Enabled" : "Push Unavailable", window.HunterPush.status().detail);
        renderConsole();
      }).catch(error => window.HunterWorkout.showToast("Push Unavailable", error.message));
      return;
    }
    if (action === "push-disable") {
      window.HunterPush?.disable().then(() => {
        window.HunterWorkout.showToast("Push Disabled", window.HunterPush.status().detail);
        renderConsole();
      }).catch(error => window.HunterWorkout.showToast("Push Error", error.message));
      return;
    }
    if (action === "buy") return finish(buyItem(player, id) || (() => { const cosmetic = cosmetics.find(item => item.name === id); const profile = getProfile(player); if (!cosmetic || profile.gold < cosmetic.price || profile.themes.includes(cosmetic.name)) return false; profile.gold -= cosmetic.price; profile.themes.push(cosmetic.name); return equipTheme(player, cosmetic.name); })(), "Purchase complete.", "Not enough gold or already owned.");
    if (action === "title") return finish(equipTitle(player, id), "Title equipped.", "That title is still locked.");
    if (action === "summon") return finish(summonShadow(player, id), "Shadow added to your army.", "Not enough gold or fragments.");
    if (action === "shadow") return finish(equipShadow(player, id), "Shadow equipped.", "Shadow unavailable.");
    if (action === "theme") return finish(equipTheme(player, id), "Theme equipped.", "Theme unavailable.");
    if (action === "upgrade") return finish(buyUpgrade(player, id), "Upgrade applied.", "Not enough gold or upgrade limit reached.");
    if (action === "stat") return finish(window.HunterProgression.allocateStat(player, id), `${id.toUpperCase()} increased. Your hunter bonuses have scaled.`, "No attribute points available.");
    if (action === "use-item") { const used = removeItem(player, id); if (used) { player.quests = []; } return finish(used, "Quest Refresh used. A new quest list has been issued. Cleared quests remain locked for today.", "Item unavailable."); }
    if (action === "emergency") return finish(window.HunterProgression.actions.claimEmergency(player), "Emergency quest cleared.", "No emergency quest active.");
    if (action === "elite-summon") return finish(window.HunterProgression.actions.summonEliteBoss(player), "Elite boss summoned.", "Elite bosses unlock at Level 10.");
    if (action === "elite-phase") { const result = window.HunterProgression.actions.advanceEliteBoss(player); return finish(Boolean(result), result === "defeated" ? "Boss armor shattered. Claim the core." : "Boss HP reduced. Next phase detected.", "No active boss phase."); }
    if (action === "elite-claim") return finish(window.HunterProgression.actions.claimEliteBoss(player), "Elite boss defeated.", "No elite boss active.");
    if (action === "event") return finish(window.HunterProgression.actions.claimRandomEvent(player), "Event reward claimed.", "Event unavailable.");
    if (action === "open-box") return finish(window.HunterProgression.actions.openBox(player), "Mystery box opened.", "No mystery boxes available.");
    if (action === "lottery") return finish(window.HunterProgression.actions.playLottery(player), "Lottery reward added to your inventory.", "You need 750 Gold.");
    if (action === "potion") return finish(window.HunterProgression.actions.usePotion(player, "doubleXp"), "Double XP armed for your next quest.", "You do not have a Double XP Potion.");
    if (action === "recovery") return finish(window.HunterProgression.actions.usePotion(player, "recovery"), "Recovery protection is active.", "You do not have a Recovery Potion.");
    if (action === "gate") return finish(window.HunterProgression.worldActions.claimGate(player), "Dimension Gate cleared.", "No gate is currently open.");
    if (action === "story-enter") return finish(window.HunterProgression.worldActions.enterStoryGate(player), "Gate entered. The challenge is active.", "No unknown gate is available.");
    if (action === "story-clear") return finish(window.HunterProgression.worldActions.clearStoryGate(player), "Story gate cleared. Exclusive rewards granted.", "Enter the gate first.");
    if (action === "story-ignore") return finish(window.HunterProgression.worldActions.ignoreStoryGate(player), "Gate ignored. The System records your decision.", "No unknown gate is available.");
    if (action === "shadow-send") return finish(window.HunterProgression.actions.sendShadowMission(player), "Shadow dispatched. It returns in 30 minutes.", "Monarch rank and an equipped Shadow are required.");
    if (action === "shadow-claim") return finish(window.HunterProgression.actions.claimShadowMission(player), "Shadow mission complete. XP, gold, and a Shadow level gained.", "Your Shadow is still on mission.");
    if (action === "welcome") return finish(window.HunterProgression.worldActions.claimWelcome(player), "Recovery package claimed.", "No welcome package is waiting.");
    if (action === "voice") { const enabled = window.HunterProgression.worldActions.toggleVoice(player); return finish(true, `System voice ${enabled ? "enabled" : "disabled"}.`, ""); }
    if (action === "voice-style") return finish(Boolean(window.HunterProgression.worldActions.setNarration(player, id)), "Narrator profile updated.", "Voice profile unavailable.");
  });
  window.HunterProgression.renderConsole = renderConsole;
  window.HunterProgression.showCinematic = rank => {
    const existing = document.getElementById("sw-cinematic-rank");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "sw-cinematic-rank";
    overlay.innerHTML = `<div><p>HUNTER RANK INCREASED</p><b>${rank}</b><span>RANK EVALUATION COMPLETE</span></div>`;
    document.body.append(overlay);
    window.setTimeout(() => overlay.remove(), 3000);
  };
  window.addEventListener("hunter:state-updated", () => renderConsole());
  window.addEventListener("hunter:push-status", () => { if (activeTab === "settings") renderConsole(); });
  document.getElementById("sw-session-open")?.addEventListener("click", () => openPlayerSession(window.HunterWorkout.players()));
  loadGame();
  window.HunterProgression.adventureMigrationOccurred = false;
  window.HunterProgression.worldMigrationOccurred = false;
  const loggedIn = window.HunterWorkout.players().map(window.HunterProgression.login).some(Boolean);
  const worldLoggedIn = window.HunterWorkout.players().map(window.HunterProgression.worldLogin).some(Boolean);
  if (loggedIn || worldLoggedIn || window.HunterProgression.adventureMigrationOccurred || window.HunterProgression.worldMigrationOccurred) saveGame();
  renderConsole();
})();
