const mongoose = require("mongoose");

const GameStateSchema = new mongoose.Schema({
  quoteIndex: Number,
  feed: Array,
  players: Array,
  notificationMeta: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model("GameState", GameStateSchema);
