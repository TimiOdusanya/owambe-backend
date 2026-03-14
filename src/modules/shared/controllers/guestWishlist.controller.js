const guestWishlistService = require("../services/guestWishlist.service");

/**
 * GET /api/v1/guest-wishlist/:eventId
 * Query: limit, skip, includePurchased (true to include already-purchased items)
 * List wishlist items for event (guest view). Default: only unpurchased so guest can buy.
 */
exports.listWishlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 20, skip = 0, includePurchased } = req.query;
    const result = await guestWishlistService.listWishlistForGuest(eventId, {
      limit: parseInt(limit, 10) || 20,
      skip: parseInt(skip, 10) || 0,
      includePurchased: includePurchased === "true" || includePurchased === true,
    });
    if (!result) {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/v1/guest-wishlist/:eventId/:wishlistId
 * Get a single wishlist item (guest view).
 */
exports.getWishlist = async (req, res) => {
  try {
    const { eventId, wishlistId } = req.params;
    const result = await guestWishlistService.getWishlistItemForGuest(eventId, wishlistId);
    if (!result) {
      return res.status(404).json({ message: "Wishlist item or event not found" });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
