const mongoose = require("mongoose");
const { paymentStatus, paymentMethod, paymentPurpose } = require("../../../utils/constantEnums");

const mediaPurchaseSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(paymentPurpose),
      default: paymentPurpose.MEDIA,
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      default: null,
    },
    guestEmail: { type: String, required: true },
    guestName: { type: String, required: true },
    guestPhone: { type: String, default: null },
    mediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    wishlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Gift", default: null },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    paymentMethod: {
      type: String,
      enum: Object.values(paymentMethod),
      required: true,
    },
    txRef: { type: String, required: true, unique: true },
    flwTransactionId: { type: Number, default: null },
    flwRef: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(paymentStatus),
      default: paymentStatus.PENDING,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

mediaPurchaseSchema.index({ eventId: 1, guestId: 1 });
mediaPurchaseSchema.index({ status: 1 });

mediaPurchaseSchema.index({ wishlistId: 1 });

module.exports = mongoose.model("MediaPurchase", mediaPurchaseSchema);
