/* Public Firebase web push worker. It only receives public web configuration. */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

let messaging;
const configurationReady = fetch("/api/push/config", { cache: "no-store" })
  .then(response => response.ok ? response.json() : null)
  .then(settings => {
    if (!settings?.enabled || !settings.config) return;
    firebase.initializeApp(settings.config);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage(payload => {
      const data = payload.data || {};
      return self.registration.showNotification(data.notificationTitle || "Hunter Workout System", {
        body: data.notificationBody || "A new System update is available.",
        icon: "/assets/nightforge-hero-original.png",
        badge: "/assets/nightforge-hero-original.png",
        data: { url: data.url || "/", playerId: data.playerId || "" },
        tag: `${data.type || "system"}-${data.playerId || "party"}`,
        renotify: false
      });
    });
  })
  .catch(error => console.warn("Push worker configuration unavailable:", error.message));

self.addEventListener("install", event => event.waitUntil(configurationReady));
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(windowClient => windowClient.url.startsWith(self.location.origin));
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
