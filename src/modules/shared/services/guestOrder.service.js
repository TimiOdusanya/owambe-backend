const Order = require("../../admin/models/Order");
const Food = require("../../admin/models/Food");
const Drink = require("../../admin/models/Drink");
const mongoose = require("mongoose");
const { orderStatus } = require("../../../utils/constantEnums");

exports.createOrder = async (orderData) => {
  const order = new Order(orderData);
  await order.save();
  return order;
};

exports.getGuestOrders = async (eventId, guestId) => {
  const orders = await Order.find({ eventId, guestId })
    .sort({ createdAt: -1 });

  // Get food and drink details for each item
  const populatedOrders = await Promise.all(orders.map(async (order) => {
    const orderObj = order.toObject();
    orderObj.items = await Promise.all(order.items.map(async (item) => {
      const { _id, ...itemObj } = item.toObject(); // Remove the subdocument _id
      if (item.type === 'food') {
        const food = await Food.findById(item.id);
        if (food) {
          itemObj.name = food.name;
          itemObj.description = food.description;
          itemObj.category = food.category;
          itemObj.media = food.media;
        }
      } else if (item.type === 'drink') {
        const drink = await Drink.findById(item.id);
        if (drink) {
          itemObj.name = drink.name;
          itemObj.description = drink.description;
          itemObj.category = drink.category;
          itemObj.media = drink.media;
        }
      }
      return itemObj;
    }));
    return orderObj;
  }));

  return populatedOrders;
};

exports.updateOrderStatus = async (eventId, orderId, guestId, newStatus) => {
  // Validate order status
  if (!Object.values(orderStatus).includes(newStatus)) {
    throw new Error('Invalid order status');
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, eventId, guestId },
    { status: newStatus },
    { new: true }
  );

  if (!order) throw new Error("Order not found");
  return order;
};
