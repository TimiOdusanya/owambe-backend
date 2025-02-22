const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ["appetizer", "main course", "dessert", "snack", "others"],
    required: true,
  },
  media: [{ name: String, size: Number, type: String }],
  description: String,
});

// Index for faster queries
foodSchema.index({ eventId: 1 });

module.exports = mongoose.model("Food", foodSchema);
