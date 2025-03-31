const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId', authenticate, orderController.createOrder);
router.get('/:eventId/:orderId', authenticate, orderController.getOrder);
router.get('/:eventId', authenticate, orderController.getAllOrders);
router.patch('/:eventId/:orderId', authenticate, orderController.updateOrder);
router.patch('/status/:eventId/:orderId', authenticate, orderController.updateOrderStatus);
router.delete('/:eventId/:orderId', authenticate, orderController.deleteOrder);
router.delete('/:eventId', authenticate, orderController.deleteMultipleOrders);
router.get('/:eventId', authenticate, orderController.filterOrders);

module.exports = router;