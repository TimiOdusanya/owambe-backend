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
  claimedInvite: { type: Boolean, default: false },
  qrCodeId: { type: String },
},
{ timestamps: true }
);

// Index for faster queries
guestSchema.index({ eventId: 1 });
guestSchema.index({ qrCodeId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Guest", guestSchema);
