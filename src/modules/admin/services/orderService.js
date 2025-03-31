const Order = require("../models/Order");
const Event = require("../models/Event");
const Food = require("../models/Food");
const Drink = require("../models/Drink");
const { orderStatus } = require("../../../utils/constantEnums");

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

  const [orders, totalCount] = await Promise.all([
    Order.find({ eventId }).skip(skip).limit(limit),
    Order.countDocuments({ eventId })
      .sort( {createdAt: -1}),
    ]);

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
  return { orders, totalCount };
};

exports.updateOrder = async (eventId, orderId, updateData) => {
  return await Order.findOneAndUpdate({ _id: orderId, eventId }, updateData, {
    new: true,
  });
};



exports.updateOrderStatus = async (eventId, orderId, newStatus) => {
  if (!Object.values(orderStatus).includes(newStatus)) {
    throw new Error('Invalid order status');
  }

  return await Order.findOneAndUpdate(
    { _id: orderId, eventId },
    { status: newStatus },
    { new: true }
  );
};

exports.deleteOrder = async (eventId, orderId) => {
  return await Order.findOneAndDelete({ _id: orderId, eventId });
};

exports.deleteMultipleOrders = async (eventId, orderIds) => {
  return await Order.deleteMany({ eventId, _id: { $in: orderIds } });
};



exports.filterOrders = async (eventId, filters, pagination) => {
  const { status, date, timeRange } = filters;
  const { page, limit } = pagination;
  

  const query = { eventId };
  

  if (status) {
      if (!Object.values(orderStatus).includes(status)) {
          throw new Error('Invalid order status');
      }
      query.status = status;
  }
  
  if (date && !timeRange) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startDate, $lte: endDate };
  }
  
  if (timeRange) {
      const now = new Date();
      let startTime = new Date(now);
      
      switch (timeRange) {
          case '30m':
              startTime.setMinutes(now.getMinutes() - 30);
              break;
          case '1h':
              startTime.setHours(now.getHours() - 1);
              break;
          case '2h':
              startTime.setHours(now.getHours() - 2);
              break;
          case '7h':
              startTime.setHours(now.getHours() - 7);
              break;
      }
      
      query.date = { $gte: startTime, $lte: now };
  }

  const total = await Order.countDocuments(query);
  
  const orders = await Order.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

  return { orders, total };
};