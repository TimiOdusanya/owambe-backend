const Gift = require("../models/Gift");
const Event = require("../models/Event");

exports.createGift = async (giftData) => {
  const event = await Event.findById(giftData.eventId);
  if (!event) throw new Error("Event not found");
  const gift = new Gift(giftData);
  await gift.save();
  return gift;
};

/**
 * Create multiple wishlist items for an event in one request.
 * @param {string} eventId - Event ID
 * @param {Array<{ name: string, price: number, description?: string }>} items - Wishlist items
 * @returns {Promise<Array>} Created gifts
 */
exports.createMultipleWishlists = async (eventId, items) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }
  const toInsert = items.map((item) => ({
    eventId,
    type: "wishlist",
    name: item.name,
    price: Number(item.price),
    description: item.description || undefined,
    media: item.media || [],
  }));
  const created = await Gift.insertMany(toInsert);
  return created;
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
