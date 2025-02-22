const express = require('express');
const router = express.Router();
const giftController = require('../controllers/giftController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId/wishlist', authenticate, giftController.createWishlist);
router.post('/:eventId/cashgifts', authenticate, giftController.createCashgift);
router.get('/:eventId/wishlist/:wishlistId', authenticate, giftController.getWishlist);
router.get('/:eventId/cashgifts/:cashgiftId', authenticate, giftController.getCashgift);
router.get('/:eventId/wishlist', authenticate, giftController.getAllWishlist);
router.get('/:eventId/cashgifts', authenticate, giftController.getAllCashgifts);
router.put('/:eventId/wishlist/:wishlistId', authenticate, giftController.updateWishlist);
router.put('/:eventId/cashgifts/:cashgiftId', authenticate, giftController.updateCashgift);
router.delete('/:eventId/wishlist/:wishlistId', authenticate, giftController.deleteWishlist);
router.delete('/:eventId/cashgifts/:cashgiftId', authenticate, giftController.deleteCashgift);
router.delete('/:eventId/wishlist', authenticate, giftController.deleteMultipleWishlist);
router.delete('/:eventId/cashgifts', authenticate, giftController.deleteMultipleCashgifts);

module.exports = router;