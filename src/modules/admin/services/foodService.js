const Food = require("../models/Food");

exports.createFood = async (foodData) => {
  const food = new Food(foodData);
  await food.save();
  return food;
};

exports.getFoodById = async (eventId, foodId) => {
  return await Food.findOne({ _id: foodId, eventId });
};

exports.getAllFood = async (eventId, limit = 10, skip = 0) => {
  return await Food.find({ eventId }).skip(skip).limit(limit);
};

exports.updateFood = async (eventId, foodId, updateData) => {
  return await Food.findOneAndUpdate({ _id: foodId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteFood = async (eventId, foodId) => {
  return await Food.findOneAndDelete({ _id: foodId, eventId });
};

exports.deleteMultipleFood = async (eventId, foodIds) => {
  return await Food.deleteMany({ eventId, _id: { $in: foodIds } });
};
