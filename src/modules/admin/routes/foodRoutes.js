const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");
const { authenticate } = require("../../../middleware/authMiddleware");


router.post("/:eventId", authenticate, foodController.createFood);
router.get("/:eventId/:foodId", authenticate, foodController.getFood);
router.get("/:eventId", authenticate, foodController.getAllFood);
router.patch("/:eventId/:foodId", authenticate, foodController.updateFood);
router.delete("/:eventId/:foodId", authenticate, foodController.deleteFood);
router.delete("/:eventId", authenticate, foodController.deleteMultipleFood);

module.exports = router;
