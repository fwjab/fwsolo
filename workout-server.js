const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const GameState = require("./models/GameState");
const port = Number(process.env.PORT || 4177);
const host = "0.0.0.0";
const adminPasscode = "j@bultra";
const maxPlayers = 10;
const appFile = path.join(__dirname, "index.html");
const saveFile = path.join(__dirname, "workout-save.json");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));
const defaultState = {
  quoteIndex: 4,
  feed: ["Shared party system initialized."],
  players: [
    { id: "p1", name: "Player 1", level: 3, xp: 95, totalXp: 340, streak: 0, lastDaily: "", quests: [], log: [] },
    { id: "p2", name: "Player 2", level: 1, xp: 0, totalXp: 0, streak: 0, lastDaily: "", quests: [], log: [] }
  ]
};

async function readState() {
  let state = await GameState.findOne();

  if (!state) {
    state = await GameState.create(defaultState);
  }

  return state;
}
}

function writeState(state) {
  fs.writeFileSync(saveFile, JSON.stringify(state, null, 2));
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
    if (request.method === "GET" && (request.url === "/" || request.url === "/index.html")) {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      response.end(fs.readFileSync(appFile));
      return;
    }

    if (request.url === "/api/state" && request.method === "GET") {
      sendJson(response, 200, readState());
      return;
    }

    if (request.url === "/api/state" && request.method === "POST") {
      const body = await readBody(request);
      const nextState = JSON.parse(body);
      if (!nextState || !Array.isArray(nextState.players)) {
        sendJson(response, 400, { error: "Invalid state." });
        return;
      }
      const currentState = readState();
      const currentIds = currentState.players.map(player => player.id).sort().join("|");
      const nextIds = nextState.players.map(player => player.id).sort().join("|");
      if (currentIds !== nextIds) {
        sendJson(response, 403, { error: "Player roster changes require admin control." });
        return;
      }
      writeState(nextState);
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

      const state = readState();
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
      writeState(state);
      sendJson(response, 200, { ok: true, state });
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

      const state = readState();
      if (state.players.length >= maxPlayers) {
        sendJson(response, 400, { error: "Party is already at the 10 player limit." });
        return;
      }

      const player = createPlayer(cleanName, state.players);
      state.players.push(player);
      state.feed = Array.isArray(state.feed) ? state.feed : [];
      state.feed.unshift(`${player.name} joined the party.`);
      state.feed = state.feed.slice(0, 4);
      writeState(state);
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

      const state = readState();
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
      writeState(state);
      sendJson(response, 200, { ok: true, deletedName, state });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
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
