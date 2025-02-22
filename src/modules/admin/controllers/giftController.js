const giftService = require("../services/giftService");

exports.createWishlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const giftData = { ...req.body, eventId, type: "wishlist" };
    const gift = await giftService.createGift(giftData);
    res.status(201).json(gift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createCashgift = async (req, res) => {
  try {
    const { eventId } = req.params;
    const giftData = { ...req.body, eventId, type: "cashgift" };
    const gift = await giftService.createGift(giftData);
    res.status(201).json(gift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const { eventId, wishlistId } = req.params;
    const wishlist = await giftService.getGiftById(eventId, wishlistId);
    if (!wishlist || wishlist.type !== "wishlist")
      return res.status(404).json({ message: "Wishlist not found" });
    res.json(wishlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getCashgift = async (req, res) => {
  try {
    const { eventId, cashgiftId } = req.params;
    const cashgift = await giftService.getGiftById(eventId, cashgiftId);
    if (!cashgift || cashgift.type !== "cashgift")
      return res.status(404).json({ message: "Cashgift not found" });
    res.json(cashgift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllWishlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0 } = req.query;
    const wishlists = await giftService.getGiftsByType(
      eventId,
      "wishlist",
      parseInt(limit),
      parseInt(skip)
    );
    res.json(wishlists);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllCashgifts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0 } = req.query;
    const cashgifts = await giftService.getGiftsByType(
      eventId,
      "cashgift",
      parseInt(limit),
      parseInt(skip)
    );
    res.json(cashgifts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateWishlist = async (req, res) => {
  try {
    const { eventId, wishlistId } = req.params;
    const wishlist = await giftService.getGiftById(eventId, wishlistId);
    if (!wishlist || wishlist.type !== "wishlist")
      return res.status(404).json({ message: "Wishlist not found" });
    const updatedWishlist = await giftService.updateGift(eventId, wishlistId, {
      ...req.body,
      type: "wishlist",
    });
    res.json(updatedWishlist);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCashgift = async (req, res) => {
  try {
    const { eventId, cashgiftId } = req.params;
    const cashgift = await giftService.getGiftById(eventId, cashgiftId);
    if (!cashgift || cashgift.type !== "cashgift")
      return res.status(404).json({ message: "Cashgift not found" });
    const updatedCashgift = await giftService.updateGift(eventId, cashgiftId, {
      ...req.body,
      type: "cashgift",
    });
    res.json(updatedCashgift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteWishlist = async (req, res) => {
  try {
    const { eventId, wishlistId } = req.params;
    const wishlist = await giftService.getGiftById(eventId, wishlistId);
    if (!wishlist || wishlist.type !== "wishlist")
      return res.status(404).json({ message: "Wishlist not found" });
    await giftService.deleteGift(eventId, wishlistId);
    res.json({ message: "Wishlist deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCashgift = async (req, res) => {
  try {
    const { eventId, cashgiftId } = req.params;
    const cashgift = await giftService.getGiftById(eventId, cashgiftId);
    if (!cashgift || cashgift.type !== "cashgift")
      return res.status(404).json({ message: "Cashgift not found" });
    await giftService.deleteGift(eventId, cashgiftId);
    res.json({ message: "Cashgift deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleWishlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { wishlistIds } = req.body;
    await giftService.deleteMultipleGifts(eventId, wishlistIds);
    res.json({ message: "Wishlists deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleCashgifts = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { cashgiftIds } = req.body;
    await giftService.deleteMultipleGifts(eventId, cashgiftIds);
    res.json({ message: "Cashgifts deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
