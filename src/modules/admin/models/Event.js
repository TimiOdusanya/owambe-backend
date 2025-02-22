const mongoose = require("mongoose");
const { eventStatus, eventTableType } = require("../../../utils/constantEnums");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: String, required: true },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    timeZone: { type: String, required: true },
    // media: [{ name: String, size: String, type: String, link: String }],
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
    tables: [
      {
        type: {
          type: String,
          enum: Object.values(eventTableType),
          required: true,
        },
        otherType: {
          type: String,
          required: function () {
            return this.type === "Others";
          },
        },
        tableNumber: String,
        seats: Number,
      },
    ],
    qrCode: String,
  },
  { timestamps: true }
);

// Index for faster queries
eventSchema.index({ organizerId: 1 });

module.exports = mongoose.model("Event", eventSchema);
