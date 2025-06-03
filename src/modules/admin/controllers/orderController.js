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
    const { limit = 10, skip = 0 } = req.query;
    const orders = await orderService.getAllOrders(
      eventId,
      parseInt(limit),
      parseInt(skip)
    );
    res.json(orders);
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
