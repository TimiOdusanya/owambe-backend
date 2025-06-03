const foodService = require("../services/foodService");
const Event = require("../models/Event");

exports.createFood = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const foodData = { ...req.body, eventId };
    const food = await foodService.createFood(foodData);
    res.status(201).json(food);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getFood = async (req, res) => {
  try {
    const { eventId, foodId } = req.params;
    const food = await foodService.getFoodById(eventId, foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json(food);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllFood = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0 } = req.query;
    const food = await foodService.getAllFood(
      eventId,
      parseInt(limit),
      parseInt(skip)
    );
    res.json(food);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateFood = async (req, res) => {
  try {
    const { eventId, foodId } = req.params;
    const food = await foodService.updateFood(eventId, foodId, req.body);
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json(food);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteFood = async (req, res) => {
  try {
    const { eventId, foodId } = req.params;
    const food = await foodService.deleteFood(eventId, foodId);
    if (!food) return res.status(404).json({ message: "Food not found" });
    res.json({ message: "Food deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleFood = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { foodIds } = req.body;
    await foodService.deleteMultipleFood(eventId, foodIds);
    res.json({ message: "Food items deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
