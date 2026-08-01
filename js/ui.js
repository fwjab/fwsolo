(() => {
  const tabs = ["profile", "shop", "achievements", "titles", "shadows", "cosmetics", "upgrades", "inventory"];
  let selectedPlayerId = "";
  let activeTab = "profile";
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  const player = () => window.HunterWorkout?.players().find(item => item.id === selectedPlayerId) || window.HunterWorkout?.players()[0];
  const statRow = (label, value) => `<span><b>${value}</b>${label}</span>`;

  function renderConsole(tab = activeTab) {
    activeTab = tab;
    const root = document.getElementById("sw-system-console");
    if (!root || !window.HunterWorkout) return;
    const players = window.HunterWorkout.players();
    if (!players.length) return;
    if (!players.some(item => item.id === selectedPlayerId)) selectedPlayerId = players[0].id;
    const hunter = player();
    const profile = getProfile(hunter);
    const nav = tabs.map(item => `<button class="sw-console-tab ${item === activeTab ? "is-active" : ""}" data-console-tab="${item}">${item}</button>`).join("");
    let content = "";
    if (activeTab === "profile") content = `<div class="sw-console-grid"><div class="sw-hunter-card"><p class="sw-kicker">${escapeHtml(profile.title)}</p><h3>${escapeHtml(hunter.name)}</h3><p>${window.HunterWorkout.rankFor(hunter.level)} Rank · Level ${hunter.level}</p><div class="sw-mini-stats">${statRow("Gold", profile.gold)}${statRow("Quest Clears", profile.completedQuests)}${statRow("Stat Points", profile.statPoints)}${statRow("Shadow", profile.equippedShadow || "None")}</div></div><div class="sw-hunter-card"><h3>Hunter Attributes</h3><div class="sw-mini-stats">${Object.entries(profile.stats).map(([key, value]) => statRow(key.toUpperCase(), value)).join("")}</div><p class="sw-muted">Theme: ${escapeHtml(profile.equippedTheme)} · Inventory: ${profile.inventory.length}/${profile.upgrades.inventorySlots}</p></div></div>`;
    if (activeTab === "shop") content = listCards(shopItems, item => `<button data-action="buy" data-id="${item.id}">Buy · ${item.price} G</button>`, item => item.name);
    if (activeTab === "achievements") content = listCards(achievements, item => `<span>${profile.achievements.includes(item.id) ? "Claimed" : `${Math.min(profile.completedQuests, item.goal)}/${item.goal}`}</span>`, item => `${item.name}<small>${item.description} · ${item.rewardGold} G / ${item.rewardXP} XP</small>`);
    if (activeTab === "titles") content = listCards(titles, item => `<button data-action="title" data-id="${item.name}" ${!item.available(hunter) ? "disabled" : ""}>${profile.title === item.name ? "Equipped" : "Equip"}</button>`, item => `${item.name}<small>${item.unlock}</small>`);
    if (activeTab === "shadows") content = listCards(shadows, item => profile.shadows.includes(item.name) ? `<button data-action="shadow" data-id="${item.name}">${profile.equippedShadow === item.name ? "Equipped" : "Equip"}</button>` : `<button data-action="summon" data-id="${item.name}">Summon · ${item.cost} G</button>`, item => item.name);
    if (activeTab === "cosmetics") content = listCards(cosmetics, item => profile.themes.includes(item.name) ? `<button data-action="theme" data-id="${item.name}">${profile.equippedTheme === item.name ? "Equipped" : "Equip"}</button>` : `<button data-action="buy" data-id="${item.name}">Unlock · ${item.price} G</button>`, item => item.name);
    if (activeTab === "upgrades") content = listCards(upgrades, item => `<button data-action="upgrade" data-id="${item.id}">Upgrade · ${item.cost} G</button>`, item => item.name);
    if (activeTab === "inventory") content = profile.inventory.length ? listCards(profile.inventory, item => `<button data-action="use-item" data-id="${item.name}">Use</button>`, item => item.name) : `<p class="sw-muted">Your inventory is empty. Buy a Quest Refresh from the Shop.</p>`;
    root.innerHTML = `<div class="sw-console-head"><div><p class="sw-kicker">System Console</p><h2>Hunter Progression</h2></div><label>Active Hunter<select id="sw-console-player">${players.map(item => `<option value="${item.id}" ${item.id === hunter.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label></div><div class="sw-console-tabs">${nav}</div><div class="sw-console-content">${content}</div>`;
  }

  function listCards(items, action, title) { return `<div class="sw-system-list">${items.map(item => `<article><div><h3>${title(item)}</h3></div>${action(item)}</article>`).join("")}</div>`; }
  function finish(success, successText, errorText) { window.HunterWorkout.showToast(success ? "System Updated" : "System Locked", success ? successText : errorText); if (success) { saveGame(); renderConsole(); } }
  document.addEventListener("change", event => { if (event.target.id === "sw-console-player") { selectedPlayerId = event.target.value; renderConsole(); } });
  document.addEventListener("click", event => {
    const tab = event.target.dataset.consoleTab; if (tab) return renderConsole(tab);
    const action = event.target.dataset.action; if (!action) return; const hunter = player(); const id = event.target.dataset.id;
    if (action === "buy") return finish(buyItem(hunter, id) || (() => { const cosmetic = cosmetics.find(item => item.name === id); const profile = getProfile(hunter); if (!cosmetic || profile.gold < cosmetic.price || profile.themes.includes(cosmetic.name)) return false; profile.gold -= cosmetic.price; profile.themes.push(cosmetic.name); return equipTheme(hunter, cosmetic.name); })(), "Purchase complete.", "Not enough gold or already owned.");
    if (action === "title") return finish(equipTitle(hunter, id), "Title equipped.", "That title is still locked.");
    if (action === "summon") return finish(summonShadow(hunter, id), "Shadow added to your army.", "Not enough gold.");
    if (action === "shadow") return finish(equipShadow(hunter, id), "Shadow equipped.", "Shadow unavailable.");
    if (action === "theme") return finish(equipTheme(hunter, id), "Theme equipped.", "Theme unavailable.");
    if (action === "upgrade") return finish(buyUpgrade(hunter, id), "Upgrade applied.", "Not enough gold or upgrade limit reached.");
    if (action === "use-item") {
      const used = removeItem(hunter, id);
      if (used) { hunter.quests = []; hunter.questDate = ""; }
      return finish(used, "Quest Refresh used. A new daily quest list has been issued.", "Item unavailable.");
    }
  });
  window.HunterProgression.renderConsole = renderConsole;
  window.addEventListener("hunter:state-updated", () => renderConsole());
  loadGame();
  renderConsole();
})();
