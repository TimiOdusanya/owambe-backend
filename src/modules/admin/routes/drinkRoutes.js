const express = require('express');
const router = express.Router();
const drinkController = require('../controllers/drinkController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId', authenticate, drinkController.createDrink);
router.get('/:eventId/:drinkId', authenticate, drinkController.getDrink);
router.get('/:eventId', authenticate, drinkController.getAllDrinks);
router.patch('/:eventId/:drinkId', authenticate, drinkController.updateDrink);
router.delete('/:eventId/:drinkId', authenticate, drinkController.deleteDrink);
router.delete('/:eventId', authenticate, drinkController.deleteMultipleDrinks);

module.exports = router;