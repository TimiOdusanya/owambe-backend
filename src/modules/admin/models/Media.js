const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  title: { type: String, required: true },
  type: { type: String, enum: ["photo", "video"], required: true },
  price: { type: Number, required: true },
  file: { type: String, required: true }, // URL or path to the file
  description: String,
});

// Index for faster queries
mediaSchema.index({ eventId: 1 });

module.exports = mongoose.model("Media", mediaSchema);
