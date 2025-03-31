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

    const parsedLimit = parseInt(limit);
    const parsedSkip = parseInt(skip);


    const {orders, totalCount } = await orderService.getAllOrders(
      eventId,
      parsedLimit, parsedSkip);

    res.json({
      orders,
      totalCount,
      currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
      totalPages: Math.ceil(totalCount / parsedLimit),
    });
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
  try {
    const { eventId } = req.params;
    const { 
      status, 
      date, 
      timeRange, // '30m', '1h', '2h', '7h'
      page = 1, 
      limit = 10 
    } = req.query;

    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({ message: "Invalid pagination parameters" });
    }

    
    if (timeRange && !['30m', '1h', '2h', '7h'].includes(timeRange)) {
      return res.status(400).json({ message: "Invalid time range. Use: 30m, 1h, 2h, 7h" });
    }

    const { orders, total } = await orderService.filterOrders(
      eventId, 
      { status, date, timeRange }, 
      { page: pageNumber, limit: limitNumber }
    );

    res.json({
        data: orders,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalCount: total,
        itemsPerPage: limitNumber
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};