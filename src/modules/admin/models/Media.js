const mongoose = require("mongoose");
const { mediaType } = require("../../../utils/constantEnums");

const mediaSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  title: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: Object.values(mediaType),
    required: true 
  },
  media: [
    {
      name: { type: String },
      size: { type: Number },
      type: { type: String },
      link: { type: String },
    },
  ],
  price: { 
    type: Number,
    required: true 
  },
  description: String,
});

// Index for faster queries
mediaSchema.index({ eventId: 1 });

module.exports = mongoose.model("Media", mediaSchema);
