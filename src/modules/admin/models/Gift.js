const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  type: { type: String, enum: ["wishlist", "cashgift"], required: true },
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
  media: [{ name: String, size: Number, type: String }], // optional for wishlist
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
});

// Index for faster queries
giftSchema.index({ eventId: 1 });

module.exports = mongoose.model("Gift", giftSchema);
