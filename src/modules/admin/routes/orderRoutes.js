const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId/orders', authenticate, orderController.createOrder);
router.get('/:eventId/orders/:orderId', authenticate, orderController.getOrder);
router.get('/:eventId/orders', authenticate, orderController.getAllOrders);
router.put('/:eventId/orders/:orderId', authenticate, orderController.updateOrder);
router.delete('/:eventId/orders/:orderId', authenticate, orderController.deleteOrder);
router.delete('/:eventId/orders', authenticate, orderController.deleteMultipleOrders);

module.exports = router;