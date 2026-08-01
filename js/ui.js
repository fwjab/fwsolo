(() => {
  const tabs = ["profile", "missions", "shadows", "headquarters", "codex", "shop", "titles", "cosmetics", "upgrades", "inventory"];
  let selectedPlayerId = "";
  let activeTab = "profile";
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  const currentPlayer = () => window.HunterWorkout?.players().find(item => item.id === selectedPlayerId) || window.HunterWorkout?.players()[0];
  const stat = (label, value) => `<span><b>${value}</b>${label}</span>`;
  const cards = (items, render) => `<div class="sw-system-list">${items.map(render).join("")}</div>`;
  const card = (title, body, action = "") => `<article><div><h3>${title}</h3>${body ? `<small>${body}</small>` : ""}</div>${action}</article>`;

  function renderShadows(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    return `<div class="sw-shadow-grid">${shadows.map(shadow => {
      const owned = profile.shadows.includes(shadow.name);
      const fragments = adventure.shadowFragments[shadow.name] || 0;
      return `<article class="sw-shadow-card sw-shadow-${shadow.className} ${owned ? "is-owned" : ""}"><div class="sw-shadow-crest">${shadow.crest}</div><div><p class="sw-kicker">${owned ? "Shadow Bound" : `${fragments}/${shadow.fragments} fragments`}</p><h3>${shadow.name}</h3><p>${shadow.description}</p></div><button data-action="${owned ? "shadow" : "summon"}" data-id="${shadow.name}">${owned ? (profile.equippedShadow === shadow.name ? "Equipped" : "Equip") : `Summon · ${shadow.cost} G`}</button></article>`;
    }).join("")}</div>`;
  }

  function renderMissions(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const missionCards = [];
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

  function renderCodex(player) {
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const mastered = Math.floor(adventure.mastery.pushups / 5) + 1;
    const rank = window.HunterWorkout.rankFor(player.level);
    const license = rank === "E" || rank === "D" ? "Hunter Shop" : rank === "C" || rank === "B" ? "Elite Boss Terminal" : "Shadow Barracks";
    return `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">Hunter Codex</p><h3>Collected Knowledge</h3><div class="sw-mini-stats">${stat("Loot", adventure.loot.length)}${stat("Boxes", adventure.boxes.length)}${stat("Constellations", adventure.constellations.length)}${stat("Awakenings", adventure.awakenings.length)}</div><p class="sw-muted">${adventure.loot.slice(0, 4).map(item => `${item.rarity} ${item.name}`).join(" · ") || "No loot collected yet."}</p></div><div class="sw-hunter-card"><p class="sw-kicker">Exercise Mastery</p><h3>Push-Up Mastery · Level ${mastered}</h3><p>${adventure.mastery.pushups} push-up quests cleared. Next level at ${mastered * 5} clears. Current bonus: +${Math.min(100, mastered * 10)} XP per push-up quest.</p><p class="sw-muted">Constellations: ${adventure.constellations.join(", ") || "None yet"}<br>Awakenings: ${adventure.awakenings.join(", ") || "Not awakened"}</p></div><div class="sw-hunter-card"><p class="sw-kicker">Hunter License</p><h3>${rank} License</h3><p>Current authorization: ${license}</p><p class="sw-muted">E: Shop · C: Elite Bosses · A: Shadow Barracks</p></div></div>`;
  }

  function renderConsole(tab = activeTab) {
    activeTab = tab;
    const root = document.getElementById("sw-system-console");
    if (!root || !window.HunterWorkout) return;
    const players = window.HunterWorkout.players();
    if (!players.length) return;
    if (!players.some(item => item.id === selectedPlayerId)) selectedPlayerId = players[0].id;
    const player = currentPlayer();
    const profile = getProfile(player);
    const adventure = window.HunterProgression.adventureFor(player);
    const nav = tabs.map(item => `<button class="sw-console-tab ${item === activeTab ? "is-active" : ""}" data-console-tab="${item}">${item}</button>`).join("");
    let content = "";
    if (activeTab === "profile") content = `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">${escapeHtml(profile.title)}</p><h3>${escapeHtml(player.name)}</h3><p>${window.HunterWorkout.rankFor(player.level)} Rank · Level ${player.level}</p><div class="sw-mini-stats">${stat("Gold", profile.gold)}${stat("Quest Clears", profile.completedQuests)}${stat("Stat Points", profile.statPoints)}${stat("Shadow", profile.equippedShadow || "None")}</div></div><div class="sw-hunter-card"><h3>Hunter Attributes</h3><div class="sw-mini-stats">${Object.entries(profile.stats).map(([key, value]) => stat(key.toUpperCase(), value)).join("")}</div><p class="sw-muted">Theme: ${escapeHtml(profile.equippedTheme)} · Current fortune: ${adventure.dailyFortune?.type || "none"}</p></div></div>`;
    if (activeTab === "missions") content = renderMissions(player);
    if (activeTab === "shadows") content = renderShadows(player);
    if (activeTab === "headquarters") content = renderHeadquarters(player);
    if (activeTab === "codex") content = renderCodex(player);
    if (activeTab === "shop") content = cards(shopItems, item => card(item.name, `${item.price} Gold`, `<button data-action="buy" data-id="${item.id}">Buy</button>`));
    if (activeTab === "titles") content = cards(titles, item => card(item.name, item.unlock, `<button data-action="title" data-id="${item.name}" ${!item.available(player) ? "disabled" : ""}>${profile.title === item.name ? "Equipped" : "Equip"}</button>`));
    if (activeTab === "cosmetics") content = cards(cosmetics, item => card(item.name, `${item.price} Gold`, profile.themes.includes(item.name) ? `<button data-action="theme" data-id="${item.name}">${profile.equippedTheme === item.name ? "Equipped" : "Equip"}</button>` : `<button data-action="buy" data-id="${item.name}">Unlock</button>`));
    if (activeTab === "upgrades") content = cards(upgrades, item => card(item.name, `${item.cost} Gold`, `<button data-action="upgrade" data-id="${item.id}">Upgrade</button>`));
    if (activeTab === "inventory") content = cards([{ name: "Mystery Boxes", detail: `${adventure.boxes.length} stored`, action: adventure.boxes.length ? "open-box" : "" }, { name: "Hunter Lottery", detail: "750 Gold · win a mystery box", action: "lottery" }, { name: "Double XP Potion", detail: `${adventure.potions.doubleXp} stored · doubles your next cleared quest`, action: "potion" }, { name: "Recovery Potion", detail: `${adventure.potions.recovery} stored · protects your current streak`, action: "recovery" }, ...profile.inventory.map(item => ({ name: item.name, detail: "Consumable", action: "use-item" }))], item => card(item.name, item.detail, item.action ? `<button data-action="${item.action}" data-id="${item.name}">${item.action === "open-box" ? "Open Box" : item.action === "lottery" ? "Play" : "Use"}</button>` : ""));
    root.innerHTML = `<div class="sw-console-head"><div><p class="sw-kicker">System Console</p><h2>Hunter Progression</h2></div><label>Active Hunter<select id="sw-console-player">${players.map(item => `<option value="${item.id}" ${item.id === player.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label></div><div class="sw-console-tabs">${nav}</div><div class="sw-console-content">${content}</div>`;
  }

  function finish(success, successText, errorText) { window.HunterWorkout.showToast(success ? "System Updated" : "System Locked", success ? successText : errorText); if (success) { saveGame(); renderConsole(); } }
  document.addEventListener("change", event => { if (event.target.id === "sw-console-player") { selectedPlayerId = event.target.value; renderConsole(); } });
  document.addEventListener("click", event => {
    const tab = event.target.dataset.consoleTab; if (tab) return renderConsole(tab);
    const action = event.target.dataset.action; if (!action) return; const player = currentPlayer(); const id = event.target.dataset.id;
    if (action === "buy") return finish(buyItem(player, id) || (() => { const cosmetic = cosmetics.find(item => item.name === id); const profile = getProfile(player); if (!cosmetic || profile.gold < cosmetic.price || profile.themes.includes(cosmetic.name)) return false; profile.gold -= cosmetic.price; profile.themes.push(cosmetic.name); return equipTheme(player, cosmetic.name); })(), "Purchase complete.", "Not enough gold or already owned.");
    if (action === "title") return finish(equipTitle(player, id), "Title equipped.", "That title is still locked.");
    if (action === "summon") return finish(summonShadow(player, id), "Shadow added to your army.", "Not enough gold or fragments.");
    if (action === "shadow") return finish(equipShadow(player, id), "Shadow equipped.", "Shadow unavailable.");
    if (action === "theme") return finish(equipTheme(player, id), "Theme equipped.", "Theme unavailable.");
    if (action === "upgrade") return finish(buyUpgrade(player, id), "Upgrade applied.", "Not enough gold or upgrade limit reached.");
    if (action === "use-item") { const used = removeItem(player, id); if (used) { player.quests = []; player.questDate = ""; } return finish(used, "Quest Refresh used. A new quest list has been issued.", "Item unavailable."); }
    if (action === "emergency") return finish(window.HunterProgression.actions.claimEmergency(player), "Emergency quest cleared.", "No emergency quest active.");
    if (action === "elite-summon") return finish(window.HunterProgression.actions.summonEliteBoss(player), "Elite boss summoned.", "Elite bosses unlock at Level 10.");
    if (action === "elite-claim") return finish(window.HunterProgression.actions.claimEliteBoss(player), "Elite boss defeated.", "No elite boss active.");
    if (action === "event") return finish(window.HunterProgression.actions.claimRandomEvent(player), "Event reward claimed.", "Event unavailable.");
    if (action === "open-box") return finish(window.HunterProgression.actions.openBox(player), "Mystery box opened.", "No mystery boxes available.");
    if (action === "lottery") return finish(window.HunterProgression.actions.playLottery(player), "Lottery reward added to your inventory.", "You need 750 Gold.");
    if (action === "potion") return finish(window.HunterProgression.actions.usePotion(player, "doubleXp"), "Double XP armed for your next quest.", "You do not have a Double XP Potion.");
    if (action === "recovery") return finish(window.HunterProgression.actions.usePotion(player, "recovery"), "Recovery protection is active.", "You do not have a Recovery Potion.");
  });
  window.HunterProgression.renderConsole = renderConsole;
  window.addEventListener("hunter:state-updated", () => renderConsole());
  loadGame();
  window.HunterProgression.adventureMigrationOccurred = false;
  const loggedIn = window.HunterWorkout.players().map(window.HunterProgression.login).some(Boolean);
  if (loggedIn || window.HunterProgression.adventureMigrationOccurred) saveGame();
  renderConsole();
})();
