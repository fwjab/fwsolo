(() => {
  const preferenceKey = "nightforgePushPreference";
  let settings = { state: "checking", detail: "Checking push notification support." };
  let oneSignal = null;

  function update(next) {
    settings = { ...settings, ...next };
    window.dispatchEvent(new CustomEvent("hunter:push-status"));
  }

  function playerExternalId() {
    const selected = localStorage.getItem("nightforgePlayerSession");
    const players = window.HunterWorkout?.players?.() || [];
    const player = players.find(item => item.id === selected) || players[0];
    return player ? `hunter-${player.id}` : "";
  }

  async function initialize() {
    if (oneSignal) return true;
    if (!("Notification" in window) || location.protocol === "file:") {
      update({ state: "unsupported", detail: "This browser does not support web push notifications." });
      return false;
    }
    const response = await fetch("/api/push/config", { cache: "no-store" });
    const config = await response.json();
    if (!config.enabled || !config.appId) {
      update({ state: "unavailable", detail: "Push notifications are not configured on this server yet." });
      return false;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    await new Promise((resolve, reject) => window.OneSignalDeferred.push(async OneSignal => {
      try {
        await OneSignal.init({ appId: config.appId, allowLocalhostAsSecureOrigin: location.hostname === "localhost" });
        oneSignal = OneSignal;
        if (localStorage.getItem(preferenceKey) === "enabled" && Notification.permission === "granted") await OneSignal.login(playerExternalId());
        if (Notification.permission === "denied") update({ state: "blocked", detail: "Notifications are blocked in this browser's site settings." });
        else if (localStorage.getItem(preferenceKey) === "enabled" && OneSignal.User.PushSubscription.optedIn) update({ state: "enabled", detail: "Push notifications are enabled for this device." });
        else update({ state: "disabled", detail: "Enable alerts for daily quests, ranks, streaks, and party updates." });
        resolve();
      } catch (error) { reject(error); }
    }));
    return true;
  }

  async function enable() {
    if (!(await initialize()) || Notification.permission === "denied") return false;
    await oneSignal.login(playerExternalId());
    await oneSignal.Notifications.requestPermission();
    if (Notification.permission !== "granted") {
      localStorage.setItem(preferenceKey, "blocked");
      update({ state: "blocked", detail: "Notifications were not allowed. Enable them later in browser site settings." });
      return false;
    }
    await oneSignal.User.PushSubscription.optIn();
    localStorage.setItem(preferenceKey, "enabled");
    update({ state: "enabled", detail: "Push notifications are enabled for this device." });
    return true;
  }

  async function disable() {
    if (await initialize()) {
      await oneSignal.User.PushSubscription.optOut();
      await oneSignal.logout();
    }
    localStorage.setItem(preferenceKey, "disabled");
    update({ state: "disabled", detail: "Push notifications are disabled on this device." });
  }

  async function syncHunter() {
    if (localStorage.getItem(preferenceKey) === "enabled" && await initialize()) await oneSignal.login(playerExternalId());
  }

  window.HunterPush = { status: () => settings, enable, disable, syncHunter };
  initialize().catch(error => update({ state: "unavailable", detail: `Push setup unavailable: ${error.message}` }));
})();
