const mongoose = require("mongoose");
const { eventStatus, eventTableType } = require("../../../utils/constantEnums");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: String, required: true },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    timeZone: { type: String, required: true },
    media: [
      {
        name: { type: String },
        size: { type: Number },
        type: { type: String },
        link: { type: String },
      },
    ],
    description: String,
    status: {
      type: String,
      enum: Object.values(eventStatus),
      default: eventStatus.PENDING,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventCode: {
      type: String,
      unique: true,
      required: true,
    },    
    tables: [
      {
        type: {
          type: String,
          // enum: Object.values(eventTableType),
          required: true,
        },
        // otherType: {
        //   type: String,
        //   required: function () {
        //     return this.type === "Others";
        //   },
        // },
        tableNumber: String,
        seats: Number,
      },
    ],
    qrCode: {
      qrCodeId: {
        type: String,
      },
      qrCodeUrl: {
        type: String,
      },
      qrCodeImage: {
        type: String,
      },
    },
    // Payout bank account (admin receives payments for this event here; required for withdrawals)
    payoutBankCode: { type: String, default: null },
    payoutBankName: { type: String, default: null },
    payoutAccountNumber: { type: String, default: null },
    payoutAccountName: { type: String, default: null },
    payoutAccountType: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for faster queries
eventSchema.index({ organizerId: 1 });

module.exports = mongoose.model("Event", eventSchema);
