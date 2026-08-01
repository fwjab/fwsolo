const mongoose = require("mongoose");

const NotificationSubscriptionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  playerId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model("NotificationSubscription", NotificationSubscriptionSchema);
