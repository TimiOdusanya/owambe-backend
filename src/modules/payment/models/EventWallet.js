const mongoose = require("mongoose");

const eventWalletSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },
  },
  { timestamps: true }
);

// eventId already has unique: true in schema, no need for duplicate index

module.exports = mongoose.model("EventWallet", eventWalletSchema);
