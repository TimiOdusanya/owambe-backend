const Gift = require("../models/Gift");
const Event = require("../models/Event");

exports.createGift = async (giftData) => {
  const event = await Event.findById(giftData.eventId);
  if (!event) throw new Error("Event not found");
  const gift = new Gift(giftData);
  await gift.save();
  return gift;
};

exports.getGiftById = async (eventId, giftId) => {
  return await Gift.findOne({ _id: giftId, eventId });
};

exports.getGiftsByType = async (eventId, type, limit = 10, skip = 0) => {
  return await Gift.find({ eventId, type }).skip(skip).limit(limit);
};

exports.updateGift = async (eventId, giftId, updateData) => {
  return await Gift.findOneAndUpdate({ _id: giftId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteGift = async (eventId, giftId) => {
  return await Gift.findOneAndDelete({ _id: giftId, eventId });
};

exports.deleteMultipleGifts = async (eventId, giftIds) => {
  return await Gift.deleteMany({ eventId, _id: { $in: giftIds } });
};
