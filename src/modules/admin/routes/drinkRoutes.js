const express = require('express');
const router = express.Router();
const drinkController = require('../controllers/drinkController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId/drinks', authenticate, drinkController.createDrink);
router.get('/:eventId/drinks/:drinkId', authenticate, drinkController.getDrink);
router.get('/:eventId/drinks', authenticate, drinkController.getAllDrinks);
router.put('/:eventId/drinks/:drinkId', authenticate, drinkController.updateDrink);
router.delete('/:eventId/drinks/:drinkId', authenticate, drinkController.deleteDrink);
router.delete('/:eventId/drinks', authenticate, drinkController.deleteMultipleDrinks);

module.exports = router;