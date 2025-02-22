const Order = require("../models/Order");
const Event = require("../models/Event");
const Food = require("../models/Food");
const Drink = require("../models/Drink");

exports.createOrder = async (orderData) => {
  const event = await Event.findById(orderData.eventId);
  if (!event) throw new Error("Event not found");
  const order = new Order(orderData);
  await order.save();
  return order;
};

exports.getOrderById = async (eventId, orderId) => {
  const order = await Order.findOne({ _id: orderId, eventId });
  if (!order) return null;

  // Manually populate items
  for (const item of order.items) {
    if (item.type === "food") {
      item.item = await Food.findById(item.id);
    } else if (item.type === "drink") {
      item.item = await Drink.findById(item.id);
    }
  }
  return order;
};

exports.getAllOrders = async (eventId, limit = 10, skip = 0) => {
  const orders = await Order.find({ eventId }).skip(skip).limit(limit);
  // Populate items for each order
  for (const order of orders) {
    for (const item of order.items) {
      if (item.type === "food") {
        item.item = await Food.findById(item.id);
      } else if (item.type === "drink") {
        item.item = await Drink.findById(item.id);
      }
    }
  }
  return orders;
};

exports.updateOrder = async (eventId, orderId, updateData) => {
  return await Order.findOneAndUpdate({ _id: orderId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteOrder = async (eventId, orderId) => {
  return await Order.findOneAndDelete({ _id: orderId, eventId });
};

exports.deleteMultipleOrders = async (eventId, orderIds) => {
  return await Order.deleteMany({ eventId, _id: { $in: orderIds } });
};
