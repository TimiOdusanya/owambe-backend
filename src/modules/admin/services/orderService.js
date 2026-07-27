const Order = require("../models/Order");
const Event = require("../models/Event");
const Food = require("../models/Food");
const Drink = require("../models/Drink");
const Guest = require("../models/Guest");
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

exports.getAllOrders = async (eventId, { limit = 10, skip = 0, status, date, timeRange } = {}) => {
  const query = { eventId };

  if (status) {
    if (!Object.values(orderStatus).includes(status)) {
      throw new Error("Invalid order status. Use: completed, ongoing, cancelled");
    }
    query.status = status;
  }

  // Filter by createdAt (orders don't reliably set a separate `date` field)
  if (timeRange) {
    const now = new Date();
    const startTime = new Date(now);
    switch (timeRange) {
      case "30m":
        startTime.setMinutes(now.getMinutes() - 30);
        break;
      case "1h":
        startTime.setHours(now.getHours() - 1);
        break;
      case "2h":
        startTime.setHours(now.getHours() - 2);
        break;
      case "7h":
        startTime.setHours(now.getHours() - 7);
        break;
      case "24h":
        startTime.setHours(now.getHours() - 24);
        break;
      default:
        throw new Error("Invalid time range. Use: 30m, 1h, 2h, 7h, 24h");
    }
    query.createdAt = { $gte: startTime, $lte: now };
  } else if (date) {
    const startDate = new Date(date);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid date. Use YYYY-MM-DD");
    }
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  const [orders, totalCount] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  const populatedOrders = await Promise.all(
    orders.map(async (order) => {
      const guest = await Guest.findById(order.guestId).lean();

      const populatedItems = await Promise.all(
        order.items.map(async (item) => {
          const { _id, ...itemWithoutId } = item;

          if (item.type === "food") {
            const food = await Food.findById(item.id).lean();
            if (food) {
              itemWithoutId.name = food.name;
              itemWithoutId.description = food.description;
              itemWithoutId.category = food.category;
              itemWithoutId.media = food.media;
            }
          } else if (item.type === "drink") {
            const drink = await Drink.findById(item.id).lean();
            if (drink) {
              itemWithoutId.name = drink.name;
              itemWithoutId.description = drink.description;
              itemWithoutId.category = drink.category;
              itemWithoutId.media = drink.media;
            }
          }

          return itemWithoutId;
        })
      );

      return {
        ...order,
        items: populatedItems,
        guestName: guest?.name,
        tableNumber: guest?.tableNumber,
        seatNumber: guest?.seatNumber,
        role: guest?.role,
        orderDate: order.createdAt,
        orderTime: order.createdAt,
      };
    })
  );

  return {
    orders: populatedOrders,
    totalCount,
    currentPage: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(totalCount / limit) || 0,
  };
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
  // Deprecated: use getAllOrders with the same filters (createdAt-based).
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 10;
  return exports.getAllOrders(eventId, {
    limit,
    skip: (page - 1) * limit,
    status: filters?.status,
    date: filters?.date,
    timeRange: filters?.timeRange,
  }).then((result) => ({
    orders: result.orders,
    total: result.totalCount,
  }));
};