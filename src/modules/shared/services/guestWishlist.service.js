const Gift = require("../../admin/models/Gift");
const Event = require("../../admin/models/Event");

/**
 * List wishlist items for an event (guest view). Only unpurchased items by default.
 */
const listWishlistForGuest = async (eventId, { limit = 50, skip = 0, includePurchased = false } = {}) => {
  const event = await Event.findById(eventId);
  if (!event) return null;

  const query = { eventId, type: "wishlist" };
  if (!includePurchased) query.purchased = false;

  const [items, totalCount] = await Promise.all([
    Gift.find(query).skip(skip).limit(limit).lean(),
    Gift.countDocuments(query),
  ]);

  return {
    items,
    totalCount,
    currentPage: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(totalCount / limit),
  };
};

module.exports = {
  listWishlistForGuest,
};
