const mongoose = require("mongoose");
const { guestRole } = require("../../../utils/constantEnums");

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
    enum: Object.values(guestRole),
    required: true,
  },
  tableNumber: String,
  seatNumber: String,
  plusOnes: { type: Number, default: 0 },
  inviteSent: { type: Boolean, default: false },
},
{ timestamps: true }
);

// Index for faster queries
guestSchema.index({ eventId: 1 });

module.exports = mongoose.model("Guest", guestSchema);
