const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  address: String,
  role: {
    type: String,
    enum: ["VIP", "Regular", "others"],
    required: true,
  },
  tableSeatNumber: String,
  plusOnes: { type: Number, default: 0 },
  inviteSent: { type: Boolean, default: false },
});

// Index for faster queries
guestSchema.index({ eventId: 1 });

module.exports = mongoose.model("Guest", guestSchema);
