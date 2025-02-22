const mongoose = require("mongoose");

const drinkSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "water",
      "beverage",
      "wine",
      "cocktail",
      "juice",
      "soda",
      "others",
      "liquor",
    ],
    required: true,
  },
  type: {
    type: String,
    enum: ["alcoholic", "non-alcoholic"],
    required: true,
  },
  media: [{ name: String, size: Number, type: String }],
  description: String,
});

// Index for faster queries
drinkSchema.index({ eventId: 1 });

module.exports = mongoose.model("Drink", drinkSchema);
