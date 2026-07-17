const mongoose = require("mongoose");

const GameStateSchema = new mongoose.Schema({
  quoteIndex: Number,
  feed: Array,
  players: Array
});

module.exports = mongoose.model("GameState", GameStateSchema);
