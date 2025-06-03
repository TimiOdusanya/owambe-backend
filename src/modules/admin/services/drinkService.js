const Drink = require("../models/Drink");
const Event = require("../models/Event");

exports.createDrink = async (drinkData) => {
  const event = await Event.findById(drinkData.eventId);
  if (!event) throw new Error("Event not found");
  const drink = new Drink(drinkData);
  await drink.save();
  return drink;
};

exports.getDrinkById = async (eventId, drinkId) => {
  return await Drink.findOne({ _id: drinkId, eventId });
};

exports.getAllDrinks = async (eventId, limit = 10, skip = 0) => {
  return await Drink.find({ eventId }).skip(skip).limit(limit);
};

exports.updateDrink = async (eventId, drinkId, updateData) => {
  return await Drink.findOneAndUpdate({ _id: drinkId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteDrink = async (eventId, drinkId) => {
  return await Drink.findOneAndDelete({ _id: drinkId, eventId });
};

exports.deleteMultipleDrinks = async (eventId, drinkIds) => {
  return await Drink.deleteMany({ eventId, _id: { $in: drinkIds } });
};
