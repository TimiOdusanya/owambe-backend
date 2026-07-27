const orderService = require("../services/orderService");

exports.createOrder = async (req, res) => {
  try {
    const { eventId } = req.params;
    const orderData = { ...req.body, eventId };
    const order = await orderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { eventId, orderId } = req.params;
    const order = await orderService.getOrderById(eventId, orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0, status, date, timeRange } = req.query;

    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedSkip = parseInt(skip, 10) || 0;

    const result = await orderService.getAllOrders(eventId, {
      limit: parsedLimit,
      skip: parsedSkip,
      status: status || undefined,
      date: date || undefined,
      timeRange: timeRange || undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { eventId, orderId } = req.params;
    const order = await orderService.updateOrder(eventId, orderId, req.body);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { eventId, orderId } = req.params;
    const order = await orderService.deleteOrder(eventId, orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleOrders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { orderIds } = req.body;
    await orderService.deleteMultipleOrders(eventId, orderIds);
    res.json({ message: "Orders deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { eventId, orderId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await orderService.updateOrderStatus(eventId, orderId, status);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.filterOrders = async (req, res) => {
  // Alias for getAllOrders — supports status, date, timeRange filters
  return exports.getAllOrders(req, res);
};