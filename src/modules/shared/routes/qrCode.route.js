const express = require("express");
const router = express.Router();
const qrCodeController = require("../controllers/qrCode.controller");
const { authenticate } = require("../../../middleware/authMiddleware");

// Generate QR code for a guest
router.get("/generate/:eventId/:guestId", qrCodeController.generateGuestQRCode);

// Validate QR code
router.get("/validate/:eventId/:qrCodeId", qrCodeController.validateQRCode);

// Get event details for QR code
router.get("/event-details/:eventId/:qrCodeId", qrCodeController.getEventDetailsForQR);

module.exports = router; 