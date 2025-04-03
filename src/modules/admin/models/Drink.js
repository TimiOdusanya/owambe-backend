const mongoose = require("mongoose");
const { drinkCategory, drinkType } = require("../../../utils/constantEnums");

const drinkSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: Object.values(drinkCategory),
    required: true,
  },
  // type: {
  //   type: String,
  //   enum: Object.values(drinkType),
  //   required: true,
  // },
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
{ timestamps: true });


drinkSchema.index({ eventId: 1 });

module.exports = mongoose.model("Drink", drinkSchema);
