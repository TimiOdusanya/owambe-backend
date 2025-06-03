const guestOrderService = require("../services/guestOrder.service");
const Event = require("../../admin/models/Event");
const Guest = require("../../admin/models/Guest");
const Food = require("../../admin/models/Food");
const Drink = require("../../admin/models/Drink");

exports.createOrder = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if guest exists in the event
    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found for this event" });
    }

    // Validate food and drink items
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required and cannot be empty" });
    }

    // Validate each item
    for (const item of items) {
      if (item.type === 'food') {
        const food = await Food.findOne({ _id: item.id, eventId });
        if (!food) {
          return res.status(404).json({ 
            message: `Food item not found in this event` 
          });
        }
      } else if (item.type === 'drink') {
        const drink = await Drink.findOne({ _id: item.id, eventId });
        if (!drink) {
          return res.status(404).json({ 
            message: `Drink item not found in this event` 
          });
        }
      } else {
        return res.status(400).json({ 
          message: `Invalid item type: ${item.type}. Must be either 'food' or 'drink'` 
        });
      }
    }

    const orderData = {
      ...req.body,
      eventId,
      guestId,
    };

    const order = await guestOrderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getGuestOrders = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if guest exists in the event
    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found for this event" });
    }

    const orders = await guestOrderService.getGuestOrders(eventId, guestId);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { eventId, guestId, orderId } = req.params;
    const { status } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if guest exists in the event
    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found for this event" });
    }

    const order = await guestOrderService.updateOrderStatus(eventId, orderId, guestId, status);
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
