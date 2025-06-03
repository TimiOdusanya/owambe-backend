const drinkService = require("../services/drinkService");
const Event = require("../models/Event");

exports.createDrink = async (req, res) => {
  try {
      const { eventId } = req.params;
    
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      const drinkData = { ...req.body, eventId };
      const drink = await drinkService.createDrink(drinkData);
      res.status(201).json(drink);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
};

exports.getDrink = async (req, res) => {
  try {
    const { eventId, drinkId } = req.params;
    const drink = await drinkService.getDrinkById(eventId, drinkId);
    if (!drink) return res.status(404).json({ message: "Drink not found" });
    res.json(drink);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllDrinks = async (req, res) => {
  try {
      const { eventId } = req.params;
      const { limit = 10, skip = 0 } = req.query;
  
      const parsedLimit = parseInt(limit);
      const parsedSkip = parseInt(skip);
  
      const { drinks, totalCount } = await drinkService.getAllDrinks(eventId, parsedLimit, parsedSkip);
  
      res.json({
        drinks,
        totalCount,
        currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
        totalPages: Math.ceil(totalCount / parsedLimit),
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
};

exports.updateDrink = async (req, res) => {
  try {
    const { eventId, drinkId } = req.params;
    const drink = await drinkService.updateDrink(eventId, drinkId, req.body);
    if (!drink) return res.status(404).json({ message: "Drink not found" });
    res.json(drink);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDrink = async (req, res) => {
  try {
    const { eventId, drinkId } = req.params;
    const drink = await drinkService.deleteDrink(eventId, drinkId);
    if (!drink) return res.status(404).json({ message: "Drink not found" });
    res.json({ message: "Drink deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleDrinks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { drinkIds } = req.body;
    await drinkService.deleteMultipleDrinks(eventId, drinkIds);
    res.json({ message: "Drinks deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
