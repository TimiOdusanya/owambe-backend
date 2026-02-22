const mongoose = require("mongoose");
const { transactionType, paymentPurpose } = require("../../../utils/constantEnums");

const walletTransactionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(transactionType),
      required: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, default: null },
    reference: { type: String, default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "MediaPurchase", default: null },
    transferRef: { type: String, default: null },
    description: { type: String, default: null },
    purpose: {
      type: String,
      enum: Object.values(paymentPurpose),
      default: paymentPurpose.MEDIA,
    },
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", default: null },
    guestEmail: { type: String, default: null },
    guestName: { type: String, default: null },
    guestPhone: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ eventId: 1, createdAt: -1 });
walletTransactionSchema.index({ eventId: 1, type: 1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);
