const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  orderCode: { type: String, required: true },
  guestName: { type: String, required: true },
  items: [
    {
      type: { type: String, enum: ["food", "drink"], required: true },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  date: Date,
  time: Date,
  status: {
    type: String,
    enum: ["completed", "ongoing", "cancelled"],
    default: "ongoing",
  },
});

// Index for faster queries
orderSchema.index({ eventId: 1 });

module.exports = mongoose.model("Order", orderSchema);
