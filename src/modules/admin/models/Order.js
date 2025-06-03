const mongoose = require("mongoose");
const { orderStatus, menuType } = require("../../../utils/constantEnums");

const orderSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Guest",
    required: true,
  },
  // orderCode: { type: String, required: true },
  // guestName: { type: String, required: true },
  items: [
    {
      type: { 
        type: String, 
        enum: Object.values(menuType),
        required: true 
      },
      id: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true 
      },
      orderNote: { 
        type: String, 
        required: false 
      }
    },
  ],
  date: Date,
  time: Date,
  status: {
    type: String,
    enum: Object.values(orderStatus),
    default: orderStatus.Ongoing,
  },
},
{
  timestamps: true
}
);

// Index for faster queries
orderSchema.index({ eventId: 1 });

module.exports = mongoose.model("Order", orderSchema);
