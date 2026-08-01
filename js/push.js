(() => {
  const preferenceKey = "nightforgePushPreference";
  let settings = { state: "checking", detail: "Checking push notification support." };
  let firebaseConfig = null;
  let messaging = null;
  let registration = null;

  function update(next) {
    settings = { ...settings, ...next };
    window.dispatchEvent(new CustomEvent("hunter:push-status"));
  }

  function supported() {
    return location.protocol !== "file:" && "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
  }

  function activePlayerId() {
    const selected = localStorage.getItem("nightforgePlayerSession");
    const players = window.HunterWorkout?.players?.() || [];
    return players.some(player => player.id === selected) ? selected : players[0]?.id || "";
  }

  async function loadFirebase() {
    if (messaging && registration) return true;
    if (!supported()) {
      update({ state: "unsupported", detail: "This browser does not support web push notifications." });
      return false;
    }
    const response = await fetch("/api/push/config", { cache: "no-store" });
    const result = await response.json();
    if (!result.enabled || !result.config) {
      update({ state: "unavailable", detail: "Push notifications are not configured on this server yet." });
      return false;
    }
    firebaseConfig = result.config;
    const [{ initializeApp, getApp, getApps }, { getMessaging, getToken, deleteToken, onMessage }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js")
    ]);
    const app = getApps().some(item => item.name === "nightforge-push") ? getApp("nightforge-push") : initializeApp(firebaseConfig, "nightforge-push");
    messaging = getMessaging(app);
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    onMessage(messaging, payload => {
      const data = payload.data || {};
      window.HunterWorkout?.showToast?.(data.notificationTitle || "System Message", data.notificationBody || "A new hunter update is available.");
    });
    const preference = localStorage.getItem(preferenceKey);
    if (Notification.permission === "denied") update({ state: "blocked", detail: "Notifications are blocked in this browser's site settings." });
    else if (preference === "enabled" && Notification.permission === "granted") update({ state: "enabled", detail: "Push notifications are enabled for this device." });
    else update({ state: "disabled", detail: "Enable alerts for daily quests, ranks, streaks, and party updates." });
    window.HunterPush.client = { getToken, deleteToken };
    return true;
  }

  async function enable() {
    if (!(await loadFirebase()) || Notification.permission === "denied") return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      localStorage.setItem(preferenceKey, "blocked");
      update({ state: "blocked", detail: "Notifications were not allowed. Enable them later in browser site settings." });
      return false;
    }
    const token = await window.HunterPush.client.getToken(messaging, { vapidKey: firebaseConfig.vapidKey, serviceWorkerRegistration: registration });
    const playerId = activePlayerId();
    if (!token || !playerId) throw new Error("Choose a hunter session before enabling notifications.");
    const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, playerId }) });
    if (!response.ok) throw new Error((await response.json()).error || "Could not save notification preference.");
    localStorage.setItem(preferenceKey, "enabled");
    localStorage.setItem("nightforgePushToken", token);
    update({ state: "enabled", detail: "Push notifications are enabled for this device." });
    return true;
  }

  async function disable() {
    const token = localStorage.getItem("nightforgePushToken");
    if (token) await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (messaging && window.HunterPush.client) await window.HunterPush.client.deleteToken(messaging);
    localStorage.setItem(preferenceKey, "disabled");
    localStorage.removeItem("nightforgePushToken");
    update({ state: "disabled", detail: "Push notifications are disabled on this device." });
  }

  window.HunterPush = { status: () => settings, enable, disable, client: null };
  loadFirebase().catch(error => update({ state: "unavailable", detail: `Push setup unavailable: ${error.message}` }));
})();
