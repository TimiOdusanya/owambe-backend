const express = require("express");
const router = express.Router();
const guestOrderController = require("../controllers/guestOrder.controller");
const { authenticate } = require("../../../middleware/authMiddleware");

// Create a new order for a guest
router.post("/:eventId/:guestId", guestOrderController.createOrder);

// Get all orders for a guest
router.get("/:eventId/:guestId", guestOrderController.getGuestOrders);

// Update order status
router.patch("/:eventId/:guestId/:orderId", authenticate, guestOrderController.updateOrderStatus);

module.exports = router;
