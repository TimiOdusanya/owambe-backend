const giftService = require("../services/giftService");
const MediaPurchase = require("../../payment/models/MediaPurchase");
const { paymentStatus, paymentPurpose } = require("../../../utils/constantEnums");

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

/**
 * POST /api/v1/gifts/:eventId/wishlist/bulk
 * Body: { items: [ { name, price, description? }, ... ] }
 * Create multiple wishlist items for the event. Authenticated; organizer only (enforced by event access).
 */
exports.createMultipleWishlists = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { items } = req.body;
    const created = await giftService.createMultipleWishlists(eventId, items);
    res.status(201).json({ message: "Wishlists created", count: created.length, wishlists: created });
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

/**
 * GET /api/v1/gifts/:eventId/purchased-wishlist
 * Returns all wishlist items that have been purchased by guests.
 * Shows: item name, guest name, purchase date, amount.
 */
exports.getPurchasedWishlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    const Gift = require("../models/Gift");
    const [items, totalCount] = await Promise.all([
      Gift.find({ eventId, type: "wishlist", purchased: true })
        .sort({ purchasedAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      Gift.countDocuments({ eventId, type: "wishlist", purchased: true }),
    ]);
    res.json({
      items: items.map((g) => ({
        _id: g._id,
        item: g.name,
        price: g.price,
        description: g.description,
        guest: g.purchasedBy?.guestName || null,
        guestEmail: g.purchasedBy?.guestEmail || null,
        guestId: g.purchasedBy?.guestId || null,
        date: g.purchasedAt,
        amount: g.price,
      })),
      totalCount,
      currentPage: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/v1/gifts/:eventId/cash-gift-payments
 * Returns all payment-based cash gifts (purpose=gift, status=completed from MediaPurchase).
 * Shows: amount, date, sender name, reference (tx_ref).
 */
exports.getCashGiftPayments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    const mongoose = require("mongoose");
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const [payments, totalCount] = await Promise.all([
      MediaPurchase.find({
        eventId: eventObjectId,
        purpose: paymentPurpose.GIFT,
        status: paymentStatus.COMPLETED,
        "meta.topup": { $ne: true },
      })
        .sort({ createdAt: -1 })
        .skip(parseInt(skip, 10))
        .limit(parseInt(limit, 10))
        .lean(),
      MediaPurchase.countDocuments({
        eventId: eventObjectId,
        purpose: paymentPurpose.GIFT,
        status: paymentStatus.COMPLETED,
        "meta.topup": { $ne: true },
      }),
    ]);

    res.json({
      items: payments.map((p) => ({
        _id: p._id,
        amount: p.totalAmount,
        currency: p.currency,
        sender: p.guestName,
        senderEmail: p.guestEmail,
        reference: p.txRef,
        date: p.updatedAt,
      })),
      totalCount,
      currentPage: Math.floor(parseInt(skip, 10) / parseInt(limit, 10)) + 1,
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
