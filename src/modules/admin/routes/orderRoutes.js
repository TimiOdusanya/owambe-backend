const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId', authenticate, orderController.createOrder);
router.get('/:eventId/:orderId', authenticate, orderController.getOrder);
// Single list endpoint with optional filters: status, date, timeRange, limit, skip
router.get('/:eventId', authenticate, orderController.getAllOrders);
router.patch('/:eventId/:orderId', authenticate, orderController.updateOrder);
router.patch('/status/:eventId/:orderId', authenticate, orderController.updateOrderStatus);
router.delete('/:eventId/:orderId', authenticate, orderController.deleteOrder);
router.delete('/:eventId', authenticate, orderController.deleteMultipleOrders);

module.exports = router;
