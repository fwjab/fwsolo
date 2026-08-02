const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const admin = require("firebase-admin");
const GameState = require("./models/GameState");
const NotificationSubscription = require("./models/NotificationSubscription");
const port = Number(process.env.PORT || 4177);
const host = "0.0.0.0";
const adminPasscode = "j@bultra";
const maxPlayers = 10;
const appFile = path.join(__dirname, "index.html");
const saveFile = path.join(__dirname, "workout-save.json");
let useMongo = Boolean(process.env.MONGO_URI);
let firebaseMessaging = null;

function cleanPushText(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanPushData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 8).map(([key, item]) => [
    cleanPushText(key, 40),
    cleanPushText(item, 160)
  ]).filter(([key]) => key));
}

function firebaseWebConfig() {
  let webConfig = {};
  if (process.env.FIREBASE_WEB_CONFIG_JSON) {
    try {
      webConfig = JSON.parse(process.env.FIREBASE_WEB_CONFIG_JSON);
    } catch (error) {
      console.error("Firebase push is disabled: FIREBASE_WEB_CONFIG_JSON is not valid JSON.");
      return null;
    }
  } else {
    webConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
  }
  const config = { ...webConfig, vapidKey: process.env.FIREBASE_VAPID_KEY || webConfig.vapidKey };
  const required = [config.apiKey, config.authDomain, config.projectId, config.storageBucket, config.messagingSenderId, config.appId, config.vapidKey];
  return required.every(Boolean) ? config : null;
}

function initializeFirebaseMessaging() {
  const rawCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    console.log("Firebase push is disabled: FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
    return;
  }
  try {
    const serviceAccount = JSON.parse(rawCredentials);
    serviceAccount.private_key = String(serviceAccount.private_key || "").replace(/\\n/g, "\n");
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) throw new Error("Service account JSON is incomplete.");
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseMessaging = admin.messaging(app);
    console.log("Firebase Cloud Messaging is configured.");
  } catch (error) {
    console.error("Firebase push is disabled: invalid service account configuration:", error.message);
  }
}

initializeFirebaseMessaging();

if (useMongo) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(error => {
      useMongo = false;
      console.error("MongoDB connection failed; using local save instead:", error.message);
    });
} else {
  console.log("No MONGO_URI set; using local workout-save.json.");
}
const defaultState = {
  quoteIndex: 4,
  feed: ["Shared party system initialized."],
  players: [
    { id: "p1", name: "Player 1", level: 3, xp: 95, totalXp: 340, streak: 0, lastDaily: "", quests: [], log: [] },
    { id: "p2", name: "Player 2", level: 1, xp: 0, totalXp: 0, streak: 0, lastDaily: "", quests: [], log: [] }
  ]
};

async function readState() {
  if (!useMongo) {
    try {
      const state = JSON.parse(fs.readFileSync(saveFile, "utf8"));
      if (state && Array.isArray(state.players)) return state;
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Could not read local save:", error.message);
    }
    return structuredClone(defaultState);
  }

  const state = await GameState.findOne();

  if (!state) {
    state = await GameState.create(defaultState);
  }

  return state;
}

async function writeState(state) {
  if (!useMongo) {
    fs.writeFileSync(saveFile, JSON.stringify(state, null, 2));
    return;
  }

  await GameState.findByIdAndUpdate(
    state._id,
    state,
    { new: true, upsert: true }
  );
}

function pushEnabled() {
  return Boolean(useMongo && firebaseMessaging && firebaseWebConfig());
}

function invalidFirebaseToken(error) {
  return ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(error?.code);
}

async function removeInvalidNotificationToken(token) {
  if (!useMongo || !token) return;
  await NotificationSubscription.deleteOne({ token });
}

async function sendPushToToken(token, title, body, data = {}) {
  if (!pushEnabled()) return { sent: false, reason: "Push is not configured." };
  const safeTitle = cleanPushText(title, 70);
  const safeBody = cleanPushText(body, 180);
  if (!safeTitle || !safeBody || typeof token !== "string" || token.length > 4096) return { sent: false, reason: "Invalid push payload." };
  const payload = {
    token,
    data: { ...cleanPushData(data), notificationTitle: safeTitle, notificationBody: safeBody, url: data.url && String(data.url).startsWith("/") ? String(data.url) : "/" },
    webpush: {
      fcmOptions: { link: data.url && String(data.url).startsWith("/") ? String(data.url) : "/" }
    }
  };
  try {
    const messageId = await firebaseMessaging.send(payload);
    return { sent: true, messageId };
  } catch (error) {
    if (invalidFirebaseToken(error)) await removeInvalidNotificationToken(token);
    console.error("Firebase push send failed:", error.code || error.message);
    return { sent: false, reason: error.code || "Firebase send failed." };
  }
}

async function sendPushToPlayer(playerId, title, body, data = {}) {
  if (!pushEnabled() || !playerId) return { sent: 0 };
  const subscriptions = await NotificationSubscription.find({ playerId }).select("token").lean();
  const results = await Promise.all(subscriptions.map(subscription => sendPushToToken(subscription.token, title, body, { ...data, playerId })));
  return { sent: results.filter(result => result.sent).length };
}

async function sendPushToAllPlayers(title, body, data = {}) {
  if (!pushEnabled()) return { sent: 0 };
  const subscriptions = await NotificationSubscription.find({}).select("token playerId").lean();
  const results = await Promise.all(subscriptions.map(subscription => sendPushToToken(subscription.token, title, body, { ...data, playerId: subscription.playerId })));
  return { sent: results.filter(result => result.sent).length };
}

function queuePush(task) {
  Promise.resolve(task).catch(error => console.error("Push event failed:", error.message));
}

function rankFor(level) {
  if (level >= 35) return "Monarch";
  if (level >= 30) return "National";
  if (level >= 25) return "S";
  if (level >= 20) return "A";
  if (level >= 15) return "B";
  if (level >= 10) return "C";
  if (level >= 5) return "D";
  return "E";
}

function dailyQuestComplete(player) {
  return Array.isArray(player?.quests) && player.quests.length > 0 && player.quests.every(quest => quest.done);
}

function notifyProgressChanges(previousState, nextState) {
  const previousPlayers = new Map((previousState.players || []).map(player => [player.id, player]));
  for (const player of nextState.players || []) {
    const before = previousPlayers.get(player.id);
    if (!before) continue;
    if (Number(player.level) > Number(before.level)) {
      queuePush(sendPushToPlayer(player.id, "Level Up", `${player.name} reached Level ${player.level}.`, { type: "level-up", url: "/" }));
      const previousRank = rankFor(Number(before.level) || 1);
      const newRank = rankFor(Number(player.level) || 1);
      if (previousRank !== newRank) {
        queuePush(sendPushToPlayer(player.id, "Rank Evaluation Complete", `${player.name} advanced to ${newRank} Rank. A ${newRank}-Rank Boss Quest is now available.`, { type: "rank-up", rank: newRank, url: "/" }));
      }
    }
    if (!dailyQuestComplete(before) && dailyQuestComplete(player)) {
      queuePush(sendPushToPlayer(player.id, "Daily Quests Complete", "All daily quests are cleared. Your streak bonus has been recorded.", { type: "daily-complete", url: "/" }));
    }
  }
}

function easternDayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function safeSecretMatch(request) {
  const expected = process.env.PUSH_CRON_SECRET;
  const received = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return Boolean(expected && received && expected.length === received.length && require("crypto").timingSafeEqual(Buffer.from(expected), Buffer.from(received)));
}

function xpForLevel(level) {
  return 100 + (level - 1) * 45;
}

function totalProgressXp(player) {
  let total = Number(player.xp) || 0;
  for (let level = 1; level < player.level; level += 1) {
    total += xpForLevel(level);
  }
  return Math.max(0, total);
}

function setProgressFromTotal(player, progressXp) {
  let remaining = Math.max(0, Math.round(progressXp));
  let level = 1;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  player.level = level;
  player.xp = remaining;
}

function createPlayer(name, existingPlayers) {
  const usedIds = new Set(existingPlayers.map(player => player.id));
  let nextNumber = existingPlayers.length + 1;
  let id = `p${nextNumber}`;
  while (usedIds.has(id)) {
    nextNumber += 1;
    id = `p${nextNumber}`;
  }
  return {
    id,
    name: String(name).trim().slice(0, 30),
    level: 1,
    xp: 0,
    totalXp: 0,
    streak: 0,
    lastDaily: "",
    quests: [],
    log: []
  };
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
    // Serve JavaScript
if (request.method === "GET" && requestPath.endsWith(".js")) {
    const filePath = path.resolve(__dirname, `.${requestPath}`);

    if (filePath.startsWith(`${__dirname}${path.sep}`) && fs.existsSync(filePath)) {
        response.writeHead(200, {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store"
        });

        response.end(fs.readFileSync(filePath));
    } else {
        sendJson(response, 404, { error: "File not found." });
    }

    return;
}

    if (request.method === "GET" && ["/assets/nightforge-hero-original.png", "/assets/nightforge-shadow-roster.png"].includes(requestPath)) {
      const assetName = path.basename(requestPath);
      response.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
      response.end(fs.readFileSync(path.join(__dirname, "assets", assetName)));
      return;
    }

// Serve CSS
if (request.method === "GET" && requestPath.endsWith(".css")) {
    const filePath = path.resolve(__dirname, `.${requestPath}`);

    if (filePath.startsWith(`${__dirname}${path.sep}`) && fs.existsSync(filePath)) {
        response.writeHead(200, {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "no-store"
        });

        response.end(fs.readFileSync(filePath));
    } else {
        sendJson(response, 404, { error: "File not found." });
    }

    return;
}
    if (
    request.method === "GET" &&
    (request.url === "/" || request.url === "/index.html")
) {
    response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
    });

    response.end(fs.readFileSync(appFile));
    return;
}

    if (request.url === "/api/push/config" && request.method === "GET") {
      const config = firebaseWebConfig();
      sendJson(response, 200, { enabled: Boolean(pushEnabled()), config: config ? { ...config, measurementId: config.measurementId || undefined } : null });
      return;
    }

    if (request.url === "/api/push/subscribe" && request.method === "POST") {
      if (!pushEnabled()) {
        sendJson(response, 503, { error: "Push notifications are not configured yet." });
        return;
      }
      const body = JSON.parse(await readBody(request));
      const playerId = cleanPushText(body.playerId, 80);
      const token = String(body.token || "").trim();
      if (!playerId || !token || token.length < 20 || token.length > 4096 || /\s/.test(token)) {
        sendJson(response, 400, { error: "Invalid notification subscription." });
        return;
      }
      const state = await readState();
      if (!state.players.some(player => player.id === playerId)) {
        sendJson(response, 404, { error: "Hunter record not found." });
        return;
      }
      await NotificationSubscription.findOneAndUpdate(
        { token },
        { $set: { playerId, lastSeenAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url === "/api/push/unsubscribe" && request.method === "POST") {
      const body = JSON.parse(await readBody(request));
      const token = String(body.token || "").trim();
      if (!token || token.length > 4096) {
        sendJson(response, 400, { error: "Invalid notification token." });
        return;
      }
      await removeInvalidNotificationToken(token);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url === "/api/internal/push/daily-reset" && request.method === "POST") {
      if (!safeSecretMatch(request)) {
        sendJson(response, 401, { error: "Unauthorized." });
        return;
      }
      if (!pushEnabled()) {
        sendJson(response, 503, { error: "Push notifications are not configured." });
        return;
      }
      const state = await readState();
      const today = easternDayKey();
      state.notificationMeta = state.notificationMeta || {};
      let sent = 0;
      if (state.notificationMeta.dailyQuestDay !== today) {
        state.notificationMeta.dailyQuestDay = today;
        await writeState(state);
        const results = await Promise.all(state.players.map(player => sendPushToPlayer(player.id, "Daily Quests Available", "The System has generated new training missions for today.", { type: "daily-quests", url: "/" })));
        sent += results.reduce((sum, result) => sum + result.sent, 0);
      }
      const easternHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
      if (easternHour >= 20 && state.notificationMeta.streakWarningDay !== today) {
        state.notificationMeta.streakWarningDay = today;
        await writeState(state);
        const atRisk = state.players.filter(player => Number(player.streak) > 0 && player.lastDaily !== today);
        const results = await Promise.all(atRisk.map(player => sendPushToPlayer(player.id, "Streak at Risk", `${player.name}, complete today's quests before midnight Eastern to protect your ${player.streak}-day streak.`, { type: "streak-warning", url: "/" })));
        sent += results.reduce((sum, result) => sum + result.sent, 0);
      }
      sendJson(response, 200, { ok: true, sent, day: today });
      return;
    }

    if (request.url === "/api/state" && request.method === "GET") {
      const state = await readState();
sendJson(response, 200, state);
      return;
    }

    if (request.url === "/api/state" && request.method === "POST") {
      const body = await readBody(request);
      const nextState = JSON.parse(body);
      if (!nextState || !Array.isArray(nextState.players)) {
        sendJson(response, 400, { error: "Invalid state." });
        return;
      }
     const state = await readState();
      const previousState = typeof state.toObject === "function" ? state.toObject() : structuredClone(state);

const currentIds = state.players
  .map(player => player.id)
  .sort()
  .join("|");
      const nextIds = nextState.players.map(player => player.id).sort().join("|");
      if (currentIds !== nextIds) {
        sendJson(response, 403, { error: "Player roster changes require admin control." });
        return;
      }
      state.quoteIndex = nextState.quoteIndex;
state.feed = nextState.feed;
      state.players = nextState.players;
      await writeState(state);
      notifyProgressChanges(previousState, nextState);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url === "/api/admin/points" && request.method === "POST") {
      const body = await readBody(request);
      const { passcode, playerId, amount, reason } = JSON.parse(body);
      if (passcode !== adminPasscode) {
        sendJson(response, 403, { error: "Wrong passcode." });
        return;
      }

      const delta = Math.round(Number(amount));
      if (!Number.isFinite(delta) || delta === 0) {
        sendJson(response, 400, { error: "Enter a non-zero XP amount." });
        return;
      }

      const state = await readState();
      const player = state.players.find(item => item.id === playerId);
      if (!player) {
        sendJson(response, 404, { error: "Player not found." });
        return;
      }

      const beforeProgress = totalProgressXp(player);
      setProgressFromTotal(player, beforeProgress + delta);
      player.totalXp = Math.max(0, Math.round((Number(player.totalXp) || 0) + delta));
      player.log = Array.isArray(player.log) ? player.log : [];
      player.log.unshift({
        text: `${delta > 0 ? "+" : "-"}${Math.abs(delta)} XP: ${reason || "Admin adjustment"}`,
        date: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      });
      player.log = player.log.slice(0, 12);
      state.feed = Array.isArray(state.feed) ? state.feed : [];
      state.feed.unshift(`${player.name} received an admin XP adjustment.`);
      state.feed = state.feed.slice(0, 4);
   await writeState(state);
      sendJson(response, 200, { ok: true, state });
      return;
    }

    if (request.url === "/api/admin/verify" && request.method === "POST") {
      const body = await readBody(request);
      const { passcode } = JSON.parse(body);
      if (passcode !== adminPasscode) {
        sendJson(response, 403, { error: "Wrong passcode." });
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url === "/api/admin/announce" && request.method === "POST") {
      const body = JSON.parse(await readBody(request));
      if (body.passcode !== adminPasscode) {
        sendJson(response, 403, { error: "Wrong passcode." });
        return;
      }
      const title = cleanPushText(body.title, 70);
      const message = cleanPushText(body.message, 180);
      if (!title || !message) {
        sendJson(response, 400, { error: "Announcement title and message are required." });
        return;
      }
      queuePush(sendPushToAllPlayers(title, message, { type: "party-announcement", url: "/" }));
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.url === "/api/admin/players" && request.method === "POST") {
      const body = await readBody(request);
      const { passcode, name } = JSON.parse(body);
      if (passcode !== adminPasscode) {
        sendJson(response, 403, { error: "Wrong passcode." });
        return;
      }

      const cleanName = String(name || "").trim().slice(0, 30);
      if (!cleanName) {
        sendJson(response, 400, { error: "Enter a player name." });
        return;
      }

      const state = await readState();
      if (state.players.length >= maxPlayers) {
        sendJson(response, 400, { error: "Party is already at the 10 player limit." });
        return;
      }

      const player = createPlayer(cleanName, state.players);
      state.players.push(player);
      state.feed = Array.isArray(state.feed) ? state.feed : [];
      state.feed.unshift(`${player.name} joined the party.`);
      state.feed = state.feed.slice(0, 4);
      await writeState(state);
      sendJson(response, 200, { ok: true, player, state });
      return;
    }

    if (request.url === "/api/admin/players/delete" && request.method === "POST") {
      const body = await readBody(request);
      const { passcode, playerId } = JSON.parse(body);
      if (passcode !== adminPasscode) {
        sendJson(response, 403, { error: "Wrong passcode." });
        return;
      }

      const state = await readState();
      if (state.players.length <= 1) {
        sendJson(response, 400, { error: "You need at least one player." });
        return;
      }

      const index = state.players.findIndex(player => player.id === playerId);
      if (index === -1) {
        sendJson(response, 404, { error: "Player not found." });
        return;
      }

      const deletedName = state.players[index].name;
      state.players.splice(index, 1);
      state.feed = Array.isArray(state.feed) ? state.feed : [];
      state.feed.unshift(`${deletedName} was removed from the party.`);
      state.feed = state.feed.slice(0, 4);
      await writeState(state);
      sendJson(response, 200, { ok: true, deletedName, state });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    console.error("Request failed:", error.message);
    sendJson(response, 500, { error: "Server request failed." });
  }
});

server.listen(port, host, () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter(item => item && item.family === "IPv4" && !item.internal)
    .map(item => item.address);

  console.log(`Hunter Workout System is running.`);
  console.log(`This device: http://localhost:${port}`);
  addresses.forEach(address => console.log(`Wi-Fi/LAN:   http://${address}:${port}`));
  console.log(`Shared save: ${saveFile}`);
});
