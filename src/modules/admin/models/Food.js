const mongoose = require("mongoose");
const { foodCategory } = require("../../../utils/constantEnums");

const foodSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: Object.values(foodCategory),
    required: true,
  },
  media: [
    {
      name: { type: String },
      size: { type: Number },
      type: { type: String },
      link: { type: String },
    },
  ],
  description: String,
},
{ timestamps: true }
);

// Index for faster queries
foodSchema.index({ eventId: 1 });

module.exports = mongoose.model("Food", foodSchema);
