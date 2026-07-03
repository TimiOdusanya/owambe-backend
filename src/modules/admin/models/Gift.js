const mongoose = require("mongoose");
const { giftType } = require("../../../utils/constantEnums");

const giftSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  type: { type: String, enum: Object.values(giftType), required: true },
  name: {
    type: String,
    required: [
      function () {
        return this.type === "wishlist";
      },
      "Name is required for wishlist",
    ],
  },
  price: {
    type: Number,
    required: [
      function () {
        return this.type === "wishlist";
      },
      "Price is required for wishlist",
    ],
  },
  media: [
    {
      name: { type: String },
      size: { type: Number },
      type: { type: String },
      link: { type: String },
    },
  ],
  description: String, // optional
  amount: {
    type: Number,
    required: [
      function () {
        return this.type === "cashgift";
      },
      "Amount is required for cashgift",
    ],
  },
  date: {
    type: Date,
    required: [
      function () {
        return this.type === "cashgift";
      },
      "Date is required for cashgift",
    ],
  },
  sender: {
    type: String,
    required: [
      function () {
        return this.type === "cashgift";
      },
      "Sender is required for cashgift",
    ],
  },
  reference: String, // optional for cashgift
  // Wishlist: set when a guest purchases this item
  purchased: { type: Boolean, default: false },
  purchasedAt: { type: Date, default: null },
  purchasedBy: {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", default: null },
    guestEmail: { type: String, default: null },
    guestName: { type: String, default: null },
  },
},
{ timestamps: true });

// Index for faster queries
giftSchema.index({ eventId: 1 });

module.exports = mongoose.model("Gift", giftSchema);
