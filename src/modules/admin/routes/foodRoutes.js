const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");
const { authenticate } = require("../../../middleware/authMiddleware");

// Adjusted to remove redundant `/events/:eventId` since it’s handled in index.js
router.post("/:eventId", authenticate, foodController.createFood);
router.get("/:eventId/:foodId", authenticate, foodController.getFood);
router.get("/:eventId", authenticate, foodController.getAllFood);
router.put("/:eventId/:foodId", authenticate, foodController.updateFood);
router.delete("/:eventId/:foodId", authenticate, foodController.deleteFood);
router.delete("/:eventId", authenticate, foodController.deleteMultipleFood);

module.exports = router;
